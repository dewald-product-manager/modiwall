<?php
/**
 * Modiwall quote form handler. Plain PHP 7.4+, no libraries.
 *
 * Defences: POST only, same-origin check (Origin and Sec-Fetch-Site), honeypot, minimum
 * fill time, link-spam filter, per-IP and site-wide rate limits, strict length and format
 * checks, header-injection safe, no user input in the From header, nothing written to
 * the web root, no details leaked in errors.
 */
declare(strict_types=1);

const MAIL_TO   = 'info@modiwall.com';
const MAIL_FROM = 'website@modiwall.com'; // must be a mailbox or alias on this domain
const HOSTS     = ['www.modiwall.com', 'modiwall.com'];
const MAX_PER_HOUR = 5;     // from one visitor
const MAX_SITE_HOUR = 40;   // from everyone together, so a botnet cannot flood the inbox
const MAX_LINKS = 2;        // real enquiries rarely carry web links; spam always does

ini_set('display_errors', '0');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('X-Robots-Tag: noindex, nofollow');

$wantsJson = strpos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function finish(int $code, bool $ok, string $error = ''): void
{
    global $wantsJson;
    if ($wantsJson) {
        http_response_code($code);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($ok ? ['ok' => true] : ['ok' => false, 'error' => $error]);
    } elseif ($ok) {
        header('Location: /thank-you.html', true, 303);
    } else {
        http_response_code($code);
        header('Content-Type: text/plain; charset=utf-8');
        echo $error . "\nPlease go back and try again, or email info@modiwall.com.";
    }
    exit;
}

/** One trimmed line of text: control characters removed, length capped. */
function line(string $key, int $max): string
{
    $v = $_POST[$key] ?? '';
    if (!is_string($v)) {
        return '';
    }
    $v = preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $v) ?? '';
    return trim(mb_substr($v, 0, $max, 'UTF-8'));
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    header('Allow: POST');
    finish(405, false, 'This address only accepts the quote form.');
}
if ((int) ($_SERVER['CONTENT_LENGTH'] ?? 0) > 20000) {
    finish(413, false, 'That message is too long.');
}

// Browsers send Origin on POST. Refuse anything from another site, or over plain http.
$origin = $_SERVER['HTTP_ORIGIN'] ?? ($_SERVER['HTTP_REFERER'] ?? '');
$host = strtolower((string) parse_url($origin, PHP_URL_HOST));
$scheme = strtolower((string) parse_url($origin, PHP_URL_SCHEME));
$local = PHP_SAPI === 'cli-server' && $host === 'localhost'; // php -S, local testing only
if (!$local && (!in_array($host, HOSTS, true) || $scheme !== 'https')) {
    finish(403, false, 'Your request was not sent. Reload the page and try again.');
}
// Modern browsers also say where the request came from, and that cannot be set by a page.
$site = $_SERVER['HTTP_SEC_FETCH_SITE'] ?? '';
if ($site !== '' && $site !== 'same-origin') {
    finish(403, false, 'Your request was not sent. Reload the page and try again.');
}

// Bots fill hidden fields or submit instantly. Say "sent" and drop it.
if (line('website', 10) !== '') {
    finish(200, true);
}
$elapsed = line('elapsed', 12);
if ($elapsed !== '' && ctype_digit($elapsed) && (int) $elapsed < 3000) {
    finish(200, true);
}

$name    = line('name', 80);
$email   = line('email', 120);
$phone   = line('phone', 24);
$place   = line('place', 80);
$area    = line('area', 8);
$message = $_POST['message'] ?? '';
$message = is_string($message) ? trim(mb_substr(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]+/u', '', str_replace("\r\n", "\n", $message)) ?? '', 0, 3000, 'UTF-8')) : '';

$pick = static function (string $key, array $options): string {
    $v = line($key, 30);
    return in_array($v, $options, true) ? $v : 'not given';
};
$wall  = $pick('wall', ['living', 'artificial', 'unsure']);
$where = $pick('where', ['indoors', 'outdoors', 'both']);
$role  = $pick('role', ['home', 'estate', 'architect', 'developer', 'business', 'other']);

if (mb_strlen($name, 'UTF-8') < 2) {
    finish(422, false, 'Enter your name.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    finish(422, false, 'Enter an email address like name@example.co.za.');
}
if ($phone !== '' && !preg_match('/^[+\d][\d\s()\-]{7,19}$/', $phone)) {
    finish(422, false, 'Enter a phone number using digits.');
}
if ($area !== '' && (!is_numeric($area) || (float) $area < 0 || (float) $area > 5000)) {
    $area = '';
}
if (($_POST['consent'] ?? '') !== 'yes') {
    finish(422, false, 'Tick the consent box so we may reply to you.');
}
// Link spam: say "sent" and drop it, as for the honeypot.
if (preg_match_all('~https?://|www\.|\[url~i', "$name $place $message") > MAX_LINKS) {
    finish(200, true);
}

/**
 * Count one request against a limit per hour. Only a salted hash of the key is stored,
 * outside the web root, readable by this account alone. False when the limit is reached.
 */
function within(string $key, int $max): bool
{
    $salt = hash('sha256', __FILE__ . php_uname('n'));
    $file = sys_get_temp_dir() . '/mw_' . substr(hash_hmac('sha256', $key, $salt), 0, 32);
    $old = umask(0077);
    $fh = @fopen($file, 'c+');
    umask($old);
    if (!$fh || !flock($fh, LOCK_EX)) {
        return true; // never turn a customer away because the temp folder is unwell
    }
    $now = time();
    $hits = array_filter(array_map('intval', explode(',', (string) stream_get_contents($fh))), static fn ($t) => $t > $now - 3600);
    $ok = count($hits) < $max;
    if ($ok) {
        $hits[] = $now;
        ftruncate($fh, 0);
        rewind($fh);
        fwrite($fh, implode(',', $hits));
    }
    fclose($fh);
    return $ok;
}

if (!within('ip:' . ($_SERVER['REMOTE_ADDR'] ?? ''), MAX_PER_HOUR)) {
    finish(429, false, 'You have sent several requests this hour. Please call +27 76 874 0299.');
}
if (!within('site', MAX_SITE_HOUR)) {
    finish(429, false, 'We are receiving a great many requests just now. Please call +27 76 874 0299 or email info@modiwall.com.');
}

$body = implode("\n", [
    "Name:    $name", "Email:   $email", "Phone:   $phone", "Who:     $role", "Wall:    $wall",
    "Where:   $where", "Area:    " . ($area === '' ? 'not given' : "$area m2"), "Place:   $place",
    '', 'Message:', $message, '', 'Consent to be contacted: yes, ' . gmdate('Y-m-d H:i') . ' UTC',
]);
$subject = '=?UTF-8?B?' . base64_encode('Commission request: ' . mb_substr($name, 0, 40, 'UTF-8') . ($area !== '' ? ", $area m2" : '')) . '?=';
$headers = [
    'From' => 'Modiwall website <' . MAIL_FROM . '>',
    'Reply-To' => $email, // validated above, control characters already removed
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'Content-Transfer-Encoding' => 'base64',
];
if (!@mail(MAIL_TO, $subject, chunk_split(base64_encode($body)), $headers)) {
    error_log('modiwall quote: mail() failed');
    finish(500, false, 'Your request was not sent. What you typed is still here, so you can try again.');
}
finish(200, true);
