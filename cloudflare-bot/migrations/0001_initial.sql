CREATE TABLE IF NOT EXISTS sessions (
  telegram_user_id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'idle',
  draft_json TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL UNIQUE,
  telegram_user_id TEXT NOT NULL,
  chat_id TEXT NOT NULL,
  username TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL DEFAULT '',
  section TEXT NOT NULL DEFAULT '',
  service TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  quantity INTEGER NOT NULL DEFAULT 0,
  file_key TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL DEFAULT '',
  telegram_file_id TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  manager_requested INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS orders_user_created_idx
  ON orders (telegram_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS orders_status_created_idx
  ON orders (status, created_at DESC);
