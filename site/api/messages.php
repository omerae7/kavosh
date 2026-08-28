<?php
/* Messages — what happened while you were away.

   These live in their own messages.json, beside invoices.json and
   customers.json, so the whole record is still a handful of files you
   can copy away, restore, or delete to reset one part of the system
   without touching the rest. A message is written when an invoice is
   filed; nothing derives it from the invoice list at read time.

   "Read" is a single timestamp per user in seen.json rather than a flag
   per message, so nothing accumulates as the list grows. */
require __DIR__ . '/_boot.php';
$me = require_login();
$action = $_GET['a'] ?? 'list';

if ($action === 'list') {
    duplicate_messages_sync();     // a repeated telephone is news, and it retires itself
    $since = (int) (Store::read('seen', [])[$me] ?? 0);
    $items = [];
    foreach (messages_all() as $m) {
        // your own work in the panel is not news to you
        if (($m['kind'] ?? '') !== 'faktor'
            && ($m['by'] ?? '') !== ''
            && mb_strtolower((string) $m['by']) === mb_strtolower($me)) continue;
        $m['read'] = (int) ($m['at'] ?? 0) <= $since;
        $items[] = $m;
    }
    usort($items, fn($a, $b) => $b['at'] <=> $a['at']);
    json_out([
        'ok'     => true,
        'unread' => count(array_filter($items, fn($x) => !$x['read'])),
        'items'  => array_slice($items, 0, 60),
    ]);
}

if ($action === 'seen') {
    csrf_check();
    Store::update('seen', function ($all) use ($me) {
        $all[$me] = time();
        return $all;
    }, []);
    json_out(['ok' => true]);
}

fail('unknown action', 404);
