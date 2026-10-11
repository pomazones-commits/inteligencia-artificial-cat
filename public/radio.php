<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// La IA a la ràdio (11.10.2026) — /radio
// Dades: public/data/radio.json, MANUAL (cap automatització no el toca).
// Cada fitxa: emissora, programa, data, convidats, resum PROPI i el reproductor
// OFICIAL de l'emissora. Valida-ho amb: node scripts/valida-radio.mjs
//
// Drets i privacitat: l'àudio és de l'emissora i no es baixa ni s'allotja mai
// aquí. La fitxa només mostra un botó; el reproductor oficial (un iframe de
// l'emissora, amb les seves galetes) no es carrega fins que el lector hi fa
// clic (public/radio.js). Cap foto de l'emissora: la targeta és tipogràfica.
//
// Tipus de reproductor admesos (cal mantenir-los iguals aquí i a radio.js):
//   3cat   → https://www.3cat.cat/3cat/audio/<id>/embed/ (id numèric)
//   enllac → l'emissora no permet incrustar: només l'enllaç a la seva web
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$dades = iacat_dades('radio.json');
$temes = array_filter((array) ($dades['temes'] ?? []), 'is_string');
$reproductors = [
    '3cat' => ['patro' => '/^\d{4,9}$/', 'nom' => '3Cat'],
    'enllac' => ['patro' => null, 'nom' => ''],
];

/** Només adreces https ben formades (les fitxes són manuals, però val més no fiar-se'n). */
function radio_url(string $u): string
{
    return preg_match('#^https://[a-z0-9.-]+\.[a-z]{2,}(/[^\s"\'<>]*)?$#i', $u) ? $u : '';
}

$totes = [];
foreach ((array) ($dades['intervencions'] ?? []) as $f) {
    if (!is_array($f) || !preg_match('/^\d{4}-\d{2}-\d{2}$/', (string) ($f['data'] ?? '')) || trim((string) ($f['titol'] ?? '')) === '') { continue; }
    $r = (array) ($f['reproductor'] ?? []);
    $tipus = (string) ($r['tipus'] ?? 'enllac');
    if (!isset($reproductors[$tipus])) { $tipus = 'enllac'; }
    $id = (string) ($r['id'] ?? '');
    if ($reproductors[$tipus]['patro'] !== null && !preg_match($reproductors[$tipus]['patro'], $id)) { $tipus = 'enllac'; $id = ''; }
    $f['_tipus'] = $tipus;
    $f['_rid'] = $id;
    $f['_url'] = radio_url((string) ($f['url'] ?? ''));
    $f['_progUrl'] = radio_url((string) ($f['programa_url'] ?? ''));
    $f['_tema'] = isset($temes[$f['tema'] ?? '']) ? (string) $f['tema'] : '';
    $totes[] = $f;
}
usort($totes, static fn($a, $b) => strcmp((string) $b['data'], (string) $a['data']));

$compte = [];
foreach ($totes as $f) {
    if ($f['_tema'] !== '') { $compte[$f['_tema']] = ($compte[$f['_tema']] ?? 0) + 1; }
}
$filtre = (string) ($_GET['tema'] ?? '');
if (!isset($temes[$filtre]) || empty($compte[$filtre])) { $filtre = ''; }
$llista = $filtre === '' ? $totes : array_values(array_filter($totes, static fn($f) => $f['_tema'] === $filtre));

