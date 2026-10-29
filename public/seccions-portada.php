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

function seccions_grup(array $peca): int
{
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

// Candidates de cada secció: primer les dels convidats (de menys de 30 dies), després
// la resta de signades per persones i, al final, les de la Redacció; dins de cada grup,
// de la més recent a la més antiga. Fora les que ja surten en una altra banda.
$totes = iacat_totes_les_peces();
$jaVistes = seccions_a_la_portada($totes);
$candidates = [];
foreach ($totes as $peca) {
    if ($peca['tipus'] === 'reflexio' || isset($jaVistes[seccions_clau($peca)])) { continue; }
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
