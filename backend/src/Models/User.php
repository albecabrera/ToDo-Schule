<?php

declare(strict_types=1);

namespace App\Models;

/**
 * User
 * -----------------------------------------------------------------------------
 * Benutzerverwaltung + Passwort-Hashing (bcrypt via password_hash).
 */
final class User extends Model
{
    /** Öffentliche Felder (ohne password_hash). */
    private const PUBLIC_COLS = 'id, email, abbreviation, must_change_password, is_admin, name, avatar_url, last_seen_at, created_at, updated_at';

    /** Aktualisiert „zuletzt gesehen" — gedrosselt (höchstens minütlich). */
    public static function touchLastSeen(int $id): void
    {
        self::db()->prepare(
            "UPDATE users SET last_seen_at = datetime('now')
             WHERE id = :id AND (last_seen_at IS NULL OR last_seen_at < datetime('now','-60 seconds'))"
        )->execute([':id' => $id]);
    }

    public static function create(string $email, string $password, ?string $name = null): array
    {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        $stmt = self::db()->prepare(
            'INSERT INTO users (email, password_hash, name) VALUES (:e, :p, :n)'
        );
        $stmt->execute([':e' => strtolower($email), ':p' => $hash, ':n' => $name]);
        return self::find((int) self::db()->lastInsertId());
    }

    /** Alle Nutzer, die mindestens ein gemeinsames Team mit $userId haben (inkl. sich selbst). */
    public static function colleagues(int $userId): array
    {
        // Das gesamte Kollegium: jede Lehrkraft kann jeder anderen schreiben
        // und alle einander zuweisen. Der eigene Account wird mitgeliefert
        // (das Frontend filtert ihn für die Direktnachrichten selbst heraus).
        $stmt = self::db()->prepare(
            'SELECT ' . self::PUBLIC_COLS . '
             FROM users u
             ORDER BY u.name ASC'
        );
        $stmt->execute();
        return $stmt->fetchAll();
    }

