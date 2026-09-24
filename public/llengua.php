<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// La IA i la llengua catalana (24.09.2026) — /llengua
// Textos i xifres: aquí mateix (comprovats el 24.09.2026, amb la font al costat).
// Notícies: surten soles de l'hemeroteca (titular + entradeta) amb els patrons
// de $patrons. Si una xifra es fa vella, canvia-la aquí i actualitza la data.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

// --- Notícies de l'hemeroteca sobre la IA i el català ------------------------
$patrons = [
    '/(en català|llengua catalana|\b(el|del|al) català\b|Softcatalà|TERMCAT|Common Voice|Plataforma per la Llengua|catalanoparlant)/iu',
    '/\b(Aina|AINA|ALIA|Salamandra)\b/u',
];
$noticies = [];
$vistos = [];
$afegeix = static function (array $item, string $iso) use (&$noticies, &$vistos, $patrons): void {
    $slug = (string) ($item['slug'] ?? '');
    if ($slug === '' || isset($vistos[$slug])) { return; }
    $text = ($item['title'] ?? '') . ' ' . ($item['excerpt'] ?? '');
    foreach ($patrons as $p) {
        if (preg_match($p, $text)) { $vistos[$slug] = true; $noticies[] = $item + ['_iso' => $iso]; return; }
    }
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

// --- Recursos ----------------------------------------------------------------
$recursos = [
    ['Traductor de Softcatalà', 'Tradueix entre el català i una quinzena de llengües amb motors neuronals i de regles, sense guardar els textos.', 'https://www.softcatala.org/traductor/'],
    ['Transcripció de Softcatalà', 'Passa àudio o vídeo en català a text o subtítols; esborra els fitxers al cap de 72 hores.', 'https://www.softcatala.org/transcripcio/'],
    ['Doblatge automàtic de Softcatalà', 'Dobla al català vídeos en anglès o castellà amb IA. Està en fase de proves.', 'https://www.softcatala.org/doblatge/'],
    ['IA local de Softcatalà', 'Guies per fer funcionar models d’IA al propi ordinador, sense enviar les dades a cap empresa.', 'https://www.softcatala.org/ia-local/'],
    ['Models en català (Softcatalà)', 'Quins models de text i de transcripció funcionen millor en català segons la memòria de l’ordinador.', 'https://www.softcatala.org/ia-local/models-en-catala/'],
    ['Aina Kit', 'Portal amb els models, corpus, eines i demostradors del Projecte Aina per crear aplicacions en català.', 'https://langtech-bsc.gitbook.io/aina-kit'],
    ['Projecte Aina a Hugging Face', 'Descàrrega de traductors, models de veu i conjunts de dades en català.', 'https://huggingface.co/projecte-aina'],
    ['Models del BSC (Salamandra i ALIA)', 'Models de llenguatge oberts del Barcelona Supercomputing Center, amb llicència Apache 2.0.', 'https://huggingface.co/BSC-LT'],
    ['Veu sintètica Matxa', 'Prova de síntesi de veu en català amb accent central, nord-occidental, balear o valencià.', 'https://huggingface.co/spaces/projecte-aina/matxa-alvocat-tts-ca'],
    ['Avaluació de Softcatalà (ai-eval-catalan)', 'Codi obert i proves per mesurar com de bé fan servir el català els models de text i de veu.', 'https://github.com/Softcatala/ai-eval-catalan'],
    ['Terminologia de la IA (TERMCAT)', 'Diccionari en línia amb 140 conceptes bàsics d’IA en català, amb definicions i equivalents.', 'https://www.termcat.cat/ca/diccionaris-en-linia/347'],
    ['Common Voice en català', 'Dona la teva veu llegint frases, o valida gravacions d’altres, per crear dades obertes de veu en català.', 'https://commonvoice.mozilla.org/ca'],
];

iacat_capcalera([
    'titol' => 'La IA i la llengua catalana',
    'descripcio' => 'Com és present el català a la intel·ligència artificial: el Projecte Aina, els models oberts, les eines de Softcatalà, les dades de veu i on fer servir la IA en català.',
    'cami' => '/llengua',
    'molla' => 'La IA i el català',
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'WebPage', 'name' => 'La IA i la llengua catalana', 'url' => IACAT_BASE . '/llengua', 'inLanguage' => 'ca', 'about' => ['@type' => 'Language', 'name' => 'català', 'alternateName' => 'ca']],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Llengua</p><h1 class="editorial-display">La IA, <em>en català.</em></h1>
      <p class="editorial-lede">Una llengua que no hi és a les màquines queda fora de la vida digital. Aquí hi ha què s’ha fet perquè el català hi sigui, com funciona avui la IA en català i quines eines pots fer servir.</p></div>
      <aside><strong>Dades comprovades</strong>Totes les xifres porten la font enllaçada. Última revisió: 24 de setembre de 2026.</aside>
    </header>

    <section class="seccio-bloc" aria-labelledby="estat-titol">
      <h2 id="estat-titol">On som</h2>
      <ul class="seccio-grid">
        <li class="fitxa"><span class="fitxa__meta">Projecte Aina · des del 2020</span><h3>Una infraestructura pública per al català</h3><p>Impulsat per la Generalitat i executat pel Barcelona Supercomputing Center, ha publicat models, traductors, veus sintètiques i corpus oberts. A Hugging Face n’hi ha 71 models i 71 conjunts de dades.</p><p class="fitxa__peu"><a href="https://huggingface.co/projecte-aina" target="_blank" rel="noopener">Font: Hugging Face (24.09.2026)</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">Salamandra i ALIA · BSC</span><h3>Models de llenguatge oberts</h3><p>Salamandra s’ha entrenat des de zero amb 35 llengües europees i codi (el català n’és l’1,97% del corpus). ALIA, presentada el gener del 2025, se’n deriva i treballa en castellà, català, gallec i basc. Totes dues amb llicència Apache 2.0.</p><p class="fitxa__peu"><a href="https://huggingface.co/BSC-LT/salamandra-7b" target="_blank" rel="noopener">Font: fitxa del model</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">Veu · Common Voice</span><h3>Segona llengua del món en hores de veu</h3><p>El català té 3.006 hores de veu validades i 37.085 participants a Common Voice, el projecte de dades obertes de Mozilla. Només el paixtu en té més.</p><p class="fitxa__peu"><a href="https://commonvoice.mozilla.org/ca" target="_blank" rel="noopener">Font: Common Voice (24.09.2026)</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">Qualitat · Softcatalà</span><h3>Com escriuen els models en català</h3><p>Softcatalà ha avaluat 19 models en gramàtica, comprensió, resum, traducció i seguiment d’instruccions. Els grans models comercials funcionen prou bé en català; entre els de pesos oberts, recomana Gemma 3.</p><p class="fitxa__peu"><a href="https://www.3cat.cat/3catinfo/quina-es-la-millor-ia-en-catala-i-com-tenir-ne-una-de-privada-a-casa/noticia/3417589/" target="_blank" rel="noopener">Font: 3Cat (06.07.2026)</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">Assistents · setembre del 2026</span><h3>Desigual segons l’eina</h3><p>ChatGPT i Copilot per a Microsoft 365 tenen la interfície en català, i Gemini parla en català a l’app d’Android des del febrer del 2026. Claude entén i escriu en català, però no el té entre les llengües de la interfície; la nova Siri tampoc no l’inclou.</p><p class="fitxa__peu"><a href="https://support.claude.com/en/articles/10769299-how-to-use-claude-in-your-preferred-language" target="_blank" rel="noopener">Font: Anthropic</a> · <a href="https://www.vilaweb.cat/noticies/aplicacio-gemini-google-android-catala/" target="_blank" rel="noopener">VilaWeb</a></p></li>
        <li class="fitxa"><span class="fitxa__meta">Terminologia · TERMCAT</span><h3>Les paraules, fixades</h3><p>El novembre del 2025 el TERMCAT va publicar la «Terminologia de la intel·ligència artificial», amb 140 conceptes bàsics, elaborada amb el CIDAI i l’IIIA-CSIC. El nostre <a href="/glossari">glossari</a> en fa servir les formes.</p><p class="fitxa__peu"><a href="https://www.termcat.cat/en/node/5616" target="_blank" rel="noopener">Font: TERMCAT</a></p></li>
      </ul>
    </section>

    <section class="seccio-bloc" aria-labelledby="eines-titol">
      <h2 id="eines-titol">Eines per fer servir la IA en català</h2>
      <p class="seccio-intro">Totes són gratuïtes, i la majoria, de codi obert. Abans de pujar-hi documents personals, llegeix les condicions de cada servei.</p>
      <ul class="seccio-grid">
<?php foreach ($recursos as [$nom, $que, $url]): ?>
        <li class="fitxa"><h3><a href="<?= iacat_e($url) ?>" target="_blank" rel="noopener"><?= iacat_e($nom) ?> ↗</a></h3><p><?= iacat_e($que) ?></p></li>
<?php endforeach; ?>
      </ul>
    </section>

<?php if ($noticies): ?>
    <section class="seccio-bloc" aria-labelledby="noticies-titol">
      <h2 id="noticies-titol">Què n’hem publicat</h2>
      <p class="seccio-intro">Les notícies de l’hemeroteca sobre la IA i la llengua catalana, de la més recent a la més antiga.</p>
      <ul class="peces-llista">
<?php foreach ($noticies as $n): ?>
        <li><span class="fitxa__meta"><?= iacat_e((string) ($n['category'] ?? '')) ?><br><?= iacat_e(iacat_data_llarga($n['_iso'])) ?></span><div><h3><a href="/article.php?slug=<?= rawurlencode((string) $n['slug']) ?>"><?= iacat_e((string) $n['title']) ?></a></h3><p><?= iacat_e((string) ($n['excerpt'] ?? '')) ?></p></div></li>
<?php endforeach; ?>
      </ul>
    </section>
<?php endif; ?>
    <p class="seccio-nota">Vols conèixer qui treballa en tecnologies del llenguatge? Mira l’<a href="/ecosistema">ecosistema català de la IA</a>. I per entendre els termes, el <a href="/glossari">glossari</a>.</p>
<?php
iacat_peu();
