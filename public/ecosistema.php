<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Mapa de l'ecosistema català de la IA (24.09.2026) — /ecosistema
// Dades: public/data/ecosistema.json (manual). Categories admeses: Recerca,
// Universitat, Observatori, Administració, Comunitat, Empresa.
// Criteri per a les empreses: la IA n'ha de ser el nucli, i sense publicitat.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$dades = iacat_dades('ecosistema.json');
$categories = [
    'Recerca' => ['Centres de recerca', 'recerca'],
    'Universitat' => ['Universitats i grups de recerca', 'universitats'],
    'Observatori' => ['Observatoris i ètica', 'observatoris'],
    'Administració' => ['Administració i programes públics', 'administracio'],
    'Comunitat' => ['Associacions i comunitat', 'comunitat'],
    'Empresa' => ['Empreses i clústers', 'empreses'],
];
$perCat = [];
foreach ((array) ($dades['entitats'] ?? []) as $e) {
    if (!is_array($e) || empty($e['nom']) || empty($e['url'])) { continue; }
    $cat = isset($categories[$e['categoria'] ?? '']) ? (string) $e['categoria'] : 'Comunitat';
    $perCat[$cat][] = $e;
}
$total = array_sum(array_map('count', $perCat));

$ld = [];
foreach ($perCat as $llista) {
    foreach ($llista as $e) {
        $ld[] = ['@type' => 'Organization', 'name' => (string) $e['nom'], 'url' => (string) $e['url']] + (!empty($e['sigles']) ? ['alternateName' => (string) $e['sigles']] : []);
    }
}
iacat_capcalera([
    'titol' => 'L’ecosistema català de la IA',
    'descripcio' => 'Centres de recerca, universitats, observatoris, administració, associacions i empreses que fan intel·ligència artificial a Catalunya.',
    'cami' => '/ecosistema',
    'molla' => 'Ecosistema',
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'L’ecosistema català de la IA', 'url' => IACAT_BASE . '/ecosistema', 'inLanguage' => 'ca',
        'mainEntity' => ['@type' => 'ItemList', 'numberOfItems' => count($ld), 'itemListElement' => array_map(static fn($o, $i) => ['@type' => 'ListItem', 'position' => $i + 1, 'item' => $o], $ld, array_keys($ld))]],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Ecosistema</p><h1 class="editorial-display">Qui fa IA <em>a Catalunya.</em></h1>
      <p class="editorial-lede"><?= $total ?> centres, grups, observatoris, programes públics, associacions i empreses que investiguen, regulen, divulguen o apliquen la intel·ligència artificial al país.</p></div>
      <aside><strong>Un directori viu</strong>És orientatiu, no exhaustiu. Hi trobes a faltar alguna entitat? <a href="mailto:pomazona@gmail.com?subject=Ecosistema%20IA.cat">Escriu-nos</a>.<br><br>Webs comprovades el <?= iacat_e(iacat_data_llarga((string) ($dades['actualitzat'] ?? ''))) ?>.</aside>
    </header>

    <ul class="xips" aria-label="Categories">
<?php foreach ($categories as $cat => [$nom, $ancora]): if (empty($perCat[$cat])) { continue; } ?>
      <li><a href="#<?= $ancora ?>"><?= iacat_e($nom) ?> (<?= count($perCat[$cat]) ?>)</a></li>
<?php endforeach; ?>
    </ul>

<?php foreach ($categories as $cat => [$nom, $ancora]): if (empty($perCat[$cat])) { continue; } ?>
    <section class="seccio-bloc" id="<?= $ancora ?>" aria-labelledby="t-<?= $ancora ?>">
      <h2 id="t-<?= $ancora ?>"><?= iacat_e($nom) ?></h2>
      <ul class="seccio-grid">
<?php foreach ($perCat[$cat] as $e): ?>
<?php
    $logo = (string) ($e['logo'] ?? '');
    if ($logo !== '' && !is_file(__DIR__ . '/' . ltrim($logo, '/'))) { $logo = ''; }
    $sigles = trim((string) ($e['sigles'] ?? ''));
    if ($sigles === '' || mb_strlen($sigles) > 7) {
        // Inicials de les paraules amb majúscula (p. ex. «Clúster Digital de Catalunya» → CDC).
        preg_match_all('/\b\p{Lu}/u', (string) $e['nom'], $m);
        $sigles = mb_substr(implode('', $m[0]), 0, 4);
        // Una sola inicial (THEKER, Biorce, Herta): el nom sencer, si és curt.
        if (mb_strlen($sigles) < 2) { $sigles = mb_strtoupper(mb_substr(strtok((string) $e['nom'], ' '), 0, 7)); }
    }
?>
        <li class="fitxa fitxa--entitat">
          <a class="fitxa__logo<?= $logo === '' ? ' fitxa__logo--buit' : '' ?>" href="<?= iacat_e((string) $e['url']) ?>" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
<?php if ($logo !== ''): ?>
            <img src="<?= iacat_e($logo) ?>" alt="" loading="lazy" decoding="async">
<?php else: ?>
            <span><?= iacat_e($sigles) ?></span>
<?php endif; ?>
          </a>
          <span class="fitxa__meta"><?= iacat_e(implode(' · ', array_filter([(string) ($e['sigles'] ?? ''), (string) ($e['lloc'] ?? '')]))) ?></span>
          <h3><a href="<?= iacat_e((string) $e['url']) ?>" target="_blank" rel="noopener"><?= iacat_e((string) $e['nom']) ?></a></h3>
          <p><?= iacat_e((string) ($e['descripcio'] ?? '')) ?></p>
        </li>
<?php endforeach; ?>
      </ul>
    </section>
<?php endforeach; ?>
    <p class="seccio-nota">Vols seguir què fan? A <a href="/tema/catalunya">IA a Catalunya</a> hi ha totes les notícies del país, i a <a href="/agenda">l’agenda</a>, els pròxims actes. Si formes part d’una d’aquestes entitats i vols escriure al web, mira <a href="/escriu.html">com fer-ho</a>.</p>
<?php
iacat_peu();
