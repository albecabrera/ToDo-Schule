<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\Request;
use App\Lib\Response;
use App\Models\Task;
use App\Models\User;

/**
 * CalendarController
 * -----------------------------------------------------------------------------
 * Exportiert die Aufgaben mit Fälligkeit als iCalendar (.ics). Abonnierbar in
 * Google Calendar / Outlook über eine tokenisierte URL (kein Login nötig, das
 * Token IST die Berechtigung).
 */
final class CalendarController
{
    /** GET /api/calendar/token  (auth) → Abo-Token + URL-Pfad. */
    public static function token(Request $req): void
    {
        $token = User::icsToken($req->userId());
        Response::json([
            'token' => $token,
            'path'  => '/api/calendar.ics?token=' . $token,
        ]);
    }

    /** GET /api/calendar.ics?token=…  (kein Auth) → text/calendar. */
    public static function ics(Request $req): void
    {
        $token = (string) ($req->query['token'] ?? '');
        $user  = User::findByIcsToken($token);
        if ($user === null) {
            http_response_code(404);
            header('Content-Type: text/plain; charset=utf-8');
            echo 'Kalender nicht gefunden.';
            return;
        }

        $tasks = array_filter(
            Task::allForUser((int) $user['id']),
            static fn ($t) => !empty($t['due_date'])
        );

        $lines = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//ToDo-Schule//ESG Bonn//DE',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            'X-WR-CALNAME:ToDo-Schule',
            'X-WR-TIMEZONE:Europe/Berlin',
        ];
        $stamp = gmdate('Ymd\THis\Z');
        foreach ($tasks as $t) {
            $date = preg_replace('/[^0-9]/', '', substr((string) $t['due_date'], 0, 10)); // YYYYMMDD
            if (strlen($date) !== 8) {
                continue;
            }
            $status = ($t['status'] ?? '') === 'done' ? 'COMPLETED' : 'CONFIRMED';
            $lines[] = 'BEGIN:VEVENT';
            $lines[] = 'UID:task-' . (int) $t['id'] . '@todo-schule';
            $lines[] = 'DTSTAMP:' . $stamp;
            $lines[] = 'DTSTART;VALUE=DATE:' . $date;
            $lines[] = 'SUMMARY:' . self::esc((string) $t['title']);
            if (!empty($t['description'])) {
                $lines[] = 'DESCRIPTION:' . self::esc((string) $t['description']);
            }
            $lines[] = 'STATUS:' . $status;
            $lines[] = 'END:VEVENT';
        }
        $lines[] = 'END:VCALENDAR';

        header('Content-Type: text/calendar; charset=utf-8');
        header('Content-Disposition: inline; filename="todo-schule.ics"');
        echo implode("\r\n", $lines) . "\r\n";
    }

    private static function esc(string $s): string
    {
        return str_replace(["\\", "\n", ",", ";"], ["\\\\", "\\n", "\\,", "\\;"], $s);
    }
}
