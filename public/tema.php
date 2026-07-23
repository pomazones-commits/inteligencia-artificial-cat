<?php
declare(strict_types=1);

$base = 'https://inteligencia-artificial.cat';
$topics = require __DIR__ . '/data/topics.php';
$slug = preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($_GET['tema'] ?? '')));
$topic = $topics[$slug] ?? null;
$found = is_array($topic);
if (!$found) {
    http_response_code(404);
    $topic = ['title' => 'Tema no trobat', 'short' => 'Arxiu', 'description' => 'Aquest tema no està disponible.', 'categories' => [], 'resources' => []];
}

function topic_e(string $value): string { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function topic_upper(string $value): string { return function_exists('mb_strtoupper') ? mb_strtoupper($value, 'UTF-8') : strtoupper($value); }
function topic_image(string $path): string { return '/' . ltrim((string) preg_replace('#^\./#', '', $path), '/'); }

$items = [];
$seen = [];
$articlesPath = __DIR__ . '/data/articles.json';
$edition = is_file($articlesPath) ? json_decode((string) file_get_contents($articlesPath), true) : ['items' => []];
$archivePath = __DIR__ . '/data/archive.json';
$archive = is_file($archivePath) ? json_decode((string) file_get_contents($archivePath), true) : [];
$candidates = array_merge((array) ($edition['items'] ?? []), is_array($archive) ? $archive : []);

// Només fem servir les categories que ja genera el Content Hub. No hi ha
// classificació per paraules clau ni cap modificació del flux automàtic.
foreach ($candidates as $item) {
    $itemSlug = (string) ($item['slug'] ?? '');
    if ($itemSlug === '' || isset($seen[$itemSlug])) { continue; }
    $category = topic_upper((string) ($item['category'] ?? ''));
    if (!in_array($category, (array) $topic['categories'], true)) { continue; }
    $seen[$itemSlug] = true;
    $items[] = $item;
    if (count($items) >= 30) { break; }
}

if ($found && !$items) { http_response_code(404); }
$canonical = $base . '/tema/' . $slug;
$jsonld = [
    '@context' => 'https://schema.org',
    '@type' => 'CollectionPage',
    'name' => $topic['title'],
    'description' => $topic['description'],
    'url' => $canonical,
    'inLanguage' => 'ca',
    'isPartOf' => ['@type' => 'WebSite', 'name' => 'intel·ligènciaartificial.cat', 'url' => $base . '/'],
];
if ($items) {
    $jsonld['mainEntity'] = [
        '@type' => 'ItemList',
        'numberOfItems' => count($items),
        'itemListElement' => array_map(static fn(array $item, int $index): array => [
            '@type' => 'ListItem',
            'position' => $index + 1,
            'url' => $base . '/article.php?slug=' . rawurlencode((string) $item['slug']),
            'name' => (string) $item['title'],
        ], $items, array_keys($items)),
    ];
}
$lead = $items[0] ?? null;
$rest = array_slice($items, 1);
?>
<!doctype html>
<html lang="ca">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#f6f7fb">
  <title><?= topic_e((string) $topic['title']) ?> — intel·ligènciaartificial.cat</title>
  <?php if ($found && $items): ?>
  <meta name="description" content="<?= topic_e((string) $topic['description']) ?>">
  <link rel="canonical" href="<?= topic_e($canonical) ?>">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ca_ES">
  <meta property="og:site_name" content="intel·ligènciaartificial.cat">
  <meta property="og:title" content="<?= topic_e((string) $topic['title']) ?>">
  <meta property="og:description" content="<?= topic_e((string) $topic['description']) ?>">
  <meta property="og:url" content="<?= topic_e($canonical) ?>">
  <meta name="twitter:card" content="summary">
  <script type="application/ld+json"><?= json_encode($jsonld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?></script>
  <?php else: ?><meta name="robots" content="noindex"><?php endif; ?>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&amp;family=Newsreader:opsz,wght@6..72,500;6..72,600&amp;family=Onest:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/editorial.css?v=2026072301">
  <script defer src="/shared.js?v=2026072302"></script>
</head>
<body class="editorial-body">
  <header class="editorial-topbar">
    <div class="editorial-shell editorial-topbar__inner">
      <a class="editorial-brand" href="/" aria-label="intel·ligènciaartificial.cat, inici"><span class="editorial-brand__mark">ia</span><span class="editorial-brand__name"><strong>intel·ligència</strong><span>artificial.cat</span></span></a>
      <nav class="editorial-nav" aria-label="Navegació principal"><a href="/#ultima-hora">Última hora</a><a href="/#catalunya">Radar català</a><a href="/analisi.html">Anàlisi</a><a href="/dossiers.html">Dossiers</a><a href="/arxiu.html">Arxiu</a></nav>
      <a class="editorial-back" href="/">← Portada</a>
    </div>
  </header>

  <main class="editorial-shell editorial-main">
    <nav class="editorial-breadcrumb" aria-label="Fil d’Ariadna"><a href="/">Portada</a><span>/</span><span><?= topic_e((string) $topic['short']) ?></span></nav>
    <header class="topic-intro">
      <div><p class="editorial-kicker">Arxiu temàtic</p><h1 class="editorial-display"><?= topic_e((string) $topic['title']) ?></h1></div>
      <div class="topic-intro__aside"><p><?= topic_e((string) $topic['description']) ?></p><small><?= count($items) ?> <?= count($items) === 1 ? 'article' : 'articles' ?> · s’actualitza amb l’edició diària</small></div>
    </header>

    <?php if ($lead): ?>
    <article class="topic-feature">
      <?php if (!empty($lead['image'])): ?><a class="topic-feature__image" href="/article.php?slug=<?= rawurlencode((string) $lead['slug']) ?>" tabindex="-1" aria-hidden="true"><img src="<?= topic_e(topic_image((string) $lead['image'])) ?>" alt="" fetchpriority="high"></a><?php endif; ?>
      <div class="topic-feature__copy">
        <div><p class="topic-meta"><?= topic_e((string) ($lead['category'] ?? 'ACTUALITAT')) ?> · <?= topic_e((string) ($lead['read'] ?? '4 MIN')) ?></p><h2><a href="/article.php?slug=<?= rawurlencode((string) $lead['slug']) ?>"><?= topic_e((string) $lead['title']) ?></a></h2><p><?= topic_e((string) ($lead['excerpt'] ?? '')) ?></p></div>
        <a class="topic-read" href="/article.php?slug=<?= rawurlencode((string) $lead['slug']) ?>">Llegir l’article <span>↗</span></a>
      </div>
    </article>
    <?php endif; ?>

    <?php if ($rest): ?>
    <section class="topic-grid" aria-label="Més articles del tema">
      <?php foreach ($rest as $index => $item): ?>
      <article class="topic-card">
        <?php if (!empty($item['image']) && $index < 8): ?><a href="/article.php?slug=<?= rawurlencode((string) $item['slug']) ?>" tabindex="-1" aria-hidden="true"><img src="<?= topic_e(topic_image((string) $item['image'])) ?>" alt="" loading="lazy"></a><?php endif; ?>
        <div><p class="topic-meta"><?= topic_e((string) ($item['category'] ?? 'ACTUALITAT')) ?> · <?= topic_e((string) ($item['read'] ?? '4 MIN')) ?></p><h2><a href="/article.php?slug=<?= rawurlencode((string) $item['slug']) ?>"><?= topic_e((string) $item['title']) ?></a></h2></div>
        <p><?= topic_e((string) ($item['excerpt'] ?? '')) ?></p>
      </article>
      <?php endforeach; ?>
    </section>
    <?php endif; ?>

    <?php if (!empty($topic['resources'])): ?>
    <section class="topic-resources" aria-labelledby="topic-resources-title">
      <header><p class="editorial-kicker">Fonts de referència</p><h2 id="topic-resources-title">Per anar més enllà de l’actualitat.</h2></header>
      <div class="topic-resources__list"><?php foreach ($topic['resources'] as $resource): ?><a class="topic-resource" href="<?= topic_e((string) $resource['url']) ?>"<?= str_starts_with((string) $resource['url'], 'http') ? ' target="_blank" rel="noreferrer"' : '' ?>><span><?= topic_e((string) $resource['label']) ?></span><strong><?= topic_e((string) $resource['title']) ?></strong><p><?= topic_e((string) $resource['description']) ?></p></a><?php endforeach; ?></div>
    </section>
    <?php endif; ?>

    <section class="topic-directory" aria-labelledby="more-topics"><p class="editorial-kicker" id="more-topics">Altres temes amb contingut</p><div class="topic-directory__links"><?php foreach ($topics as $otherSlug => $other): if ($otherSlug === $slug) continue; ?><a href="/tema/<?= topic_e($otherSlug) ?>"><?= topic_e((string) $other['short']) ?></a><?php endforeach; ?></div></section>

    <section class="subscribe-panel" aria-labelledby="topic-newsletter-title"><div><p class="editorial-kicker">Butlletí de dissabte</p><h2 id="topic-newsletter-title">La setmana d’IA, en cinc minuts.</h2></div><form class="js-subscribe-form" action="/api.php?action=subscribe" method="post"><label class="sr-only" for="topic-email">El teu correu electrònic</label><input id="topic-email" name="email" type="email" placeholder="el.teu@correu.cat" required><button type="submit">Vull rebre’l →</button><p class="js-form-message" role="status"></p></form></section>
  </main>

  <footer class="editorial-footer"><div class="editorial-shell editorial-footer__inner"><div><a class="editorial-brand" href="/"><span class="editorial-brand__mark">ia</span><span class="editorial-brand__name"><strong>intel·ligència</strong><span>artificial.cat</span></span></a><p>Actualitat, context i recursos sobre intel·ligència artificial en català.</p></div><nav><a href="/redaccio.html">Sobre IA.cat</a><a href="/eines.html">Guies</a><a href="/dossiers.html">Dossiers</a><a href="/arxiu.html">Arxiu</a></nav></div></footer>
</body>
</html>