// Agrupades per mes, de la més nova a la més antiga.
$mesos = ['', 'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
$perMes = [];
foreach ($llista as $f) { $perMes[substr((string) $f['data'], 0, 7)][] = $f; }

function radio_fitxa(array $f, array $temes): void
{
    $titol = (string) $f['titol'];
    $durada = trim((string) ($f['durada'] ?? ''));
    $emissora = trim((string) ($f['emissora'] ?? ''));
    $programa = trim((string) ($f['programa'] ?? ''));
    $convidats = array_values(array_filter((array) ($f['convidats'] ?? []), static fn($c) => is_array($c) && trim((string) ($c['nom'] ?? '')) !== ''));
    $hid = 'r-' . preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($f['id'] ?? md5($titol))));
    ?>
      <li class="ona" id="<?= iacat_e($hid) ?>">
        <p class="ona__meta"><strong><?= iacat_e($emissora) ?></strong><?php if ($programa !== ''): ?> · <?php if ($f['_progUrl'] !== ''): ?><a href="<?= iacat_e($f['_progUrl']) ?>" target="_blank" rel="noopener noreferrer"><?= iacat_e($programa) ?></a><?php else: ?><?= iacat_e($programa) ?><?php endif; ?><?php endif; ?></p>
        <p class="ona__data"><time datetime="<?= iacat_e((string) $f['data']) ?>"><?= iacat_e(iacat_data_llarga((string) $f['data'])) ?></time><?php if ($durada !== ''): ?> · <?= iacat_e($durada) ?><?php endif; ?><?php if ($f['_tema'] !== ''): ?> · <a class="ona__tema" href="/radio?tema=<?= iacat_e($f['_tema']) ?>"><?= iacat_e($temes[$f['_tema']]) ?></a><?php endif; ?></p>
        <h3 class="ona__titol"><?= iacat_e($titol) ?></h3>
<?php if ($convidats): ?>
        <p class="ona__qui"><span><?= count($convidats) > 1 ? 'Hi parlen' : 'Hi parla' ?></span></p>
        <ul class="ona__convidats">
<?php foreach ($convidats as $c): ?>
          <li><strong><?= iacat_e(trim((string) $c['nom'])) ?></strong><?php if (trim((string) ($c['rol'] ?? '')) !== ''): ?>, <?= iacat_e(trim((string) $c['rol'])) ?><?php endif; ?></li>
<?php endforeach; ?>
        </ul>
<?php endif; ?>
<?php if (trim((string) ($f['resum'] ?? '')) !== ''): ?>
        <p class="ona__resum"><?= iacat_e(trim((string) $f['resum'])) ?></p>
<?php endif; ?>
<?php if ($f['_tipus'] !== 'enllac'): ?>
        <div class="ona__reproductor" data-radio-tipus="<?= iacat_e($f['_tipus']) ?>" data-radio-id="<?= iacat_e($f['_rid']) ?>" data-radio-titol="<?= iacat_e($titol) ?>">
          <button type="button" class="ona__play" aria-label="Escolta aquí: <?= iacat_e($titol) ?>"><span class="ona__icona" aria-hidden="true"></span><span class="ona__play-text">Escolta-ho aquí<?php if ($durada !== ''): ?> <small><?= iacat_e($durada) ?></small><?php endif; ?></span></button>
          <p class="ona__avis">Reproductor oficial de <?= iacat_e($emissora !== '' ? $emissora : 'l’emissora') ?>. No es carrega fins que hi fas clic.</p>
        </div>
<?php endif; ?>
<?php if ($f['_url'] !== ''): ?>
        <p class="ona__peu"><a href="<?= iacat_e($f['_url']) ?>" target="_blank" rel="noopener noreferrer"><?= $f['_tipus'] === 'enllac' ? 'Escolta-ho a la web de l’emissora' : 'Obre-ho a la web de l’emissora' ?> ↗</a></p>
<?php endif; ?>
      </li>
<?php
}

// Dades estructurades: cada intervenció és un episodi de ràdio del seu programa.
$parts = [];
foreach ($totes as $f) {
    if ($f['_url'] === '') { continue; }
    $ep = ['@type' => 'RadioEpisode', 'name' => (string) $f['titol'], 'url' => $f['_url'], 'datePublished' => (string) $f['data'], 'inLanguage' => 'ca'];
    if (!empty($f['programa'])) {
        $ep['partOfSeries'] = array_filter(['@type' => 'RadioSeries', 'name' => (string) $f['programa'], 'url' => $f['_progUrl'] ?: null]);
    }
    if (!empty($f['emissora'])) { $ep['publisher'] = ['@type' => 'Organization', 'name' => (string) $f['emissora']]; }
    $persones = [];
    foreach ((array) ($f['convidats'] ?? []) as $c) { if (is_array($c) && !empty($c['nom'])) { $persones[] = ['@type' => 'Person', 'name' => (string) $c['nom']]; } }
    if ($persones) { $ep['contributor'] = $persones; }
    $parts[] = $ep;
}

