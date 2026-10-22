<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// «Veus de l'administració» (20.10.2026, decisió d'en Rafael): la sèrie on
// escriuen responsables de les administracions públiques dels territoris de
// parla catalana. Adreça: /veus-de-l-administracio (regla a .htaccess).
//
// Funciona com «Veus de CIVICAi»: no té dades pròpies. La definició és a
// series.js i les peces surten soles de tribuna*.js i estudis*.js (les que
// porten "serie": "veus-de-l-administracio"). A diferència de CIVICAi, les
// peces SÍ que poden ser la tribuna o l'estudi vigents: la sèrie és només un
// distintiu i una pàgina que les aplega. La primera és l'estudi de Josep Maria
// Flores (caTgirem, Generalitat de Catalunya, 07.10.2026).
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

const SERIE_CLAU = 'veus-de-l-administracio';
$serie = iacat_series()[SERIE_CLAU] ?? null;
if (!is_array($serie)) { http_response_code(500); exit; }

$peces = iacat_peces_serie(SERIE_CLAU);
$cami = (string) $serie['cami'];
$url = IACAT_BASE . $cami;

$jsonld = [
    '@context' => 'https://schema.org',
    '@graph' => [
        [
            '@type' => 'CollectionPage',
            'name' => (string) $serie['nom'],
            'description' => (string) $serie['descripcio'],
            'url' => $url,
            'inLanguage' => 'ca',
            'isPartOf' => ['@type' => 'WebSite', 'name' => 'intel·ligènciaartificial.cat', 'url' => IACAT_BASE . '/'],
            'mainEntity' => [
                '@type' => 'ItemList',
                'itemListElement' => array_map(static fn(array $p, int $i): array => ['@type' => 'ListItem', 'position' => $i + 1, 'url' => $p['url'], 'name' => $p['titol']], $peces, array_keys($peces)),
            ],
        ],
        ['@type' => 'BreadcrumbList', 'itemListElement' => [
            ['@type' => 'ListItem', 'position' => 1, 'name' => 'Portada', 'item' => IACAT_BASE . '/'],
            ['@type' => 'ListItem', 'position' => 2, 'name' => 'Qui hi escriu', 'item' => IACAT_BASE . '/autors'],
            ['@type' => 'ListItem', 'position' => 3, 'name' => (string) $serie['nom'], 'item' => $url],
        ]],
    ],
];

iacat_capcalera([
    'titol' => (string) $serie['nom'],
    'descripcio' => (string) $serie['descripcio'],
    'cami' => $cami,
    'jsonld' => $jsonld,
    'mollaPare' => ['Qui hi escriu', '/autors'],
    'molla' => (string) $serie['nom'],
    'css' => ['/series.css?v=2026101201'],
]);

$fitxa = static function (array $p): string {
    $item = $p['item'];
    $html = '<li class="fitxa">';
    $meta = [$p['tipus'] === 'estudis' ? 'Estudi a fons' : 'La tribuna'];
    if ($p['dataIso'] !== '') { $meta[] = iacat_data_llarga($p['dataIso']); }
    $html .= '<span class="fitxa__meta">' . iacat_e(implode(' · ', $meta)) . '</span>';
    $html .= '<h3><a href="' . iacat_e($p['url']) . '">' . iacat_e($p['titol']) . '</a></h3>';
    if ($p['autor'] !== '') {
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
        <p class="editorial-kicker">SÈRIE DE «LA TRIBUNA» I «ESTUDIS»</p>
        <h1><?= iacat_e((string) $serie['nom']) ?></h1>
        <p class="editorial-lede"><?= iacat_e((string) $serie['descripcio']) ?></p>
      </div>
      <aside>
        <span class="serie-hero__logo"><img src="<?= iacat_e((string) $serie['logo']) ?>" alt=""></span>
        <strong>Sobre la sèrie</strong>
        Cada peça la signa una persona que treballa a l’administració, amb el seu nom i el seu càrrec. Les opinions són de qui signa; la selecció i l’edició, de la redacció d’inteligencia-artificial.cat. Cap text no es publica sense el vistiplau de l’autor a la versió final. Totes les peces tenen versió en àudio.
      </aside>
    </section>

    <section class="seccio-bloc" id="veus">
      <h2>Les veus</h2>
      <?php if ($peces): ?>
      <p class="seccio-intro"><?= count($peces) === 1 ? 'Una peça publicada fins ara. Les properes setmanes n’hi haurà més.' : iacat_e(count($peces) . ' peces publicades fins ara, de la més recent a la més antiga.') ?></p>
      <ul class="seccio-grid seccio-grid--2"><?php foreach ($peces as $p) { echo $fitxa($p); } ?></ul>
      <?php else: ?>
      <p class="serie-buit">Les primeres veus de la sèrie es publicaran les properes setmanes.</p>
      <?php endif; ?>
    </section>

    <p class="seccio-nota">Treballes en una administració pública i vols explicar què hi fa la IA? Escriu-nos a <a href="mailto:pomazona@gmail.com">pomazona@gmail.com</a> o <a href="/escriu.html">mira aquí com proposar una peça</a>.</p>
<?php
iacat_peu();
