<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Club de lectura sobre IA (08.10.2026) — peces compartides.
//
//  - Llibres: public/data/club-lectura.json (MANUAL, al repositori).
//  - Opinions dels lectors: public/data/club-opinions.json. ⚠️ NOMÉS existeix
//    al servidor: no és al repositori (vegeu .gitignore) i .htaccess en
//    bloqueja la descàrrega. El desplegament (rsync sense --delete) no la toca.
//    Si es migra l'allotjament, s'ha de copiar a mà com subscribers.csv.
//  - Clau de moderació: public/data/club-secret.txt, també només al servidor.
//    La crea api.php el primer cop; si es perd, se'n crea una de nova i els
//    enllaços de moderació antics deixen de funcionar (cap altre efecte).
//  - Portades: public/assets/club/<id>.jpg. Tampoc no són al repositori:
//    club_portada() les baixa d'Amazon UNA sola vegada i a partir d'aleshores
//    se serveixen des del nostre servidor (cap petició del lector a tercers).
//
// Fan servir aquest fitxer: club-de-lectura.php, club-modera.php i api.php.
// ---------------------------------------------------------------------------

require_once __DIR__ . '/peces.php';

const CLUB_CAMI = '/club-de-lectura';

function club_dir_dades(): string
{
    return dirname(__DIR__) . '/data';
}

/** Dades del club (llibres, temes, llibre del mes). [] si el fitxer falta. */
function club_dades(): array
{
    static $dades = null;
    if ($dades !== null) { return $dades; }
    $ruta = club_dir_dades() . '/club-lectura.json';
    $v = is_file($ruta) ? json_decode((string) file_get_contents($ruta), true) : null;
    $dades = is_array($v) ? $v : [];
    return $dades;
}

/** Llibre per identificador, o null. */
function club_llibre(string $id): ?array
{
    foreach ((array) (club_dades()['llibres'] ?? []) as $b) {
        if (is_array($b) && ($b['id'] ?? '') === $id) { return $b; }
    }
    return null;
}

function club_tema(string $id): ?array
{
    foreach ((array) (club_dades()['temes'] ?? []) as $t) {
        if (is_array($t) && ($t['id'] ?? '') === $id) { return $t; }
    }
    return null;
}

/** Títol principal (abans del primer «. ») i subtítol. */
function club_titol_parts(string $titol): array
{
    $pos = mb_strpos($titol, '. ');
    if ($pos === false) { return [$titol, '']; }
    return [mb_substr($titol, 0, $pos), mb_substr($titol, $pos + 2)];
}

// ---------------------------------------------------------------------------
// Opinions (només servidor)
// ---------------------------------------------------------------------------

function club_ruta_opinions(): string
{
    return club_dir_dades() . '/club-opinions.json';
}

/** Totes les opinions, en qualsevol estat. */
function club_opinions_totes(): array
{
    $ruta = club_ruta_opinions();
    if (!is_file($ruta)) { return []; }
    $v = json_decode((string) file_get_contents($ruta), true);
    return is_array($v['opinions'] ?? null) ? $v['opinions'] : [];
}

/** Opinions aprovades d'un llibre, de la més antiga a la més nova. */
function club_opinions_aprovades(string $llibre): array
{
    $sortida = array_values(array_filter(club_opinions_totes(), static fn($o) =>
        is_array($o) && ($o['llibre'] ?? '') === $llibre && ($o['estat'] ?? '') === 'aprovada'));
    usort($sortida, static fn($a, $b) => strcmp((string) ($a['data'] ?? ''), (string) ($b['data'] ?? '')));
    return $sortida;
}

/** [nombre d'opinions aprovades, mitjana de les valoracions dels lectors o null]. */
function club_resum_lectors(string $llibre): array
{
    $ops = club_opinions_aprovades($llibre);
    $notes = array_values(array_filter(array_map(static fn($o) => (int) ($o['estrelles'] ?? 0), $ops), static fn($n) => $n >= 1 && $n <= 5));
    return [count($ops), $notes ? round(array_sum($notes) / count($notes), 1) : null, count($notes)];
}

/**
 * Modifica el fitxer d'opinions de manera atòmica i amb bloqueig.
 * $canvi rep la llista i la retorna modificada (o null per no escriure res).
 */