$actualitzat = (string) ($dades['actualitzat'] ?? '');
$total = count($totes);
$nomTema = $filtre !== '' ? $temes[$filtre] : '';
iacat_capcalera([
    'titol' => $nomTema !== '' ? 'La IA a la ràdio: ' . $nomTema : 'La IA a la ràdio',
    'descripcio' => 'Entrevistes, debats i seccions sobre intel·ligència artificial a les ràdios en català: emissora, data, qui hi parla, un resum nostre i el reproductor oficial de l’emissora per escoltar-les.',
    'cami' => '/radio', // els filtres per tema tenen la mateixa canònica
    'molla' => 'La IA a la ràdio',
    'css' => ['/radio.css?v=2026101101'],
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'La IA a la ràdio', 'url' => IACAT_BASE . '/radio', 'inLanguage' => 'ca', 'hasPart' => $parts],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">La IA a la ràdio</p><h1 class="editorial-display">Escolta qui en sap. <em>A les ràdios d’aquí.</em></h1>
      <p class="editorial-lede"><?= $total ? $total . ' entrevistes, debats i seccions' : 'Entrevistes, debats i seccions' ?> sobre intel·ligència artificial emesos a les ràdios en català. Per a cadascuna et diem qui hi parla i de què, en un resum nostre, i la pots escoltar aquí mateix amb el reproductor de l’emissora.</p></div>
      <aside><strong>Com l’hem fet</strong>Les triem nosaltres als arxius de cada emissora i en redactem el resum a partir de la descripció oficial. L’àudio és de l’emissora: no el baixem ni el copiem, i el seu reproductor no es carrega fins que hi fas clic.<?php if ($actualitzat !== ''): ?><br><br>Actualitzat el <?= iacat_e(iacat_data_llarga($actualitzat)) ?>.<?php endif; ?></aside>
    </header>

<?php if ($total): ?>
    <ul class="xips ona-filtres" aria-label="Temes">
      <li><a href="/radio"<?= $filtre === '' ? ' aria-current="page"' : '' ?>>Totes (<?= $total ?>)</a></li>
<?php foreach ($temes as $id => $nom): if (empty($compte[$id])) { continue; } ?>
      <li><a href="/radio?tema=<?= iacat_e($id) ?>"<?= $filtre === $id ? ' aria-current="page"' : '' ?>><?= iacat_e($nom) ?> (<?= $compte[$id] ?>)</a></li>
<?php endforeach; ?>
    </ul>

<?php foreach ($perMes as $mes => $fitxes): ?>
    <section class="seccio-bloc" aria-labelledby="m-<?= iacat_e($mes) ?>">
      <h2 id="m-<?= iacat_e($mes) ?>"><?= iacat_e($mesos[(int) substr($mes, 5, 2)] . ' de ' . substr($mes, 0, 4)) ?></h2>
      <ul class="ones">
<?php foreach ($fitxes as $f) { radio_fitxa($f, $temes); } ?>
      </ul>
    </section>
<?php endforeach; ?>
<?php else: ?>
    <p class="seccio-nota">Encara no hi ha cap intervenció recollida. Torna-hi aviat.</p>
<?php endif; ?>
    <p class="seccio-nota">Has parlat d’intel·ligència artificial en una ràdio en català, o n’has sentit una entrevista que hauria de ser aquí? <a href="mailto:pomazona@gmail.com?subject=La%20IA%20a%20la%20r%C3%A0dio%20%E2%80%94%20IA.cat">Envia’ns l’enllaç</a> i la fitxarem. Els resums són d’IA.cat; les veus, els programes i els àudios són de cada emissora.</p>
  <script defer src="/radio.js?v=2026101101"></script>
<?php
iacat_peu();
