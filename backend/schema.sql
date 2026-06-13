-- =============================================================================
--  ToDo-Schule — Datenbankschema (MySQL / MariaDB)
-- -----------------------------------------------------------------------------
--  Vollständiges Schema für die Kollaborations-ToDo-PWA.
--  Ausführen mit:  mysql -u root -p < schema.sql
--  (Die Datenbank wird hier angelegt; Namen ggf. an .env anpassen.)
-- =============================================================================

CREATE DATABASE IF NOT EXISTS todo_schule
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE todo_schule;

-- -----------------------------------------------------------------------------
--  Benutzer
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                   BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  email                VARCHAR(255)    NOT NULL,
  abbreviation         VARCHAR(8)      NULL,      -- Lehrerkürzel, z. B. 'ca' für Cabrera
  password_hash        VARCHAR(255)    NOT NULL,
  must_change_password TINYINT(1)      NOT NULL DEFAULT 0,  -- 1 nach Seed: Erstpasswort = Nachname
  name                 VARCHAR(120)    NULL,
  avatar_url           VARCHAR(512)    NULL,
  created_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_abbr (abbreviation)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Refresh-Token (Rotation + Invalidierung beim Logout)
--  Es wird NUR der SHA-256-Hash des Tokens gespeichert, nie das Token selbst.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  CHAR(64)        NOT NULL,
  expires_at  DATETIME        NOT NULL,
  revoked     TINYINT(1)      NOT NULL DEFAULT 0,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refresh_hash (token_hash),
  KEY idx_refresh_user (user_id),
  CONSTRAINT fk_refresh_user FOREIGN KEY (user_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Teams
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teams (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  name       VARCHAR(160)    NOT NULL,
  owner_id   BIGINT UNSIGNED NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_teams_owner (owner_id),
  CONSTRAINT fk_teams_owner FOREIGN KEY (owner_id)
    REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Team-Mitglieder (n:m users <-> teams)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_members (
  team_id   BIGINT UNSIGNED NOT NULL,
  user_id   BIGINT UNSIGNED NOT NULL,
  role      ENUM('owner','admin','member') NOT NULL DEFAULT 'member',
  joined_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (team_id, user_id),
  KEY idx_tm_user (user_id),
  CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Team-Einladungen (per E-Mail)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS team_invites (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  team_id    BIGINT UNSIGNED NOT NULL,
  email      VARCHAR(255)    NOT NULL,
  token      CHAR(48)        NOT NULL,
  status     ENUM('pending','accepted','revoked') NOT NULL DEFAULT 'pending',
  invited_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME        NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_invite_token (token),
  KEY idx_invite_team (team_id),
  CONSTRAINT fk_invite_team FOREIGN KEY (team_id) REFERENCES teams (id) ON DELETE CASCADE,
  CONSTRAINT fk_invite_by   FOREIGN KEY (invited_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Aufgaben
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  title       VARCHAR(255)    NOT NULL,
  description TEXT            NULL,
  status      ENUM('todo','in_progress','done') NOT NULL DEFAULT 'todo',
  priority    ENUM('low','medium','high')       NOT NULL DEFAULT 'medium',
  due_date    DATETIME        NULL,
  team_id     BIGINT UNSIGNED NULL,
  created_by  BIGINT UNSIGNED NOT NULL,
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_tasks_team (team_id),
  KEY idx_tasks_creator (created_by),
  KEY idx_tasks_status (status),
  CONSTRAINT fk_tasks_team    FOREIGN KEY (team_id)    REFERENCES teams (id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Aufgaben-Zuweisungen (n:m tasks <-> users)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS task_assignees (
  task_id     BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  assigned_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (task_id, user_id),
  KEY idx_ta_user (user_id),
  CONSTRAINT fk_ta_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_ta_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Kommentare / Notizen
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS comments (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id    BIGINT UNSIGNED NOT NULL,
  user_id    BIGINT UNSIGNED NOT NULL,
  content    TEXT            NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_comments_task (task_id),
  CONSTRAINT fk_comments_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_comments_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Share-Links (öffentlicher Zugriff per Token)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS share_links (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id    BIGINT UNSIGNED NOT NULL,
  token      CHAR(48)        NOT NULL,
  permission ENUM('view','edit') NOT NULL DEFAULT 'view',
  expires_at DATETIME        NULL,
  active     TINYINT(1)      NOT NULL DEFAULT 1,
  created_by BIGINT UNSIGNED NOT NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_share_token (token),
  KEY idx_share_task (task_id),
  CONSTRAINT fk_share_task FOREIGN KEY (task_id)    REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_share_by   FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Notizen & Planungen — ohne team_id privat, mit team_id im Team geteilt.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id         BIGINT UNSIGNED        NOT NULL AUTO_INCREMENT,
  title      VARCHAR(255)           NOT NULL,
  content    MEDIUMTEXT             NULL,
  kind       ENUM('note','plan')    NOT NULL DEFAULT 'note',
  team_id    BIGINT UNSIGNED        NULL,
  created_by BIGINT UNSIGNED        NOT NULL,
  created_at DATETIME               NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME               NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notes_team (team_id),
  KEY idx_notes_creator (created_by),
  KEY idx_notes_updated (updated_at),
  CONSTRAINT fk_notes_creator FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notes_team    FOREIGN KEY (team_id)    REFERENCES teams (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Audit-Log (jede relevante Änderung an einer Aufgabe)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id    BIGINT UNSIGNED NULL,
  user_id    BIGINT UNSIGNED NULL,
  action     VARCHAR(60)     NOT NULL,
  changes    JSON            NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_audit_task (task_id),
  KEY idx_audit_created (created_at),
  CONSTRAINT fk_audit_task FOREIGN KEY (task_id) REFERENCES tasks (id) ON DELETE CASCADE,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Realtime-Events — Brücke zwischen REST (PHP-FPM) und WebSocket-Server (CLI).
--  REST-Controller schreiben hier hinein; der WebSocket-Server pollt die Tabelle
--  und broadcastet neue Zeilen an die passenden Rooms (user:<id> / team:<id>).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  channel    VARCHAR(64)     NOT NULL,          -- z. B. 'user:5' oder 'team:2'
  event      VARCHAR(60)     NOT NULL,          -- z. B. 'task:created'
  payload    JSON            NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_events_channel (channel),
  KEY idx_events_id (id)
) ENGINE=InnoDB;

-- -----------------------------------------------------------------------------
--  Rate-Limiting (optionaler DB-Backend; Default ist dateibasiert).
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket_key  VARCHAR(160) NOT NULL,
  hits        INT UNSIGNED NOT NULL DEFAULT 0,
  window_start DATETIME    NOT NULL,
  PRIMARY KEY (bucket_key)
) ENGINE=InnoDB;
