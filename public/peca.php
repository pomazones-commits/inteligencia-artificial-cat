<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Adreça fixa de cada peça editorial (24.09.2026).
//
//   /tribuna/<id>   /estudis/<id>   /analisi/<id>   /quadern/<id>   /reflexio/<AAAA-MM-DD>
//
// (regles de reescriptura a .htaccess → peca.php?tipus=…&id=…)
//
// No duplica cap plantilla: serveix la MATEIXA pàgina de sempre (tribuna.html,
// estudi.html…) amb tres retocs fets al servidor:
//   1. <base href="/">, perquè les rutes relatives («./tribuna.js») funcionin
//      des de /tribuna/<id>;
//   2. títol, descripció, Open Graph, canònica i JSON-LD de la peça concreta
//      (WhatsApp, LinkedIn o X no executen JavaScript: sense això la vista
//      prèvia deia «La tribuna · …» per a totes les peces);
//   3. window.IA_PECA = {tipus, idx}, que la pàgina fa servir en lloc de ?arxiu=N.
// Les adreces antigues (tribuna.html?arxiu=N) continuen funcionant.
// ---------------------------------------------------------------------------

require __DIR__ . '/inc/peces.php';

$seccions = iacat_seccions();
$tipus = (string) ($_GET['tipus'] ?? '');
$id = preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($_GET['id'] ?? '')));
$seccio = $seccions[$tipus] ?? null;
$peca = $seccio ? iacat_troba($tipus, (string) $id) : null;

header('Content-Type: text/html; charset=utf-8');

if (!$seccio || !$peca) {
    http_response_code(404);
    $destiNom = $seccio ? $seccio['nom'] : 'la portada';
    $desti = $seccio ? '/' . $seccio['arxiuHtml'] : '/';
    echo '<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
        . '<meta name="robots" content="noindex"><title>Peça no trobada · intel·ligència artificial.cat</title>'
        . '<link rel="stylesheet" href="/fonts.css?v=2026080701"><link rel="stylesheet" href="/editorial.css?v=2026072401"></head>'
        . '<body class="editorial-body"><main class="editorial-shell editorial-main"><p class="editorial-kicker">ERROR 404</p>'
        . '<h1>Aquesta peça no hi és.</h1><p class="editorial-lede">Potser s’ha retirat o l’adreça no és correcta. '
        . 'Pots buscar-la a <a href="' . iacat_e($desti) . '">' . iacat_e($destiNom) . '</a>.</p></main></body></html>';
    exit;
}

$fitxer = __DIR__ . '/' . $seccio['html'];
$html = is_file($fitxer) ? (string) file_get_contents($fitxer) : '';
if ($html === '') { http_response_code(500); exit; }

$item = $peca['item'];
$titolPagina = $peca['titol'] . ' · intel·ligència artificial.cat';
$descripcio = trim(preg_replace('/\s+/', ' ', $peca['resum']) ?? '');
if ($descripcio === '') { $descripcio = $seccio['nom'] . ' a intel·ligènciaartificial.cat.'; }
if (function_exists('mb_strlen') && mb_strlen($descripcio) > 300) { $descripcio = rtrim(mb_substr($descripcio, 0, 297)) . '…'; }
$url = $peca['url'];

// JSON-LD de la peça.
$autor = $peca['autor'] !== ''
    ? ['@type' => 'Person', 'name' => $peca['autor']] + (!empty($item['role']) ? ['jobTitle' => (string) $item['role']] : [])
    : ['@type' => 'Organization', 'name' => 'Redacció IA.cat', 'url' => IACAT_BASE . '/redaccio.html'];
if ($peca['autor'] !== '') { $autor['url'] = IACAT_BASE . '/autor/' . iacat_slug($peca['autor']); }
$article = [
    '@type' => $tipus === 'estudis' ? 'ScholarlyArticle' : ($tipus === 'tribuna' ? 'OpinionNewsArticle' : 'Article'),
    'headline' => $peca['titol'],
    'description' => $descripcio,
    'url' => $url,
    'mainEntityOfPage' => $url,
    'inLanguage' => 'ca',
    'author' => $autor,
    'isPartOf' => ['@type' => 'CreativeWorkSeries', 'name' => $seccio['nom'], 'url' => IACAT_BASE . '/' . $seccio['arxiuHtml']],
    'publisher' => ['@type' => 'NewsMediaOrganization', 'name' => 'intel·ligènciaartificial.cat', 'url' => IACAT_BASE . '/'],
];
if ($peca['dataIso'] !== '') { $article['datePublished'] = $peca['dataIso']; }
if (!empty($item['photo']) && is_string($item['photo'])) {
    $article['image'] = IACAT_BASE . '/' . ltrim(preg_replace('#^\./#', '', $item['photo']) ?? '', '/');
}
if (!empty($item['keywords']) && is_array($item['keywords'])) { $article['keywords'] = implode(', ', array_map('strval', $item['keywords'])); }
$jsonld = [
    '@context' => 'https://schema.org',
    '@graph' => [
        $article,
        ['@type' => 'BreadcrumbList', 'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Portada', 'item' => IACAT_BASE . '/'],
            ['@type' => 'ListItem', 'position' => 2, 'name' => $seccio['nom'], 'item' => IACAT_BASE . '/' . $seccio['arxiuHtml']],
            ['@type' => 'ListItem', 'position' => 3, 'name' => $peca['titol'], 'item' => $url],
        ]],
    ],
];
$jsonldText = json_encode($jsonld, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG);

$e = static fn(string $v): string => iacat_e($v);
$substitucions = [
    '/<title>.*?<\/title>/s' => '<title>' . $e($titolPagina) . '</title>',
    '/<meta name="description" content="[^"]*">/' => '<meta name="description" content="' . $e($descripcio) . '">',
    '/<link rel="canonical" href="[^"]*">/' => '<link rel="canonical" href="' . $e($url) . '">',
    '/<meta property="og:type" content="[^"]*">/' => '<meta property="og:type" content="article">',
    '/<meta property="og:title" content="[^"]*">/' => '<meta property="og:title" content="' . $e($peca['titol']) . '">',
    '/<meta property="og:description" content="[^"]*">/' => '<meta property="og:description" content="' . $e($descripcio) . '">',
    '/<meta property="og:url" content="[^"]*">/' => '<meta property="og:url" content="' . $e($url) . '">',
    '/<script type="application\/ld\+json">.*?<\/script>/s' => '<script type="application/ld+json">' . $jsonldText . '</script>',
];
foreach ($substitucions as $patro => $nou) {
    $html = (string) preg_replace_callback($patro, static fn() => $nou, $html, 1);
}

$extra = '';
if ($peca['dataIso'] !== '') { $extra .= '<meta property="article:published_time" content="' . $e($peca['dataIso']) . '">'; }
if ($peca['autor'] !== '') { $extra .= '<meta name="author" content="' . $e($peca['autor']) . '">'; }
$extra .= '<script>window.IA_PECA=' . json_encode(['tipus' => $tipus, 'idx' => $peca['idx'], 'url' => $url], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) . ';</script>';

$html = (string) preg_replace('/<head>/', "<head>\n  <base href=\"/\">", $html, 1);
$html = (string) preg_replace('/<\/head>/', '  ' . $extra . "\n</head>", $html, 1);

echo $html;
