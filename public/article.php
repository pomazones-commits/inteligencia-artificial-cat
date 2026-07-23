<?php
declare(strict_types=1);

$base = 'https://inteligencia-artificial.cat';
function e(string $value): string { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
function absolute_asset(string $path, string $base): string {
    if ($path === '') { return ''; }
    if (preg_match('#^https?://#i', $path)) { return $path; }
    return $base . '/' . ltrim((string) preg_replace('#^\./#', '', $path), '/');
}
function utf8_upper(string $value): string { return function_exists('mb_strtoupper') ? mb_strtoupper($value, 'UTF-8') : strtoupper($value); }

$articlesFile = __DIR__ . '/data/articles.json';
$edition = is_file($articlesFile) ? json_decode((string) file_get_contents($articlesFile), true) : ['items' => []];
$archiveFile = __DIR__ . '/data/archive.json';
$flatArchive = is_file($archiveFile) ? json_decode((string) file_get_contents($archiveFile), true) : [];
$allItems = array_merge((array) ($edition['items'] ?? []), is_array($flatArchive) ? $flatArchive : []);

$slug = preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($_GET['slug'] ?? '')));
$article = null;
$publishedIso = '';
foreach ((array) ($edition['items'] ?? []) as $item) {
    if (($item['slug'] ?? '') === $slug) { $article = $item; break; }
}
if ($article) { $publishedIso = substr((string) ($edition['updatedAt'] ?? ''), 0, 10); }

if (!$article && $slug !== '') {
    $arxiuFile = __DIR__ . '/data/arxiu.json';
    $arxiu = is_file($arxiuFile) ? json_decode((string) file_get_contents($arxiuFile), true) : ['editions' => []];
    foreach ((array) ($arxiu['editions'] ?? []) as $archiveEdition) {
        foreach ((array) ($archiveEdition['items'] ?? []) as $item) {
            if (($item['slug'] ?? '') !== $slug) { continue; }
            $article = $item;
            if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', (string) ($archiveEdition['date'] ?? ''), $parts)) {
                $publishedIso = $parts[3] . '-' . $parts[2] . '-' . $parts[1];
            }
            break 2;
        }
    }
}

$found = $article !== null;
if (!$article) {
    http_response_code(404);
    $article = ['title' => 'Article no trobat', 'excerpt' => 'Aquesta història ja no està disponible.', 'category' => 'ARXIU', 'body' => 'Torna a l’edició per descobrir les últimes històries.'];
}

$canonical = $base . '/article.php?slug=' . rawurlencode($slug);
$desc = trim((string) ($article['excerpt'] ?? ''));
$imgAbs = absolute_asset((string) ($article['image'] ?? ''), $base);
$audioFile = __DIR__ . '/assets/audio/' . $slug . '.mp3';
$audioUrl = ($slug !== '' && is_file($audioFile)) ? './assets/audio/' . $slug . '.mp3?v=' . (string) filemtime($audioFile) : '';
$category = utf8_upper((string) ($article['category'] ?? 'ACTUALITAT'));

$publishedLabel = '';
if ($publishedIso !== '' && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $publishedIso, $dateParts)) {
    $months = [1 => 'gener', 2 => 'febrer', 3 => 'març', 4 => 'abril', 5 => 'maig', 6 => 'juny', 7 => 'juliol', 8 => 'agost', 9 => 'setembre', 10 => 'octubre', 11 => 'novembre', 12 => 'desembre'];
    $publishedLabel = (int) $dateParts[3] . ' de ' . $months[(int) $dateParts[2]] . ' de ' . $dateParts[1];
}

// Els camps d'autoria són opcionals. L'automatització actual no els necessita;
// quan arribi una col·laboració humana, l'article la podrà mostrar sense alterar
// els contractes existents.
$humanAuthorName = trim((string) ($article['authorName'] ?? ''));
$isHumanAuthor = $humanAuthorName !== '';
$authorName = $isHumanAuthor ? $humanAuthorName : 'Redacció IA.cat';
$authorRole = $isHumanAuthor ? trim((string) ($article['authorRole'] ?? 'Col·laboració')) : 'Actualitat';
$authorUrl = $isHumanAuthor ? trim((string) ($article['authorUrl'] ?? '')) : './redaccio.html';
$authorImage = $isHumanAuthor ? trim((string) ($article['authorImage'] ?? '')) : '';

$topicByCategory = [
    'CATALUNYA' => 'catalunya', 'TECNOLOGIA' => 'tecnologia',
    'MERCATS' => 'empresa-i-treball', 'INVERSIÓ' => 'empresa-i-treball',
    'POLÍTICA' => 'politica-i-governanca', 'GOVERNANÇA' => 'politica-i-governanca',
    'SEGURETAT' => 'seguretat', 'SOCIETAT' => 'societat-i-cultura',
    'INFRAESTRUCTURA' => 'infraestructura-i-energia',
];
$topicSlug = $topicByCategory[$category] ?? '';

