<?php

declare(strict_types=1);

/**
 * bin/generate-vapid.php
 * -----------------------------------------------------------------------------
 * Erzeugt ein VAPID-Schlüsselpaar (P-256) für Web-Push-Benachrichtigungen.
 *
 *   php bin/generate-vapid.php
 *
 * Schreibt storage/vapid.json (vom Server gelesen) und zeigt die Werte für die
 * .env an. Der öffentliche Schlüssel wird im Frontend als applicationServerKey
 * gebraucht (liefert das Backend über GET /api/push/public-key aus).
 */

require dirname(__DIR__) . '/src/bootstrap.php';

$b64url = static fn (string $d): string => rtrim(strtr(base64_encode($d), '+/', '-_'), '=');

$res = openssl_pkey_new([
    'private_key_type' => OPENSSL_KEYTYPE_EC,
    'curve_name'       => 'prime256v1',
]);
if ($res === false) {
    fwrite(STDERR, "Schlüsselerzeugung fehlgeschlagen: " . openssl_error_string() . "\n");
    exit(1);
}

$details = openssl_pkey_get_details($res);
$x       = str_pad($details['ec']['x'], 32, "\0", STR_PAD_LEFT);
$y       = str_pad($details['ec']['y'], 32, "\0", STR_PAD_LEFT);
$publicKey = $b64url("\x04" . $x . $y);          // 65-Byte unkomprimierter Punkt

openssl_pkey_export($res, $privatePem);          // PKCS#8 PEM

$subject = 'mailto:admin@esg-bonn.de';

$data = [
    'publicKey'     => $publicKey,
    'privateKeyPem' => $privatePem,
    'subject'       => $subject,
];

$dir = APP_ROOT . '/storage';
if (!is_dir($dir)) {
    mkdir($dir, 0755, true);
}
file_put_contents($dir . '/vapid.json', json_encode($data, JSON_PRETTY_PRINT));
@chmod($dir . '/vapid.json', 0600);

echo "✓ VAPID-Schlüssel erzeugt → storage/vapid.json\n\n";
echo "Öffentlicher Schlüssel (applicationServerKey):\n  $publicKey\n\n";
echo "Optional in der .env (überschreibt storage/vapid.json):\n";
echo "  VAPID_SUBJECT=$subject\n";
echo "  VAPID_PUBLIC_KEY=$publicKey\n";
echo "  VAPID_PRIVATE_PEM_B64=" . base64_encode($privatePem) . "\n";
