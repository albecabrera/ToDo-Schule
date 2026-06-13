<?php

declare(strict_types=1);

namespace App\Controllers;

use App\Lib\HttpException;
use App\Lib\Request;
use App\Lib\Response;
use App\Models\User;

final class AvatarController
{
    private const MAX_BYTES  = 8 * 1024 * 1024;
    private const OUT_SIZE   = 256;
    private const QUALITY    = 88;
    private const ALLOWED    = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    private const AVATARS_DIR = __DIR__ . '/../../public/avatars/';

    public static function upload(Request $req): void
    {
        if (empty($_FILES['avatar']) || $_FILES['avatar']['error'] !== UPLOAD_ERR_OK) {
            $code = $_FILES['avatar']['error'] ?? -1;
            throw new HttpException(400, "Upload-Fehler (code $code).");
        }
        $file = $_FILES['avatar'];

        if ((int) $file['size'] > self::MAX_BYTES) {
            throw new HttpException(413, 'Bild zu groß (max. 8 MB).');
        }

        $mime = mime_content_type($file['tmp_name']);
        if (!in_array($mime, self::ALLOWED, true)) {
            throw new HttpException(422, 'Format nicht unterstützt. Erlaubt: JPEG, PNG, GIF, WebP.');
        }

        $src = match ($mime) {
            'image/jpeg' => imagecreatefromjpeg($file['tmp_name']),
            'image/png'  => imagecreatefrompng($file['tmp_name']),
            'image/gif'  => imagecreatefromgif($file['tmp_name']),
            'image/webp' => imagecreatefromwebp($file['tmp_name']),
        };

        if ($src === false) {
            throw new HttpException(422, 'Bild konnte nicht geladen werden.');
        }

        // Fix EXIF orientation for JPEG
        if ($mime === 'image/jpeg') {
            $exif        = @exif_read_data($file['tmp_name']);
            $orientation = (int) ($exif['Orientation'] ?? 1);
            $src         = self::fixOrientation($src, $orientation);
        }

        $w       = imagesx($src);
        $h       = imagesy($src);
        $minSide = min($w, $h);
        $cropX   = (int) (($w - $minSide) / 2);
        $cropY   = (int) (($h - $minSide) / 2);

        $out   = imagecreatetruecolor(self::OUT_SIZE, self::OUT_SIZE);
        $white = imagecolorallocate($out, 255, 255, 255);
        imagefill($out, 0, 0, $white);
        imagecopyresampled($out, $src, 0, 0, $cropX, $cropY, self::OUT_SIZE, self::OUT_SIZE, $minSide, $minSide);
        unset($src);

        $userId  = $req->userId();
        $dir     = self::AVATARS_DIR;
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        $dest = $dir . $userId . '.jpg';
        imagejpeg($out, $dest, self::QUALITY);
        unset($out);

        $avatarPath = '/avatars/' . $userId . '.jpg';
        $user       = User::update($userId, ['avatar_url' => $avatarPath]);

        Response::json(['user' => $user, 'avatarUrl' => $avatarPath]);
    }

    private static function fixOrientation(\GdImage $img, int $orientation): \GdImage
    {
        return match ($orientation) {
            3 => imagerotate($img, 180, 0),
            6 => imagerotate($img, -90, 0),
            8 => imagerotate($img, 90, 0),
            default => $img,
        };
    }
}
