<?php
/* Everything the assistant is allowed to know, in one reply.

   The figures are computed here, once, and handed to the browser as a
   plain dataset; the wording and the formulas that read it live in
   assets/js/assistant-brain.js, which is meant to be edited on its own.

   The per-invoice documents carry the rows, so brick-by-brick totals mean
   reading them all. That is a few hundred small files at most, and the
   result is cached against the invoice count and the newest timestamp, so
   a second question in the same minute costs one stat call. */
require __DIR__ . '/_boot.php';
$me = require_login();

/* ---------- cache key: changes whenever the ledger does ---------- */
$index = Store::read('invoices', []);
$stamp = 0;
foreach ($index as $r) $stamp = max($stamp, (int) ($r['updatedAt'] ?? $r['createdAt'] ?? 0));
$key = count($index) . ':' . $stamp . ':' . count(Store::read('customers', [])) . ':v2';

$cache = Store::read('assistant-cache', []);
if (($cache['key'] ?? '') === $key && isset($cache['data'])) {
    $data = $cache['data'];
} else {
    $data = assistant_build($index);
    Store::write('assistant-cache', ['key' => $key, 'at' => time(), 'data' => $data]);
}

/* the parts that depend on who is asking are never cached */
[$jy, $jm] = jalali_parts(jalali_today());
$rem  = array_values(array_filter(Store::read('reminders', []), fn($r) => ($r['user'] ?? '') === $me));
$open = array_values(array_filter($rem, fn($r) => empty($r['done'])));
$week = time() - 7 * 86400;

$seen = (int) (Store::read('seen', [])[$me] ?? 0);
$unread = 0;
foreach (messages_all() as $m) {
    if (($m['kind'] ?? '') !== 'faktor' && ($m['by'] ?? '') !== ''
        && mb_strtolower((string) $m['by']) === mb_strtolower($me)) continue;
    if ((int) ($m['at'] ?? 0) > $seen) $unread++;
}

json_out(['ok' => true] + $data + [
    'me'        => profile_of($me),
    'today'     => jalali_today(),
    'now'       => time(),
    'month'     => ['jy' => $jy, 'jm' => $jm, 'label' => jalali_month_name($jm)],
    'dupPhones' => duplicate_messages_sync(),
    'unread'    => $unread,
    'reminders' => [
        'open'    => count($open),
        'overdue' => count(array_filter($open, fn($r) => ($r['createdAt'] ?? time()) < $week)),
        'items'   => array_slice(array_map(fn($r) => ['id' => $r['id'], 'text' => $r['text']], $open), 0, 6),
    ],
]);

/* ------------------------------------------------------------------ */

