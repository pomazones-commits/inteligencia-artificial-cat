<?php
declare(strict_types=1);
// Dades de la banda «Les seccions» de la portada (20.10.2026, decisió d'en Rafael:
// «La tribuna» deixa de ser una secció i la seva banda de portada passa a mostrar la
// darrera peça signada de cadascuna de les sis seccions temàtiques).
// La pinta seccions-portada.js. Només llegeix les dades publicades.
//
// Peça de cada secció: la més recent signada per una persona (opinió, estudi, Veus de
// CIVICAi o Veus d'empresa); si la secció encara no en té cap, la més recent de la
// Redacció (l'anàlisi de la setmana o el Quadern IA).
//
// 29.10.2026 (decisió d'en Rafael): cap peça no surt dues vegades a la portada, i els
// articles dels convidats no se n'amaguen tan aviat.
//   1) Les peces que ja són visibles en una altra banda de la portada (la de «La tribuna»,
//      les de Veus de CIVICAi, la de Veus d'empresa i la de Veus de l'administració) no
//      surten aquí: la targeta de la seva secció passa a la peça següent.
//   2) Dins de cada secció tenen preferència les peces dels convidats (tribuna.js,
//      estudis.js i els seus arxius, sense «serie») de menys de CONVIDATS_DIES dies: quan
//      una peça surt de la banda de «La tribuna», es queda a la targeta de la seva secció
//      fins que una altra peça de convidats del mateix tema la rellevi.
// La regla de les bandes és la mateixa que aplica app.js; si la canvies allà, canvia-la aquí.
require_once __DIR__ . '/inc/eixos.php';
require_once __DIR__ . '/inc/peces.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');

function seccions_format(array $peca): string
{
    $serie = (string) ($peca['item']['serie'] ?? '');
    if ($serie === 'veus-de-civicai') { return 'Veus de CIVICAi'; }
    if ($serie === 'veus-de-l-administracio') { return 'Veus de l’administració'; }
    return [
        'tribuna' => 'La tribuna', 'estudis' => 'Estudi', 'empresa' => 'Veus d’empresa',
        'analisi' => 'Anàlisi de la setmana', 'quadern' => 'Quadern IA',
    ][$peca['tipus']] ?? '';
}

const SECCIONS_DIES_BANDA = 30;   // VEUS_DIES_MAX, EMPRESA_DIES_MAX i ADMIN_DIES_MAX d'app.js
const SECCIONS_CONVIDATS_DIES = 30;

function seccions_dies(array $peca): float
{
    $iso = (string) ($peca['dataIso'] ?? '');
    if ($iso === '') { return INF; }
    $avui = new DateTimeImmutable('today', new DateTimeZone('Europe/Madrid'));
    $dia = DateTimeImmutable::createFromFormat('!Y-m-d', substr($iso, 0, 10), new DateTimeZone('Europe/Madrid'));
    return $dia ? ($avui->getTimestamp() - $dia->getTimestamp()) / 86400 : INF;
}

function seccions_es_convidat(array $peca): bool
{
    return in_array($peca['tipus'], ['tribuna', 'estudis'], true)
        && (string) ($peca['item']['serie'] ?? '') === '';
}

// 03.11.2026 (decisió d'en Rafael): una peça es pot FIXAR a la targeta de la seva
// secció fins a una data (inclosa) amb data/portada-fixades.json. Una peça fixada passa
// al davant de tot (fins i tot dels convidats), però si ja surt en una altra banda de
// la portada continua sense repetir-se aquí. En passar la data, torna la regla normal.
function seccions_fixades(): array
{
    static $fixades = null;
    if ($fixades !== null) { return $fixades; }
    $fixades = [];
    $dades = json_decode((string) @file_get_contents(__DIR__ . '/data/portada-fixades.json'), true);
    $avui = (new DateTimeImmutable('today', new DateTimeZone('Europe/Madrid')))->format('Y-m-d');
    foreach ((array) ($dades['fixades'] ?? []) as $f) {
        $fins = (string) ($f['fins'] ?? '');
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fins) || $fins < $avui) { continue; }
        $fixades[(string) ($f['tipus'] ?? '') . '/' . (string) ($f['id'] ?? '')] = true;
    }
    return $fixades;
}

// 03.11.2026 (decisió d'en Rafael): quan una peça surt de la banda de «La tribuna», de
// Veus de CIVICAi o de Veus de l'administració, passa uns 4 dies (el dia que en surt i
// els 3 següents) al davant de la targeta de la seva secció. No hi passa si l'autor ja
// surt en una altra banda (p. ex. la columna anterior d'en Sanromà quan ja hi ha la nova).
// Veus d'empresa no hi entra. La llista la omple seccions_marca_sortides().
const SECCIONS_DIES_SORTIDA = 4;

function &seccions_sortides(): array
{
    static $sortides = [];
    return $sortides;
}

