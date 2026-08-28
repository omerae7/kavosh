<?php
/* The catalogue both /faktor and /panel read, so a price change lands in
   one place. Reading is open; writing needs a panel session. */
require __DIR__ . '/_boot.php';
$action = $_GET['a'] ?? 'list';

$file = DATA . '/products.json';
if (!is_file($file)) {                       // first run seeds from the shipped copy
    $seed = ROOT . '/assets/data/products.json';
    if (is_file($seed)) { Store::ensureDir(DATA); copy($seed, $file); }
}

if ($action === 'list') {
    header('Cache-Control: no-cache');
    json_out(['ok' => true, 'items' => Store::read('products', [])]);
}

require_login();
csrf_check();
$in = body();

if ($action === 'save') {
    $items = $in['items'] ?? null;
    if (!is_array($items)) fail('فهرست محصولات نامعتبر است.');
    $clean = [];
    $seen  = [];
    foreach ($items as $p) {
        $code = trim((string) ($p['c'] ?? ''));
        $desc = trim((string) ($p['d'] ?? ''));
        if ($code === '' && $desc === '') continue;
        $key = mb_strtolower($code) . '|' . mb_strtolower($desc);
        if (isset($seen[$key])) continue;
        $seen[$key] = true;
        $row = ['c' => $code, 'd' => $desc, 'p' => max(0, (int) round((float) ($p['p'] ?? 0)))];
        foreach (['m', 'k', 'l'] as $f) {                      // per m², per carton, per pallet
            $v = $p[$f] ?? null;
            if ($v !== null && $v !== '' && (int) $v > 0) $row[$f] = (int) $v;
        }
        if (!empty($p['u'])) $row['u'] = (string) $p['u'];
        if (!empty($p['g'])) $row['g'] = 1;
        if (array_key_exists('pc', $p)) $row['pc'] = (string) $p['pc'];
        $clean[] = $row;
    }
    // keep the previous list recoverable after a bad edit
    if (is_file($file)) @copy($file, DATA . '/products.backup.json');
    Store::write('products', $clean);
    json_out(['ok' => true, 'count' => count($clean)]);
}

if ($action === 'restore') {
    $b = DATA . '/products.backup.json';
    if (!is_file($b)) fail('نسخهٔ پشتیبانی موجود نیست.', 404);
    copy($b, $file);
    json_out(['ok' => true, 'count' => count(Store::read('products', []))]);
}

fail('unknown action', 404);
