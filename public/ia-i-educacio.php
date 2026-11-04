<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// La IA a l'escola (04.11.2026) — /ia-i-educacio
// Pàgina de referència (no caduca) sobre què diuen les normes i les orientacions
// oficials a Catalunya. Motiu: a Search Console (agost-octubre 2026) les peces
// sobre la IA a les escoles són les que més clics treuen del web.
// Textos: aquí mateix, comprovats el 04.11.2026 amb la font enllaçada al costat.
// ⚠️ Revisar quan Educació publiqui l'actualització del document d'orientacions
// (prevista per al desembre del 2026 segons projectes.xtec.cat/ia) i quan surti
// l'avantprojecte de llei de benestar digital (previst per al març del 2027).
// Notícies: surten soles de l'hemeroteca amb els patrons de $patrons.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

const EDU_REVISAT = '4 de novembre de 2026';

// --- Notícies de l'hemeroteca sobre la IA i l'educació ----------------------
$patrons = [
    '/\b(escola|escoles|escolar|escolars|aula|aules|alumn\w*|docent\w*|professorat|ensenyament|educaci[oó]|deures|treballs? de recerca|batxillerat)\b/iu',
];
$noticies = [];
$vistos = [];
$afegeix = static function (array $item, string $iso) use (&$noticies, &$vistos, $patrons): void {
    $slug = (string) ($item['slug'] ?? '');
    if ($slug === '' || isset($vistos[$slug])) { return; }
    $cat = (string) ($item['category'] ?? '');
    $text = ($item['title'] ?? '') . ' ' . ($item['excerpt'] ?? '');
    $encaixa = stripos($cat, 'EDUCACI') !== false;
    if (!$encaixa) {
        foreach ($patrons as $p) { if (preg_match($p, (string) ($item['title'] ?? ''))) { $encaixa = true; break; } }
    }
    if ($encaixa && preg_match('/\b(atac|tiroteig|arma|armes)\b/iu', $text)) { $encaixa = false; }
    if ($encaixa) { $vistos[$slug] = true; $noticies[] = $item + ['_iso' => $iso]; }
};
$articles = iacat_dades('articles.json');
$isoAvui = substr((string) ($articles['updatedAt'] ?? ''), 0, 10);
foreach ((array) ($articles['items'] ?? []) as $item) { if (is_array($item)) { $afegeix($item, $isoAvui); } }
foreach ((array) (iacat_dades('arxiu.json')['editions'] ?? []) as $ed) {
    $iso = iacat_data_iso((string) ($ed['date'] ?? ''));
    foreach ((array) ($ed['items'] ?? []) as $item) { if (is_array($item)) { $afegeix($item, $iso); } }
}
usort($noticies, static fn(array $a, array $b): int => strcmp($b['_iso'], $a['_iso']));
$noticies = array_slice($noticies, 0, 12);

// --- Preguntes freqüents (també van al JSON-LD FAQPage) ---------------------
$preguntes = [
    ['Els alumnes de menys de 14 anys poden fer servir ChatGPT o altres xatbots a l’escola?',
     'Segons les orientacions del Departament d’Educació, l’alumnat de menys de 14 anys no hauria de fer servir de manera autònoma les eines d’IA generativa d’ús general. Sí que es pot treballar la IA a classe amb el docent, per entendre com funciona i quins límits té.'],
    ['I a partir dels 14 anys?',
     'Entre els 14 i els 18 anys l’ús es pot permetre amb l’autorització del docent o del centre, i les orientacions de seguretat recomanen també l’autorització de les famílies. En tots els casos, l’alumne ha de dir quan ha fet servir la IA i per a què.'],
    ['Es pot fer servir la IA en el treball de recerca de batxillerat?',
     'Sí, però s’ha de documentar: cal explicar com i quan s’ha fet servir i fer-la constar a la bibliografia. Les aportacions de la IA s’han de revisar, contrastar i reformular amb criteri propi, i la defensa oral serveix per comprovar que el treball és de l’alumne.'],
    ['La Generalitat prohibirà la IA a les escoles?',
     'De moment, no hi ha cap llei aprovada. El Govern ha anunciat una llei de benestar digital que vol limitar les pantalles, les xarxes socials i la IA entre els menors, amb l’avantprojecte previst per al març del 2027. Mentrestant, valen les orientacions del Departament d’Educació.'],
    ['Quines dades dels alumnes es poden posar en una eina d’IA?',
     'Les orientacions demanen no introduir mai dades personals d’alumnes, famílies o docents en eines d’IA generativa i anonimitzar qualsevol document abans de fer-lo servir. A partir del 2 d’agost de 2026, el Reglament europeu d’IA considera d’alt risc els sistemes que avaluen l’alumnat o en decideixen l’admissió.'],
];

