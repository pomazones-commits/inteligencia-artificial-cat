<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Agenda de la IA a Catalunya (24.09.2026) — /agenda
// Dades: public/data/agenda.json (manual). Els actes ja passats s'amaguen sols;
// no cal esborrar-los. Qui la manté: la tasca «Edicions» cada dijous (des del
// 10.10.2026; abans, el dia 1 de cada mes) — vegeu CLAUDE.md, «Agenda d'actes».
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$dades = iacat_dades('agenda.json');
$avui = (new DateTimeImmutable('now', new DateTimeZone('Europe/Madrid')))->format('Y-m-d');

// 10.10.2026: l'agenda passa a ser exhaustiva (tots els territoris de parla
// catalana i també trobades i hackatons de la comunitat), i per això porta
// filtres per territori i per tipus (?territori=…&tipus=…, sense JavaScript).
// El camp "territori" és opcional: si falta, es dedueix del lloc.
$territoris = [
    'catalunya' => 'Catalunya',
    'comunitat-valenciana' => 'Comunitat Valenciana',
    'illes-balears' => 'Illes Balears',
    'andorra' => 'Andorra',
    'catalunya-nord' => 'Catalunya Nord',
    'en-linia' => 'En línia',
];
$tipusNoms = [
    'congrés' => 'Congressos', 'jornada' => 'Jornades', 'fira' => 'Fires', 'hackató' => 'Hackatons',
    'trobada' => 'Trobades', 'curs' => 'Cursos i tallers', 'webinar' => 'Webinars', 'convocatòria' => 'Convocatòries',
];
$territoriDe = static function (array $a) use ($territoris): string {
    $t = (string) ($a['territori'] ?? '');
    if (isset($territoris[$t])) { return $t; }
    $lloc = mb_strtolower((string) ($a['lloc'] ?? ''));
    if (($a['format'] ?? '') === 'en línia' || str_starts_with($lloc, 'en línia')) { return 'en-linia'; }
    if (preg_match('/val[eè]ncia|alacant|alicante|castell[oó]|elx|elche|gandia|alcoi|benidorm|sagunt/u', $lloc)) { return 'comunitat-valenciana'; }
    if (preg_match('/palma|mallorca|menorca|eivissa|ibiza|formentera|ma[oó]\b/u', $lloc)) { return 'illes-balears'; }
    if (preg_match('/andorra|escaldes|encamp|sant juli[aà]/u', $lloc)) { return 'andorra'; }
    if (preg_match('/perpiny|perpignan|pirineus orientals/u', $lloc)) { return 'catalunya-nord'; }
    return 'catalunya';
};
$filtreTerritori = isset($_GET['territori'], $territoris[(string) $_GET['territori']]) ? (string) $_GET['territori'] : '';
$filtreTipus = isset($_GET['tipus'], $tipusNoms[(string) $_GET['tipus']]) ? (string) $_GET['tipus'] : '';

$convocatories = [];
$actes = [];
$compteTerritori = [];
$compteTipus = [];
foreach ((array) ($dades['actes'] ?? []) as $acte) {
    if (!is_array($acte) || empty($acte['titol']) || empty($acte['inici']) || empty($acte['url'])) { continue; }
    $fi = !empty($acte['fi']) ? (string) $acte['fi'] : (string) $acte['inici'];
    if ($fi < $avui) { continue; }
    $acte['_territori'] = $territoriDe($acte);
    $tipus = (string) ($acte['tipus'] ?? '');
    $compteTerritori[$acte['_territori']] = ($compteTerritori[$acte['_territori']] ?? 0) + 1;
    if (isset($tipusNoms[$tipus])) { $compteTipus[$tipus] = ($compteTipus[$tipus] ?? 0) + 1; }
    if ($filtreTerritori !== '' && $acte['_territori'] !== $filtreTerritori) { continue; }
    if ($filtreTipus !== '' && $tipus !== $filtreTipus) { continue; }
    if ($tipus === 'convocatòria') { $convocatories[] = $acte; } else { $actes[] = $acte; }
}
$filtrat = $filtreTerritori !== '' || $filtreTipus !== '';
$enllacFiltre = static function (string $territori, string $tipus): string {
    $q = array_filter(['territori' => $territori, 'tipus' => $tipus], 'strlen');
    return '/agenda' . ($q ? '?' . http_build_query($q) : '');
};
$perData = static fn(array $a, array $b): int => strcmp((string) $a['inici'], (string) $b['inici']);
usort($actes, $perData);
usort($convocatories, static fn(array $a, array $b): int => strcmp((string) ($a['fi'] ?: $a['inici']), (string) ($b['fi'] ?: $b['inici'])));

