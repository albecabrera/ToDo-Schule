<?php

declare(strict_types=1);

namespace App\Lib;

/**
 * Response
 * -----------------------------------------------------------------------------
 * Kleiner JSON-Response-Helfer. Setzt Content-Type, Statuscode und beendet die
 * Anfrage. Einheitliches Format für Erfolg und Fehler.
 */
final class Response
{
    public static function json(mixed $data, int $status = 200): never
    {
        http_response_code($status);
        if (!headers_sent()) {
            header('Content-Type: application/json; charset=utf-8');
        }
        echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function noContent(): never
    {
        http_response_code(204);
        exit;
    }

    /** Strukturierte Fehlerantwort: { error, code, details? }. */
    public static function error(int $status, string $message, string $code = 'error', array $details = []): never
    {
        $body = ['error' => $message, 'code' => $code];
        if ($details !== []) {
            $body['details'] = $details;
        }
        self::json($body, $status);
    }
}
