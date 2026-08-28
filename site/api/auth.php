<?php
require __DIR__ . '/_boot.php';

$action = $_GET['a'] ?? 'me';

if ($action === 'me') {
    $u = current_user();
    json_out(['ok' => true, 'user' => $u, 'csrf' => csrf_token()]);
}

if ($action === 'login') {
    $in = body();
    $name = trim((string) ($in['u'] ?? ''));
    $pass = (string) ($in['p'] ?? '');

    // a short cool-down blunts password guessing without locking anyone out
    $tries = $_SESSION['tries'] ?? ['n' => 0, 't' => 0];
    if ($tries['n'] >= 5 && (time() - $tries['t']) < 60) {
        fail('برای امنیت، یک دقیقه صبر کنید و دوباره تلاش کنید.', 429);
    }

    $user = user_find($name);
    if (!$user || !password_verify($pass, $user['h'])) {
        $_SESSION['tries'] = ['n' => $tries['n'] + 1, 't' => time()];
        usleep(400000);
        fail('نام کاربری یا رمز عبور درست نیست.', 401);
    }

    unset($_SESSION['tries']);
    session_regenerate_id(true);
    $_SESSION['user'] = $user['u'];
    json_out([
        'ok'   => true,
        'user' => $user['u'],
        'name' => $user['name'] ?? $user['u'],
        'mustChange' => !empty($user['mustChange']),
        'csrf' => csrf_token(),
    ]);
}

if ($action === 'logout') {
    $_SESSION = [];
    session_destroy();
    json_out(['ok' => true]);
}

if ($action === 'password') {
    $me = require_login();
    csrf_check();
    $in = body();
    $old = (string) ($in['old'] ?? '');
    $new = (string) ($in['new'] ?? '');
    if (mb_strlen($new) < 4) fail('رمز جدید باید حداقل ۴ نویسه باشد.');
    $user = user_find($me);
    if (!$user || !password_verify($old, $user['h'])) fail('رمز فعلی درست نیست.');

    Store::update('users', function ($users) use ($me, $new) {
        foreach ($users as &$x) {
            if (mb_strtolower($x['u']) === mb_strtolower($me)) {
                $x['h'] = password_hash($new, PASSWORD_DEFAULT);
                unset($x['mustChange']);
            }
        }
        return $users;
    });
    json_out(['ok' => true]);
}

fail('unknown action', 404);
