<?php
/* Streams a stored PDF. The storage folder is not reachable over the web,
   so this is the only way in — and it needs a panel session. */
require __DIR__ . '/_boot.php';
require_login();

$id = preg_replace('/[^0-9A-Za-z\-]/', '', (string) ($_GET['id'] ?? ''));
$p  = DATA . '/invoices/' . $id . '.json';
if (!$id || !is_file($p)) { http_response_code(404); exit('not found'); }

$rec = json_decode(file_get_contents($p), true);
$rel = $rec['pdf'] ?? '';
$abs = PDFDIR . '/' . $rel;
// never let a crafted record walk out of the storage folder
if (!$rel || !is_file($abs) || !str_starts_with(realpath($abs) ?: '', realpath(PDFDIR))) {
    http_response_code(404); exit('no pdf');
}

$name = trim(($rec['customerName'] ?? 'faktor') . ' ' . substr(preg_replace('/\D/', '', $rec['date'] ?? ''), 2, 6));
$name = preg_replace('/[\\\\\/:*?"<>|]/u', ' ', $name) . '.pdf';

header('Content-Type: application/pdf');
header('Content-Length: ' . filesize($abs));
header('Content-Disposition: ' . (isset($_GET['dl']) ? 'attachment' : 'inline')
    . "; filename*=UTF-8''" . rawurlencode($name));
header('Cache-Control: private, max-age=600');
readfile($abs);
