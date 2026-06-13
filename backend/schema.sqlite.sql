-- =============================================================================
--  ToDo-Schule — Datenbankschema (SQLite)
-- -----------------------------------------------------------------------------
--  Ausführen mit:  sqlite3 database.sqlite < schema.sqlite.sql
--  Oder via:       php bin/migrate-to-sqlite.php
-- =============================================================================

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
--  Benutzer
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  email                TEXT    NOT NULL UNIQUE,
  abbreviation         TEXT    UNIQUE,
  password_hash        TEXT    NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  name                 TEXT,
  avatar_url           TEXT,
  created_at           TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at           TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE TRIGGER IF NOT EXISTS trig_users_updated_at
  AFTER UPDATE ON users FOR EACH ROW
  BEGIN UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id; END;

-- ---------------------------------------------------------------------------
--  Refresh-Tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT    NOT NULL UNIQUE,
  expires_at  TEXT    NOT NULL,
  revoked     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);

-- ---------------------------------------------------------------------------
--  Teams
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL,
  owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  color      TEXT    NOT NULL DEFAULT '#6178FE',
  icon       TEXT    NOT NULL DEFAULT '📁',
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_teams_owner ON teams(owner_id);
CREATE TRIGGER IF NOT EXISTS trig_teams_updated_at
  AFTER UPDATE ON teams FOR EACH ROW
  BEGIN UPDATE teams SET updated_at = datetime('now') WHERE id = NEW.id; END;

-- ---------------------------------------------------------------------------
--  Team-Mitglieder
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  team_id   INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      TEXT    NOT NULL DEFAULT 'member'
                   CHECK(role IN ('owner','admin','member')),
  joined_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (team_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_tm_user ON team_members(user_id);

-- ---------------------------------------------------------------------------
--  Team-Einladungen
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_invites (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  team_id    INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  email      TEXT    NOT NULL,
  token      TEXT    NOT NULL UNIQUE,
  status     TEXT    NOT NULL DEFAULT 'pending'
                    CHECK(status IN ('pending','accepted','revoked')),
  invited_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_invite_team ON team_invites(team_id);

-- ---------------------------------------------------------------------------
--  Aufgaben
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT    NOT NULL,
  description TEXT,
  subtasks    TEXT,
  tags        TEXT,
  status      TEXT    NOT NULL DEFAULT 'todo'
                     CHECK(status IN ('todo','in_progress','done')),
  priority    TEXT    NOT NULL DEFAULT 'medium'
                     CHECK(priority IN ('low','medium','high')),
  due_date    TEXT,
  remind_at   TEXT,
  team_id     INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  created_by  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_tasks_team    ON tasks(team_id);
CREATE INDEX IF NOT EXISTS idx_tasks_creator ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status  ON tasks(status);
CREATE TRIGGER IF NOT EXISTS trig_tasks_updated_at
  AFTER UPDATE ON tasks FOR EACH ROW
  BEGIN UPDATE tasks SET updated_at = datetime('now') WHERE id = NEW.id; END;

-- ---------------------------------------------------------------------------
--  Aufgaben-Zuweisungen
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (task_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ta_user ON task_assignees(user_id);

-- ---------------------------------------------------------------------------
--  Kommentare
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_task ON comments(task_id);

-- ---------------------------------------------------------------------------
--  Share-Links
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS share_links (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  token      TEXT    NOT NULL UNIQUE,
  permission TEXT    NOT NULL DEFAULT 'view'
                    CHECK(permission IN ('view','edit')),
  expires_at TEXT,
  active     INTEGER NOT NULL DEFAULT 1,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_share_task ON share_links(task_id);

-- ---------------------------------------------------------------------------
--  Notizen & Planungen
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  content    TEXT,
  kind       TEXT    NOT NULL DEFAULT 'note'
                    CHECK(kind IN ('note','plan')),
  team_id    INTEGER REFERENCES teams(id) ON DELETE SET NULL,
  created_by INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notes_team    ON notes(team_id);
CREATE INDEX IF NOT EXISTS idx_notes_creator ON notes(created_by);
CREATE INDEX IF NOT EXISTS idx_notes_updated ON notes(updated_at);
CREATE TRIGGER IF NOT EXISTS trig_notes_updated_at
  AFTER UPDATE ON notes FOR EACH ROW
  BEGIN UPDATE notes SET updated_at = datetime('now') WHERE id = NEW.id; END;

-- ---------------------------------------------------------------------------
--  Audit-Log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id    INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT    NOT NULL,
  changes    TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_task    ON audit_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);

-- ---------------------------------------------------------------------------
--  Realtime-Events (WS-Bridge)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  channel    TEXT    NOT NULL,
  event      TEXT    NOT NULL,
  payload    TEXT,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_channel ON events(channel);
CREATE INDEX IF NOT EXISTS idx_events_id      ON events(id);

-- ---------------------------------------------------------------------------
--  Rate-Limiting
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key   TEXT    NOT NULL PRIMARY KEY,
  hits         INTEGER NOT NULL DEFAULT 0,
  window_start TEXT    NOT NULL
);

-- ---------------------------------------------------------------------------
--  Benachrichtigungen
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       TEXT    NOT NULL,
  actor_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  task_id    INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  text       TEXT    NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notif_user    ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_created ON notifications(created_at);

-- ---------------------------------------------------------------------------
--  Kollegiumschat
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  content         TEXT    NOT NULL DEFAULT '',
  attachment_url  TEXT,
  attachment_name TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_created ON chat_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_chat_dm      ON chat_messages(user_id, recipient_id);

-- Lesebestätigungen (pro Leser/Gesprächspartner, nur für Direktnachrichten)
CREATE TABLE IF NOT EXISTS chat_reads (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  peer_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_id INTEGER NOT NULL DEFAULT 0,
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, peer_id)
);

-- Emoji-Reaktionen auf Chat-Nachrichten
CREATE TABLE IF NOT EXISTS chat_reactions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  emoji      TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE(message_id, user_id, emoji)
);
CREATE INDEX IF NOT EXISTS idx_react_msg ON chat_reactions(message_id);

-- ---------------------------------------------------------------------------
--  Anhänge (Datei-Uploads an Aufgaben & Notizen)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attachments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id       INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  note_id       INTEGER REFERENCES notes(id) ON DELETE CASCADE,
  filename      TEXT    NOT NULL,
  original_name TEXT    NOT NULL,
  mime_type     TEXT    NOT NULL,
  size          INTEGER NOT NULL DEFAULT 0,
  uploaded_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_att_task ON attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_att_note ON attachments(note_id);

-- ---------------------------------------------------------------------------
--  Web-Push-Subscriptions (Benachrichtigungen bei geschlossener App)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT    NOT NULL UNIQUE,
  p256dh     TEXT    NOT NULL,
  auth       TEXT    NOT NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
