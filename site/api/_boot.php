<?php
/* =====================================================================
   Shared bootstrap: paths, the flat-file store, sessions, responses.

   Everything persists as JSON under /data and PDFs under /storage, so the
   whole business record is two folders you can copy away and restore.
   No database, no extensions beyond what stock PHP ships with.
   ===================================================================== */

declare(strict_types=1);

define('ROOT', dirname(__DIR__));

/* Where the record lives.

   First choice is a folder next to public_html — outside the web root, so
   no web server misconfiguration can ever hand a customer list to a
   visitor. If the host will not let PHP write there, fall back to folders
   inside the site, which the shipped .htaccess files deny. */
$private = dirname(ROOT) . '/brickala-data';
if (!is_dir($private)) @mkdir($private, 0700, true);
/* Belt and braces: on a host whose document root is the account home,
   this folder can land inside the served tree. Deny it there too, so its
   position never decides whether a customer list is downloadable. */
if (is_dir($private) && !is_file($private . '/.htaccess')) {
    @file_put_contents($private . '/.htaccess',
        "Require all denied\n<IfModule !mod_authz_core.c>\nDeny from all\n</IfModule>\n");
    @file_put_contents($private . '/index.php', "<?php http_response_code(404);\n");
}
if (is_dir($private) && is_writable($private)) {
    define('DATA', $private . '/data');
    define('PDFDIR', $private . '/pdf');
    define('DATA_PRIVATE', true);
} else {
    define('DATA', ROOT . '/data');
    define('PDFDIR', ROOT . '/storage/pdf');
    define('DATA_PRIVATE', false);
}
foreach ([DATA, DATA . '/invoices', PDFDIR] as $d) {
    if (!is_dir($d)) @mkdir($d, 0755, true);
}

mb_internal_encoding('UTF-8');
date_default_timezone_set('Asia/Tehran');

session_set_cookie_params([
    'lifetime' => 0,
    'path'     => '/',
    'httponly' => true,
    'samesite' => 'Lax',
    'secure'   => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off'),
]);
session_name('brickala');
session_start();

/* ---------------------------------------------------------------------
   Store — one JSON document per file, read and written under a lock
   --------------------------------------------------------------------- */
final class Store
{
    public static function path(string $name): string
    {
        return DATA . '/' . $name . '.json';
    }

    public static function read(string $name, $fallback = [])
    {
        $p = self::path($name);
        if (!is_file($p)) return $fallback;
        $raw = file_get_contents($p);
        if ($raw === false || $raw === '') return $fallback;
        $val = json_decode($raw, true);
        return $val === null ? $fallback : $val;
    }

    public static function write(string $name, $value): bool
    {
        return self::putJson(self::path($name), $value);
    }

