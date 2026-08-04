<?php
declare(strict_types=1);
// Sitemap dinàmic: portada, pàgines fixes i totes les notícies (edició del dia + hemeroteca).
// Accessible com a /sitemap.xml gràcies a la regla de reescriptura del .htaccess.
//
// Totes les URL porten <lastmod>: és l'únic senyal del sitemap que Google fa
// servir per decidir què torna a rastrejar i en quin ordre. Les etiquetes
// <changefreq> i <priority> s'han eliminat perquè Google les ignora des de fa
// anys i només engreixaven el fitxer.
//
// Les dates NO surten de filemtime(): el desplegament reescriu tot l'arbre de
// fitxers de cop, així que la data del fitxer diria "tot ha canviat" cada
// vegada. Es fan servir les dates del contingut publicat (edició del dia i
// hemeroteca), que és el que realment canvia.
header('Content-Type: application/xml; charset=utf-8');

$base = 'https://inteligencia-artificial.cat';

// ---------------------------------------------------------------------------
// 1. Dades d'origen.
// ---------------------------------------------------------------------------
$articlesFile = __DIR__ . '/data/articles.json';
$edition = is_file($articlesFile) ? json_decode((string) file_get_contents($articlesFile), true) : ['items' => []];
$editionIso = substr((string) ($edition['updatedAt'] ?? ''), 0, 10);

$arxiuFile = __DIR__ . '/data/arxiu.json';
$arxiu = is_file($arxiuFile) ? json_decode((string) file_get_contents($arxiuFile), true) : ['editions' => []];

$topics = require __DIR__ . '/data/topics.php';

// Normalitza una categoria per comparar-la: majúscules i sense accents, perquè
// a les dades hi conviuen formes com "REGULACIO" i "REGULACIÓ".
$normalitza = static function (string $text): string {
    $text = trim($text);
    if (function_exists('mb_strtoupper')) {
        $text = mb_strtoupper($text, 'UTF-8');
    } else {
        $text = strtoupper($text);
    }
    return strtr($text, [
        'À' => 'A', 'Á' => 'A', 'Ä' => 'A', 'Â' => 'A',
        'È' => 'E', 'É' => 'E', 'Ë' => 'E', 'Ê' => 'E',
        'Ì' => 'I', 'Í' => 'I', 'Ï' => 'I', 'Î' => 'I',
        'Ò' => 'O', 'Ó' => 'O', 'Ö' => 'O', 'Ô' => 'O',
        'Ù' => 'U', 'Ú' => 'U', 'Ü' => 'U', 'Û' => 'U',
        'Ç' => 'C', 'Ñ' => 'N', '·' => '',
    ]);
};

// Índex categoria normalitzada -> temes que la recullen.
$catToTopics = [];
foreach ($topics as $topicSlug => $topic) {
    foreach (($topic['categories'] ?? []) as $cat) {
        $catToTopics[$normalitza((string) $cat)][] = (string) $topicSlug;
    }
}

// ---------------------------------------------------------------------------
// 2. Articles: data més recent per article i per tema.
//    L'edició del dia es processa primer, així cada slug es queda amb la data
//    de la seva aparició més recent.
// ---------------------------------------------------------------------------
$articleUrls = [];
$topicIso = [];
$seen = [];

$afegeix = function (array $item, string $iso) use (&$articleUrls, &$topicIso, &$seen, $base, $catToTopics, $normalitza): void {
    $slug = (string) ($item['slug'] ?? '');
    if ($slug === '' || isset($seen[$slug])) { return; }
    $seen[$slug] = true;

    $url = ['loc' => $base . '/article.php?slug=' . rawurlencode($slug)];
    if ($iso !== '') { $url['lastmod'] = $iso; }
    $articleUrls[] = $url;

    if ($iso === '') { return; }
    foreach (($catToTopics[$normalitza((string) ($item['category'] ?? ''))] ?? []) as $topicSlug) {
        if (!isset($topicIso[$topicSlug]) || $iso > $topicIso[$topicSlug]) {
            $topicIso[$topicSlug] = $iso;
        }
    }
};

foreach (($edition['items'] ?? []) as $item) { $afegeix($item, $editionIso); }
foreach (($arxiu['editions'] ?? []) as $ed) {
    $iso = '';
    if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', (string) ($ed['date'] ?? ''), $m)) {
        $iso = $m[3] . '-' . $m[2] . '-' . $m[1];
    }
    foreach (($ed['items'] ?? []) as $item) { $afegeix($item, $iso); }
}

// Data de referència del lloc: l'última edició publicada.
$siteIso = $editionIso;
foreach ($articleUrls as $u) {
    if (isset($u['lastmod']) && $u['lastmod'] > $siteIso) { $siteIso = $u['lastmod']; }
}
if ($siteIso === '') { $siteIso = gmdate('Y-m-d'); }

// ---------------------------------------------------------------------------
// 3. Llista final d'URL.
// ---------------------------------------------------------------------------
$urls = [];

// Portada.
$urls[] = ['loc' => $base . '/', 'lastmod' => $siteIso];

// Pàgines de secció: es reconstrueixen amb cada edició, per tant comparteixen
// la data de l'última edició publicada.
$pages = ['redaccio.html', 'eines.html', 'analisi.html', 'tribuna.html', 'arxiu-tribuna.html', 'estudi.html', 'arxiu-estudis.html', 'quadern.html', 'reflexio.html', 'arxiu-reflexions.html', 'dossiers.html', 'arxiu.html'];
foreach ($pages as $page) {
    $urls[] = ['loc' => $base . '/' . $page, 'lastmod' => $siteIso];
}

// Temes: data de l'article més recent del tema.
foreach (array_keys($topics) as $topicSlug) {
    $urls[] = ['loc' => $base . '/tema/' . $topicSlug, 'lastmod' => $topicIso[$topicSlug] ?? $siteIso];
}

// Articles.
foreach ($articleUrls as $url) {
    $urls[] = $url;
}

// ---------------------------------------------------------------------------
// 4. Sortida.
// ---------------------------------------------------------------------------
echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
foreach ($urls as $url) {
    echo "  <url>\n";
    echo '    <loc>' . htmlspecialchars($url['loc'], ENT_XML1) . "</loc>\n";
    if (isset($url['lastmod']) && $url['lastmod'] !== '') {
        echo '    <lastmod>' . htmlspecialchars($url['lastmod'], ENT_XML1) . "</lastmod>\n";
    }
    echo "  </url>\n";
}
echo "</urlset>\n";
