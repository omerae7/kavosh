<?php
/* Saving, listing and reading invoices.

   Saving is deliberately open: /faktor has no login, and an invoice must be
   recorded whichever page issued it. Reading history is not — every listing
   and download below requires a panel session. */
require __DIR__ . '/_boot.php';

$action = $_GET['a'] ?? 'list';

/* ---------------------------------------------------------------------
   save — called when a PDF, print or HTML export is produced
   --------------------------------------------------------------------- */
if ($action === 'save') {
    $in     = body();
    $state  = $in['state']  ?? null;
    $model  = $in['model']  ?? null;
    $totals = $in['totals'] ?? null;
    if (!is_array($state) || !is_array($model)) fail('payload ناقص است.');

    $docId = (string) ($state['docId'] ?? '');
    if ($docId === '') $docId = nid('d');

    $cust = $model['customer'] ?? [];
    $name = trim((string) ($cust['name'] ?? ''));
    if ($name === '') fail('نام خریدار لازم است.');
    $phone = only_digits((string) ($cust['phone'] ?? ''));

    $date  = (string) ($model['meta']['date'] ?? jalali_today());
    [$jy, $jm, $jd] = jalali_parts($date);
    $kind  = (($in['kind'] ?? 'normal') === 'kasri') ? 'kasri' : 'normal';

    /* ---- customer: match on phone first, then on a folded name ---- */
    $customerId = null;
    Store::update('customers', function ($list) use (&$customerId, $name, $phone, $cust, $date) {
        $key = fold($name);
        foreach ($list as &$c) {
            $hit = ($phone !== '' && ($c['phone'] ?? '') === $phone)
                || ($phone === '' && ($c['key'] ?? '') === $key);
            if ($hit) {
                $customerId = $c['id'];
                $c['name']     = $name;
                $c['key']      = $key;
                if ($phone !== '')                 $c['phone']      = $phone;
                if (!empty($cust['province']))     $c['province']   = $cust['province'];
                if (!empty($cust['postal']))       $c['postal']     = $cust['postal'];
                if (!empty($cust['address']))      $c['address']    = $cust['address'];
                if (!empty($cust['nationalId']))   $c['nationalId'] = $cust['nationalId'];
                $c['lastDate'] = $date;
                return $list;
            }
        }
        $customerId = nid('c');
        $list[] = [
            'id' => $customerId, 'name' => $name, 'key' => $key, 'phone' => $phone,
            'province' => $cust['province'] ?? '', 'postal' => $cust['postal'] ?? '',
            'address' => $cust['address'] ?? '', 'nationalId' => $cust['nationalId'] ?? '',
            'firstDate' => $date, 'lastDate' => $date, 'createdAt' => time(),
        ];
        return $list;
    });

    /* ---- allocate or reuse the invoice id ---- */
    $index = Store::read('invoices', []);
    $existing = null;
    foreach ($index as $row) {
        if (($row['docId'] ?? '') === $docId) { $existing = $row; break; }
    }
    if ($existing) {
        $id = $existing['id'];
    } else {
        $seq = 0;
        foreach ($index as $row) {
            if (str_starts_with((string) $row['id'], sprintf('%04d%02d-', $jy, $jm))) $seq++;
        }
        $id = sprintf('%04d%02d-%04d', $jy, $jm, $seq + 1);
        while (is_file(DATA . '/invoices/' . $id . '.json')) {
            $seq++;
            $id = sprintf('%04d%02d-%04d', $jy, $jm, $seq + 1);
        }
    }

    /* ---- the PDF, exactly the bytes the browser produced ---- */
    $pdfRel = sprintf('%04d/%02d/%s.pdf', $jy, $jm, $id);
    if (!empty($in['pdf'])) {
        $bin = base64_decode((string) $in['pdf'], true);
        if ($bin !== false && strncmp($bin, '%PDF', 4) === 0) {
            Store::ensureDir(dirname(PDFDIR . '/' . $pdfRel));
            file_put_contents(PDFDIR . '/' . $pdfRel, $bin, LOCK_EX);
        }
    }
    $hasPdf = is_file(PDFDIR . '/' . $pdfRel);

    $rows = [];
    foreach (($model['rows'] ?? []) as $r) {
        if (empty($r['used'])) continue;
        $rows[] = [
            'code' => $r['code'] ?? '', 'desc' => $r['desc'] ?? '', 'unit' => $r['unit'] ?? '',
            'qty' => $r['qty'] ?? 0, 'price' => $r['unitPrice'] ?? 0,
            'gross' => $r['gross'] ?? 0, 'final' => $r['final'] ?? 0,
            'discountText' => $r['discountText'] ?? '',
        ];
    }

    $gross   = (int) ($totals['gross'] ?? 0);
    $disc    = (int) ($totals['discount'] ?? 0);
    $payable = (int) ($totals['payable'] ?? 0);

    $record = [
        'id' => $id, 'docId' => $docId, 'date' => $date, 'jy' => $jy, 'jm' => $jm, 'jd' => $jd,
        'customerId' => $customerId, 'customerName' => $name, 'phone' => $phone,
        'gross' => $gross, 'discount' => $disc, 'payable' => $payable,
        'pct' => $gross > 0 ? round($disc / $gross * 100, 4) : 0,
        'items' => count($rows), 'rows' => $rows, 'kind' => $kind,
        'parentId' => $in['parentId'] ?? null,
        'source' => (($in['source'] ?? '') === 'panel') ? 'panel' : 'faktor',
        'issuedBy' => current_user(),
        'pdf' => $hasPdf ? $pdfRel : null,
        'createdAt' => $existing['createdAt'] ?? time(),
        'updatedAt' => time(),
        'state' => $state,                    // reopening an invoice needs the lot
    ];
    Store::putJson(DATA . '/invoices/' . $id . '.json', $record);

    // the index carries only what a list needs, so listing stays fast
    $light = $record;
    unset($light['state'], $light['rows']);
    Store::update('invoices', function ($list) use ($light, $existing) {
        if ($existing) {
            foreach ($list as &$row) {
                if ($row['id'] === $light['id']) { $row = $light; return $list; }
            }
        }
        array_unshift($list, $light);
        return $list;
    });

    message_write($record);

    json_out(['ok' => true, 'id' => $id, 'docId' => $docId, 'pdf' => $record['pdf'], 'updated' => (bool) $existing]);
}

