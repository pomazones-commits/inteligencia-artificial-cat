<?php
declare(strict_types=1);

header('Content-Type: application/xml; charset=utf-8');
$base = 'https://inteligencia-artificial.cat';
$cutoff = new DateTimeImmutable('-2 days', new DateTimeZone('Europe/Madrid'));
$items = [];
$seen = [];

$addItems = static function (array $batch, string $published) use (&$items, &$seen, $cutoff): void {
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $published, new DateTimeZone('Europe/Madrid'));
    if (!$date || $date < $cutoff->setTime(0, 0)) { return; }
    foreach ($batch as $item) {
        $slug = (string) ($item['slug'] ?? '');
        if ($slug === '' || isset($seen[$slug])) { continue; }
        $seen[$slug] = true;
        $items[] = ['item' => $item, 'published' => $published];
    }
};

$articlesPath = __DIR__ . '/data/articles.json';
$edition = is_file($articlesPath) ? json_decode((string) file_get_contents($articlesPath), true) : ['items' => []];
$editionDate = substr((string) ($edition['updatedAt'] ?? ''), 0, 10);
if ($editionDate !== '') { $addItems((array) ($edition['items'] ?? []), $editionDate); }

$archivePath = __DIR__ . '/data/arxiu.json';
$archive = is_file($archivePath) ? json_decode((string) file_get_contents($archivePath), true) : ['editions' => []];
foreach ((array) ($archive['editions'] ?? []) as $archiveEdition) {
    if (!preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', (string) ($archiveEdition['date'] ?? ''), $parts)) { continue; }
    $addItems((array) ($archiveEdition['items'] ?? []), $parts[3] . '-' . $parts[2] . '-' . $parts[1]);
}

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:news=\"http://www.google.com/schemas/sitemap-news/0.9\">\n";
foreach ($items as $entry) {
    $item = $entry['item'];
    echo "  <url>\n";
    echo '    <loc>' . htmlspecialchars($base . '/article.php?slug=' . rawurlencode((string) $item['slug']), ENT_XML1) . "</loc>\n";
    echo "    <news:news>\n";
    echo "      <news:publication><news:name>intel·ligènciaartificial.cat</news:name><news:language>ca</news:language></news:publication>\n";
    echo '      <news:publication_date>' . htmlspecialchars($entry['published'], ENT_XML1) . "</news:publication_date>\n";
    echo '      <news:title>' . htmlspecialchars((string) ($item['title'] ?? ''), ENT_XML1) . "</news:title>\n";
    echo "    </news:news>\n";
    echo "  </url>\n";
}
echo "</urlset>\n";
