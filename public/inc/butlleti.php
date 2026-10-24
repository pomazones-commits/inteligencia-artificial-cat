<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Butlletí setmanal «La setmana d'IA, en cinc minuts» — enviament des del web
// (17.10.2026).
//
// Per què: el connector de Gmail que feia servir la tasca setmanal esborra totes
// les <img> i fa passar cada enllaç per google.com/url (amb un avís de
// redireccionament). Enviat des d'aquí, el butlletí porta les fotos i els
// enllaços van directes a la notícia.
//
// Altes noves: immediates, amb correu de benvinguda (vegeu butlleti_alta_nova).
// Fitxers (tots NOMÉS al servidor, bloquejats per HTTP a .htaccess):
//   data/subscribers.csv          altes del formulari (api.php), com sempre
//   data/butlleti-confirmats.txt  llista inicial (una adreça per línia) que
//                                 en Rafael puja un sol cop: qui ja rebia el butlletí
//   data/butlleti-estat.json      estat de cada adreça i registre d'enviaments
//   data/butlleti-secret.txt      clau de les signatures (es crea sola)
//   data/butlleti.lock / .log     bloqueig i registre
// Al repositori (públic): data/butlleti/<núm>.json, l'edició que s'ha d'enviar.
//
// Estats d'una adreça: confirmat (rep el butlletí) · baixa (s'ha donat de baixa)
// · exclos (bots i proves de la llista antiga, o adreça treta per la redacció).
// ---------------------------------------------------------------------------

const BUTLLETI_BASE = 'https://inteligencia-artificial.cat';
const BUTLLETI_REDACCIO = 'pomazona@gmail.com';
// Adreces d'en Rafael: reben l'exemplar de la redacció i l'informe, mai com a subscriptors.
const BUTLLETI_REDACCIO_ALIES = ['pomazona@gmail.com', 'pomazon@hotmail.es'];
const BUTLLETI_REMITENT = 'no-reply@inteligencia-artificial.cat';
const BUTLLETI_NOM_REMITENT = "La setmana d'IA · inteligencia-artificial.cat";
const BUTLLETI_MAX_PER_PASSADA = 150;
// Límit d'enviament del servidor (24.10.2026). Al núm. 13, el primer enviat des
// del web, Hostinger va acceptar 10 correus i va rebutjar els 38 següents de cop:
// mail() torna false quan el servidor frena els enviaments. Per això:
//  - pausa d'1 s entre correus (abans, 0,2 s);
//  - dues fallades seguides = el servidor ha frenat: s'atura la passada i les
//    adreces que han fallat NO compten per als 3 intents (compten a part, a
//    "limit", amb un sostre molt més alt), i la passada següent continua;
//  - una fallada aïllada (el correu següent sí que surt) és un error de l'adreça
//    i compta per als 3 intents, com abans;
//  - l'estat es desa cada 10 correus, perquè un tall a mitges no faci repetir.
const BUTLLETI_PAUSA_US = 1000000;
const BUTLLETI_FALLADES_SEGUIDES = 2;
const BUTLLETI_MAX_INTENTS = 3;
const BUTLLETI_MAX_PASSADES_LIMIT = 16;
const BUTLLETI_DESA_CADA = 10;
// Recordatori (encàrrec d'en Rafael del 24.10.2026): quan s'acostin als 100
// subscriptors, passar a SMTP autenticat o a un servei de butlletins.
const BUTLLETI_AVIS_SUBSCRIPTORS = 90;

function butlleti_dir(): string
{
    return dirname(__DIR__) . '/data';
}

function butlleti_simula(): bool
{
    // Proves locals: BUTLLETI_SIMULA=1 escriu els correus a data/butlleti-simulats/ en lloc d'enviar-los.
    return getenv('BUTLLETI_SIMULA') === '1';
}

function butlleti_log(string $linia): void
{
    @file_put_contents(butlleti_dir() . '/butlleti.log', date('c') . ' ' . $linia . PHP_EOL, FILE_APPEND | LOCK_EX);
}