// Lectures relacionades estrictes: mateixa categoria i mai farciment aleatori.
$related = [];
$seenRelated = [];
foreach ($allItems as $candidate) {
    $candidateSlug = (string) ($candidate['slug'] ?? '');
    if ($candidateSlug === '' || $candidateSlug === $slug || isset($seenRelated[$candidateSlug])) { continue; }
    if (utf8_upper((string) ($candidate['category'] ?? '')) !== $category) { continue; }
    $seenRelated[$candidateSlug] = true;
    $related[] = $candidate;
    if (count($related) === 3) { break; }
}

$sourceUrl = (string) ($article['sourceUrl'] ?? $article['url'] ?? '');
$sourceName = (string) ($article['sourceName'] ?? 'Font original');
$jsonld = null;
if ($found) {
    $authorSchema = $isHumanAuthor
        ? ['@type' => 'Person', 'name' => $authorName]
        : ['@type' => 'Organization', 'name' => 'Redacció IA.cat', 'url' => $base . '/redaccio.html'];
    if ($isHumanAuthor && $authorUrl !== '') { $authorSchema['url'] = absolute_asset($authorUrl, $base); }
    if ($isHumanAuthor && $authorImage !== '') { $authorSchema['image'] = absolute_asset($authorImage, $base); }
    $articleSchema = [
        '@type' => 'NewsArticle', '@id' => $canonical . '#article', 'headline' => (string) $article['title'],
        'description' => $desc, 'inLanguage' => 'ca', 'mainEntityOfPage' => $canonical,
        'articleSection' => $category, 'isAccessibleForFree' => true, 'author' => $authorSchema,
        'publisher' => ['@type' => 'NewsMediaOrganization', 'name' => 'intel·ligènciaartificial.cat', 'url' => $base, 'publishingPrinciples' => $base . '/redaccio.html'],
    ];
    if ($imgAbs !== '') { $articleSchema['image'] = [$imgAbs]; }
    if ($publishedIso !== '') { $articleSchema['datePublished'] = $publishedIso; $articleSchema['dateModified'] = $publishedIso; }
    $jsonld = ['@context' => 'https://schema.org', '@graph' => [$articleSchema, [
        '@type' => 'BreadcrumbList', 'itemListElement' => array_values(array_filter([
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Portada', 'item' => $base . '/'],
            $topicSlug !== '' ? ['@type' => 'ListItem', 'position' => 2, 'name' => $category, 'item' => $base . '/tema/' . $topicSlug] : null,
            ['@type' => 'ListItem', 'position' => $topicSlug !== '' ? 3 : 2, 'name' => (string) $article['title'], 'item' => $canonical],
        ])),
    ]]];
}
$shareUrl = rawurlencode($canonical);
$shareText = rawurlencode((string) $article['title']);
?>
<!doctype html>
<html lang="ca">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f6f7fb">
  <title><?= e((string) $article['title']) ?> — intel·ligènciaartificial.cat</title>
  <?php if ($found): ?>
  <meta name="description" content="<?= e($desc) ?>"><link rel="canonical" href="<?= e($canonical) ?>">
  <meta property="og:type" content="article"><meta property="og:site_name" content="intel·ligènciaartificial.cat"><meta property="og:locale" content="ca_ES">
  <meta property="og:title" content="<?= e((string) $article['title']) ?>"><meta property="og:description" content="<?= e($desc) ?>"><meta property="og:url" content="<?= e($canonical) ?>">
  <meta property="article:author" content="<?= e($authorName) ?>"><meta property="article:section" content="<?= e($category) ?>">
  <?php if ($publishedIso !== ''): ?><meta property="article:published_time" content="<?= e($publishedIso) ?>"><?php endif; ?>
  <?php if ($imgAbs !== ''): ?><meta property="og:image" content="<?= e($imgAbs) ?>"><meta property="og:image:alt" content="Il·lustració editorial de <?= e((string) $article['title']) ?>"><meta name="twitter:card" content="summary_large_image"><?php else: ?><meta name="twitter:card" content="summary"><?php endif; ?>
  <script type="application/ld+json"><?= json_encode($jsonld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?></script>
  <?php else: ?><meta name="robots" content="noindex"><?php endif; ?>
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&amp;family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&amp;family=Onest:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">
  <link rel="stylesheet" href="./editorial.css?v=2026072301"><script defer src="./shared.js?v=2026072302"></script>
  <style>.tts-player{display:flex;flex-wrap:wrap;align-items:center;gap:10px}.tts-player button,.tts-speed select{font-family:inherit}.tts-player button{padding:9px 13px;border:1px solid #dfe3eb;background:#fff;color:#233a82;cursor:pointer}.tts-player [hidden]{display:none}.tts-player audio{width:100%;max-width:430px}.tts-note,.tts-speed{font-size:11px;color:#5d6472}</style>
</head>
<body class="editorial-body">
  <header class="editorial-topbar"><div class="editorial-shell editorial-topbar__inner"><a class="editorial-brand" href="./" aria-label="intel·ligènciaartificial.cat, inici"><span class="editorial-brand__mark">ia</span><span class="editorial-brand__name"><strong>intel·ligència</strong><span>artificial.cat</span></span></a><nav class="editorial-nav" aria-label="Navegació principal"><a href="./#ultima-hora">Última hora</a><a href="./#catalunya">Radar català</a><a href="./analisi.html">Anàlisi</a><a href="./dossiers.html">Dossiers</a><a href="./arxiu.html">Arxiu</a></nav><a class="editorial-back" href="./">← Portada</a></div></header>

  <main class="editorial-shell editorial-main">
    <nav class="editorial-breadcrumb" aria-label="Fil d’Ariadna"><a href="./">Portada</a><?php if ($topicSlug !== ''): ?><span>/</span><a href="./tema/<?= e($topicSlug) ?>"><?= e($category) ?></a><?php endif; ?></nav>
    <header class="article-header">
      <div><p class="editorial-kicker"><?= e($category) ?> · <?= e((string) ($article['read'] ?? '5 MIN')) ?></p><h1><?= e((string) $article['title']) ?></h1><p class="editorial-lede"><?= e((string) $article['excerpt']) ?></p></div>
      <div class="article-byline-clean">
        <?php if ($authorImage !== ''): ?><img src="<?= e($authorImage) ?>" width="54" height="54" alt="Fotografia de <?= e($authorName) ?>"><?php endif; ?>
        <p>Per <strong><?= e($authorName) ?></strong></p><span><?= e($authorRole) ?></span>
        <?php if ($publishedLabel !== ''): ?><time datetime="<?= e($publishedIso) ?>"><?= e($publishedLabel) ?></time><?php endif; ?>
        <?php if ($authorUrl !== ''): ?><a rel="author" href="<?= e($authorUrl) ?>"><?= $isHumanAuthor ? 'Perfil de l’autoria' : 'Com treballem' ?> →</a><?php endif; ?>
      </div>
    </header>

    <?php if (!empty($article['image'])): ?><img class="article-hero-image" src="<?= e((string) $article['image']) ?>" alt="Il·lustració editorial de <?= e((string) $article['title']) ?>"><?php endif; ?>

    <div class="article-layout">
      <article>
        <?php if ($audioUrl): ?><div class="tts-player"><strong>Escolta:</strong><audio id="tts-audio" controls preload="none" src="<?= e($audioUrl) ?>">El teu navegador no pot reproduir l’àudio.</audio><label class="tts-speed">Velocitat <select id="tts-speed" aria-label="Velocitat de reproducció"><option value="1">1×</option><option value="1.25" selected>1,25×</option><option value="1.5">1,5×</option><option value="1.75">1,75×</option><option value="2">2×</option></select></label></div><?php else: ?><div class="tts-player" id="tts-player" hidden><button type="button" id="tts-toggle" aria-pressed="false"><span id="tts-label">Escolta l’article</span></button><button type="button" id="tts-stop" hidden>Atura</button><span class="tts-note" id="tts-note"></span><label class="tts-speed">Velocitat <select id="tts-speed" aria-label="Velocitat de reproducció"><option value="1">1×</option><option value="1.25" selected>1,25×</option><option value="1.5">1,5×</option><option value="1.75">1,75×</option><option value="2">2×</option></select></label></div><?php endif; ?>
        <div class="article-body-clean"><?php foreach (preg_split('/\n\n+/', (string) ($article['body'] ?? '')) as $paragraph): ?><p><?= e($paragraph) ?></p><?php endforeach; ?></div>
      </article>
      <aside class="article-sidebar">
        <?php if ($sourceUrl !== ''): ?><section class="article-sidecard"><h2>Font original</h2><p>Consulta la informació de partida i contrasta’n els detalls.</p><p style="margin-top:12px"><a href="<?= e($sourceUrl) ?>" target="_blank" rel="noreferrer"><?= e($sourceName) ?> ↗</a><?php if (!empty($article['sourceDate'])): ?><br><?= e((string) $article['sourceDate']) ?><?php endif; ?></p></section><?php endif; ?>
        <section class="article-sidecard"><h2>Comparteix</h2><div class="article-share-clean"><a href="https://www.linkedin.com/sharing/share-offsite/?url=<?= $shareUrl ?>" target="_blank" rel="noopener noreferrer">LinkedIn</a><a href="https://wa.me/?text=<?= $shareText ?>%20<?= $shareUrl ?>" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="mailto:?subject=<?= $shareText ?>&amp;body=<?= $shareUrl ?>">Correu</a><button type="button" data-copy-url="<?= e($canonical) ?>">Copia</button></div></section>
        <?php if (!$isHumanAuthor): ?><section class="article-sidecard"><h2>Sobre aquesta peça</h2><p>Informació elaborada a partir de les fonts citades i publicada dins del briefing diari d’IA.cat. <a href="./redaccio.html">Consulta el mètode editorial →</a></p></section><?php endif; ?>
      </aside>
    </div>

    <?php if ($related): ?><section class="article-related" aria-labelledby="related-title"><header class="article-related__head"><div><p class="editorial-kicker">Mateix tema</p><h2 id="related-title">Més context</h2></div><?php if ($topicSlug !== ''): ?><a href="./tema/<?= e($topicSlug) ?>">Veure tot el tema →</a><?php endif; ?></header><div class="article-related__grid"><?php foreach ($related as $item): ?><article><p class="topic-meta"><?= e((string) ($item['category'] ?? 'ACTUALITAT')) ?> · <?= e((string) ($item['read'] ?? '4 MIN')) ?></p><h3><a href="./article.php?slug=<?= rawurlencode((string) $item['slug']) ?>"><?= e((string) $item['title']) ?></a></h3><p><?= e((string) ($item['excerpt'] ?? '')) ?></p></article><?php endforeach; ?></div></section><?php endif; ?>

    <section class="subscribe-panel" aria-labelledby="article-newsletter-title"><div><p class="editorial-kicker">Butlletí de dissabte</p><h2 id="article-newsletter-title">La setmana d’IA, en cinc minuts.</h2></div><form class="js-subscribe-form" action="./api.php?action=subscribe" method="post"><label class="sr-only" for="article-email">El teu correu electrònic</label><input id="article-email" name="email" type="email" placeholder="el.teu@correu.cat" required><button type="submit">Vull rebre’l →</button><p class="js-form-message" role="status"></p></form></section>
  </main>

  <footer class="editorial-footer"><div class="editorial-shell editorial-footer__inner"><div><a class="editorial-brand" href="./"><span class="editorial-brand__mark">ia</span><span class="editorial-brand__name"><strong>intel·ligència</strong><span>artificial.cat</span></span></a><p>Actualitat, context i recursos sobre intel·ligència artificial en català.</p></div><nav><a href="./redaccio.html">Sobre IA.cat</a><a href="./eines.html">Guies</a><a href="./dossiers.html">Dossiers</a><a href="./arxiu.html">Arxiu</a></nav></div></footer>

<script>(()=>{if(!('speechSynthesis'in window)||!window.SpeechSynthesisUtterance)return;const s=window.speechSynthesis,p=document.getElementById('tts-player');if(!p)return;const t=document.getElementById('tts-toggle'),b=document.getElementById('tts-stop'),l=document.getElementById('tts-label'),n=document.getElementById('tts-note'),v=document.getElementById('tts-speed');let r=v?parseFloat(v.value)||1.25:1.25,state='idle';const parts=[...document.querySelectorAll('.article-header h1,.article-header .editorial-lede,.article-body-clean p')].map(el=>el.textContent.trim()).filter(Boolean);if(!parts.length)return;p.hidden=false;const voice=()=>s.getVoices().find(x=>/^ca([-_]|$)/i.test(x.lang))||null;function ui(){b.hidden=state==='idle';l.textContent=state==='playing'?'Pausa':state==='paused'?'Continua':'Escolta l’article';t.setAttribute('aria-pressed',String(state==='playing'))}function reset(){state='idle';ui()}function speak(){s.cancel();const x=voice();n.textContent=x?'':'Es farà servir la veu disponible al dispositiu.';parts.forEach((text,i)=>{const u=new SpeechSynthesisUtterance(text);u.lang='ca-ES';if(x)u.voice=x;u.rate=r;if(i===parts.length-1)u.onend=reset;s.speak(u)});state='playing';ui()}t.addEventListener('click',()=>{if(state==='idle')speak();else if(state==='playing'){s.pause();state='paused';ui()}else{s.resume();state='playing';ui()}});b.addEventListener('click',()=>{s.cancel();reset()});if(v)v.addEventListener('change',()=>{r=parseFloat(v.value)||1;if(state==='playing')speak()});window.addEventListener('pagehide',()=>s.cancel())})();</script>
<script>(()=>{const a=document.getElementById('tts-audio'),s=document.getElementById('tts-speed');if(!a||!s)return;const apply=()=>{a.playbackRate=parseFloat(s.value)||1};apply();a.addEventListener('play',apply);s.addEventListener('change',apply)})();</script>
</body>
</html>
