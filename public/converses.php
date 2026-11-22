<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// «Converses» (22.11.2026, decisió d'en Rafael): les entrevistes als convidats de
// la tribuna. Adreça: /converses (regla a .htaccess).
//
// Funciona com «Veus de l'administració»: no té dades pròpies. La definició és a
// series.js i les peces surten soles de tribuna-arxiu.js (les que porten
// "serie": "converses"). Tenen cua pròpia (secció «conversa» de
// incoming/peces-programades.json, una al dia) i banda pròpia a la portada
// (#converses, just sota «La tribuna»), però continuen sent peces de la tribuna:
// surten a l'arxiu de la tribuna i a la seva secció temàtica.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

const SERIE_CLAU = 'converses';
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

$fitxa = static function (array $p): string {
    $item = $p['item'];
    $html = '<li class="fitxa">';
    $meta = ['La tribuna · Entrevista'];
    if ($p['dataIso'] !== '') { $meta[] = iacat_data_llarga($p['dataIso']); }
    $html .= '<span class="fitxa__meta">' . iacat_e(implode(' · ', $meta)) . '</span>';
    $html .= '<h3><a href="' . iacat_e($p['url']) . '">' . iacat_e($p['titol']) . '</a></h3>';
    if ($p['autor'] !== '') {
        $rol = iacat_rol_html((string) ($item['role'] ?? ''), (string) ($item['org'] ?? ''), (string) ($item['orgUrl'] ?? ''));
        $html .= '<p class="fitxa__autor"><strong><a href="/autor/' . iacat_e(iacat_slug($p['autor'])) . '">' . iacat_e($p['autor']) . '</a></strong>' . ($rol !== '' ? ' · ' . $rol : '') . '</p>';
    }
    if ($p['resum'] !== '') { $html .= '<p>' . iacat_e($p['resum']) . '</p>'; }
    $html .= '<span class="fitxa__peu"><a href="' . iacat_e($p['url']) . '">Llegeix l’entrevista →</a></span>';
    return $html . '</li>';
};
?>
    <section class="seccio-hero">
      <div>
        <p class="editorial-kicker">LES ENTREVISTES DE «LA TRIBUNA»</p>
        <h1><?= iacat_e((string) $serie['nom']) ?></h1>
        <p class="editorial-lede"><?= iacat_e((string) $serie['descripcio']) ?></p>
      </div>
      <aside>
        <span class="serie-hero__logo"><img src="<?= iacat_e((string) $serie['logo']) ?>" alt=""></span>
        <strong>Sobre la secció</strong>
        Cada dia, una conversa amb una persona convidada de la tribuna: les preguntes són de la redacció d’inteligencia-artificial.cat i les respostes, de qui hi parla, amb el seu nom i el seu càrrec. Les opinions són de la persona entrevistada. Cap entrevista no es publica sense el seu vistiplau a la versió final. Totes tenen versió en àudio.
      </aside>
    </section>

    <section class="seccio-bloc" id="converses">
      <h2>Les converses</h2>
      <?php if ($peces): ?>
      <p class="seccio-intro"><?= count($peces) === 1 ? 'Una conversa publicada fins ara. Els propers dies n’hi haurà més.' : iacat_e(count($peces) . ' converses publicades fins ara, de la més recent a la més antiga.') ?></p>
      <ul class="seccio-grid seccio-grid--2"><?php foreach ($peces as $p) { echo $fitxa($p); } ?></ul>
      <?php else: ?>
      <p class="serie-buit">Les primeres converses es publicaran els propers dies.</p>
      <?php endif; ?>
    </section>

    <p class="seccio-nota">Hi ha algú que voldries llegir en aquesta secció? Escriu-nos a <a href="mailto:pomazona@gmail.com">pomazona@gmail.com</a> o <a href="/escriu.html">mira aquí com proposar una peça</a>.</p>
<?php
iacat_peu();