function butlleti_secret(): string
{
    $ruta = butlleti_dir() . '/butlleti-secret.txt';
    if (is_file($ruta)) {
        $s = trim((string) file_get_contents($ruta));
        if (strlen($s) >= 32) { return $s; }
    }
    $s = bin2hex(random_bytes(32));
    @file_put_contents($ruta, $s . "\n", LOCK_EX);
    @chmod($ruta, 0600);
    return $s;
}

function butlleti_normalitza(string $correu): string
{
    return strtolower(trim($correu));
}

function butlleti_signa(string $accio, string $correu): string
{
    return substr(hash_hmac('sha256', $accio . ':' . butlleti_normalitza($correu), butlleti_secret()), 0, 32);
}

function butlleti_codifica(string $correu): string
{
    return rtrim(strtr(base64_encode(butlleti_normalitza($correu)), '+/', '-_'), '=');
}

function butlleti_descodifica(string $e): ?string
{
    $c = base64_decode(strtr($e, '-_', '+/'), true);
    if ($c === false) { return null; }
    $c = filter_var($c, FILTER_VALIDATE_EMAIL);
    return $c ? butlleti_normalitza($c) : null;
}

function butlleti_enllac(string $pagina, string $accio, string $correu): string
{
    return BUTLLETI_BASE . '/' . $pagina . '?e=' . butlleti_codifica($correu) . '&t=' . butlleti_signa($accio, $correu);
}

/** Retorna el correu si l'enllaç signat és vàlid; si no, null. */
function butlleti_valida_enllac(string $accio, string $e, string $t): ?string
{
    $correu = butlleti_descodifica($e);
    if ($correu === null || preg_match('/^[0-9a-f]{32}$/', $t) !== 1) { return null; }
    return hash_equals(butlleti_signa($accio, $correu), $t) ? $correu : null;
}

// ---------------------------------------------------------------------------
// Estat (lectura i modificació atòmica amb bloqueig)
// ---------------------------------------------------------------------------

function butlleti_ruta_estat(): string
{
    return butlleti_dir() . '/butlleti-estat.json';
}

function butlleti_llegeix_estat(): array
{
    $ruta = butlleti_ruta_estat();
    $estat = is_file($ruta) ? json_decode((string) file_get_contents($ruta), true) : null;
    if (!is_array($estat)) { $estat = []; }
    $estat += ['adreces' => [], 'enviaments' => [], 'migrat' => null];
    return $estat;
}