function club_modifica_opinions(callable $canvi): bool
{
    $dir = club_dir_dades();
    if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
    $pany = @fopen($dir . '/club-opinions.lock', 'c');
    if (!$pany || !flock($pany, LOCK_EX)) { return false; }
    try {
        $llista = $canvi(club_opinions_totes());
        if ($llista === null) { return true; }
        $tmp = club_ruta_opinions() . '.tmp';
        $json = json_encode(['opinions' => array_values($llista)], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
        if ($json === false || file_put_contents($tmp, $json . "\n") === false) { return false; }
        return rename($tmp, club_ruta_opinions());
    } finally {
        flock($pany, LOCK_UN);
        fclose($pany);
    }
}

// ---------------------------------------------------------------------------
// Signatures (moderació i parany de temps del formulari)
// ---------------------------------------------------------------------------

function club_secret(): string
{
    $ruta = club_dir_dades() . '/club-secret.txt';
    if (is_file($ruta)) {
        $s = trim((string) file_get_contents($ruta));
        if (strlen($s) >= 32) { return $s; }
    }
    $s = bin2hex(random_bytes(32));
    @file_put_contents($ruta, $s . "\n", LOCK_EX);
    @chmod($ruta, 0600);
    return $s;
}

function club_signa(string $valor): string
{
    return substr(hash_hmac('sha256', $valor, club_secret()), 0, 32);
}

/** Segell del moment en què s'ha servit el formulari («temps.signatura»). */
function club_segell_formulari(): string
{
    $t = (string) time();
    return $t . '.' . club_signa('form:' . $t);
}

/** Segons des que es va servir el formulari, o null si el segell no és vàlid. */
function club_edat_segell(string $segell): ?int
{
    if (!preg_match('/^(\d{10})\.([0-9a-f]{32})$/', $segell, $m)) { return null; }
    if (!hash_equals(club_signa('form:' . $m[1]), $m[2])) { return null; }
    return time() - (int) $m[1];
}

function club_enllac_moderacio(string $id): string
{
    return IACAT_BASE . '/club-modera.php?id=' . rawurlencode($id) . '&t=' . club_signa('modera:' . $id);
}

function club_token_valid(string $id, string $token): bool
{
    return $id !== '' && preg_match('/^[0-9a-f]{32}$/', $token) === 1 && hash_equals(club_signa('modera:' . $id), $token);
}

// ---------------------------------------------------------------------------
// Portades
// ---------------------------------------------------------------------------

/**
 * Ruta pública de la portada (/assets/club/<id>.jpg) o '' si no n'hi ha.
 * Si encara no és al servidor, la baixa d'Amazon (una sola vegada; si falla,
 * no ho torna a provar fins al cap d'un dia). Límit de temps per petició perquè
 * la primera visita no s'allargui.
 */
function club_portada(array $b): string
{
    static $inici = null;
    $inici ??= microtime(true);
    $id = (string) ($b['id'] ?? '');
    $img = (string) ($b['portada'] ?? '');
    if (!preg_match('/^[a-z0-9-]{3,90}$/', $id)) { return ''; }
    $dir = dirname(__DIR__) . '/assets/club';
    $fitxer = $dir . '/' . $id . '.jpg';
    if (is_file($fitxer)) { return '/assets/club/' . $id . '.jpg?v=' . filemtime($fitxer); }
    if (!preg_match('/^[A-Za-z0-9+_-]{6,20}$/', $img)) { return ''; }
    $marca = $dir . '/.' . $id . '.error';
    if (is_file($marca) && filemtime($marca) > time() - 86400) { return ''; }
    if (microtime(true) - $inici > 3.0) { return ''; }
    if (!is_dir($dir)) { @mkdir($dir, 0755, true); }

    $url = 'https://m.media-amazon.com/images/I/' . $img . '._SY600_.jpg';
    $ctx = stream_context_create(['http' => ['timeout' => 3, 'user_agent' => 'IA.cat club de lectura (+https://inteligencia-artificial.cat/club-de-lectura)']]);
    $dades = ini_get('allow_url_fopen') ? @file_get_contents($url, false, $ctx) : false;
    if (!is_string($dades) && function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_TIMEOUT => 3, CURLOPT_FOLLOWLOCATION => true, CURLOPT_USERAGENT => 'IA.cat club de lectura']);
        $dades = curl_exec($ch);
        curl_close($ch);
    }
    $ok = is_string($dades) && strlen($dades) > 3000 && strlen($dades) < 2000000 && str_starts_with($dades, "\xFF\xD8");
    if (!$ok) { @touch($marca); return ''; }
    $tmp = $fitxer . '.tmp';
    if (@file_put_contents($tmp, $dades) === false || !@rename($tmp, $fitxer)) { return ''; }
    @unlink($marca);
    return '/assets/club/' . $id . '.jpg?v=' . filemtime($fitxer);
}

/** HTML d'una portada; si no n'hi ha, coberta tipogràfica. */
function club_portada_html(array $b, string $classe = 'club-portada', bool $mandrosa = true): string
{
    [$titol] = club_titol_parts((string) ($b['titol'] ?? ''));
    $src = club_portada($b);
    if ($src !== '') {
        return '<img class="' . iacat_e($classe) . '" src="' . iacat_e($src) . '" alt="Coberta de «' . iacat_e($titol) . '», de ' . iacat_e((string) ($b['autor'] ?? '')) . '"'
            . ($mandrosa ? ' loading="lazy"' : '') . ' decoding="async" width="400" height="600">';
    }
    return '<span class="' . iacat_e($classe) . ' club-portada--text" role="img" aria-label="Coberta de «' . iacat_e($titol) . '»"><strong>' . iacat_e($titol) . '</strong><span>' . iacat_e((string) ($b['autor'] ?? '')) . '</span></span>';
}

/** «★★★★☆» amb text accessible. */
function club_estrelles(?float $n, string $etiqueta = ''): string
{
    if ($n === null) { return ''; }
    $plenes = (int) round($n);
    $txt = str_repeat('★', $plenes) . str_repeat('☆', 5 - $plenes);
    $num = rtrim(rtrim(number_format($n, 1, ',', ''), '0'), ',');
    return '<span class="club-estrelles" role="img" aria-label="' . iacat_e(($etiqueta !== '' ? $etiqueta . ': ' : '') . $num . ' de 5') . '">' . $txt . '</span>';
}
