<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// «Qui hi escriu» (24.09.2026): /autors (totes les signatures) i /autor/<slug>
// (fitxa d'una persona amb totes les seves peces). No té dades pròpies: surt
// sol de «La tribuna» i «Estudis» (tribuna.js, tribuna-arxiu.js, estudis.js,
// estudis-arxiu.js). Quan es publica una peça nova, la fitxa s'actualitza sola.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$autors = [];
foreach (['tribuna', 'estudis'] as $tipus) {
    foreach (iacat_peces($tipus) as $peca) {
        if ($peca['autor'] === '') { continue; }
        $clau = iacat_slug($peca['autor']);
        if (!isset($autors[$clau])) {
            $autors[$clau] = ['nom' => $peca['autor'], 'rol' => '', 'foto' => '', 'fotoAlt' => '', 'peces' => [], 'darrera' => ''];
        }
        $a = &$autors[$clau];
        $a['peces'][] = $peca;
        if ($peca['dataIso'] >= $a['darrera']) {
            $a['darrera'] = $peca['dataIso'];
            if (!empty($peca['item']['role'])) { $a['rol'] = (string) $peca['item']['role']; }
        }
        if ($a['foto'] === '' && !empty($peca['item']['photo'])) {
            $a['foto'] = '/' . ltrim((string) preg_replace('#^\./#', '', (string) $peca['item']['photo']), '/');
            $a['fotoAlt'] = (string) ($peca['item']['photoAlt'] ?? ('Retrat de ' . $peca['autor']));
        }
        unset($a);
    }
}
foreach ($autors as &$a) {
    usort($a['peces'], static fn(array $x, array $y): int => strcmp($y['dataIso'], $x['dataIso']));
}
unset($a);
// Primer qui ha publicat més recentment.
uasort($autors, static fn(array $x, array $y): int => strcmp($y['darrera'], $x['darrera']));

$retrat = static function (array $a, string $classe = ''): string {
    if ($a['foto'] !== '') {
        return '<img src="' . iacat_e($a['foto']) . '" alt="' . iacat_e($a['fotoAlt']) . '" loading="lazy"' . ($classe ? ' class="' . $classe . '"' : '') . '>';
    }
    $inicials = '';
    foreach (preg_split('/\s+/', $a['nom']) ?: [] as $mot) {
        if ($mot !== '' && preg_match('/^\p{Lu}/u', $mot)) { $inicials .= mb_substr($mot, 0, 1); }
    }
    return '<span class="autor-inicials" aria-hidden="true">' . iacat_e(mb_substr($inicials, 0, 2)) . '</span>';
};

$nom = preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($_GET['nom'] ?? '')));

// --- Fitxa d'una persona -----------------------------------------------------
if ($nom !== '') {
    $a = $autors[$nom] ?? null;
    if (!$a) {
        http_response_code(404);
        iacat_capcalera(['titol' => 'Autor no trobat', 'descripcio' => 'Aquesta fitxa no existeix.', 'cami' => '/autors', 'robots' => 'noindex', 'molla' => 'No trobat', 'mollaPare' => ['Qui hi escriu', '/autors']]);
        echo '<p class="editorial-kicker">ERROR 404</p><h1 class="editorial-display">No hi ha cap fitxa amb aquest nom.</h1><p class="editorial-lede">Consulta <a href="/autors">totes les signatures</a>.</p>';
        iacat_peu();
        exit;
    }
    $cami = '/autor/' . $nom;
    $n = count($a['peces']);
    $desc = $a['nom'] . ($a['rol'] !== '' ? ' (' . $a['rol'] . ')' : '') . ' signa ' . $n . ($n === 1 ? ' peça' : ' peces') . ' a intel·ligènciaartificial.cat.';
    $persona = ['@type' => 'Person', 'name' => $a['nom'], 'url' => IACAT_BASE . $cami];
    if ($a['rol'] !== '') { $persona['jobTitle'] = $a['rol']; }
    if ($a['foto'] !== '') { $persona['image'] = IACAT_BASE . $a['foto']; }
    iacat_capcalera([
        'titol' => $a['nom'], 'descripcio' => $desc, 'cami' => $cami, 'tipusOg' => 'profile',
        'molla' => $a['nom'], 'mollaPare' => ['Qui hi escriu', '/autors'],
        'jsonld' => ['@context' => 'https://schema.org', '@type' => 'ProfilePage', 'url' => IACAT_BASE . $cami, 'inLanguage' => 'ca', 'mainEntity' => $persona],
    ]);
    ?>
    <header class="autor-cap">
      <?= $retrat($a) ?>
      <div><p class="editorial-kicker">Signatura convidada · <?= $n ?> <?= $n === 1 ? 'peça' : 'peces' ?></p><h1><?= iacat_e($a['nom']) ?></h1><?php if ($a['rol'] !== ''): ?><p><?= iacat_e($a['rol']) ?></p><?php endif; ?></div>
    </header>
    <section class="seccio-bloc" aria-labelledby="peces-titol">
      <h2 id="peces-titol">Les seves peces</h2>
      <ul class="peces-llista">
        <?php foreach ($a['peces'] as $p): ?>
        <li><span class="fitxa__meta"><?= iacat_e($p['seccio']) ?><br><?= iacat_e(iacat_data_llarga($p['dataIso'])) ?></span><div><h3><a href="<?= iacat_e(parse_url($p['url'], PHP_URL_PATH) ?: $p['url']) ?>"><?= iacat_e($p['titol']) ?></a></h3><p><?= iacat_e($p['resum']) ?></p></div></li>
        <?php endforeach; ?>
      </ul>
      <p class="seccio-nota">Les opinions de les peces signades són de l’autoria. <a href="/escriu.html">Vols escriure a IA.cat? →</a></p>
    </section>
    <?php
    iacat_peu();
    exit;
}

