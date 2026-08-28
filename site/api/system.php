<?php
/* Backup and reset: the whole business record is JSON, so taking it away
   and putting it back is a single file. */
require __DIR__ . '/_boot.php';
require_login();
$action = $_GET['a'] ?? 'info';

$sets = ['products', 'customers', 'invoices', 'messages', 'reminders', 'notes', 'users'];

if ($action === 'info') {
    $inv = Store::read('invoices', []);
    $bytes = 0;
    foreach (glob(DATA . '/invoices/*.json') ?: [] as $f) $bytes += filesize($f);
    $pdfBytes = 0; $pdfCount = 0;
    $it = @new RecursiveIteratorIterator(new RecursiveDirectoryIterator(PDFDIR, FilesystemIterator::SKIP_DOTS));
    if ($it) foreach ($it as $f) { if ($f->isFile()) { $pdfBytes += $f->getSize(); $pdfCount++; } }
    json_out(['ok' => true,
        'invoices' => count($inv), 'customers' => count(Store::read('customers', [])),
        'messages' => count(messages_all()),
        'products' => count(Store::read('products', [])), 'admins' => count(users_all()),
        'jsonBytes' => $bytes, 'pdfBytes' => $pdfBytes, 'pdfCount' => $pdfCount,
        'writable' => is_writable(DATA) && is_writable(PDFDIR),
        'php' => PHP_VERSION, 'today' => jalali_today(),
        'private' => DATA_PRIVATE, 'dataPath' => DATA,
    ]);
}

if ($action === 'backup') {
    $bundle = ['exportedAt' => time(), 'today' => jalali_today(), 'version' => 1];
    foreach ($sets as $s) $bundle[$s] = Store::read($s, []);
    $full = [];
    foreach (glob(DATA . '/invoices/*.json') ?: [] as $f) {
        $full[basename($f, '.json')] = json_decode(file_get_contents($f), true);
    }
    $bundle['invoiceDocs'] = $full;
    // passwords stay hashed; the export is still sensitive, hence login-only
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="brickala-backup-' . date('Ymd-His') . '.json"');
    echo json_encode($bundle, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

csrf_check();
$in = body();

if ($action === 'restore') {
    $b = $in['bundle'] ?? null;
    if (!is_array($b) || !isset($b['invoices'])) fail('فایل پشتیبان معتبر نیست.');
    foreach ($sets as $s) if (isset($b[$s])) Store::write($s, $b[$s]);
    foreach (($b['invoiceDocs'] ?? []) as $id => $doc) {
        $id = preg_replace('/[^0-9A-Za-z\-]/', '', (string) $id);
        if ($id !== '') Store::putJson(DATA . '/invoices/' . $id . '.json', $doc);
    }
    json_out(['ok' => true, 'invoices' => count(Store::read('invoices', []))]);
}

if ($action === 'reset') {
    // deliberately explicit: the caller must type the word
    if (($in['confirm'] ?? '') !== 'RESET') fail('برای پاک‌سازی باید عبارت تأیید ارسال شود.');
    $keepProducts = !empty($in['keepProducts']);
    $keepUsers    = !empty($in['keepUsers']);
    foreach (['customers', 'invoices', 'messages', 'reminders'] as $s) Store::write($s, []);
    Store::write('notes', []);
    Store::write('seen', []);
    if (!$keepProducts) @unlink(DATA . '/products.json');
    if (!$keepUsers)    @unlink(DATA . '/users.json');
    foreach (glob(DATA . '/invoices/*.json') ?: [] as $f) @unlink($f);
    $it = @new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator(PDFDIR, FilesystemIterator::SKIP_DOTS),
        RecursiveIteratorIterator::CHILD_FIRST);
    if ($it) foreach ($it as $f) { $f->isDir() ? @rmdir($f->getPathname()) : @unlink($f->getPathname()); }
    json_out(['ok' => true]);
}

fail('unknown action', 404);
