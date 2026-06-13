<?php

declare(strict_types=1);

namespace App\Models;

/**
 * Team
 * -----------------------------------------------------------------------------
 * Teams, Mitgliedschaften und E-Mail-Einladungen.
 */
final class Team extends Model
{
    public static function create(string $name, int $ownerId, string $color = '#6178FE', string $icon = '📁'): array
    {
        $pdo = self::db();
        $pdo->prepare('INSERT INTO teams (name, color, icon, owner_id) VALUES (:n, :c, :i, :o)')
            ->execute([':n' => $name, ':c' => $color, ':i' => $icon, ':o' => $ownerId]);
        $id = (int) $pdo->lastInsertId();

        // Eigentümer als Mitglied (Rolle owner) eintragen.
        $pdo->prepare('INSERT INTO team_members (team_id, user_id, role) VALUES (:t, :u, "owner")')
            ->execute([':t' => $id, ':u' => $ownerId]);

        return self::find($id);
    }

    public static function find(int $id): ?array
    {
        $stmt = self::db()->prepare('SELECT * FROM teams WHERE id = :id');
        $stmt->execute([':id' => $id]);
        $team = $stmt->fetch();
        if (!$team) {
            return null;
        }
        $team['members'] = self::members($id);
        return $team;
    }

    /** @return array<int,array> Mitglieder inkl. Rolle. */
    public static function members(int $teamId): array
    {
        $stmt = self::db()->prepare(
            'SELECT u.id, u.email, u.name, u.avatar_url, tm.role, tm.joined_at
             FROM team_members tm
             JOIN users u ON u.id = tm.user_id
             WHERE tm.team_id = :t
             ORDER BY tm.joined_at ASC'
        );
        $stmt->execute([':t' => $teamId]);
        return $stmt->fetchAll();
    }

    /** Alle Teams eines Nutzers (inkl. Mitglieder-IDs). */
    public static function allForUser(int $userId): array
    {
        $ids = self::idsForUser($userId);
        if (empty($ids)) {
            return [];
        }
        $placeholders = implode(',', array_fill(0, count($ids), '?'));
        $stmt = self::db()->prepare(
            "SELECT * FROM teams WHERE id IN ($placeholders) ORDER BY id ASC"
        );
        $stmt->execute($ids);
        $teams = $stmt->fetchAll();
        foreach ($teams as &$t) {
            $t['members'] = array_map('intval', array_column(self::members((int)$t['id']), 'id'));
        }
        return $teams;
    }

    /** @return int[] Team-IDs, in denen der Nutzer Mitglied ist. */
    public static function idsForUser(int $userId): array
    {
        $stmt = self::db()->prepare('SELECT team_id FROM team_members WHERE user_id = :u');
        $stmt->execute([':u' => $userId]);
        return array_map('intval', $stmt->fetchAll(\PDO::FETCH_COLUMN));
    }

    public static function isMember(int $teamId, int $userId): bool
    {
        $stmt = self::db()->prepare('SELECT 1 FROM team_members WHERE team_id = :t AND user_id = :u');
        $stmt->execute([':t' => $teamId, ':u' => $userId]);
        return (bool) $stmt->fetchColumn();
    }

    public static function update(int $id, array $data): array
    {
        $set    = [];
        $params = [':id' => $id];
        if (array_key_exists('name', $data))  { $set[] = 'name = :name';   $params[':name']  = $data['name']; }
        if (array_key_exists('color', $data)) { $set[] = 'color = :color'; $params[':color'] = $data['color']; }
        if (array_key_exists('icon', $data))  { $set[] = 'icon = :icon';   $params[':icon']  = $data['icon']; }
        if ($set !== []) {
            self::db()->prepare('UPDATE teams SET ' . implode(', ', $set) . ' WHERE id = :id')->execute($params);
        }
        return self::find($id);
    }

    /** Löscht das Team; Aufgaben/Notizen behalten team_id=NULL (FK SET NULL). */
    public static function delete(int $id): void
    {
        self::db()->prepare('DELETE FROM teams WHERE id = :id')->execute([':id' => $id]);
    }

    public static function addMember(int $teamId, int $userId, string $role = 'member'): void
    {
        self::db()->prepare(
            'INSERT OR IGNORE INTO team_members (team_id, user_id, role) VALUES (:t, :u, :r)'
        )->execute([':t' => $teamId, ':u' => $userId, ':r' => $role]);
    }

    // --- Einladungen ----------------------------------------------------------

    public static function createInvite(int $teamId, string $email, int $invitedBy, ?string $expiresAt = null): array
    {
        $token = self::randomToken(18);
        self::db()->prepare(
            'INSERT INTO team_invites (team_id, email, token, invited_by, expires_at)
             VALUES (:t, :e, :tok, :by, :exp)'
        )->execute([
            ':t' => $teamId, ':e' => strtolower($email), ':tok' => $token,
            ':by' => $invitedBy, ':exp' => $expiresAt,
        ]);

        // Falls der Eingeladene bereits ein Konto hat, direkt als Mitglied verknüpfen.
        $existing = User::findByEmail($email);
        if ($existing) {
            self::addMember($teamId, (int) $existing['id']);
        }

        return [
            'token'   => $token,
            'email'   => strtolower($email),
            'teamId'  => $teamId,
            'matched' => (bool) $existing,
        ];
    }
}
