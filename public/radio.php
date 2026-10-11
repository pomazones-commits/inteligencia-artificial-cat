<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// La IA a la ràdio (11.10.2026) — /radio
// Dades: public/data/radio.json, MANUAL (cap automatització no el toca).
// Cada fitxa: emissora (amb el seu logo), programa, data, convidats, resum
// PROPI i el reproductor OFICIAL de l'emissora. Valida: node scripts/valida-radio.mjs
//
// Drets i privacitat: l'àudio és de l'emissora i no es baixa ni s'allotja mai
// aquí. La fitxa només mostra un botó; el reproductor oficial (un iframe de
// l'emissora, amb les seves galetes) no es carrega fins que el lector hi fa
// clic (public/radio.js). Els logos són la icona oficial de cada emissora,
// desada al nostre servidor pel workflow radio-icones.yml
// (public/data/radio-icones.json): cap petició a l'emissora en obrir la pàgina.
//
// Tipus de reproductor (iguals aquí, a radio.js i a scripts/valida-radio.mjs):
//   3cat       → https://www.3cat.cat/3cat/audio/<id>/embed/
//   rtve       → https://www.rtve.es/drmn/embed/audio/<id>
//   omny       → https://omny.fm/shows/<programa>/<clip>/embed (RAC1)
//   soundcloud → w.soundcloud.com (id numèric de la pista)
//   youtube    → youtube-nocookie.com (id de 11 caràcters)
//   enllac     → l'emissora no deixa incrustar: només l'enllaç a la seva web
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$dades = iacat_dades('radio.json');
$temes = array_filter((array) ($dades['temes'] ?? []), 'is_string');
$icones = array_filter(iacat_dades('radio-icones.json'), static fn($r) => is_string($r) && preg_match('#^/assets/radio/[a-z0-9-]+\.(png|svg|webp|jpg|ico)$#', $r) && is_file(__DIR__ . $r));
$reproductors = [
    '3cat' => ['patro' => '/^\d{4,9}$/', 'plataforma' => '3Cat'],
    'rtve' => ['patro' => '/^\d{5,10}$/', 'plataforma' => 'RTVE Play'],
    'omny' => ['patro' => '#^[a-z0-9-]+/[a-z0-9-]+$#', 'plataforma' => 'Omny'],
    'soundcloud' => ['patro' => '/^\d{4,12}$/', 'plataforma' => 'SoundCloud'],
    'youtube' => ['patro' => '/^[A-Za-z0-9_-]{11}$/', 'plataforma' => 'YouTube'],
    'enllac' => ['patro' => null, 'plataforma' => ''],
];

/** Només adreces https ben formades (les fitxes són manuals, però val més no fiar-se'n). */
function radio_url(string $u): string
{
    return preg_match('#^https://[a-z0-9.-]+\.[a-z]{2,}(/[^\s"\'<>]*)?$#i', $u) ? $u : '';
}

/** Nom curt d'una emissora per a les adreces (?emissora=): «Ràdio Capital de l'Empordà» → «radio-capital-de-l-emporda». */
function radio_slug(string $nom): string
{
    $s = strtr(mb_strtolower($nom), ['à' => 'a', 'á' => 'a', 'è' => 'e', 'é' => 'e', 'í' => 'i', 'ï' => 'i', 'ò' => 'o', 'ó' => 'o', 'ú' => 'u', 'ü' => 'u', 'ç' => 'c', 'ñ' => 'n']);
    return trim((string) preg_replace('/[^a-z0-9]+/', '-', $s), '-');
}

/** Logo de l'emissora (si en tenim la icona) o, si no, la inicial. */
function radio_logo(string $emissora, array $icones, int $mida = 40): string
{
    if (isset($icones[$emissora])) {
        return '<span class="ona-logo" style="width:' . $mida . 'px;height:' . $mida . 'px"><img src="' . iacat_e($icones[$emissora]) . '" alt="" width="' . $mida . '" height="' . $mida . '" loading="lazy" decoding="async"></span>';
    }
    $inicial = mb_strtoupper(mb_substr(trim((string) preg_replace('/^(Ràdio|Radio)\s+/u', '', $emissora)), 0, 1));
    return '<span class="ona-logo ona-logo--inicial" style="width:' . $mida . 'px;height:' . $mida . 'px" aria-hidden="true">' . iacat_e($inicial ?: 'R') . '</span>';
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
    $f['_emissora'] = trim((string) ($f['emissora'] ?? ''));
    $f['_es'] = radio_slug($f['_emissora']);
    $totes[] = $f;
}
usort($totes, static fn($a, $b) => strcmp((string) $b['data'], (string) $a['data']));

