<?php
declare(strict_types=1);

// Pàgina "La imatge del dia": mostra la fotografia editorial diària i el seu
// text associat (camp "body" de daily-image.js), amb el disseny editorial
// unificat del web (editorial.css, com article.php).
$base = 'https://inteligencia-artificial.cat';
$file = __DIR__ . '/daily-image.js';
$raw = is_file($file) ? (string) file_get_contents($file) : '';
$data = [];
$start = strpos($raw, '{');
$end = strrpos($raw, '}');
if ($start !== false && $end !== false && $end > $start) {
    $decoded = json_decode(substr($raw, $start, $end - $start + 1), true);
    if (is_array($decoded)) { $data = $decoded; }
}

function e(string $value): string { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }

$title   = trim((string) ($data['title'] ?? 'La imatge del dia'));
$kicker  = trim((string) ($data['kicker'] ?? 'IA × Societat'));
$caption = trim((string) ($data['caption'] ?? ''));
$credit  = trim((string) ($data['credit'] ?? 'Imatge editorial generada amb IA'));
$image   = trim((string) ($data['image'] ?? ''));
$alt     = trim((string) ($data['alt'] ?? 'Fotografia editorial del dia'));
$bodyRaw = trim((string) ($data['body'] ?? ''));
if ($bodyRaw === '') { $bodyRaw = $caption; }

$dateIso = '';
$dateLabel = '';
if (!empty($data['date']) && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', (string) $data['date'], $m)) {
    $dateIso = $m[0];
    $dateLabel = $m[3] . '.' . $m[2] . '.' . $m[1];
}

// Àudio neural (el genera el workflow d'àudio a assets/audio/imatge-AAAA-MM-DD.mp3).
// Si encara no existeix, lector.js farà servir la veu del navegador.
$audioUrl = '';
if ($dateIso !== '') {
    $audioFile = __DIR__ . '/assets/audio/imatge-' . $dateIso . '.mp3';
    if (is_file($audioFile)) { $audioUrl = './assets/audio/imatge-' . $dateIso . '.mp3?v=' . (string) filemtime($audioFile); }
    else { $audioUrl = './assets/audio/imatge-' . $dateIso . '.mp3'; } // lector.js comprova si hi és
}

