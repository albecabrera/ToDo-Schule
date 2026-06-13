<?php

declare(strict_types=1);

namespace App\Lib;

use App\Config\Env;

/**
 * WebPush
 * -----------------------------------------------------------------------------
 * Minimaler Web-Push-Versand mit VAPID (RFC 8292), ohne Payload.
 *
 * Bewusst ohne Nutzlast-Verschlüsselung (aes128gcm): die Push-Nachricht ist nur
 * ein „Anstoß". Der Service Worker zeigt daraufhin eine generische Benachrichtigung
 * bzw. holt die neuesten Daten. Das vermeidet die komplexe ECDH/HKDF-Krypto und
 * bleibt ohne externe Bibliothek wartbar.
 *
 * Schlüssel: aus der .env (VAPID_PUBLIC_KEY / VAPID_PRIVATE_PEM_B64 / VAPID_SUBJECT)
 * oder als Fallback aus storage/vapid.json (siehe bin/generate-vapid.php).
 */
final class WebPush
{
    /** @return array{publicKey:string,privateKeyPem:string,subject:string}|null */
    private static function keys(): ?array
    {
        $pub  = (string) Env::get('VAPID_PUBLIC_KEY', '');
        $pem  = (string) Env::get('VAPID_PRIVATE_PEM_B64', '');
        $subj = (string) Env::get('VAPID_SUBJECT', '');

        if ($pub !== '' && $pem !== '') {
            return [
                'publicKey'     => $pub,
                'privateKeyPem' => base64_decode($pem),
                'subject'       => $subj !== '' ? $subj : 'mailto:admin@esg-bonn.de',
            ];
        }

        $file = APP_ROOT . '/storage/vapid.json';
        if (is_file($file)) {
            $j = json_decode((string) file_get_contents($file), true);
            if (is_array($j) && !empty($j['publicKey']) && !empty($j['privateKeyPem'])) {
                return [
                    'publicKey'     => $j['publicKey'],
                    'privateKeyPem' => $j['privateKeyPem'],
                    'subject'       => $j['subject'] ?? 'mailto:admin@esg-bonn.de',
                ];
            }
        }
        return null;
    }

    public static function isConfigured(): bool
    {
        return self::keys() !== null;
    }

    public static function publicKey(): ?string
    {
        return self::keys()['publicKey'] ?? null;
    }

    private static function b64url(string $d): string
    {
        return rtrim(strtr(base64_encode($d), '+/', '-_'), '=');
    }

    /** DER-codierte ECDSA-Signatur → rohe 64-Byte r||s (für JWS ES256). */
    private static function derToRaw(string $der): string
    {
        $hex = bin2hex($der);
        $o   = 0;
        $o  += 2;                                   // SEQUENCE
        $o  += 2;                                   // seq length
        $o  += 2;                                   // INTEGER tag (r)
        $rlen = hexdec(substr($hex, $o, 2)) * 2; $o += 2;
        $r = substr($hex, $o, $rlen); $o += $rlen;
        $o  += 2;                                   // INTEGER tag (s)
        $slen = hexdec(substr($hex, $o, 2)) * 2; $o += 2;
        $s = substr($hex, $o, $slen);
        $r = str_pad(ltrim($r, '0') ?: '0', 64, '0', STR_PAD_LEFT);
        $s = str_pad(ltrim($s, '0') ?: '0', 64, '0', STR_PAD_LEFT);
        return (string) hex2bin($r . $s);
    }

    /** Erzeugt das VAPID-JWT für eine bestimmte Push-Service-Origin (aud). */
    private static function vapidJwt(string $audience, array $keys): string
    {
        $header  = self::b64url(json_encode(['typ' => 'JWT', 'alg' => 'ES256']));
        $payload = self::b64url(json_encode([
            'aud' => $audience,
            'exp' => time() + 12 * 3600,            // max. 24 h
            'sub' => $keys['subject'],
        ]));
        $input = $header . '.' . $payload;

        $pkey = openssl_pkey_get_private($keys['privateKeyPem']);
        openssl_sign($input, $der, $pkey, OPENSSL_ALGO_SHA256);

        return $input . '.' . self::b64url(self::derToRaw($der));
    }

    /**
     * Sendet einen Push-Anstoß an EINE Subscription.
     * @return int HTTP-Status der Push-Service-Antwort (0 bei Transportfehler).
     */
    public static function send(string $endpoint, int $ttl = 86400): int
    {
        $keys = self::keys();
        if ($keys === null) {
            return 0;
        }

        $parts = parse_url($endpoint);
        $audience = ($parts['scheme'] ?? 'https') . '://' . ($parts['host'] ?? '');
        $jwt = self::vapidJwt($audience, $keys);

        $ch = curl_init($endpoint);
        curl_setopt_array($ch, [
            CURLOPT_POST           => true,
            CURLOPT_POSTFIELDS     => '',
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT        => 8,
            CURLOPT_HTTPHEADER     => [
                'Authorization: vapid t=' . $jwt . ',k=' . $keys['publicKey'],
                'TTL: ' . $ttl,
                'Content-Length: 0',
            ],
        ]);
        curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        return $status;
    }
}