    public static function find(int $id): ?array
    {
        $stmt = self::db()->prepare('SELECT ' . self::PUBLIC_COLS . ' FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        return $stmt->fetch() ?: null;
    }

    public static function findByEmail(string $email): ?array
    {
        $stmt = self::db()->prepare('SELECT * FROM users WHERE email = :e');
        $stmt->execute([':e' => strtolower($email)]);
        return $stmt->fetch() ?: null;
    }

    public static function emailExists(string $email): bool
    {
        $stmt = self::db()->prepare('SELECT 1 FROM users WHERE email = :e');
        $stmt->execute([':e' => strtolower($email)]);
        return (bool) $stmt->fetchColumn();
    }

    /** Lehrer-Login: Nutzer über das Kürzel finden (z. B. 'ca' für Cabrera). */
    public static function findByAbbreviation(string $abbr): ?array
    {
        $stmt = self::db()->prepare('SELECT * FROM users WHERE abbreviation = :a');
        $stmt->execute([':a' => strtolower(trim($abbr))]);
        return $stmt->fetch() ?: null;
    }

    public static function verifyPassword(array $user, string $password): bool
    {
        return password_verify($password, $user['password_hash'] ?? '');
    }

    /** Neues Passwort setzen; hebt den Erstpasswort-Zwang auf. */
    public static function updatePassword(int $id, string $password): void
    {
        self::db()->prepare(
            'UPDATE users SET password_hash = :p, must_change_password = 0 WHERE id = :id'
        )->execute([':p' => password_hash($password, PASSWORD_BCRYPT), ':id' => $id]);
    }

    /** Liefert (und erzeugt bei Bedarf) das iCal-Abo-Token eines Nutzers. */
    public static function icsToken(int $id): string
    {
        $stmt = self::db()->prepare('SELECT ics_token FROM users WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $tok = (string) ($stmt->fetchColumn() ?: '');
        if ($tok === '') {
            $tok = bin2hex(random_bytes(20));
            self::db()->prepare('UPDATE users SET ics_token = :t WHERE id = :id')
                ->execute([':t' => $tok, ':id' => $id]);
        }
        return $tok;
    }

    public static function findByIcsToken(string $token): ?array
    {
        if ($token === '') {
            return null;
        }
        $stmt = self::db()->prepare('SELECT id, name FROM users WHERE ics_token = :t');
        $stmt->execute([':t' => $token]);
        $row = $stmt->fetch();
        return $row ?: null;
    }

    /** Setzt das Passwort zurück und erzwingt einen Wechsel beim nächsten Login. */
    public static function resetToTemporary(int $id, string $password): void
    {
        self::db()->prepare(
            'UPDATE users SET password_hash = :p, must_change_password = 1 WHERE id = :id'
        )->execute([':p' => password_hash($password, PASSWORD_BCRYPT), ':id' => $id]);
    }

    public static function update(int $id, array $fields): array
    {
        $allowed = ['name', 'avatar_url'];
        $set = [];
        $params = [':id' => $id];
        foreach ($allowed as $col) {
            if (array_key_exists($col, $fields)) {
                $set[] = "$col = :$col";
                $params[":$col"] = $fields[$col];
            }
        }
        if ($set !== []) {
            $sql = 'UPDATE users SET ' . implode(', ', $set) . ' WHERE id = :id';
            self::db()->prepare($sql)->execute($params);
        }
        return self::find($id);
    }

    /** Admin: alle Felder eines Nutzers aktualisieren (Name, E-Mail, Kürzel, Admin-Flag). */
    public static function adminUpdate(int $id, array $fields): array
    {
        $allowed = ['name', 'email', 'abbreviation', 'is_admin'];
        $set = [];
        $params = [':id' => $id];
        foreach ($allowed as $col) {
            if (array_key_exists($col, $fields)) {
                $set[] = "$col = :$col";
                $params[":$col"] = $col === 'is_admin' ? (int) $fields[$col] : $fields[$col];
            }
        }
        if ($set !== []) {
            self::db()->prepare('UPDATE users SET ' . implode(', ', $set) . ' WHERE id = :id')
                ->execute($params);
        }
        return self::find($id);
    }

    /** Admin: neuen Nutzer anlegen (mit Kürzel + Admin-Flag). */
    public static function adminCreate(string $email, string $password, ?string $name, ?string $abbreviation, bool $isAdmin = false): array
    {
        $hash = password_hash($password, PASSWORD_BCRYPT);
        self::db()->prepare(
            'INSERT INTO users (email, password_hash, name, abbreviation, is_admin, must_change_password)
             VALUES (:e, :p, :n, :a, :admin, 1)'
        )->execute([
            ':e'     => strtolower(trim($email)),
            ':p'     => $hash,
            ':n'     => $name,
            ':a'     => $abbreviation ? strtolower(trim($abbreviation)) : null,
            ':admin' => (int) $isAdmin,
        ]);
        return self::find((int) self::db()->lastInsertId());
    }

    /** Admin: Nutzer löschen (kaskadierend). */
    public static function adminDelete(int $id): void
    {
        self::db()->prepare('DELETE FROM users WHERE id = :id')->execute([':id' => $id]);
    }

    /** Alle Nutzer (für Admin-Panel). */
    public static function all(): array
    {
        $stmt = self::db()->prepare(
            'SELECT ' . self::PUBLIC_COLS . ' FROM users ORDER BY name ASC'
        );
        $stmt->execute();
        return $stmt->fetchAll();
    }

    /** Mehrere Nutzer anhand ihrer IDs laden (für Zuweisungen/Mitglieder). */
    public static function findMany(array $ids): array
    {
        $ids = array_values(array_unique(array_map('intval', $ids)));
        if ($ids === []) {
            return [];
        }
        $in = implode(',', array_fill(0, count($ids), '?'));
        $stmt = self::db()->prepare('SELECT ' . self::PUBLIC_COLS . " FROM users WHERE id IN ($in)");
        $stmt->execute($ids);
        return $stmt->fetchAll();
    }
}
