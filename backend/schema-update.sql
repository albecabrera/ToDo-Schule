-- =============================================================================
--  ToDo-Schule — Migration: Premium Features
--  Ejecutar: mysql -u root -p todo_schule < schema-update.sql
-- =============================================================================

-- remind_at en tareas
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS remind_at DATETIME NULL AFTER due_date;

-- color e icon en teams (para el picker en la UI)
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS color VARCHAR(16) NOT NULL DEFAULT '#6178FE' AFTER name,
  ADD COLUMN IF NOT EXISTS icon  VARCHAR(8)  NOT NULL DEFAULT '📁'    AFTER color;

-- Adjuntos (tasks y notes)
CREATE TABLE IF NOT EXISTS attachments (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  task_id       BIGINT UNSIGNED NULL,
  note_id       BIGINT UNSIGNED NULL,
  filename      VARCHAR(255)    NOT NULL,
  original_name VARCHAR(255)    NOT NULL,
  mime_type     VARCHAR(120)    NOT NULL DEFAULT 'application/octet-stream',
  size          INT UNSIGNED    NOT NULL DEFAULT 0,
  uploaded_by   BIGINT UNSIGNED NOT NULL,
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_att_task (task_id),
  KEY idx_att_note (note_id),
  CONSTRAINT fk_att_task FOREIGN KEY (task_id)     REFERENCES tasks  (id) ON DELETE CASCADE,
  CONSTRAINT fk_att_note FOREIGN KEY (note_id)     REFERENCES notes  (id) ON DELETE CASCADE,
  CONSTRAINT fk_att_user FOREIGN KEY (uploaded_by) REFERENCES users  (id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Subtasks y tags en tareas (JSON arrays)
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS subtasks TEXT NULL AFTER remind_at,
  ADD COLUMN IF NOT EXISTS tags     TEXT NULL AFTER subtasks;

-- Notificaciones persistentes
CREATE TABLE IF NOT EXISTS notifications (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id    BIGINT UNSIGNED NOT NULL,
  type       VARCHAR(40)     NOT NULL,
  actor_id   BIGINT UNSIGNED NULL,
  task_id    BIGINT UNSIGNED NULL,
  text       TEXT            NOT NULL,
  is_read    TINYINT(1)      NOT NULL DEFAULT 0,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_notif_user (user_id),
  KEY idx_notif_unread (user_id, is_read),
  CONSTRAINT fk_notif_user  FOREIGN KEY (user_id)  REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_notif_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_notif_task  FOREIGN KEY (task_id)  REFERENCES tasks (id) ON DELETE CASCADE
) ENGINE=InnoDB;
ALTER TABLE users ADD COLUMN is_admin INTEGER NOT NULL DEFAULT 0;
