<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Centres de dades i supercomputació als territoris de parla catalana
// (03.10.2026) — /centres-de-dades
// Dades: public/data/centres-dades.json (manual; revisió setmanal a la tasca
// «Edicions», vegeu CLAUDE.md). Mapa: public/inc/mapa-territoris.php (SVG en
// línia, generat; cap recurs de tercers). Fil de notícies i notícies de cada
// fitxa: public/inc/centres-dades.php, sobre l'hemeroteca del Content Hub.
// Criteris editorials (no fer campanya, distingir qui diu cada xifra, recollir
// sempre la resposta a les crítiques): doc del projecte «Posicionament i
// centres de dades als territoris — recerca (03.10.2026)».
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';
require __DIR__ . '/inc/centres-dades.php';

$dades = iacat_cd_dades();
$mapa = require __DIR__ . '/inc/mapa-territoris.php';
$items = array_values(array_filter((array) ($dades['items'] ?? []), static fn($i) => is_array($i) && !empty($i['id']) && !empty($i['nom'])));

$territoris = [
    'Catalunya' => 'catalunya',
    'Comunitat Valenciana' => 'comunitat-valenciana',
    'Illes Balears' => 'illes-balears',
    'Andorra' => 'andorra',
    'Catalunya Nord' => 'catalunya-nord',
];
$estats = [
    'en funcionament' => ['En funcionament', 'funcionament'],
    'en construcció' => ['En construcció', 'construccio'],
    'en tramitació' => ['En tramitació', 'tramitacio'],
    'aturat' => ['Aturat', 'aturat'],
    'descartat' => ['Descartat', 'descartat'],
];
$origens = [
    'promotor' => 'segons el promotor',
    'administració' => 'segons l’administració',
    'oficial' => 'confirmat en un tràmit oficial',
    'premsa' => 'segons la premsa, sense font primària',
];
$publics = ['supercomputador públic', 'centre de dades públic'];

$perTerr = [];
$perEstat = [];
foreach ($items as $it) {
    $t = isset($territoris[$it['territori'] ?? '']) ? (string) $it['territori'] : 'Catalunya';
    $perTerr[$t][] = $it;
    $e = isset($estats[$it['estat'] ?? '']) ? (string) $it['estat'] : 'en tramitació';
    $perEstat[$e] = ($perEstat[$e] ?? 0) + 1;
}
$total = count($items);

// --- Ajudes de format -------------------------------------------------------
function cd_num(?float $v): string
{
    if ($v === null) { return ''; }
    $dec = fmod($v, 1.0) == 0.0 ? 0 : (fmod($v * 10, 1.0) == 0.0 ? 1 : 2);
    return number_format($v, $dec, ',', '.');
}
function cd_estat_slug(string $e, array $estats): string { return $estats[$e][1] ?? 'tramitacio'; }
function cd_data(string $iso, string $precisio = ''): string
{
    if ($iso === '') { return ''; }
    if ($precisio === 'any') { return substr($iso, 0, 4); }
    if ($precisio === 'mes') {
        $mesos = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
        return ($mesos[(int) substr($iso, 5, 2) - 1] ?? '') . ' del ' . substr($iso, 0, 4);
    }
    return iacat_data_llarga($iso);
}
function cd_font(string $url, string $text): string
{
    if ($url === '') { return iacat_e($text); }
    return '<a href="' . iacat_e($url) . '" target="_blank" rel="noopener">' . iacat_e($text) . '</a>';
}
function cd_domini(string $url): string
{
    $h = (string) parse_url($url, PHP_URL_HOST);
    return preg_replace('/^www\./', '', $h) ?: 'font';
}

