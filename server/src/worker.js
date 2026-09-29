/* ==========================================================================
   Group Finance Reporting — API (Cloudflare Worker + D1)
   Accounts, sessions, roles and shared records for the finance page.
     owner      : Chairman — everything, manages access
     controller : group finance controller — everything
     staff      : finance staff — only the company data sheets they fill in
   ========================================================================== */

const DATASETS = ["accounts", "balances", "transactions", "forecast", "obligations", "reconItems", "monthly", "staffReviews", "teamAssessment", "incidents", "submissions"];
const STAFF_READ = ["accounts", "balances", "transactions", "forecast", "reconItems", "monthly"];
const STAFF_WRITE = ["balances", "transactions", "forecast", "reconItems", "monthly"];
const ROLES = ["owner", "controller", "staff"];
const ALLOWED_ORIGINS = ["https://ewkena2-ops.github.io"];
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const SESSION_MS = 30 * 24 * 3600 * 1000;
const PBKDF2_ITER = 10000; // kept low enough for the Workers free CPU limit; logins are rate limited
const MAX_FAILS = 8, FAIL_WINDOW = 15 * 60 * 1000;
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const RID_RE = /^[A-Za-z0-9._:-]{1,80}$/;

const enc = new TextEncoder();
const httpErr = (status, message) => Object.assign(new Error(message), { status, expose: true });
const json = (obj, status = 200) => new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" } });
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const fromB64u = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const sha256 = async (s) => b64u(await crypto.subtle.digest("SHA-256", enc.encode(s)));
const cleanEmail = (e) => String(e || "").trim().toLowerCase();
const accLabel = (a) => [a.company, [a.bank, a.account].filter(Boolean).join(" ")].filter(Boolean).join(" · ");

async function hashPassword(pw) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITER }, key, 256);
  return `pbkdf2$${PBKDF2_ITER}$${b64u(salt)}$${b64u(bits)}`;
}
async function verifyPassword(pw, stored) {
  const [kind, iter, saltS, hashS] = String(stored || "").split("$");
  if (kind !== "pbkdf2") return false;
  const key = await crypto.subtle.importKey("raw", enc.encode(pw), "PBKDF2", false, ["deriveBits"]);
  const bits = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: fromB64u(saltS), iterations: Number(iter) }, key, 256));
  const want = fromB64u(hashS);
  if (bits.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < bits.length; i++) diff |= bits[i] ^ want[i];
  return diff === 0;
}

function corsHeaders(origin) {
  const ok = ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin);
  return ok ? { "Access-Control-Allow-Origin": origin, "Access-Control-Allow-Headers": "Content-Type, Authorization", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "86400", Vary: "Origin" } : { Vary: "Origin" };
}
function withCors(res, cors) {
  const out = new Response(res.body, res);
  for (const [k, v] of Object.entries(cors)) out.headers.set(k, v);
  return out;
}

const first = (env, sql, ...args) => env.DB.prepare(sql).bind(...args).first();
const all = async (env, sql, ...args) => (await env.DB.prepare(sql).bind(...args).all()).results || [];

async function newSession(env, email) {
  const token = b64u(crypto.getRandomValues(new Uint8Array(32)));
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sessions WHERE expires < ?").bind(Date.now()),
    env.DB.prepare("INSERT INTO sessions (token_hash, email, expires) VALUES (?, ?, ?)").bind(await sha256(token), email, Date.now() + SESSION_MS),
  ]);
  return token;
}
async function meFromEmail(env, email) {
  const user = await first(env, "SELECT email, name FROM users WHERE email = ?", email);
  const member = await first(env, "SELECT role, name FROM members WHERE email = ?", email);
  const owner = await first(env, "SELECT 1 AS x FROM members WHERE role = 'owner' LIMIT 1");
  return { email, name: (member && member.name) || (user && user.name) || "", role: member ? member.role : null, hasOwner: !!owner };
}
async function auth(req, env) {
  const h = req.headers.get("Authorization") || "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) throw httpErr(401, "Not signed in");
  const s = await first(env, "SELECT email, expires FROM sessions WHERE token_hash = ?", await sha256(token));
  if (!s || s.expires < Date.now()) throw httpErr(401, "Session ended. Please sign in again.");
  return { token, ...(await meFromEmail(env, s.email)) };
}
const needRole = (me, roles) => { if (!me.role || (roles && !roles.includes(me.role))) throw httpErr(403, "You do not have access to this."); };
const canWrite = (role, ds, personal) => role === "owner" || role === "controller" || (role === "staff" && STAFF_WRITE.includes(ds) && !personal);
const staffFilter = `dataset IN (${STAFF_READ.map((d) => `'${d}'`).join(", ")}) AND personal = 0`;