$canonical = $base . '/imatge-del-dia.php';
$imgAbs = $image !== '' ? $base . '/' . ltrim((string) preg_replace('#^\./#', '', $image), '/') : '';
$desc = $caption !== '' ? $caption : $title;
$paragraphs = array_values(array_filter(array_map('trim', preg_split('/\n\n+/', $bodyRaw) ?: [])));
?>
<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f6f7fb">
<title><?= e($title) ?> — La imatge del dia · intel·ligència artificial.cat</title>
<meta name="description" content="<?= e($desc) ?>">
<link rel="canonical" href="<?= e($canonical) ?>">
<meta property="og:type" content="article">
<meta property="og:site_name" content="intel·ligènciaartificial.cat">
<meta property="og:locale" content="ca_ES">
<meta property="og:title" content="<?= e($title) ?>">
<meta property="og:description" content="<?= e($desc) ?>">
<meta property="og:url" content="<?= e($canonical) ?>">
<?php if ($imgAbs !== ''): ?>
<meta property="og:image" content="<?= e($imgAbs) ?>">
<meta name="twitter:card" content="summary_large_image">
<?php else: ?>
<meta name="twitter:card" content="summary">
<?php endif; ?>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600&amp;family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&amp;family=Onest:wght@400;500;600;700;800&amp;display=swap" rel="stylesheet">
<link rel="stylesheet" href="./editorial.css?v=2026072401">
<script defer src="./shared.js?v=2026072302"></script>
</head>
<body class="editorial-body">
  <header class="editorial-topbar"><div class="editorial-shell editorial-topbar__inner"><a class="editorial-brand" href="./" aria-label="intel·ligènciaartificial.cat, inici"><span class="editorial-brand__mark">ia</span><span class="editorial-brand__name"><strong>intel·ligència</strong><span>artificial.cat</span></span></a><nav class="editorial-nav" aria-label="Navegació principal"><a href="./#ultima-hora">Última hora</a><a href="./#catalunya">Radar català</a><a href="./analisi.html">Anàlisi</a><a href="./dossiers.html">Dossiers</a><a href="./arxiu.html">Arxiu</a></nav><a class="editorial-back" href="./">← Portada</a></div></header>

  <main class="editorial-shell editorial-main">
    <nav class="editorial-breadcrumb" aria-label="Fil d’Ariadna"><a href="./">Portada</a><span>/</span><span>La imatge del dia</span></nav>
    <header class="article-header">
      <div><p class="editorial-kicker"><?= e($kicker) ?><?php if ($dateLabel !== ''): ?> · IMATGE DEL DIA · <?= e($dateLabel) ?><?php endif; ?></p><h1><?= e($title) ?></h1><?php if ($caption !== ''): ?><p class="editorial-lede"><?= e($caption) ?></p><?php endif; ?></div>
      <div class="article-byline-clean">
        <p>Per <strong>Redacció IA.cat</strong></p><span>La imatge del dia</span>
        <?php if ($dateLabel !== ''): ?><time datetime="<?= e($dateIso) ?>"><?= e($dateLabel) ?></time><?php endif; ?>
        <a rel="author" href="./redaccio.html">Com treballem →</a>
      </div>
    </header>

    <?php if ($image !== ''): ?><img class="article-hero-image" src="<?= e($image) ?>" alt="<?= e($alt) ?>"><?php endif; ?>

    <div class="article-layout">
      <article>
        <div id="lector"></div>
        <div class="article-body-clean">
          <?php foreach ($paragraphs as $paragraph): ?><p><?= e($paragraph) ?></p><?php endforeach; ?>
        </div>
      </article>
      <aside class="article-sidebar">
        <section class="article-sidecard"><h2>Sobre la imatge</h2><p><?= e($credit) ?>. Cada dia publiquem una fotografia editorial que acompanya la reflexió de la redacció.</p></section>
        <section class="article-sidecard"><h2>Comparteix</h2><div class="article-share-clean"><a href="https://www.linkedin.com/sharing/share-offsite/?url=<?= rawurlencode($canonical) ?>" target="_blank" rel="noopener noreferrer">LinkedIn</a><a href="https://wa.me/?text=<?= rawurlencode($title) ?>%20<?= rawurlencode($canonical) ?>" target="_blank" rel="noopener noreferrer">WhatsApp</a><a href="mailto:?subject=<?= rawurlencode($title) ?>&amp;body=<?= rawurlencode($canonical) ?>">Correu</a><button type="button" data-copy-url="<?= e($canonical) ?>">Copia</button></div></section>
      </aside>
    </div>
  </main>

  <footer class="editorial-footer"><div class="editorial-shell editorial-footer__inner"><div><a class="editorial-brand" href="./"><span class="editorial-brand__mark">ia</span><span class="editorial-brand__name"><strong>intel·ligència</strong><span>artificial.cat</span></span></a><p>Actualitat, context i recursos sobre intel·ligència artificial en català.</p></div><nav><a href="./redaccio.html">Sobre IA.cat</a><a href="./eines.html">Guies</a><a href="./dossiers.html">Dossiers</a><a href="./arxiu.html">Arxiu</a></nav></div></footer>

  <script src="./lector.js?v=2026072401"></script>
  <script>
    (function () {
      var parts = [<?= json_encode($title, JSON_UNESCAPED_UNICODE) ?>, <?= json_encode($caption, JSON_UNESCAPED_UNICODE) ?>].concat(<?= json_encode($paragraphs, JSON_UNESCAPED_UNICODE) ?>).filter(Boolean);
      window.IALector.init({
        container: document.getElementById('lector'),
        audioUrl: <?= json_encode($audioUrl !== '' ? $audioUrl : null, JSON_UNESCAPED_SLASHES) ?>,
        parts: parts
      });
    })();
  </script>
</body>
</html>
