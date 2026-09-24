<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Plantilla compartida de les pàgines de servei creades el 24.09.2026
// (autors, agenda, glossari, ecosistema, llengua, correccions).
// Mateixa capçalera, peu i fulls d'estil que les pàgines interiors de sempre
// (editorial.css); els estils propis d'aquestes pàgines viuen a seccions.css.
// ---------------------------------------------------------------------------

require_once __DIR__ . '/peces.php';

/**
 * $meta: titol, descripcio, cami (p. ex. '/agenda'), jsonld (array), molla (text del fil d'Ariadna),
 *        robots (opcional), tipusOg (opcional).
 */
function iacat_capcalera(array $meta): void
{
    $url = IACAT_BASE . ($meta['cami'] ?? '/');
    $titol = (string) $meta['titol'];
    $desc = (string) $meta['descripcio'];
    header('Content-Type: text/html; charset=utf-8');
    ?><!doctype html>
<html lang="ca">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f6f7fb">
  <title><?= iacat_e($titol) ?> · intel·ligència artificial.cat</title>
  <meta name="description" content="<?= iacat_e($desc) ?>">
  <?php if (!empty($meta['robots'])): ?><meta name="robots" content="<?= iacat_e((string) $meta['robots']) ?>">
  <?php else: ?><link rel="canonical" href="<?= iacat_e($url) ?>">
  <?php endif; ?>
  <meta property="og:type" content="<?= iacat_e((string) ($meta['tipusOg'] ?? 'website')) ?>"><meta property="og:locale" content="ca_ES"><meta property="og:site_name" content="intel·ligènciaartificial.cat">
  <meta property="og:title" content="<?= iacat_e($titol) ?>">
  <meta property="og:description" content="<?= iacat_e($desc) ?>">
  <meta property="og:url" content="<?= iacat_e($url) ?>">
  <meta property="og:image" content="https://inteligencia-artificial.cat/assets/og-portada.jpg"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="intel·ligènciaartificial.cat — el briefing diari de la intel·ligència artificial en català">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="alternate" type="application/rss+xml" title="intel·ligènciaartificial.cat — notícies" href="/feed.xml">
  <link rel="stylesheet" href="/fonts.css?v=2026080701">
  <link rel="stylesheet" href="/editorial.css?v=2026072401">
  <link rel="stylesheet" href="/seccions.css?v=2026092402">
  <script defer src="/shared.js?v=2026092401"></script>
  <?php if (!empty($meta['jsonld'])): ?><script type="application/ld+json"><?= json_encode($meta['jsonld'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_HEX_TAG) ?></script>
  <?php endif; ?>
</head>
<body class="editorial-body">
  <?php iacat_barra(); ?>
  <main class="editorial-shell editorial-main seccio-main">
    <nav class="editorial-breadcrumb" aria-label="Fil d’Ariadna"><a href="/">Portada</a><span>/</span><?php
      if (!empty($meta['mollaPare'])): ?><a href="<?= iacat_e((string) $meta['mollaPare'][1]) ?>"><?= iacat_e((string) $meta['mollaPare'][0]) ?></a><span>/</span><?php endif;
      ?><span><?= iacat_e((string) ($meta['molla'] ?? $titol)) ?></span></nav>
<?php
}

function iacat_barra(): void
{
    ?><header class="editorial-topbar"><div class="editorial-shell editorial-topbar__inner"><a class="editorial-brand" href="/" aria-label="intel·ligènciaartificial.cat, inici"><span class="editorial-brand__mark">ia</span><span class="editorial-brand__name"><strong>intel·ligència</strong><span>artificial.cat</span></span></a><nav class="editorial-nav" aria-label="Navegació principal"><a href="/#ultima-hora">Última hora</a><a href="/#catalunya">Radar català</a><a href="/tribuna.html">Tribuna</a><a href="/analisi.html">Anàlisi</a><a href="/dossiers.html">Dossiers</a><a href="/arxiu.html">Arxiu</a></nav><a class="editorial-back" href="/">← Portada</a></div></header>
<?php
}

function iacat_peu(): void
{
    ?>
  </main>
  <footer class="editorial-footer"><div class="editorial-shell editorial-footer__inner"><div><a class="editorial-brand" href="/"><span class="editorial-brand__mark">ia</span><span class="editorial-brand__name"><strong>intel·ligència</strong><span>artificial.cat</span></span></a><p>Actualitat, context i recursos sobre intel·ligència artificial en català.</p></div><nav><a href="/redaccio.html">Sobre IA.cat</a><a href="/eines.html">Guies</a><a href="/dossiers.html">Dossiers</a><a href="/arxiu.html">Arxiu</a></nav></div></footer>
</body>
</html>
<?php
}

/** Data ISO → «24 de setembre de 2026». */
function iacat_data_llarga(string $iso, bool $ambAny = true): string
{
    if (!preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $iso, $m)) { return $iso; }
    $mesos = ['', 'de gener', 'de febrer', 'de març', 'd’abril', 'de maig', 'de juny', 'de juliol', 'd’agost', 'de setembre', 'd’octubre', 'de novembre', 'de desembre'];
    return (int) $m[3] . ' ' . $mesos[(int) $m[2]] . ($ambAny ? ' de ' . $m[1] : '');
}

/** Llegeix un JSON de public/data/ (retorna [] si no hi és o és il·legible). */
function iacat_dades(string $nom): array
{
    $ruta = dirname(__DIR__) . '/data/' . $nom;
    if (!is_file($ruta)) { return []; }
    $v = json_decode((string) file_get_contents($ruta), true);
    return is_array($v) ? $v : [];
}
