<?php
declare(strict_types=1);

// Pàgina de cada EIX temàtic (des del 20.10.2026; abans, «temes» per categoria).
// Les notícies s'assignen amb inc/eixos.php (iacat_eix); la pàgina territorial
// («catalunya») continua anant per categoria. Les claus antigues redirigeixen.
require_once __DIR__ . '/inc/eixos.php';

$base = 'https://inteligencia-artificial.cat';
$topics = iacat_eixos_tots();
$slug = preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($_GET['tema'] ?? '')));
$antigues = iacat_eix_claus_antigues();
if (isset($antigues[$slug])) {
    header('Location: ' . $base . '/tema/' . $antigues[$slug], true, 301);
    exit;
}
$topic = $topics[$slug] ?? null;
$found = is_array($topic);
if (!$found) {
    http_response_code(404);
    $topic = ['tipus' => 'eix', 'title' => 'Tema no trobat', 'short' => 'Arxiu', 'description' => 'Aquest tema no està disponible.', 'categories' => [], 'resources' => []];
}
$esTerritori = ($topic['tipus'] ?? 'eix') === 'territori';
$pertany = static function (array $item) use ($slug, $topic, $esTerritori): bool {
    if ($esTerritori) {
        $cat = iacat_eix_majuscules((string) ($item['category'] ?? ''));
        foreach ((array) $topic['categories'] as $c) { if (iacat_eix_majuscules((string) $c) === $cat) { return true; } }
        return false;
    }
    return iacat_eix($item) === $slug;
};
$peces = ($found && !$esTerritori) ? iacat_peces_eix($slug, 12) : [];

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

// Notícies de l'eix (iacat_eix) o, a la pàgina territorial, de les categories del territori.
foreach ($candidates as $item) {
    $itemSlug = (string) ($item['slug'] ?? '');
    if ($itemSlug === '' || isset($seen[$itemSlug])) { continue; }
    if (!$pertany($item)) { continue; }
    $seen[$itemSlug] = true;
    $items[] = $item;
    if (count($items) >= 30) { break; }
}

// Recurs (24.09.2026): archive.json només guarda les 1.000 peces més recents
// (~45 dies). Si el tema no n'ha reunit 30, es completa amb l'hemeroteca
// sencera (arxiu.json, totes les edicions des del 12.07.2026). Sense això, els
// temes amb poques peces perdien tot el que tenia més d'un mes i mig.
if (count($items) < 30) {
    $arxiuPath = __DIR__ . '/data/arxiu.json';
    $arxiu = is_file($arxiuPath) ? json_decode((string) file_get_contents($arxiuPath), true) : [];
    foreach ((array) ($arxiu['editions'] ?? []) as $edicio) {
        foreach ((array) ($edicio['items'] ?? []) as $item) {
            if (!is_array($item)) { continue; }
            $itemSlug = (string) ($item['slug'] ?? '');
            if ($itemSlug === '' || isset($seen[$itemSlug])) { continue; }
            if (!$pertany($item)) { continue; }
            $seen[$itemSlug] = true;
            $items[] = $item;
            if (count($items) >= 30) { break 2; }
        }
    }
}