// --- Documents oficials -----------------------------------------------------
$documents = [
    ['La intel·ligència artificial en l’educació. Orientacions i recomanacions per al seu ús als centres', 'Departament d’Educació · febrer del 2024', 'El document de referència: què és la IA, com acompanyar l’alumnat, com pot ajudar el professorat, límits i aspectes clau. Té una actualització prevista per al desembre del 2026.', '/dossiers/ia-educacio.pdf'],
    ['Portal «Intel·ligència artificial en educació» (XTEC)', 'Departament d’Educació', 'Recull oficial de documents, formació i orientacions de seguretat i privacitat per als centres.', 'https://projectes.xtec.cat/ia/'],
    ['Intel·ligència artificial i educació: marc normatiu, documents de referència i reptes', 'Inspecció d’Educació · juny del 2025', 'Resum del Reglament europeu d’IA aplicat a l’escola i dels marcs de la UNESCO, la Comissió Europea i l’OCDE.', 'https://projectes.xtec.cat/ia/wp-content/uploads/usu2387/2025/07/Intelligencia-Artificial-i-Educacio-Inspeccio.pdf'],
    ['Criteris d’ús de la IA generativa a l’Administració de la Generalitat', 'Comissió d’Intel·ligència Artificial · abril del 2025', 'Què pot fer i què no un empleat públic (també els docents) amb la IA generativa, i com tractar la informació i els resultats.', '/dossiers/criteris-ia-generativa-2025.pdf'],
];

$faq = ['@type' => 'FAQPage', 'mainEntity' => array_map(static fn(array $p): array => [
    '@type' => 'Question', 'name' => $p[0], 'acceptedAnswer' => ['@type' => 'Answer', 'text' => $p[1]],
], $preguntes)];