$mesos = ['', 'gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
$abrev = ['', 'gen.', 'febr.', 'març', 'abr.', 'maig', 'juny', 'jul.', 'ag.', 'set.', 'oct.', 'nov.', 'des.'];

$caixaData = static function (string $inici, string $fi) use ($abrev): string {
    [$y1, $m1, $d1] = array_map('intval', explode('-', $inici));
    if ($fi === '' || $fi === $inici) { return '<strong>' . $d1 . '</strong><span>' . $abrev[$m1] . ' ' . $y1 . '</span>'; }
    [$y2, $m2, $d2] = array_map('intval', explode('-', $fi));
    $dies = $m1 === $m2 ? $d1 . '–' . $d2 : $d1 . ' ' . $abrev[$m1] . '–' . $d2;
    return '<strong>' . $dies . '</strong><span>' . $abrev[$m2] . ' ' . $y2 . '</span>';
};

$fitxa = static function (array $a, bool $convocatoria) use ($caixaData, $abrev, $territoris, $avui): string {
    $inici = (string) $a['inici'];
    $fi = (string) ($a['fi'] ?? '');
    $data = $convocatoria
        ? '<span>Fins al</span><strong>' . (int) substr($fi ?: $inici, 8, 2) . '</strong><span>' . $abrev[(int) substr($fi ?: $inici, 5, 2)] . ' ' . substr($fi ?: $inici, 0, 4) . '</span>'
        : $caixaData($inici, $fi);
    $detalls = [];
    if (!empty($a['lloc'])) { $detalls[] = iacat_e((string) $a['lloc']); }
    if (($a['_territori'] ?? 'catalunya') !== 'catalunya' && ($a['_territori'] ?? '') !== 'en-linia') { $detalls[] = iacat_e($territoris[$a['_territori']]); }
    if (!empty($a['format'])) { $detalls[] = iacat_e(ucfirst((string) $a['format'])); }
    if (!empty($a['preu'])) { $detalls[] = iacat_e(ucfirst((string) $a['preu'])); }
    if (!empty($a['organitza'])) { $detalls[] = 'Organitza: ' . iacat_e((string) $a['organitza']); }
    return '<article class="acte' . ($convocatoria ? ' acte--convocatoria' : '') . '"><div class="acte__data">' . $data . '</div><div>'
        . '<span class="fitxa__meta">' . iacat_e(ucfirst((string) ($a['tipus'] ?? 'acte')))
        . (!$convocatoria && (string) $a['inici'] <= $avui ? ' · <span class="acte__ara">ara mateix</span>' : '') . '</span>'
        . '<h3><a href="' . iacat_e((string) $a['url']) . '" target="_blank" rel="noopener noreferrer">' . iacat_e((string) $a['titol']) . ' ↗</a></h3>'
        . '<p>' . iacat_e((string) ($a['descripcio'] ?? '')) . '</p>'
        . ($detalls ? '<p class="acte__detalls">' . implode('<span aria-hidden="true">·</span>', $detalls) . '</p>' : '')
        . '</div></article>';
};

// JSON-LD: un Event per acte (les convocatòries no ho són).
// 30.09.2026: Search Console demanava endDate, image, offers, performer i organizer.url.
// Camps opcionals nous a agenda.json: "imatge" (URL d'una imatge de l'acte),
// "organitza_url" (web de l'organitzador), "ponents" (llista de noms) i "preu_eur" (número).
// Si falten: imatge de marca, domini de l'URL de l'acte, l'organitzador com a performer
// i una oferta amb només l'enllaç d'inscripció.
$origen = static function (string $url): string {
    $p = parse_url($url);
    return !empty($p['scheme']) && !empty($p['host']) ? $p['scheme'] . '://' . $p['host'] . '/' : $url;
};
$events = [];
foreach ($actes as $a) {
    $url = (string) $a['url'];
    $inici = (string) $a['inici'];
    $e = ['@type' => 'Event', 'name' => (string) $a['titol'], 'startDate' => $inici,
        'endDate' => !empty($a['fi']) ? (string) $a['fi'] : $inici, 'url' => $url,
        'description' => (string) ($a['descripcio'] ?? ''), 'eventStatus' => 'https://schema.org/EventScheduled',
        'image' => [!empty($a['imatge']) ? (string) $a['imatge'] : IACAT_BASE . '/assets/og-portada.jpg']];
    $format = (string) ($a['format'] ?? '');
    $e['eventAttendanceMode'] = $format === 'en línia' ? 'https://schema.org/OnlineEventAttendanceMode'
        : ($format === 'híbrid' ? 'https://schema.org/MixedEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode');
    $llocs = [];
    if (!empty($a['lloc']) && $format !== 'en línia') { $llocs[] = ['@type' => 'Place', 'name' => (string) $a['lloc'], 'address' => (string) $a['lloc']]; }
    if ($format === 'en línia' || $format === 'híbrid') { $llocs[] = ['@type' => 'VirtualLocation', 'url' => $url]; }
    if ($llocs) { $e['location'] = count($llocs) === 1 ? $llocs[0] : $llocs; }
    $organitzador = null;
    if (!empty($a['organitza'])) {
        $organitzador = ['@type' => 'Organization', 'name' => (string) $a['organitza'],
            'url' => !empty($a['organitza_url']) ? (string) $a['organitza_url'] : $origen($url)];
        $e['organizer'] = $organitzador;
    }
    $ponents = array_values(array_filter(array_map('strval', (array) ($a['ponents'] ?? [])), 'strlen'));
    if ($ponents) {
        $e['performer'] = array_map(static fn(string $n): array => ['@type' => 'Person', 'name' => $n], $ponents);
    } elseif ($organitzador) {
        $e['performer'] = $organitzador;
    }
    $oferta = ['@type' => 'Offer', 'url' => $url];
    $preu = (string) ($a['preu'] ?? '');
    if ($preu === 'gratuït') {
        $oferta += ['price' => 0, 'priceCurrency' => 'EUR'];
    } elseif (isset($a['preu_eur']) && is_numeric($a['preu_eur'])) {
        $oferta += ['price' => (float) $a['preu_eur'], 'priceCurrency' => 'EUR'];
    }
    $e['offers'] = $oferta;
    $events[] = $e;
}

iacat_capcalera([
    'titol' => 'Agenda de la IA a Catalunya i als territoris de parla catalana',
    'descripcio' => 'Tots els actes sobre intel·ligència artificial a Catalunya, la Comunitat Valenciana, les Illes Balears, Andorra i la Catalunya Nord: congressos, jornades, hackatons, trobades, cursos i convocatòries, revisats cada setmana.',
    'cami' => '/agenda',
    'molla' => 'Agenda',
    'css' => ['/agenda-filtres.css?v=2026101001'],
    'jsonld' => ['@context' => 'https://schema.org', '@graph' => array_merge(
        [['@type' => 'CollectionPage', 'name' => 'Agenda de la IA a Catalunya', 'url' => IACAT_BASE . '/agenda', 'inLanguage' => 'ca']], $events)],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Agenda</p><h1 class="editorial-display">Què passa <em>i quan.</em></h1>
      <p class="editorial-lede">Tots els actes sobre intel·ligència artificial que trobem a Catalunya, la Comunitat Valenciana, les Illes Balears, Andorra i la Catalunya Nord: congressos, jornades, hackatons, trobades, cursos i convocatòries. Cada acte enllaça la web de qui l’organitza: comprova-hi l’horari i les inscripcions.</p></div>
      <aside><strong>Organitzes un acte?</strong>Envia’ns el nom, la data, el lloc i l’enllaç oficial. <a href="mailto:pomazona@gmail.com?subject=Acte%20per%20a%20l%E2%80%99agenda%20d%E2%80%99IA.cat">pomazona@gmail.com</a><br><br>Última revisió: <?= iacat_e(iacat_data_llarga((string) ($dades['actualitzat'] ?? ''))) ?>.</aside>
    </header>

<?php if ($compteTerritori): ?>
    <nav class="agenda-filtres" aria-label="Filtra l'agenda">
      <ul class="xips" aria-label="Per territori">
        <li><a href="<?= iacat_e($enllacFiltre('', $filtreTipus)) ?>"<?= $filtreTerritori === '' ? ' aria-current="page"' : '' ?>>Tots els territoris</a></li>
<?php foreach ($territoris as $id => $nom): if (empty($compteTerritori[$id])) { continue; } ?>
        <li><a href="<?= iacat_e($enllacFiltre($id, $filtreTipus)) ?>"<?= $filtreTerritori === $id ? ' aria-current="page"' : '' ?>><?= iacat_e($nom) ?> (<?= $compteTerritori[$id] ?>)</a></li>
<?php endforeach; ?>
      </ul>
      <ul class="xips" aria-label="Per tipus">
        <li><a href="<?= iacat_e($enllacFiltre($filtreTerritori, '')) ?>"<?= $filtreTipus === '' ? ' aria-current="page"' : '' ?>>Tots els tipus</a></li>
<?php foreach ($tipusNoms as $id => $nom): if (empty($compteTipus[$id])) { continue; } ?>
        <li><a href="<?= iacat_e($enllacFiltre($filtreTerritori, $id)) ?>"<?= $filtreTipus === $id ? ' aria-current="page"' : '' ?>><?= iacat_e($nom) ?> (<?= $compteTipus[$id] ?>)</a></li>
<?php endforeach; ?>
      </ul>
    </nav>
<?php endif; ?>

<?php if ($convocatories): ?>
    <section class="seccio-bloc" aria-labelledby="conv-titol">
      <h2 id="conv-titol">Convocatòries obertes</h2>
      <?php foreach ($convocatories as $a) { echo $fitxa($a, true); } ?>
    </section>
<?php endif; ?>

    <section class="seccio-bloc" aria-labelledby="actes-titol">
      <h2 id="actes-titol">Pròxims actes<?= $actes ? ' <small>' . count($actes) . '</small>' : '' ?></h2>
<?php
if (!$actes) {
    echo $filtrat
        ? '<p class="seccio-intro">Amb aquests filtres no hi ha cap acte proper. <a href="/agenda">Mira l’agenda sencera</a>.</p>'
        : '<p class="seccio-intro">Ara mateix no hi ha cap acte a l’agenda. Torna-hi d’aquí a uns dies.</p>';
}
$mesActual = '';
foreach ($actes as $a) {
    $clauMes = substr((string) $a['inici'], 0, 7);
    if ($clauMes !== $mesActual) {
        $mesActual = $clauMes;
        echo '<h3 class="agenda-mes">' . $mesos[(int) substr($clauMes, 5, 2)] . ' ' . substr($clauMes, 0, 4) . '</h3>';
    }
    echo $fitxa($a, false);
}
?>
      <p class="seccio-nota">Les dates i els llocs són els que publica cada organització; si canvien, mana la seva web. Hi entren actes amb la intel·ligència artificial com a eix, oberts al públic o a professionals, fets a Catalunya o a la resta de territoris de parla catalana, o en línia i organitzats per entitats d’aquí.</p>
    </section>
<?php
iacat_peu();
