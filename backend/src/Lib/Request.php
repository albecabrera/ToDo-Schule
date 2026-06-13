<?php

declare(strict_types=1);

namespace App\Lib;

/**
 * Request
 * -----------------------------------------------------------------------------
 * Kapselt die eingehende HTTP-Anfrage: Methode, Pfad, JSON-Body, Route-Parameter
 * und der vom AuthMiddleware angehängte Nutzer.
 */
final class Request
{
    public string $method;
    public string $path;
    /** @var array<string,mixed> Geparster JSON-Body */
    public array $body = [];
    /** @var array<string,string> Route-Parameter, z. B. ['id' => '7'] */
    public array $params = [];
    /** @var array<string,string> Query-Parameter */
    public array $query = [];
    /** @var array<string,mixed>|null Authentifizierter Nutzer (id, email, name) */
    public ?array $user = null;

    public static function capture(): self
    {
        $req = new self();
        $req->method = strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');

        $uri  = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        $req->path = '/' . trim($path, '/');

        parse_str($_SERVER['QUERY_STRING'] ?? '', $req->query);

        // Multipart-Uploads: php://input enthält keinen JSON-Body
        $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? '');
        $raw = str_contains($contentType, 'multipart/form-data')
            ? ''
            : (file_get_contents('php://input') ?: '');

        if ($raw !== '') {
            $decoded = json_decode($raw, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $req->body = $decoded;
            } elseif (json_last_error() !== JSON_ERROR_NONE) {
                throw HttpException::badRequest('Ungültiges JSON im Request-Body', 'invalid_json');
            }
        }

        return $req;
    }

    public function userId(): int
    {
        if ($this->user === null) {
            throw HttpException::unauthorized();
        }
        return (int) $this->user['id'];
    }

    public function param(string $key): string
    {
        return $this->params[$key] ?? '';
    }

    public function input(string $key, mixed $default = null): mixed
    {
        return $this->body[$key] ?? $default;
    }

    public function bearerToken(): ?string
    {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if ($header === '' && function_exists('apache_request_headers')) {
            $headers = apache_request_headers();
            $header  = $headers['Authorization'] ?? $headers['authorization'] ?? '';
        }
        if (preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
            return trim($m[1]);
        }
        return null;
    }
}