function assistant_build(array $index): array
{
    [$jy, $jm] = jalali_parts(jalali_today());

    $bricks = [];          // by product code
    $people = [];          // by customer id
    $months = [];          // last twelve Jalali months, oldest first
    for ($k = 11; $k >= 0; $k--) {
        $m = $jm - $k; $y = $jy;
        while ($m <= 0) { $m += 12; $y--; }
        $months[$y . '-' . $m] = ['jy' => $y, 'jm' => $m, 'label' => jalali_month_name($m),
                                  'invoices' => 0, 'payable' => 0, 'qty' => 0];
    }

    $totQty = 0; $totPay = 0; $monthQty = 0; $monthPay = 0; $monthInv = 0;

    foreach ($index as $r) {
        $id = (string) ($r['id'] ?? '');
        $doc = json_decode((string) @file_get_contents(DATA . '/invoices/' . $id . '.json'), true);
        $rows = is_array($doc['rows'] ?? null) ? $doc['rows'] : [];
        $ry = (int) ($r['jy'] ?? 0); $rm = (int) ($r['jm'] ?? 0);
        $thisMonth = ($ry === $jy && $rm === $jm);
        $pay = (int) ($r['payable'] ?? 0);

        $totPay += $pay;
        if ($thisMonth) { $monthPay += $pay; $monthInv++; }
        $mk = $ry . '-' . $rm;
        if (isset($months[$mk])) { $months[$mk]['invoices']++; $months[$mk]['payable'] += $pay; }

        $cid = (string) ($r['customerId'] ?? '');
        if ($cid !== '' && !isset($people[$cid])) {
            $people[$cid] = ['id' => $cid, 'name' => (string) ($r['customerName'] ?? ''),
                             'phone' => (string) ($r['phone'] ?? ''), 'invoices' => 0,
                             'payable' => 0, 'qty' => 0, 'bricks' => [], 'last' => ''];
        }
        if ($cid !== '') {
            $people[$cid]['invoices']++;
            $people[$cid]['payable'] += $pay;
            $people[$cid]['name'] = (string) ($r['customerName'] ?? $people[$cid]['name']);
            if (($r['date'] ?? '') > $people[$cid]['last']) $people[$cid]['last'] = (string) $r['date'];
        }

        foreach ($rows as $row) {
            $code = trim((string) ($row['code'] ?? ''));
            if ($code === '') continue;
            $qty  = (int) ($row['qty'] ?? 0);
            $amt  = (int) ($row['final'] ?? $row['gross'] ?? 0);
            if (!isset($bricks[$code])) {
                $bricks[$code] = ['code' => $code, 'desc' => (string) ($row['desc'] ?? ''),
                                  'unit' => (string) ($row['unit'] ?? 'قالب'),
                                  'qty' => 0, 'amount' => 0, 'invoices' => 0,
                                  'monthQty' => 0, 'monthAmount' => 0, 'monthInvoices' => 0];
            }
            $bricks[$code]['qty'] += $qty;
            $bricks[$code]['amount'] += $amt;
            $bricks[$code]['invoices']++;
            if ($thisMonth) {
                $bricks[$code]['monthQty'] += $qty;
                $bricks[$code]['monthAmount'] += $amt;
                $bricks[$code]['monthInvoices']++;
            }
            $totQty += $qty;
            if ($thisMonth) $monthQty += $qty;
            if (isset($months[$mk])) $months[$mk]['qty'] += $qty;

            if ($cid !== '') {
                $people[$cid]['qty'] += $qty;
                if (!isset($people[$cid]['bricks'][$code])) {
                    $people[$cid]['bricks'][$code] = ['code' => $code,
                        'desc' => (string) ($row['desc'] ?? ''), 'qty' => 0, 'amount' => 0];
                }
                $people[$cid]['bricks'][$code]['qty'] += $qty;
                $people[$cid]['bricks'][$code]['amount'] += $amt;
            }
        }
    }

    foreach ($people as &$p) {
        usort($p['bricks'], fn($a, $b) => $b['qty'] <=> $a['qty']);
        $p['bricks'] = array_values($p['bricks']);
    }
    unset($p);

    $bricks = array_values($bricks);
    usort($bricks, fn($a, $b) => $b['qty'] <=> $a['qty']);

    $people = array_values($people);
    usort($people, fn($a, $b) => $b['payable'] <=> $a['payable']);

    $products = array_map(fn($p) => [
        'code' => (string) ($p['c'] ?? ''), 'desc' => (string) ($p['d'] ?? ''),
        'price' => (int) ($p['p'] ?? 0),
        'perM2' => isset($p['m']) ? (float) $p['m'] : null,
        'perCarton' => isset($p['k']) ? (int) $p['k'] : null,
        'perPallet' => isset($p['l']) ? (int) $p['l'] : null,
    ], Store::read('products', []));

    return [
        'totals' => ['invoices' => count($index), 'customers' => count(Store::read('customers', [])),
                     'products' => count($products), 'payable' => $totPay, 'qty' => $totQty],
        'monthTotals' => ['invoices' => $monthInv, 'payable' => $monthPay, 'qty' => $monthQty],
        'bricks'   => $bricks,
        'people'   => $people,
        'months'   => array_values($months),
        'products' => $products,
    ];
}