// --- Punts del mapa -----------------------------------------------------------
// Cada fitxa pot tenir diversos llocs. Els de l'àrea de Barcelona es dibuixen al
// detall ampliat; a la resta, si dos punts cauen massa a prop, el segon es
// desplaça una mica en espiral perquè es puguin clicar tots dos.
$regio = $mapa['inset']['regio'];
$punts = ['general' => [], 'detall' => []];
foreach ($items as $it) {
    foreach ((array) ($it['llocs'] ?? []) as $ll) {
        if (!is_array($ll) || count($ll) !== 2) { continue; }
        [$lat, $lon] = [(float) $ll[0], (float) $ll[1]];
        $dins = $lon >= $regio['lon0'] && $lon <= $regio['lon1'] && $lat >= $regio['lat0'] && $lat <= $regio['lat1'];
        $p = $dins ? iacat_cd_projecta($lat, $lon, $mapa['inset']) : iacat_cd_projecta($lat, $lon, $mapa);
        $punts[$dins ? 'detall' : 'general'][] = ['it' => $it, 'x' => $p[0], 'y' => $p[1]];
    }
}
foreach ($punts as $zona => &$llista) {
    $posats = [];
    foreach ($llista as &$pt) {
        $x0 = $pt['x']; $y0 = $pt['y'];
        for ($k = 0; $k < 40; $k++) {
            $x = $x0; $y = $y0;
            if ($k > 0) { $ang = $k * 2.4; $r = 6 + 3.2 * sqrt($k); $x = $x0 + $r * cos($ang); $y = $y0 + $r * sin($ang); }
            $lliure = true;
            foreach ($posats as [$px, $py]) { if (($px - $x) ** 2 + ($py - $y) ** 2 < 100) { $lliure = false; break; } }
            if ($lliure) { break; }
        }
        $pt['x'] = round($x, 1); $pt['y'] = round($y, 1);
        $posats[] = [$pt['x'], $pt['y']];
    }
    unset($pt);
}
unset($llista);

function cd_marcador(array $pt, array $estats, array $publics): string
{
    $it = $pt['it'];
    $classe = 'cd-punt cd-e-' . cd_estat_slug((string) $it['estat'], $estats);
    $titol = $it['nom'] . ' — ' . ($estats[$it['estat']][0] ?? '') . ($it['municipi'] ? ' · ' . $it['municipi'] : '');
    $x = $pt['x']; $y = $pt['y'];
    $forma = in_array($it['tipus'], $publics, true)
        ? '<rect x="' . ($x - 5.5) . '" y="' . ($y - 5.5) . '" width="11" height="11" transform="rotate(45 ' . $x . ' ' . $y . ')"/>'
        : '<circle cx="' . $x . '" cy="' . $y . '" r="6"/>';
    return '<a class="' . $classe . '" href="#fitxa-' . iacat_e((string) $it['id']) . '" data-cd-item data-territori="' . iacat_e((string) $it['territori']) . '" data-estat="' . iacat_e((string) $it['estat']) . '"><title>' . iacat_e($titol) . '</title>' . $forma . '</a>';
}

// --- Notícies ---------------------------------------------------------------
$noticies = array_slice(iacat_cd_noticies(), 0, 12);

// --- JSON-LD ------------------------------------------------------------------
$llocsLd = [];
foreach ($items as $i => $it) {
    $pl = ['@type' => 'Place', 'name' => (string) $it['nom'], 'url' => IACAT_BASE . '/centres-de-dades#fitxa-' . $it['id']];
    if (!empty($it['municipi'])) { $pl['address'] = ['@type' => 'PostalAddress', 'addressLocality' => (string) $it['municipi'], 'addressRegion' => (string) $it['territori']]; }
    if (!empty($it['llocs'][0]) && count($it['llocs'][0]) === 2) { $pl['geo'] = ['@type' => 'GeoCoordinates', 'latitude' => $it['llocs'][0][0], 'longitude' => $it['llocs'][0][1]]; }
    $llocsLd[] = ['@type' => 'ListItem', 'position' => $i + 1, 'item' => $pl];
}

