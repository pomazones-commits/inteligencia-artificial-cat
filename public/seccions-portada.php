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
        'tribuna' => 'Opinió', 'estudis' => 'Estudi', 'empresa' => 'Veus d’empresa',
        'analisi' => 'Anàlisi de la setmana', 'quadern' => 'Quadern IA',
    ][$peca['tipus']] ?? '';
}

function seccions_grup(array $peca): int
{
    return in_array($peca['tipus'], ['analisi', 'quadern'], true) ? 2 : 1;
}

// Candidates de cada secció: primer les signades per persones, després les de la
// Redacció; dins de cada grup, de la més recent a la més antiga.
$candidates = [];
foreach (iacat_totes_les_peces() as $peca) {
    if ($peca['tipus'] === 'reflexio') { continue; }
    $candidates[iacat_eix($peca['item'], $peca['tipus'] . '/' . $peca['id'])][] = $peca;
}
foreach ($candidates as &$llista) {
    usort($llista, static fn(array $a, array $b): int => [seccions_grup($a), $b['dataIso']] <=> [seccions_grup($b), $a['dataIso']]);
}
unset($llista);

// Una peça per secció, sense repetir autor a la banda si es pot evitar (perquè una
// columna setmanal no ocupi mitja banda).
$millor = [];
$autorsUsats = [];
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
