<?php
/* Up to five administrators, all with the same reach. */
require __DIR__ . '/_boot.php';
$me = require_login();
$action = $_GET['a'] ?? 'list';
const MAX_USERS = 5;

if ($action === 'list') {
    $out = array_map(fn($u) => [
        'u' => $u['u'], 'name' => $u['name'] ?? $u['u'],
        'createdAt' => $u['createdAt'] ?? 0, 'me' => mb_strtolower($u['u']) === mb_strtolower($me),
        'mustChange' => !empty($u['mustChange']),
        'title' => profile_of($u['u'])['title'], 'photo' => profile_of($u['u'])['photo'],
    ], users_all());
    json_out(['ok' => true, 'items' => $out, 'max' => MAX_USERS]);
}

csrf_check();
$in = body();

if ($action === 'add') {
    $u = trim((string) ($in['u'] ?? ''));
    $p = (string) ($in['p'] ?? '');
    if (!preg_match('/^[A-Za-z0-9_.\-]{3,24}$/', $u)) fail('نام کاربری: ۳ تا ۲۴ نویسهٔ لاتین، عدد، نقطه یا خط تیره.');
    if (mb_strlen($p) < 4) fail('رمز عبور باید حداقل ۴ نویسه باشد.');
    if (user_find($u)) fail('این نام کاربری قبلاً تعریف شده است.');
    if (count(users_all()) >= MAX_USERS) fail('حداکثر ' . MAX_USERS . ' ادمین قابل تعریف است.');
    Store::update('users', function ($l) use ($u, $p, $in) {
        $l[] = ['u' => $u, 'h' => password_hash($p, PASSWORD_DEFAULT),
                'name' => trim((string) ($in['name'] ?? $u)), 'createdAt' => time()];
        return $l;
    });
    json_out(['ok' => true]);
}

if ($action === 'update') {
    $u = (string) ($in['u'] ?? '');
    if (!user_find($u)) fail('کاربر پیدا نشد.', 404);
    Store::update('users', function ($l) use ($u, $in) {
        foreach ($l as &$x) {
            if (mb_strtolower($x['u']) !== mb_strtolower($u)) continue;
            if (!empty($in['name'])) $x['name'] = trim((string) $in['name']);
            if (!empty($in['p']) && mb_strlen((string) $in['p']) >= 4) {
                $x['h'] = password_hash((string) $in['p'], PASSWORD_DEFAULT);
                unset($x['mustChange']);
            }
        }
        return $l;
    });
    json_out(['ok' => true]);
}

if ($action === 'delete') {
    $u = (string) ($in['u'] ?? '');
    if (mb_strtolower($u) === mb_strtolower($me)) fail('حساب خودتان را نمی‌توانید حذف کنید.');
    if (count(users_all()) <= 1) fail('حداقل یک ادمین باید باقی بماند.');
    Store::update('users', fn($l) => array_values(array_filter(
        $l, fn($x) => mb_strtolower($x['u']) !== mb_strtolower($u))));
    // their notes, reminders, profile and portrait go with them
    Store::update('reminders', fn($l) => array_values(array_filter($l, fn($r) => ($r['user'] ?? '') !== $u)));
    Store::update('notes', function ($all) use ($u) { unset($all[$u]); return $all; }, []);
    Store::update('profiles', function ($all) use ($u) { unset($all[mb_strtolower($u)]); return $all; }, []);
    @unlink(AVATARS . '/' . avatar_key($u) . '.jpg');
    json_out(['ok' => true]);
}

fail('unknown action', 404);
