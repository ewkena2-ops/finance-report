-- Group Finance Reporting — Cloudflare D1 schema
CREATE TABLE IF NOT EXISTS users (
  email      TEXT PRIMARY KEY,
  name       TEXT,
  pass       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  email      TEXT NOT NULL,
  expires    INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_email ON sessions(email);
CREATE TABLE IF NOT EXISTS members (
  email      TEXT PRIMARY KEY,
  name       TEXT,
  role       TEXT NOT NULL CHECK (role IN ('owner', 'controller', 'staff')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS records (
  dataset    TEXT NOT NULL,
  rid        TEXT NOT NULL,
  data       TEXT NOT NULL,
  personal   INTEGER NOT NULL DEFAULT 0,
  deleted    INTEGER NOT NULL DEFAULT 0,
  rev        INTEGER NOT NULL,
  updated_at TEXT,
  updated_by TEXT,
  PRIMARY KEY (dataset, rid)
);
CREATE INDEX IF NOT EXISTS records_rev ON records(rev);
CREATE TABLE IF NOT EXISTS settings (
  id         TEXT PRIMARY KEY,
  data       TEXT NOT NULL,
  rev        INTEGER NOT NULL,
  updated_at TEXT,
  updated_by TEXT
);
CREATE TABLE IF NOT EXISTS meta (
  k TEXT PRIMARY KEY,
  v INTEGER NOT NULL
);
INSERT OR IGNORE INTO meta (k, v) VALUES ('rev', 0);
CREATE TABLE IF NOT EXISTS attempts (
  email TEXT PRIMARY KEY,
  fails INTEGER NOT NULL,
  since INTEGER NOT NULL
);
