<?php
/* Messages — what happened while you were away.

   An invoice filed from the public /faktor page, or by another admin, is
   news to you. "Read" is a single timestamp per user rather than a flag
   per message, so nothing accumulates. */
require __DIR__ . '/_boot.php';
$me = require_login();
$action = $_GET['a'] ?? 'list';

function seen_at(string $user): int
{
    $all = Store::read('seen', []);
    return (int) ($all[$user] ?? 0);
}

if ($action === 'list') {
    $since = seen_at($me);
    $items = [];
    foreach (Store::read('invoices', []) as $r) {
        $by = $r['issuedBy'] ?? null;
        $fromPublic = ($r['source'] ?? '') === 'faktor';
        // your own work in the panel is not news to you
        if (!$fromPublic && $by !== null && mb_strtolower((string) $by) === mb_strtolower($me)) continue;
        $items[] = [
            'id'      => $r['id'],
            'kind'    => $fromPublic ? 'faktor' : 'panel',
            'at'      => (int) ($r['createdAt'] ?? 0),
            'read'    => (int) ($r['createdAt'] ?? 0) <= $since,
            'title'   => $fromPublic
                ? 'فاکتور تازه از صفحهٔ عمومی'
                : 'فاکتور تازه توسط ' . ($by ?: 'کاربر دیگر'),
            'name'    => $r['customerName'] ?? '',
            'date'    => $r['date'] ?? '',
            'payable' => (int) ($r['payable'] ?? 0),
            'invoice' => $r['id'],
        ];
    }
    usort($items, fn($a, $b) => $b['at'] <=> $a['at']);
    $unread = count(array_filter($items, fn($x) => !$x['read']));
    json_out(['ok' => true, 'unread' => $unread, 'items' => array_slice($items, 0, 60)]);
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
