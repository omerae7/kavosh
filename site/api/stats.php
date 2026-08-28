<?php
require __DIR__ . '/_boot.php';
$me = require_login();

$inv = Store::read('invoices', []);
[$jy, $jm] = jalali_parts(jalali_today());

$today = jalali_today();
[, , $jd] = array_pad(jalali_parts($today), 3, 0);

$thisMonth = 0; $thisMonthSum = 0; $todayN = 0; $todaySum = 0;
foreach ($inv as $r) {
    if ((int) ($r['jy'] ?? 0) === $jy && (int) ($r['jm'] ?? 0) === $jm) {
        $thisMonth++; $thisMonthSum += (int) ($r['payable'] ?? 0);
        if ((int) ($r['jd'] ?? 0) === $jd) { $todayN++; $todaySum += (int) ($r['payable'] ?? 0); }
    }
}

/* last six Jalali months, oldest first */
$names = ['', 'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور','مهر','آبان','آذر','دی','بهمن','اسفند'];
$series = [];
for ($k = 5; $k >= 0; $k--) {
    $m = $jm - $k; $y = $jy;
    while ($m <= 0) { $m += 12; $y--; }
    $n = 0; $sum = 0;
    foreach ($inv as $r) {
        if ((int) ($r['jy'] ?? 0) === $y && (int) ($r['jm'] ?? 0) === $m) { $n++; $sum += (int) ($r['payable'] ?? 0); }
    }
    $series[] = ['y' => $y, 'm' => $m, 'label' => $names[$m], 'count' => $n, 'sum' => $sum];
}

/* unread messages, for the assistant to mention — counted off the same
   file the bell reads, so the two can never disagree */
$dups = duplicate_messages_sync();
$seen = (int) (Store::read('seen', [])[$me] ?? 0);
$unread = 0;
foreach (messages_all() as $m) {
    if (($m['kind'] ?? '') !== 'faktor'
        && ($m['by'] ?? '') !== ''
        && mb_strtolower((string) $m['by']) === mb_strtolower($me)) continue;
    if ((int) ($m['at'] ?? 0) > $seen) $unread++;
}

$rem = array_values(array_filter(Store::read('reminders', []), fn($r) => ($r['user'] ?? '') === $me));
$open = array_values(array_filter($rem, fn($r) => empty($r['done'])));
$week = time() - 7 * 86400;
$overdue = array_values(array_filter($open, fn($r) => ($r['createdAt'] ?? time()) < $week));

json_out(['ok' => true,
    'invoices'   => count($inv),
    'customers'  => count(Store::read('customers', [])),
    'products'   => count(Store::read('products', [])),
    'today'      => $todayN,
    'todaySum'   => $todaySum,
    'thisMonth'  => $thisMonth,
    'thisMonthSum' => $thisMonthSum,
    'series'     => $series,
    'openReminders' => count($open),
    'unread'     => $unread,
    'dupPhones'  => $dups,
    'overdue'    => $overdue,
    'recent'     => array_slice($inv, 0, 20),
]);
