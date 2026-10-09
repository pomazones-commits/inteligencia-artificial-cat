<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Ressò de premsa (10.10.2026) — /premsa
// Dades: public/data/premsa.json, GENERAT pel workflow premsa.yml
// (automation/scripts/recull-premsa.mjs) a partir del RSS públic d'una llista
// tancada de diaris (automation/press-sources.json). Res no s'hi escriu a mà:
// per treure una peça, «exclou» a press-sources.json; per destacar-ne una,
// la sessió editorial fa servir incoming/premsa-destacats.json.
//
// Drets: només el titular, el mitjà, la data i l'enllaç a la peça original.
// Mai el text ni la imatge del diari.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$dades = iacat_dades('premsa.json');
$zona = new DateTimeZone('Europe/Madrid');
$ara = new DateTimeImmutable('now', $zona);
$avui = $ara->format('Y-m-d');
$ahir = $ara->modify('-1 day')->format('Y-m-d');
$llengues = ['es' => 'en castellà', 'en' => 'en anglès', 'fr' => 'en francès'];
$ambits = ['catala' => 'Diaris d’aquí', 'estatal' => 'Premsa estatal'];

$slug = static function (string $text): string {
    $t = strtolower(iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $text) ?: $text);
    return trim((string) preg_replace('/[^a-z0-9]+/', '-', $t), '-');
};

$filtre = isset($_GET['mitja']) ? $slug((string) $_GET['mitja']) : '';
$filtreAmbit = isset($_GET['ambit'], $ambits[(string) $_GET['ambit']]) ? (string) $_GET['ambit'] : '';

$peces = [];
$perMitja = [];
foreach ((array) ($dades['articles'] ?? []) as $p) {
    if (!is_array($p) || empty($p['titol']) || !preg_match('#^https://[^\s"\'<>]+$#', (string) ($p['url'] ?? ''))) { continue; }
    $t = strtotime((string) ($p['publicat'] ?? ''));
    if ($t === false) { continue; }
    $p['_t'] = $t;
    $p['_mitja'] = $slug((string) ($p['mitja'] ?? ''));
    $perMitja[$p['_mitja']] = [(string) ($p['mitja'] ?? ''), ($perMitja[$p['_mitja']][1] ?? 0) + 1];
    if ($filtre !== '' && $p['_mitja'] !== $filtre) { continue; }
    if ($filtreAmbit !== '' && ($p['ambit'] ?? '') !== $filtreAmbit) { continue; }
    $peces[] = $p;
}
usort($peces, static fn($a, $b) => $b['_t'] <=> $a['_t']);
uasort($perMitja, static fn($a, $b) => $b[1] <=> $a[1] ?: strcmp($a[0], $b[0]));

$perDia = [];
foreach ($peces as $p) {
    $dia = (new DateTimeImmutable('@' . $p['_t']))->setTimezone($zona)->format('Y-m-d');
    $perDia[$dia][] = $p;
}
$destacades = array_values(array_filter($peces, static fn($p) => !empty($p['destacat']) && !empty($p['comentari'])));

$nomDia = static function (string $dia) use ($avui, $ahir): string {
    if ($dia === $avui) { return 'Avui'; }
    if ($dia === $ahir) { return 'Ahir'; }
    $dies = ['diumenge', 'dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte'];
    return ucfirst($dies[(int) date('w', (int) strtotime($dia . ' 12:00'))]) . ', ' . iacat_data_llarga($dia, false);
};

function premsa_peca(array $p, array $llengues, DateTimeZone $zona, bool $comentari = true): void
{
    $hora = (new DateTimeImmutable('@' . $p['_t']))->setTimezone($zona)->format('H.i');
    $llengua = $llengues[(string) ($p['llengua'] ?? '')] ?? '';
    $noticia = preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($p['noticia'] ?? '')));
    ?>
        <li class="pr-peca<?= $comentari && !empty($p['destacat']) && !empty($p['comentari']) ? ' pr-peca--destacada' : '' ?>">
          <p class="pr-peca__meta"><strong><?= iacat_e((string) ($p['mitja'] ?? '')) ?></strong> · <time datetime="<?= iacat_e((string) ($p['publicat'] ?? '')) ?>"><?= iacat_e($hora) ?></time><?php if ($llengua !== ''): ?> · <span><?= iacat_e($llengua) ?></span><?php endif; ?></p>
          <h3 class="pr-peca__titol"><a href="<?= iacat_e((string) $p['url']) ?>" target="_blank" rel="noopener"><?= iacat_e((string) $p['titol']) ?> <span aria-hidden="true">↗</span></a></h3>
<?php if ($comentari && !empty($p['destacat']) && !empty($p['comentari'])): ?>
          <p class="pr-peca__comentari"><span>Per què llegir-la</span> <?= iacat_e((string) $p['comentari']) ?></p>