$compteTema = [];
$compteEmissora = [];
$nomEmissora = [];
foreach ($totes as $f) {
    if ($f['_tema'] !== '') { $compteTema[$f['_tema']] = ($compteTema[$f['_tema']] ?? 0) + 1; }
    if ($f['_es'] !== '') { $compteEmissora[$f['_es']] = ($compteEmissora[$f['_es']] ?? 0) + 1; $nomEmissora[$f['_es']] = $f['_emissora']; }
}
arsort($compteEmissora);
$filtreTema = (string) ($_GET['tema'] ?? '');
if (!isset($temes[$filtreTema]) || empty($compteTema[$filtreTema])) { $filtreTema = ''; }
$filtreEmissora = (string) ($_GET['emissora'] ?? '');
if (!isset($compteEmissora[$filtreEmissora])) { $filtreEmissora = ''; }
$llista = array_values(array_filter($totes, static fn($f) => ($filtreTema === '' || $f['_tema'] === $filtreTema) && ($filtreEmissora === '' || $f['_es'] === $filtreEmissora)));
$enllac = static function (string $tema, string $emissora): string {
    $q = array_filter(['tema' => $tema, 'emissora' => $emissora]);
    return '/radio' . ($q ? '?' . http_build_query($q) : '');
};

// Agrupades per mes, de la més nova a la més antiga.
$mesos = ['', 'Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
$perMes = [];
foreach ($llista as $f) { $perMes[substr((string) $f['data'], 0, 7)][] = $f; }

function radio_fitxa(array $f, array $temes, array $icones, array $reproductors): void
{
    $titol = (string) $f['titol'];
    $durada = trim((string) ($f['durada'] ?? ''));
    $emissora = $f['_emissora'];
    $programa = trim((string) ($f['programa'] ?? ''));
    $convidats = array_values(array_filter((array) ($f['convidats'] ?? []), static fn($c) => is_array($c) && trim((string) ($c['nom'] ?? '')) !== ''));
    $hid = 'r-' . preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($f['id'] ?? md5($titol))));
    $plataforma = $reproductors[$f['_tipus']]['plataforma'] ?? '';
    ?>
      <li class="ona" id="<?= iacat_e($hid) ?>">
        <div class="ona__cap">
          <?= radio_logo($emissora, $icones) ?>
          <div>
            <p class="ona__meta"><a class="ona__emissora" href="/radio?emissora=<?= iacat_e($f['_es']) ?>"><?= iacat_e($emissora) ?></a><?php if ($programa !== ''): ?> · <?php if ($f['_progUrl'] !== ''): ?><a href="<?= iacat_e($f['_progUrl']) ?>" target="_blank" rel="noopener noreferrer"><?= iacat_e($programa) ?></a><?php else: ?><?= iacat_e($programa) ?><?php endif; ?><?php endif; ?></p>
            <p class="ona__data"><time datetime="<?= iacat_e((string) $f['data']) ?>"><?= iacat_e(iacat_data_llarga((string) $f['data'])) ?></time><?php if ($durada !== ''): ?> · <?= iacat_e($durada) ?><?php endif; ?><?php if ($f['_tema'] !== ''): ?> · <a class="ona__tema" href="/radio?tema=<?= iacat_e($f['_tema']) ?>"><?= iacat_e($temes[$f['_tema']]) ?></a><?php endif; ?></p>
          </div>
        </div>
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
          <p class="ona__avis">Reproductor oficial de <?= iacat_e($emissora !== '' ? $emissora : 'l’emissora') ?><?= $plataforma !== '' ? ', a ' . iacat_e($plataforma) : '' ?>. No es carrega fins que hi fas clic.</p>
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
    if ($f['_emissora'] !== '') { $ep['publisher'] = ['@type' => 'Organization', 'name' => $f['_emissora']]; }
    $persones = [];
    foreach ((array) ($f['convidats'] ?? []) as $c) { if (is_array($c) && !empty($c['nom'])) { $persones[] = ['@type' => 'Person', 'name' => (string) $c['nom']]; } }
    if ($persones) { $ep['contributor'] = $persones; }
    $parts[] = $ep;
}

