<?php
/* The same composer, inside the panel, where section 0 can reach the
   customer list and a preset can be handed in. */
require dirname(__DIR__) . '/api/_boot.php';
require_login();

$PRESET = null;
$id = preg_replace('/[^0-9A-Za-z\-]/', '', (string) ($_GET['open'] ?? ''));
if ($id !== '') {
    $p = DATA . '/invoices/' . $id . '.json';
    if (is_file($p)) {
        $rec = json_decode(file_get_contents($p), true);
        $PRESET = $rec['state'] ?? null;
    }
}
/* "new invoice for this customer", launched from a profile */
$cid = (string) ($_GET['customer'] ?? '');
if ($cid !== '' && !$PRESET) {
    foreach (Store::read('customers', []) as $c) {
        if ($c['id'] !== $cid) continue;
        $PRESET = [
            'docId' => nid('d'),
            'kind' => 'normal', 'parentId' => null, 'customerId' => $c['id'],
            'meta' => ['status' => 'پیش نویس', 'date' => jalali_today(), 'preparedBy' => ''],
            'customer' => [
                'name' => $c['name'] ?? '', 'phone' => $c['phone'] ?? '',
                'province' => $c['province'] ?? '', 'postal' => $c['postal'] ?? '',
                'address' => $c['address'] ?? '', 'nationalId' => $c['nationalId'] ?? '',
            ],
            'rows' => array_map(fn($i) => [
                'mode' => 'empty', 'code' => '', 'desc' => '', 'unit' => 'قالب', 'grout' => false,
                'refPrice' => null, 'price' => null, 'perM2' => null, 'perCarton' => null, 'perPallet' => null,
                'qtyMode' => 'brick', 'area' => null, 'qty' => null, 'discPct' => 0,
                'finalExact' => null, 'finalBase' => null, 'dtMode' => 'special', 'dtText' => '',
                'ackCarton' => false, 'ackNegative' => false, 'open' => $i === 0,
            ], range(0, 4)),
        ];
        break;
    }
}

$INVOICE_MODE = 'panel';
require dirname(__DIR__) . '/_invoice_page.php';