async function personalLabels(env) {
  const rows = await all(env, "SELECT data FROM records WHERE dataset = 'accounts' AND deleted = 0 AND personal = 1");
  return new Set(rows.map((r) => accLabel(JSON.parse(r.data))));
}
function isPersonal(ds, d, labels) {
  if (ds === "accounts") return d.type === "Personal" || d.company === "Personal";
  if (d.company === "Personal") return true;
  return !!(d.account && labels.has(d.account));
}

/* ---------- routes ---------- */
async function signup(env, body) {
  const email = cleanEmail(body.email), pw = String(body.password || ""), name = String(body.name || "").trim().slice(0, 80);
  if (!EMAIL_RE.test(email)) throw httpErr(400, "Type a valid email address.");
  if (pw.length < 8) throw httpErr(400, "Choose a password of at least 8 characters.");
  // Only the very first account (the Chairman, before an owner exists) is created here; the Chairman makes every other login
  const owner = await first(env, "SELECT 1 AS x FROM members WHERE role = 'owner' LIMIT 1");
  if (owner) throw httpErr(403, "Logins are made by the Chairman in Team & access.");
  if (await first(env, "SELECT 1 AS x FROM users WHERE email = ?", email)) throw httpErr(409, "An account with this email already exists. Sign in instead.");
  await env.DB.prepare("INSERT INTO users (email, name, pass, created_at) VALUES (?, ?, ?, ?)").bind(email, name || null, await hashPassword(pw), new Date().toISOString()).run();
  return { token: await newSession(env, email), me: await meFromEmail(env, email) };
}
async function login(env, body) {
  const email = cleanEmail(body.email), pw = String(body.password || "");
  const a = await first(env, "SELECT fails, since FROM attempts WHERE email = ?", email);
  if (a && Date.now() - a.since < FAIL_WINDOW && a.fails >= MAX_FAILS) throw httpErr(429, "Too many wrong passwords. Wait 15 minutes and try again.");
  const user = await first(env, "SELECT pass FROM users WHERE email = ?", email);
  if (!user || !(await verifyPassword(pw, user.pass))) {
    const fresh = !a || Date.now() - a.since >= FAIL_WINDOW;
    await env.DB.prepare("INSERT INTO attempts (email, fails, since) VALUES (?, 1, ?) ON CONFLICT(email) DO UPDATE SET fails = CASE WHEN ? THEN 1 ELSE fails + 1 END, since = CASE WHEN ? THEN excluded.since ELSE since END")
      .bind(email, Date.now(), fresh ? 1 : 0, fresh ? 1 : 0).run();
    throw httpErr(401, "Wrong email or password.");
  }
  await env.DB.prepare("DELETE FROM attempts WHERE email = ?").bind(email).run();
  return { token: await newSession(env, email), me: await meFromEmail(env, email) };
}
async function changePassword(env, me, body) {
  const user = await first(env, "SELECT pass FROM users WHERE email = ?", me.email);
  if (!user || !(await verifyPassword(String(body.current || ""), user.pass))) throw httpErr(400, "The current password is wrong.");
  const next = String(body.next || "");
  if (next.length < 8) throw httpErr(400, "Choose a password of at least 8 characters.");
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET pass = ? WHERE email = ?").bind(await hashPassword(next), me.email),
    env.DB.prepare("DELETE FROM sessions WHERE email = ? AND token_hash != ?").bind(me.email, await sha256(me.token)),
  ]);
  return { ok: true };
}
async function claimOwner(env, me, body) {
  const name = String(body.name || "").trim().slice(0, 80) || me.name || me.email;
  const r = await env.DB.prepare("INSERT INTO members (email, name, role, created_at) SELECT ?, ?, 'owner', ? WHERE NOT EXISTS (SELECT 1 FROM members WHERE role = 'owner') ON CONFLICT(email) DO UPDATE SET role = 'owner', name = excluded.name")
    .bind(me.email, name, new Date().toISOString()).run();
  if (!r.meta || !r.meta.changes) throw httpErr(409, "This system already has an owner.");
  return { me: await meFromEmail(env, me.email) };
}
async function currentRev(env) { return (await first(env, "SELECT v FROM meta WHERE k = 'rev'")).v; }
async function getData(env, me) {
  needRole(me);
  const where = me.role === "staff" ? `deleted = 0 AND ${staffFilter}` : "deleted = 0";
  const rev = await currentRev(env);
  const records = await all(env, `SELECT dataset, rid, data FROM records WHERE ${where} ORDER BY dataset, rid`);
  const settings = await all(env, `SELECT id, data FROM settings${me.role === "staff" ? " WHERE id = 'general'" : ""}`);
  return { rev, records: records.map((r) => ({ dataset: r.dataset, rid: r.rid, data: JSON.parse(r.data) })), settings: Object.fromEntries(settings.map((s) => [s.id, JSON.parse(s.data)])) };
}
async function getChanges(env, me, since) {
  needRole(me);
  const rev = await currentRev(env);
  const where = me.role === "staff" ? `rev > ? AND ${staffFilter}` : "rev > ?";
  const records = await all(env, `SELECT dataset, rid, data, deleted, rev FROM records WHERE ${where} ORDER BY rev LIMIT 2000`, since);
  const settings = await all(env, `SELECT id, data FROM settings WHERE rev > ?${me.role === "staff" ? " AND id = 'general'" : ""}`, since);
  const more = records.length === 2000;
  return { rev: more ? records[records.length - 1].rev : rev, more, records: records.map((r) => ({ dataset: r.dataset, rid: r.rid, deleted: !!r.deleted, data: r.deleted ? null : JSON.parse(r.data) })), settings: Object.fromEntries(settings.map((s) => [s.id, JSON.parse(s.data)])) };
}
async function sync(env, me, body) {
  needRole(me);
  const role = me.role;
  const ups = Array.isArray(body.upserts) ? body.upserts : [], dels = Array.isArray(body.deletes) ? body.deletes : [];
  if (ups.length + dels.length > 300) throw httpErr(413, "Too many changes in one request.");
  for (const u of ups) if (!DATASETS.includes(u.dataset) || !RID_RE.test(String(u.rid || "")) || !u.data || typeof u.data !== "object" || Array.isArray(u.data)) throw httpErr(400, "A record is not valid.");
  for (const d of dels) if (!DATASETS.includes(d.dataset) || !RID_RE.test(String(d.rid || ""))) throw httpErr(400, "A delete is not valid.");
  const labels = await personalLabels(env);
  for (const u of ups) if (u.dataset === "accounts" && isPersonal("accounts", u.data, labels)) labels.add(accLabel(u.data));
  const existing = new Map();
  if (role === "staff") {
    const keys = [...ups, ...dels];
    for (let i = 0; i < keys.length; i += 40) {
      const part = keys.slice(i, i + 40);
      const rows = await all(env, `SELECT dataset, rid, personal, deleted FROM records WHERE ${part.map(() => "(dataset = ? AND rid = ?)").join(" OR ")}`, ...part.flatMap((k) => [k.dataset, String(k.rid)]));
      rows.forEach((r) => existing.set(`${r.dataset}|${r.rid}`, r));
    }
  }
  const now = new Date().toISOString(), stmts = [];
  const bump = () => env.DB.prepare("UPDATE meta SET v = v + 1 WHERE k = 'rev'");
  for (const u of ups) {
    const personal = isPersonal(u.dataset, u.data, labels) ? 1 : 0;
    const ex = existing.get(`${u.dataset}|${u.rid}`);
    if (!canWrite(role, u.dataset, personal) || (ex && !ex.deleted && !canWrite(role, u.dataset, ex.personal))) throw httpErr(403, `You cannot change ${u.dataset}.`);
    const data = JSON.stringify({ ...u.data, id: String(u.rid) });
    if (data.length > 50000) throw httpErr(413, "A record is too large.");
    stmts.push(bump(), env.DB.prepare(`INSERT INTO records (dataset, rid, data, personal, deleted, rev, updated_at, updated_by)
      VALUES (?, ?, ?, ?, 0, (SELECT v FROM meta WHERE k = 'rev'), ?, ?)
      ON CONFLICT(dataset, rid) DO UPDATE SET data = excluded.data, personal = excluded.personal, deleted = 0, rev = excluded.rev, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
      .bind(u.dataset, String(u.rid), data, personal, now, me.email));
  }
  for (const d of dels) {
    const ex = existing.get(`${d.dataset}|${d.rid}`);
    if (role === "staff" && (!STAFF_WRITE.includes(d.dataset) || (ex && ex.personal))) throw httpErr(403, `You cannot delete from ${d.dataset}.`);
    stmts.push(bump(), env.DB.prepare("UPDATE records SET deleted = 1, rev = (SELECT v FROM meta WHERE k = 'rev'), updated_at = ?, updated_by = ? WHERE dataset = ? AND rid = ?").bind(now, me.email, d.dataset, String(d.rid)));
  }
  if (body.settings && typeof body.settings === "object") {
    if (role !== "owner" && role !== "controller") throw httpErr(403, "You cannot change settings.");
    for (const [id, data] of Object.entries(body.settings)) {
      if (id !== "general" && id !== "private") continue;
      stmts.push(bump(), env.DB.prepare(`INSERT INTO settings (id, data, rev, updated_at, updated_by) VALUES (?, ?, (SELECT v FROM meta WHERE k = 'rev'), ?, ?)
        ON CONFLICT(id) DO UPDATE SET data = excluded.data, rev = excluded.rev, updated_at = excluded.updated_at, updated_by = excluded.updated_by`).bind(id, JSON.stringify(data || {}), now, me.email));
    }
  }
  if (stmts.length) await env.DB.batch(stmts);
  return { ok: true };
}
async function setPassword(env, email, pw, name) {
  if (pw.length < 8) throw httpErr(400, "Choose a password of at least 8 characters.");
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (email, name, pass, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET pass = excluded.pass")
      .bind(email, name || null, await hashPassword(pw), new Date().toISOString()),
    env.DB.prepare("DELETE FROM sessions WHERE email = ?").bind(email),
    env.DB.prepare("DELETE FROM attempts WHERE email = ?").bind(email),
  ]);
}
async function members(env, me, action, body) {
  needRole(me, ["owner"]);
  if (action === "list") {
    const rows = await all(env, `SELECT m.email, m.name, m.role, CASE WHEN u.email IS NULL THEN 0 ELSE 1 END AS has_account FROM members m LEFT JOIN users u ON u.email = m.email
      ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'controller' THEN 1 ELSE 2 END, m.email`);
    return { members: rows.map((r) => ({ email: r.email, name: r.name, role: r.role, hasAccount: !!r.has_account })) };
  }
  const email = cleanEmail(body.email);
  if (!EMAIL_RE.test(email)) throw httpErr(400, "Type a valid email address.");
  if (action === "save") {
    const role = String(body.role || "");
    if (!ROLES.includes(role)) throw httpErr(400, "Choose a role.");
    if (email === me.email && role !== "owner") throw httpErr(400, "You cannot remove your own owner access.");
    const name = String(body.name || "").trim().slice(0, 80) || null, pw = body.password == null ? "" : String(body.password);
    if (pw && email === me.email) throw httpErr(400, "Change your own password with the Password button.");
    if (pw && pw.length < 8) throw httpErr(400, "Choose a password of at least 8 characters.");
    await env.DB.prepare("INSERT INTO members (email, name, role, created_at) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO UPDATE SET role = excluded.role, name = COALESCE(excluded.name, members.name)")
      .bind(email, name, role, new Date().toISOString()).run();
    if (pw) await setPassword(env, email, pw, name);
    return { ok: true };
  }
  if (action === "delete") {
    if (email === me.email) throw httpErr(400, "You cannot remove yourself.");
    await env.DB.batch(["members", "users", "sessions", "attempts"].map((t) => env.DB.prepare(`DELETE FROM ${t} WHERE email = ?`).bind(email)));
    return { ok: true };
  }
  if (action === "password") {
    if (email === me.email) throw httpErr(400, "Change your own password with the Password button.");
    const member = await first(env, "SELECT name FROM members WHERE email = ?", email);
    if (!member) throw httpErr(404, "This person is not in the team.");
    await setPassword(env, email, String(body.password || ""), member.name);
    return { ok: true };
  }
  throw httpErr(404, "Unknown action.");
}

async function route(req, env, url) {
  const p = url.pathname.replace(/\/+$/, "");
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
  if (p === "" || p === "/api" || p === "/api/health") return json({ ok: true, service: "group-finance" });
  if (req.method === "POST" && p === "/api/signup") return json(await signup(env, body));
  if (req.method === "POST" && p === "/api/login") return json(await login(env, body));
  const me = await auth(req, env);
  if (req.method === "GET" && p === "/api/me") return json({ me: { email: me.email, name: me.name, role: me.role, hasOwner: me.hasOwner } });
  if (req.method === "POST" && p === "/api/logout") { await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(me.token)).run(); return json({ ok: true }); }
  if (req.method === "POST" && p === "/api/password") return json(await changePassword(env, me, body));
  if (req.method === "POST" && p === "/api/claim-owner") return json(await claimOwner(env, me, body));
  if (req.method === "GET" && p === "/api/data") return json(await getData(env, me));
  if (req.method === "GET" && p === "/api/changes") return json(await getChanges(env, me, Number(url.searchParams.get("since")) || 0));
  if (req.method === "POST" && p === "/api/sync") return json(await sync(env, me, body));
  if (req.method === "GET" && p === "/api/members") return json(await members(env, me, "list", {}));
  if (req.method === "POST" && p === "/api/members") return json(await members(env, me, "save", body));
  if (req.method === "POST" && p === "/api/members/delete") return json(await members(env, me, "delete", body));
  if (req.method === "POST" && p === "/api/members/password") return json(await members(env, me, "password", body));
  throw httpErr(404, "Not found");
}

export default {
  async fetch(req, env) {
    const cors = corsHeaders(req.headers.get("Origin") || "");
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    try {
      return withCors(await route(req, env, new URL(req.url)), cors);
    } catch (e) {
      if (!e.expose) console.error(e && e.stack ? e.stack : e);
      return withCors(json({ error: e.expose ? e.message : "Server error. Please try again." }, e.status || 500), cors);
    }
  },
};
