<?php
/* Reminders belong to the user who made them and are never shown to another. */
require __DIR__ . '/_boot.php';
$me = require_login();
$action = $_GET['a'] ?? 'list';

$mine = fn(array $all) => array_values(array_filter($all, fn($r) => ($r['user'] ?? '') === $me));

if ($action === 'list') {
    $list = $mine(Store::read('reminders', []));
    usort($list, fn($a, $b) => ($b['createdAt'] ?? 0) <=> ($a['createdAt'] ?? 0));
    json_out(['ok' => true, 'items' => $list]);
}

csrf_check();
$in = body();

if ($action === 'add') {
    $text = trim((string) ($in['text'] ?? ''));
    if ($text === '') fail('متن یادآور خالی است.');
    $item = ['id' => nid('r'), 'user' => $me, 'text' => mb_substr($text, 0, 500),
             'done' => false, 'createdAt' => time(), 'doneAt' => null,
             'due' => $in['due'] ?? null];
    Store::update('reminders', function ($l) use ($item) { $l[] = $item; return $l; });
    json_out(['ok' => true, 'item' => $item]);
}

if ($action === 'update') {
    $id = (string) ($in['id'] ?? '');
    $out = null;
    Store::update('reminders', function ($l) use ($id, $me, $in, &$out) {
        foreach ($l as &$r) {
            if ($r['id'] !== $id || ($r['user'] ?? '') !== $me) continue;
            if (array_key_exists('text', $in)) $r['text'] = mb_substr(trim((string) $in['text']), 0, 500);
            if (array_key_exists('due', $in))  $r['due']  = $in['due'];
            if (array_key_exists('done', $in)) {
                $r['done']   = (bool) $in['done'];
                $r['doneAt'] = $r['done'] ? time() : null;   // unticking brings it back
            }
            $out = $r;
        }
        return $l;
    });
    if (!$out) fail('یادآور پیدا نشد.', 404);
    json_out(['ok' => true, 'item' => $out]);
}

if ($action === 'delete') {
    $id = (string) ($in['id'] ?? '');
    Store::update('reminders', fn($l) => array_values(array_filter(
        $l, fn($r) => !($r['id'] === $id && ($r['user'] ?? '') === $me))));
    json_out(['ok' => true]);
}

fail('unknown action', 404);
