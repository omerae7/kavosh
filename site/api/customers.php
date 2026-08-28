<?php
require __DIR__ . '/_boot.php';
require_login();

$action = $_GET['a'] ?? 'list';
$invoices = Store::read('invoices', []);

/** Roll invoice totals up per customer in one pass. */
function agg(array $invoices): array {
    $by = [];
    foreach ($invoices as $r) {
        $cid = $r['customerId'] ?? null;
        if (!$cid) continue;
        if (!isset($by[$cid])) $by[$cid] = ['count' => 0, 'total' => 0, 'last' => '', 'lastAt' => 0, 'lastId' => null];
        $by[$cid]['count']++;
        $by[$cid]['total'] += (int) ($r['payable'] ?? 0);
        if (($r['createdAt'] ?? 0) > $by[$cid]['lastAt']) {
            $by[$cid]['lastAt'] = $r['createdAt'] ?? 0;
            $by[$cid]['last']   = $r['date'] ?? '';
            $by[$cid]['lastId'] = $r['id'];
        }
    }
    return $by;
}

if ($action === 'list') {
    $list = Store::read('customers', []);
    $by   = agg($invoices);
    $q    = fold((string) ($_GET['q'] ?? ''));
    $out  = [];
    foreach ($list as $c) {
        $a = $by[$c['id']] ?? ['count' => 0, 'total' => 0, 'last' => '', 'lastAt' => 0, 'lastId' => null];
        if ($q !== '' && !str_contains(fold($c['name']), $q) && !str_contains((string) ($c['phone'] ?? ''), $q)) continue;
        $out[] = $c + ['count' => $a['count'], 'total' => $a['total'],
                       'lastDate' => $a['last'] ?: ($c['lastDate'] ?? ''), 'lastAt' => $a['lastAt'],
                       'lastInvoice' => $a['lastId']];
    }
    usort($out, fn($x, $y) => ($y['lastAt'] ?? 0) <=> ($x['lastAt'] ?? 0));
    json_out(['ok' => true, 'items' => $out]);
}

if ($action === 'get') {
    $id = (string) ($_GET['id'] ?? '');
    foreach (Store::read('customers', []) as $c) {
        if ($c['id'] !== $id) continue;
        $mine = array_values(array_filter($invoices, fn($r) => ($r['customerId'] ?? '') === $id));
        usort($mine, fn($a, $b) => ($b['createdAt'] ?? 0) <=> ($a['createdAt'] ?? 0));
        $a = agg($invoices)[$id] ?? ['count' => 0, 'total' => 0, 'last' => '', 'lastId' => null];
        // the newest invoice, in full, so "کسری بار" can show what was bought
        $lastFull = null;
        if ($a['lastId']) {
            $p = DATA . '/invoices/' . $a['lastId'] . '.json';
            if (is_file($p)) $lastFull = json_decode(file_get_contents($p), true);
        }
        json_out(['ok' => true, 'customer' => $c + ['count' => $a['count'], 'total' => $a['total']],
                  'invoices' => $mine, 'last' => $lastFull]);
    }
    fail('مشتری پیدا نشد.', 404);
}

if ($action === 'delete') {
    csrf_check();
    $id = (string) (body()['id'] ?? '');
    Store::update('customers', fn($l) => array_values(array_filter($l, fn($c) => $c['id'] !== $id)));
    json_out(['ok' => true]);
}

fail('unknown action', 404);
