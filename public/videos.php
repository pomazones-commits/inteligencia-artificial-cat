<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Vídeos (09.10.2026) — /videos
// Dades: public/data/videos.json, GENERAT pel workflow videos.yml
// (automation/scripts/recull-videos.mjs) a partir del RSS públic d'una llista
// tancada de canals oficials (automation/video-channels.json). Res no s'hi
// escriu a mà: per treure un vídeo, «exclou» a video-channels.json.
//
// Privacitat: les miniatures són al nostre servidor (/assets/videos/) i el
// reproductor de youtube-nocookie.com només es carrega quan el lector fa clic
// (public/video.js, el mateix de les notícies). Si una miniatura no s'ha pogut
// baixar, la targeta surt amb un fons llis: mai no es demana a i.ytimg.com.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';

$dades = iacat_dades('videos.json');
$grups = [
    'catala' => ['En català', 'Peces de 3Cat, betevé, À Punt, IB3 i el Govern sobre la intel·ligència artificial.'],
    'empreses' => ['Dels laboratoris i les empreses', 'Presentacions i demostracions dels canals oficials d’OpenAI, Anthropic, Google, Meta, NVIDIA i Microsoft. És la versió de qui ven el producte: per al context, llegeix la notícia.'],
    'ciencia' => ['Ciència i institucions', 'Recerca explicada pels centres i les revistes (BSC, UPC, Nature, Science) i la Comissió Europea.'],
];
$idiomes = ['ca' => 'català', 'en' => 'anglès', 'es' => 'castellà', 'fr' => 'francès', 'de' => 'alemany', 'it' => 'italià', 'pt' => 'portuguès'];
$limitDies = 21;
$ara = time();

$perGrup = [];
$total = 0;
foreach ((array) ($dades['videos'] ?? []) as $v) {
    if (!is_array($v) || !preg_match('/^[A-Za-z0-9_-]{11}$/', (string) ($v['id'] ?? ''))) { continue; }
    $t = strtotime((string) ($v['publicat'] ?? ''));
    if ($t === false || $t < $ara - $limitDies * 86400) { continue; }
    $g = (string) ($v['grup'] ?? '');
    if (!isset($grups[$g])) { continue; }
    $v['_t'] = $t;
    $perGrup[$g][] = $v;
    $total++;
}
foreach ($perGrup as &$llista) { usort($llista, static fn($a, $b) => $b['_t'] <=> $a['_t']); }
unset($llista);

function videos_targeta(array $v, array $idiomes): void
{
    $id = (string) $v['id'];
    $titol = trim((string) ($v['titol'] ?? '')) ?: 'Vídeo de YouTube';
    $idioma = strtolower((string) ($v['idioma'] ?? 'en'));
    $mini = (string) ($v['miniatura'] ?? '');
    if (!preg_match('#^/assets/videos/[A-Za-z0-9_-]{11}\.jpg$#', $mini) || !is_file(__DIR__ . $mini)) { $mini = ''; }
    $canalId = (string) ($v['canalId'] ?? '');
    $canalUrl = preg_match('/^UC[A-Za-z0-9_-]{22}$/', $canalId) ? 'https://www.youtube.com/channel/' . $canalId : '';
    $noticia = preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($v['noticia'] ?? '')));
    $data = iacat_data_llarga(gmdate('Y-m-d', (int) $v['_t']), false);
    ?>
        <li class="vid">
          <div class="iac-video__frame"><button type="button" class="iac-video__play" data-video-id="<?= iacat_e($id) ?>" data-video-lang="<?= iacat_e($idioma) ?>" data-video-title="<?= iacat_e($titol) ?>" aria-label="Reprodueix el vídeo: <?= iacat_e($titol) ?>"><?php if ($mini !== ''): ?><img src="<?= iacat_e($mini) ?>" alt="" loading="lazy" decoding="async" width="320" height="180"><?php endif; ?><span class="iac-video__icon" aria-hidden="true"></span></button></div>
          <p class="vid__meta"><?php if ($canalUrl !== ''): ?><a href="<?= iacat_e($canalUrl) ?>" target="_blank" rel="noopener noreferrer"><?= iacat_e((string) ($v['canal'] ?? '')) ?></a><?php else: ?><?= iacat_e((string) ($v['canal'] ?? '')) ?><?php endif; ?> · <?= iacat_e($data) ?><?php if ($idioma !== 'ca'): ?> · <span class="vid__llengua">en <?= iacat_e($idiomes[$idioma] ?? 'una altra llengua') ?></span><?php endif; ?></p>
          <h3 class="vid__titol"><?= iacat_e($titol) ?></h3>