iacat_capcalera([
    'titol' => 'Centres de dades i supercomputació als territoris de parla catalana',
    'descripcio' => 'Mapa i fitxes dels centres de dades, supercomputadors i projectes de Catalunya, la Comunitat Valenciana, les Illes Balears i Andorra: estat, potència, inversió, promotor, refrigeració, tràmits i polèmiques.',
    'cami' => '/centres-de-dades',
    'molla' => 'Centres de dades',
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'Centres de dades i supercomputació als territoris de parla catalana', 'url' => IACAT_BASE . '/centres-de-dades', 'inLanguage' => 'ca', 'dateModified' => (string) ($dades['actualitzat'] ?? ''),
        'mainEntity' => ['@type' => 'ItemList', 'numberOfItems' => count($llocsLd), 'itemListElement' => $llocsLd]],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Centres de dades</p><h1 class="editorial-display">On viu la IA <em>als territoris de parla catalana.</em></h1>
      <p class="editorial-lede"><?= $total ?> centres de dades, supercomputadors i projectes: on són, quanta potència demanen, qui els promou, com es refrigeren, quins tràmits han superat i què se’n discuteix.</p></div>
      <aside><strong>Com l’hem fet</strong>Cada xifra diu qui l’afirma: el promotor, l’administració o un tràmit oficial. Quan recollim una crítica, hi posem també la resposta. Ho revisem cada setmana. Hi trobes un error o hi falta un projecte? <a href="mailto:pomazona@gmail.com?subject=Centres%20de%20dades%20IA.cat">Escriu-nos</a>.<br><br>Actualitzat el <?= iacat_e(cd_data((string) ($dades['actualitzat'] ?? ''))) ?>. <a href="#metodologia">Metodologia</a></aside>
    </header>

<?php if (!empty($dades['xifres'])): ?>
    <ul class="cd-xifres" aria-label="Xifres clau">
<?php foreach ((array) $dades['xifres'] as $x): ?>
      <li><strong><?= iacat_e((string) $x['valor']) ?></strong><p><?= iacat_e((string) $x['etiqueta']) ?></p><small>Font: <?= cd_font((string) ($x['font'] ?? ''), (string) ($x['font_nom'] ?? '')) ?><?= !empty($x['data_font']) ? ', ' . iacat_e(cd_data((string) $x['data_font'])) : '' ?></small></li>
<?php endforeach; ?>
    </ul>
<?php endif; ?>

    <section class="seccio-bloc cd-explora" id="mapa" aria-labelledby="t-mapa">
      <h2 id="t-mapa">El mapa</h2>
      <div class="cd-filtres" role="group" aria-label="Filtres">
        <div><span>Territori</span>
          <button type="button" data-filtre="territori" data-valor="" aria-pressed="true">Tots (<?= $total ?>)</button>
<?php foreach ($territoris as $t => $slug): if (empty($perTerr[$t])) { continue; } ?>
          <button type="button" data-filtre="territori" data-valor="<?= iacat_e($t) ?>" aria-pressed="false"><?= iacat_e($t) ?> (<?= count($perTerr[$t]) ?>)</button>
<?php endforeach; ?>
        </div>
        <div><span>Estat</span>
          <button type="button" data-filtre="estat" data-valor="" aria-pressed="true">Tots</button>
<?php foreach ($estats as $e => [$nom, $slug]): if (empty($perEstat[$e])) { continue; } ?>
          <button type="button" class="cd-b-<?= $slug ?>" data-filtre="estat" data-valor="<?= iacat_e($e) ?>" aria-pressed="false"><i></i><?= iacat_e($nom) ?> (<?= $perEstat[$e] ?>)</button>
<?php endforeach; ?>
        </div>
        <p class="cd-recompte" aria-live="polite">Es mostren les <?= $total ?> fitxes.</p>
      </div>

      <div class="cd-mapa-graella">
        <figure class="cd-mapa">
          <svg viewBox="0 0 <?= (int) $mapa['W'] ?> <?= (int) $mapa['H'] ?>" role="img" aria-labelledby="cd-mapa-t">
            <title id="cd-mapa-t">Mapa dels centres de dades i supercomputadors als territoris de parla catalana</title>
            <rect class="cd-mar" width="<?= (int) $mapa['W'] ?>" height="<?= (int) $mapa['H'] ?>"/>
            <path class="cd-fons" d="<?= $mapa['fons'] ?>"/>
<?php foreach (['cat', 'cv', 'ib', 'and', 'cn'] as $k): ?>
            <path class="cd-terra" d="<?= $mapa[$k] ?>"/>
<?php endforeach; ?>
<?php
$etiquetes = [['Catalunya', 42.22, 1.2], ['Comunitat Valenciana', 39.05, -1.05], ['Illes Balears', 39.18, 2.55], ['Andorra', 42.66, 0.95], ['Catalunya Nord', 42.86, 2.45]];
foreach ($etiquetes as [$text, $lat, $lon]): [$ex, $ey] = iacat_cd_projecta($lat, $lon, $mapa); ?>
            <text class="cd-nom-terr" x="<?= $ex ?>" y="<?= $ey ?>"><?= iacat_e($text) ?></text>
<?php endforeach; ?>
<?php [$rx, $ry, $rw, $rh] = $mapa['inset']['rect']; $b = $mapa['inset']['box']; ?>
            <rect class="cd-zona" x="<?= $rx ?>" y="<?= $ry ?>" width="<?= $rw ?>" height="<?= $rh ?>"/>
            <line class="cd-zona-linia" x1="<?= $rx + $rw ?>" y1="<?= $ry + $rh / 2 ?>" x2="<?= $b['x'] ?>" y2="<?= $b['y'] + 20 ?>"/>
<?php foreach ($punts['general'] as $pt) { echo '            ', cd_marcador($pt, $estats, $publics), "\n"; } ?>
            <g class="cd-detall">
              <rect class="cd-detall-mar" x="<?= $b['x'] ?>" y="<?= $b['y'] ?>" width="<?= $b['w'] ?>" height="<?= $b['h'] ?>"/>
              <path class="cd-terra" d="<?= $mapa['inset']['terra'] ?>"/>
              <rect class="cd-detall-vora" x="<?= $b['x'] ?>" y="<?= $b['y'] ?>" width="<?= $b['w'] ?>" height="<?= $b['h'] ?>"/>
              <text class="cd-nom-detall" x="<?= $b['x'] + 8 ?>" y="<?= $b['y'] + $b['h'] - 9 ?>">Àrea de Barcelona</text>
<?php [$bx, $by] = iacat_cd_projecta(41.383, 2.176, $mapa['inset']); ?>
              <text class="cd-nom-ciutat" x="<?= $bx + 9 ?>" y="<?= $by + 22 ?>">Barcelona</text>
<?php foreach ($punts['detall'] as $pt) { echo '              ', cd_marcador($pt, $estats, $publics), "\n"; } ?>
            </g>
          </svg>
        </figure>
        <aside class="cd-llegenda">
          <h3>Llegenda</h3>
          <ul>
<?php foreach ($estats as $e => [$nom, $slug]): if (empty($perEstat[$e])) { continue; } ?>
            <li><svg viewBox="0 0 14 14" aria-hidden="true"><circle class="cd-e-<?= $slug ?>" cx="7" cy="7" r="6"/></svg><?= iacat_e($nom) ?></li>
<?php endforeach; ?>
            <li><svg viewBox="0 0 14 14" aria-hidden="true"><rect class="cd-e-neutre" x="2.5" y="2.5" width="9" height="9" transform="rotate(45 7 7)"/></svg>Infraestructura pública (supercomputadors i centres de dades dels governs)</li>
          </ul>
          <p>Les ubicacions són aproximades: municipi, polígon o barri. Si dos punts queden a sobre l’un de l’altre, el segon es desplaça una mica perquè es puguin clicar tots dos. Clica un punt per anar a la fitxa.</p>
<?php $senseLloc = array_map(static fn($i) => (string) $i['nom'], array_filter($items, static fn($i) => empty($i['llocs']))); if ($senseLloc): ?>
          <p>No surten al mapa perquè no se n’ha publicat la ubicació: <?= iacat_e(implode('; ', $senseLloc)) ?>.</p>
<?php endif; ?>
        </aside>
      </div>
    </section>

<?php $canvis = array_slice(array_reverse((array) ($dades['canvis'] ?? [])), 0, 8); if ($canvis): $noms = array_column($items, 'nom', 'id'); ?>
    <section class="seccio-bloc" id="canvis" aria-labelledby="t-canvis">
      <h2 id="t-canvis">Canvis recents</h2>
      <ul class="cd-canvis">
<?php foreach ($canvis as $c): ?>
        <li><span class="cd-data-curta"><?= iacat_e(cd_data((string) $c['data'])) ?></span> <?php if (!empty($c['id']) && isset($noms[$c['id']])): ?><a href="#fitxa-<?= iacat_e((string) $c['id']) ?>"><?= iacat_e((string) $noms[$c['id']]) ?></a>: <?php endif; ?><?= iacat_e((string) $c['fet']) ?></li>
<?php endforeach; ?>
      </ul>
    </section>
<?php endif; ?>

<?php foreach ($territoris as $t => $ancora): if (empty($perTerr[$t]) && empty($dades['territoris'][$t]['context'])) { continue; } $ctx = $dades['territoris'][$t] ?? []; ?>
    <section class="seccio-bloc cd-territori" id="<?= $ancora ?>" data-territori="<?= iacat_e($t) ?>" aria-labelledby="t-<?= $ancora ?>">
      <h2 id="t-<?= $ancora ?>"><?= iacat_e($t) ?></h2>
<?php if (!empty($ctx['context'])): ?>
      <p class="seccio-intro"><?= iacat_e((string) $ctx['context']) ?><?php if (!empty($ctx['font'])): ?> <span class="cd-font-curta">(<?= cd_font((string) $ctx['font'], (string) ($ctx['font_nom'] ?? cd_domini((string) $ctx['font']))) ?>)</span><?php endif; ?></p>
<?php endif; ?>
<?php if (!empty($perTerr[$t])): ?>
      <div class="cd-fitxes">
<?php foreach ($perTerr[$t] as $it):
    $eslug = cd_estat_slug((string) $it['estat'], $estats);
    $pot = $it['potencia'] ?? []; $inv = $it['inversio'] ?? [];
    $relacionades = iacat_cd_noticies_de((array) ($it['paraules'] ?? []), 3);
    $lloc = trim((string) ($it['municipi'] ?? ''));
    if (!empty($it['comarca']) && $it['comarca'] !== $lloc) { $lloc .= ($lloc !== '' ? ' · ' : '') . $it['comarca']; }
?>
        <article class="cd-fitxa" id="fitxa-<?= iacat_e((string) $it['id']) ?>" data-cd-item data-territori="<?= iacat_e((string) $it['territori']) ?>" data-estat="<?= iacat_e((string) $it['estat']) ?>">
          <p class="cd-fitxa__cap"><span class="cd-estat cd-b-<?= $eslug ?>"><i></i><?= iacat_e($estats[$it['estat']][0] ?? (string) $it['estat']) ?></span><span><?= iacat_e(mb_strtoupper(mb_substr((string) $it['tipus'], 0, 1)) . mb_substr((string) $it['tipus'], 1)) ?></span></p>
          <h3><?= iacat_e((string) $it['nom']) ?></h3>
          <p class="cd-fitxa__lloc"><?= iacat_e((string) $it['promotor']) ?><?= $lloc !== '' ? '<br>' . iacat_e($lloc) : '' ?></p>
          <dl class="cd-dades">
            <div><dt>Potència</dt><dd><?php if (($pot['mw'] ?? null) !== null): ?><?= cd_num((float) $pot['mw']) ?> MW<small><?= iacat_e($origens[$pot['origen'] ?? 'promotor'] ?? '') ?></small><?php else: ?><span class="cd-buit">No publicada</span><?php endif; ?></dd></div>
            <div><dt>Inversió</dt><dd><?php if (($inv['meur'] ?? null) !== null): ?><?= cd_num((float) $inv['meur']) ?> M€<small><?= iacat_e($origens[$inv['origen'] ?? 'promotor'] ?? '') ?></small><?php else: ?><span class="cd-buit">No publicada</span><?php endif; ?></dd></div>
            <div><dt>Previsió</dt><dd class="<?= mb_strlen((string) ($it['previsio'] ?? '')) > 14 ? 'cd-dd-text' : '' ?>"><?= !empty($it['previsio']) ? iacat_e((string) $it['previsio']) : '<span class="cd-buit">—</span>' ?></dd></div>
          </dl>
<?php $notesXifres = array_filter([(string) ($pot['nota'] ?? ''), (string) ($inv['nota'] ?? ''), (string) ($it['xifres_nota'] ?? '')]); if ($notesXifres): ?>
          <p class="cd-camp cd-camp--petit"><strong>Sobre les xifres:</strong> <?= iacat_e(implode(' ', $notesXifres)) ?></p>
<?php endif; ?>
<?php $r = $it['refrigeracio'] ?? []; ?>
          <p class="cd-camp"><strong>Refrigeració:</strong> <?php if (!empty($r['sistema']) || !empty($r['aigua'])): ?><?= iacat_e(rtrim((string) ($r['sistema'] ?? ''), '.')) ?><?= !empty($r['sistema']) ? '. ' : '' ?><?php if (!empty($r['aigua'])): ?>Aigua: <?= iacat_e(rtrim((string) $r['aigua'], '.')) ?>.<?php endif; ?><?php if (!empty($r['qui_ho_diu'])): ?> <span class="cd-qui">Ho diu: <?= !empty($r['font']) ? cd_font((string) $r['font'], (string) $r['qui_ho_diu']) : iacat_e((string) $r['qui_ho_diu']) ?>.</span><?php endif; ?><?php else: ?><span class="cd-buit">No n’hem trobat informació pública.</span><?php endif; ?></p>
<?php if (!empty($it['energia'])): ?>
          <p class="cd-camp"><strong>Energia:</strong> <?= iacat_e((string) $it['energia']) ?></p>
<?php endif; ?>
          <p class="cd-camp"><strong>Ocupació:</strong> <?php if (!empty($it['ocupacio'])): foreach ($it['ocupacio'] as $k => $o): ?><?= $k ? ' · ' : '' ?><?= iacat_e(rtrim((string) $o['xifra'], '.')) ?> <span class="cd-qui">(ho diu: <?= !empty($o['font']) ? cd_font((string) $o['font'], (string) $o['qui_ho_diu']) : iacat_e((string) $o['qui_ho_diu']) ?>)</span><?php endforeach; else: ?><span class="cd-buit">No consta.</span><?php endif; ?></p>
<?php if (!empty($it['notes'])): ?>
          <p class="cd-notes"><?= iacat_e((string) $it['notes']) ?></p>
<?php endif; ?>
<?php if (!empty($it['polemica']['critica'])): $pol = $it['polemica']; ?>
          <div class="cd-polemica">
            <p class="cd-polemica__titol">Polèmica</p>
            <p><strong>Les crítiques.</strong> <?= iacat_e((string) $pol['critica']['text']) ?> <span class="cd-qui">(<?= cd_font((string) ($pol['critica']['font'] ?? ''), cd_domini((string) ($pol['critica']['font'] ?? ''))) ?><?= !empty($pol['critica']['data']) ? ', ' . iacat_e(cd_data((string) $pol['critica']['data'])) : '' ?>)</span></p>
<?php if (!empty($pol['respostes'])): foreach ($pol['respostes'] as $rp): ?>
            <p><strong>La resposta: <?= iacat_e((string) $rp['qui']) ?>.</strong> <?= iacat_e((string) $rp['text']) ?> <span class="cd-qui">(<?= cd_font((string) ($rp['font'] ?? ''), cd_domini((string) ($rp['font'] ?? ''))) ?><?= !empty($rp['data']) ? ', ' . iacat_e(cd_data((string) $rp['data'])) : '' ?>)</span></p>
<?php endforeach; else: ?>
            <p><strong>La resposta.</strong> <span class="cd-buit">No hem trobat cap resposta pública de l’empresa ni de l’administració.</span> Si n’hi ha, la publicarem.</p>
<?php endif; ?>
          </div>
<?php endif; ?>
<?php $tr = (array) ($it['tramits'] ?? []); ?>
<?php if ($tr): ?>
          <details class="cd-plec"><summary>Tràmits oficials (<?= count($tr) ?>)</summary>
            <ul>
<?php foreach ($tr as $t2): ?>
              <li><span class="cd-data-curta"><?= !empty($t2['data']) ? iacat_e(cd_data((string) $t2['data'])) : 'Sense data' ?></span> <strong><?= iacat_e((string) ($t2['organisme'] ?? '')) ?>.</strong> <?= iacat_e(rtrim((string) ($t2['fet'] ?? ''), '.')) ?>. <?= !empty($t2['url']) ? cd_font((string) $t2['url'], !empty($t2['via_premsa']) ? 'Ho recull la premsa' : 'Document') : '' ?><?= !empty($t2['via_premsa']) ? ' <span class="cd-qui">(no hem pogut consultar el document oficial)</span>' : '' ?></li>
<?php endforeach; ?>
            </ul>
          </details>
<?php else: ?>
          <p class="cd-camp cd-camp--petit"><strong>Tràmits oficials:</strong> <span class="cd-buit">no n’hem localitzat cap de publicat. Les xifres són les que diu el promotor o la premsa.</span></p>
<?php endif; ?>
<?php if (!empty($it['cronologia'])): ?>
          <details class="cd-plec"><summary>Cronologia (<?= count($it['cronologia']) ?>)</summary>
            <ol>
<?php foreach ($it['cronologia'] as $c): ?>
              <li><span class="cd-data-curta"><?= iacat_e(cd_data((string) $c['data'], (string) ($c['precisio'] ?? ''))) ?></span> <?= !empty($c['font']) ? cd_font((string) $c['font'], (string) $c['fet']) : iacat_e((string) $c['fet']) ?></li>
<?php endforeach; ?>
            </ol>
          </details>
<?php endif; ?>
<?php if ($relacionades): ?>
          <div class="cd-relacionades"><p>Ho hem publicat</p><ul>
<?php foreach ($relacionades as $n): ?>
            <li><a href="/article.php?slug=<?= rawurlencode($n['slug']) ?>"><?= iacat_e($n['title']) ?></a> <span><?= iacat_e(cd_data($n['_iso'])) ?></span></li>
<?php endforeach; ?>
          </ul></div>
<?php endif; ?>
          <p class="cd-fitxa__peu">Fonts: <?php foreach ((array) ($it['fonts'] ?? []) as $k => $f): ?><?= $k ? ' · ' : '' ?><?= cd_font((string) $f['url'], (string) ($f['nom'] ?: cd_domini((string) $f['url']))) ?><?php endforeach; ?><br>Última verificació: <?= iacat_e(cd_data((string) ($it['verificat'] ?? ''))) ?></p>
        </article>
<?php endforeach; ?>
      </div>
<?php endif; ?>
    </section>
<?php endforeach; ?>

<?php if (!empty($dades['debat'])): ?>
    <section class="seccio-bloc" id="debat" aria-labelledby="t-debat">
      <h2 id="t-debat">Què es discuteix</h2>
      <p class="seccio-intro">Els quatre temes que surten a gairebé totes les polèmiques, amb les xifres de cada part i qui les dona.</p>
      <ul class="seccio-grid seccio-grid--2">
<?php foreach ((array) $dades['debat'] as $d): ?>
        <li class="fitxa"><h3><?= iacat_e((string) $d['titol']) ?></h3><p><?= iacat_e((string) $d['text']) ?></p><p class="fitxa__peu"><?php foreach ((array) ($d['fonts'] ?? []) as $k => $f): ?><?= $k ? ' · ' : '' ?><?= cd_font((string) $f['url'], (string) $f['nom']) ?><?php endforeach; ?></p></li>
<?php endforeach; ?>
      </ul>
    </section>
<?php endif; ?>

    <section class="seccio-bloc" id="noticies" aria-labelledby="t-noticies">
      <h2 id="t-noticies">Darreres notícies</h2>
      <p class="seccio-intro">Les notícies del web sobre centres de dades, supercomputadors i gigafactories d’IA als territoris de parla catalana. La llista s’actualitza sola amb cada edició.</p>
<?php if ($noticies): ?>
      <ul class="peces-llista">
<?php foreach ($noticies as $n): ?>
        <li><span class="fitxa__meta"><?= iacat_e($n['category']) ?><br><?= iacat_e(cd_data($n['_iso'])) ?></span><div><h3><a href="/article.php?slug=<?= rawurlencode($n['slug']) ?>"><?= iacat_e($n['title']) ?></a></h3><p><?= iacat_e($n['excerpt']) ?></p></div></li>
<?php endforeach; ?>
      </ul>
<?php else: ?>
      <p class="seccio-intro">Encara no n’hi ha cap.</p>
<?php endif; ?>
    </section>

    <section class="seccio-bloc" id="metodologia" aria-labelledby="t-metodologia">
      <h2 id="t-metodologia">Metodologia</h2>
      <div class="seccio-text">
        <h3>Què hi entra</h3>
        <p><?= iacat_e((string) ($dades['criteri'] ?? '')) ?> Per això no hi surten els centres petits d’operadors com Equinix BA2, Nabiax, Templus, Infotelecom o Vodafone a Mallorca, ni el d’Adamentis al Voló, que no en publica la potència.</p>
        <h3>Els estats</h3>
        <ul>
          <li><strong>En funcionament</strong>: dona servei.</li>
          <li><strong>En construcció</strong>: té les obres començades.</li>
          <li><strong>En tramitació</strong>: s’ha anunciat i espera permisos (accés a la xarxa elèctrica, llicències, avaluació ambiental). Que hi sigui no vol dir que s’hagi de fer.</li>
          <li><strong>Aturat</strong>: un permís clau s’ha denegat o el promotor l’ha deixat en suspens.</li>
          <li><strong>Descartat</strong>: el promotor o l’administració hi han renunciat.</li>
        </ul>
        <h3>Qui diu cada xifra</h3>
        <p>Al costat de cada potència i de cada inversió hi diu d’on surt:</p>
        <ul>
          <li><strong>Segons el promotor</strong>: ho anuncia l’empresa. És una promesa, no un fet.</li>
          <li><strong>Segons l’administració</strong>: ho anuncia un govern o un ajuntament, però no ho hem vist en cap document oficial.</li>
          <li><strong>Confirmat en un tràmit oficial</strong>: consta en un document públic, com l’accés a la xarxa del Ministeri per a la Transició Ecològica, el DOGC, el DOGV, el BOIB, el BOPA, el BOE, una llicència municipal, una avaluació ambiental o un contracte públic.</li>
          <li><strong>Segons la premsa</strong>: ho ha publicat un mitjà sense citar cap font primària.</li>
        </ul>
        <p>Les xifres de feina sempre porten qui les dona. Les contractacions (clients, acords de compra d’energia, inversors) només hi surten si hi ha un document públic o un comunicat de totes dues parts.</p>
        <h3>Les polèmiques</h3>
        <p>Aquesta pàgina informa; no fa campanya ni a favor ni en contra. Quan recollim la crítica d’entitats, veïns o partits, hi recollim també la resposta de l’empresa o de l’administració. Si no l’hem trobada, ho diem. L’aigua depèn del sistema de refrigeració: per això cada fitxa diu quin sistema fa servir i qui ho afirma.</p>
        <h3>Com ho mantenim</h3>
        <p>Revisem les fitxes cada setmana: estat, tràmits nous, canvis de xifres i polèmiques. Cada fitxa porta la data de l’última verificació. Les notícies relacionades i el fil de «Darreres notícies» surten sols de l’hemeroteca del web.</p>
        <h3>El mapa</h3>
        <p>És un dibuix fet al nostre servidor a partir de les dades geogràfiques obertes de l’Institut Geogràfic Nacional, Natural Earth i l’IGN francès. No carrega res de cap servei extern.</p>
      </div>
    </section>

    <p class="seccio-nota">Vols saber qui fa recerca en IA al país? Mira <a href="/ecosistema">l’ecosistema</a>. Les notícies d’infraestructura de tot el món són a <a href="/tema/infraestructura-i-energia">Infraestructura i energia</a>. Si treballes en un d’aquests projectes, o t’hi oposes, i vols explicar-ho al web, mira <a href="/escriu.html">com fer-ho</a>.</p>

    <script>
    (() => {
      const estat = { territori: '', estat: '' };
      const botons = [...document.querySelectorAll('[data-filtre]')];
      const elements = [...document.querySelectorAll('[data-cd-item]')];
      const seccions = [...document.querySelectorAll('.cd-territori')];
      const recompte = document.querySelector('.cd-recompte');
      const total = document.querySelectorAll('article[data-cd-item]').length;
      const aplica = () => {
        let visibles = 0;
        elements.forEach(el => {
          const ok = (!estat.territori || el.dataset.territori === estat.territori) && (!estat.estat || el.dataset.estat === estat.estat);
          el.classList.toggle('is-amagat', !ok);
          if (ok && el.tagName === 'ARTICLE') visibles += 1;
        });
        seccions.forEach(s => {
          const cap = s.querySelector('article[data-cd-item]:not(.is-amagat)');
          const actiu = estat.territori || estat.estat;
          s.classList.toggle('is-amagat', !!actiu && !cap && (estat.territori !== s.dataset.territori || !!estat.estat));
        });
        botons.forEach(b => b.setAttribute('aria-pressed', String(estat[b.dataset.filtre] === b.dataset.valor)));
        recompte.textContent = visibles === total ? `Es mostren les ${total} fitxes.` : `Es mostren ${visibles} de ${total} fitxes.`;
        const q = new URLSearchParams();
        if (estat.territori) q.set('territori', estat.territori);
        if (estat.estat) q.set('estat', estat.estat);
        try { history.replaceState(null, '', (q.toString() ? '?' + q : location.pathname) + location.hash); } catch (e) {}
      };
      botons.forEach(b => b.addEventListener('click', () => { estat[b.dataset.filtre] = b.dataset.valor; aplica(); }));
      const ini = new URLSearchParams(location.search);
      if (ini.has('territori') || ini.has('estat')) {
        estat.territori = ini.get('territori') || '';
        estat.estat = ini.get('estat') || '';
        aplica();
      }
    })();
    </script>
<?php
iacat_peu();
