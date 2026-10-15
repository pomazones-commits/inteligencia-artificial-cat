<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// «Veus d'empresa» (15.10.2026): articles i entrevistes de persones que treballen
// en empreses privades i escriuen (o responen) en nom de l'empresa.
// Adreça: /veus-d-empresa (regla a .htaccess). Cada peça: /empresa/<id> (peca.php).
//
// No té dades pròpies: les peces surten soles d'empresa.js (window.IA_EMPRESA,
// fitxer manual, de la més recent a la més antiga). No és contingut patrocinat:
// ningú no paga per sortir-hi, i així ho diu la pàgina.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$peces = iacat_peces('empresa');
$url = IACAT_BASE . '/veus-d-empresa';
$nom = "Veus d'empresa";
$descripcio = 'Persones que fan servir o construeixen intel·ligència artificial a les empreses expliquen què fan, com ho fan i amb quins límits. Articles i entrevistes per escrit, en català i amb versió en àudio.';

$jsonld = [
    '@context' => 'https://schema.org',
    '@graph' => [
        [
            '@type' => 'CollectionPage',
            'name' => $nom,
            'description' => $descripcio,
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
            ['@type' => 'ListItem', 'position' => 2, 'name' => $nom, 'item' => $url],
        ]],
    ],
];

iacat_capcalera([
    'titol' => $nom,
    'descripcio' => $descripcio,
    'cami' => '/veus-d-empresa',
    'jsonld' => $jsonld,
    'molla' => $nom,
]);

$fitxa = static function (array $p): string {
    $item = $p['item'];
    $html = '<li class="fitxa">';
    $meta = [mb_convert_case(mb_strtolower((string) ($item['category'] ?? 'Article')), MB_CASE_TITLE)];
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
        <p class="editorial-kicker">SECCIÓ · ARTICLES I ENTREVISTES</p>
        <h1><?= iacat_e($nom) ?></h1>
        <p class="editorial-lede"><?= iacat_e($descripcio) ?></p>
      </div>
      <aside>
        <strong>Sobre la secció</strong>
        Cada peça la signa una persona de l’empresa, amb el seu nom i el seu càrrec. Les opinions són de qui signa; la selecció, les preguntes i l’edició, de la redacció d’inteligencia-artificial.cat. <strong>No és contingut patrocinat:</strong> cap empresa no paga per sortir-hi. Totes les peces tenen versió en àudio.
      </aside>
    </section>

    <section class="seccio-bloc" id="peces">
      <h2>Les peces</h2>
      <?php if ($peces): ?>
      <p class="seccio-intro"><?= count($peces) === 1 ? 'Una peça publicada fins ara: la que estrena la secció.' : iacat_e(count($peces) . ' peces publicades fins ara, de la més recent a la més antiga.') ?></p>
      <ul class="seccio-grid seccio-grid--2"><?php foreach ($peces as $p) { echo $fitxa($p); } ?></ul>
      <?php else: ?>
      <p class="seccio-intro">Les primeres peces es publicaran les properes setmanes.</p>
      <?php endif; ?>
    </section>

    <p class="seccio-nota">Treballes en una empresa que fa servir o construeix IA i vols explicar-ho? Escriu-nos a <a href="mailto:pomazona@gmail.com">pomazona@gmail.com</a>. També pots llegir <a href="/tribuna.html">La tribuna</a>, amb articles d’opinió de persones expertes.</p>
<?php
iacat_peu();
