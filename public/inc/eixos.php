<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Eixos temàtics (20.10.2026, decisió d'en Rafael).
//
// Assigna a cada notícia i a cada peça signada un dels eixos de data/topics.php i
// en dona l'etiqueta. Només llegeix: no toca cap fitxer de dades ni cap contracte.
//
// Ordre de decisió (iacat_eix):
//   1. camp "eix" de la peça o la notícia, si és una clau vàlida;
//   2. data/eixos-peces.json ("tipus/id" → eix), per a les peces signades ja publicades;
//   3. expressions «fortes» de cada eix (militarització, AGI, ètica, robòtica…),
//      sobre el títol + l'entradeta;
//   4. la categoria del Content Hub (camp "categories" de cada eix);
//   5. expressions generals («paraules»), si la categoria no ho decideix
//      (categories territorials, desconegudes o peces sense categoria);
//   6. recanvi: notícies → «Novetats, models i productes»; peces → «Societat…».
// Ho fan servir article.php, peca.php, tema.php i sitemap.php.
// Proves: php scripts/prova-eixos.php
// ---------------------------------------------------------------------------

function iacat_eixos_tots(): array
{
    static $temes = null;
    if ($temes === null) { $temes = require dirname(__DIR__) . '/data/topics.php'; }
    return $temes;
}

/** Només els eixos que poden etiquetar contingut (sense la pàgina territorial). */
function iacat_eixos(): array
{
    return array_filter(iacat_eixos_tots(), static fn(array $t): bool => ($t['tipus'] ?? 'eix') !== 'territori');
}

function iacat_eix_majuscules(string $text): string
{
    $text = trim(function_exists('mb_strtoupper') ? mb_strtoupper($text, 'UTF-8') : strtoupper($text));
    return strtr($text, ['À' => 'A', 'Á' => 'A', 'È' => 'E', 'É' => 'E', 'Í' => 'I', 'Ï' => 'I', 'Ò' => 'O', 'Ó' => 'O', 'Ú' => 'U', 'Ü' => 'U', 'Ç' => 'C', '·' => '']);
}

/** Converteix una expressió de topics.php en regex: sempre a començament de mot. */
function iacat_eix_regex(array $expressions): ?string
{
    $parts = [];
    foreach ($expressions as $expr) {
        $expr = (string) $expr;
        if (str_starts_with($expr, '\b')) { $expr = substr($expr, 2); }
        $expr = str_replace('\b', '(?![\p{L}\p{N}])', $expr);
        $parts[] = '(?:' . $expr . ')';
    }
    return $parts ? '/(?<![\p{L}\p{N}])(?:' . implode('|', $parts) . ')/iu' : null;
}

function iacat_eix_assignacions(): array
{
    static $mapa = null;
    if ($mapa === null) {
        $fitxer = dirname(__DIR__) . '/data/eixos-peces.json';
        $json = is_file($fitxer) ? json_decode((string) file_get_contents($fitxer), true) : [];
        $mapa = is_array($json['peces'] ?? null) ? $json['peces'] : [];
    }
    return $mapa;
}

/**
 * Eix d'un element. $item: notícia (category, title, excerpt…) o peça (title,
 * excerpt/abstract/dek, keywords…). $clauPeca: "tipus/id" per a les peces signades.
 */
function iacat_eix(array $item, string $clauPeca = ''): string
{
    $eixos = iacat_eixos();
    $explicit = (string) ($item['eix'] ?? '');
    if ($explicit !== '' && isset($eixos[$explicit])) { return $explicit; }
    if ($clauPeca !== '') {
        $assignat = (string) (iacat_eix_assignacions()[$clauPeca] ?? '');
        if ($assignat !== '' && isset($eixos[$assignat])) { return $assignat; }
    }

    $text = implode(' ', array_map('strval', array_filter([
        $item['title'] ?? '', $item['excerpt'] ?? '', $item['abstract'] ?? '', $item['dek'] ?? '',
        is_array($item['keywords'] ?? null) ? implode(' ', $item['keywords']) : '',
    ], 'is_string')));
    $text = function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);

    foreach ($eixos as $clau => $eix) {
        $re = iacat_eix_regex((array) ($eix['fortes'] ?? []));
        if ($re && preg_match($re, $text)) { return (string) $clau; }
    }
    $categoria = iacat_eix_majuscules((string) ($item['category'] ?? ''));
    if ($categoria !== '') {
        foreach ($eixos as $clau => $eix) {
            foreach ((array) ($eix['categories'] ?? []) as $cat) {
                if (iacat_eix_majuscules((string) $cat) === $categoria) { return (string) $clau; }
            }
        }
    }
    foreach ($eixos as $clau => $eix) {
        $re = iacat_eix_regex((array) ($eix['paraules'] ?? []));
        if ($re && preg_match($re, $text)) { return (string) $clau; }
    }
    return $clauPeca !== '' ? 'societat-cultura-i-educacio' : 'novetats-models-i-productes';
}

/** Dades d'un eix per mostrar-ne l'etiqueta: [clau, nom curt, url]. */
function iacat_eix_etiqueta(string $clau): array
{
    $eix = iacat_eixos_tots()[$clau] ?? null;
    if (!$eix) { return ['clau' => '', 'nom' => '', 'url' => '']; }
    return ['clau' => $clau, 'nom' => (string) $eix['short'], 'url' => '/tema/' . $clau];
}

/** Peces signades d'una secció: primer les de persones, després les de la Redacció. */
function iacat_peces_eix(string $clau, int $maxim = 12): array
{
    require_once __DIR__ . '/peces.php';
    // Primer les peces signades per persones i després les de la Redacció (anàlisi i
    // Quadern IA); dins de cada grup, de la més recent a la més antiga.
    $persones = [];
    $redaccio = [];
    foreach (iacat_totes_les_peces() as $peca) {
        if ($peca['tipus'] === 'reflexio') { continue; }
        if (iacat_eix($peca['item'], $peca['tipus'] . '/' . $peca['id']) !== $clau) { continue; }
        if (in_array($peca['tipus'], ['analisi', 'quadern'], true)) { $redaccio[] = $peca; } else { $persones[] = $peca; }
    }
    return array_slice(array_merge($persones, $redaccio), 0, $maxim);
}

/** Les claus antigues dels temes (fins al 20.10.2026) i l'eix on van ara. */
function iacat_eix_claus_antigues(): array
{
    return [
        'tecnologia' => 'novetats-models-i-productes',
        'empresa-i-treball' => 'economia-i-treball',
        'politica-i-governanca' => 'poder-i-geopolitica',
        'seguretat' => 'riscos-seguretat-i-drets',
        'societat-i-cultura' => 'societat-cultura-i-educacio',
        'infraestructura-i-energia' => 'economia-i-treball',
    ];
}
