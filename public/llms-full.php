<?php
declare(strict_types=1);
// Versió completa per a models de llenguatge i agents d'IA (11.10.2026).
// Accessible com a /llms-full.txt gràcies a la regla de reescriptura del .htaccess.
// Complementa /llms.txt (estàtic, l'índex del web): aquí hi ha el CONTINGUT del
// dia en Markdown, perquè un agent no hagi de llegir HTML ni executar JavaScript.
//
// Només llegeix fitxers que ja genera el Content Hub (data/articles.json,
// radar.js) i les peces de fons a través d'inc/peces.php. No escriu res.
//
// 🛑 Les peces signades («La tribuna», «Estudis») hi surten NOMÉS amb el títol,
// l'autor, el resum i l'enllaç: l'autor ens ha cedit la publicació al web, no
// la difusió del text sencer en altres formats. Les notícies i les peces de la
// Redacció sí que hi van senceres.
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-cache, must-revalidate');
header('X-Robots-Tag: noindex');

require_once __DIR__ . '/inc/peces.php';
$base = IACAT_BASE;

$edicio = is_file(__DIR__ . '/data/articles.json')
    ? json_decode((string) file_get_contents(__DIR__ . '/data/articles.json'), true)
    : null;
if (!is_array($edicio)) { $edicio = ['items' => []]; }
$radar = iacat_llegeix_js('radar.js', 'IA_RADAR');
if (!is_array($radar)) { $radar = []; }

/** Text d'una sola línia (per a títols i entradetes). */
function lf_linia(string $text): string
{
    return trim((string) preg_replace('/\s+/u', ' ', $text));
}

/** Cos de text: paràgrafs separats per una línia en blanc, sense espais sobrers. */
function lf_cos(string $text): string
{
    $paragrafs = preg_split('/\n\s*\n/u', str_replace("\r", '', $text)) ?: [];
    $nets = [];
    foreach ($paragrafs as $p) { $p = lf_linia($p); if ($p !== '') { $nets[] = $p; } }
    return implode("\n\n", $nets);
}

$actualitzat = (string) ($edicio['updatedAt'] ?? '');
$actualitzatLocal = '';
if ($actualitzat !== '' && ($ts = strtotime($actualitzat)) !== false) {
    $dt = (new DateTimeImmutable('@' . $ts))->setTimezone(new DateTimeZone('Europe/Madrid'));
    $actualitzatLocal = $dt->format('d.m.Y H:i') . ' (hora de Barcelona)';
}

$sortida = [];
$sortida[] = '# intel·ligènciaartificial.cat — versió completa per a agents d\'IA';
$sortida[] = '';
$sortida[] = '> Briefing diari i independent sobre intel·ligència artificial, en català. Sense ànim de lucre (Associació Amics de la Ciència). Les notícies les redacta un procés automàtic amb Claude a partir de fonts públiques, sota la signatura «Redacció IA.cat»; cada notícia enllaça la seva font original.';
$sortida[] = '';
$sortida[] = 'Índex del web: ' . $base . '/llms.txt';
if ($actualitzatLocal !== '') { $sortida[] = 'Edició actualitzada: ' . $actualitzatLocal; }
$sortida[] = 'Per citar una notícia, enllaça la seva pàgina i, per a les dades, la font original que s\'hi indica.';
$sortida[] = '';

// 1. L'edició del dia, sencera.
$sortida[] = '## El senyal d\'avui (edició del dia)';
$sortida[] = '';
$items = array_values(array_filter((array) ($edicio['items'] ?? []), 'is_array'));
if (!$items) { $sortida[] = 'L\'edició d\'avui encara no s\'ha publicat.'; $sortida[] = ''; }
foreach ($items as $item) {
    $slug = (string) ($item['slug'] ?? '');
    $titol = lf_linia((string) ($item['title'] ?? ''));
    if ($slug === '' || $titol === '') { continue; }
    $sortida[] = '### ' . $titol;
    $sortida[] = '';
    $meta = ['Enllaç: ' . $base . '/article.php?slug=' . rawurlencode($slug)];
    if (!empty($item['category'])) { $meta[] = 'Categoria: ' . lf_linia((string) $item['category']); }
    $font = lf_linia((string) ($item['sourceName'] ?? ''));
    $fontUrl = (string) ($item['sourceUrl'] ?? '');
    if ($font !== '' || $fontUrl !== '') {
        $meta[] = 'Font original: ' . trim($font . ($fontUrl !== '' ? ' <' . $fontUrl . '>' : ''))
            . (!empty($item['sourceDate']) ? ', ' . lf_linia((string) $item['sourceDate']) : '');
    }
    foreach ($meta as $m) { $sortida[] = '- ' . $m; }
    $sortida[] = '';
    $entradeta = lf_linia((string) ($item['excerpt'] ?? ''));
    if ($entradeta !== '') { $sortida[] = '**' . $entradeta . '**'; $sortida[] = ''; }
    $cos = lf_cos(iacat_cos_text($item['body'] ?? ''));
    if ($cos !== '') { $sortida[] = $cos; $sortida[] = ''; }
}

