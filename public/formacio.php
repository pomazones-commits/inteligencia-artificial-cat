<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Formació en IA als territoris de parla catalana (26.09.2026) — /formacio
// Dades: public/data/formacio.json (manual, revisió trimestral: CLAUDE.md).
// Només es mostren les fitxes amb "estat": "actiu". La formació privada va en
// un bloc a part, amb el títol que dona realment i sense preus.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$dades = iacat_dades('formacio.json');
$territoris = [
    'Catalunya' => 'catalunya',
    'Comunitat Valenciana' => 'comunitat-valenciana',
    'Illes Balears' => 'illes-balears',
    'Andorra' => 'andorra',
    'Catalunya Nord' => 'catalunya-nord',
];
$tipus = [
    'grau' => 'Graus',
    'master' => 'Màsters i postgraus',
    'postgrau' => 'Màsters i postgraus',
    'doctorat' => 'Doctorat',
    'fp' => 'Formació professional',
    'curs' => 'Cursos per a la ciutadania i professionals',
    'docents' => 'Formació per a docents',
];
$etiqueta = ['grau' => 'Grau', 'master' => 'Màster', 'postgrau' => 'Postgrau', 'doctorat' => 'Doctorat', 'fp' => 'FP', 'curs' => 'Curs', 'docents' => 'Docents', 'bootcamp' => 'Bootcamp'];

$perTerr = [];
$privats = [];
foreach ((array) ($dades['programes'] ?? []) as $p) {
    if (!is_array($p) || empty($p['nom']) || empty($p['url']) || ($p['estat'] ?? '') !== 'actiu') { continue; }
    if (!empty($p['privada'])) { $privats[] = $p; continue; }
    $t = (string) ($p['territori'] ?? '');
    if (!isset($territoris[$t])) { continue; }
    $grup = $tipus[$p['tipus'] ?? ''] ?? $tipus['curs'];
    $perTerr[$t][$grup][] = $p;
}
$total = count($privats);
foreach ($perTerr as $g) { $total += array_sum(array_map('count', $g)); }

// Ordre fix dels grups dins de cada territori.
$ordreGrups = array_values(array_unique(array_values($tipus)));

function formacio_fitxa(array $p, array $etiqueta, bool $privada = false): void
{
    $logo = (string) ($p['logo'] ?? '');
    if ($logo !== '' && !is_file(__DIR__ . '/' . ltrim($logo, '/'))) { $logo = ''; }
    $sigles = trim((string) ($p['sigles'] ?? ''));
    if ($sigles === '' || mb_strlen($sigles) > 7) {
        preg_match_all('/\b\p{Lu}/u', (string) ($p['centre'] ?? ''), $m);
        $sigles = mb_substr(implode('', $m[0]), 0, 4);
        if (mb_strlen($sigles) < 2) { $sigles = mb_strtoupper(mb_substr(strtok((string) ($p['centre'] ?? '·'), ' '), 0, 7)); }
    }
    $url = (string) $p['url'];
    // Durada i ciutat: només la primera part (el JSON hi porta aclariments després del «;»).
    $curt = static fn(string $v): string => in_array(trim($v), ['no consta', ''], true) ? '' : trim(explode(';', $v)[0]);
    $p['durada'] = $curt((string) ($p['durada'] ?? ''));
    $p['ciutat'] = $curt((string) ($p['ciutat'] ?? ''));
    $meta = [$etiqueta[$p['tipus'] ?? ''] ?? 'Curs'];
    if (!$privada) { $meta[] = !empty($p['oficial']) ? 'Oficial' : 'Títol propi'; }
    $peu = array_filter([
        (string) ($p['modalitat'] ?? ''),
        (string) ($p['llengua'] ?? ''),
        (string) ($p['durada'] ?? ''),
        ($p['gratuit'] ?? null) === true ? 'gratuït' : '',
    ]);
    ?>
        <li class="fitxa fitxa--entitat">
          <a class="fitxa__logo<?= $logo === '' ? ' fitxa__logo--buit' : '' ?>" href="<?= iacat_e($url) ?>" target="_blank" rel="noopener" tabindex="-1" aria-hidden="true">
<?php if ($logo !== ''): ?>
            <img src="<?= iacat_e($logo) ?>" alt="" loading="lazy" decoding="async">
<?php else: ?>
            <span><?= iacat_e($sigles) ?></span>
<?php endif; ?>
          </a>
          <span class="fitxa__meta"><?= iacat_e(implode(' · ', $meta)) ?></span>
          <h4><a href="<?= iacat_e($url) ?>" target="_blank" rel="noopener"><?= iacat_e((string) $p['nom']) ?></a></h4>
          <p><?= iacat_e(implode(' · ', array_filter([(string) ($p['centre'] ?? ''), (string) ($p['ciutat'] ?? '')]))) ?></p>
<?php if ($privada && !empty($p['titol'])): ?>
          <p class="fitxa__titol"><strong>Què obtens:</strong> <?= iacat_e((string) $p['titol']) ?></p>
<?php endif; ?>
<?php if ($peu): ?>
          <p class="fitxa__dades"><?= iacat_e(implode(' · ', $peu)) ?></p>
<?php endif; ?>
        </li>
<?php
}