$actualitzat = (string) ($dades['actualitzat'] ?? '');
$total = count($totes);
$nEmissores = count($compteEmissora);
$subtitol = trim(($filtreEmissora !== '' ? $nomEmissora[$filtreEmissora] : '') . ($filtreTema !== '' ? ($filtreEmissora !== '' ? ' · ' : '') . $temes[$filtreTema] : ''));
iacat_capcalera([
    'titol' => $subtitol !== '' ? 'La IA a la ràdio: ' . $subtitol : 'La IA a la ràdio',
    'descripcio' => 'Entrevistes, debats i seccions sobre intel·ligència artificial a les ràdios en català: emissora, data, qui hi parla, un resum nostre i el reproductor oficial de l’emissora per escoltar-les.',
    'cami' => '/radio', // els filtres tenen la mateixa canònica
    'molla' => 'La IA a la ràdio',
    'css' => ['/radio.css?v=2026101102'],
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'La IA a la ràdio', 'url' => IACAT_BASE . '/radio', 'inLanguage' => 'ca', 'hasPart' => $parts],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">La IA a la ràdio</p><h1 class="editorial-display">Escolta qui en sap. <em>A les ràdios d’aquí.</em></h1>
      <p class="editorial-lede"><?= $total ? $total . ' entrevistes, debats i seccions' : 'Entrevistes, debats i seccions' ?> sobre intel·ligència artificial emesos <?= $nEmissores > 1 ? 'a ' . $nEmissores . ' ràdios' : 'a les ràdios' ?> en català, de les públiques a les locals. Per a cadascuna et diem qui hi parla i de què, en un resum nostre, i la pots escoltar aquí mateix amb el reproductor de l’emissora.</p></div>
      <aside><strong>Com l’hem fet</strong>Les triem nosaltres als arxius de cada emissora i en redactem el resum a partir de la descripció oficial. L’àudio és de l’emissora: no el baixem ni el copiem, i el seu reproductor no es carrega fins que hi fas clic.<?php if ($actualitzat !== ''): ?><br><br>Actualitzat el <?= iacat_e(iacat_data_llarga($actualitzat)) ?>.<?php endif; ?></aside>
    </header>

<?php if ($total): ?>
    <div class="ona-filtres">
      <ul class="xips ona-emissores" aria-label="Emissores">
        <li><a href="<?= iacat_e($enllac($filtreTema, '')) ?>"<?= $filtreEmissora === '' ? ' aria-current="page"' : '' ?>>Totes les emissores</a></li>
<?php foreach ($compteEmissora as $es => $n): ?>
        <li><a href="<?= iacat_e($enllac($filtreTema, $es)) ?>"<?= $filtreEmissora === $es ? ' aria-current="page"' : '' ?>><?= radio_logo($nomEmissora[$es], $icones, 18) ?><?= iacat_e($nomEmissora[$es]) ?> (<?= $n ?>)</a></li>
<?php endforeach; ?>
      </ul>
      <ul class="xips" aria-label="Temes">
        <li><a href="<?= iacat_e($enllac('', $filtreEmissora)) ?>"<?= $filtreTema === '' ? ' aria-current="page"' : '' ?>>Tots els temes</a></li>
<?php foreach ($temes as $id => $nom): if (empty($compteTema[$id])) { continue; } ?>
        <li><a href="<?= iacat_e($enllac($id, $filtreEmissora)) ?>"<?= $filtreTema === $id ? ' aria-current="page"' : '' ?>><?= iacat_e($nom) ?> (<?= $compteTema[$id] ?>)</a></li>
<?php endforeach; ?>
      </ul>
    </div>

<?php if (!$llista): ?>
    <p class="seccio-nota">No hi ha cap intervenció amb aquesta combinació. <a href="/radio">Mostra-les totes</a>.</p>
<?php endif; ?>
<?php foreach ($perMes as $mes => $fitxes): ?>
    <section class="seccio-bloc" aria-labelledby="m-<?= iacat_e($mes) ?>">
      <h2 id="m-<?= iacat_e($mes) ?>"><?= iacat_e($mesos[(int) substr($mes, 5, 2)] . ' de ' . substr($mes, 0, 4)) ?></h2>
      <ul class="ones">
<?php foreach ($fitxes as $f) { radio_fitxa($f, $temes, $icones, $reproductors); } ?>
      </ul>
    </section>
<?php endforeach; ?>
<?php else: ?>
    <p class="seccio-nota">Encara no hi ha cap intervenció recollida. Torna-hi aviat.</p>
<?php endif; ?>
    <p class="seccio-nota">Has parlat d’intel·ligència artificial en una ràdio en català, o n’has sentit una entrevista que hauria de ser aquí? <a href="mailto:pomazona@gmail.com?subject=La%20IA%20a%20la%20r%C3%A0dio%20%E2%80%94%20IA.cat">Envia’ns l’enllaç</a> i la fitxarem. Els resums són d’IA.cat; les veus, els programes, els àudios i els logos són de cada emissora.</p>
  <script defer src="/radio.js?v=2026101102"></script>
<?php
iacat_peu();
