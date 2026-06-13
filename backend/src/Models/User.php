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
    private const PUBLIC_COLS = 'id, email, abbreviation, must_change_password, name, avatar_url, created_at, updated_at';

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
        $stmt = self::db()->prepare(
            'SELECT DISTINCT ' . self::PUBLIC_COLS . '
             FROM users u
             WHERE u.id = :me
                OR u.id IN (
                    SELECT tm2.user_id
                    FROM team_members tm1
                    JOIN team_members tm2 ON tm2.team_id = tm1.team_id
                    WHERE tm1.user_id = :me2 AND tm2.user_id <> :me3
                )
             ORDER BY u.name ASC'
        );
        $stmt->execute([':me' => $userId, ':me2' => $userId, ':me3' => $userId]);
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
