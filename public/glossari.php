<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Glossari d'intel·ligència artificial (24.09.2026) — /glossari
// Dades: public/data/glossari.json (manual). Cada terme fa servir la forma que
// recomana el TERMCAT («Terminologia de la intel·ligència artificial») i n'enllaça
// la fitxa quan n'hi ha; si el TERMCAT no el recull, el camp «nota» ho diu.
// Per afegir-ne un: una entrada nova al JSON (terme, en, altres, definicio, fitxa, nota).
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$dades = iacat_dades('glossari.json');
$termes = array_values(array_filter((array) ($dades['termes'] ?? []), static fn($t) => is_array($t) && !empty($t['terme']) && !empty($t['definicio'])));
$ordre = static fn(string $t): string => iacat_slug($t);
usort($termes, static fn(array $a, array $b): int => strcmp($ordre((string) $a['terme']), $ordre((string) $b['terme'])));

$perLletra = [];
foreach ($termes as $t) {
    $lletra = substr(iacat_slug((string) $t['terme']), 0, 1);
    $perLletra[$lletra][] = $t;
}

$ld = [];
foreach ($termes as $t) {
    $d = ['@type' => 'DefinedTerm', 'name' => (string) $t['terme'], 'description' => (string) $t['definicio'],
        'url' => IACAT_BASE . '/glossari#' . iacat_slug((string) $t['terme']), 'inDefinedTermSet' => IACAT_BASE . '/glossari'];
    if (!empty($t['en'])) { $d['alternateName'] = (string) $t['en']; }
    $ld[] = $d;
}

iacat_capcalera([
    'titol' => 'Glossari d’intel·ligència artificial',
    'descripcio' => 'Els termes bàsics de la intel·ligència artificial explicats en català, amb la forma que recomana el TERMCAT i l’equivalent en anglès.',
    'cami' => '/glossari',
    'molla' => 'Glossari',
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'DefinedTermSet', 'name' => 'Glossari d’intel·ligència artificial',
        'url' => IACAT_BASE . '/glossari', 'inLanguage' => 'ca', 'hasDefinedTerm' => $ld],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Glossari</p><h1 class="editorial-display">Les paraules <em>de la IA.</em></h1>
      <p class="editorial-lede"><?= count($termes) ?> termes explicats en poques línies, amb la forma catalana que recomana el TERMCAT i l’equivalent en anglès que trobaràs a les notícies.</p></div>
      <aside><strong>Font terminològica</strong>Les formes i les fitxes enllaçades són del diccionari <a href="https://www.termcat.cat/ca/diccionaris-en-linia/347" target="_blank" rel="noopener">Terminologia de la intel·ligència artificial</a> del TERMCAT. Les definicions són nostres, pensades per a qui no és especialista.</aside>
    </header>

    <label class="sr-only" for="cerca-terme">Busca un terme</label>
    <input class="glossari-cerca" id="cerca-terme" type="search" placeholder="Busca un terme, en català o en anglès…" autocomplete="off">

    <nav class="lletres" aria-label="Lletres">
<?php foreach (range('a', 'z') as $l): ?>
      <?= isset($perLletra[$l]) ? '<a href="#lletra-' . $l . '">' . $l . '</a>' : '<span>' . $l . '</span>' ?>
<?php endforeach; ?>
    </nav>

<?php foreach ($perLletra as $lletra => $llista): ?>
    <section class="glossari-bloc" data-lletra>
      <h2 class="glossari-lletra" id="lletra-<?= iacat_e($lletra) ?>"><?= iacat_e(strtoupper($lletra)) ?></h2>
      <dl class="glossari">
<?php foreach ($llista as $t): $id = iacat_slug((string) $t['terme']); ?>
        <div class="terme" id="<?= iacat_e($id) ?>" data-cerca="<?= iacat_e(iacat_slug($t['terme'] . ' ' . ($t['en'] ?? '') . ' ' . ($t['altres'] ?? ''))) ?>">
          <dt><?= iacat_e((string) $t['terme']) ?><?php if (!empty($t['en'])): ?> <small lang="en">en: <?= iacat_e((string) $t['en']) ?></small><?php endif; ?></dt>
          <dd><?= iacat_e((string) $t['definicio']) ?></dd>
<?php if (!empty($t['altres'])): ?>          <dd class="terme__altres">També: <?= iacat_e((string) $t['altres']) ?></dd>
<?php endif; ?>
<?php if (!empty($t['nota'])): ?>          <dd class="terme__nota"><?= iacat_e((string) $t['nota']) ?></dd>
<?php endif; ?>
<?php if (!empty($t['fitxa'])): ?>          <dd class="terme__font"><a href="<?= iacat_e((string) $t['fitxa']) ?>" target="_blank" rel="noopener">Fitxa del TERMCAT ↗</a></dd>
<?php endif; ?>
        </div>
<?php endforeach; ?>
      </dl>
    </section>
<?php endforeach; ?>
    <p class="seccio-intro" id="cap-terme" hidden>Cap terme no coincideix amb la cerca. Prova-ho al <a href="https://www.termcat.cat/ca/cercaterm" target="_blank" rel="noopener">Cercaterm del TERMCAT</a>.</p>
    <p class="seccio-nota">Hi trobes a faltar algun terme o hi veus un error? Escriu-nos a <a href="mailto:pomazona@gmail.com?subject=Glossari%20d%E2%80%99IA.cat">pomazona@gmail.com</a>.</p>
    <script>
      (function () {
        var camp = document.getElementById('cerca-terme');
        var termes = [].slice.call(document.querySelectorAll('.terme'));
        var blocs = [].slice.call(document.querySelectorAll('[data-lletra]'));
        var cap = document.getElementById('cap-terme');
        var mapa = { 'à':'a','á':'a','è':'e','é':'e','í':'i','ï':'i','ò':'o','ó':'o','ú':'u','ü':'u','ç':'c','ñ':'n','·':'' };
        var plega = function (t) { return t.toLowerCase().replace(/[àáèéíïòóúüçñ·]/g, function (c) { return mapa[c]; }).replace(/[^a-z0-9]+/g, '-'); };
        camp.addEventListener('input', function () {
          var q = plega(camp.value).replace(/^-+|-+$/g, '');
          var algun = false;
          termes.forEach(function (t) { var si = !q || t.getAttribute('data-cerca').indexOf(q) !== -1; t.hidden = !si; if (si) algun = true; });
          blocs.forEach(function (b) { b.hidden = !b.querySelector('.terme:not([hidden])'); });
          cap.hidden = algun;
        });
      })();
    </script>
<?php
iacat_peu();