    /** Read, mutate and write back while holding an exclusive lock. */
    public static function update(string $name, callable $fn, $fallback = [])
    {
        $p = self::path($name);
        self::ensureDir(dirname($p));
        $fh = fopen($p, 'c+');
        if (!$fh) throw new RuntimeException('cannot open ' . $name);
        try {
            flock($fh, LOCK_EX);
            $raw = stream_get_contents($fh);
            $cur = ($raw === false || $raw === '') ? $fallback : (json_decode($raw, true) ?? $fallback);
            $next = $fn($cur);
            $json = json_encode($next, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
            ftruncate($fh, 0);
            rewind($fh);
            fwrite($fh, $json);
            fflush($fh);
            return $next;
        } finally {
            flock($fh, LOCK_UN);
            fclose($fh);
        }
    }

    public static function putJson(string $path, $value): bool
    {
        self::ensureDir(dirname($path));
        $json = json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        $tmp = $path . '.tmp';
        if (file_put_contents($tmp, $json, LOCK_EX) === false) return false;
        return rename($tmp, $path);          // atomic: a reader never sees half a file
    }

    public static function ensureDir(string $dir): void
    {
        if (!is_dir($dir)) @mkdir($dir, 0755, true);
    }
}

/* ---------------------------------------------------------------------
   Responses
   --------------------------------------------------------------------- */
function json_out($data, int $code = 200): void
{
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    header('Cache-Control: no-store');
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function fail(string $message, int $code = 400): void
{
    json_out(['ok' => false, 'error' => $message], $code);
}

function body(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || $raw === '') return [];
    $v = json_decode($raw, true);
    return is_array($v) ? $v : [];
}

/* ---------------------------------------------------------------------
   Users and sessions
   --------------------------------------------------------------------- */
function users_all(): array
{
    $u = Store::read('users', []);
    if (!$u) {
        // first run: one administrator, admin / admin
        $u = [[
            'u'         => 'admin',
            'h'         => password_hash('admin', PASSWORD_DEFAULT),
            'name'      => 'مدیر',
            'createdAt' => time(),
            'mustChange' => true,
        ]];
        Store::write('users', $u);
    }
    return $u;
}

function user_find(string $name): ?array
{
    foreach (users_all() as $x) {
        if (mb_strtolower($x['u']) === mb_strtolower($name)) return $x;
    }
    return null;
}

function current_user(): ?string
{
    return isset($_SESSION['user']) ? (string) $_SESSION['user'] : null;
}

function require_login(): string
{
    $u = current_user();
    if ($u === null || user_find($u) === null) {
        if (str_contains($_SERVER['REQUEST_URI'] ?? '', '/api/')) {
            fail('unauthenticated', 401);
        }
        header('Location: /panel/login.php');
        exit;
    }
    return $u;
}

/* ---------------------------------------------------------------------
   CSRF — one token per session, required on every mutating call
   --------------------------------------------------------------------- */
function csrf_token(): string
{
    if (empty($_SESSION['csrf'])) {
        $_SESSION['csrf'] = bin2hex(random_bytes(16));
    }
    return $_SESSION['csrf'];
}

function csrf_check(): void
{
    $sent = $_SERVER['HTTP_X_CSRF'] ?? ($_POST['csrf'] ?? '');
    if (!hash_equals(csrf_token(), (string) $sent)) fail('bad csrf', 419);
}

/* ---------------------------------------------------------------------
   Small helpers
   --------------------------------------------------------------------- */
function nid(string $prefix = ''): string
{
    return $prefix . base_convert((string) time(), 10, 36) . bin2hex(random_bytes(3));
}

/** Fold Arabic/Persian variants so "کریمي" and "کریمی" match. */
function fold(string $s): string
{
    $s = trim(preg_replace('/\s+/u', ' ', $s));
    $from = ['ي', 'ى', 'ك', 'ۀ', 'ة', '‌', 'أ', 'إ', 'آ'];
    $to   = ['ی', 'ی', 'ک', 'ه', 'ه', ' ', 'ا', 'ا', 'ا'];
    $s = str_replace($from, $to, $s);
    $digits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹','٠','١','٢','٣','٤','٥','٦','٧','٨','٩'];
    $latin  = ['0','1','2','3','4','5','6','7','8','9','0','1','2','3','4','5','6','7','8','9'];
    $s = str_replace($digits, $latin, $s);
    return mb_strtolower($s);
}

function only_digits(string $s): string
{
    return preg_replace('/\D+/', '', fold($s)) ?? '';
}

/** Gregorian -> Jalali, matching the client so both agree on "today". */
function jalali_today(): string
{
    [$gy, $gm, $gd] = array_map('intval', explode('-', date('Y-n-j')));
    $gdm = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    $jy = ($gy <= 1600) ? 0 : 979;
    $gy -= ($gy <= 1600) ? 621 : 1600;
    $gy2 = ($gm > 2) ? $gy + 1 : $gy;
    $days = 365 * $gy + intdiv($gy2 + 3, 4) - intdiv($gy2 + 99, 100)
          + intdiv($gy2 + 399, 400) - 80 + $gd + $gdm[$gm - 1];
    $jy += 33 * intdiv($days, 12053); $days %= 12053;
    $jy += 4 * intdiv($days, 1461);   $days %= 1461;
    if ($days > 365) { $jy += intdiv($days - 1, 365); $days = ($days - 1) % 365; }
    $jm = ($days < 186) ? 1 + intdiv($days, 31) : 7 + intdiv($days - 186, 30);
    $jd = 1 + (($days < 186) ? $days % 31 : ($days - 186) % 30);
    return sprintf('%04d.%02d.%02d', $jy, $jm, $jd);
}

/** "1405.06.06" -> [1405, 6, 6]; tolerant of Persian digits and separators. */
/* ---------------------------------------------------------------------
   Profiles — how each administrator is named, reached and pictured
   --------------------------------------------------------------------- */
define('AVATARS', DATA . '/avatars');

/** A filename that cannot escape the folder, whatever the username is. */
function avatar_key(string $u): string
{
    return substr(hash('sha256', mb_strtolower($u)), 0, 32);
}

/** One user's card, with sensible fallbacks for an account that has
    never opened the profile page. */
function profile_of(string $u): array
{
    $rec = user_find($u) ?: [];
    $p   = Store::read('profiles', [])[mb_strtolower($u)] ?? [];
    return [
        'u'     => $rec['u'] ?? $u,
        'name'  => $p['name'] ?? ($rec['name'] ?? $u),
        'title' => $p['title'] ?? 'مدیر سیستم',
        'phone' => $p['phone'] ?? '',
        'email' => $p['email'] ?? '',
        'note'  => $p['note'] ?? '',
        'photo' => is_file(AVATARS . '/' . avatar_key($u) . '.jpg'),
        'since' => (int) ($rec['createdAt'] ?? 0),
    ];
}

/* ---------------------------------------------------------------------
   Messages — their own file, written when an invoice is filed

   They used to be derived from the invoice list on every read. Keeping
   them in messages.json puts them beside invoices.json and customers.json:
   one more file you can back up, move, or delete on its own to reset that
   part of the system without disturbing the rest.
   --------------------------------------------------------------------- */

/** The news one filed invoice is to everybody except its own author. */
function message_for_invoice(array $r): array
{
    $public = ($r['source'] ?? '') === 'faktor';
    $by = (string) ($r['issuedBy'] ?? '');
    return [
        'id'      => 'm-' . $r['id'],
        'kind'    => $public ? 'faktor' : 'panel',
        'by'      => $public ? '' : $by,
        'at'      => (int) ($r['createdAt'] ?? time()),
        'title'   => $public
            ? 'فاکتور تازه از صفحهٔ عمومی'
            : 'فاکتور تازه توسط ' . ($by !== '' ? $by : 'کاربر دیگر'),
        'name'    => (string) ($r['customerName'] ?? ''),
        'date'    => (string) ($r['date'] ?? ''),
        'payable' => (int) ($r['payable'] ?? 0),
        'invoice' => (string) ($r['id'] ?? ''),
        'href'    => '/panel/invoice.php?open=' . rawurlencode((string) ($r['id'] ?? '')),
    ];
}

/* ---------------------------------------------------------------------
   Two customers, one telephone

   Nothing is ever refused over this: ten buyers may be آقای حسنی, and a
   name proves nothing. A repeated *number* is different — it usually
   means one person was written down twice — so the panel says so
   afterwards rather than standing in the way at the time.
   --------------------------------------------------------------------- */
function duplicate_phones(): array
{
    $byPhone = [];
    foreach (Store::read('customers', []) as $c) {
        $phone = only_digits((string) ($c['phone'] ?? ''));
        if ($phone === '') continue;
        $byPhone[$phone][] = ['id' => $c['id'] ?? '', 'name' => (string) ($c['name'] ?? '')];
    }
    $out = [];
    foreach ($byPhone as $phone => $who) {
        if (count($who) < 2) continue;
        $out[] = ['phone' => (string) $phone, 'count' => count($who), 'customers' => $who];
    }
    return $out;
}

/** Raise one message per repeated number, and retire it once the
    duplicate is gone. */
function duplicate_messages_sync(): array
{
    $dups = duplicate_phones();
    $live = [];
    foreach ($dups as $d) $live['m-dup-' . $d['phone']] = $d;

    Store::update('messages', function ($list) use ($live) {
        if (!is_array($list)) $list = [];
        $seen = [];
        foreach ($list as $i => $m) {
            $id = $m['id'] ?? '';
            if (strpos($id, 'm-dup-') !== 0) continue;
            if (!isset($live[$id])) { unset($list[$i]); continue; }   // no longer duplicated
            $seen[$id] = true;
        }
        foreach ($live as $id => $d) {
            if (isset($seen[$id])) continue;
            $names = array_slice(array_column($d['customers'], 'name'), 0, 3);
            array_unshift($list, [
                'id'      => $id,
                'kind'    => 'dup',
                'by'      => '',
                'at'      => time(),
                'title'   => 'شمارهٔ تلفن تکراری',
                'name'    => implode(' و ', $names) . ' — ' . $d['phone'],
                'date'    => jalali_today(),
                'payable' => 0,
                'invoice' => '',
                'href'    => '/panel/customers.php?q=' . rawurlencode($d['phone']),
            ]);
        }
        return array_values($list);
    }, []);
    return $dups;
}

/** Record one. Re-filing an invoice updates its message rather than
    adding a second, and never resets the moment it first arrived. */
function message_write(array $invoice): void
{
    messages_all();          // an upgrading install keeps its history
    $msg = message_for_invoice($invoice);
    Store::update('messages', function ($list) use ($msg) {
        if (!is_array($list)) $list = [];
        foreach ($list as &$m) {
            if (($m['id'] ?? '') === $msg['id']) {
                $msg['at'] = (int) ($m['at'] ?? $msg['at']);
                $m = $msg;
                return $list;
            }
        }
        unset($m);
        array_unshift($list, $msg);
        return array_slice($list, 0, 500);
    }, []);
}

/** Everything on file. An install that predates messages.json gets its
    history built once from the invoices, so nothing is lost on upgrade. */
function messages_all(): array
{
    if (is_file(Store::path('messages'))) {
        $list = Store::read('messages', []);
        return is_array($list) ? $list : [];
    }
    $seeded = array_map('message_for_invoice', Store::read('invoices', []));
    Store::write('messages', $seeded);
    return $seeded;
}

/** The Persian month by number, 1-based. */
function jalali_month_name(int $m): string
{
    $names = ['', 'فروردین','اردیبهشت','خرداد','تیر','مرداد','شهریور',
              'مهر','آبان','آذر','دی','بهمن','اسفند'];
    return $names[$m] ?? '';
}

function jalali_parts(string $date): array
{
    $d = only_digits($date);
    if (strlen($d) >= 8) {
        return [(int) substr($d, 0, 4), (int) substr($d, 4, 2), (int) substr($d, 6, 2)];
    }
    return [0, 0, 0];
}