iacat_capcalera([
    'titol' => 'La IA a l’escola a Catalunya: què es pot fer i què no',
    'descripcio' => 'Què diuen les normes i les orientacions d’Educació sobre la intel·ligència artificial a l’escola: edats, autorització, treballs de recerca, dades dels alumnes i la futura llei de benestar digital.',
    'cami' => '/ia-i-educacio',
    'molla' => 'La IA a l’escola',
    'jsonld' => ['@context' => 'https://schema.org', '@graph' => [
        ['@type' => 'WebPage', 'name' => 'La IA a l’escola a Catalunya', 'url' => IACAT_BASE . '/ia-i-educacio', 'inLanguage' => 'ca', 'dateModified' => '2026-11-04'],
        $faq,
    ]],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Guia</p><h1 class="editorial-display">La IA <em>a l’escola.</em></h1>
      <p class="editorial-lede">Què poden fer els alumnes amb la intel·ligència artificial, què ha de vigilar el professorat i què canviarà amb la llei que prepara el Govern. Tot el que diuen avui les normes i les orientacions oficials a Catalunya, explicat en planer.</p></div>
      <aside><strong>Fonts oficials</strong>Cada punt porta la font enllaçada. Última revisió: <?= iacat_e(EDU_REVISAT) ?>. Les orientacions d’Educació s’actualitzaran al desembre del 2026.</aside>
    </header>

    <section class="seccio-bloc" aria-labelledby="regles-titol">
      <h2 id="regles-titol">Les regles d’avui, en sis punts</h2>
      <ul class="seccio-grid">
        <li class="fitxa"><span class="fitxa__meta">Menys de 14 anys</span><h3>Sense ús autònom</h3><p>L’alumnat de menys de 14 anys no hauria de fer servir pel seu compte les eines d’IA generativa d’ús general (xatbots com ChatGPT, Gemini o Claude). Es pot treballar a classe, guiat pel docent. <a href="https://projectes.xtec.cat/ia/" target="_blank" rel="noopener">XTEC ↗</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">De 14 a 18 anys</span><h3>Amb autorització</h3><p>L’ús es pot permetre amb l’autorització del docent o del centre, i les orientacions de seguretat recomanen també la de les famílies. <a href="https://projectes.xtec.cat/ia/" target="_blank" rel="noopener">XTEC ↗</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">Sempre</span><h3>Dir-ho i comprovar-ho</h3><p>Qui fa servir la IA en un treball ho ha de declarar. Les aportacions de la IA s’han de revisar, contrastar i reformular amb criteri propi. <a href="https://elmon.cat/societat/educacio/regles-govern-cataluya-ia-escoles-1183511/" target="_blank" rel="noopener">El Món, 31.08.2026 ↗</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">Treball de recerca</span><h3>Es pot, però documentat</h3><p>Al batxillerat, la IA s’ha de fer constar a la bibliografia, explicant com i quan s’ha fet servir. La defensa oral serveix per verificar l’autoria i la comprensió. <a href="https://elmon.cat/societat/educacio/regles-govern-cataluya-ia-escoles-1183511/" target="_blank" rel="noopener">El Món ↗</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">Dades</span><h3>Cap dada personal</h3><p>No s’han d’introduir dades d’alumnes, famílies o docents en eines d’IA generativa, i qualsevol document s’ha d’anonimitzar abans. <a href="https://projectes.xtec.cat/ia/" target="_blank" rel="noopener">XTEC ↗</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">Centres</span><h3>Un grup de treball a cada centre</h3><p>Educació recomana que cada centre creï un grup intern per decidir com s’incorpora la IA a l’aula, i preveu formació per al professorat. <a href="https://elmon.cat/societat/educacio/regles-govern-cataluya-ia-escoles-1183511/" target="_blank" rel="noopener">El Món ↗</a></p></li>
      </ul>
      <p class="seccio-intro">Són <strong>orientacions</strong>, no una llei: el mateix document d’Educació del 2024 diu que vol «donar orientacions sense establir veritats absolutes ni indicacions que calgui seguir obligatòriament». Cada centre les aplica en el seu projecte educatiu.</p>
    </section>

    <section class="seccio-bloc" aria-labelledby="canvis-titol">
      <h2 id="canvis-titol">Què està a punt de canviar</h2>
      <ul class="seccio-grid">
        <li class="fitxa"><span class="fitxa__meta">Govern · llei de benestar digital</span><h3>Limitar pantalles, xarxes i IA als menors</h3><p>El Govern ha anunciat que vol que els alumnes de menys de 14 anys no facin servir la IA a l’àmbit educatiu. El calendari: el memoràndum al novembre del 2026 i l’avantprojecte de llei al març del 2027. De moment és una intenció, no una norma. <a href="/article.php?slug=govern-veto-ia-menors-14-anys-escola-llei">La notícia →</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">Educació · desembre del 2026</span><h3>Orientacions noves</h3><p>El portal oficial preveu actualitzar al desembre el document «La intel·ligència artificial en l’educació», del febrer del 2024. <a href="https://projectes.xtec.cat/ia/" target="_blank" rel="noopener">XTEC ↗</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">Unió Europea · des del 2 d’agost de 2026</span><h3>IA d’alt risc a l’escola</h3><p>El Reglament europeu d’IA considera d’alt risc els sistemes que decideixen l’admissió als centres, avaluen els aprenentatges o vigilen els alumnes durant els exàmens. Han de complir requisits estrictes de transparència i supervisió humana. <a href="https://projectes.xtec.cat/ia/wp-content/uploads/usu2387/2025/07/Intelligencia-Artificial-i-Educacio-Inspeccio.pdf" target="_blank" rel="noopener">Inspecció d’Educació ↗</a></p></li>
      </ul>
    </section>

    <section class="seccio-bloc" aria-labelledby="preguntes-titol">
      <h2 id="preguntes-titol">Preguntes que ens fan</h2>
      <div class="peces-llista">
<?php foreach ($preguntes as [$p, $r]): ?>
        <details class="fitxa"><summary><strong><?= iacat_e($p) ?></strong></summary><p><?= iacat_e($r) ?></p></details>
<?php endforeach; ?>
      </div>
    </section>

    <section class="seccio-bloc" aria-labelledby="docs-titol">
      <h2 id="docs-titol">Els documents oficials</h2>
      <ul class="seccio-grid">
<?php foreach ($documents as [$nom, $qui, $que, $url]): $fora = str_starts_with($url, 'http'); ?>
        <li class="fitxa"><span class="fitxa__meta"><?= iacat_e($qui) ?></span><h3><a href="<?= iacat_e($url) ?>"<?= $fora ? ' target="_blank" rel="noopener"' : '' ?>><?= iacat_e($nom) ?> <?= $fora ? '↗' : '(PDF)' ?></a></h3><p><?= iacat_e($que) ?></p></li>
<?php endforeach; ?>
      </ul>
    </section>

<?php if ($noticies): ?>
    <section class="seccio-bloc" aria-labelledby="noticies-titol">
      <h2 id="noticies-titol">Què n’hem publicat</h2>
      <p class="seccio-intro">Les notícies de l’hemeroteca sobre la IA i l’educació, de la més recent a la més antiga.</p>
      <ul class="peces-llista">
<?php foreach ($noticies as $n): ?>
        <li><span class="fitxa__meta"><?= iacat_e((string) ($n['category'] ?? '')) ?><br><?= iacat_e(iacat_data_llarga($n['_iso'])) ?></span><div><h3><a href="/article.php?slug=<?= rawurlencode((string) $n['slug']) ?>"><?= iacat_e((string) $n['title']) ?></a></h3><p><?= iacat_e((string) ($n['excerpt'] ?? '')) ?></p></div></li>
<?php endforeach; ?>
      </ul>
    </section>
<?php endif; ?>
    <p class="seccio-nota">Per entendre els termes, el <a href="/glossari">glossari d’IA</a>. Per fer servir la IA amb criteri, les <a href="/eines.html">guies pràctiques</a>. Per formar-te, l’<a href="/formacio">oferta de formació en IA</a>. I les veus signades sobre el tema, a <a href="/tema/societat-cultura-i-educacio">Societat, cultura i educació</a>.</p>
<?php
iacat_peu();
