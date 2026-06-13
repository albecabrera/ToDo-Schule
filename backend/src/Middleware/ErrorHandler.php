<?php

declare(strict_types=1);

namespace App\Middleware;

use App\Config\Env;
use App\Lib\HttpException;
use App\Lib\Response;
use Throwable;

/**
 * ErrorHandler
 * -----------------------------------------------------------------------------
 * Zentrales Error-Handling. Übersetzt jede Exception in eine strukturierte
 * JSON-Antwort { error, code } mit passendem HTTP-Statuscode.
 *  - HttpException -> deren Status/Code.
 *  - Alles andere  -> 500 (Details nur bei APP_DEBUG=true).
 */
final class ErrorHandler
{
    public static function register(): void
    {
        set_exception_handler([self::class, 'handle']);
    }

    public static function handle(Throwable $e): void
    {
        if ($e instanceof HttpException) {
            $body = ['error' => $e->getMessage(), 'code' => $e->errorCode];
            if ($e->details !== []) {
                $body['details'] = $e->details;
            }
            Response::json($body, $e->status);
        }

        // Unerwarteter Fehler -> protokollieren, generische 500 ausgeben.
        error_log(sprintf(
            '[ToDo-Schule] %s: %s in %s:%d',
            $e::class,
            $e->getMessage(),
            $e->getFile(),
            $e->getLine()
        ));

        $body = ['error' => 'Interner Serverfehler', 'code' => 'internal_error'];
        if (Env::bool('APP_DEBUG', false)) {
            $body['debug'] = [
                'type'    => $e::class,
                'message' => $e->getMessage(),
                'file'    => $e->getFile() . ':' . $e->getLine(),
                'trace'   => explode("\n", $e->getTraceAsString()),
            ];
        }
        Response::json($body, 500);
    }
}
