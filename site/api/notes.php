<?php
/* Two sticky notes per user, kept apart from everyone else's. */
require __DIR__ . '/_boot.php';
$me = require_login();
$action = $_GET['a'] ?? 'get';

if ($action === 'get') {
    $all = Store::read('notes', []);
    json_out(['ok' => true, 'notes' => $all[$me] ?? ['', '']]);
}

csrf_check();
$in   = body();
$slot = max(0, min(1, (int) ($in['slot'] ?? 0)));
$text = mb_substr((string) ($in['text'] ?? ''), 0, 4000);

Store::update('notes', function ($all) use ($me, $slot, $text) {
    if (!isset($all[$me])) $all[$me] = ['', ''];
    $all[$me][$slot] = $text;
    return $all;
}, []);

json_out(['ok' => true]);
