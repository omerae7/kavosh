<?php
/* Two sticky notes per user, kept apart from everyone else's. */
require __DIR__ . '/_boot.php';
$me = require_login();
/* A POST without an action used to fall through to 'get' and silently
   discard the note, so writing is now explicit. */
$action = $_GET['a'] ?? ($_SERVER['REQUEST_METHOD'] === 'POST' ? 'save' : 'get');

if ($action === 'get') {
    $all = Store::read('notes', []);
    json_out(['ok' => true, 'notes' => $all[$me] ?? ['', '']]);
}

if ($action !== 'save') fail('unknown action', 404);

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
