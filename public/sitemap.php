<?php
declare(strict_types=1);
// Sitemap dinàmic: portada, pàgines fixes i totes les notícies (edició del dia + hemeroteca).
// Accessible com a /sitemap.xml gràcies a la regla de reescriptura del .htaccess.
header('Content-Type: application/xml; charset=utf-8');
$base = 'https://inteligencia-artificial.cat';
$urls = [];
$urls[] = ['loc' => $base . '/', 'changefreq' => 'hourly', 'priority' => '1.0'];
foreach (['redaccio.html', 'eines.html', 'analisi.html', 'tribuna.html', 'quadern.html', 'dossiers.html', 'arxiu.html'] as $page) {
    $urls[] = ['loc' => $base . '/' . $page, 'changefreq' => 'weekly', 'priority' => '0.6'];
}
$topics = require __DIR__ . '/data/topics.php';
foreach (array_keys($topics) as $topicSlug) {
    $urls[] = ['loc' => $base . '/tema/' . $topicSlug, 'changefreq' => 'daily', 'priority' => '0.7'];
}
$seen = [];
$afegeix = function (array $item, string $iso) use (&$urls, &$seen, $base): void {
    $slug = (string) ($item['slug'] ?? '');
    if ($slug === '' || isset($seen[$slug])) { return; }
    $seen[$slug] = true;
    $url = ['loc' => $base . '/article.php?slug=' . rawurlencode($slug), 'changefreq' => 'monthly', 'priority' => '0.8'];
    if ($iso !== '') { $url['lastmod'] = $iso; }
    $urls[] = $url;
};
$articlesFile = __DIR__ . '/data/articles.json';
$edition = is_file($articlesFile) ? json_decode((string) file_get_contents($articlesFile), true) : ['items' => []];
$editionIso = substr((string) ($edition['updatedAt'] ?? ''), 0, 10);
foreach (($edition['items'] ?? []) as $item) { $afegeix($item, $editionIso); }
$arxiuFile = __DIR__ . '/data/arxiu.json';
$arxiu = is_file($arxiuFile) ? json_decode((string) file_get_contents($arxiuFile), true) : ['editions' => []];
foreach (($arxiu['editions'] ?? []) as $ed) {
    $iso = '';
    if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', (string) ($ed['date'] ?? ''), $m)) {
        $iso = $m[3] . '-' . $m[2] . '-' . $m[1];
    }
    foreach (($ed['items'] ?? []) as $item) { $afegeix($item, $iso); }
}
echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n";
foreach ($urls as $url) {
    echo "  <url>\n";
    echo '    <loc>' . htmlspecialchars($url['loc'], ENT_XML1) . "</loc>\n";
    if (isset($url['lastmod'])) { echo '    <lastmod>' . htmlspecialchars($url['lastmod'], ENT_XML1) . "</lastmod>\n"; }
    echo '    <changefreq>' . $url['changefreq'] . "</changefreq>\n";
    echo '    <priority>' . $url['priority'] . "</priority>\n";
    echo "  </url>\n";
}
echo "</urlset>\n";
