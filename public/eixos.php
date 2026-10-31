<?php
declare(strict_types=1);
// Índex de les seccions temàtiques (/seccions; /eixos hi redirigeix), des del 20.10.2026. Només llegeix les dades
// publicades: data/topics.php, l'hemeroteca i les peces signades (inc/eixos.php).
require_once __DIR__ . '/inc/eixos.php';
require_once __DIR__ . '/inc/peces.php';

$base = 'https://inteligencia-artificial.cat';
$eixos = iacat_eixos_tots();

// Notícies per eix: edició del dia + hemeroteca recent (archive.json, ~45 dies).
$comptes = array_fill_keys(array_keys($eixos), 0);
$vistes = [];
$edicio = is_file(__DIR__ . '/data/articles.json') ? json_decode((string) file_get_contents(__DIR__ . '/data/articles.json'), true) : [];
$arxiu = is_file(__DIR__ . '/data/archive.json') ? json_decode((string) file_get_contents(__DIR__ . '/data/archive.json'), true) : [];
foreach (array_merge((array) ($edicio['items'] ?? []), is_array($arxiu) ? $arxiu : []) as $item) {
    if (!is_array($item)) { continue; }
    $slug = (string) ($item['slug'] ?? '');
    if ($slug === '' || isset($vistes[$slug])) { continue; }
    $vistes[$slug] = true;
    $comptes[iacat_eix($item)] = ($comptes[iacat_eix($item)] ?? 0) + 1;
}

function eixos_e(string $v): string { return htmlspecialchars($v, ENT_QUOTES, 'UTF-8'); }
$descripcio = 'Les seccions temàtiques d’inteligencia-artificial.cat: poder i geopolítica, economia i treball, ciència i salut, riscos, ment i ètica, i societat i cultura.';
?>
<!doctype html>
<html lang="ca">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="theme-color" content="#f6f7fb">
  <title>Seccions — intel·ligènciaartificial.cat</title>
  <meta name="description" content="<?= eixos_e($descripcio) ?>">
  <link rel="canonical" href="<?= $base ?>/seccions">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ca_ES">
  <meta property="og:site_name" content="intel·ligènciaartificial.cat">
  <meta property="og:title" content="Les seccions d’IA.cat">
  <meta property="og:description" content="<?= eixos_e($descripcio) ?>">
  <meta property="og:url" content="<?= $base ?>/seccions">
  <meta property="og:image" content="https://inteligencia-artificial.cat/assets/og-portada.jpg">
  <link rel="stylesheet" href="/fonts.css?v=2026080701">
  <link rel="stylesheet" href="/editorial.css?v=2026103101">
  <link rel="stylesheet" href="/eixos.css?v=2026102001">
  <style>
    .eixos-llista{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:22px;margin:46px 0 60px}
    .eixos-fitxa{display:flex;flex-direction:column;gap:12px;padding:26px;border:1px solid var(--ed-line);background:var(--ed-paper)}
    .eixos-fitxa h2{margin:0;font:600 28px/1.05 var(--ed-serif);letter-spacing:-.02em}
    .eixos-fitxa h2 a{text-decoration:none}.eixos-fitxa h2 a:hover{color:var(--ed-blue)}
    .eixos-fitxa p{margin:0;color:var(--ed-muted);font-size:14px;line-height:1.6}
    .eixos-fitxa .eix-temes{margin:0}
    .eixos-fitxa__peca{padding-top:12px;border-top:1px solid var(--ed-line);font-size:13px}
    .eixos-fitxa__peca a{color:var(--ed-ink)}
    .eixos-fitxa__peu{margin-top:auto;display:flex;justify-content:space-between;align-items:center;gap:10px;font:600 10px var(--ed-mono);letter-spacing:.08em;text-transform:uppercase;color:var(--ed-muted)}
    .eixos-fitxa__peu a{color:var(--ed-blue);text-decoration:none}
  </style>
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
    <nav class="editorial-breadcrumb" aria-label="Fil d’Ariadna"><a href="/">Portada</a><span>/</span><span>Seccions</span></nav>
    <header class="topic-intro">
      <div><p class="editorial-kicker">Peces signades i actualitat, per temes</p><h1 class="editorial-display">Les seccions</h1></div>
      <div class="topic-intro__aside"><p>Les peces d’opinió, els estudis i les anàlisis signades es publiquen dins de la secció del seu tema, al costat de les notícies. Veus de CIVICAi i Veus d’empresa hi surten també.</p><small>Aquest novembre s’hi sumen noves veus dels territoris de parla catalana</small></div>
    </header>

    <div class="eixos-llista">
      <?php foreach ($eixos as $clau => $eix): if (($eix['tipus'] ?? 'eix') === 'territori') { continue; } $peces = iacat_peces_eix((string) $clau, 1); ?>
      <article class="eixos-fitxa">
        <h2><a href="/tema/<?= eixos_e((string) $clau) ?>"><?= eixos_e((string) $eix['short']) ?></a></h2>
        <p><?= eixos_e((string) $eix['description']) ?></p>
        <?php if (count((array) ($eix['temes'] ?? [])) > 1): ?><ul class="eix-temes"><?php foreach ($eix['temes'] as $tema): ?><li><?= eixos_e((string) $tema) ?></li><?php endforeach; ?></ul><?php endif; ?>
        <?php if ($peces): ?><p class="eixos-fitxa__peca">Darrera peça signada: <a href="<?= eixos_e((string) $peces[0]['url']) ?>"><?= eixos_e((string) $peces[0]['titol']) ?></a><?php if (!empty($peces[0]['item']['author'])): ?>, de <?= eixos_e((string) $peces[0]['item']['author']) ?><?php endif; ?></p><?php endif; ?>
        <div class="eixos-fitxa__peu"><span><?= (int) ($comptes[$clau] ?? 0) ?> notícies recents</span><a href="/tema/<?= eixos_e((string) $clau) ?>">Obrir la secció →</a></div>
      </article>
      <?php endforeach; ?>
    </div>

    <section class="topic-directory" aria-labelledby="eixos-territori"><p class="editorial-kicker" id="eixos-territori">Per territori</p><div class="topic-directory__links"><a href="/tema/catalunya">IA a Catalunya, la Comunitat Valenciana, les Illes Balears i Andorra</a><a href="/escriu.html">Escriu a IA.cat</a></div></section>
  </main>

  <footer class="editorial-footer"><div class="editorial-shell editorial-footer__inner"><div><a class="editorial-brand" href="/"><span class="editorial-brand__mark">ia</span><span class="editorial-brand__name"><strong>intel·ligència</strong><span>artificial.cat</span></span></a><p>Actualitat, context i recursos sobre intel·ligència artificial en català.</p></div><nav><a href="/redaccio.html">Sobre IA.cat</a><a href="/eines.html">Guies</a><a href="/dossiers.html">Dossiers</a><a href="/arxiu.html">Arxiu</a></nav></div></footer>
</body>
</html>