<?php endif; ?>
<?php if ($noticia !== ''): ?>
          <p class="pr-peca__nostra"><a href="/article.php?slug=<?= iacat_e($noticia) ?>">La notícia a IA.cat: <?= iacat_e(trim((string) ($p['noticiaTitol'] ?? '')) ?: 'llegeix-la') ?></a></p>
<?php endif; ?>
        </li>
<?php
}

$actualitzat = (string) ($dades['actualitzat'] ?? '');
iacat_capcalera([
    'titol' => 'Ressò de premsa: la IA als diaris',
    'descripcio' => 'Què publiquen sobre intel·ligència artificial l’Ara, VilaWeb, El Periódico, La Vanguardia, El Nacional, El País i la resta de diaris, recollit cada dues hores amb l’enllaç a la peça original.',
    'cami' => '/premsa',
    'molla' => 'Ressò de premsa',
    'css' => ['/premsa-pagina.css?v=2026101001'],
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'Ressò de premsa: la IA als diaris', 'url' => IACAT_BASE . '/premsa', 'inLanguage' => 'ca'],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Ressò de premsa</p><h1 class="editorial-display">La IA als diaris. <em>Què se’n diu, i on.</em></h1>
      <p class="editorial-lede"><?= count($peces) ? count($peces) . ' peces' : 'Les peces' ?> dels últims set dies sobre intel·ligència artificial a la premsa diària: els diaris en català i dels territoris de parla catalana, i les seccions de tecnologia i d’economia de la premsa estatal. Cada titular porta a la peça original.</p></div>
      <aside><strong>Com l’hem fet</strong>Llegim cada dues hores el canal públic (RSS) d’una llista tancada de diaris i hi entren les peces que parlen d’IA al titular (o, a les seccions de tecnologia, també a l’entradeta). No en copiem el text: només el titular, el mitjà i l’hora. Les peces marcades «Per què llegir-la» les tria i comenta la redacció.<?php if ($actualitzat !== '' && strtotime($actualitzat) !== false): $dAct = (new DateTimeImmutable($actualitzat))->setTimezone($zona); ?><br><br>Darrera recollida: <?= iacat_e(iacat_data_llarga($dAct->format('Y-m-d'))) ?>, a les <?= iacat_e($dAct->format('H.i')) ?>.<?php endif; ?></aside>
    </header>

<?php if ($perMitja): ?>
    <ul class="xips" aria-label="Filtra per diari">
      <li><a href="/premsa"<?= $filtre === '' && $filtreAmbit === '' ? ' aria-current="page"' : '' ?>>Tots</a></li>
<?php foreach ($ambits as $id => $nom): ?>
      <li><a href="/premsa?ambit=<?= $id ?>"<?= $filtreAmbit === $id ? ' aria-current="page"' : '' ?>><?= iacat_e($nom) ?></a></li>
<?php endforeach; ?>
<?php foreach ($perMitja as $id => [$nom, $n]): ?>
      <li><a href="/premsa?mitja=<?= iacat_e($id) ?>"<?= $filtre === $id ? ' aria-current="page"' : '' ?>><?= iacat_e($nom) ?> (<?= $n ?>)</a></li>
<?php endforeach; ?>
    </ul>
<?php endif; ?>

<?php if ($destacades && $filtre === '' && $filtreAmbit === ''): ?>
    <section class="seccio-bloc" aria-labelledby="t-destacades">
      <h2 id="t-destacades">La tria de la redacció</h2>
      <p class="seccio-intro">Les peces que val més la pena llegir, i per què.</p>
      <ul class="pr-llista pr-llista--destacades">
<?php foreach (array_slice($destacades, 0, 6) as $p) { premsa_peca($p, $llengues, $zona); } ?>
      </ul>
    </section>
<?php endif; ?>

<?php if ($perDia): ?>
<?php foreach ($perDia as $dia => $llista): ?>
    <section class="seccio-bloc" aria-labelledby="t-<?= iacat_e($dia) ?>">
      <h2 id="t-<?= iacat_e($dia) ?>"><?= iacat_e($nomDia($dia)) ?> <small><?= count($llista) ?> peces</small></h2>
      <ul class="pr-llista">
<?php foreach ($llista as $p) { premsa_peca($p, $llengues, $zona, $filtre !== '' || $filtreAmbit !== ''); } ?>
      </ul>
    </section>
<?php endforeach; ?>
<?php else: ?>
    <p class="seccio-nota"><?= $filtre !== '' || $filtreAmbit !== '' ? 'Aquest diari no ha publicat res sobre IA en els últims set dies. <a href="/premsa">Torna al recull sencer</a>.' : 'Encara no hi ha cap peça recollida. La llista s’omple sola des dels diaris cada dues hores: torna-hi d’aquí a una estona.' ?></p>
<?php endif; ?>
    <p class="seccio-nota">Hi trobes a faltar algun diari, o una peça no hi hauria de ser? <a href="mailto:pomazona@gmail.com?subject=Ress%C3%B2%20de%20premsa%20IA.cat">Escriu-nos</a>.</p>
<?php
iacat_peu();