iacat_capcalera([
    'titol' => 'On estudiar intel·ligència artificial',
    'descripcio' => 'Graus, màsters, FP, cursos i formació per a docents en intel·ligència artificial a Catalunya, la Comunitat Valenciana, les Illes Balears, Andorra i Catalunya Nord.',
    'cami' => '/formacio',
    'molla' => 'Formació',
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'On estudiar intel·ligència artificial als territoris de parla catalana', 'url' => IACAT_BASE . '/formacio', 'inLanguage' => 'ca'],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Formació</p><h1 class="editorial-display">On aprendre IA <em>als territoris de parla catalana.</em></h1>
      <p class="editorial-lede"><?= $total ?> graus, màsters, cursos de formació professional, formació gratuïta i cursos per a docents a Catalunya, la Comunitat Valenciana, les Illes Balears, Andorra i Catalunya Nord.</p></div>
      <aside><strong>Com l’hem fet</strong>Hi entra la formació oficial, pública o sense ànim de lucre que té la IA com a eix; la privada va a part. Cada fitxa enllaça la web oficial del centre. Hi trobes a faltar res? <a href="mailto:pomazona@gmail.com?subject=Formaci%C3%B3%20IA.cat">Escriu-nos</a>.<br><br>Revisat el <?= iacat_e(iacat_data_llarga((string) ($dades['actualitzat'] ?? ''))) ?>. Es revisa cada trimestre.</aside>
    </header>

    <ul class="xips" aria-label="Territoris">
<?php foreach ($territoris as $t => $ancora): if (empty($perTerr[$t])) { continue; } ?>
      <li><a href="#<?= $ancora ?>"><?= iacat_e($t) ?> (<?= array_sum(array_map('count', $perTerr[$t])) ?>)</a></li>
<?php endforeach; ?>
<?php if ($privats): ?>
      <li><a href="#privada">Formació privada (<?= count($privats) ?>)</a></li>
<?php endif; ?>
    </ul>

<?php foreach ($territoris as $t => $ancora): if (empty($perTerr[$t])) { continue; } ?>
    <section class="seccio-bloc" id="<?= $ancora ?>" aria-labelledby="t-<?= $ancora ?>">
      <h2 id="t-<?= $ancora ?>"><?= iacat_e($t) ?></h2>
<?php foreach ($ordreGrups as $grup): if (empty($perTerr[$t][$grup])) { continue; } ?>
      <h3 class="seccio-subtitol"><?= iacat_e($grup) ?></h3>
      <ul class="seccio-grid">
<?php foreach ($perTerr[$t][$grup] as $p) { formacio_fitxa($p, $etiqueta); } ?>
      </ul>
<?php endforeach; ?>
<?php if ($t === 'Catalunya Nord' && !empty($dades['a_prop'])): ?>
      <p class="seccio-nota"><strong>A prop, fora del departament:</strong>
<?php foreach ((array) $dades['a_prop'] as $i => $a): ?>
        <?= $i ? ' · ' : '' ?><a href="<?= iacat_e((string) $a['url']) ?>" target="_blank" rel="noopener"><?= iacat_e((string) $a['nom']) ?></a>
<?php endforeach; ?>
      </p>
<?php endif; ?>
    </section>
<?php endforeach; ?>

<?php if ($privats): ?>
    <section class="seccio-bloc" id="privada" aria-labelledby="t-privada">
      <h2 id="t-privada">Formació privada</h2>
      <p class="seccio-intro">Cap d’aquests programes no és formació universitària oficial, encara que el nom digui «màster»: a cada fitxa hi consta el títol que dona realment. Que hi aparegui no és una recomanació, i IA.cat no cobra res dels centres ni fa servir enllaços d’afiliat. Abans d’apuntar-t’hi, compara’l amb l’oferta oficial.</p>
      <ul class="seccio-grid">
<?php foreach ($privats as $p) { formacio_fitxa($p, $etiqueta, true); } ?>
      </ul>
    </section>
<?php endif; ?>
    <p class="seccio-nota">Vols conèixer qui fa recerca en IA? Mira <a href="/ecosistema">l’ecosistema</a>. Per a jornades, congressos i convocatòries, <a href="/agenda">l’agenda</a>. I si un terme se t’escapa, <a href="/glossari">el glossari</a>.</p>
<?php
iacat_peu();
