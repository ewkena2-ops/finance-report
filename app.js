/* ==========================================================================
   Group Finance Reporting — app
   Nine reports for the group finance controller, calculated from the data
   sheet. Figures are shared online through the Cloudflare server named in
   config.js (with login and roles), or saved on this device when it is empty.
   ========================================================================== */
(() => {
  "use strict";

  /* ---------- DOM helpers ---------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  function h(tag, props, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(props || {})) {
      if (v == null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "value") el.value = v;
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    }
    for (const kid of kids.flat(Infinity)) {
      if (kid == null || kid === false) continue;
      el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
    }
    return el;
  }
  const SVGNS = "http://www.w3.org/2000/svg";
  function s(tag, attrs, ...kids) {
    const el = document.createElementNS(SVGNS, tag);
    for (const [k, v] of Object.entries(attrs || {})) if (v != null) el.setAttribute(k, v);
    for (const kid of kids.flat()) { if (kid != null) el.append(kid instanceof Node ? kid : document.createTextNode(String(kid))); }
    return el;
  }
  // Static, trusted icon markup only.
  const ICONS = {
    grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    cash: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    trend: '<path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    bank: '<path d="M3 10 12 4l9 6"/><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h5"/>',
    award: '<circle cx="12" cy="8" r="6"/><path d="M8.2 13.2 7 22l5-3 5 3-1.2-8.8"/>',
    sheet: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18"/>',
    check: '<circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    alertTri: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/>',
    alertCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    xCircle: '<circle cx="12" cy="12" r="9"/><path d="m15 9-6 6M9 9l6 6"/>',
    circle: '<circle cx="12" cy="12" r="8"/>',
    arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
    arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 21V9M7 14l5-5 5 5M5 3h14"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    trash: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>',
    send: '<path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/>',
    pdf: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M12 11v6M9 14l3 3 3-3"/>',
  };
  function icon(name) {
    const t = document.createElement("template");
    t.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICONS[name] || ""}</svg>`;
    return t.content.firstChild;
  }

  /* ---------- reports, deadlines and lists ---------- */
  const REPORTS = [
    { no: 1, id: "r1", title: "Daily Group Cash Report", freq: "daily", time: "09:00" },
    { no: 2, id: "r2", title: "7-Day Cash Flow Forecast", freq: "daily", time: "09:00" },
    { no: 3, id: "r3", title: "Daily Personal Cash Flow Report", freq: "daily", time: "09:00" },
    { no: 4, id: "r4", title: "4-Week Projection", freq: "weekly", dow: 4, time: "17:00" },
    { no: 5, id: "r5", title: "Finance Control Report", freq: "weekly", dow: 5, time: "17:00" },
    { no: 6, id: "r6", title: "Bank Reconciliation", freq: "weekly", dow: 1, time: "12:00", withOfficer: true },
    { no: 7, id: "r7", title: "Monthly Consolidated Financial Statement", freq: "monthly", dom: 7 },
    { no: 8, id: "r8", title: "Finance Staff Performance Review", freq: "monthly", dom: 5 },
    { no: 9, id: "r9", title: "Incident Report", freq: "ondemand" },
  ];
  const DOW = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const INCIDENT_TYPES = ["Cash discrepancy", "Unauthorized payment attempt", "Bank account issue", "Loan default risk", "Tax deadline risk", "Suspected fraud"];
  const SENSITIVITY = ["Immediate", "Within 24 hours", "Within 7 days"];
  const INC_STATUS = ["Open", "Decision given", "Closed"];
  const FC_STATUS = ["Expected", "Confirmed", "Done", "Cancelled"];
  const OBL_STATUS = ["Current", "At risk", "Missed", "Paid off"];
  const EXP_CATS = [["payroll", "Payroll"], ["loanInterest", "Loan interest"], ["utilities", "Utilities"], ["tax", "Tax"], ["other", "Other"]];

  /* ---------- data store ---------- */
  const SAMPLE = window.REPORT_DATA || { company: {} };
  const STORE_KEY = "gf-reports-v1";
  const DATASETS = ["accounts", "balances", "transactions", "forecast", "obligations", "reconItems", "monthly", "staffReviews", "teamAssessment", "incidents", "submissions"];
  const clone = (o) => JSON.parse(JSON.stringify(o));
  function normalize(d) {
    const out = clone(d || {});
    out.company = { ...(SAMPLE.company || {}), ...(out.company || {}) };
    for (const k of DATASETS) if (!Array.isArray(out[k])) out[k] = [];
    return out;
  }
  // Online mode: when config.js names the Cloudflare Worker API, figures are shared and need a login
  const CFG = window.FINANCE_CONFIG || {};
  const CONNECTED = !!CFG.apiUrl;
  const STAFF_SHEETS = ["accounts", "balances", "transactions", "forecast", "reconItems", "monthly"];
  const STAFF_WRITE = ["balances", "transactions", "forecast", "reconItems", "monthly"];
  const PRIVATE_KEYS = ["fixedPay", "complianceBonus", "accuracyBonus"];
  const ROLE_LABEL = { owner: "Chairman (owner)", controller: "Finance controller", staff: "Finance staff" };
  let ROLE = null, ME = null;
  const canSee = (id) => ROLE !== "staff" || STAFF_SHEETS.includes(id);
  const canWrite = (id) => !CONNECTED || ROLE === "owner" || ROLE === "controller" || STAFF_WRITE.includes(id);
  let LOCAL = false;
  function loadData() {
    if (CONNECTED) return normalize({});
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) { LOCAL = true; return normalize(JSON.parse(raw)); }
    } catch (e) { /* storage unavailable */ }
    LOCAL = false;
    return normalize(SAMPLE);
  }
  let D = loadData();
  let dirty = false;
  function saveData() {
    LOCAL = true; dirty = true;
    if (CONNECTED) { scheduleSync(); return; }
    try { localStorage.setItem(STORE_KEY, JSON.stringify(D)); } catch (e) { toast("Could not save on this device (storage is blocked). Export to Excel to keep your changes."); }
  }

  /* ---------- formatting & dates ---------- */
  let C, LOC, CUR, fMoney, fMoneyC, fNum, fPct, fDate, fDay, fLong, fMonth;
  function buildFormats() {
    C = D.company;
    LOC = C.locale || "en-US";
    CUR = String(C.currency || "ETB").trim().toUpperCase();
    try { new Intl.NumberFormat(LOC); } catch (e) { LOC = "en-US"; }
    try { new Intl.NumberFormat(LOC, { style: "currency", currency: CUR }); } catch (e) { CUR = "ETB"; }
    fMoney = new Intl.NumberFormat(LOC, { style: "currency", currency: CUR, minimumFractionDigits: 2, maximumFractionDigits: 2 });
    fMoneyC = new Intl.NumberFormat(LOC, { style: "currency", currency: CUR, notation: "compact", maximumFractionDigits: 1 });
    fNum = new Intl.NumberFormat(LOC);
    fPct = new Intl.NumberFormat(LOC, { style: "percent", maximumFractionDigits: 1 });
    fDate = new Intl.DateTimeFormat(LOC, { day: "numeric", month: "short", year: "numeric" });
    fDay = new Intl.DateTimeFormat(LOC, { weekday: "short", day: "numeric", month: "short" });
    fLong = new Intl.DateTimeFormat(LOC, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    fMonth = new Intl.DateTimeFormat(LOC, { month: "long", year: "numeric" });
  }
  const n0 = (v) => Number(v) || 0;
  const blank = (v) => v === "" || v == null;
  const money = (n) => fMoney.format(n0(n));
  const moneyC = (n) => (Math.abs(n0(n)) < 10000 ? fMoney.format(Math.round(n0(n))).replace(/\.00$/, "") : fMoneyC.format(n0(n)));
  const num = (n) => fNum.format(n);
  const pct = (n) => (Number.isFinite(n) ? fPct.format(n) : "—");
  const isoRe = /^\d{4}-\d{2}-\d{2}$/;
  const isISO = (v) => isoRe.test(String(v ?? ""));
  const isMonth = (v) => /^\d{4}-\d{2}$/.test(String(v ?? ""));
  const pad2 = (n) => String(n).padStart(2, "0");
  const parseD = (str) => { const [y, m, d] = String(str).split("-").map(Number); return new Date(y, m - 1, d || 1); };
  const toISO = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const todayISO = () => toISO(new Date());
  const nowHM = () => { const d = new Date(); return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`; };
  const addDays = (iso, n) => { const d = parseD(iso); d.setDate(d.getDate() + n); return toISO(d); };
  const isoDow = (iso) => ((parseD(iso).getDay() + 6) % 7) + 1; // 1 = Monday
  const weekStart = (iso) => addDays(iso, 1 - isoDow(iso));
  const monthOf = (iso) => String(iso).slice(0, 7);
  const addMonths = (m, n) => { const [y, mo] = m.split("-").map(Number); const d = new Date(y, mo - 1 + n, 1); return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`; };
  const monthEnd = (m) => { const [y, mo] = m.split("-").map(Number); return toISO(new Date(y, mo, 0)); };
  const daysBetween = (a, b) => Math.round((parseD(b) - parseD(a)) / 86400000);
  const fdate = (str) => (isISO(str) ? fDate.format(parseD(str)) : String(str || "—"));
  const fday = (str) => (isISO(str) ? fDay.format(parseD(str)) : String(str || "—"));
  const flong = (str) => (isISO(str) ? fLong.format(parseD(str)) : String(str || "—"));
  const fmonth = (m) => (isMonth(m) ? fMonth.format(parseD(`${m}-01`)) : String(m || "—"));
  const within = (v, a, b) => isISO(v) && v >= a && v <= b;
  const listText = (arr, max = 4) => (arr.length <= max ? arr.join(", ") : `${arr.slice(0, max).join(", ")} and ${arr.length - max} more`);
  const sum = (arr, f = (x) => x.amount) => arr.reduce((a, x) => a + n0(f(x)), 0);
  const uniq = (arr) => [...new Set(arr.filter((v) => v !== "" && v != null))].sort();
  const companyList = () => String(C.companies || "").split(",").map((x) => x.trim()).filter(Boolean);
  const staffList = () => String(C.staff || "").split(";").map((x) => x.trim()).filter(Boolean).map((x) => { const [name, ...role] = x.split(/\s[—–-]\s/); return { name: name.trim(), role: role.join(" - ").trim() }; });
  const accLabel = (a) => [a.company, [a.bank, a.account].filter(Boolean).join(" ")].filter(Boolean).join(" · ");

  /* ---------- state ---------- */
  const state = { date: todayISO(), month: null };
  let V = {};

  /* ---------- deadlines & submissions ---------- */
  const isWorkDay = (iso) => (C.workOnSunday === "Yes" ? true : isoDow(iso) !== 7);
  const recipients = (rep) => (rep.withOfficer ? `${C.chairman || "Chairman"} + ${C.financeOfficer || "finance officer"}` : `${C.chairman || "Chairman"} only`);
  function whenText(rep) {
    if (rep.freq === "daily") return `Daily · ${fmtTime(rep.time)}`;
    if (rep.freq === "weekly") return `Weekly · ${DOW[rep.dow]} ${fmtTime(rep.time)}`;
    if (rep.freq === "monthly") return `Monthly · by the ${rep.dom}th`;
    return "Immediately when an issue occurs";
  }
  function fmtTime(hm) { const [H, M] = hm.split(":").map(Number); return `${((H + 11) % 12) + 1}:${pad2(M)} ${H < 12 ? "AM" : "PM"}`; }
  function periodOf(rep, T) {
    if (rep.freq === "daily") return T;
    if (rep.freq === "weekly") return weekStart(T);
    if (rep.freq === "monthly") return state.month;
    return null;
  }
  function dueOf(rep, period) {
    if (rep.freq === "daily") return `${period}T${rep.time}`;
    if (rep.freq === "weekly") return `${addDays(period, rep.dow - 1)}T${rep.time}`;
    if (rep.freq === "monthly") return `${addMonths(period, 1)}-${pad2(rep.dom)}T23:59`;
    return null;
  }
  function periodText(rep, period) {
    if (rep.freq === "daily") return fday(period);
    if (rep.freq === "weekly") return `Week of ${fday(period)}`;
    if (rep.freq === "monthly") return fmonth(period);
    return String(period || "");
  }
  const nowStamp = () => `${todayISO()}T${nowHM()}`;
  const subFor = (no, period) => D.submissions.find((x) => String(x.report) === String(no) && String(x.period) === String(period));
  function statusOf(rep, period) {
    if (rep.freq === "daily" && !isWorkDay(period)) return { state: "none", label: "No report (Sunday)" };
    const due = dueOf(rep, period);
    const sub = subFor(rep.no, period);
    if (sub) {
      const at = `${sub.date}T${sub.time || "00:00"}`;
      return at <= due ? { state: "ok", label: "Sent on time", sub, due } : { state: "late", label: "Sent late", sub, due };
    }
    if (nowStamp() > due) return { state: "missing", label: "Not sent", due };
    if (due.slice(0, 10) === todayISO()) return { state: "due", label: `Due today ${fmtTime(due.slice(11))}`, due };
    return { state: "notyet", label: `Due ${fday(due.slice(0, 10))}`, due };
  }
  const STATE_TONE = { ok: "good", late: "serious", missing: "critical", due: "warning", notyet: "neutral", none: "neutral" };
  const STATE_ICON = { ok: "check", late: "alertTri", missing: "alertCircle", due: "clock", notyet: "circle", none: "circle" };
  const stateBadge = (st) => h("span", { class: `badge ${STATE_TONE[st.state]}` }, icon(STATE_ICON[st.state]), st.label);

  function requiredInMonth(M) {
    const first = `${M}-01`, last = monthEnd(M), items = [];
    for (let d = first; d <= last; d = addDays(d, 1)) if (isWorkDay(d)) REPORTS.filter((r) => r.freq === "daily").forEach((rep) => items.push({ rep, period: d }));
    for (let w = weekStart(first); w <= last; w = addDays(w, 7)) REPORTS.filter((r) => r.freq === "weekly").forEach((rep) => { if (within(dueOf(rep, w).slice(0, 10), first, last)) items.push({ rep, period: w }); });
    REPORTS.filter((r) => r.freq === "monthly").forEach((rep) => items.push({ rep, period: addMonths(M, -1) }));
    return items.map((it) => ({ ...it, st: statusOf(it.rep, it.period) }));
  }

  /* ---------- balances ---------- */
  function latest(label, X, field) {
    let best = null;
    for (const r of D.balances) {
      if (r.account !== label || !isISO(r.date) || r.date > X || blank(r[field])) continue;
      if (!best || r.date > best.date) best = r;
    }
    return best ? { value: n0(best[field]), date: best.date } : null;
  }
  function accState(a, X) {
    const b = latest(a.label, X, "book");
    const min = n0(a.minBalance);
    return { ...a, balance: b ? b.value : null, asOf: b ? b.date : null, stale: !b || b.date !== X, low: !!b && min > 0 && b.value < min };
  }
  const outstandingOf = (o) => (!blank(o.outstanding) ? n0(o.outstanding) : Math.max(0, n0(o.owed) - n0(o.paidToDate)));

  /* ---------- view model ---------- */
  function buildView() {
    const T = state.date, Y = addDays(T, -1), ws = weekStart(T), we = addDays(ws, 6), M = state.month;
    const v = { T, Y, ws, we, M };
    const cos = companyList();
    const accs = D.accounts.map((a) => ({ ...a, label: accLabel(a), type: a.type || "Company" }));
    v.accs = accs;
    const compAccs = accs.filter((a) => a.type !== "Personal"), persAccs = accs.filter((a) => a.type === "Personal");
    const allCos = uniq([...cos, ...compAccs.map((a) => a.company)]).sort((a, b) => (cos.indexOf(a) + 1 || 99) - (cos.indexOf(b) + 1 || 99));
    v.companies = allCos;
    const tx = (d, co, dir) => sum(D.transactions.filter((t) => t.date === d && t.company === co && t.direction === dir));

    // R1
    v.r1acc = compAccs.map((a) => accState(a, T));
    const yAcc = compAccs.map((a) => accState(a, Y));
    v.r1co = allCos.map((c) => ({
      company: c, cash: sum(v.r1acc.filter((a) => a.company === c), (a) => a.balance), prev: sum(yAcc.filter((a) => a.company === c), (a) => a.balance),
      inY: tx(Y, c, "In"), outY: tx(Y, c, "Out"), accounts: v.r1acc.filter((a) => a.company === c).length,
    }));
    v.groupCash = sum(v.r1acc, (a) => a.balance);
    v.groupCashY = sum(yAcc, (a) => a.balance);
    v.inY = sum(v.r1co, (c) => c.inY); v.outY = sum(v.r1co, (c) => c.outY);
    v.stale = v.r1acc.filter((a) => a.stale); v.low = v.r1acc.filter((a) => a.low);

    // R2
    const active = (f) => !["Done", "Cancelled"].includes(f.status);
    const fcCo = D.forecast.filter((f) => f.company !== "Personal" && active(f));
    const dayFlow = (d, dir) => sum(fcCo.filter((f) => f.date === d && f.direction === dir));
    v.minTotal = sum(compAccs, (a) => a.minBalance);
    let run = v.groupCash;
    v.days7 = Array.from({ length: 7 }, (_, i) => {
      const d = addDays(T, i), inflow = dayFlow(d, "In"), outflow = dayFlow(d, "Out");
      const opening = run; run = run + inflow - outflow;
      return { date: d, opening, inflow, outflow, closing: run, short: run < 0 || (v.minTotal > 0 && run < v.minTotal) };
    });
    v.low7 = Math.min(...v.days7.map((x) => x.closing));
    v.low7Day = v.days7.find((x) => x.closing === v.low7);
    v.r2items = fcCo.filter((f) => within(f.date, T, addDays(T, 6))).sort((a, b) => a.date.localeCompare(b.date));
    v.dayLabels = v.days7.map((x) => ({ short: fDay.format(parseD(x.date)).split(",")[0], long: flong(x.date) }));

    // R3
    v.r3acc = persAccs.map((a) => accState(a, T));
    v.persCash = sum(v.r3acc, (a) => a.balance);
    v.persCashY = sum(persAccs.map((a) => accState(a, Y)), (a) => a.balance);
    v.r3moves = D.transactions.filter((t) => t.company === "Personal" && (t.date === Y || t.date === T)).sort((a, b) => b.date.localeCompare(a.date));
    v.r3in = sum(v.r3moves.filter((t) => t.date === Y && t.direction === "In"));
    v.r3out = sum(v.r3moves.filter((t) => t.date === Y && t.direction === "Out"));
    v.r3up = D.forecast.filter((f) => f.company === "Personal" && active(f) && within(f.date, T, addDays(T, 6))).sort((a, b) => a.date.localeCompare(b.date));

    // R4: the next four calendar weeks
    const w1 = addDays(ws, 7);
    let open4 = v.groupCash + sum(fcCo.filter((f) => within(f.date, T, addDays(w1, -1)) && f.direction === "In")) - sum(fcCo.filter((f) => within(f.date, T, addDays(w1, -1)) && f.direction === "Out"));
    v.weeks4 = Array.from({ length: 4 }, (_, i) => {
      const a = addDays(w1, i * 7), b = addDays(a, 6);
      const items = fcCo.filter((f) => within(f.date, a, b));
      const inflow = sum(items.filter((f) => f.direction === "In")), outflow = sum(items.filter((f) => f.direction === "Out"));
      const opening = open4; open4 = open4 + inflow - outflow;
      const dues = D.obligations.filter((o) => within(o.nextDueDate, a, b) && o.status !== "Paid off");
      const byCo = Object.fromEntries(allCos.map((c) => [c, sum(items.filter((f) => f.company === c && f.direction === "In")) - sum(items.filter((f) => f.company === c && f.direction === "Out"))]));
      return { start: a, end: b, inflow, outflow, net: inflow - outflow, opening, closing: open4, dues, duesTotal: sum(dues, (o) => o.monthlyPayment), byCo };
    });
    v.weekLabels = v.weeks4.map((w, i) => ({ short: `Wk ${i + 1}`, long: `Week of ${fdate(w.start)}` }));

    // R5
    const limit = n0(C.largePayment) || 50000;
    v.limit = limit;
    v.large = D.transactions.filter((t) => within(t.date, ws, we) && t.direction === "Out" && t.company !== "Personal" && n0(t.amount) >= limit)
      .map((t) => ({ ...t, noApproval: !String(t.approvedBy || "").trim() })).sort((a, b) => b.amount - a.amount);
    v.dead14 = D.obligations.filter((o) => o.status !== "Paid off" && (within(o.nextDueDate, T, addDays(T, 14)) || o.status === "At risk" || o.status === "Missed"))
      .sort((a, b) => String(a.nextDueDate).localeCompare(String(b.nextDueDate)));
    v.subsWeek = [];
    for (let d = ws; d <= we; d = addDays(d, 1)) if (isWorkDay(d)) REPORTS.filter((r) => r.freq === "daily").forEach((rep) => v.subsWeek.push({ rep, period: d }));
    REPORTS.filter((r) => r.freq === "weekly").forEach((rep) => v.subsWeek.push({ rep, period: ws }));
    REPORTS.filter((r) => r.freq === "monthly").forEach((rep) => { const p = addMonths(monthOf(T), -1); if (within(dueOf(rep, p).slice(0, 10), ws, we)) v.subsWeek.push({ rep, period: p }); });
    v.subsWeek = v.subsWeek.map((x) => ({ ...x, st: statusOf(x.rep, x.period) }));
    v.incWeek = D.incidents.filter((i) => within(i.date, ws, we));

    // R6
    v.r6 = accs.map((a) => {
      const b = latest(a.label, T, "book"), k = latest(a.label, T, "bank");
      const items = D.reconItems.filter((r) => r.account === a.label && (r.status || "Open") === "Open" && (!isISO(r.date) || r.date <= T));
      const diff = b && k ? b.value - k.value : null;
      const explained = sum(items);
      const unexplained = diff == null ? null : diff - explained;
      return { ...a, book: b ? b.value : null, bankBal: k ? k.value : null, bankDate: k ? k.date : null, diff, items, explained, unexplained };
    });
    v.r6items = v.r6.flatMap((a) => a.items.map((it) => ({ ...it, label: a.label })));
    v.r6disc = v.r6.filter((a) => a.unexplained != null && Math.abs(a.unexplained) > 0.5);
    v.r6missing = v.r6.filter((a) => a.diff == null);
    v.openRecon = D.reconItems.filter((r) => (r.status || "Open") === "Open");

    // R7
    const mEnd = monthEnd(M);
    const accEnd = compAccs.map((a) => accState(a, mEnd));
    v.r7cash = allCos.map((c) => ({ company: c, cash: sum(accEnd.filter((a) => a.company === c), (a) => a.balance) }));
    const mRows = D.monthly.filter((r) => String(r.month).slice(0, 7) === M);
    v.r7rev = allCos.map((c) => ({ company: c, revenue: sum(mRows.filter((r) => r.company === c), (r) => r.revenue) }));
    v.r7exp = EXP_CATS.map(([k, label]) => ({ label, amount: sum(mRows, (r) => r[k]) }));
    v.revenue = sum(v.r7rev, (r) => r.revenue); v.expenses = sum(v.r7exp);
    v.debt = D.obligations.filter((o) => o.status !== "Paid off").map((o) => ({ ...o, out: outstandingOf(o) }));
    const taxes = D.obligations.filter((o) => o.type === "Tax");
    v.tax = { owed: sum(taxes, (o) => o.owed), paid: sum(taxes, (o) => o.paidToDate), remaining: sum(taxes, outstandingOf) };
    v.assets = sum(mRows, (r) => r.assets); v.liabilities = sum(mRows, (r) => r.liabilities);
    v.mRows = mRows;

    // R8
    const reviews = D.staffReviews.filter((r) => String(r.month).slice(0, 7) === M);
    const names = uniq([...staffList().map((x) => x.name), ...reviews.map((r) => r.name)]);
    v.staff = names.map((name) => {
      const r = reviews.find((x) => x.name === name);
      const role = (r && r.role) || (staffList().find((x) => x.name === name) || {}).role || "";
      return { name, role, review: r || null };
    });
    v.team = D.teamAssessment.find((r) => String(r.month).slice(0, 7) === M) || null;

    // R9
    const rank = { Open: 0, "Decision given": 1, Closed: 2 };
    v.incidents = [...D.incidents].sort((a, b) => (rank[a.status || "Open"] - rank[b.status || "Open"]) || String(b.date).localeCompare(String(a.date)));
    v.incOpen = D.incidents.filter((i) => (i.status || "Open") === "Open");
    v.incMonth = D.incidents.filter((i) => monthOf(i.date) === M);

    // Deadlines (current period of each report as of the report date)
    v.deadlines = REPORTS.filter((r) => r.freq !== "ondemand").map((rep) => {
      const period = rep.freq === "monthly" ? addMonths(monthOf(T), -1) : periodOf(rep, T);
      return { rep, period, st: statusOf(rep, period) };
    });
    v.dueToday = REPORTS.filter((rep) => rep.freq !== "ondemand").map((rep) => {
      const period = rep.freq === "monthly" ? addMonths(monthOf(T), -1) : periodOf(rep, T);
      return { rep, period, st: statusOf(rep, period), dueDate: (dueOf(rep, period) || "").slice(0, 10) };
    }).filter((x) => x.dueDate === T && x.st.state !== "none");

    // Compensation (month M)
    v.CM = monthOf(T);
    v.req = requiredInMonth(v.CM);
    const passed = v.req.filter((x) => ["ok", "late", "missing"].includes(x.st.state));
    v.cOnTime = passed.filter((x) => x.st.state === "ok").length;
    v.cLate = passed.filter((x) => x.st.state === "late").length;
    v.cMissing = passed.filter((x) => x.st.state === "missing").length;
    v.cPending = v.req.length - passed.length;
    v.cDiscrepancies = D.incidents.filter((i) => monthOf(i.date) === v.CM && i.type === "Cash discrepancy").length;
    v.cUnauthorized = D.incidents.filter((i) => monthOf(i.date) === v.CM && i.type === "Unauthorized payment attempt").length;
    v.cMissedDeadlines = D.obligations.filter((o) => o.status === "Missed" && monthOf(o.nextDueDate) === v.CM).length;
    return v;
  }

  /* ---------- small components ---------- */
  function deltaChip(cur, prev, { upGood = true } = {}) {
    if (prev == null || !Number.isFinite(prev) || !Number.isFinite(cur) || prev === 0) return null;
    const change = (cur - prev) / Math.abs(prev);
    if (Math.abs(change) < 0.0005) return h("span", { class: "delta flat" }, "Same");
    const up = change > 0;
    return h("span", { class: `delta ${up === upGood ? "good" : "bad"}` }, icon(up ? "arrowUp" : "arrowDown"), change >= 9 ? `${num(Math.round(cur / prev))}×` : pct(Math.abs(change)));
  }
  const STATUS = {
    Current: "good", "Paid off": "neutral", "At risk": "warning", Missed: "critical", Resolved: "good",
    Open: "serious", "Decision given": "warning", Closed: "good", Immediate: "critical", "Within 24 hours": "serious", "Within 7 days": "warning",
    Expected: "warning", Confirmed: "good", Done: "neutral", Cancelled: "neutral", Shortfall: "critical", OK: "good", "Not updated": "warning", "Below minimum": "critical",
    Matched: "good", Explained: "warning", "Action needed": "critical", "No bank balance": "neutral", "No approver": "critical", Approved: "good",
  };
  const TONE_ICON = { good: "check", warning: "clock", serious: "alertTri", critical: "alertCircle", neutral: "circle" };
  const badge = (text, tone) => { const t = tone || STATUS[text] || "neutral"; return h("span", { class: `badge ${t}` }, icon(text === "Cancelled" ? "xCircle" : TONE_ICON[t]), text || "—"); };
  const twoLine = (a, b) => [h("span", { class: "strong" }, a || "—"), b ? h("span", { class: "sub" }, b) : null];
  const warn = (text) => h("span", { class: "delta bad" }, icon("alertCircle"), text);
  const neg = (n) => (n0(n) < 0 ? h("span", { class: "neg" }, money(n)) : money(n));
  function emptyState(title = "Nothing here", text = "Add figures in the Data sheet and this fills in.") { return h("div", { class: "empty" }, h("strong", {}, title), text); }
  function statStrip(el, items) {
    el.replaceChildren(...items.map((it) => h("div", { class: "stat" },
      h("span", { class: "stat-label" }, it.label), h("span", { class: "stat-value", title: it.title || null }, it.value), it.foot ? h("span", { class: "stat-foot" }, it.foot) : null)));
  }
  function table({ head, rows, num: numCols = [], foot, empty, rowClass }) {
    const cls = (i) => (numCols.includes(i) ? "num" : null);
    const t = h("table", { class: "dt" },
      h("thead", {}, h("tr", {}, head.map((c, i) => h("th", { class: cls(i), scope: "col" }, c)))),
      h("tbody", {}, rows.length ? rows.map((r, ri) => h("tr", { class: rowClass ? rowClass(ri) : null }, r.map((c, i) => h("td", { class: cls(i) }, c)))) : h("tr", {}, h("td", { colspan: head.length }, empty || emptyState()))));
    if (foot && rows.length) t.append(h("tfoot", {}, h("tr", {}, foot.map((c, i) => h("td", { class: cls(i) }, c)))));
    return h("div", { class: "table-wrap", style: "border-top:0" }, t);
  }
  const put = (sel, node) => $(sel).replaceChildren(node);

  /* ---------- tooltip & toast ---------- */
  const tip = $("#tooltip");
  function showTip(x, y, title, rows) {
    tip.replaceChildren(h("div", { class: "tip-title" }, title), ...rows.map((r) => h("div", { class: "tip-row" + (r.sep ? " sep" : "") }, h("span", { class: "tip-key" + (r.key ? " k-" + r.key : "") }), h("strong", {}, r.value), h("span", {}, r.label || ""))));
    tip.hidden = false;
    const w = tip.offsetWidth, ht = tip.offsetHeight;
    let left = x + 14, top = y - ht - 12;
    if (left + w > innerWidth - 8) left = x - w - 14;
    if (left < 8) left = 8;
    if (top < 8) top = y + 18;
    tip.style.left = `${left}px`; tip.style.top = `${top}px`;
  }
  const hideTip = () => { tip.hidden = true; };
  function tipAt(el, title, rows) { const r = el.getBoundingClientRect(); showTip(r.left + r.width / 2, r.top, title, rows); }
  addEventListener("scroll", hideTip, { passive: true });
  const toastEl = $("#toast");
  let toastTimer = 0;
  function toast(text, action) {
    clearTimeout(toastTimer);
    toastEl.replaceChildren(h("span", {}, text));
    if (action) { const b = h("button", { type: "button" }, action.label); b.addEventListener("click", () => { toastEl.hidden = true; action.run(); }); toastEl.append(b); }
    toastEl.hidden = false;
    toastTimer = setTimeout(() => (toastEl.hidden = true), action ? 7000 : 4000);
  }

  /* ---------- charts ---------- */
  function niceScale(max, count = 4) {
    if (!(max > 0)) max = 1;
    const raw = max / count, pow = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map((m) => m * pow).find((x) => x >= raw) || 10 * pow;
    const top = Math.ceil(max / step) * step, ticks = [];
    for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
    return { top, ticks };
  }
  const tickRoom = (ticks, fmt) => Math.max(30, Math.max(...ticks.map((t) => fmt(t).length)) * 6.4 + 12);
  function colPath(x, yTop, w, yBase) {
    const hgt = yBase - yTop;
    if (hgt <= 0.5) return "";
    const r = Math.min(4, w / 2, hgt);
    return `M${x},${yBase}V${yTop + r}A${r},${r} 0 0 1 ${x + r},${yTop}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${yTop + r}V${yBase}Z`;
  }
  function drawColumns(el, { labels, series, selected, fmt, fmtTick, extraRows, label, emptyText }) {
    if (series.every((se) => se.values.every((v) => !v))) { el.replaceChildren(emptyState("Nothing expected", emptyText)); return; }
    const n = labels.length, W = Math.max(el.clientWidth - 18, 260), H = 244;
    const { top, ticks } = niceScale(Math.max(0, ...series.flatMap((se) => se.values)));
    const m = { t: 22, r: 8, b: 30, l: tickRoom(ticks, fmtTick) };
    const pw = W - m.l - m.r, ph = H - m.t - m.b, step = pw / n, k = series.length, gap = 2;
    const colW = Math.max(3, Math.min(24, (step * 0.62 - gap * (k - 1)) / k)), groupW = colW * k + gap * (k - 1);
    const y = (v) => m.t + ph - (v / top) * ph;
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": label });
    for (const t of ticks) {
      const yy = Math.round(y(t)) + 0.5;
      svg.append(s("line", { class: t === 0 ? "axis-line" : "grid-line", x1: m.l, x2: W - m.r, y1: yy, y2: yy }), s("text", { class: "tick", x: m.l - 8, y: yy + 4, "text-anchor": "end" }, fmtTick(t)));
    }
    labels.forEach((lb, i) => {
      const cx = m.l + step * (i + 0.5);
      svg.append(s("text", { class: "x-label" + (selected.has(i) ? " sel" : ""), x: cx, y: m.t + ph + 20, "text-anchor": "middle" }, lb.short));
      const rows = () => { const r = series.map((se) => ({ key: se.key, value: fmt(se.values[i]), label: se.name })); if (extraRows) r.push(...extraRows(i)); return r; };
      const hit = s("rect", { class: "hit", x: m.l + step * i + 1, y: m.t - 6, width: Math.max(0, step - 2), height: ph + 6, rx: 6, tabindex: 0, "aria-label": `${lb.long}: ${series.map((se) => `${se.name} ${fmt(se.values[i])}`).join(", ")}` });
      hit.addEventListener("pointermove", (e) => showTip(e.clientX, e.clientY, lb.long, rows()));
      hit.addEventListener("pointerdown", (e) => showTip(e.clientX, e.clientY, lb.long, rows()));
      hit.addEventListener("pointerleave", hideTip);
      hit.addEventListener("focus", () => { hit.classList.add("focus"); tipAt(hit, lb.long, rows()); });
      hit.addEventListener("blur", () => { hit.classList.remove("focus"); hideTip(); });
      svg.append(hit);
      series.forEach((se, j) => svg.append(s("path", { class: `col k-${se.key}`, d: colPath(cx - groupW / 2 + j * (colW + gap), y(se.values[i]), colW, y(0)) })));
    });
    el.replaceChildren(svg);
  }
  function drawSpark(el, values, labels) {
    const n = values.length, W = Math.max(el.clientWidth, 200), H = 56, step = W / n, colW = Math.min(26, step * 0.58);
    const top = Math.max(1, ...values.map((v) => Math.max(0, v)));
    const svg = s("svg", { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: "img", "aria-label": "Expected cash balance, next 7 days" });
    values.forEach((v, i) => {
      const hit = s("rect", { class: "hit", x: step * i, y: 0, width: step, height: H, rx: 6 });
      const rows = [{ key: v < 0 ? "out" : "in", value: money(v), label: "expected balance" }];
      hit.addEventListener("pointermove", (e) => showTip(e.clientX, e.clientY, labels[i].long, rows));
      hit.addEventListener("pointerleave", hideTip);
      const hv = Math.max(0, v);
      svg.append(hit, s("path", { class: `col ${v < 0 ? "k-out" : i === 0 ? "k-in" : "k-muted"}`, d: v < 0 ? colPath(step * i + (step - colW) / 2, H - 8, colW, H - 2) : colPath(step * i + (step - colW) / 2, H - 2 - (hv / top) * (H - 8), colW, H - 2) }));
    });
    svg.append(s("line", { class: "axis-line", x1: 0, x2: W, y1: H - 1.5, y2: H - 1.5 }));
    el.replaceChildren(svg);
  }
  const CHARTS = {};
  const chart = (id, def) => { CHARTS[id] = def; };
  function buildChartCards() {
    $$(".chart-card[data-chart]").forEach((card) => {
      const toggle = h("div", { class: "seg seg-sm view-toggle", role: "group", "aria-label": "View as" },
        h("button", { type: "button", "data-view": "chart", "aria-pressed": "true" }, "Chart"), h("button", { type: "button", "data-view": "table", "aria-pressed": "false" }, "Table"));
      card.replaceChildren(
        h("header", { class: "card-head" }, h("div", {}, h("h3", {}, card.dataset.title), h("p", { class: "card-sub" }, card.dataset.sub || "")), toggle),
        h("div", { class: "legend" }, h("span", {}, h("i", { class: "sw-rect k-in" }), "Inflows"), h("span", {}, h("i", { class: "sw-rect k-out" }), "Outflows")),
        h("div", { class: "chart-body" }), h("div", { class: "chart-table", hidden: true }));
      $$("button", toggle).forEach((b) => b.addEventListener("click", () => {
        card.dataset.view = b.dataset.view;
        $$("button", toggle).forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
        drawChart(card.dataset.chart);
      }));
    });
  }
  function drawChart(id) {
    const card = $(`[data-chart="${id}"]`), def = CHARTS[id];
    if (!card || !def) return;
    const view = card.dataset.view || "chart";
    const body = $(".chart-body", card), tbl = $(".chart-table", card), legend = $(".legend", card);
    body.hidden = view !== "chart"; tbl.hidden = view !== "table"; if (legend) legend.hidden = view !== "chart";
    if (view === "chart") def.draw(body); else tbl.replaceChildren(table(def.table()));
  }
  chart("fc7", {
    draw: (el) => drawColumns(el, { labels: V.dayLabels, series: [{ name: "Inflows", key: "in", values: V.days7.map((d) => d.inflow) }, { name: "Outflows", key: "out", values: V.days7.map((d) => d.outflow) }],
      selected: new Set([0]), fmt: money, fmtTick: moneyC, label: "Expected inflows and outflows, next 7 days", emptyText: "Add expected inflows and outflows in the Forecast sheet.",
      extraRows: (i) => [{ sep: true, value: money(V.days7[i].closing), label: "closing balance" }] }),
    table: () => ({ head: ["Day", "Inflows", "Outflows", "Closing"], num: [1, 2, 3], rows: V.days7.map((d) => [flong(d.date), money(d.inflow), money(d.outflow), neg(d.closing)]) }),
  });
  chart("proj4", {
    draw: (el) => drawColumns(el, { labels: V.weekLabels, series: [{ name: "Inflows", key: "in", values: V.weeks4.map((w) => w.inflow) }, { name: "Outflows", key: "out", values: V.weeks4.map((w) => w.outflow) }],
      selected: new Set(), fmt: money, fmtTick: moneyC, label: "Inflows and outflows per week", emptyText: "Add expected items for the coming weeks in the Forecast sheet.",
      extraRows: (i) => [{ sep: true, value: money(V.weeks4[i].closing), label: "closing balance" }] }),
    table: () => ({ head: ["Week", "Inflows", "Outflows", "Closing"], num: [1, 2, 3], rows: V.weeks4.map((w, i) => [V.weekLabels[i].long, money(w.inflow), money(w.outflow), neg(w.closing)]) }),
  });

  /* ---------- report headers ---------- */
  function markSent(rep, period) {
    const due = dueOf(rep, period);
    let date = todayISO(), time = nowHM();
    const old = subFor(rep.no, period);
    if ((due && due.slice(0, 10) < todayISO()) || old) {
      const t = prompt("When was it sent? (YYYY-MM-DD HH:MM)", old ? `${old.date} ${old.time}` : `${due ? due.slice(0, 10) : date} ${due ? due.slice(11) : time}`);
      if (t == null) return;
      const m = t.trim().match(/^(\d{4}-\d{2}-\d{2})[ T](\d{1,2}):(\d{2})$/);
      if (!m) { toast("Please use YYYY-MM-DD HH:MM, for example 2026-09-30 08:45."); return; }
      date = m[1]; time = `${pad2(m[2])}:${m[3]}`;
    }
    D.submissions = D.submissions.filter((x) => !(String(x.report) === String(rep.no) && String(x.period) === String(period)));
    D.submissions.push({ id: nextId(SHEETS.find((d) => d.id === "submissions")), report: String(rep.no), period: String(period), date, time, note: "" });
    saveData(); rebuildAll(); toast(`Report ${rep.no} marked as sent ${fday(date)} ${time}.`);
  }
  function renderReportHeads() {
    $$(".report-head").forEach((el) => {
      const rep = REPORTS[n0(el.dataset.report) - 1];
      const period = rep.freq === "ondemand" ? null : periodOf(rep, V.T);
      const side = h("div", { class: "rh-side" });
      if (period) {
        const st = statusOf(rep, period);
        const send = h("button", { class: `btn btn-sm ${st.sub ? "" : "btn-primary"}`, type: "button" }, icon("send"), st.sub ? "Change sent time" : "Mark as sent");
        send.addEventListener("click", () => markSent(rep, period));
        side.append(stateBadge(st), send);
      }
      if (rep.freq !== "ondemand") {
        const pdf = h("button", { class: "btn btn-sm", type: "button" }, icon("pdf"), "PDF");
        pdf.addEventListener("click", () => withBusy(pdf, () => exportPdf([rep.no])));
        side.append(pdf);
      }
      el.replaceChildren(
        h("span", { class: "section-num" }, pad2(rep.no)),
        h("div", { class: "rh-main" }, h("h2", { id: `h-${rep.id}` }, rep.title),
          h("p", { class: "rh-meta" }, whenText(rep), " · to ", recipients(rep), period ? [" · ", h("strong", {}, periodText(rep, period))] : "")),
        side);
    });
  }

  /* ---------- report sections ---------- */
  function renderOverview() {
    const v = V;
    const spark = h("div", { class: "hero-spark-bars" });
    $("#hero").replaceChildren(
      h("div", { class: "hero-top" }, h("span", { class: "hero-label" }, "Group cash ", h("span", {}, `· ${fday(v.T)}`)), h("span", { class: "tile-foot" }, (() => { const c = deltaChip(v.groupCash, v.groupCashY); return c ? [c, " vs yesterday"] : ""; })())),
      h("div", { class: "hero-value", title: money(v.groupCash) }, moneyC(v.groupCash)),
      h("div", { class: "hero-sub" }, v.stale.length ? warn(`${num(v.stale.length)} account${v.stale.length === 1 ? "" : "s"} not updated today`) : "All accounts updated today"),
      h("div", { class: "hero-spark" }, spark, h("div", { class: "hero-spark-caption" }, h("span", {}, v.dayLabels[0].short), h("span", {}, "Expected balance, next 7 days"), h("span", {}, v.dayLabels[6].short))));
    V.spark = spark;
    drawSpark(spark, v.days7.map((d) => d.closing), v.dayLabels);
    const sentToday = v.dueToday.filter((x) => x.st.state === "ok" || x.st.state === "late").length;
    const tile = (label, value, foot, title) => h("article", { class: "card tile" }, h("span", { class: "tile-label" }, label), h("span", { class: "tile-value", title }, value), h("span", { class: "tile-foot" }, foot));
    const unexpl = sum(v.r6disc, (a) => Math.abs(a.unexplained));
    const dueSoon = v.dead14.filter((o) => within(o.nextDueDate, v.T, addDays(v.T, 14)));
    $("#kpi-tiles").replaceChildren(
      tile("Reports due today", `${num(sentToday)} / ${num(v.dueToday.length)}`, v.dueToday.some((x) => x.st.state === "missing") ? warn("Deadline passed") : v.dueToday.length ? "sent" : "Nothing due"),
      tile("Lowest balance, 7 days", moneyC(v.low7), v.low7 < 0 ? warn(`Shortfall ${fday(v.low7Day.date)}`) : v.low7Day ? fday(v.low7Day.date) : "", money(v.low7)),
      tile("Open incidents", num(v.incOpen.length), v.incOpen.some((i) => i.sensitivity === "Immediate") ? warn("Immediate decision needed") : "Need a decision"),
      tile("Unreconciled difference", moneyC(unexpl), v.r6disc.length ? warn(`${num(v.r6disc.length)} account${v.r6disc.length === 1 ? "" : "s"}`) : "All matched", money(unexpl)),
      tile("Loan & tax due (14 days)", moneyC(sum(dueSoon, (o) => o.monthlyPayment)), v.dead14.some((o) => o.status === "Missed" || o.status === "At risk") ? warn("At risk / missed") : `${num(dueSoon.length)} payments`),
      tile(`Reports on time · ${fmonth(v.CM)}`, `${num(v.cOnTime)} / ${num(v.cOnTime + v.cLate + v.cMissing)}`, v.cLate + v.cMissing ? warn(`${num(v.cLate)} late · ${num(v.cMissing)} missing`) : "All on time so far"));
    $("#deadline-sub").textContent = `Status as of ${flong(v.T)}. Sent to ${C.chairman || "Chairman"} only, except report 6 (${C.chairman || "Chairman"} + ${C.financeOfficer || "finance officer"}).`;
    const rows = v.deadlines.map(({ rep, period, st }) => {
      const b = h("button", { class: "btn btn-sm", type: "button" }, icon("send"), st.sub ? "Edit" : "Mark sent");
      b.addEventListener("click", () => markSent(rep, period));
      const go = h("a", { href: `#${rep.id}`, class: "strong link" }, `${rep.no}. ${rep.title}`);
      return [go, whenText(rep), periodText(rep, period), stateBadge(st), st.state === "none" ? "" : b];
    });
    rows.push([h("span", { class: "strong" }, "9. Incident Report"), "Immediately when an issue occurs", `${num(v.incOpen.length)} open`, v.incOpen.length ? badge("Open") : badge("OK", "good"), ""]);
    put("#deadline-table", table({ head: ["Report", "When", "Period", "Status", ""], rows, rowClass: (i) => (i < v.deadlines.length && v.deadlines[i].st.state === "missing" ? "row-bad" : null) }));
  }

  function renderR1() {
    const v = V;
    statStrip($("#r1-stats"), [
      { label: "Group cash", value: moneyC(v.groupCash), title: money(v.groupCash), foot: [deltaChip(v.groupCash, v.groupCashY), " vs yesterday"] },
      { label: "Inflows yesterday", value: moneyC(v.inY), title: money(v.inY), foot: fday(v.Y) },
      { label: "Outflows yesterday", value: moneyC(v.outY), title: money(v.outY), foot: fday(v.Y) },
      { label: "Accounts", value: `${num(v.r1acc.length - v.stale.length)} / ${num(v.r1acc.length)}`, foot: v.stale.length ? warn(`${num(v.stale.length)} not updated`) : v.low.length ? warn(`${num(v.low.length)} below minimum`) : "All updated today" },
    ]);
    $("#r1-sub").textContent = `Balances on ${flong(v.T)}; movements on ${fday(v.Y)} (yesterday)`;
    put("#r1-company", table({
      head: ["Company", "Cash balance", "Yesterday's balance", "Inflows yesterday", "Outflows yesterday", "Accounts"], num: [1, 2, 3, 4, 5],
      rows: v.r1co.map((c) => [h("strong", {}, c.company), neg(c.cash), money(c.prev), money(c.inY), money(c.outY), num(c.accounts)]),
      foot: ["TOTAL", money(v.groupCash), money(v.groupCashY), money(v.inY), money(v.outY), num(v.r1acc.length)],
      empty: emptyState("No accounts yet", "Add bank accounts in the Data sheet (Accounts tab), then daily balances."),
    }));
    put("#r1-accounts", table({
      head: ["Company", "Bank / account", "Balance", "Minimum", "As of", "Status"], num: [2, 3],
      rows: v.r1acc.map((a) => [a.company, [a.bank, a.account].filter(Boolean).join(" "), a.balance == null ? "—" : neg(a.balance), n0(a.minBalance) ? money(a.minBalance) : "—", a.asOf ? fday(a.asOf) : "—",
        a.low ? badge("Below minimum") : a.stale ? badge("Not updated") : badge("OK")]),
      rowClass: (i) => (v.r1acc[i].low ? "row-bad" : null),
      empty: emptyState("No company accounts", "Add them in the Data sheet (Accounts tab)."),
    }));
  }

  function renderR2() {
    const v = V;
    const short = v.days7.filter((d) => d.short);
    statStrip($("#r2-stats"), [
      { label: "Cash today", value: moneyC(v.groupCash), title: money(v.groupCash), foot: "From report 1" },
      { label: "Expected inflows (7 days)", value: moneyC(sum(v.days7, (d) => d.inflow)), title: money(sum(v.days7, (d) => d.inflow)), foot: `${num(v.r2items.filter((f) => f.direction === "In").length)} items` },
      { label: "Expected outflows (7 days)", value: moneyC(sum(v.days7, (d) => d.outflow)), title: money(sum(v.days7, (d) => d.outflow)), foot: `${num(v.r2items.filter((f) => f.direction === "Out").length)} items` },
      { label: "Lowest balance", value: moneyC(v.low7), title: money(v.low7), foot: short.length ? warn(`${num(short.length)} day${short.length === 1 ? "" : "s"} short`) : v.low7Day ? fday(v.low7Day.date) : "" },
    ]);
    put("#r2-days", table({
      head: ["Day", "Opening", "Inflows", "Outflows", "Closing", "Status"], num: [1, 2, 3, 4],
      rows: v.days7.map((d) => [fday(d.date), money(d.opening), money(d.inflow), money(d.outflow), h("strong", {}, neg(d.closing)), d.closing < 0 ? badge("Shortfall") : d.short ? badge("Below minimum") : badge("OK")]),
      foot: ["7 days", "", money(sum(v.days7, (d) => d.inflow)), money(sum(v.days7, (d) => d.outflow)), money(v.days7[6].closing), ""],
      rowClass: (i) => (v.days7[i].short ? "row-bad" : null),
    }));
    put("#r2-items", table({
      head: ["Date", "Company", "In / out", "Description", "Amount", "Status"], num: [4],
      rows: v.r2items.map((f) => [fday(f.date), f.company, f.direction, f.description, money(f.amount), badge(f.status || "Expected")]),
      empty: emptyState("No expected items", "Add expected inflows and outflows in the Data sheet (Forecast tab)."),
    }));
  }

  function renderR3() {
    const v = V;
    const upOut = sum(v.r3up.filter((f) => f.direction === "Out")), upIn = sum(v.r3up.filter((f) => f.direction === "In"));
    statStrip($("#r3-stats"), [
      { label: "Personal cash", value: moneyC(v.persCash), title: money(v.persCash), foot: [deltaChip(v.persCash, v.persCashY), " vs yesterday"] },
      { label: "In yesterday", value: moneyC(v.r3in), title: money(v.r3in), foot: fday(v.Y) },
      { label: "Out yesterday", value: moneyC(v.r3out), title: money(v.r3out), foot: fday(v.Y) },
      { label: "Next 7 days", value: moneyC(upIn - upOut), title: `In ${money(upIn)}, out ${money(upOut)}`, foot: `in ${moneyC(upIn)} · out ${moneyC(upOut)}` },
    ]);
    put("#r3-accounts", table({
      head: ["Bank / account", "Balance", "As of"], num: [1],
      rows: v.r3acc.map((a) => [[a.bank, a.account].filter(Boolean).join(" ") || a.label, a.balance == null ? "—" : neg(a.balance), a.asOf ? fday(a.asOf) : "—"]),
      foot: ["TOTAL", money(v.persCash), ""],
      empty: emptyState("No personal accounts", "Add accounts with type Personal in the Accounts tab."),
    }));
    $("#r3-mov-sub").textContent = `${fday(v.Y)} and ${fday(v.T)}`;
    put("#r3-moves", table({
      head: ["Date", "In / out", "Description", "Amount"], num: [3],
      rows: v.r3moves.map((t) => [fday(t.date), t.direction, twoLine(t.description || t.category, t.category && t.description ? t.category : ""), money(t.amount)]),
      empty: emptyState("No personal movements", "Add them in the Transactions tab with company = Personal."),
    }));
    put("#r3-upcoming", table({
      head: ["Date", "In / out", "Description", "Amount", "Status"], num: [3],
      rows: v.r3up.map((f) => [fday(f.date), f.direction, f.description, money(f.amount), badge(f.status || "Expected")]),
      empty: emptyState("Nothing coming up", "Add personal items in the Forecast tab with company = Personal."),
    }));
  }

  function renderR4() {
    const v = V;
    const low = v.weeks4.reduce((a, w) => (w.closing < a.closing ? w : a), v.weeks4[0]);
    statStrip($("#r4-stats"), [
      { label: "Inflows (4 weeks)", value: moneyC(sum(v.weeks4, (w) => w.inflow)), title: money(sum(v.weeks4, (w) => w.inflow)), foot: `From ${fday(v.weeks4[0].start)}` },
      { label: "Outflows (4 weeks)", value: moneyC(sum(v.weeks4, (w) => w.outflow)), title: money(sum(v.weeks4, (w) => w.outflow)), foot: `To ${fday(v.weeks4[3].end)}` },
      { label: "Closing after 4 weeks", value: moneyC(v.weeks4[3].closing), title: money(v.weeks4[3].closing), foot: v.weeks4[3].closing < 0 ? warn("Shortfall") : "Projected" },
      { label: "Lowest week", value: moneyC(low.closing), title: money(low.closing), foot: low.closing < 0 ? warn(`Week of ${fday(low.start)}`) : `Week of ${fday(low.start)}` },
    ]);
    put("#r4-weeks", table({
      head: ["Week", "Opening", "Inflows", "Outflows", "Net", "Closing", "Loan / tax due"], num: [1, 2, 3, 4, 5],
      rows: v.weeks4.map((w, i) => [twoLine(v.weekLabels[i].short, `${fday(w.start)} – ${fday(w.end)}`), money(w.opening), money(w.inflow), money(w.outflow), neg(w.net), h("strong", {}, neg(w.closing)),
        w.dues.length ? twoLine(money(w.duesTotal), listText(w.dues.map((o) => o.name), 3)) : "—"]),
      foot: ["4 weeks", "", money(sum(v.weeks4, (w) => w.inflow)), money(sum(v.weeks4, (w) => w.outflow)), money(sum(v.weeks4, (w) => w.net)), money(v.weeks4[3].closing), money(sum(v.weeks4, (w) => w.duesTotal))],
      rowClass: (i) => (v.weeks4[i].closing < 0 ? "row-bad" : null),
    }));
    put("#r4-company", table({
      head: ["Company", ...v.weekLabels.map((w) => w.short), "Total"], num: [1, 2, 3, 4, 5],
      rows: v.companies.map((c) => [h("strong", {}, c), ...v.weeks4.map((w) => neg(w.byCo[c] || 0)), neg(sum(v.weeks4, (w) => w.byCo[c] || 0))]),
      empty: emptyState("No companies", "Set the company list in Settings."),
    }));
  }

  function renderR5() {
    const v = V;
    const noAppr = v.large.filter((t) => t.noApproval);
    const subsBad = v.subsWeek.filter((x) => x.st.state === "late" || x.st.state === "missing");
    statStrip($("#r5-stats"), [
      { label: `Payments ≥ ${moneyC(v.limit)}`, value: num(v.large.length), foot: noAppr.length ? warn(`${num(noAppr.length)} without approver`) : `${moneyC(sum(v.large))} total` },
      { label: "Incidents this week", value: num(v.incWeek.length), foot: v.incWeek.length ? listText(uniq(v.incWeek.map((i) => i.type)), 2) : "None" },
      { label: "Reports this week", value: `${num(v.subsWeek.filter((x) => x.st.state === "ok").length)} / ${num(v.subsWeek.filter((x) => x.st.state !== "notyet" && x.st.state !== "due").length)}`, foot: subsBad.length ? warn(`${num(subsBad.length)} late or missing`) : "On time so far" },
      { label: "Loan & tax (14 days)", value: moneyC(sum(v.dead14, (o) => o.monthlyPayment)), title: money(sum(v.dead14, (o) => o.monthlyPayment)), foot: v.dead14.some((o) => o.status !== "Current") ? warn("At risk / missed") : `${num(v.dead14.length)} payments` },
    ]);
    $("#r5-large-sub").textContent = `Outgoing payments of ${money(v.limit)} or more, ${fday(v.ws)} – ${fday(v.we)}. Red = no approver recorded.`;
    put("#r5-large", table({
      head: ["Date", "Company", "Paid to / description", "Amount", "Approved by"], num: [3],
      rows: v.large.map((t) => [fday(t.date), t.company, twoLine(t.description, t.category), money(t.amount), t.noApproval ? badge("No approver") : t.approvedBy]),
      rowClass: (i) => (v.large[i].noApproval ? "row-bad" : null),
      empty: emptyState("No large payments this week", "Payments come from the Transactions tab."),
    }));
    put("#r5-deadlines", table({
      head: ["Due", "Loan / tax", "Payment", "Status"], num: [2],
      rows: v.dead14.map((o) => [fdate(o.nextDueDate), twoLine(o.name, [o.lender, o.company].filter(Boolean).join(" · ")), money(o.monthlyPayment), badge(o.status || "Current")]),
      empty: emptyState("Nothing due in 14 days", "Deadlines come from the Loans & tax tab."),
    }));
    put("#r5-subs", table({
      head: ["Report", "Period", "Status"],
      rows: v.subsWeek.filter((x) => x.st.state !== "none").map((x) => [`${x.rep.no}. ${x.rep.title}`, periodText(x.rep, x.period), stateBadge(x.st)]),
    }));
    const exc = [
      ...v.incWeek.map((i) => [fday(i.date), "Incident", `${i.type}: ${i.what || ""}`, badge(i.status || "Open")]),
      ...v.low.map((a) => [fday(v.T), "Low balance", `${a.label}: ${money(a.balance)} (minimum ${money(a.minBalance)})`, badge("Below minimum")]),
      ...v.openRecon.map((r) => [fday(r.date), "Reconciliation", `${r.account}: ${r.item} ${money(r.amount)}`, badge("Open")]),
    ];
    put("#r5-exceptions", table({ head: ["Date", "Type", "Detail", "Status"], rows: exc, empty: emptyState("No exceptions", "Nothing needs attention this week.") }));
  }

  function renderR6() {
    const v = V;
    const tot = (f) => sum(v.r6.filter((a) => a[f] != null), (a) => a[f]);
    statStrip($("#r6-stats"), [
      { label: "Book balance", value: moneyC(tot("book")), title: money(tot("book")), foot: `${num(v.r6.length)} accounts` },
      { label: "Bank balance", value: moneyC(tot("bankBal")), title: money(tot("bankBal")), foot: v.r6missing.length ? warn(`${num(v.r6missing.length)} without bank balance`) : "From statements" },
      { label: "Difference", value: moneyC(tot("diff")), title: money(tot("diff")), foot: "Book minus bank" },
      { label: "Needs action", value: num(v.r6disc.length), foot: v.r6disc.length ? warn(`${moneyC(sum(v.r6disc, (a) => Math.abs(a.unexplained)))} unexplained`) : "All explained or matched" },
    ]);
    $("#r6-sub").textContent = `As of ${flong(v.T)}. Book balance from the daily balances; bank balance from the statement column.`;
    put("#r6-accounts", table({
      head: ["Bank", "Account", "Book balance", "Bank balance", "Difference", "Status"], num: [2, 3, 4],
      rows: v.r6.map((a) => [a.bank || "—", twoLine(a.account, a.company), a.book == null ? "—" : money(a.book), a.bankBal == null ? "—" : money(a.bankBal), a.diff == null ? "—" : neg(a.diff),
        a.diff == null ? badge("No bank balance") : Math.abs(a.unexplained) > 0.5 ? badge("Action needed") : Math.abs(a.diff) > 0.5 ? badge("Explained") : badge("Matched")]),
      foot: ["TOTAL", "", money(tot("book")), money(tot("bankBal")), money(tot("diff")), ""],
      rowClass: (i) => (v.r6[i].unexplained != null && Math.abs(v.r6[i].unexplained) > 0.5 ? "row-bad" : null),
      empty: emptyState("No accounts yet", "Add accounts, then book and bank balances in the Data sheet."),
    }));
    put("#r6-items", table({
      head: ["Item", "Account", "Amount", "Explanation"], num: [2],
      rows: v.r6items.map((it) => [twoLine(it.item, fday(it.date)), it.label, money(it.amount), it.explanation || "—"]),
      empty: emptyState("No unreconciled items", "Add them in the Reconciliation items tab."),
    }));
    put("#r6-disc", table({
      head: ["Account", "Amount", "Action"], num: [1],
      rows: v.r6disc.map((a) => [a.label, neg(a.unexplained), (a.items.find((x) => x.action) || {}).action || "Investigate with the bank"]),
      empty: emptyState("No discrepancies", "Every difference is explained by an open item."),
    }));
  }

  function renderR7() {
    const v = V;
    const cash = sum(v.r7cash, (c) => c.cash), net = v.revenue - v.expenses;
    statStrip($("#r7-stats"), [
      { label: "Group cash (month end)", value: moneyC(cash), title: money(cash), foot: fdate(monthEnd(v.M)) },
      { label: "Revenue", value: moneyC(v.revenue), title: money(v.revenue), foot: fmonth(v.M) },
      { label: "Net profit / loss", value: moneyC(net), title: money(net), foot: net < 0 ? warn("Loss") : v.revenue ? `${pct(net / v.revenue)} margin` : "" },
      { label: "Net worth", value: moneyC(v.assets - v.liabilities), title: money(v.assets - v.liabilities), foot: v.mRows.length ? "Assets − liabilities" : warn("No monthly results") },
    ]);
    put("#r7-cash", table({ head: ["Company", "Cash balance"], num: [1], rows: v.r7cash.map((c) => [c.company, neg(c.cash)]), foot: ["TOTAL", money(cash)] }));
    put("#r7-rev", table({ head: ["Company", "Revenue"], num: [1], rows: v.r7rev.map((c) => [c.company, money(c.revenue)]), foot: ["TOTAL", money(v.revenue)] }));
    put("#r7-exp", table({ head: ["Category", "Amount"], num: [1], rows: v.r7exp.map((c) => [c.label, money(c.amount)]), foot: ["TOTAL", money(v.expenses)] }));
    put("#r7-pl", table({ head: ["", "Amount"], num: [1], rows: [["Revenue", money(v.revenue)], ["Expenses", money(v.expenses)]], foot: ["Net", neg(net)] }));
    put("#r7-debt", table({
      head: ["Loan / tax", "Lender", "Outstanding", "Monthly payment", "Next due", "Status"], num: [2, 3],
      rows: v.debt.map((o) => [h("strong", {}, o.name), o.lender || o.type || "—", money(o.out), money(o.monthlyPayment), fdate(o.nextDueDate), badge(o.status || "Current")]),
      foot: ["TOTAL", "", money(sum(v.debt, (o) => o.out)), money(sum(v.debt, (o) => o.monthlyPayment)), "", ""],
      empty: emptyState("No loans or tax recorded", "Add them in the Loans & tax tab."),
    }));
    put("#r7-tax", table({ head: ["", "Amount"], num: [1], rows: [["Owed", money(v.tax.owed)], ["Paid to date", money(v.tax.paid)]], foot: ["Remaining", money(v.tax.remaining)] }));
    put("#r7-nw", table({ head: ["", "Amount"], num: [1], rows: [["Assets", money(v.assets)], ["Liabilities", money(v.liabilities)]], foot: ["Net", neg(v.assets - v.liabilities)] }));
  }

  function renderR8() {
    const v = V;
    $("#r8-staff").replaceChildren(...(v.staff.length ? v.staff : [{ name: "No staff", role: "Set the staff list in Settings", review: null }]).map((p) => {
      const r = p.review;
      const kv = (k, val) => [h("dt", {}, k), h("dd", {}, val)];
      return h("article", { class: "card staff-card" },
        h("div", { class: "summary-head" }, h("div", {}, h("h3", {}, p.name), h("p", { class: "card-sub" }, p.role)), r ? badge("Reviewed", "good") : badge("Not reviewed yet", "warning")),
        r ? h("dl", { class: "summary-list" },
          kv("Reports submitted on time", `${num(n0(r.onTime))} / ${num(n0(r.due))}`), kv("Errors found", num(n0(r.errors))), kv("Penalties applied", r.penalties === "" || r.penalties == null ? "0" : String(r.penalties)),
          kv("Bonus earned", r.bonus === "" || r.bonus == null ? "0" : String(r.bonus)), kv("Recommended action", r.action || "—"))
          : h("p", { class: "muted" }, `Add ${p.name}'s review for ${fmonth(v.M)} in the Data sheet (Staff reviews tab).`));
    }));
    $("#r8-overall").replaceChildren(
      h("div", { class: "summary-head" }, h("h3", {}, "Overall finance team assessment"), v.team ? badge("Written", "good") : badge("Not written yet", "warning")),
      h("p", { class: "summary-text" }, v.team ? v.team.assessment : `Write the assessment for ${fmonth(v.M)} in the Data sheet (Team assessment tab).`));
  }

  function renderR9() {
    const v = V;
    statStrip($("#r9-stats"), [
      { label: "Open incidents", value: num(v.incOpen.length), foot: v.incOpen.length ? "Waiting for a decision" : "None" },
      { label: "Immediate", value: num(v.incOpen.filter((i) => i.sensitivity === "Immediate").length), foot: "Open and time-critical" },
      { label: `This month (${fmonth(v.M)})`, value: num(v.incMonth.length), foot: v.incMonth.length ? listText(uniq(v.incMonth.map((i) => i.type)), 2) : "None" },
      { label: "Not sent to chairman", value: num(D.incidents.filter((i) => !subFor(9, i.id)).length), foot: "Send immediately" },
    ]);
    const cards = v.incidents.map((i) => {
      const sent = subFor(9, i.id);
      const send = h("button", { class: `btn btn-sm ${sent ? "" : "btn-primary"}`, type: "button" }, icon("send"), sent ? `Sent ${fday(sent.date)} ${sent.time}` : "Mark as sent");
      send.addEventListener("click", () => markSent(REPORTS[8], i.id));
      const pdf = h("button", { class: "btn btn-sm", type: "button" }, icon("pdf"), "PDF");
      pdf.addEventListener("click", () => withBusy(pdf, () => exportIncidentPdf(i)));
      const blk = (label, text) => h("div", { class: "inc-block" }, h("span", {}, label), h("p", {}, text || "—"));
      return h("article", { class: `card incident-card ${(i.status || "Open") === "Open" ? "open" : ""}` },
        h("div", { class: "summary-head" },
          h("div", {}, h("h3", {}, i.type || "Incident"), h("p", { class: "card-sub" }, `${fdate(i.date)}${i.time ? ` ${i.time}` : ""}${i.company ? ` · ${i.company}` : ""} · ${i.id || ""}`)),
          h("div", { class: "rh-side" }, badge(i.sensitivity || "Within 24 hours"), badge(i.status || "Open"), send, pdf)),
        h("div", { class: "inc-grid" }, blk("What happened", i.what), blk("Impact (financial and operational)", i.impact), blk("Action taken", i.action), blk("Recommended decision from chairman", i.recommendation),
          i.decision ? blk("Chairman's decision", i.decision) : null));
    });
    $("#r9-list").replaceChildren(...(cards.length ? cards : [h("article", { class: "card" }, emptyState("No incidents", "Record an incident in the Data sheet (Incidents tab) as soon as it happens."))]));
  }

  function renderComp() {
    const v = V;
    const fixed = n0(C.fixedPay), cb = n0(C.complianceBonus), ab = n0(C.accuracyBonus);
    const passedAll = v.cPending === 0;
    const lossAll = v.cMissedDeadlines > 0;
    const compState = lossAll ? "Lost" : v.cLate + v.cMissing > 0 ? "Reduced" : passedAll ? "Earned" : "On track";
    const accState = lossAll ? "Lost" : v.cDiscrepancies > 0 ? "Reduced" : passedAll ? "Earned" : "On track";
    const tone = { Earned: "good", "On track": "warning", Reduced: "serious", Lost: "critical" };
    $("#comp-sub").textContent = `${C.controller || "Controller"} · ${fmonth(v.CM)} (month of the report date). Calculated from the submission log, incidents and the Loans & tax sheet.`;
    const amt = (x) => (x ? money(x) : "—");
    statStrip($("#comp-stats"), [
      { label: "Reports on time", value: `${num(v.cOnTime)} / ${num(v.cOnTime + v.cLate + v.cMissing)}`, foot: v.cPending ? `${num(v.cPending)} still to come this month` : "Month complete" },
      { label: "Late", value: num(v.cLate), foot: v.cLate ? warn("Reduces compliance bonus") : "None" },
      { label: "Missing", value: num(v.cMissing), foot: v.cMissing >= 3 ? warn("Three or more: formal review") : v.cMissing ? warn("Reduces compliance bonus") : "None" },
      { label: "Discrepancies", value: num(v.cDiscrepancies), foot: v.cDiscrepancies ? warn("Reduces accuracy bonus") : "Zero so far" },
    ]);
    const row = (k, val) => [h("dt", {}, k), h("dd", {}, val)];
    $("#comp-bonus").replaceChildren(
      h("div", { class: "summary-head" }, h("h3", {}, "This month"), badge(lossAll ? "Bonuses lost" : compState === "Earned" && accState === "Earned" ? "Full potential" : "In progress", lossAll ? "critical" : "good")),
      h("dl", { class: "summary-list" },
        row("Fixed monthly", amt(fixed)),
        row("Report compliance bonus", [badge(compState, tone[compState]), " ", amt(cb)]),
        row("Accuracy bonus", [badge(accState, tone[accState]), " ", amt(ab)]),
        row("Potential this month", amt(fixed + cb + ab)),
        row("Expected this month", amt(fixed + (compState === "Earned" || compState === "On track" ? cb : 0) + (accState === "Earned" || accState === "On track" ? ab : 0)))),
      !fixed && !cb && !ab ? h("p", { class: "muted" }, "Enter the pay and bonus amounts in Settings. They stay on this device only.") : null);
    const flags = [];
    if (v.cLate) flags.push(["Late reports", `${num(v.cLate)} this month: reduction in compliance bonus`, "serious"]);
    if (v.cMissing) flags.push(["Missing reports", `${num(v.cMissing)} this month: reduction in compliance bonus`, "critical"]);
    if (v.cMissing >= 3) flags.push(["Formal review", "Three or more missed reports in one month", "critical"]);
    if (v.cDiscrepancies) flags.push(["Wrong figures / discrepancies", `${num(v.cDiscrepancies)} cash discrepancy incident(s): reduction in accuracy bonus`, "serious"]);
    if (v.cUnauthorized) flags.push(["Unauthorized payment attempts", `${num(v.cUnauthorized)} reported this month. If a payment was actually made without authority: loss of bonuses + written warning (chairman decides).`, "serious"]);
    if (v.cMissedDeadlines) flags.push(["Missed bank or tax deadline", "Loss of bonuses + written warning", "critical"]);
    $("#comp-rules").replaceChildren(
      h("div", { class: "summary-head" }, h("h3", {}, "Accountability"), flags.length ? badge(`${flags.length} issue${flags.length === 1 ? "" : "s"}`, "critical") : badge("No issues", "good")),
      flags.length ? h("div", {}, flags.map(([t, d, tn]) => h("div", { class: `check-row ${tn === "serious" ? "warning" : "critical"}` }, h("span", { class: "check-icon" }, icon("alertCircle")), h("div", { class: "check-text" }, h("strong", {}, t), h("span", {}, d)))))
        : h("p", { class: "muted" }, "No late or missing reports, discrepancies, unauthorized payments or missed deadlines recorded this month."),
      h("p", { class: "muted small" }, "Rules: late or missing report = reduction in compliance bonus · wrong figures = reduction in accuracy bonus · unauthorized payment or missed bank/tax deadline = loss of bonuses + written warning · three missed reports in a month = formal review · falsification = termination and legal action."));
  }

  /* ---------- render ---------- */
  const dateInput = $("#report-date"), monthInput = $("#report-month");
  const defaultMonth = (T) => addMonths(monthOf(T), -1);
  function setDate(iso) { state.date = isISO(iso) ? iso : todayISO(); if (!state.monthManual) state.month = defaultMonth(state.date); render(); }
  function render() {
    buildFormats();
    if (!isMonth(state.month)) state.month = defaultMonth(state.date);
    V = buildView();
    dateInput.value = state.date;
    monthInput.value = state.month;
    $("#day-today").disabled = state.date === todayISO();
    $("#filter-note").replaceChildren(h("strong", {}, flong(state.date)), ` · monthly reports: ${fmonth(state.month)}`);
    try {
      const url = new URL(location.href);
      if (state.date === todayISO()) url.searchParams.delete("date"); else url.searchParams.set("date", state.date);
      history.replaceState(null, "", url);
    } catch (e) { /* ignore */ }
    renderReportHeads();
    renderOverview(); renderR1(); renderR2(); renderR3(); renderR4(); renderR5(); renderR6(); renderR7(); renderR8(); renderR9(); renderComp();
    Object.keys(CHARTS).forEach(drawChart);
  }
  function applyCompanyText() {
    document.title = `Group Finance Reporting · ${C.name || "Group"}`;
    $("#company-name").textContent = C.name || "Group";
    $("#foot-company").textContent = C.name || "Group";
    $("#eyebrow").textContent = `${C.name || "Group"} · Group finance controller`;
    $("#prepared-by").textContent = C.controller || "—";
    $("#sent-to").textContent = `${C.chairman || "Chairman"} (report 6 also ${C.financeOfficer || "finance officer"})`;
    $("#lede").textContent = `Nine reports prepared by ${C.controller || "the controller"} for ${C.chairman || "the Chairman"}. Deadlines are fixed. Formats are fixed.`;
    $("#foot-period").textContent = `amounts in ${CUR}`;
    $("#foot-note").textContent = CONNECTED ? "Figures are saved online and shown only to the people the Chairman gave access. Share reports as PDF." : D.sample ? "Showing example data. Clear it with Start empty in the Data sheet." : "Figures are saved on this device only. Back up with Export Excel; share reports as PDF.";
  }
  function renderBanner() {
    const el = $("#data-banner");
    const openSheet = h("button", { class: "btn btn-sm", type: "button" }, icon("sheet"), "Open Data sheet");
    openSheet.addEventListener("click", () => setView("sheet"));
    const empty = DATASETS.every((k) => !D[k].length);
    let msg = null;
    if (CONNECTED && !empty) { el.hidden = true; return; }
    if (CONNECTED) msg = [h("strong", {}, "No figures yet. "), "Start in the Data sheet: add bank accounts, then daily balances every morning. Everything you type saves online for the people who have access."];
    else if (empty) msg = [h("strong", {}, "No figures yet. "), "Start in the Data sheet: add bank accounts, then daily balances, transactions and expected items. Or tap Try example data to see all nine reports."];
    else if (D.sample) msg = [h("strong", {}, "Example data. "), "These figures are made up. Clear them with Start empty in the Data sheet."];
    else msg = [h("strong", {}, "Private: saved on this device only. "), "Nothing is uploaded. Back up with Export Excel and send reports as PDF."];
    el.className = `notice report-only${D.sample || empty ? "" : " local"}`;
    el.hidden = false;
    el.replaceChildren(icon("info"), h("div", { class: "grow" }, msg), h("div", { class: "acts" }, openSheet));
  }
  function rebuildAll() { buildFormats(); applyCompanyText(); render(); renderBanner(); dirty = false; }

  /* ==========================================================================
     DATA SHEET
     ========================================================================== */
  const col = (key, label, type = "text", w = 130, extra = {}) => ({ key, label, type, w, ...extra });
  const cId = (w = 90) => col("id", "ID", "text", w);
  const cDate = (key = "date", label = "Date", w = 140) => col(key, label, "date", w);
  const cMonth = () => col("month", "Month", "month", 150);
  const cAmt = (key = "amount", label = "Amount", w = 140) => col(key, label, "number", w);
  const cNote = (w = 200) => col("note", "Note", "text", w);
  const cCompany = (withPersonal = true) => col("company", "Company", "select", 140, { options: () => [...companyList(), ...(withPersonal && ROLE !== "staff" ? ["Personal"] : [])] });
  const cAccount = () => col("account", "Account", "select", 260, { options: () => ["", ...D.accounts.map(accLabel)] });
  const optsOf = (c) => (typeof c.options === "function" ? c.options() : c.options);
  const SHEETS = [
    { id: "accounts", label: "Accounts", prefix: "AC-", cols: [cId(), col("company", "Company", "select", 150, { options: () => [...companyList(), "Personal"] }), col("bank", "Bank", "text", 150, { suggest: true }),
      col("account", "Account name / number", "text", 200), col("type", "Type", "select", 110, { options: ["Company", "Personal"] }), cAmt("minBalance", "Minimum balance"), cNote()],
      onChange: (r, key) => { if (key === "company") { r.type = r.company === "Personal" ? "Personal" : r.type === "Personal" ? "Company" : r.type; return ["type"]; } return []; } },
    { id: "balances", label: "Daily balances", prefix: "BL-", cols: [cId(), cDate(), cAccount(), cAmt("book", "Book balance"), cAmt("bank", "Bank statement balance", 180), cNote()] },
    { id: "transactions", label: "Transactions", prefix: "TX-", cols: [cId(), cDate(), cCompany(), cAccount(), col("direction", "In / out", "select", 90, { options: ["Out", "In"] }),
      col("category", "Category", "text", 140, { suggest: true }), col("description", "Paid to / received from", "text", 220), cAmt(), col("approvedBy", "Approved by", "text", 130, { suggest: true }), cNote()] },
    { id: "forecast", label: "Forecast", prefix: "FC-", cols: [cId(), cDate("date", "Expected date"), cCompany(), col("direction", "In / out", "select", 90, { options: ["Out", "In"] }),
      col("description", "Description", "text", 240), cAmt(), col("status", "Status", "select", 120, { options: FC_STATUS })] },
    { id: "obligations", label: "Loans & tax", prefix: "LN-", cols: [cId(), col("name", "Name", "text", 150), col("type", "Type", "select", 90, { options: ["Loan", "Tax"] }), cCompany(false), col("lender", "Lender / authority", "text", 150, { suggest: true }),
      cAmt("owed", "Total owed"), cAmt("paidToDate", "Paid to date"), cAmt("outstanding", "Outstanding (blank = owed − paid)", 230), cAmt("monthlyPayment", "Monthly payment"), cDate("nextDueDate", "Next due date", 150),
      col("status", "Status", "select", 110, { options: OBL_STATUS }), cNote()] },
    { id: "reconItems", label: "Reconciliation items", prefix: "RC-", cols: [cId(), cDate(), cAccount(), col("item", "Item", "text", 200), cAmt("amount", "Amount (book − bank)", 170), col("explanation", "Explanation", "text", 220), col("action", "Action", "text", 200), col("status", "Status", "select", 110, { options: ["Open", "Resolved"] })] },
    { id: "monthly", label: "Monthly results", prefix: "MR-", cols: [cId(), cMonth(), cCompany(false), cAmt("revenue", "Revenue"), cAmt("payroll", "Payroll"), cAmt("loanInterest", "Loan interest"), cAmt("utilities", "Utilities"), cAmt("tax", "Tax"), cAmt("other", "Other expenses"), cAmt("assets", "Assets"), cAmt("liabilities", "Liabilities"), cNote()] },
    { id: "staffReviews", label: "Staff reviews", prefix: "SR-", cols: [cId(), cMonth(), col("name", "Name", "text", 120, { suggestList: () => staffList().map((x) => x.name) }), col("role", "Role", "text", 200, { suggestList: () => staffList().map((x) => x.role) }),
      col("onTime", "Reports on time", "number", 130), col("due", "Reports due", "number", 110), col("errors", "Errors found", "number", 110), col("penalties", "Penalties applied", "text", 150), col("bonus", "Bonus earned", "text", 130), col("action", "Recommended action", "text", 240)],
      onChange: (r, key) => { if (key === "name" && !r.role) { const s0 = staffList().find((x) => x.name === r.name); if (s0) { r.role = s0.role; return ["role"]; } } return []; } },
    { id: "teamAssessment", label: "Team assessment", prefix: "TA-", cols: [cId(), cMonth(), col("assessment", "Overall finance team assessment", "text", 520)] },
    { id: "incidents", label: "Incidents", prefix: "IN-", cols: [cId(), cDate(), col("time", "Time", "time", 110), col("type", "Type", "select", 210, { options: INCIDENT_TYPES }), cCompany(),
      col("what", "What happened", "text", 260), col("impact", "Impact (financial & operational)", "text", 240), col("action", "Action taken", "text", 220), col("recommendation", "Recommended decision", "text", 240),
      col("sensitivity", "Time sensitivity", "select", 150, { options: SENSITIVITY }), col("status", "Status", "select", 130, { options: INC_STATUS }), col("decision", "Chairman's decision", "text", 220)] },
    { id: "submissions", label: "Submission log", prefix: "SB-", cols: [cId(), col("report", "Report no.", "select", 100, { options: REPORTS.map((r) => String(r.no)) }), col("period", "Period (date, week Monday, YYYY-MM or incident ID)", "text", 320), cDate("date", "Sent date"), col("time", "Sent time", "time", 110), cNote()] },
  ];
  const SETTINGS = [
    { key: "name", label: "Group name" }, { key: "companies", label: "Companies (comma separated)" }, { key: "chairman", label: "Chairman (reports go to)" },
    { key: "controller", label: "Group finance controller" }, { key: "financeOfficer", label: "Finance officer (also receives report 6)" },
    { key: "staff", label: "Finance staff (Name — Role; Name — Role)", wide: true }, { key: "largePayment", label: "Large payment threshold", number: true },
    { key: "workOnSunday", label: "Daily reports on Sunday? (Yes / No)" }, { key: "currency", label: "Currency code" },
    { key: "fixedPay", label: "Controller fixed monthly pay (private)", number: true }, { key: "complianceBonus", label: "Report compliance bonus (private)", number: true }, { key: "accuracyBonus", label: "Accuracy bonus (private)", number: true },
  ];
  const sheetUI = { active: "accounts", q: "" };
  const normKey = (x) => String(x ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
  function parseNumber(v) {
    if (typeof v === "number") return Number.isFinite(v) ? v : "";
    const t = String(v ?? "").trim();
    if (!t) return "";
    const neg0 = /^\(.*\)$/.test(t) || /^-/.test(t);
    const n = parseFloat(t.replace(/[^0-9.]/g, ""));
    return Number.isFinite(n) ? (neg0 ? -n : n) : "";
  }
  function parseDateValue(v, X) {
    if (v == null || v === "") return "";
    if (typeof v === "number" && X) { const d = X.SSF.parse_date_code(v); if (d) return `${d.y}-${pad2(d.m)}-${pad2(d.d)}`; }
    if (v instanceof Date && !isNaN(v)) return toISO(v);
    const t = String(v).trim();
    let m = t.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
    if (m) return `${m[1]}-${pad2(m[2])}-${pad2(m[3])}`;
    m = t.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
    if (m) { const a = +m[1], b = +m[2]; const [day, mon] = b > 12 ? [b, a] : [a, b]; return `${m[3]}-${pad2(mon)}-${pad2(day)}`; }
    const d = new Date(t);
    return isNaN(d) ? t : toISO(d);
  }
  function parseMonth(v, X) {
    if (v == null || v === "") return "";
    const t = String(v).trim();
    if (/^\d{4}-\d{1,2}$/.test(t)) { const [y, m] = t.split("-"); return `${y}-${pad2(m)}`; }
    const d = parseDateValue(v, X);
    return isISO(d) ? d.slice(0, 7) : t;
  }
  function parseTime(v) {
    if (v == null || v === "") return "";
    if (typeof v === "number" && v >= 0 && v < 1) { const mins = Math.round(v * 1440); return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`; }
    const m = String(v).trim().match(/^(\d{1,2})[:.](\d{2})\s*(am|pm)?/i);
    if (!m) return String(v).trim();
    let hh = +m[1];
    if (m[3] && /pm/i.test(m[3]) && hh < 12) hh += 12;
    if (m[3] && /am/i.test(m[3]) && hh === 12) hh = 0;
    return `${pad2(hh)}:${m[2]}`;
  }
  function coerce(c, v, X) {
    if (c.type === "number") return parseNumber(v);
    if (c.type === "date") return parseDateValue(v, X);
    if (c.type === "month") return parseMonth(v, X);
    if (c.type === "time") return parseTime(v);
    let t = String(v ?? "").trim();
    if (c.type === "select") { const hit = optsOf(c).find((o) => normKey(o) === normKey(t)); if (hit != null) t = hit; }
    return t;
  }
  function nextId(def) {
    if (CONNECTED) return `${def.prefix}${todayISO().slice(2).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 6)}`;
    let max = 0, width = 3;
    for (const r of D[def.id]) { const m = String(r.id || "").match(/(\d+)\s*$/); if (m) { max = Math.max(max, +m[1]); width = Math.max(width, m[1].length); } }
    return `${def.prefix}${String(max + 1).padStart(width, "0")}`;
  }
  function blankRow(def) {
    const r = {};
    for (const c of def.cols) r[c.key] = c.type === "select" ? optsOf(c)[0] ?? "" : "";
    const firstDate = def.cols.find((c) => c.type === "date");
    if (firstDate) r[firstDate.key] = def.id === "forecast" ? addDays(todayISO(), 1) : todayISO();
    if (def.cols.some((c) => c.key === "month")) r.month = state.month || monthOf(todayISO());
    if (def.cols.some((c) => c.type === "time")) r.time = nowHM();
    if (def.id === "submissions") { r.report = "1"; r.period = todayISO(); }
    r.id = nextId(def);
    return r;
  }
  function suggestValues(c, rows) {
    if (c.suggestList) return uniq(c.suggestList());
    return uniq(rows.map((r) => r[c.key]));
  }
  function renderSheetTabs() {
    const all = [...SHEETS.filter((d) => canSee(d.id)).map((d) => ({ id: d.id, label: d.label, count: D[d.id].length })),
      ...(ROLE !== "staff" ? [{ id: "settings", label: "Settings" }] : []), ...(CONNECTED && ROLE === "owner" ? [{ id: "team", label: "Team & access" }] : [])];
    if (!all.some((t) => t.id === sheetUI.active)) sheetUI.active = all[0].id;
    $("#sheet-tabs").replaceChildren(...all.map((t) => {
      const b = h("button", { type: "button", role: "tab", "aria-selected": String(t.id === sheetUI.active), "aria-pressed": String(t.id === sheetUI.active) }, t.label, t.count != null ? h("span", { class: "cnt" }, num(t.count)) : null);
      b.addEventListener("click", () => { sheetUI.active = t.id; sheetUI.q = ""; renderSheetTabs(); renderSheet(); });
      return b;
    }));
  }
  function renderSheetNotice() {
    if (CONNECTED) {
      $("#sheet-notice").className = "notice";
      $("#sheet-notice").replaceChildren(icon("info"), h("div", { class: "grow" },
        h("strong", {}, "Connected. "), "Changes save online and appear for everyone with access. ",
        ROLE === "staff" ? "You can add daily balances, transactions, forecast items, reconciliation items and monthly results. Accounts are read-only. Reports go to the Chairman."
          : ["Start with ", h("strong", {}, "Accounts"), ", then add ", h("strong", {}, "Daily balances"), " every morning."]));
      return;
    }
    $("#sheet-notice").className = "notice local";
    $("#sheet-notice").replaceChildren(icon("info"), h("div", { class: "grow" },
      h("strong", {}, "Private: saved on this device only. "), "These figures are never uploaded. Back up with ", h("strong", {}, "Export Excel"),
      " (and keep the file safe). To use the same figures on another device, import that Excel file there. Start with ", h("strong", {}, "Accounts"), ", then add ", h("strong", {}, "Daily balances"), " every morning."));
  }
  function renderSheet() {
    renderSheetNotice();
    const host = $("#sheet-body");
    if (sheetUI.active === "settings") { renderSettings(host); return; }
    if (sheetUI.active === "team") { renderTeam(host); return; }
    const def = SHEETS.find((d) => d.id === sheetUI.active);
    const rows = D[def.id];
    const ro = !canWrite(def.id);
    const search = h("input", { class: "input", type: "search", placeholder: `Search ${def.label.toLowerCase()}`, "aria-label": `Search ${def.label}`, value: sheetUI.q });
    const count = h("span", { class: "count" });
    const add = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("plus"), "Add row");
    const gridWrap = h("div", { class: "sheet-scroll" });
    const datalists = h("div", { hidden: true });
    for (const c of def.cols.filter((x) => x.suggest || x.suggestList)) datalists.append(h("datalist", { id: `dl-${def.id}-${c.key}` }, suggestValues(c, rows).map((v) => h("option", { value: v }))));
    const drawGrid = () => {
      const q = sheetUI.q.toLowerCase();
      const visible = rows.map((r, i) => [r, i]).filter(([r]) => !q || def.cols.some((c) => String(r[c.key] ?? "").toLowerCase().includes(q)));
      count.textContent = q ? `${num(visible.length)} of ${num(rows.length)} rows` : `${num(rows.length)} ${rows.length === 1 ? "row" : "rows"}`;
      if (!rows.length) { gridWrap.replaceChildren(h("div", { class: "sheet-empty" }, h("strong", {}, `No ${def.label.toLowerCase()} yet. `), "Tap Add row, or import an Excel/CSV file.")); return; }
      const thead = h("thead", {}, h("tr", {}, h("th", { class: "rn", scope: "col" }, "#"), def.cols.map((c) => h("th", { class: c.type === "number" ? "num" : null, scope: "col", style: `min-width:${c.w}px` }, c.label)), h("th", { scope: "col" }, h("span", { class: "sr-only" }, "Delete"))));
      gridWrap.replaceChildren(h("table", { class: "sheet-grid" }, thead, h("tbody", {}, visible.map(([r, i]) => sheetRow(def, r, i, ro)))));
    };
    search.addEventListener("input", () => { sheetUI.q = search.value.trim(); drawGrid(); });
    add.addEventListener("click", () => {
      rows.push(blankRow(def)); saveData();
      sheetUI.q = ""; search.value = "";
      drawGrid(); renderSheetTabs();
      gridWrap.scrollTop = gridWrap.scrollHeight;
      const last = $$("tbody tr", gridWrap).pop();
      const target = last && ($$(".cell", last).find((c) => c.dataset.key !== "id" && !["date", "time", "month"].includes(c.type)) || $$(".cell", last)[1]);
      if (target) target.focus();
    });
    host.replaceChildren(h("div", { class: "sheet-head" }, h("h3", {}, def.label), ro ? badge("Read-only") : null, count, h("span", { class: "dt-spacer" }), h("div", { class: "dt-search" }, icon("search"), search), ro ? null : add),
      gridWrap, h("div", { class: "sheet-foot" }, "Tip: press Enter to move down a column. Numbers without commas (a minus sign for negatives); dates as day / month / year."), datalists);
    drawGrid();
  }
  function sheetRow(def, r, index, ro = false) {
    const tr = h("tr", {});
    tr.append(h("td", { class: "rn" }, String(index + 1)));
    def.cols.forEach((c, ci) => {
      let input;
      const label = `${c.label}, row ${index + 1}`;
      if (c.type === "select") {
        const opts = [...optsOf(c)];
        if (r[c.key] && !opts.includes(r[c.key])) opts.push(r[c.key]);
        input = h("select", { class: "cell", "aria-label": label }, opts.map((o) => h("option", { value: o }, o || "—")));
        input.value = r[c.key] ?? opts[0];
      } else if (["date", "time", "month"].includes(c.type)) {
        input = h("input", { class: "cell", type: c.type, "aria-label": label, value: r[c.key] || "" });
      } else if (c.type === "number") {
        input = h("input", { class: "cell num", type: "text", inputmode: "decimal", "aria-label": label, value: blank(r[c.key]) ? "" : String(r[c.key]) });
      } else {
        input = h("input", { class: "cell", type: "text", "aria-label": label, value: r[c.key] ?? "", list: c.suggest || c.suggestList ? `dl-${def.id}-${c.key}` : null });
      }
      input.dataset.col = String(ci); input.dataset.key = c.key;
      if (ro) input.disabled = true;
      input.addEventListener("change", () => {
        const v = coerce(c, input.value);
        r[c.key] = v;
        if (c.type === "number") input.value = v === "" ? "" : String(v);
        if (def.onChange) for (const k of def.onChange(r, c.key)) { const other = $(`.cell[data-key="${k}"]`, tr); if (other) other.value = r[k] ?? ""; }
        saveData();
      });
      input.addEventListener("keydown", (e) => {
        if (e.key !== "Enter" || e.isComposing) return;
        e.preventDefault(); input.dispatchEvent(new Event("change"));
        const next = e.shiftKey ? tr.previousElementSibling : tr.nextElementSibling;
        const target = next && $(`.cell[data-col="${ci}"]`, next);
        if (target) target.focus();
      });
      tr.append(h("td", {}, input));
    });
    const del = h("button", { class: "del-btn", type: "button", "aria-label": `Delete row ${index + 1}`, title: "Delete row" }, icon("trash"));
    del.addEventListener("click", () => {
      const arr = D[def.id], at = arr.indexOf(r);
      if (at < 0) return;
      arr.splice(at, 1); saveData(); renderSheet(); renderSheetTabs();
      toast(`Row deleted from ${def.label}.`, { label: "Undo", run: () => { arr.splice(at, 0, r); saveData(); renderSheet(); renderSheetTabs(); } });
    });
    tr.append(h("td", {}, ro ? null : del));
    return tr;
  }
  function renderSettings(host) {
    const form = h("div", { class: "settings-form" });
    for (const sd of SETTINGS) {
      const id = `set-${sd.key}`;
      const input = h("input", { class: "input", id, type: "text", inputmode: sd.number ? "decimal" : null, value: D.company[sd.key] ?? "" });
      input.addEventListener("change", () => { const val = input.value.trim(); D.company[sd.key] = sd.number ? parseNumber(val) : sd.key === "currency" ? val.toUpperCase() : val; saveData(); });
      form.append(h("label", { class: `field${sd.wide ? " wide" : ""}`, for: id }, h("span", {}, sd.label), input));
    }
    host.replaceChildren(h("div", { class: "sheet-head" }, h("h3", {}, "Settings")), form);
  }

  /* ---------- Excel import & export ---------- */
  let xlsxPromise = null;
  function loadScript(src, err) {
    return new Promise((resolve, reject) => { const el = document.createElement("script"); el.src = src; el.onload = resolve; el.onerror = () => reject(new Error(err)); document.head.append(el); });
  }
  function loadXLSX() {
    if (window.XLSX) return Promise.resolve(window.XLSX);
    if (!xlsxPromise) xlsxPromise = loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js", "Could not load the Excel tool. Check the internet connection and try again.").then(() => window.XLSX).catch((e) => { xlsxPromise = null; throw e; });
    return xlsxPromise;
  }
  const slug = (t) => String(t || "report").toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  async function exportExcel() {
    try {
      const X = await loadXLSX(), wb = X.utils.book_new();
      for (const def of SHEETS) {
        const ws = X.utils.aoa_to_sheet([def.cols.map((c) => c.label), ...D[def.id].map((r) => def.cols.map((c) => r[c.key] ?? ""))]);
        ws["!cols"] = def.cols.map((c) => ({ wch: Math.max(10, Math.round(c.w / 7)) }));
        X.utils.book_append_sheet(wb, ws, def.label.replace(/[\\/?*[\]:]/g, " ").slice(0, 31));
      }
      const set = X.utils.aoa_to_sheet([["Setting", "Value"], ...SETTINGS.map((sd) => [sd.label, D.company[sd.key] ?? ""])]);
      set["!cols"] = [{ wch: 44 }, { wch: 60 }];
      X.utils.book_append_sheet(wb, set, "Settings");
      X.writeFile(wb, `${slug(D.company.name)}-finance-data-${todayISO()}.xlsx`);
    } catch (e) { toast(e.message); }
  }
  function parseRows(X, ws, def) {
    const out = [];
    for (const obj of X.utils.sheet_to_json(ws, { defval: "", raw: true })) {
      const r = {};
      for (const [head, v] of Object.entries(obj)) { const k = normKey(head); const c = def.cols.find((cc) => normKey(cc.key) === k || normKey(cc.label) === k); if (c) r[c.key] = coerce(c, v, X); }
      if (!Object.values(r).some((v) => v !== "" && v !== 0)) continue;
      for (const c of def.cols) if (!(c.key in r)) r[c.key] = c.type === "select" ? optsOf(c)[0] ?? "" : "";
      out.push(r);
    }
    return out;
  }
  async function importFile(file) {
    try {
      const X = await loadXLSX();
      const wb = X.read(new Uint8Array(await file.arrayBuffer()), { type: "array", raw: /\.csv$/i.test(file.name) });
      const plan = []; let settings = null;
      for (const name of wb.SheetNames) {
        const n = normKey(name);
        if (n === "settings") {
          settings = {};
          for (const [label, value] of X.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: "", raw: true })) {
            const sd = SETTINGS.find((x) => normKey(x.label) === normKey(label) || normKey(x.key) === normKey(label));
            if (sd) settings[sd.key] = sd.number ? parseNumber(value) : String(value).trim();
          }
          continue;
        }
        const def = SHEETS.find((d) => normKey(d.id) === n || normKey(d.label) === n);
        if (def) plan.push({ def, rows: parseRows(X, wb.Sheets[name], def) });
      }
      if (!plan.length && !settings) {
        const def = SHEETS.find((d) => d.id === sheetUI.active);
        if (!def) { toast("Open the sheet you want to import into, then import again."); return; }
        plan.push({ def, rows: parseRows(X, wb.Sheets[wb.SheetNames[0]], def) });
      }
      const lines = plan.map((p) => `• ${p.def.label}: ${p.rows.length} rows`);
      if (settings) lines.push("• Settings");
      if (!confirm(`Import from "${file.name}"?\n\n${lines.join("\n")}\n\nThis replaces the current rows in these sheets.`)) return;
      for (const p of plan) { D[p.def.id] = p.rows; for (const r of p.rows) if (!r.id) r.id = nextId(p.def); }
      if (settings) Object.assign(D.company, settings);
      D.sample = false; saveData();
      if (plan.length === 1) sheetUI.active = plan[0].def.id;
      renderSheetTabs(); renderSheet();
      toast(`Imported ${plan.reduce((a, p) => a + p.rows.length, 0)} rows.`);
    } catch (e) { toast(e.message || "Could not read that file."); }
  }

  /* ---------- example data (made up, dated around today) ---------- */
  function exampleData() {
    let seed = 23;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
    const round = (n, st) => Math.round(n / st) * st;
    const T = todayISO();
    const d = { sample: true, company: { ...D.company }, accounts: [], balances: [], transactions: [], forecast: [], obligations: [], reconItems: [], monthly: [], staffReviews: [], teamAssessment: [], incidents: [], submissions: [] };
    const acc = [["Klever", "ZamZam Bank", "Current 0012", 4200000, 500000], ["Klever", "CBE", "Operating 7781", 1650000, 200000], ["Rovestone", "NIB", "Current 3310", 2300000, 300000],
      ["Rovestone", "ZamZam Bank", "Loan repayment 0045", 900000, 250000], ["Meri", "Awash Bank", "Current 5520", 780000, 100000], ["Strip Mall", "CBE", "Rent collection 9014", 1350000, 150000],
      ["Personal", "ZamZam Bank", "Personal 1102", 950000, 0], ["Personal", "CBE", "Savings 4471", 3100000, 0]];
    acc.forEach(([company, bank, account, bal, min], i) => d.accounts.push({ id: `AC-${pad2(i + 1)}0`, company, bank, account, type: company === "Personal" ? "Personal" : "Company", minBalance: min || "", note: "" }));
    const labels = d.accounts.map(accLabel);
    const start = addDays(T, -45);
    let bl = 0, tx = 0;
    const payees = { Out: ["Supplier payment", "Payroll", "Rent", "Utilities", "Loan repayment", "Tax payment", "Transport"], In: ["Customer payment", "Rent received", "Deposit received", "Transfer in"] };
    acc.forEach(([company, bank, account, bal], ai) => {
      let b = bal * 0.9;
      for (let day = start; day <= T; day = addDays(day, 1)) {
        if (isoDow(day) === 7) continue;
        const moves = 1 + Math.floor(rnd() * 3);
        for (let k = 0; k < moves; k++) {
          const dir = rnd() < 0.5 ? "In" : "Out";
          const amt = round(bal * (0.01 + rnd() * 0.06), 50);
          b += dir === "In" ? amt : -amt;
          if (day < T) {
            const cat = payees[dir][Math.floor(rnd() * payees[dir].length)];
            d.transactions.push({ id: `TX-${String(++tx).padStart(4, "0")}`, date: day, company, account: labels[ai], direction: dir, category: cat, description: company === "Personal" ? (dir === "In" ? "Dividend / transfer" : ["School fees", "Household", "Travel", "Medical"][Math.floor(rnd() * 4)]) : `${cat} – ${company}`, amount: amt,
              approvedBy: dir === "Out" && amt >= 50000 ? (rnd() < 0.9 ? "Chairman" : "") : "", note: "" });
          }
        }
        b = Math.max(b, bal * 0.3);
        const bankBal = day === T || isoDow(day) === 1 ? round(b - (ai === 1 ? 18500 : ai === 4 ? 6200 : 0), 1) : "";
        if (!(day === T && ai === 5)) d.balances.push({ id: `BL-${String(++bl).padStart(4, "0")}`, date: day, account: labels[ai], book: round(b, 1), bank: bankBal, note: "" });
      }
    });
    // forecast: next 35 days
    let fc = 0;
    const cos = ["Klever", "Rovestone", "Meri", "Strip Mall"];
    for (let i = 0; i < 35; i++) {
      const day = addDays(T, i);
      if (isoDow(day) === 7) continue;
      for (let k = 0; k < 2 + Math.floor(rnd() * 3); k++) {
        const co = cos[Math.floor(rnd() * cos.length)], dir = rnd() < 0.48 ? "In" : "Out";
        d.forecast.push({ id: `FC-${String(++fc).padStart(3, "0")}`, date: day, company: co, direction: dir, description: dir === "In" ? ["Customer payment", "Rent collection", "Final settlement", "Deposit"][Math.floor(rnd() * 4)] : ["Supplier payment", "Payroll", "Utilities", "Materials import"][Math.floor(rnd() * 4)],
          amount: round(60000 + rnd() * 900000, 1000), status: i < 3 ? "Confirmed" : "Expected" });
      }
      if (i % 6 === 2) d.forecast.push({ id: `FC-${String(++fc).padStart(3, "0")}`, date: day, company: "Personal", direction: rnd() < 0.3 ? "In" : "Out", description: ["School fees", "Property tax", "Family support", "Car service"][Math.floor(rnd() * 4)], amount: round(20000 + rnd() * 180000, 500), status: "Expected" });
    }
    d.forecast.push({ id: `FC-${String(++fc).padStart(3, "0")}`, date: addDays(T, 3), company: "Klever", direction: "Out", description: "Imported panels – letter of credit", amount: 6800000, status: "Confirmed" });
    // loans & tax
    [["Rovestone loan", "Loan", "Rovestone", "Private lender", 18000000, 6400000, "", 450000, 12, "Current"], ["ZamZam 1", "Loan", "Klever", "ZamZam Bank", 25000000, 11200000, "", 780000, 5, "Current"],
      ["ZamZam 2", "Loan", "Klever", "ZamZam Bank", 12000000, 3100000, "", 520000, 19, "Current"], ["NIB", "Loan", "Rovestone", "NIB International Bank", 9000000, 2750000, "", 390000, 9, "At risk"],
      ["Tax", "Tax", "Klever", "Revenue authority", 4800000, 2900000, "", 650000, 11, "Current"]].forEach(([name, type, company, lender, owed, paid, out, pay, due, status], i) => {
      d.obligations.push({ id: `LN-${pad2(i + 1)}0`, name, type, company, lender, owed, paidToDate: paid, outstanding: out === "" ? (type === "Loan" ? owed - paid : "") : out, monthlyPayment: pay, nextDueDate: addDays(T, due), status, note: "" });
    });
    // reconciliation items
    d.reconItems.push({ id: "RC-001", date: addDays(T, -2), account: labels[1], item: "Deposit in transit", amount: 18500, explanation: "Customer cheque deposited after bank cut-off; clears in 2 days", action: "", status: "Open" });
    d.reconItems.push({ id: "RC-002", date: addDays(T, -5), account: labels[4], item: "Bank charges not booked", amount: 4000, explanation: "Service charges September", action: "Book the remaining ETB 2,200 difference and ask the bank for details", status: "Open" });
    // monthly results: last 3 months
    let mr = 0;
    for (let k = 1; k <= 3; k++) {
      const M = addMonths(monthOf(T), -k);
      [["Klever", 9800000], ["Rovestone", 4200000], ["Meri", 1600000], ["Strip Mall", 2100000]].forEach(([co, rev]) => {
        const r = round(rev * (0.9 + rnd() * 0.2), 1000);
        d.monthly.push({ id: `MR-${String(++mr).padStart(3, "0")}`, month: M, company: co, revenue: r, payroll: round(r * 0.22, 1000), loanInterest: round(r * 0.05, 1000), utilities: round(r * 0.03, 1000), tax: round(r * 0.07, 1000), other: round(r * 0.35, 1000),
          assets: round(rev * 9, 10000), liabilities: round(rev * 4.2, 10000), note: "" });
      });
    }
    // staff reviews for last month
    const lastM = addMonths(monthOf(T), -1);
    [["Selam", "Klever Finance Officer", 21, 22, 1, "0", "2,000", "Keep; improve bank reconciliation notes"], ["Sabella", "Klever Finance Assistant", 18, 22, 3, "1 warning", "0", "Training on payment vouchers"],
      ["Rahel", "Rovestone Accountant", 22, 22, 0, "0", "3,000", "Recognise – zero errors"]].forEach(([name, role, on, due, err, pen, bon, act], i) => {
      d.staffReviews.push({ id: `SR-${pad2(i + 1)}0`, month: lastM, name, role, onTime: on, due, errors: err, penalties: pen, bonus: bon, action: act });
    });
    d.teamAssessment.push({ id: "TA-001", month: lastM, assessment: "Team delivered most reports on time. Klever needs tighter payment voucher checks; Rovestone reporting is reliable. Priority next month: close all reconciliation items weekly." });
    // incidents
    d.incidents.push({ id: "IN-001", date: addDays(T, -1), time: "15:20", type: "Unauthorized payment attempt", company: "Klever", what: "A payment of ETB 240,000 to a new supplier was prepared without chairman approval.", impact: "Blocked before release; no money left the account.", action: "Payment cancelled; supplier details being verified.", recommendation: "Approve rule: new suppliers need two signatures for the first payment.", sensitivity: "Within 24 hours", status: "Open", decision: "" });
    d.incidents.push({ id: "IN-002", date: addDays(T, -9), time: "10:05", type: "Loan default risk", company: "Rovestone", what: "NIB repayment of ETB 390,000 due in 9 days; Rovestone balance may not cover it.", impact: "Late payment penalty and credit record risk.", action: "Rent collections moved forward; transfer from Klever prepared.", recommendation: "Approve inter-company transfer of ETB 250,000 if collections fall short.", sensitivity: "Within 7 days", status: "Decision given", decision: "Approved the transfer if needed." });
    // submissions: most on time, a few late / missing
    const sb = (no, period, date, time) => d.submissions.push({ id: `SB-${String(d.submissions.length + 1).padStart(3, "0")}`, report: String(no), period, date, time, note: "" });
    for (let day = addDays(T, -40); day <= T; day = addDays(day, 1)) {
      if (isoDow(day) === 7) continue;
      [1, 2, 3].forEach((no) => { if (day === addDays(T, -6) && no === 3) return; sb(no, day, day, day === addDays(T, -3) && no === 2 ? "09:40" : `08:${pad2(20 + Math.floor(rnd() * 35))}`); });
    }
    for (let w = weekStart(addDays(T, -40)); w < weekStart(T); w = addDays(w, 7)) {
      sb(4, w, addDays(w, 3), "16:30"); sb(5, w, addDays(w, 4), "16:45"); sb(6, w, w, "11:30");
    }
    if (isoDow(T) > 1) sb(6, weekStart(T), weekStart(T), "11:10");
    sb(7, addMonths(monthOf(T), -2), `${addMonths(monthOf(T), -1)}-06`, "17:20");
    sb(8, addMonths(monthOf(T), -2), `${addMonths(monthOf(T), -1)}-04`, "15:10");
    sb(8, addMonths(monthOf(T), -1), `${monthOf(T)}-04`, "15:00");
    sb(9, "IN-002", addDays(T, -9), "10:30");
    return d;
  }

  /* ==========================================================================
     PDF export
     ========================================================================== */
  const PDF_LIBS = ["https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js", "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"];
  const ETH_RE = /[ሀ-᎟ⶀ-⷟꬀-꬯]/;
  const PC = { ink: [11, 11, 11], ink2: [82, 81, 78], muted: [137, 135, 129], grid: [225, 224, 217], rule: [195, 194, 183], band: [244, 243, 239], in: [42, 120, 214], good: [0, 99, 0], bad: [179, 38, 30] };
  let pdfLibPromise = null, ethFontB64 = null;
  function loadPdfLib() {
    if (window.jspdf && window.jspdf.jsPDF && window.jspdf.jsPDF.API.autoTable) return Promise.resolve(window.jspdf.jsPDF);
    if (!pdfLibPromise) {
      const err = "Could not load the PDF tool. Check the internet connection and try again.";
      pdfLibPromise = PDF_LIBS.reduce((p, src) => p.then(() => loadScript(src, err)), Promise.resolve()).then(() => window.jspdf.jsPDF).catch((e) => { pdfLibPromise = null; throw e; });
    }
    return pdfLibPromise;
  }
  function toBase64(buf) { const bytes = new Uint8Array(buf); let bin = ""; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000)); return btoa(bin); }
  const pdfClean = (v) => String(v ?? "").replace(/[  ]/g, " ").replace(/−/g, "-").replace(/→/g, "->").replace(/÷/g, "/").replace(/×/g, "x").replace(/[–—]/g, "-").replace(/≥/g, ">=");
  async function newPdf() {
    const jsPDF = await loadPdfLib();
    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    let eth = false;
    if (ETH_RE.test(JSON.stringify(D))) {
      if (!ethFontB64) { const res = await fetch("fonts/AbyssinicaSIL-Regular.ttf"); if (!res.ok) throw new Error("Could not load the Amharic font for the PDF."); ethFontB64 = toBase64(await res.arrayBuffer()); }
      doc.addFileToVFS("AbyssinicaSIL-Regular.ttf", ethFontB64); doc.addFont("AbyssinicaSIL-Regular.ttf", "Abyssinica", "normal"); eth = true;
    }
    const W = doc.internal.pageSize.getWidth(), H = doc.internal.pageSize.getHeight(), M = 36;
    const k = { doc, W, H, M, y: M };
    k.font = (style, sample) => { if (eth && ETH_RE.test(sample)) doc.setFont("Abyssinica", "normal"); else doc.setFont("helvetica", style || "normal"); };
    k.text = (str, x, y, { size = 9, style = "normal", color = PC.ink, align = "left", maxWidth } = {}) => { const t = pdfClean(str); k.font(style, t); doc.setFontSize(size); doc.setTextColor(...color); doc.text(t, x, y, { align, maxWidth }); };
    k.ensure = (need) => { if (H - 48 - k.y < need) { doc.addPage(); k.y = M; } };
    k.sub = (title, note) => { k.ensure(60); k.text(title, M, k.y, { size: 10, style: "bold" }); if (note) k.text(note, W - M, k.y, { size: 7.5, color: PC.muted, align: "right" }); k.y += 8; };
    k.line = (str, opts = {}) => { k.ensure(16); k.text(str, M, k.y, { size: 8.5, color: PC.ink2, ...opts }); k.y += 13; };
    k.table = (opts) => {
      const { head, body, align = [], foot, fontSize = 8, bold, empty } = opts;
      if (!body.length) { k.text(empty || "Nothing recorded.", M, k.y + 4, { size: 8.5, color: PC.muted }); k.y += 20; return; }
      const columnStyles = {};
      head.forEach((_, i) => { columnStyles[i] = { halign: align[i] === "r" ? "right" : "left" }; });
      doc.autoTable({
        head: [head.map(pdfClean)], body: body.map((r) => r.map(pdfClean)), foot: foot ? [foot.map(pdfClean)] : undefined, startY: k.y, margin: { left: M, right: M, top: M, bottom: 48 }, theme: "plain",
        styles: { font: "helvetica", fontSize, textColor: PC.ink, cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 }, lineColor: PC.grid, lineWidth: { bottom: 0.5 }, overflow: "linebreak", valign: "middle" },
        headStyles: { fillColor: PC.band, textColor: PC.ink2, fontStyle: "bold", fontSize: fontSize - 0.5 },
        footStyles: { fillColor: PC.band, textColor: PC.ink, fontStyle: "bold", lineWidth: { top: 0.75, bottom: 0 }, lineColor: PC.rule },
        columnStyles, showHead: "everyPage", showFoot: "lastPage", rowPageBreak: "avoid",
        didParseCell: (data) => {
          if (align[data.column.index] === "r") data.cell.styles.halign = "right";
          if (bold && data.section === "body" && bold(data.row.index)) data.cell.styles.fontStyle = "bold";
          if (opts.color && data.section === "body") { const c = opts.color(data.row.index, data.column.index); if (c) { data.cell.styles.textColor = c; data.cell.styles.fontStyle = "bold"; } }
          if (eth && ETH_RE.test(data.cell.text.join(" "))) { data.cell.styles.font = "Abyssinica"; data.cell.styles.fontStyle = "normal"; }
        },
      });
      k.y = doc.lastAutoTable.finalY + 14;
    };
    k.kv = (pairs) => { k.table({ head: ["", ""], body: pairs.map(([a, b]) => [a, b]), align: ["l", "r"], fontSize: 8.5, bold: (i) => i === pairs.length - 1 }); };
    k.box = (title, text) => {
      const lines = doc.splitTextToSize(pdfClean(text || "-"), W - 2 * M - 20);
      const hgt = lines.length * 10.5 + 24;
      k.ensure(hgt + 6);
      doc.setFillColor(...PC.band); doc.setDrawColor(...PC.grid); doc.setLineWidth(0.5); doc.roundedRect(M, k.y, W - 2 * M, hgt, 6, 6, "FD");
      k.text(title, M + 10, k.y + 13, { size: 7.5, style: "bold", color: PC.ink2 });
      k.font("normal", text); doc.setFontSize(9); doc.setTextColor(...PC.ink); doc.text(lines, M + 10, k.y + 26);
      k.y += hgt + 8;
    };
    k.header = (title, right1, right2) => {
      const x = M, y = k.y;
      doc.setFillColor(...PC.ink); doc.roundedRect(x, y, 30, 30, 7, 7, "F");
      doc.setDrawColor(255, 255, 255); doc.setLineWidth(1.4);
      doc.line(x + 7, y + 12, x + 15, y + 7); doc.line(x + 15, y + 7, x + 23, y + 12);
      [9.5, 13.5, 17.5, 21.5].forEach((xx) => doc.line(x + xx - 1, y + 13, x + xx - 1, y + 20));
      doc.setDrawColor(...PC.in); doc.line(x + 7, y + 23, x + 23, y + 23);
      k.text(C.name || "Group", x + 40, y + 11, { size: 9, style: "bold", color: PC.ink2 });
      k.text(title, x + 40, y + 28, { size: 13, style: "bold" });
      k.text(right1, W - M, y + 11, { size: 9.5, style: "bold", align: "right" });
      k.text(right2, W - M, y + 23, { size: 7.5, color: PC.muted, align: "right" });
      k.y = y + 40;
      doc.setDrawColor(...PC.in); doc.setLineWidth(1.5); doc.line(M, k.y, W - M, k.y);
      k.y += 18;
    };
    k.footers = (left) => {
      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) { doc.setPage(i); doc.setDrawColor(...PC.grid); doc.setLineWidth(0.5); doc.line(M, H - 32, W - M, H - 32); k.text(left, M, H - 20, { size: 7, color: PC.muted }); k.text(`Page ${i} of ${pages}`, W - M, H - 20, { size: 7, color: PC.muted, align: "right" }); }
    };
    return k;
  }
  const red = (pred) => (ri, ci) => (pred(ri, ci) ? PC.bad : null);
  function pdfReport(k, no) {
    const v = V, rep = REPORTS[no - 1];
    const period = rep.freq === "ondemand" ? null : periodOf(rep, v.T);
    k.header(`Report ${no} - ${rep.title}`, period ? periodText(rep, period) : flong(v.T), whenText(rep));
    k.y -= 6; k.line(`Prepared by: ${C.controller || "-"}     Sent to: ${recipients(rep)}`); k.y += 2;
    if (no === 1) {
      k.line(`Balances on ${flong(v.T)} · movements on ${fday(v.Y)}`);
      k.table({ head: ["Company", "Cash balance", "Yesterday", "Inflows", "Outflows"], align: ["l", "r", "r", "r", "r"], body: v.r1co.map((c) => [c.company, money(c.cash), money(c.prev), money(c.inY), money(c.outY)]), foot: ["TOTAL", money(v.groupCash), money(v.groupCashY), money(v.inY), money(v.outY)] });
      k.sub("Bank accounts");
      k.table({ head: ["Company", "Bank / account", "Balance", "As of", "Status"], align: ["l", "l", "r", "l", "l"], body: v.r1acc.map((a) => [a.company, [a.bank, a.account].filter(Boolean).join(" "), a.balance == null ? "-" : money(a.balance), a.asOf ? fday(a.asOf) : "-", a.low ? "BELOW MINIMUM" : a.stale ? "Not updated" : "OK"]),
        color: red((ri, ci) => ci === 4 && (v.r1acc[ri].low || v.r1acc[ri].stale)) });
    } else if (no === 2) {
      k.line(`Opening cash (group, today): ${money(v.groupCash)}`);
      k.table({ head: ["Day", "Opening", "Inflows", "Outflows", "Closing", "Status"], align: ["l", "r", "r", "r", "r", "l"], body: v.days7.map((d) => [fday(d.date), money(d.opening), money(d.inflow), money(d.outflow), money(d.closing), d.closing < 0 ? "SHORTFALL" : d.short ? "Below minimum" : "OK"]),
        foot: ["7 days", "", money(sum(v.days7, (d) => d.inflow)), money(sum(v.days7, (d) => d.outflow)), money(v.days7[6].closing), ""], color: red((ri, ci) => ci >= 4 && v.days7[ri].short) });
      k.sub("Expected items");
      k.table({ head: ["Date", "Company", "In/out", "Description", "Amount", "Status"], align: ["l", "l", "l", "l", "r", "l"], body: v.r2items.map((f) => [fday(f.date), f.company, f.direction, f.description, money(f.amount), f.status || "Expected"]), fontSize: 7.5, empty: "No expected items." });
    } else if (no === 3) {
      k.kv([["Personal cash yesterday", money(v.persCashY)], ["In yesterday", money(v.r3in)], ["Out yesterday", money(v.r3out)], ["Personal cash today", money(v.persCash)]]);
      k.sub("Accounts");
      k.table({ head: ["Bank / account", "Balance", "As of"], align: ["l", "r", "l"], body: v.r3acc.map((a) => [[a.bank, a.account].filter(Boolean).join(" "), a.balance == null ? "-" : money(a.balance), a.asOf ? fday(a.asOf) : "-"]), foot: ["TOTAL", money(v.persCash), ""], empty: "No personal accounts." });
      k.sub("Movements");
      k.table({ head: ["Date", "In/out", "Description", "Amount"], align: ["l", "l", "l", "r"], body: v.r3moves.map((t) => [fday(t.date), t.direction, t.description || t.category, money(t.amount)]), empty: "No personal movements." });
      k.sub("Coming up (next 7 days)");
      k.table({ head: ["Date", "In/out", "Description", "Amount"], align: ["l", "l", "l", "r"], body: v.r3up.map((f) => [fday(f.date), f.direction, f.description, money(f.amount)]), empty: "Nothing coming up." });
    } else if (no === 4) {
      k.table({ head: ["Week", "Opening", "Inflows", "Outflows", "Net", "Closing", "Loan/tax due"], align: ["l", "r", "r", "r", "r", "r", "r"], body: v.weeks4.map((w) => [`${fday(w.start)} - ${fday(w.end)}`, money(w.opening), money(w.inflow), money(w.outflow), money(w.net), money(w.closing), w.dues.length ? `${money(w.duesTotal)} (${w.dues.map((o) => o.name).join(", ")})` : "-"]),
        fontSize: 7.5, color: red((ri, ci) => ci === 5 && v.weeks4[ri].closing < 0) });
      k.sub("Net cash flow by company");
      k.table({ head: ["Company", ...v.weekLabels.map((w) => w.short), "Total"], align: ["l", "r", "r", "r", "r", "r"], body: v.companies.map((c) => [c, ...v.weeks4.map((w) => money(w.byCo[c] || 0)), money(sum(v.weeks4, (w) => w.byCo[c] || 0))]) });
    } else if (no === 5) {
      k.sub(`Large payments (>= ${money(v.limit)})`, `${fday(v.ws)} - ${fday(v.we)}`);
      k.table({ head: ["Date", "Company", "Paid to", "Amount", "Approved by"], align: ["l", "l", "l", "r", "l"], body: v.large.map((t) => [fday(t.date), t.company, t.description, money(t.amount), t.approvedBy || "NO APPROVER"]), color: red((ri, ci) => ci === 4 && v.large[ri].noApproval), empty: "No large payments this week." });
      k.sub("Loan & tax deadlines (next 14 days)");
      k.table({ head: ["Due", "Name", "Lender", "Payment", "Status"], align: ["l", "l", "l", "r", "l"], body: v.dead14.map((o) => [fdate(o.nextDueDate), o.name, o.lender || "-", money(o.monthlyPayment), o.status || "Current"]), color: red((ri, ci) => ci === 4 && v.dead14[ri].status !== "Current"), empty: "Nothing due." });
      k.sub("Report submissions this week");
      const subs = v.subsWeek.filter((x) => x.st.state !== "none");
      k.table({ head: ["Report", "Period", "Status"], align: ["l", "l", "l"], body: subs.map((x) => [`${x.rep.no}. ${x.rep.title}`, periodText(x.rep, x.period), x.st.label]), color: red((ri, ci) => ci === 2 && ["late", "missing"].includes(subs[ri].st.state)), fontSize: 7.5 });
      k.sub("Exceptions");
      k.table({ head: ["Type", "Detail"], align: ["l", "l"], body: [...v.incWeek.map((i) => ["Incident", `${i.type}: ${i.what || ""}`]), ...v.low.map((a) => ["Low balance", `${a.label}: ${money(a.balance)}`]), ...v.openRecon.map((r) => ["Reconciliation", `${r.account}: ${r.item} ${money(r.amount)}`])], empty: "No exceptions." });
    } else if (no === 6) {
      k.table({ head: ["Bank", "Account", "Book balance", "Bank balance", "Difference"], align: ["l", "l", "r", "r", "r"], body: v.r6.map((a) => [a.bank || "-", `${a.account} (${a.company})`, a.book == null ? "-" : money(a.book), a.bankBal == null ? "-" : money(a.bankBal), a.diff == null ? "-" : money(a.diff)]),
        foot: ["TOTAL", "", money(sum(v.r6.filter((a) => a.book != null), (a) => a.book)), money(sum(v.r6.filter((a) => a.bankBal != null), (a) => a.bankBal)), money(sum(v.r6.filter((a) => a.diff != null), (a) => a.diff))] });
      k.sub("Unreconciled items");
      k.table({ head: ["Item", "Amount", "Explanation"], align: ["l", "r", "l"], body: v.r6items.map((it) => [`${it.item} (${it.label})`, money(it.amount), it.explanation || "-"]), empty: "No unreconciled items." });
      k.sub("Discrepancies requiring action");
      k.table({ head: ["Account", "Amount", "Action"], align: ["l", "r", "l"], body: v.r6disc.map((a) => [a.label, money(a.unexplained), (a.items.find((x) => x.action) || {}).action || "Investigate with the bank"]), color: red((ri, ci) => ci === 1), empty: "No discrepancies." });
    } else if (no === 7) {
      k.line(`Month: ${fmonth(v.M)}`, { style: "bold", color: PC.ink });
      k.sub("1. Group cash position"); k.table({ head: ["Company", "Cash balance"], align: ["l", "r"], body: v.r7cash.map((c) => [c.company, money(c.cash)]), foot: ["TOTAL", money(sum(v.r7cash, (c) => c.cash))] });
      k.sub("2. Group revenue"); k.table({ head: ["Company", "Revenue"], align: ["l", "r"], body: v.r7rev.map((c) => [c.company, money(c.revenue)]), foot: ["TOTAL", money(v.revenue)] });
      k.sub("3. Group expenses"); k.table({ head: ["Category", "Amount"], align: ["l", "r"], body: v.r7exp.map((c) => [c.label, money(c.amount)]), foot: ["TOTAL", money(v.expenses)] });
      k.sub("4. Group profit / loss"); k.kv([["Revenue", money(v.revenue)], ["Expenses", money(v.expenses)], ["Net", money(v.revenue - v.expenses)]]);
      k.sub("5. Debt position"); k.table({ head: ["Loan", "Outstanding", "Monthly payment"], align: ["l", "r", "r"], body: v.debt.map((o) => [o.name, money(o.out), money(o.monthlyPayment)]), foot: ["TOTAL", money(sum(v.debt, (o) => o.out)), money(sum(v.debt, (o) => o.monthlyPayment))] });
      k.sub("6. Tax position"); k.kv([["Owed", money(v.tax.owed)], ["Paid to date", money(v.tax.paid)], ["Remaining", money(v.tax.remaining)]]);
      k.sub("7. Net worth"); k.kv([["Assets", money(v.assets)], ["Liabilities", money(v.liabilities)], ["Net", money(v.assets - v.liabilities)]]);
    } else if (no === 8) {
      k.line(`Month: ${fmonth(v.M)}`, { style: "bold", color: PC.ink });
      for (const p of v.staff) {
        const r = p.review;
        k.sub(`${p.name.toUpperCase()} - ${p.role}`);
        k.table({ head: ["", ""], align: ["l", "l"], fontSize: 8.5, body: r ? [["Reports submitted on time", `${n0(r.onTime)} / ${n0(r.due)}`], ["Errors found", String(n0(r.errors))], ["Penalties applied", String(r.penalties || "0")], ["Bonus earned", String(r.bonus || "0")], ["Recommended action", r.action || "-"]] : [["Status", "Not reviewed yet"]] });
      }
      k.box("OVERALL FINANCE TEAM ASSESSMENT", v.team ? v.team.assessment : "Not written yet.");
    }
  }
  function pdfIncident(k, i) {
    k.header("Incident Report", `${fdate(i.date)}${i.time ? ` ${i.time}` : ""}`, i.id || "");
    k.y -= 6; k.line(`Prepared by: ${C.controller || "-"}     Sent to: ${C.chairman || "Chairman"} only`); k.y += 2;
    k.kv([["Type", i.type || "-"], ["Company", i.company || "-"], ["Status", i.status || "Open"], ["TIME SENSITIVITY", i.sensitivity || "-"]]);
    k.box("WHAT HAPPENED", i.what); k.box("IMPACT (FINANCIAL AND OPERATIONAL)", i.impact); k.box("ACTION TAKEN", i.action); k.box("RECOMMENDED DECISION FROM CHAIRMAN", i.recommendation);
    if (i.decision) k.box("CHAIRMAN'S DECISION", i.decision);
  }
  async function exportPdf(nos) {
    const k = await newPdf();
    nos.forEach((no, idx) => { if (idx) { k.doc.addPage(); k.y = k.M; } pdfReport(k, no); });
    k.footers(`${C.name || "Group"} · Group finance reporting · ${flong(V.T)} · amounts in ${CUR} · confidential`);
    k.doc.save(`${slug(C.name)}-${nos.length === 1 ? `report-${nos[0]}` : "reports"}-${V.T}.pdf`);
  }
  async function exportIncidentPdf(i) {
    const k = await newPdf();
    pdfIncident(k, i);
    k.footers(`${C.name || "Group"} · Incident report ${i.id || ""} · confidential`);
    k.doc.save(`${slug(C.name)}-incident-${slug(i.id || i.date)}.pdf`);
  }
  async function withBusy(btn, fn) {
    if (btn.disabled) return;
    const kids = [...btn.childNodes];
    btn.disabled = true; btn.replaceChildren(icon("clock"), "Preparing PDF…");
    try { await fn(); toast("PDF downloaded."); } catch (e) { console.error(e); toast(e.message || "Could not create the PDF."); } finally { btn.disabled = false; btn.replaceChildren(...kids); }
  }

  /* ==========================================================================
     ONLINE MODE — Cloudflare Worker API: login, shared data, live updates
     ========================================================================== */
  const authEl = $("#auth");
  const TOKEN_KEY = "gf-session";
  let TOKEN = null, REV = 0, pollTimer = 0;
  let snap = new Map(), setSnap = { general: "", private: "" };
  let syncTimer = 0, syncing = false, syncAgain = false, pending = false;
  const keyOf = (ds, rid) => `${ds}\u0000${rid}`;
  try { TOKEN = localStorage.getItem(TOKEN_KEY); } catch (e) { /* storage blocked */ }
  function saveToken(t) { TOKEN = t; try { if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY); } catch (e) { /* ignore */ } }
  async function api(path, body) {
    const res = await fetch(String(CFG.apiUrl).replace(/\/+$/, "") + path, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try { data = await res.json(); } catch (e) { /* empty body */ }
    if (res.status === 401 && TOKEN && path !== "/api/login") {
      saveToken(null); ROLE = null; clearInterval(pollTimer);
      showAuth("signin", (data && data.error) || "Your session ended. Please sign in again.");
      throw Object.assign(new Error("Signed out"), { quiet: true });
    }
    if (!res.ok) throw new Error((data && data.error) || `Server error ${res.status}`);
    return data;
  }
  function splitSettings() {
    const general = {}, priv = {};
    for (const [k, v] of Object.entries(D.company)) (PRIVATE_KEYS.includes(k) ? priv : general)[k] = v;
    return { general, priv };
  }
  function takeSnapshot() {
    snap = new Map();
    for (const ds of DATASETS) for (const r of D[ds]) snap.set(keyOf(ds, r.id), JSON.stringify(r));
    const { general, priv } = splitSettings();
    setSnap = { general: JSON.stringify(general), private: JSON.stringify(priv) };
  }
  function setSyncState(st, detail) {
    const el = $("#sync-state");
    if (!el) return;
    el.className = `sync-state ${st}`;
    el.replaceChildren(icon(st === "saved" ? "check" : st === "saving" ? "clock" : "alertCircle"), st === "saved" ? "Saved" : st === "saving" ? "Saving…" : "Not saved");
    el.title = detail || (st === "saved" ? "All changes are saved online" : "");
  }
  function scheduleSync() {
    if (!ROLE) return;
    pending = true;
    setSyncState("saving");
    clearTimeout(syncTimer);
    syncTimer = setTimeout(syncNow, 500);
  }
  async function syncNow() {
    if (syncing) { syncAgain = true; return; }
    syncing = true;
    try {
      const ups = [], seen = new Set();
      for (const ds of DATASETS) {
        if (!canWrite(ds)) { for (const r of D[ds]) seen.add(keyOf(ds, r.id)); continue; }
        for (const r of D[ds]) {
          if (!/^[A-Za-z0-9._:-]{1,80}$/.test(String(r.id || ""))) r.id = nextId(SHEETS.find((d) => d.id === ds) || { prefix: "X-" });
          const k = keyOf(ds, r.id);
          seen.add(k);
          const js = JSON.stringify(r);
          if (snap.get(k) !== js) ups.push({ dataset: ds, rid: r.id, data: r, js });
        }
      }
      const dels = [...snap.keys()].filter((k) => !seen.has(k)).map((k) => { const [dataset, rid] = k.split("\u0000"); return { dataset, rid }; });
      let settings = null;
      if (ROLE === "owner" || ROLE === "controller") {
        const { general, priv } = splitSettings();
        const g = JSON.stringify(general), p = JSON.stringify(priv);
        if (g !== setSnap.general) (settings = settings || {}).general = general;
        if (p !== setSnap.private) (settings = settings || {}).private = priv;
      }
      const jobs = [...ups.map((u) => ["u", u]), ...dels.map((d) => ["d", d])];
      for (let i = 0; i < Math.max(jobs.length, settings ? 1 : 0); i += 200) {
        const part = jobs.slice(i, i + 200);
        const body = { upserts: part.filter((j) => j[0] === "u").map(([, u]) => ({ dataset: u.dataset, rid: u.rid, data: u.data })), deletes: part.filter((j) => j[0] === "d").map(([, d]) => d) };
        if (i === 0 && settings) body.settings = settings;
        await api("/api/sync", body);
        for (const [kind, x] of part) { if (kind === "u") snap.set(keyOf(x.dataset, x.rid), x.js); else snap.delete(keyOf(x.dataset, x.rid)); }
        if (i === 0 && settings) { if (settings.general) setSnap.general = JSON.stringify(settings.general); if (settings.private) setSnap.private = JSON.stringify(settings.private); }
      }
      pending = false;
      setSyncState("saved");
    } catch (e) {
      if (e.quiet) return;
      console.error(e);
      setSyncState("error", e.message || String(e));
      toast(`Not saved online (${e.message || e}). Check the internet connection.`, { label: "Try again", run: () => scheduleSync() });
    } finally {
      syncing = false;
      if (syncAgain) { syncAgain = false; scheduleSync(); }
    }
  }
  async function loadAll() {
    const res = await api("/api/data");
    const d = { company: {} };
    for (const k of DATASETS) d[k] = [];
    for (const r of res.records || []) if (d[r.dataset]) d[r.dataset].push({ ...r.data, id: r.rid });
    Object.assign(d.company, (res.settings || {}).general || {}, (res.settings || {}).private || {});
    D = normalize(d);
    D.sample = false;
    REV = res.rev || 0;
    takeSnapshot();
  }
  let renderQueued = false;
  function queueRemoteRender() {
    if (renderQueued) return;
    renderQueued = true;
    const run = () => {
      const a = document.activeElement;
      if (a && a.classList && a.classList.contains("cell")) { a.addEventListener("blur", () => setTimeout(run, 60), { once: true }); return; }
      renderQueued = false;
      if (document.body.dataset.view === "sheet") { renderSheetTabs(); renderSheet(); dirty = true; } else rebuildAll();
    };
    setTimeout(run, 200);
  }
  async function poll() {
    if (!ROLE || pending || syncing || document.visibilityState !== "visible") return;
    try {
      let changed = false, more = true;
      while (more) {
        const res = await api(`/api/changes?since=${REV}`);
        for (const r of res.records || []) {
          const arr = D[r.dataset];
          if (!arr) continue;
          const k = keyOf(r.dataset, r.rid), at = arr.findIndex((x) => x.id === r.rid);
          if (r.deleted) { if (at >= 0) { arr.splice(at, 1); changed = true; } snap.delete(k); continue; }
          const rec = { ...r.data, id: r.rid }, js = JSON.stringify(rec);
          if (snap.get(k) === js) continue;
          if (at >= 0) arr[at] = rec; else arr.push(rec);
          snap.set(k, js);
          changed = true;
        }
        const st = res.settings || {};
        if (st.general || st.private) {
          Object.assign(D.company, st.general || {}, st.private || {});
          const { general, priv } = splitSettings();
          setSnap = { general: JSON.stringify(general), private: JSON.stringify(priv) };
          changed = true;
        }
        REV = res.rev || REV;
        more = !!res.more;
      }
      if (changed) queueRemoteRender();
    } catch (e) { /* offline: try again next time */ }
  }
  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(poll, 15000);
  }
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") poll(); });
  function renderAccountChip() {
    const el = $("#account-chip");
    if (!CONNECTED || !ROLE) { el.hidden = true; return; }
    const pass = h("button", { class: "btn btn-sm btn-ghost", type: "button", title: "Change your password" }, "Password");
    pass.addEventListener("click", () => showAuth("changepass"));
    const out = h("button", { class: "btn btn-sm btn-ghost", type: "button", title: "Sign out" }, "Sign out");
    out.addEventListener("click", signOut);
    el.replaceChildren(h("span", { class: "sync-state saved", id: "sync-state" }), h("span", { class: "who" }, h("strong", {}, ME.name || ME.email), h("span", {}, ROLE_LABEL[ROLE] || ROLE)), pass, out);
    el.hidden = false;
    setSyncState(pending ? "saving" : "saved");
  }
  async function signOut() {
    try { await api("/api/logout", {}); } catch (e) { /* already signed out */ }
    saveToken(null);
    location.reload();
  }
  function applyRoleUI() {
    document.body.dataset.role = CONNECTED ? ROLE || "none" : "local";
    $("#load-example").hidden = CONNECTED;
    $("#clear-all").hidden = CONNECTED;
    $("#import-btn").hidden = CONNECTED && !["owner", "controller"].includes(ROLE);
    renderAccountChip();
  }
  function showAuth(mode, message) {
    document.body.classList.add("locked");
    authEl.hidden = false;
    const err = h("p", { class: "auth-error", role: "alert" }, message || "");
    const field = (label, attrs) => { const i = h("input", { class: "input", ...attrs }); return [h("label", { class: "field" }, h("span", {}, label), i), i]; };
    const head = h("div", { class: "auth-head" }, h("span", { class: "brand-mark", "aria-hidden": "true" }, icon("bank")), h("div", {}, h("strong", {}, C.name || "Group"), h("span", {}, "Group Finance Reporting")));
    const link = (text, fn) => { const b = h("button", { class: "linkish", type: "button" }, text); b.addEventListener("click", fn); return b; };
    const busy = async (btn, fn) => { btn.disabled = true; err.textContent = ""; try { await fn(); } catch (x) { if (!x.quiet) err.textContent = x.message || String(x); btn.disabled = false; } };
    let body = [];
    if (mode === "loading") body = [h("p", { class: "muted" }, "Loading…")];
    else if (mode === "error") body = [h("p", {}, message || "Something went wrong."), link("Try again", () => location.reload())];
    else if (mode === "signin" || mode === "signup") {
      const [fName, iName] = field("Your name", { type: "text", autocomplete: "name" });
      const [fEmail, iEmail] = field("Email", { type: "email", autocomplete: "email", required: true });
      const [fPass, iPass] = field("Password", { type: "password", autocomplete: mode === "signin" ? "current-password" : "new-password", required: true, minlength: 8 });
      const go = h("button", { class: "btn btn-primary", type: "submit" }, mode === "signin" ? "Sign in" : "Create account");
      const form = h("form", { class: "auth-form" }, mode === "signup" ? fName : null, fEmail, fPass, err, go);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        busy(go, async () => {
          const email = iEmail.value.trim().toLowerCase(), password = iPass.value;
          const res = mode === "signin" ? await api("/api/login", { email, password }) : await api("/api/signup", { email, password, name: iName.value.trim() });
          saveToken(res.token);
          await afterLogin(res.me);
        });
      });
      body = [h("h2", {}, mode === "signin" ? "Sign in" : "Create your account"),
        h("p", { class: "muted" }, mode === "signin" ? "Use the email the Chairman gave access to." : "Use the email the Chairman added in Team & access. Choose a password of at least 8 characters."),
        form,
        h("p", { class: "auth-links" }, mode === "signin"
          ? [link("First time? Create your account", () => showAuth("signup")), " · ", link("Forgot password?", () => { err.textContent = "Ask the Chairman to set a new password for you in Team & access."; })]
          : link("I already have an account", () => showAuth("signin")))];
    } else if (mode === "changepass") {
      const [fCur, iCur] = field("Current password", { type: "password", autocomplete: "current-password" });
      const [fNew, iNew] = field("New password (at least 8 characters)", { type: "password", autocomplete: "new-password", minlength: 8 });
      const go = h("button", { class: "btn btn-primary", type: "submit" }, "Save new password");
      const form = h("form", { class: "auth-form" }, fCur, fNew, err, go);
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        busy(go, async () => {
          await api("/api/password", { current: iCur.value, next: iNew.value });
          authEl.hidden = true; document.body.classList.remove("locked");
          toast("Password changed.");
        });
      });
      body = [h("h2", {}, "Change your password"), form, h("p", { class: "auth-links" }, link("Cancel", () => { authEl.hidden = true; document.body.classList.remove("locked"); }))];
    } else if (mode === "claim") {
      const [fName, iName] = field("Your name", { type: "text", value: ME.name || "" });
      const go = h("button", { class: "btn btn-primary", type: "button" }, "Set up as owner (Chairman)");
      go.addEventListener("click", () => busy(go, async () => { const res = await api("/api/claim-owner", { name: iName.value.trim() }); await afterLogin(res.me); }));
      body = [h("h2", {}, "First-time setup"), h("p", {}, `Signed in as ${ME.email}. Nobody manages this system yet. The first person becomes the owner (the Chairman): they see everything and decide who else gets access.`), fName, err, go,
        h("p", { class: "auth-links" }, link("Sign out", signOut))];
    } else if (mode === "waiting") {
      const again = h("button", { class: "btn btn-primary", type: "button" }, "Check again");
      again.addEventListener("click", () => busy(again, async () => { const res = await api("/api/me"); await afterLogin(res.me); }));
      body = [h("h2", {}, "Waiting for access"), h("p", {}, `You are signed in as ${ME.email}, but this email has no access yet. Ask the Chairman to add it in Team & access, then tap Check again.`), err, again,
        h("p", { class: "auth-links" }, link("Sign out", signOut))];
    }
    authEl.replaceChildren(h("div", { class: "auth-card" }, head, ...body));
    const firstInput = $("input", authEl);
    if (firstInput) firstInput.focus();
  }
  async function afterLogin(me) {
    ME = me;
    if (!me.role) { showAuth(me.hasOwner ? "waiting" : "claim"); return; }
    showAuth("loading");
    ROLE = me.role;
    await loadAll();
    startPolling();
    authEl.hidden = true;
    document.body.classList.remove("locked");
    applyRoleUI();
    rebuildAll();
    if (ROLE === "staff") { sheetUI.active = "balances"; setView("sheet", { scroll: false }); }
    else setView(location.hash === "#sheet" ? "sheet" : "report", { scroll: false });
  }
  async function bootConnected() {
    document.body.classList.add("locked");
    applyRoleUI();
    if (!TOKEN) { showAuth("signin"); return; }
    showAuth("loading");
    try {
      const res = await api("/api/me");
      await afterLogin(res.me);
    } catch (x) {
      if (!x.quiet) showAuth("signin", `Could not reach the server: ${x.message || x}`);
    }
  }
  async function renderTeam(host) {
    host.replaceChildren(h("div", { class: "sheet-head" }, h("h3", {}, "Team & access")), h("div", { class: "empty" }, "Loading…"));
    let data;
    try { data = await api("/api/members"); } catch (x) { host.replaceChildren(h("div", { class: "empty" }, h("strong", {}, "Could not load the team. "), x.message)); return; }
    const me = (ME.email || "").toLowerCase();
    const roleSelect = (value, disabled) => { const sel = h("select", { class: "select", disabled }, ["owner", "controller", "staff"].map((r) => h("option", { value: r }, ROLE_LABEL[r]))); sel.value = value; return sel; };
    const iName = h("input", { class: "input", type: "text", placeholder: "Name", "aria-label": "Name" });
    const iEmail = h("input", { class: "input", type: "email", placeholder: "name@example.com", "aria-label": "Email" });
    const iRole = roleSelect("staff", false);
    const add = h("button", { class: "btn btn-sm btn-primary", type: "button" }, icon("plus"), "Give access");
    add.addEventListener("click", async () => {
      try {
        await api("/api/members", { email: iEmail.value.trim(), name: iName.value.trim(), role: iRole.value });
        toast(`${iEmail.value.trim()} can now create an account. Send them the link; they tap "First time? Create your account".`);
        renderTeam(host);
      } catch (x) { toast(x.message); }
    });
    const rows = (data.members || []).map((m) => {
      const self = m.email.toLowerCase() === me;
      const sel = roleSelect(m.role, self);
      sel.addEventListener("change", async () => { try { await api("/api/members", { email: m.email, role: sel.value }); toast(`${m.email} is now ${ROLE_LABEL[sel.value]}.`); } catch (x) { toast(x.message); renderTeam(host); } });
      const actions = h("div", { class: "rh-side" });
      if (!self && m.hasAccount) {
        const reset = h("button", { class: "btn btn-sm", type: "button" }, "Set password");
        reset.addEventListener("click", async () => {
          const pw = prompt(`New password for ${m.email} (at least 8 characters). Tell them the new password; they can change it after signing in.`);
          if (!pw) return;
          try { await api("/api/members/password", { email: m.email, password: pw }); toast(`New password set for ${m.email}.`); } catch (x) { toast(x.message); }
        });
        actions.append(reset);
      }
      if (!self) {
        const rm = h("button", { class: "btn btn-sm btn-ghost danger", type: "button" }, "Remove");
        rm.addEventListener("click", async () => {
          if (!confirm(`Remove access for ${m.email}? They will no longer see anything.`)) return;
          try { await api("/api/members/delete", { email: m.email }); renderTeam(host); } catch (x) { toast(x.message); }
        });
        actions.append(rm);
      }
      return [h("strong", {}, m.name || "—"), m.email, sel, m.hasAccount ? badge("Account created", "good") : badge("Not signed up yet", "warning"), self ? h("span", { class: "muted" }, "You") : actions];
    });
    host.replaceChildren(
      h("div", { class: "sheet-head" }, h("h3", {}, "Team & access"), h("span", { class: "count" }, `${num(rows.length)} people`)),
      h("div", { class: "team-add" }, iName, iEmail, iRole, add),
      table({ head: ["Name", "Email", "Access", "Status", ""], rows }),
      h("div", { class: "sheet-foot" }, "Chairman (owner): sees everything and manages access. Finance controller: sees and edits everything. Finance staff: only the data sheets they fill in, never reports, personal cash, salaries or staff reviews. Forgotten password: use Set password and tell the person the new one."));
  }

  /* ---------- view switching & wiring ---------- */
  function setView(v, { scroll = true } = {}) {
    if (ROLE === "staff") v = "sheet";
    document.body.dataset.view = v;
    $$("#view-seg button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === v)));
    $$("#nav a").forEach((a) => a.classList.toggle("active", v === "sheet" ? a.classList.contains("nav-sheet") : a.getAttribute("href") === "#overview"));
    hideTip();
    if (v === "sheet") { renderSheetTabs(); renderSheet(); } else if (dirty) rebuildAll();
    try { history.replaceState(null, "", v === "sheet" ? location.pathname + location.search + "#sheet" : location.pathname + location.search); } catch (e) { /* ignore */ }
    if (scroll) scrollTo({ top: 0 });
  }
  function initOnce() {
    buildChartCards();
    $$("#nav a").forEach((a) => {
      a.prepend(icon(a.dataset.icon));
      if (a.dataset.n && a.dataset.n !== "—") a.append(h("span", { class: "n" }, a.dataset.n));
      a.addEventListener("click", (e) => {
        const id = a.getAttribute("href").slice(1);
        e.preventDefault();
        if (id === "sheet") { setView("sheet"); return; }
        if (document.body.dataset.view === "sheet") setView("report", { scroll: false });
        document.getElementById(id).scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
      });
    });
    document.addEventListener("click", (e) => {
      const a = e.target.closest("a.link[href^='#']");
      if (!a) return;
      e.preventDefault();
      document.getElementById(a.getAttribute("href").slice(1)).scrollIntoView({ behavior: "smooth" });
    });
    const links = new Map($$("#nav a").map((a) => [a.getAttribute("href").slice(1), a]));
    const io = new IntersectionObserver((entries) => {
      if (document.body.dataset.view === "sheet") return;
      for (const e of entries) { if (!e.isIntersecting) continue; links.forEach((a) => a.classList.remove("active")); const a = links.get(e.target.id); if (a) { a.classList.add("active"); a.scrollIntoView({ block: "nearest", inline: "nearest" }); } }
    }, { rootMargin: "-35% 0px -60% 0px" });
    $$(".section").forEach((sec) => io.observe(sec));
    const widths = new WeakMap();
    let pending = new Set(), raf = 0;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) { const w = Math.round(e.contentRect.width); if (widths.get(e.target) === w) continue; widths.set(e.target, w); if (w > 0) pending.add(e.target); }
      if (!pending.size || raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        for (const el of pending) {
          if (el === V.spark) { drawSpark(el, V.days7.map((d) => d.closing), V.dayLabels); continue; }
          const id = el.closest("[data-chart]")?.dataset.chart;
          if (id) drawChart(id);
        }
        pending = new Set();
      });
    });
    $$(".chart-body").forEach((el) => ro.observe(el));
    new MutationObserver(() => { if (V.spark) ro.observe(V.spark); }).observe($("#hero"), { childList: true });
    dateInput.addEventListener("change", () => setDate(dateInput.value));
    monthInput.addEventListener("change", () => { if (isMonth(monthInput.value)) { state.month = monthInput.value; state.monthManual = true; render(); } });
    $("#day-prev").addEventListener("click", () => setDate(addDays(state.date, -1)));
    $("#day-next").addEventListener("click", () => setDate(addDays(state.date, 1)));
    $("#day-today").addEventListener("click", () => setDate(todayISO()));
    $("#theme-btn").addEventListener("click", () => {
      const root = document.documentElement;
      const next = (root.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")) === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("cr-theme", next); } catch (e) { /* ignore */ }
    });
    const pdfTop = $("#pdf-btn");
    pdfTop.addEventListener("click", () => {
      if (document.body.dataset.view === "sheet") setView("report", { scroll: false });
      const nos = V.dueToday.map((x) => x.rep.no);
      withBusy(pdfTop, () => exportPdf(nos.length ? nos : [1, 2, 3]));
    });
    $$("#view-seg button").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));
    const importBtn = $("#import-btn"), fileIn = $("#import-file");
    importBtn.replaceChildren(icon("upload"), "Import Excel / CSV");
    importBtn.addEventListener("click", () => fileIn.click());
    fileIn.addEventListener("change", () => { const f = fileIn.files[0]; fileIn.value = ""; if (f) importFile(f); });
    $("#export-xlsx").replaceChildren(icon("download"), "Export Excel (backup)");
    $("#export-xlsx").addEventListener("click", exportExcel);
    $("#load-example").addEventListener("click", () => {
      const has = DATASETS.some((k) => D[k].length) && !D.sample;
      if (has && !confirm("Replace the figures on this device with example data? Export Excel first if you want to keep them.")) return;
      const keep = { ...D.company };
      D = normalize(exampleData());
      D.company = { ...D.company, fixedPay: keep.fixedPay, complianceBonus: keep.complianceBonus, accuracyBonus: keep.accuracyBonus };
      saveData(); renderSheetTabs(); renderSheet(); toast("Example data loaded. Tap Reports to see it.");
    });
    $("#clear-all").addEventListener("click", () => {
      if (!confirm("Start with an empty sheet? All figures on this device will be removed (settings are kept). Tip: Export Excel first to keep a copy.")) return;
      for (const k of DATASETS) D[k] = [];
      D.sample = false; saveData(); renderSheetTabs(); renderSheet(); toast("Sheet cleared. Start with Accounts.");
    });
  }
  try { const d = new URL(location.href).searchParams.get("date"); if (isISO(d)) state.date = d; } catch (e) { /* ignore */ }
  buildFormats();
  state.month = defaultMonth(state.date);
  initOnce();
  rebuildAll();
  if (CONNECTED) bootConnected();
  else { applyRoleUI(); setView(location.hash === "#sheet" ? "sheet" : "report", { scroll: false }); }
})();