/** $canvi rep l'estat i el retorna modificat (o null per no escriure). */
function butlleti_modifica_estat(callable $canvi): mixed
{
    $dir = butlleti_dir();
    if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
    $pany = @fopen($dir . '/butlleti-estat.lock', 'c');
    if (!$pany || !flock($pany, LOCK_EX)) { return null; }
    try {
        $estat = butlleti_migra(butlleti_llegeix_estat());
        $resultat = null;
        $nou = $canvi($estat, $resultat);
        if (is_array($nou)) {
            $tmp = butlleti_ruta_estat() . '.tmp';
            $json = json_encode($nou, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
            if ($json !== false && file_put_contents($tmp, $json . "\n") !== false) {
                rename($tmp, butlleti_ruta_estat());
                @chmod(butlleti_ruta_estat(), 0600);
            }
        }
        return $resultat;
    } finally {
        flock($pany, LOCK_UN);
        fclose($pany);
    }
}

/** Correus del formulari (subscribers.csv), en minúscules i sense repetir. */
function butlleti_csv(): array
{
    $ruta = butlleti_dir() . '/subscribers.csv';
    $sortida = [];
    foreach ((is_file($ruta) ? (file($ruta, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: []) : []) as $linia) {
        $parts = explode(',', $linia, 2);
        $correu = filter_var(trim($parts[1] ?? $parts[0]), FILTER_VALIDATE_EMAIL);
        if ($correu) { $sortida[butlleti_normalitza($correu)] = trim($parts[0]); }
    }
    return $sortida;
}

/**
 * Migració d'un sol cop: quan apareix data/butlleti-confirmats.txt, les adreces
 * que hi consten passen a «confirmat»; la resta del CSV antic, a «exclos» (bots,
 * proves i adreces que en Rafael va decidir deixar fora). Les altes posteriors
 * entren directament (alta immediata amb correu de benvinguda).
 */
function butlleti_migra(array $estat): array
{
    if ($estat['migrat']) { return $estat; }
    $ruta = butlleti_dir() . '/butlleti-confirmats.txt';
    if (!is_file($ruta)) { return $estat; }
    $ara = date('c');
    foreach (file($ruta, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [] as $linia) {
        $linia = trim($linia);
        if ($linia === '' || $linia[0] === '#') { continue; }
        $correu = filter_var($linia, FILTER_VALIDATE_EMAIL);
        if (!$correu) { continue; }
        $estat['adreces'][butlleti_normalitza($correu)] = ['estat' => 'confirmat', 'des_de' => $ara, 'origen' => 'llista inicial'];
    }
    foreach (butlleti_csv() as $correu => $_) {
        if (!isset($estat['adreces'][$correu])) {
            $estat['adreces'][$correu] = ['estat' => 'exclos', 'des_de' => $ara, 'origen' => 'CSV antic, fora de la llista inicial'];
        }
    }
    $estat['migrat'] = $ara;
    butlleti_log('migracio llista inicial: ' . count(array_filter($estat['adreces'], static fn($a) => $a['estat'] === 'confirmat')) . ' confirmades');
    return $estat;
}

function butlleti_canvia_estat(string $correu, string $nouEstat, string $origen): void
{
    $correu = butlleti_normalitza($correu);
    butlleti_modifica_estat(static function (array $estat, &$res) use ($correu, $nouEstat, $origen): array {
        $estat['adreces'][$correu] = ['estat' => $nouEstat, 'des_de' => date('c'), 'origen' => $origen]
            + ($estat['adreces'][$correu] ?? []);
        $res = true;
        return $estat;
    });
}

function butlleti_estat_de(string $correu): ?string
{
    $estat = butlleti_migra(butlleti_llegeix_estat());
    return $estat['adreces'][butlleti_normalitza($correu)]['estat'] ?? null;
}

// ---------------------------------------------------------------------------
// Correu
// ---------------------------------------------------------------------------

function butlleti_capcalera_utf8(string $text): string
{
    return '=?UTF-8?B?' . base64_encode($text) . '?=';
}

/** Envia un correu HTML + text. $extra: capçaleres addicionals. */
function butlleti_envia_correu(string $a, string $assumpte, string $html, string $text, array $extra = []): bool
{
    $limit = 'b' . bin2hex(random_bytes(12));
    $capceleres = array_merge([
        'From: ' . butlleti_capcalera_utf8(BUTLLETI_NOM_REMITENT) . ' <' . BUTLLETI_REMITENT . '>',
        'Reply-To: ' . BUTLLETI_REDACCIO,
        'MIME-Version: 1.0',
        'Content-Type: multipart/alternative; boundary="' . $limit . '"',
    ], $extra);
    $cos = "--$limit\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($text))
        . "--$limit\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n"
        . chunk_split(base64_encode($html))
        . "--$limit--\r\n";
    if (butlleti_simula()) {
        // Proves: BUTLLETI_SIMULA_ACCEPTA=N fa que el «servidor» accepti només N correus per
        // procés (com el límit d'Hostinger); BUTLLETI_SIMULA_FALLA=a@b,c@d fa fallar sempre aquestes adreces.
        static $acceptats = 0;
        $falla = array_filter(explode(',', (string) getenv('BUTLLETI_SIMULA_FALLA')));
        if (in_array($a, $falla, true)) { return false; }
        $maxim = getenv('BUTLLETI_SIMULA_ACCEPTA');
        if ($maxim !== false && $maxim !== '' && $acceptats >= (int) $maxim) { return false; }
        $acceptats++;
        $dir = butlleti_dir() . '/butlleti-simulats';
        if (!is_dir($dir)) { @mkdir($dir, 0755, true); }
        file_put_contents($dir . '/' . date('YmdHis') . '-' . bin2hex(random_bytes(3)) . '.eml',
            'To: ' . $a . "\r\nSubject: " . butlleti_capcalera_utf8($assumpte) . "\r\n" . implode("\r\n", $capceleres) . "\r\n\r\n" . $cos);
        return true;
    }
    return @mail($a, butlleti_capcalera_utf8($assumpte), $cos, implode("\r\n", $capceleres), '-f ' . BUTLLETI_REMITENT);
}

function butlleti_esc(string $s): string
{
    return htmlspecialchars($s, ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

/** Correu breu amb format senzill (confirmacions, avisos i informes). */
function butlleti_correu_simple(string $a, string $assumpte, array $paragrafs, ?array $boto = null, ?array $nota = null): bool
{
    $html = '<!DOCTYPE html><html lang="ca"><head><meta charset="utf-8"></head><body style="margin:0;padding:24px;background-color:#e9e5de;">'
        . '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center">'
        . '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="width:560px;max-width:560px;">'
        . '<tr><td bgcolor="#0b0c11" style="background-color:#0b0c11;padding:20px 28px;font-family:Helvetica,Arial,sans-serif;font-size:20px;line-height:26px;color:#ffffff;font-weight:bold;">La setmana d\'IA, en cinc minuts</td></tr>'
        . '<tr><td bgcolor="#ffffff" style="background-color:#ffffff;padding:24px 28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:24px;color:#26241f;">';
    $text = '';
    foreach ($paragrafs as $p) {
        $html .= '<p style="margin:0 0 14px 0;">' . butlleti_esc($p) . '</p>';
        $text .= $p . "\n\n";
    }
    if ($boto) {
        $html .= '<p style="margin:20px 0 6px 0;"><a href="' . butlleti_esc($boto[1]) . '" style="display:inline-block;background-color:#08080c;color:#d8ff32;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:bold;text-decoration:none;padding:12px 20px;">' . butlleti_esc($boto[0]) . '</a></p>';
        $text .= $boto[0] . ': ' . $boto[1] . "\n";
    }
    if ($nota) {
        $html .= '<p style="margin:18px 0 0 0;font-size:13px;line-height:20px;color:#5c5a55;"><a href="' . butlleti_esc($nota[1]) . '" style="color:#5c5a55;text-decoration:underline;">' . butlleti_esc($nota[0]) . '</a></p>';
        $text .= "\n" . $nota[0] . ' ' . $nota[1] . "\n";
    }
    $html .= '</td></tr><tr><td bgcolor="#08080c" style="background-color:#08080c;padding:14px 28px;font-family:\'Courier New\',Courier,monospace;font-size:11px;line-height:17px;color:#9a978f;">'
        . '<a href="' . BUTLLETI_BASE . '/" style="color:#9a978f;">inteligencia-artificial.cat</a> · una iniciativa de l\'Associació Amics de la Ciència</td></tr></table></td></tr></table></body></html>';
    return butlleti_envia_correu($a, $assumpte, $html, $text);
}

// ---------------------------------------------------------------------------
// Altes noves (decisió d'en Rafael del 17.10.2026): alta IMMEDIATA, sense
// botó de confirmació. L'alta rep un correu de benvinguda informatiu (amb un
// enllaç per si no s'hi ha apuntat ella) i en Rafael rep l'avís amb un botó per
// treure l'adreça si li sembla dubtosa. Els bots els para el formulari (api.php).
// ---------------------------------------------------------------------------

/**
 * Cridada per api.php després de desar l'alta al CSV. Retorna 'nova', 'ja-hi-era'
 * o 'treta' (adreça que en Rafael va treure: no es torna a afegir).
 */
function butlleti_alta_nova(string $correu): string
{
    $correu = butlleti_normalitza($correu);
    if (in_array($correu, BUTLLETI_REDACCIO_ALIES, true)) { return 'ja-hi-era'; }
    $resultat = butlleti_modifica_estat(static function (array $estat, &$res) use ($correu): ?array {
        $actual = $estat['adreces'][$correu] ?? null;
        if ($actual && $actual['estat'] === 'confirmat') { $res = 'ja-hi-era'; return null; }
        if ($actual && $actual['estat'] === 'exclos' && ($actual['origen'] ?? '') === 'treta per la redacció') { $res = 'treta'; return null; }
        $estat['adreces'][$correu] = ['estat' => 'confirmat', 'des_de' => date('c'), 'origen' => 'formulari'];
        $res = 'nova';
        return $estat;
    });
    if ($resultat !== 'nova') { return (string) $resultat; }
    $ok = butlleti_correu_simple($correu, "Gràcies per apuntar-te a «La setmana d'IA, en cinc minuts»", [
        "Hola,",
        "Ja ets a la llista del butlletí d'inteligencia-artificial.cat. Cada dissabte rebràs «La setmana d'IA, en cinc minuts»: cinc històries de la setmana, una idea per pensar, una eina útil i el llibre del mes del club de lectura, tot en català.",
        "No cal que facis res més. Si tens cap suggeriment, respon aquest correu i ens arribarà.",
    ], null, ["Si no t'hi has apuntat tu, clica aquí i no rebràs res més.", butlleti_enllac('butlleti-baixa.php', 'baixa', $correu)]);
    butlleti_log('alta nova ' . substr(sha1($correu), 0, 10) . ' benvinguda mail()=' . ($ok ? 'OK' : 'ERROR'));
    return 'nova';
}

/** Enllaç per a l'avís a la redacció: treu l'adreça de la llista amb un clic. */
function butlleti_enllac_treu(string $correu): string
{
    return butlleti_enllac('butlleti-baixa.php', 'treu', $correu) . '&r=1';
}

// ---------------------------------------------------------------------------
// Edicions i enviament
// ---------------------------------------------------------------------------

/** Edicions a data/butlleti/<núm>.json, ordenades per número. */
function butlleti_edicions(): array
{
    $sortida = [];
    foreach (glob(butlleti_dir() . '/butlleti/*.json') ?: [] as $ruta) {
        $e = json_decode((string) file_get_contents($ruta), true);
        if (!is_array($e) || !isset($e['num'], $e['assumpte'], $e['html'], $e['text'])) { continue; }
        // Una edició real s'envia un sol cop per número; una prova, un cop per cada versió de l'HTML.
        $e['clau'] = empty($e['prova']) ? 'num-' . (int) $e['num'] : 'prova-' . (int) $e['num'] . '-' . substr(sha1((string) $e['html']), 0, 8);
        $sortida[] = $e;
    }
    usort($sortida, static fn($a, $b) => (int) $a['num'] <=> (int) $b['num']);
    return $sortida;
}

function butlleti_destinataris(array $estat): array
{
    $llista = [];
    foreach ($estat['adreces'] as $correu => $a) {
        if (($a['estat'] ?? '') === 'confirmat' && !in_array($correu, BUTLLETI_REDACCIO_ALIES, true)) { $llista[] = $correu; }
    }
    sort($llista);
    return $llista;
}

function butlleti_personalitza(string $plantilla, string $correu): string
{
    return str_replace('{{BAIXA_URL}}', butlleti_enllac('butlleti-baixa.php', 'baixa', $correu), $plantilla);
}

/**
 * Envia les edicions pendents. És idempotent: cada adreça enviada queda
 * anotada (com a resum, no en clar) i una edició no es torna a enviar mai.
 * Retorna un resum sense cap adreça.
 */
function butlleti_processa(): array
{
    $resum = [];
    $pany = @fopen(butlleti_dir() . '/butlleti.lock', 'c');
    if (!$pany || !flock($pany, LOCK_EX | LOCK_NB)) { return ['ocupat' => true]; }
    try {
        foreach (butlleti_edicions() as $ed) {
            $clau = $ed['clau'];
            $quan = isset($ed['enviar_a_partir_de']) ? strtotime((string) $ed['enviar_a_partir_de']) : 0;
            if ($quan && $quan > time()) { $resum[$clau] = 'programada'; continue; }
            $estat = butlleti_migra(butlleti_llegeix_estat());
            $reg = $estat['enviaments'][$clau] ?? null;
            if ($reg && !empty($reg['fi'])) { continue; }
            if (empty($ed['prova']) && !$estat['migrat']) { $resum[$clau] = 'espera la llista inicial (butlleti-confirmats.txt)'; continue; }

            // Destinataris: la prova, només a la redacció; l'edició real, a tots els confirmats + la redacció.
            $dest = !empty($ed['prova']) ? [BUTLLETI_REDACCIO] : array_merge([BUTLLETI_REDACCIO], butlleti_destinataris($estat));
            // Registres d'abans del 24.10.2026 (sense "limit"): totes les fallades venien del
            // límit del servidor (núm. 13: 10 enviats i 38 fallits de cop), no de les adreces.
            if ($reg && !array_key_exists('limit', $reg) && !empty($reg['errors'])) {
                $reg['limit'] = $reg['errors'];
                $reg['errors'] = [];
            }
            $fets = array_flip($reg['enviats'] ?? []);
            $errors = $reg['errors'] ?? [];       // fallades aïllades: errors de l'adreça (sostre 3)
            $limit = $reg['limit'] ?? [];         // fallades en ratxa: el servidor ha frenat (sostre 16)
            $abandonats = $reg['abandonats'] ?? [];
            $comptador = 0;
            $ratxa = [];                           // adreces que han fallat seguides en aquesta passada
            $frenat = false;

            // Desa el registre de l'edició (també a mitja passada, perquè un tall no faci repetir enviaments).
            $desa = static function (bool $tancat) use ($clau, $ed, $reg, $dest, &$fets, &$errors, &$limit, &$abandonats): int {
                $pendents = count(array_filter($dest, static fn($c) => !isset($fets[substr(sha1($c), 0, 16)])));
                $nouReg = [
                    'num' => (int) $ed['num'], 'assumpte' => (string) $ed['assumpte'], 'prova' => !empty($ed['prova']),
                    'inici' => $reg['inici'] ?? date('c'), 'total' => count($dest),
                    'enviats' => array_keys($fets), 'errors' => $errors, 'limit' => $limit,
                    'abandonats' => array_values(array_unique($abandonats)),
                    'fi' => ($tancat && $pendents === 0) ? date('c') : null,
                ];
                butlleti_modifica_estat(static function (array $e, &$res) use ($clau, $nouReg): array {
                    $e['enviaments'][$clau] = $nouReg; $res = true; return $e;
                });
                return $pendents;
            };
            // Les adreces de la ratxa: si després ha sortit un correu, eren errors de l'adreça;
            // si la passada s'atura per la ratxa, era el servidor que frenava.
            $tanca_ratxa = static function (bool $eraLimit) use (&$ratxa, &$errors, &$limit, &$fets, &$abandonats): void {
                foreach ($ratxa as $h) {
                    // Una adreça que ja havia fallat sola (amb altres correus sortint bé) és
                    // sospitosa: la seva fallada compta com a error encara que tanqui la passada.
                    if ($eraLimit && empty($errors[$h])) {
                        $limit[$h] = ($limit[$h] ?? 0) + 1;
                        if ($limit[$h] >= BUTLLETI_MAX_PASSADES_LIMIT) { $fets[$h] = true; $abandonats[] = $h; }
                    } else {
                        $errors[$h] = ($errors[$h] ?? 0) + 1;
                        if ($errors[$h] >= BUTLLETI_MAX_INTENTS) { $fets[$h] = true; $abandonats[] = $h; }
                    }
                }
                $ratxa = [];
            };

            foreach ($dest as $correu) {
                $h = substr(sha1($correu), 0, 16);
                if (isset($fets[$h])) { continue; }
                if ($comptador >= BUTLLETI_MAX_PER_PASSADA) { break; }
                if ($comptador > 0 && !butlleti_simula()) { usleep(BUTLLETI_PAUSA_US); }
                $baixa = butlleti_enllac('butlleti-baixa.php', 'baixa', $correu);
                $ok = butlleti_envia_correu($correu, (string) $ed['assumpte'],
                    butlleti_personalitza((string) $ed['html'], $correu),
                    butlleti_personalitza((string) $ed['text'], $correu),
                    ['List-Unsubscribe: <' . $baixa . '>, <mailto:' . BUTLLETI_REDACCIO . '?subject=baixa>',
                     'List-Unsubscribe-Post: List-Unsubscribe=One-Click']);
                $comptador++;
                if ($ok) {
                    $tanca_ratxa(false);
                    $fets[$h] = true;
                } else {
                    $ratxa[] = $h;
                    if (count($ratxa) >= BUTLLETI_FALLADES_SEGUIDES) { $frenat = true; break; }
                }
                if ($comptador % BUTLLETI_DESA_CADA === 0) { $desa(false); }
            }
            // Una ratxa que queda oberta al final (amb fallades seguides o sense cap correu
            // després) es tracta com a límit del servidor: no gasta els 3 intents de l'adreça.
            $tanca_ratxa(true);
            $pendents = $desa(true);
            $abandonats = array_values(array_unique($abandonats));
            $fallits = count($abandonats);
            $ambLimit = count(array_filter($limit, static fn($n) => $n > 0));
            butlleti_log("edicio $clau: enviats " . (count($fets) - $fallits) . '/' . count($dest) . ", fallits $fallits, pendents $pendents"
                . ($frenat ? ', passada aturada: el servidor ha frenat els enviaments' : ''));
            $resum[$clau] = ['total' => count($dest), 'fets' => count($fets) - $fallits, 'fallits' => $fallits, 'pendents' => $pendents, 'frenat' => $frenat];

            if ($pendents === 0 && empty($ed['prova'])) {
                $actius = count($dest) - 1;
                $paragrafs = [
                    'El butlletí núm. ' . (int) $ed['num'] . ' («' . $ed['assumpte'] . '») s\'ha enviat des del web.',
                    'Destinataris: ' . $actius . ' subscriptors confirmats, més aquesta bústia. Correus acceptats pel servidor: ' . (count($fets) - $fallits) . ' de ' . count($dest) . '. Fallits: ' . $fallits . '.',
                    'Subscriptors actius: ' . $actius . '. Baixes acumulades: ' . count(array_filter($estat['adreces'], static fn($a) => ($a['estat'] ?? '') === 'baixa')) . '.',
                ];
                if ($ambLimit > 0) {
                    $paragrafs[] = 'El servidor va frenar els enviaments, i el butlletí ha sortit en diverses passades (aproximadament cada 30 minuts).';
                }
                if ($actius >= BUTLLETI_AVIS_SUBSCRIPTORS) {
                    $paragrafs[] = '⚠️ Recordatori: ja sou ' . $actius . ' subscriptors i us acosteu als 100. És el moment de passar l\'enviament a l\'SMTP autenticat d\'Hostinger o a un servei de butlletins (Brevo, MailerLite), com es va acordar el 24.10.2026.';
                }
                butlleti_correu_simple(BUTLLETI_REDACCIO, 'IA.cat: butlletí núm. ' . (int) $ed['num'] . ' enviat', $paragrafs);
            }
        }
    } finally {
        flock($pany, LOCK_UN);
        fclose($pany);
    }
    return $resum;
}

/** Pàgina senzilla per a confirma i baixa. */
function butlleti_pagina(string $titol, string $cosHtml): never
{
    header('Content-Type: text/html; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Robots-Tag: noindex, nofollow');
    echo '<!DOCTYPE html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="robots" content="noindex,nofollow"><title>' . butlleti_esc($titol) . ' · inteligencia-artificial.cat</title>'
        . '<style>body{margin:0;background:#e9e5de;font-family:Helvetica,Arial,sans-serif;color:#26241f}main{max-width:560px;margin:8vh auto;background:#fff;padding:32px 28px}'
        . 'h1{font-size:24px;margin:0 0 14px}p{line-height:1.6}button{background:#08080c;color:#d8ff32;border:0;padding:12px 20px;font-size:15px;font-weight:bold;cursor:pointer}a{color:#1b4a8a}</style></head>'
        . '<body><main><h1>' . butlleti_esc($titol) . '</h1>' . $cosHtml . '<p><a href="' . BUTLLETI_BASE . '/">Torna a inteligencia-artificial.cat</a></p></main></body></html>';
    exit;
}