<?php if ($noticia !== ''): ?>
          <p class="vid__noticia"><span>La notícia</span> <a href="/article.php?slug=<?= iacat_e($noticia) ?>"><?= iacat_e(trim((string) ($v['noticiaTitol'] ?? '')) ?: 'Llegeix-la a IA.cat') ?></a></p>
<?php endif; ?>
<?php if (!empty($v['resum'])): ?>
          <p class="vid__resum"><?= iacat_e((string) $v['resum']) ?></p>
<?php endif; ?>
          <p class="vid__peu"><a href="https://www.youtube.com/watch?v=<?= iacat_e($id) ?>" target="_blank" rel="noopener noreferrer">Obre-ho a YouTube ↗</a></p>
        </li>
<?php
}

$actualitzat = (string) ($dades['actualitzat'] ?? '');
iacat_capcalera([
    'titol' => 'Vídeos sobre intel·ligència artificial',
    'descripcio' => 'Els vídeos sobre IA dels últims dies, recollits dels canals oficials: 3Cat, betevé, À Punt i IB3 en català, els laboratoris que fan els models i els centres de recerca. Amb subtítols en català.',
    'cami' => '/videos',
    'molla' => 'Vídeos',
    'css' => ['/video.css?v=2026100901', '/videos.css?v=2026100901'],
    'jsonld' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'Vídeos sobre intel·ligència artificial', 'url' => IACAT_BASE . '/videos', 'inLanguage' => 'ca'],
]);
?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Vídeos</p><h1 class="editorial-display">La IA, en vídeo. <em>De la font, sense intermediaris.</em></h1>
      <p class="editorial-lede"><?= $total ? $total . ' vídeos dels últims ' . $limitDies . ' dies' : 'Els vídeos dels últims dies' ?>: les peces de les televisions en català, les presentacions dels laboratoris i la recerca explicada pels mateixos científics. Quan un vídeo explica una notícia que hem publicat, hi trobaràs l’enllaç.</p></div>
      <aside><strong>Com l’hem fet</strong>Només hi entren vídeos dels canals oficials d’una llista tancada, i dels canals generalistes només els que parlen d’IA. Es recullen sols diverses vegades al dia. El reproductor de YouTube no es carrega fins que hi fas clic, i els vídeos en una altra llengua s’obren amb els subtítols en català si YouTube els pot traduir.<?php if ($actualitzat !== ''): ?><br><br>Darrera recollida: <?= iacat_e(iacat_data_llarga(substr($actualitzat, 0, 10))) ?>.<?php endif; ?></aside>
    </header>

<?php if ($total): ?>
    <ul class="xips" aria-label="Apartats">
<?php foreach ($grups as $g => [$nom]): if (empty($perGrup[$g])) { continue; } ?>
      <li><a href="#<?= $g ?>"><?= iacat_e($nom) ?> (<?= count($perGrup[$g]) ?>)</a></li>
<?php endforeach; ?>
    </ul>

<?php foreach ($grups as $g => [$nom, $intro]): if (empty($perGrup[$g])) { continue; } ?>
    <section class="seccio-bloc" id="<?= $g ?>" aria-labelledby="t-<?= $g ?>">
      <h2 id="t-<?= $g ?>"><?= iacat_e($nom) ?></h2>
      <p class="seccio-intro"><?= iacat_e($intro) ?></p>
      <ul class="vids">
<?php foreach ($perGrup[$g] as $v) { videos_targeta($v, $idiomes); } ?>
      </ul>
    </section>
<?php endforeach; ?>
<?php else: ?>
    <p class="seccio-nota">Encara no hi ha cap vídeo recollit. La llista s’omple sola des dels canals oficials diverses vegades al dia: torna-hi d’aquí a una estona.</p>
<?php endif; ?>
    <p class="seccio-nota">Si un vídeo no té subtítols en català: ⚙ Configuració › Subtítols › Traducció automàtica › Català. Hi trobes a faltar algun canal oficial o algun vídeo no hi hauria de ser? <a href="mailto:pomazona@gmail.com?subject=V%C3%ADdeos%20IA.cat">Escriu-nos</a>.</p>
  <script defer src="/video.js?v=2026100601a"></script>
<?php
iacat_peu();
