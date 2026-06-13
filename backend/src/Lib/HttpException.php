<?php

declare(strict_types=1);

namespace App\Lib;

use RuntimeException;

/**
 * HttpException
 * -----------------------------------------------------------------------------
 * Trägt einen HTTP-Statuscode und einen maschinenlesbaren Fehler-Code. Wird vom
 * zentralen ErrorHandler in ein strukturiertes JSON { error, code } übersetzt.
 */
class HttpException extends RuntimeException
{
    public function __construct(
        public readonly int $status,
        string $message,
        public readonly string $errorCode = 'error',
        public readonly array $details = []
    ) {
        parent::__construct($message);
    }

    public static function badRequest(string $msg = 'Ungültige Anfrage', string $code = 'bad_request', array $details = []): self
    {
        return new self(400, $msg, $code, $details);
    }

    public static function unauthorized(string $msg = 'Nicht authentifiziert', string $code = 'unauthorized'): self
    {
        return new self(401, $msg, $code);
    }

    public static function forbidden(string $msg = 'Keine Berechtigung', string $code = 'forbidden'): self
    {
        return new self(403, $msg, $code);
    }

    public static function notFound(string $msg = 'Nicht gefunden', string $code = 'not_found'): self
    {
        return new self(404, $msg, $code);
    }

    public static function conflict(string $msg = 'Konflikt', string $code = 'conflict'): self
    {
        return new self(409, $msg, $code);
    }

    public static function unprocessable(string $msg = 'Validierung fehlgeschlagen', array $details = [], string $code = 'validation_error'): self
    {
        return new self(422, $msg, $code, $details);
    }

    public static function tooManyRequests(string $msg = 'Zu viele Anfragen', string $code = 'rate_limited'): self
    {
        return new self(429, $msg, $code);
    }
}