/* ---------- everything below is panel-only ---------- */
require_login();

if ($action === 'list') {
    $list = Store::read('invoices', []);
    $q    = fold((string) ($_GET['q'] ?? ''));
    $cid  = (string) ($_GET['customer'] ?? '');
    if ($cid !== '') {
        $list = array_values(array_filter($list, fn($r) => ($r['customerId'] ?? '') === $cid));
    }
    if ($q !== '') {
        $list = array_values(array_filter($list, function ($r) use ($q) {
            return str_contains(fold((string) $r['customerName']), $q)
                || str_contains((string) $r['id'], $q)
                || str_contains((string) ($r['phone'] ?? ''), $q);
        }));
    }
    usort($list, fn($a, $b) => ($b['createdAt'] ?? 0) <=> ($a['createdAt'] ?? 0));
    $limit  = max(1, min(500, (int) ($_GET['limit'] ?? 100)));
    $offset = max(0, (int) ($_GET['offset'] ?? 0));
    json_out(['ok' => true, 'total' => count($list), 'items' => array_slice($list, $offset, $limit)]);
}

if ($action === 'get') {
    $id = preg_replace('/[^0-9A-Za-z\-]/', '', (string) ($_GET['id'] ?? ''));
    $p  = DATA . '/invoices/' . $id . '.json';
    if (!$id || !is_file($p)) fail('فاکتور پیدا نشد.', 404);
    json_out(['ok' => true, 'invoice' => json_decode(file_get_contents($p), true)]);
}

if ($action === 'delete') {
    csrf_check();
    $id = preg_replace('/[^0-9A-Za-z\-]/', '', (string) (body()['id'] ?? ''));
    $p  = DATA . '/invoices/' . $id . '.json';
    if (!$id || !is_file($p)) fail('فاکتور پیدا نشد.', 404);
    $rec = json_decode(file_get_contents($p), true);
    if (!empty($rec['pdf']) && is_file(PDFDIR . '/' . $rec['pdf'])) @unlink(PDFDIR . '/' . $rec['pdf']);
    @unlink($p);
    Store::update('invoices', fn($l) => array_values(array_filter($l, fn($r) => $r['id'] !== $id)));
    // a deleted invoice leaves no message pointing at a page that is gone
    Store::update('messages', fn($l) => array_values(array_filter(
        is_array($l) ? $l : [], fn($m) => ($m['invoice'] ?? '') !== $id)), []);
    json_out(['ok' => true]);
}

fail('unknown action', 404);