function seccions_grup(array $peca): int
{
    if (isset(seccions_fixades()[seccions_clau($peca)])) { return -2; }
    if (isset(seccions_sortides()[seccions_clau($peca)])) { return -1; }
    if (in_array($peca['tipus'], ['analisi', 'quadern'], true)) { return 2; }
    return seccions_es_convidat($peca) && seccions_dies($peca) <= SECCIONS_CONVIDATS_DIES ? 0 : 1;
}

function seccions_clau(array $peca): string
{
    return $peca['tipus'] . '/' . $peca['id'];
}

// Peces que app.js ja pinta en una altra banda de la portada (mateixa regla).
function seccions_a_la_portada(array $totes): array
{
    $vistes = [];
    $marca = static function (?array $p) use (&$vistes): void { if ($p) { $vistes[seccions_clau($p)] = $p; } };
    $serie = static fn(array $p): string => (string) ($p['item']['serie'] ?? '');

    // «La tribuna»: la més recent de les dues vigents (en cas d'empat, la de tribuna.js).
    $vigents = [];
    foreach (['tribuna', 'estudis'] as $tipus) {
        foreach ($totes as $p) {
            if ($p['tipus'] === $tipus && (int) ($p['idx'] ?? 0) === -1
                && !in_array($serie($p), ['veus-de-civicai', 'veus-de-l-administracio'], true)) { $vigents[] = $p; }
        }
    }
    $destacada = null;
    foreach ($vigents as $p) {
        if ($destacada === null || strcmp($p['dataIso'], $destacada['dataIso']) > 0) { $destacada = $p; }
    }
    $marca($destacada);

    // Veus de CIVICAi: la columna d'en Sanromà i la darrera d'un altre membre (< 30 dies).
    $veus = array_values(array_filter($totes, static fn(array $p): bool =>
        in_array($p['tipus'], ['tribuna', 'estudis'], true) && (int) ($p['idx'] ?? 0) >= 0 && $serie($p) === 'veus-de-civicai'));
    $columna = null; $altra = null;
    foreach ($veus as $p) {
        $esColumna = (bool) preg_match('/sanrom/i', (string) ($p['item']['author'] ?? ''));
        if ($esColumna && !$columna) { $columna = $p; }
        if (!$esColumna && !$altra && seccions_dies($p) <= SECCIONS_DIES_BANDA) { $altra = $p; }
    }
    $marca($columna);
    $marca($altra);
    if (!$columna && !$altra) { $marca($veus[0] ?? null); }

    // Veus d'empresa i Veus de l'administració: la més recent, si té menys de 30 dies.
    foreach ([
        static fn(array $p): bool => $p['tipus'] === 'empresa',
        static fn(array $p): bool => in_array($p['tipus'], ['tribuna', 'estudis'], true) && $serie($p) === 'veus-de-l-administracio',
    ] as $filtre) {
        foreach ($totes as $p) {
            if (!$filtre($p)) { continue; }
            if (seccions_dies($p) <= SECCIONS_DIES_BANDA) { $marca($p); }
            break;
        }
    }
    return $vistes;
}

// Dia en què cada peça va sortir (o sortirà) de la seva banda de la portada, amb la
// mateixa regla de seccions_a_la_portada(): la de «La tribuna» en surt quan es publica la
// peça següent de la rotació (tribuna o estudi sense sèrie); la columna d'en Sanromà,
// amb la columna següent; l'altra veu de CIVICAi i la de l'administració, amb la peça
// següent de la seva banda o, si no n'hi ha, quan fa SECCIONS_DIES_BANDA dies.
function seccions_dates_sortida(array $totes): array
{
    $serie = static fn(array $p): string => (string) ($p['item']['serie'] ?? '');
    $signada = static fn(array $p): bool => in_array($p['tipus'], ['tribuna', 'estudis'], true);
    $esSanroma = static fn(array $p): bool => (bool) preg_match('/sanrom/i', (string) ($p['item']['author'] ?? ''));
    $bandes = [
        'tribuna' => [static fn(array $p): bool => $signada($p) && !in_array($serie($p), ['veus-de-civicai', 'veus-de-l-administracio'], true), false],
        'columna' => [static fn(array $p): bool => $signada($p) && $serie($p) === 'veus-de-civicai' && $esSanroma($p), false],
        'civicai' => [static fn(array $p): bool => $signada($p) && $serie($p) === 'veus-de-civicai' && !$esSanroma($p), true],
        'admin' => [static fn(array $p): bool => $signada($p) && $serie($p) === 'veus-de-l-administracio', true],
    ];
    $sortida = [];
    foreach ($bandes as [$filtre, $caduca]) {
        $llista = array_values(array_filter($totes, $filtre));
        usort($llista, static fn(array $a, array $b): int => strcmp((string) $a['dataIso'], (string) $b['dataIso']));
        foreach ($llista as $i => $p) {
            $dia = substr((string) $p['dataIso'], 0, 10);
            if ($dia === '') { continue; }
            $fi = null;
            for ($j = $i + 1; $j < count($llista); $j++) {
                $seg = substr((string) $llista[$j]['dataIso'], 0, 10);
                if ($seg >= $dia) { $fi = $seg; break; }
            }
            if ($caduca) {
                $limit = (new DateTimeImmutable($dia, new DateTimeZone('Europe/Madrid')))
                    ->modify('+' . (SECCIONS_DIES_BANDA + 1) . ' days')->format('Y-m-d');
                if ($fi === null || $limit < $fi) { $fi = $limit; }
            }
            if ($fi !== null) { $sortida[seccions_clau($p)] = $fi; }
        }
    }
    return $sortida;
}

