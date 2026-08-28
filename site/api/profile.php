<?php
/* The administrator's own card: how they are named across the panel, how
   to reach them, and the photograph the top bar and the assistant use.

   Photographs live under the private data folder and are only ever handed
   out to a signed-in session, so a portrait is no more public than the
   customer list beside it. */
require __DIR__ . '/_boot.php';
$me = require_login();
$action = $_GET['a'] ?? 'get';

const AVATAR_MAX = 700000;                 // ~700 KB of decoded JPEG is plenty

if ($action === 'get') {
    $who = (string) ($_GET['u'] ?? $me);
    if (!user_find($who)) fail('کاربر پیدا نشد.', 404);
    json_out(['ok' => true, 'profile' => profile_of($who), 'me' => mb_strtolower($who) === mb_strtolower($me)]);
}

if ($action === 'avatar') {
    $who = (string) ($_GET['u'] ?? $me);
    $p = AVATARS . '/' . avatar_key($who) . '.jpg';
    if (!is_file($p)) { http_response_code(404); exit; }
    header('Content-Type: image/jpeg');
    header('Content-Length: ' . filesize($p));
    header('Cache-Control: private, max-age=60');
    readfile($p);
    exit;
}

csrf_check();
$in = body();

if ($action === 'save') {
    $name = trim((string) ($in['name'] ?? ''));
    if ($name === '') fail('نام نمایشی را وارد کنید.');
    if (mb_strlen($name) > 40) fail('نام نمایشی طولانی است.');
    $fields = [
        'name'  => $name,
        'title' => mb_substr(trim((string) ($in['title'] ?? '')), 0, 40),
        'phone' => only_digits((string) ($in['phone'] ?? '')),
        'email' => mb_substr(trim((string) ($in['email'] ?? '')), 0, 80),
        'note'  => mb_substr(trim((string) ($in['note'] ?? '')), 0, 200),
    ];
    Store::update('profiles', function ($all) use ($me, $fields) {
        $all[mb_strtolower($me)] = $fields;
        return $all;
    }, []);
    // the name shown beside a filed invoice comes from the account record
    Store::update('users', function ($l) use ($me, $fields) {
        foreach ($l as &$x) if (mb_strtolower($x['u']) === mb_strtolower($me)) $x['name'] = $fields['name'];
        return $l;
    });
    json_out(['ok' => true, 'profile' => profile_of($me)]);
}

if ($action === 'photo') {
    $data = (string) ($in['photo'] ?? '');
    if (!preg_match('~^data:image/(jpeg|png|webp);base64,~', $data)) {
        fail('فرمت تصویر پشتیبانی نمی‌شود. یک عکس JPG یا PNG انتخاب کنید.');
    }
    $bin = base64_decode(substr($data, strpos($data, ',') + 1) ?: '', true);
    if ($bin === false || $bin === '') fail('تصویر خوانده نشد.');
    if (strlen($bin) > AVATAR_MAX) fail('حجم تصویر زیاد است.');

    /* Read the bytes rather than trusting the declared type: whatever
       the browser called it, this has to actually be an image. */
    $info = @getimagesizefromstring($bin);
    $kinds = [IMAGETYPE_JPEG, IMAGETYPE_PNG, IMAGETYPE_WEBP];
    if (!$info || !in_array($info[2], $kinds, true)) fail('این فایل یک تصویر معتبر نیست.');

    Store::ensureDir(AVATARS);
    $dest = AVATARS . '/' . avatar_key($me) . '.jpg';
    $done = false;
    if (function_exists('imagecreatefromstring')) {
        // re-encoding drops anything hiding in the original container
        $img = @imagecreatefromstring($bin);
        if ($img) { $done = (bool) @imagejpeg($img, $dest, 88); imagedestroy($img); }
    }
    if (!$done) {
        // a host without GD still gets a portrait; the page already sent
        // us a canvas-encoded JPEG, and the bytes were verified above
        $done = file_put_contents($dest, $bin) !== false;
    }
    if (!$done) fail('ذخیرهٔ تصویر ممکن نشد.');
    json_out(['ok' => true]);
}

if ($action === 'unphoto') {
    @unlink(AVATARS . '/' . avatar_key($me) . '.jpg');
    json_out(['ok' => true]);
}

fail('unknown action', 404);
