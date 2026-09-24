<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Agenda de la IA a Catalunya (24.09.2026) — /agenda
// Dades: public/data/agenda.json (manual). Els actes ja passats s'amaguen sols;
// no cal esborrar-los. Qui la manté: la tasca «Edicions» el dia 1 de cada mes
// (vegeu CLAUDE.md, «Agenda d'actes»).
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$dades = iacat_dades('agenda.json');
$avui = (new DateTimeImmutable('now', new DateTimeZone('Europe/Madrid')))->format('Y-m-d');

$convocatories = [];
$actes = [];
foreach ((array) ($dades['actes'] ?? []) as $acte) {
    if (!is_array($acte) || empty($acte['titol']) || empty($acte['inici']) || empty($acte['url'])) { continue; }
    $fi = !empty($acte['fi']) ? (string) $acte['fi'] : (string) $acte['inici'];
    if ($fi < $avui) { continue; }
    if (($acte['tipus'] ?? '') === 'convocatòria') { $convocatories[] = $acte; } else { $actes[] = $acte; }
}
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

$fitxa = static function (array $a, bool $convocatoria) use ($caixaData, $abrev): string {
    $inici = (string) $a['inici'];
    $fi = (string) ($a['fi'] ?? '');
    $data = $convocatoria
        ? '<span>Fins al</span><strong>' . (int) substr($fi ?: $inici, 8, 2) . '</strong><span>' . $abrev[(int) substr($fi ?: $inici, 5, 2)] . ' ' . substr($fi ?: $inici, 0, 4) . '</span>'
        : $caixaData($inici, $fi);
    $detalls = [];
    if (!empty($a['lloc'])) { $detalls[] = iacat_e((string) $a['lloc']); }
    if (!empty($a['format'])) { $detalls[] = iacat_e(ucfirst((string) $a['format'])); }
    if (!empty($a['preu'])) { $detalls[] = iacat_e(ucfirst((string) $a['preu'])); }
    if (!empty($a['organitza'])) { $detalls[] = 'Organitza: ' . iacat_e((string) $a['organitza']); }
    return '<article class="acte' . ($convocatoria ? ' acte--convocatoria' : '') . '"><div class="acte__data">' . $data . '</div><div>'
        . '<span class="fitxa__meta">' . iacat_e(ucfirst((string) ($a['tipus'] ?? 'acte'))) . '</span>'
        . '<h3><a href="' . iacat_e((string) $a['url']) . '" target="_blank" rel="noopener noreferrer">' . iacat_e((string) $a['titol']) . ' ↗</a></h3>'
        . '<p>' . iacat_e((string) ($a['descripcio'] ?? '')) . '</p>'
        . ($detalls ? '<p class="acte__detalls">' . implode('<span aria-hidden="true">·</span>', $detalls) . '</p>' : '')
        . '</div></article>';
};

// JSON-LD: un Event per acte (les convocatòries no ho són).
$events = [];
foreach ($actes as $a) {
    $e = ['@type' => 'Event', 'name' => (string) $a['titol'], 'startDate' => (string) $a['inici'], 'url' => (string) $a['url'],
        'description' => (string) ($a['descripcio'] ?? ''), 'eventStatus' => 'https://schema.org/EventScheduled'];
    if (!empty($a['fi'])) { $e['endDate'] = (string) $a['fi']; }
    $format = (string) ($a['format'] ?? '');
    $e['eventAttendanceMode'] = $format === 'en línia' ? 'https://schema.org/OnlineEventAttendanceMode'
        : ($format === 'híbrid' ? 'https://schema.org/MixedEventAttendanceMode' : 'https://schema.org/OfflineEventAttendanceMode');
    if (!empty($a['lloc']) && $format !== 'en línia') { $e['location'] = ['@type' => 'Place', 'name' => (string) $a['lloc'], 'address' => (string) $a['lloc']]; }
    if (!empty($a['organitza'])) { $e['organizer'] = ['@type' => 'Organization', 'name' => (string) $a['organitza']]; }
    $events[] = $e;
}

iacat_capcalera([
    'titol' => 'Agenda de la IA a Catalunya',
    'descripcio' => 'Congressos, jornades, fires i convocatòries sobre intel·ligència artificial a Catalunya i als Països Catalans, actualitzats cada mes.',
    'cami' => '/agenda',
    'molla' => 'Agenda',
    'jsonld' => ['@context' => 'https://schema.org', '@graph' => array_merge(
        [['@type' => 'CollectionPage', 'name' => 'Agenda de la IA a Catalunya', 'url' => IACAT_BASE . '/agenda', 'inLanguage' => 'ca']], $events)],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Agenda</p><h1 class="editorial-display">Què passa <em>i quan.</em></h1>
      <p class="editorial-lede">Congressos, jornades, fires i convocatòries sobre intel·ligència artificial a Catalunya i als Països Catalans. Cada acte enllaça la web de qui l’organitza: comprova-hi l’horari i les inscripcions.</p></div>
      <aside><strong>Organitzes un acte?</strong>Envia’ns el nom, la data, el lloc i l’enllaç oficial. <a href="mailto:pomazona@gmail.com?subject=Acte%20per%20a%20l%E2%80%99agenda%20d%E2%80%99IA.cat">pomazona@gmail.com</a><br><br>Última revisió: <?= iacat_e(iacat_data_llarga((string) ($dades['actualitzat'] ?? ''))) ?>.</aside>
    </header>

<?php if ($convocatories): ?>
    <section class="seccio-bloc" aria-labelledby="conv-titol">
      <h2 id="conv-titol">Convocatòries obertes</h2>
      <?php foreach ($convocatories as $a) { echo $fitxa($a, true); } ?>
    </section>
<?php endif; ?>

    <section class="seccio-bloc" aria-labelledby="actes-titol">
      <h2 id="actes-titol">Pròxims actes</h2>
<?php
if (!$actes) {
    echo '<p class="seccio-intro">Ara mateix no hi ha cap acte a l’agenda. Torna-hi d’aquí a uns dies.</p>';
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
      <p class="seccio-nota">Les dates i els llocs són els que publica cada organització; si canvien, mana la seva web. Hi entren actes amb la intel·ligència artificial com a eix, oberts al públic o a professionals, fets a Catalunya o als Països Catalans, o en línia i organitzats per entitats d’aquí.</p>
    </section>
<?php
iacat_peu();
