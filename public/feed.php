<?php
declare(strict_types=1);
// Canal RSS 2.0 amb les notícies de l'edició del dia.
// Accessible com a /feed.xml gràcies a la regla de reescriptura del .htaccess.
header('Content-Type: application/rss+xml; charset=utf-8');
$base = 'https://inteligencia-artificial.cat';
$articlesFile = __DIR__ . '/data/articles.json';
$edition = is_file($articlesFile) ? json_decode((string) file_get_contents($articlesFile), true) : ['items' => []];
$updatedAt = (string) ($edition['updatedAt'] ?? '');
$buildDate = $updatedAt !== '' ? date(DATE_RSS, strtotime($updatedAt)) : date(DATE_RSS);
function x(string $value): string { return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8'); }
echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo "<?xml-stylesheet type=\"text/xsl\" href=\"/feed.xsl?v=2026072301\"?>\n";
echo "<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n<channel>\n";
echo '  <title>intel·ligènciaartificial.cat — Intel·ligència artificial, al dia</title>' . "\n";
echo '  <link>' . $base . "/</link>\n";
echo '  <description>Notícies, anàlisi i context sobre intel·ligència artificial, en català. Fins a 20 històries al dia.</description>' . "\n";
echo "  <language>ca</language>\n";
echo '  <lastBuildDate>' . x($buildDate) . "</lastBuildDate>\n";
echo '  <atom:link href="' . $base . '/feed.xml" rel="self" type="application/rss+xml"/>' . "\n";
foreach (($edition['items'] ?? []) as $item) {
    $slug = (string) ($item['slug'] ?? '');
    if ($slug === '') { continue; }
    $link = $base . '/article.php?slug=' . rawurlencode($slug);
    echo "  <item>\n";
    echo '    <title>' . x((string) ($item['title'] ?? '')) . "</title>\n";
    echo '    <link>' . x($link) . "</link>\n";
    echo '    <guid isPermaLink="true">' . x($link) . "</guid>\n";
    echo '    <description>' . x((string) ($item['excerpt'] ?? '')) . "</description>\n";
    if (!empty($item['category'])) { echo '    <category>' . x((string) $item['category']) . "</category>\n"; }
    if ($updatedAt !== '') { echo '    <pubDate>' . x(date(DATE_RSS, strtotime($updatedAt))) . "</pubDate>\n"; }
    echo "  </item>\n";
}
echo "</channel>\n</rss>\n";