// --- Totes les signatures ----------------------------------------------------
$llistaLd = [];
$i = 0;
foreach ($autors as $clau => $a) {
    $llistaLd[] = ['@type' => 'ListItem', 'position' => ++$i, 'url' => IACAT_BASE . '/autor/' . $clau, 'name' => $a['nom']];
}
iacat_capcalera([
    'titol' => 'Qui hi escriu',
    'descripcio' => 'Les persones que signen «La tribuna» i «Estudis» a intel·ligènciaartificial.cat, amb totes les seves peces.',
    'cami' => '/autors',
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'Qui hi escriu', 'url' => IACAT_BASE . '/autors', 'inLanguage' => 'ca',
        'mainEntity' => ['@type' => 'ItemList', 'numberOfItems' => count($llistaLd), 'itemListElement' => $llistaLd]],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Signatures</p><h1 class="editorial-display">Qui hi <em>escriu.</em></h1>
      <p class="editorial-lede">L’actualitat diària la prepara la Redacció IA.cat amb un procés automàtic supervisat. «La tribuna» i «Estudis» són l’excepció: textos escrits i signats per persones que coneixen la IA de prop.</p></div>
      <aside><strong>Vols escriure-hi?</strong>Busquem veus de la recerca, l’empresa, l’educació i el territori. <a href="/escriu.html">Mira com fer-ho →</a></aside>
    </header>
    <section class="seccio-bloc" aria-labelledby="autors-titol">
      <h2 id="autors-titol"><?= count($autors) ?> <?= count($autors) === 1 ? 'signatura' : 'signatures' ?></h2>
      <p class="seccio-intro">Ordenades per la peça més recent. Cada fitxa recull tot el que la persona ha publicat al web.</p>
      <ul class="seccio-grid">
        <?php foreach ($autors as $clau => $a): $n = count($a['peces']); $ultima = $a['peces'][0]; ?>
        <li class="fitxa autor-fitxa">
          <?= $retrat($a) ?>
          <div>
            <h3><a href="/autor/<?= iacat_e($clau) ?>"><?= iacat_e($a['nom']) ?></a></h3>
            <?php if ($a['rol'] !== ''): ?><p><?= iacat_e($a['rol']) ?></p><?php endif; ?>
            <p class="fitxa__meta" style="margin-top:10px"><?= $n ?> <?= $n === 1 ? 'peça' : 'peces' ?> · última: <?= iacat_e(iacat_data_llarga($ultima['dataIso'])) ?></p>
          </div>
        </li>
        <?php endforeach; ?>
      </ul>
      <p class="seccio-nota">Les notícies, la reflexió del dia, l’anàlisi setmanal i el Quadern IA es publiquen amb la signatura <strong>Redacció IA.cat</strong>. Com es fan: <a href="/redaccio.html">Sobre IA.cat</a>.</p>
    </section>
<?php
iacat_peu();
