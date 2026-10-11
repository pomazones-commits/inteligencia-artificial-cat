<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// L'edició d'avui (11.10.2026) — /avui
// Totes les notícies publicades a l'edició del dia, juntes i en l'ordre de
// l'edició. És la destinació de «Veure-ho tot» del bloc «En moviment» de la
// portada (abans portava a «El senyal d'avui», que només en mostra una part).
//
// Dades: public/data/articles.json i public/content-status.json, tots dos
// GENERATS pel Content Hub (content-hub.mjs). Aquesta pàgina només els llegeix:
// no hi ha res a mantenir a mà.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$edicio = iacat_dades('articles.json');
$items = array_values(array_filter((array) ($edicio['items'] ?? []), static fn($i) => is_array($i) && !empty($i['title']) && preg_match('/^[a-z0-9-]+$/', (string) ($i['slug'] ?? ''))));
$estatRuta = __DIR__ . '/content-status.json';
$estat = is_file($estatRuta) ? (json_decode((string) file_get_contents($estatRuta), true) ?: []) : [];
$zona = new DateTimeZone('Europe/Madrid');
$dataEdicio = preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($estat['editionDate'] ?? '')) ? (string) $estat['editionDate'] : '';
$dies = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
$titolData = $dataEdicio !== ''
    ? ucfirst($dies[(int) (new DateTimeImmutable($dataEdicio, $zona))->format('w')]) . ', ' . iacat_data_llarga($dataEdicio)
    : 'L’edició del dia';
$hora = '';
if (!empty($estat['generatedAt']) && strtotime((string) $estat['generatedAt']) !== false) {
    $hora = (new DateTimeImmutable((string) $estat['generatedAt']))->setTimezone($zona)->format('H.i');
}
$imatge = static function (array $i): string {
    $src = (string) ($i['image'] ?? '');
    if (preg_match('#^\./assets/[A-Za-z0-9._-]+$#', $src)) { return substr($src, 1); }
    return preg_match('#^/assets/[A-Za-z0-9._/-]+$#', $src) ? $src : '';
};

iacat_capcalera([
    'titol' => 'L’edició d’avui: totes les notícies',
    'descripcio' => 'Totes les notícies d’intel·ligència artificial de l’edició del dia de intel·ligència artificial.cat, juntes i amb l’enllaç a la font original.',
    'cami' => '/avui',
    'molla' => 'L’edició d’avui',
    'css' => ['/avui.css?v=2026101101'],
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'L’edició d’avui', 'url' => IACAT_BASE . '/avui', 'inLanguage' => 'ca'],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">L’edició d’avui · <?= iacat_e($titolData) ?></p><h1 class="editorial-display">Totes les notícies <em>del dia.</em></h1>
      <p class="editorial-lede"><?= count($items) ?> <?= count($items) === 1 ? 'notícia' : 'notícies' ?> de l’edició del dia, en el mateix ordre que a la portada<?= $hora !== '' ? ', actualitzada a les ' . iacat_e($hora) : '' ?>. Cada peça porta a la notícia completa i a la font original.</p></div>
      <aside><strong>Com es fa</strong>L’edició es publica en quatre lots al dia (6.05, 10.05, 14.05 i 18.05) i arriba fins a 20 notícies. Les edicions dels dies anteriors són a l’<a href="/arxiu.html">arxiu</a>.</aside>
    </header>

<?php if ($items): ?>
    <ol class="avui-llista">
<?php foreach ($items as $n => $i): $src = $imatge($i); $href = '/article.php?slug=' . rawurlencode((string) $i['slug']); ?>
      <li class="avui-peca">
        <a class="avui-peca__foto" href="<?= iacat_e($href) ?>" tabindex="-1" aria-hidden="true"><?php if ($src !== ''): ?><img src="<?= iacat_e($src) ?>" alt="" loading="<?= $n < 3 ? 'eager' : 'lazy' ?>" decoding="async"><?php endif; ?><span><?= str_pad((string) ($n + 1), 2, '0', STR_PAD_LEFT) ?></span></a>
        <div>
          <p class="avui-peca__meta"><?= iacat_e((string) ($i['category'] ?? '')) ?><?= !empty($i['read']) ? ' · ' . iacat_e((string) $i['read']) : '' ?></p>
          <h2 class="avui-peca__titol"><a href="<?= iacat_e($href) ?>"><?= iacat_e((string) $i['title']) ?></a></h2>
<?php if (!empty($i['excerpt'])): ?>
          <p class="avui-peca__entradeta"><?= iacat_e((string) $i['excerpt']) ?></p>
<?php endif; ?>
<?php if (!empty($i['sourceName']) && preg_match('#^https://[^\s"\'<>]+$#', (string) ($i['sourceUrl'] ?? ''))): ?>
          <p class="avui-peca__font">Font: <a href="<?= iacat_e((string) $i['sourceUrl']) ?>" target="_blank" rel="noopener"><?= iacat_e((string) $i['sourceName']) ?> <span aria-hidden="true">↗</span></a></p>
<?php endif; ?>
        </div>
      </li>
<?php endforeach; ?>
    </ol>
<?php else: ?>
    <p class="seccio-nota">L’edició d’avui encara no s’ha publicat. El primer lot surt cap a les 6.05: mentrestant, pots llegir les edicions anteriors a l’<a href="/arxiu.html">arxiu</a>.</p>
<?php endif; ?>
    <p class="seccio-nota"><a href="/">← Torna a la portada</a> · <a href="/arxiu.html">Edicions anteriors</a></p>
<?php
iacat_peu();
