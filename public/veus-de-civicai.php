<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// «Veus de CIVICAi» (12.10.2026): la sèrie de «La tribuna» on escriuen sòcies,
// socis, fundadores, fundadors, directores i directors de CIVICAi.
// Adreça: /veus-de-civicai (regla a .htaccess).
//
// No té dades pròpies: la definició de la sèrie és a series.js i les peces surten
// soles de tribuna*.js i estudis*.js (les que porten "serie": "veus-de-civicai").
// La «columna del president» són les tribunes de l'autor de "columna.autor".
// Condicions de CIVICAi (Manel Sanromà, 12.10.2026): logo de CIVICAi, invitació a
// associar-s'hi i la descripció genèrica de qui hi escriu. Totes tres hi són.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

const SERIE_CLAU = 'veus-de-civicai';
$serie = iacat_series()[SERIE_CLAU] ?? null;
if (!is_array($serie)) { http_response_code(500); exit; }

$peces = iacat_peces_serie(SERIE_CLAU);

// La columna del president: les seves tribunes (no formen part de la sèrie).
$columna = [];
$autorColumna = (string) ($serie['columna']['autor'] ?? '');
if ($autorColumna !== '') {
    foreach (iacat_peces('tribuna') as $peca) {
        if ($peca['autor'] === $autorColumna && ($peca['item']['serie'] ?? '') !== SERIE_CLAU) { $columna[] = $peca; }
    }
}

$cami = (string) $serie['cami'];
$url = IACAT_BASE . $cami;
$crida = (array) ($serie['crida'] ?? []);

$jsonld = [
    '@context' => 'https://schema.org',
    '@graph' => [
        [
            '@type' => 'CollectionPage',
            'name' => (string) $serie['nom'],
            'description' => (string) $serie['descripcio'],
            'url' => $url,
            'inLanguage' => 'ca',
            'about' => ['@type' => 'Organization', 'name' => (string) $serie['entitat'], 'url' => (string) $serie['web'], 'logo' => IACAT_BASE . (string) $serie['logo']],
            'isPartOf' => ['@type' => 'WebSite', 'name' => 'intel·ligènciaartificial.cat', 'url' => IACAT_BASE . '/'],
            'mainEntity' => [
                '@type' => 'ItemList',
                'itemListElement' => array_map(static fn(array $p, int $i): array => ['@type' => 'ListItem', 'position' => $i + 1, 'url' => $p['url'], 'name' => $p['titol']], $peces, array_keys($peces)),
            ],
        ],
        ['@type' => 'BreadcrumbList', 'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Portada', 'item' => IACAT_BASE . '/'],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'La tribuna', 'item' => IACAT_BASE . '/arxiu-tribuna.html'],
            ['@type' => 'ListItem', 'position' => 3, 'name' => (string) $serie['nom'], 'item' => $url],
        ]],
    ],
];

iacat_capcalera([
    'titol' => (string) $serie['nom'],
    'descripcio' => (string) $serie['descripcio'],
    'cami' => $cami,
    'jsonld' => $jsonld,
    'mollaPare' => ['La tribuna', '/arxiu-tribuna.html'],
    'molla' => (string) $serie['nom'],
    'css' => ['/series.css?v=2026101201'],
]);