if ($found && !$items && !$peces) { http_response_code(404); }
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
  <?php if ($found && ($items || $peces)): ?>
  <meta name="description" content="<?= topic_e((string) $topic['description']) ?>">
  <link rel="canonical" href="<?= topic_e($canonical) ?>">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ca_ES">
  <meta property="og:site_name" content="intel·ligènciaartificial.cat">
  <meta property="og:title" content="<?= topic_e((string) $topic['title']) ?>">
  <meta property="og:description" content="<?= topic_e((string) $topic['description']) ?>">
  <meta property="og:url" content="<?= topic_e($canonical) ?>">
  <meta property="og:image" content="https://inteligencia-artificial.cat/assets/og-portada.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="intel·ligènciaartificial.cat — el briefing diari de la intel·ligència artificial en català">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json"><?= json_encode($jsonld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?></script>
  <?php else: ?><meta name="robots" content="noindex"><?php endif; ?>
  <link rel="stylesheet" href="/fonts.css?v=2026080701">
  <link rel="stylesheet" href="/editorial.css?v=2026072301">
  <link rel="stylesheet" href="/eixos.css?v=2026102001">
  <script defer src="/shared.js?v=2026101701"></script>
</head>
<body class="editorial-body">
  <header class="editorial-topbar">
    <div class="editorial-shell editorial-topbar__inner">
      <a class="editorial-brand" href="/" aria-label="intel·ligènciaartificial.cat, inici"><span class="editorial-brand__mark">ia</span><span class="editorial-brand__name"><strong>intel·ligència</strong><span>artificial.cat</span></span></a>
      <nav class="editorial-nav" aria-label="Navegació principal"><a href="/#ultima-hora">Última hora</a><a href="/#catalunya">Radar català</a><a href="/tribuna.html">Tribuna</a><a href="/seccions">Seccions</a><a href="/analisi.html">Anàlisi</a><a href="/dossiers.html">Dossiers</a><a href="/arxiu.html">Arxiu</a></nav>
      <a class="editorial-back" href="/">← Portada</a>
    </div>
  </header>

  <main class="editorial-shell editorial-main">
    <nav class="editorial-breadcrumb" aria-label="Fil d’Ariadna"><a href="/">Portada</a><span>/</span><span><?= topic_e((string) $topic['short']) ?></span></nav>
    <header class="topic-intro">
      <div><p class="editorial-kicker"><?= $esTerritori ? 'Arxiu territorial' : (($topic['tipus'] ?? '') === 'eix' ? 'Secció' : 'Arxiu temàtic') ?></p><h1 class="editorial-display"><?= topic_e((string) $topic['title']) ?></h1></div>
      <div class="topic-intro__aside"><p><?= topic_e((string) $topic['description']) ?></p><small><?= count($items) ?> <?= count($items) === 1 ? 'notícia' : 'notícies' ?><?= $peces ? ' · ' . count($peces) . ' ' . (count($peces) === 1 ? 'peça signada' : 'peces signades') : '' ?> · s’actualitza amb l’edició diària</small>
        <?php if (!empty($topic['temes']) && count($topic['temes']) > 1): ?><ul class="eix-temes" aria-label="Temes de la secció"><?php foreach ($topic['temes'] as $tema): ?><li><?= topic_e((string) $tema) ?></li><?php endforeach; ?></ul><?php endif; ?>
      </div>
    </header>

    <?php if (!$esTerritori && ($topic['tipus'] ?? 'eix') === 'eix' && $found): ?>
    <section class="eix-veus" aria-labelledby="eix-veus-title">
      <header class="eix-veus__cap"><div><p class="editorial-kicker">Tribuna, estudis i anàlisis</p><h2 id="eix-veus-title">Veus signades</h2></div><a href="/escriu.html">Vols escriure en aquesta secció? →</a></header>
      <?php if ($peces): ?>
      <div class="eix-veus__graella">
        <?php foreach ($peces as $peca): $serie = (string) ($peca['item']['serie'] ?? ''); $sec = ['nom' => $serie === 'veus-de-civicai' ? 'Veus de CIVICAi' : ($serie === 'veus-de-l-administracio' ? 'Veus de l’administració' : (['tribuna' => 'La tribuna', 'estudis' => 'Estudi', 'empresa' => 'Veus d’empresa', 'analisi' => 'Anàlisi de la setmana', 'quadern' => 'Quadern IA'][$peca['tipus']] ?? ''))]; $autor = trim((string) ($peca['item']['author'] ?? '')); ?>
        <article class="eix-veu">
          <p class="topic-meta"><?= topic_e((string) $sec['nom']) ?><?php if ($peca['dataIso'] !== ''): ?> · <?= topic_e(date('d.m.Y', strtotime($peca['dataIso']))) ?><?php endif; ?></p>
          <h3><a href="<?= topic_e((string) $peca['url']) ?>"><?= topic_e((string) $peca['titol']) ?></a></h3>
          <?php if (trim((string) $peca['resum']) !== ''): ?><p><?= topic_e(function_exists('mb_strimwidth') ? mb_strimwidth(trim((string) $peca['resum']), 0, 220, '…', 'UTF-8') : (string) $peca['resum']) ?></p><?php endif; ?>
          <p class="eix-veu__autor"><?= topic_e($autor !== '' ? $autor : 'Redacció IA.cat') ?></p>
        </article>
        <?php endforeach; ?>
      </div>
      <?php else: ?>
      <p class="eix-buida">Aquesta secció s’estrena aquest mes de novembre amb peces signades de veus dels territoris de parla catalana. Mentrestant, aquí sota hi ha les notícies del tema.</p>
      <?php endif; ?>
    </section>
    <?php endif; ?>

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

    <section class="topic-directory" aria-labelledby="more-topics"><p class="editorial-kicker" id="more-topics">Altres seccions</p><div class="topic-directory__links"><?php foreach ($topics as $otherSlug => $other): if ($otherSlug === $slug) continue; ?><a href="/tema/<?= topic_e($otherSlug) ?>"><?= topic_e((string) $other['short']) ?></a><?php endforeach; ?></div></section>

    <section class="subscribe-panel" aria-labelledby="topic-newsletter-title"><div><p class="editorial-kicker">Butlletí de dissabte</p><h2 id="topic-newsletter-title">La setmana d’IA, en cinc minuts.</h2></div><form class="js-subscribe-form" action="/api.php?action=subscribe" method="post"><label class="sr-only" for="topic-email">El teu correu electrònic</label><input id="topic-email" name="email" type="email" placeholder="el.teu@correu.cat" required><button type="submit">Vull rebre’l →</button><p class="js-form-message" role="status"></p></form></section>
  </main>

  <footer class="editorial-footer"><div class="editorial-shell editorial-footer__inner"><div><a class="editorial-brand" href="/"><span class="editorial-brand__mark">ia</span><span class="editorial-brand__name"><strong>intel·ligència</strong><span>artificial.cat</span></span></a><p>Actualitat, context i recursos sobre intel·ligència artificial en català.</p></div><nav><a href="/redaccio.html">Sobre IA.cat</a><a href="/eines.html">Guies</a><a href="/dossiers.html">Dossiers</a><a href="/arxiu.html">Arxiu</a></nav></div></footer>
</body>
</html>
