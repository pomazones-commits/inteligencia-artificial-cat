<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Registre de correccions (24.09.2026) — /correccions
//
// Es construeix SOL: busca a l'hemeroteca (edició del dia + arxiu.json +
// archive.json) els paràgrafs que comencen per
//     «Rectificació (<dia> de <mes> de <any>): …»
// que és el format de nota que ja fem servir quan es corregeix una notícia.
// Per a correccions fora del cos d'una notícia (una peça d'autor, una pàgina
// fixa…) hi ha public/data/correccions.json, amb entrades
//     {"data":"AAAA-MM-DD","titol":"…","url":"/…","text":"…"}
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$mesos = ['gener' => 1, 'febrer' => 2, 'març' => 3, 'abril' => 4, 'maig' => 5, 'juny' => 6, 'juliol' => 7, 'agost' => 8, 'setembre' => 9, 'octubre' => 10, 'novembre' => 11, 'desembre' => 12];
$patro = '/^Rectificació \((\d{1,2}) d(?:e |’|\')(\p{L}+) de (\d{4})\):\s*(.+)$/um';

$entrades = [];
$vistos = [];
$majuscula = static fn(string $t): string => mb_strtoupper(mb_substr($t, 0, 1)) . mb_substr($t, 1);
$revisa = static function (array $item) use (&$entrades, &$vistos, $patro, $mesos, $majuscula): void {
    $slug = (string) ($item['slug'] ?? '');
    if ($slug === '' || isset($vistos[$slug])) { return; }
    $vistos[$slug] = true;
    $cos = (string) ($item['body'] ?? '');
    if (strpos($cos, 'Rectificació (') === false) { return; }
    if (!preg_match_all($patro, $cos, $m, PREG_SET_ORDER)) { return; }
    foreach ($m as $r) {
        $mes = $mesos[mb_strtolower($r[2])] ?? 0;
        $iso = $mes ? sprintf('%04d-%02d-%02d', (int) $r[3], $mes, (int) $r[1]) : '';
        $entrades[] = ['data' => $iso, 'titol' => (string) ($item['title'] ?? ''), 'url' => '/article.php?slug=' . rawurlencode($slug), 'text' => $majuscula(trim($r[4])), 'tipus' => 'Notícia'];
    }
};
foreach ((array) (iacat_dades('articles.json')['items'] ?? []) as $item) { if (is_array($item)) { $revisa($item); } }
foreach ((array) (iacat_dades('arxiu.json')['editions'] ?? []) as $ed) {
    foreach ((array) ($ed['items'] ?? []) as $item) { if (is_array($item)) { $revisa($item); } }
}
foreach (iacat_dades('archive.json') as $item) { if (is_array($item)) { $revisa($item); } }
foreach ((array) (iacat_dades('correccions.json')['entrades'] ?? []) as $e) {
    if (is_array($e) && !empty($e['titol']) && !empty($e['text'])) {
        $entrades[] = ['data' => (string) ($e['data'] ?? ''), 'titol' => (string) $e['titol'], 'url' => (string) ($e['url'] ?? ''), 'text' => (string) $e['text'], 'tipus' => (string) ($e['tipus'] ?? 'Peça')];
    }
}
usort($entrades, static fn(array $a, array $b): int => strcmp($b['data'], $a['data']));

iacat_capcalera([
    'titol' => 'Correccions',
    'descripcio' => 'Totes les correccions i rectificacions publicades a intel·ligènciaartificial.cat, amb la data i el motiu.',
    'cami' => '/correccions',
    'molla' => 'Correccions',
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'WebPage', 'name' => 'Correccions', 'url' => IACAT_BASE . '/correccions', 'inLanguage' => 'ca',
        'publisher' => ['@type' => 'NewsMediaOrganization', 'name' => 'intel·ligènciaartificial.cat', 'url' => IACAT_BASE . '/', 'correctionsPolicy' => IACAT_BASE . '/correccions']],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Transparència</p><h1 class="editorial-display">Correccions, <em>a la vista.</em></h1>
      <p class="editorial-lede">Quan una dada és incorrecta o queda superada, la corregim a la mateixa peça, hi afegim una nota que explica què ha canviat i la recollim aquí.</p></div>
      <aside><strong>Has vist un error?</strong>Escriu-nos amb l’enllaç i el que cal corregir: <a href="mailto:pomazona@gmail.com?subject=Correcci%C3%B3%20a%20IA.cat">pomazona@gmail.com</a>.</aside>
    </header>

    <section class="seccio-bloc" aria-labelledby="registre-titol">
      <h2 id="registre-titol"><?= count($entrades) ?> <?= count($entrades) === 1 ? 'correcció' : 'correccions' ?></h2>
      <p class="seccio-intro">De la més recent a la més antiga. No hi comptem els retocs d’estil ni les faltes d’ortografia.</p>
<?php if (!$entrades): ?>
      <p>Encara no hi ha cap correcció registrada.</p>
<?php endif; ?>
<?php foreach ($entrades as $e): ?>
      <article class="correccio">
        <span class="fitxa__meta"><?= iacat_e($e['tipus']) ?> · corregida el <?= iacat_e(iacat_data_llarga($e['data'])) ?></span>
        <h3><?php if ($e['url'] !== ''): ?><a href="<?= iacat_e($e['url']) ?>"><?= iacat_e($e['titol']) ?></a><?php else: ?><?= iacat_e($e['titol']) ?><?php endif; ?></h3>
        <blockquote><?= iacat_e($e['text']) ?></blockquote>
      </article>
<?php endforeach; ?>
      <p class="seccio-nota">Com treballem: <a href="/redaccio.html">Sobre IA.cat</a>. Les peces signades de «La tribuna» i «Estudis» es corregeixen o es retiren a petició de l’autoria.</p>
    </section>
<?php
iacat_peu();