// Candidates de cada secció: primer les dels convidats (de menys de 30 dies), després
// la resta de signades per persones i, al final, les de la Redacció; dins de cada grup,
// de la més recent a la més antiga. Fora les que ja surten en una altra banda.
$totes = iacat_totes_les_peces();
$jaVistes = seccions_a_la_portada($totes);
$autorsBandes = [];
foreach ($jaVistes as $peca) {
    $autor = trim((string) ($peca['item']['author'] ?? ''));
    if ($autor !== '') { $autorsBandes[$autor] = true; }
}
$avuiIso = (new DateTimeImmutable('today', new DateTimeZone('Europe/Madrid')))->format('Y-m-d');
$sortides = &seccions_sortides();
foreach (seccions_dates_sortida($totes) as $clau => $fi) {
    $dies = (strtotime($avuiIso) - strtotime($fi)) / 86400;
    if ($dies >= 0 && $dies < SECCIONS_DIES_SORTIDA) { $sortides[$clau] = $fi; }
}
foreach ($totes as $peca) {
    if (isset($sortides[seccions_clau($peca)]) && isset($autorsBandes[trim((string) ($peca['item']['author'] ?? ''))])) {
        unset($sortides[seccions_clau($peca)]);
    }
}
unset($sortides);
$candidates = [];
foreach ($totes as $peca) {
    // 03.11.2026 (decisió d'en Rafael): Veus d'empresa només surt a la seva banda (una peça
    // cada 5 dies), mai a les targetes de «Les seccions».
    if (in_array($peca['tipus'], ['reflexio', 'empresa'], true) || isset($jaVistes[seccions_clau($peca)])) { continue; }
    $candidates[iacat_eix($peca['item'], seccions_clau($peca))][] = $peca;
}
foreach ($candidates as &$llista) {
    usort($llista, static fn(array $a, array $b): int => [seccions_grup($a), $b['dataIso']] <=> [seccions_grup($b), $a['dataIso']]);
}
unset($llista);

// Una peça per secció, sense repetir autor a la banda si es pot evitar (perquè una
// columna setmanal no ocupi mitja banda). Els autors que ja surten en una altra banda
// també compten com a usats.
// (Del 20 al 29.10.2026 la tribuna vigent també sortia aquí, a la targeta del seu tema;
// el 29.10.2026 en Rafael va decidir que cap peça no surti dues vegades a la portada.)
$millor = [];
$autorsUsats = [];
foreach ($jaVistes as $peca) {
    $autor = trim((string) ($peca['item']['author'] ?? ''));
    if ($autor !== '') { $autorsUsats[$autor] = true; }
}
foreach (array_keys(iacat_eixos()) as $clau) {
    $llista = $candidates[$clau] ?? [];
    $tria = null;
    foreach ($llista as $peca) {
        if (seccions_grup($peca) > seccions_grup($llista[0])) { break; }
        $autor = trim((string) ($peca['item']['author'] ?? ''));
        if ($autor === '' || !isset($autorsUsats[$autor])) { $tria = $peca; break; }
    }
    $tria = $tria ?? ($llista[0] ?? null);
    if ($tria) {
        $millor[$clau] = ['peca' => $tria];
        $autor = trim((string) ($tria['item']['author'] ?? ''));
        if ($autor !== '') { $autorsUsats[$autor] = true; }
    }
}

$sortida = [];
foreach (iacat_eixos() as $clau => $eix) {
    if (($eix['tipus'] ?? '') !== 'eix') { continue; }
    $p = $millor[$clau]['peca'] ?? null;
    $fila = ['clau' => $clau, 'nom' => (string) $eix['short'], 'url' => '/tema/' . $clau, 'peca' => null];
    if ($p) {
        $item = $p['item'];
        $foto = (string) ($item['photo'] ?? '');
        $fila['peca'] = [
            'titol' => $p['titol'],
            'url' => $p['url'],
            'format' => seccions_format($p),
            'autor' => trim((string) ($item['author'] ?? '')) ?: 'Redacció IA.cat',
            'data' => (string) ($item['date'] ?? ''),
            'foto' => $foto !== '' ? '/' . ltrim((string) preg_replace('#^\./#', '', $foto), '/') : '',
            'fotoAlt' => (string) ($item['photoAlt'] ?? ''),
        ];
    }
    $sortida[] = $fila;
}

echo json_encode(['seccions' => $sortida], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
