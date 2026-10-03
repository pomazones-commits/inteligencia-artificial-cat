<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Centres de dades (03.10.2026): funcions compartides entre la pàgina
// /centres-de-dades (centres-de-dades.php) i la fitxa de notícia (article.php).
//
// Una notícia és «de centres de dades del territori» quan el titular o
// l'entradeta parlen del tema (IACAT_CD_TEMA) I d'un lloc o d'un projecte dels
// territoris de parla catalana (IACAT_CD_LLOC o les «paraules» de les fitxes de
// public/data/centres-dades.json). Les dues condicions alhora: una notícia sobre
// un centre de dades a Texas no hi entra, ni una notícia de Barcelona que no
// parli de centres de dades. El fil de la pàgina es construeix sol amb cada
// edició, perquè llegeix l'hemeroteca que genera el Content Hub.
// ---------------------------------------------------------------------------

const IACAT_CD_TEMA = '/(centres? de (processament de )?dades|\bCPDs?\b|data ?cent(er|re)s?|megacentres? de dades|macrocentres? de dades|gigafactori(a|es) d.IA|supercomputador(s|es)?|superordinadors?|MareNostrum|fàbriques? d.IA|AI Factory|campus de dades)/iu';
const IACAT_CD_LLOC = '/(?<![\p{L}\p{N}])(Catalunya|Barcelona|Generalitat|Tarragona|Lleida|Girona|Ebre|Comunitat Valenciana|València|Alacant|Castelló|Balears|Mallorca|Menorca|Eivissa|Andorra|Perpinyà|Rosselló|BSC|Barcelona Supercomputing Center|MareNostrum|Parlament de Catalunya|Govern de la Generalitat|Govern balear|Govern d.Andorra|Consell General)(?![\p{L}\p{N}])/u';

/** Dades de la secció (cau dins de la petició). */
function iacat_cd_dades(): array
{
    static $dades = null;
    if ($dades === null) {
        $ruta = dirname(__DIR__) . '/data/centres-dades.json';
        $v = is_file($ruta) ? json_decode((string) file_get_contents($ruta), true) : null;
        $dades = is_array($v) ? $v : [];
    }
    return $dades;
}

/** Expressió regular amb les paraules clau de totes les fitxes (o d'una). */
function iacat_cd_re_paraules(array $paraules): string
{
    $parts = [];
    foreach ($paraules as $p) {
        $p = trim((string) $p);
        if (mb_strlen($p) >= 4) { $parts[] = preg_quote($p, '/'); }
    }
    return $parts ? '/(?<![\p{L}\p{N}])(' . implode('|', $parts) . ')(?![\p{L}\p{N}])/iu' : '';
}

function iacat_cd_totes_les_paraules(): array
{
    $totes = [];
    foreach ((array) (iacat_cd_dades()['items'] ?? []) as $it) {
        foreach ((array) ($it['paraules'] ?? []) as $p) { $totes[] = (string) $p; }
    }
    return array_values(array_unique($totes));
}

/** És una notícia sobre centres de dades dels territoris de parla catalana? */
function iacat_cd_es_noticia(array $item): bool
{
    static $reParaules = null;
    if ($reParaules === null) { $reParaules = iacat_cd_re_paraules(iacat_cd_totes_les_paraules()); }
    $text = ($item['title'] ?? '') . ' ' . ($item['excerpt'] ?? '');
    if (!preg_match(IACAT_CD_TEMA, $text)) { return false; }
    return (bool) preg_match(IACAT_CD_LLOC, $text) || ($reParaules !== '' && preg_match($reParaules, $text));
}

/**
 * Notícies de l'hemeroteca (de la més nova a la més antiga) que passen el filtre.
 * Cada element porta '_iso' (AAAA-MM-DD).
 */
function iacat_cd_noticies(): array
{
    static $llista = null;
    if ($llista !== null) { return $llista; }
    $llista = [];
    $vistos = [];
    $afegeix = static function (array $item, string $iso) use (&$llista, &$vistos): void {
        $slug = (string) ($item['slug'] ?? '');
        if ($slug === '' || isset($vistos[$slug]) || !iacat_cd_es_noticia($item)) { return; }
        // La mateixa notícia publicada dos o tres dies seguits (o amb «ACTUALITZACIÓ:»)
        // només surt una vegada: es compara el començament del titular.
        $clau = mb_substr(preg_replace('/[^\p{L}\p{N}]+/u', '', mb_strtolower(preg_replace('/^ACTUALITZACIÓ:\s*/u', '', (string) ($item['title'] ?? '')))), 0, 40);
        if ($clau !== '' && isset($vistos['t:' . $clau])) { return; }
        $vistos[$slug] = true;
        $vistos['t:' . $clau] = true;
        $llista[] = ['slug' => $slug, 'title' => (string) ($item['title'] ?? ''), 'excerpt' => (string) ($item['excerpt'] ?? ''), 'category' => (string) ($item['category'] ?? ''), '_iso' => $iso];
    };
    $dir = dirname(__DIR__) . '/data/';
    $articles = is_file($dir . 'articles.json') ? (json_decode((string) file_get_contents($dir . 'articles.json'), true) ?: []) : [];
    $isoAvui = substr((string) ($articles['updatedAt'] ?? ''), 0, 10);
    foreach ((array) ($articles['items'] ?? []) as $item) { if (is_array($item)) { $afegeix($item, $isoAvui); } }
    $arxiu = is_file($dir . 'arxiu.json') ? (json_decode((string) file_get_contents($dir . 'arxiu.json'), true) ?: []) : [];
    foreach ((array) ($arxiu['editions'] ?? []) as $ed) {
        $d = (string) ($ed['date'] ?? '');
        $iso = preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $d, $m) ? "{$m[3]}-{$m[2]}-{$m[1]}" : $d;
        foreach ((array) ($ed['items'] ?? []) as $item) { if (is_array($item)) { $afegeix($item, $iso); } }
    }
    usort($llista, static fn(array $a, array $b): int => strcmp($b['_iso'], $a['_iso']));
    return $llista;
}

/** Notícies que esmenten alguna de les paraules d'una fitxa. */
function iacat_cd_noticies_de(array $paraules, int $max = 3): array
{
    $re = iacat_cd_re_paraules($paraules);
    if ($re === '') { return []; }
    $out = [];
    foreach (iacat_cd_noticies() as $n) {
        if (preg_match($re, $n['title'] . ' ' . $n['excerpt'])) { $out[] = $n; }
        if (count($out) >= $max) { break; }
    }
    return $out;
}

/** Coordenades → punt del mapa. $p: ['scale', 'tx', 'ty'] (Mercator de d3-geo). */
function iacat_cd_projecta(float $lat, float $lon, array $p): array
{
    $x = $p['scale'] * deg2rad($lon) + $p['tx'];
    $y = $p['ty'] - $p['scale'] * log(tan(M_PI / 4 + deg2rad($lat) / 2));
    return [round($x, 1), round($y, 1)];
}
