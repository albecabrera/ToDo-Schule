<?php

declare(strict_types=1);

namespace App\Lib;

/**
 * Jwt
 * -----------------------------------------------------------------------------
 * Eigenständige, abhängigkeitsfreie JWT-Implementierung (HS256). Verwendet für
 * Access- und Refresh-Token. Kein firebase/php-jwt nötig.
 */
final class Jwt
{
    /**
     * Erzeugt ein signiertes JWT.
     *
     * @param array  $claims  Nutzdaten (z. B. ['sub' => 5])
     * @param string $secret  HMAC-Secret
     * @param int    $ttl     Gültigkeit in Sekunden
     * @param string $type    'access' | 'refresh'
     */
    public static function encode(array $claims, string $secret, int $ttl, string $type = 'access', string $issuer = 'todo-schule'): string
    {
        $now = time();
        $header  = ['alg' => 'HS256', 'typ' => 'JWT'];
        $payload = array_merge($claims, [
            'iss'  => $issuer,
            'iat'  => $now,
            'exp'  => $now + $ttl,
            'type' => $type,
            'jti'  => bin2hex(random_bytes(8)),
        ]);

        $segments = [
            self::b64UrlEncode(json_encode($header, JSON_UNESCAPED_SLASHES)),
            self::b64UrlEncode(json_encode($payload, JSON_UNESCAPED_SLASHES)),
        ];
        $signature = hash_hmac('sha256', implode('.', $segments), $secret, true);
        $segments[] = self::b64UrlEncode($signature);

        return implode('.', $segments);
    }

    /**
     * Verifiziert Signatur + Ablauf und liefert die Payload zurück.
     * @throws HttpException 401 bei ungültigem/abgelaufenem Token.
     */
    public static function decode(string $jwt, string $secret, ?string $expectedType = null): array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            throw HttpException::unauthorized('Token fehlerhaft', 'invalid_token');
        }
        [$h, $p, $s] = $parts;

        $expectedSig = self::b64UrlEncode(hash_hmac('sha256', "$h.$p", $secret, true));
        if (!hash_equals($expectedSig, $s)) {
            throw HttpException::unauthorized('Token-Signatur ungültig', 'invalid_token');
        }

        $payload = json_decode(self::b64UrlDecode($p), true);
        if (!is_array($payload)) {
            throw HttpException::unauthorized('Token-Payload ungültig', 'invalid_token');
        }
        if (isset($payload['exp']) && time() >= (int) $payload['exp']) {
            throw HttpException::unauthorized('Token abgelaufen', 'token_expired');
        }
        if ($expectedType !== null && ($payload['type'] ?? null) !== $expectedType) {
            throw HttpException::unauthorized('Falscher Token-Typ', 'invalid_token');
        }

        return $payload;
    }

    private static function b64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }

    private static function b64UrlDecode(string $data): string
    {
        $pad = strlen($data) % 4;
        if ($pad) {
            $data .= str_repeat('=', 4 - $pad);
        }
        return base64_decode(strtr($data, '-_', '+/')) ?: '';
    }
}