$fitxa = static function (array $p, bool $ambAutor): string {
    $item = $p['item'];
    $html = '<li class="fitxa">';
    $meta = [$p['tipus'] === 'estudis' ? 'Estudis' : 'La tribuna'];
    if ($p['dataIso'] !== '') { $meta[] = iacat_data_llarga($p['dataIso']); }
    $html .= '<span class="fitxa__meta">' . iacat_e(implode(' · ', $meta)) . '</span>';
    $html .= '<h3><a href="' . iacat_e($p['url']) . '">' . iacat_e($p['titol']) . '</a></h3>';
    if ($ambAutor && $p['autor'] !== '') {
        $rol = iacat_rol_html((string) ($item['role'] ?? ''), (string) ($item['org'] ?? ''), (string) ($item['orgUrl'] ?? ''));
        $html .= '<p class="fitxa__autor"><strong><a href="/autor/' . iacat_e(iacat_slug($p['autor'])) . '">' . iacat_e($p['autor']) . '</a></strong>' . ($rol !== '' ? ' · ' . $rol : '') . '</p>';
    }
    if ($p['resum'] !== '') { $html .= '<p>' . iacat_e($p['resum']) . '</p>'; }
    $html .= '<span class="fitxa__peu"><a href="' . iacat_e($p['url']) . '">Llegeix-la →</a></span>';
    return $html . '</li>';
};
?>
    <section class="seccio-hero">
      <div>
        <p class="editorial-kicker">SÈRIE DE «LA TRIBUNA» · AMB <?= iacat_e(mb_strtoupper((string) $serie['entitat'])) ?></p>
        <h1><?= iacat_e((string) $serie['nom']) ?></h1>
        <p class="editorial-lede"><?= iacat_e((string) $serie['descripcio']) ?></p>
        <p class="serie-accions">
          <?php if (!empty($crida['href'])): ?><a class="serie-boto" href="<?= iacat_e((string) $crida['href']) ?>" target="_blank" rel="noopener"><?= iacat_e((string) $crida['text']) ?> →</a><?php endif; ?>
          <a class="serie-mes" href="<?= iacat_e((string) $serie['web']) ?>" target="_blank" rel="noopener">Coneix <?= iacat_e((string) $serie['entitat']) ?> →</a>
        </p>
      </div>
      <aside>
        <a class="serie-hero__logo" href="<?= iacat_e((string) $serie['web']) ?>" target="_blank" rel="noopener" title="<?= iacat_e((string) $serie['entitat']) ?>"><img src="<?= iacat_e((string) $serie['logo']) ?>" alt="<?= iacat_e((string) $serie['entitat']) ?>"></a>
        <strong>Sobre la sèrie</strong>
        Cada peça la signa una persona de <?= iacat_e((string) $serie['entitat']) ?>, amb el seu nom i el seu càrrec. Les opinions són de qui signa; la selecció i l’edició, de la redacció d’inteligencia-artificial.cat. Totes les peces tenen versió en àudio.
      </aside>
    </section>

    <section class="seccio-bloc" id="veus">
      <h2>Les veus</h2>
      <?php if ($peces): ?>
      <p class="seccio-intro"><?= count($peces) === 1 ? 'Una peça publicada fins ara.' : iacat_e(count($peces) . ' peces publicades fins ara, de la més recent a la més antiga.') ?></p>
      <ul class="seccio-grid seccio-grid--2"><?php foreach ($peces as $p) { echo $fitxa($p, true); } ?></ul>
      <?php else: ?>
      <p class="serie-buit">Les primeres veus de la sèrie es publicaran les properes setmanes. Mentrestant, pots llegir la columna setmanal del president de <?= iacat_e((string) $serie['entitat']) ?>, aquí sota.</p>
      <?php endif; ?>
    </section>

    <?php if ($columna): ?>
    <section class="seccio-bloc" id="columna">
      <h2><?= iacat_e((string) ($serie['columna']['titol'] ?? '')) ?></h2>
      <p class="seccio-intro"><?= iacat_e((string) ($serie['columna']['intro'] ?? '')) ?> <a href="/autor/<?= iacat_e(iacat_slug($autorColumna)) ?>">Totes les seves peces →</a></p>
      <ul class="seccio-grid"><?php foreach ($columna as $p) { echo $fitxa($p, false); } ?></ul>
    </section>
    <?php endif; ?>

    <p class="seccio-nota">Vols escriure a la sèrie? Si ets membre de <?= iacat_e((string) $serie['entitat']) ?>, escriu-nos a <a href="mailto:pomazona@gmail.com">pomazona@gmail.com</a>. I si no ho ets, <a href="/escriu.html">aquí t’expliquem com proposar una tribuna</a>.</p>
<?php
iacat_peu();