// 2. El radar català.
if ($radar) {
    $sortida[] = '## La IA que passa aquí (radar català)';
    $sortida[] = '';
    foreach ($radar as $r) {
        if (!is_array($r) || empty($r['title'])) { continue; }
        $cap = lf_linia((string) $r['title']);
        $lloc = trim(lf_linia((string) ($r['place'] ?? '')) . (!empty($r['date']) ? ', ' . lf_linia((string) $r['date']) : ''), ', ');
        $sortida[] = '- **' . $cap . '**' . ($lloc !== '' ? ' (' . $lloc . ')' : '');
        $resum = lf_linia((string) ($r['summary'] ?? ''));
        if ($resum !== '') { $sortida[] = '  ' . $resum; }
        if (!empty($r['url'])) {
            $sortida[] = '  Font: ' . trim(lf_linia((string) ($r['source'] ?? '')) . ' <' . (string) $r['url'] . '>');
        }
    }
    $sortida[] = '';
}

// 3. Peces de fons. Les de la Redacció, senceres; les signades, només la fitxa.
$sortida[] = '## Peces de fons';
$sortida[] = '';
$senceres = ['reflexio' => 1, 'analisi' => 1, 'quadern' => 1];
$fitxes = ['tribuna' => 3, 'estudis' => 3, 'empresa' => 3];
foreach ($senceres as $tipus => $quantes) {
    foreach (array_slice(iacat_peces($tipus), 0, $quantes) as $peca) {
        $sortida[] = '### ' . $peca['seccio'] . ': ' . lf_linia($peca['titol']);
        $sortida[] = '';
        $sortida[] = '- Enllaç: ' . $peca['url'];
        if ($peca['dataIso'] !== '') { $sortida[] = '- Data: ' . $peca['dataIso']; }
        $sortida[] = '- Autoria: Redacció IA.cat';
        $sortida[] = '';
        if ($peca['resum'] !== '') { $sortida[] = '**' . lf_linia($peca['resum']) . '**'; $sortida[] = ''; }
        $cos = lf_cos(iacat_cos_text($peca['item']['body'] ?? ''));
        if ($cos !== '') { $sortida[] = $cos; $sortida[] = ''; }
    }
}
foreach ($fitxes as $tipus => $quantes) {
    $peces = array_slice(iacat_peces($tipus), 0, $quantes);
    if (!$peces) { continue; }
    $sortida[] = '### ' . $peces[0]['seccio'] . ' (peces signades: llegiu-les al web)';
    $sortida[] = '';
    foreach ($peces as $peca) {
        $linia = '- [' . lf_linia($peca['titol']) . '](' . $peca['url'] . ')';
        if ($peca['autor'] !== '') { $linia .= ', de ' . lf_linia($peca['autor']); }
        if ($peca['dataIso'] !== '') { $linia .= ' (' . $peca['dataIso'] . ')'; }
        if ($peca['resum'] !== '') { $linia .= ': ' . lf_linia($peca['resum']); }
        $sortida[] = $linia;
    }
    $sortida[] = '';
}

// 4. On anar a buscar la resta.
$sortida[] = '## Més contingut';
$sortida[] = '';
$sortida[] = '- Hemeroteca amb cercador: ' . $base . '/arxiu.html (en JSON: ' . $base . '/data/arxiu.json)';
$sortida[] = '- Agenda d\'actes sobre IA: ' . $base . '/agenda (en JSON: ' . $base . '/data/agenda.json)';
$sortida[] = '- Canal RSS: ' . $base . '/feed.xml';
$sortida[] = '- Registre de correccions: ' . $base . '/correccions';
$sortida[] = '';

echo implode("\n", $sortida);
