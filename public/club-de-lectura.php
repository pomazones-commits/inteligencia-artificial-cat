<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Club de lectura sobre IA (08.10.2026) — /club-de-lectura i /club-de-lectura/<id>
//
// Llibres: data/club-lectura.json (manual). Cada fitxa s'obre amb «Per obrir el
// debat» (una opinió breu d'en Rafael, amb la ressenya sencera plegada) i una
// pregunta per als lectors; a sota, les opinions aprovades i el formulari.
// Les opinions passen SEMPRE per moderació prèvia: api.php?action=opinio les
// desa com a pendents i club-modera.php les publica. Vegeu inc/club.php.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/plantilla.php';
require_once __DIR__ . '/inc/club.php';

$dades = club_dades();
$llibres = (array) ($dades['llibres'] ?? []);
$temes = (array) ($dades['temes'] ?? []);
$ressenyador = (array) ($dades['ressenyador'] ?? ['nom' => 'Rafael Julivert', 'rol' => 'editor d’IA.cat']);
$idDemanat = (string) ($_GET['llibre'] ?? '');
$CSS = ['/club.css?v=2026100801'];

if ($idDemanat !== '') {
    $b = club_llibre($idDemanat);
    if (!$b) {
        http_response_code(404);
        iacat_capcalera(['titol' => 'Llibre no trobat', 'descripcio' => 'Aquest llibre no és al club de lectura.', 'cami' => CLUB_CAMI, 'robots' => 'noindex', 'molla' => 'Llibre no trobat', 'mollaPare' => ['Club de lectura', CLUB_CAMI], 'css' => $CSS]);
        echo '<p class="seccio-nota">Aquest llibre no és al club. <a href="' . CLUB_CAMI . '">Tornar al club de lectura</a>.</p>';
        iacat_peu();
        exit;
    }
    club_fitxa($b, $temes, $llibres, $ressenyador, $CSS);
    exit;
}
club_index($dades, $llibres, $temes, $CSS);
exit;

// ---------------------------------------------------------------------------

function club_index(array $dades, array $llibres, array $temes, array $css): void
{
    $mes = (array) ($dades['llibre_del_mes'] ?? []);
    $delMes = club_llibre((string) ($mes['id'] ?? ''));
    $perTema = [];
    foreach ($llibres as $b) { $perTema[(string) ($b['tema'] ?? '')][] = $b; }
    $totalOpinions = 0;
    foreach ($llibres as $b) { $totalOpinions += club_resum_lectors((string) $b['id'])[0]; }

    $llista = [];
    foreach ($llibres as $i => $b) {
        [$t] = club_titol_parts((string) $b['titol']);
        $llista[] = ['@type' => 'ListItem', 'position' => $i + 1, 'url' => IACAT_BASE . CLUB_CAMI . '/' . $b['id'], 'name' => $t];
    }
    iacat_capcalera([
        'titol' => 'Club de lectura sobre IA',
        'descripcio' => count($llibres) . ' llibres sobre intel·ligència artificial ordenats per temes, amb una opinió per obrir el debat i les opinions dels lectors. Cada mes, un llibre destacat.',
        'cami' => CLUB_CAMI,
        'molla' => 'Club de lectura',
        'css' => $css,
        'jsonld' => ['@context' => 'https://schema.org', '@type' => 'CollectionPage', 'name' => 'Club de lectura sobre IA', 'url' => IACAT_BASE . CLUB_CAMI, 'inLanguage' => 'ca',
            'mainEntity' => ['@type' => 'ItemList', 'numberOfItems' => count($llibres), 'itemListElement' => $llista]],
    ]);
    ?>
    <header class="seccio-hero">
      <div><p class="editorial-kicker">Club de lectura</p><h1 class="editorial-display">Llegim la IA <em>i en parlem.</em></h1>
      <p class="editorial-lede"><?= count($llibres) ?> llibres sobre intel·ligència artificial, ordenats per temes. Cada fitxa s’obre amb una primera opinió per encetar la conversa i una pregunta. La resta la poseu vosaltres.</p></div>
      <aside><strong>Com funciona</strong>Tria un llibre que hagis llegit i deixa-hi la teva opinió: no cal registrar-se, només un nom. Totes les opinions es llegeixen abans de publicar-les. Hi trobes a faltar algun llibre? <a href="mailto:pomazona@gmail.com?subject=Club%20de%20lectura%20IA.cat">Proposa’ns-el</a>.<?php if ($totalOpinions): ?><br><br><?= $totalOpinions ?> <?= $totalOpinions === 1 ? 'opinió publicada' : 'opinions publicades' ?> fins ara.<?php endif; ?></aside>
    </header>

<?php if ($delMes): [$tm, $sm] = club_titol_parts((string) $delMes['titol']); ?>
    <section class="club-mes" aria-labelledby="club-mes-titol">
      <a class="club-mes__coberta" href="<?= CLUB_CAMI . '/' . iacat_e((string) $delMes['id']) ?>" tabindex="-1" aria-hidden="true"><?= club_portada_html($delMes, 'club-portada', false) ?></a>
      <div class="club-mes__text">
        <p class="club-etiqueta">El llibre del mes · <?= iacat_e(club_nom_mes((string) ($mes['mes'] ?? ''))) ?></p>
        <h2 id="club-mes-titol"><a href="<?= CLUB_CAMI . '/' . iacat_e((string) $delMes['id']) ?>"><?= iacat_e($tm) ?></a></h2>
        <p class="club-autor"><?= iacat_e((string) $delMes['autor']) ?></p>
<?php if (!empty($mes['motiu'])): ?>
        <p><?= iacat_e((string) $mes['motiu']) ?></p>
<?php endif; ?>
        <p class="club-pregunta-curta"><?= iacat_e((string) $delMes['pregunta']) ?></p>
        <a class="club-boto" href="<?= CLUB_CAMI . '/' . iacat_e((string) $delMes['id']) ?>#opina">Dona la teva opinió</a>
      </div>
    </section>
<?php endif; ?>

    <ul class="xips" aria-label="Temes">
<?php foreach ($temes as $t): if (empty($perTema[$t['id']])) { continue; } ?>
      <li><a href="#<?= iacat_e((string) $t['id']) ?>"><?= iacat_e((string) $t['nom']) ?> (<?= count($perTema[$t['id']]) ?>)</a></li>
<?php endforeach; ?>
    </ul>

<?php foreach ($temes as $t): if (empty($perTema[$t['id']])) { continue; } ?>
    <section class="seccio-bloc" id="<?= iacat_e((string) $t['id']) ?>" aria-labelledby="tema-<?= iacat_e((string) $t['id']) ?>">
      <h2 id="tema-<?= iacat_e((string) $t['id']) ?>"><?= iacat_e((string) $t['nom']) ?></h2>
      <p class="seccio-intro"><?= iacat_e((string) ($t['descripcio'] ?? '')) ?></p>
      <ul class="club-graella">
<?php foreach ($perTema[$t['id']] as $b): [$tt] = club_titol_parts((string) $b['titol']); [$n, $mitjana] = club_resum_lectors((string) $b['id']); ?>
        <li class="club-llibre">
          <a href="<?= CLUB_CAMI . '/' . iacat_e((string) $b['id']) ?>">
            <?= club_portada_html($b) ?>
            <span class="club-llibre__titol"><?= iacat_e($tt) ?></span>
            <span class="club-llibre__autor"><?= iacat_e((string) $b['autor']) ?></span>
            <span class="club-llibre__peu"><?= $n ? $n . ' ' . ($n === 1 ? 'opinió' : 'opinions') : 'Encara sense opinions' ?><?= $mitjana !== null ? ' · ' . club_estrelles($mitjana, 'Valoració dels lectors') : '' ?></span>
          </a>
        </li>
<?php endforeach; ?>
      </ul>
    </section>
<?php endforeach; ?>
    <p class="seccio-nota">Les cobertes es reprodueixen per identificar cada llibre; els drets són de les editorials. IA.cat no cobra res per cap recomanació ni fa servir enllaços d’afiliat.</p>
<?php
    iacat_peu();
}

function club_nom_mes(string $am): string
{
    if (!preg_match('/^(\d{4})-(\d{2})$/', $am, $m)) { return ''; }
    $mesos = ['', 'gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
    return $mesos[(int) $m[2]] . ' de ' . $m[1];
}

function club_fitxa(array $b, array $temes, array $llibres, array $ressenyador, array $css): void
{
    [$titol, $subtitol] = club_titol_parts((string) $b['titol']);
    $tema = club_tema((string) $b['tema']);
    $ops = club_opinions_aprovades((string) $b['id']);
    [$n, $mitjana, $nNotes] = club_resum_lectors((string) $b['id']);
    $cami = CLUB_CAMI . '/' . $b['id'];
    $portada = club_portada($b);
    $estatEnviament = (string) ($_GET['opinio'] ?? '');
    $esEs = ($b['llengua_ressenya'] ?? '') === 'es';

    $ld = ['@context' => 'https://schema.org', '@type' => 'Book', 'name' => $titol, 'author' => ['@type' => 'Person', 'name' => (string) $b['autor']],
        'publisher' => ['@type' => 'Organization', 'name' => (string) ($b['editorial'] ?? '')], 'url' => IACAT_BASE . $cami,
        'review' => [['@type' => 'Review', 'author' => ['@type' => 'Person', 'name' => (string) $ressenyador['nom']],
            'reviewRating' => ['@type' => 'Rating', 'ratingValue' => (int) $b['estrelles'], 'bestRating' => 5, 'worstRating' => 1],
            'reviewBody' => (string) $b['obertura'], 'inLanguage' => 'ca']]];
    if ($subtitol !== '') { $ld['alternativeHeadline'] = $subtitol; }
    if (!empty($b['any'])) { $ld['datePublished'] = (string) $b['any']; }
    if (!empty($b['isbn'])) { $ld['isbn'] = str_replace('-', '', (string) $b['isbn']); }
    if ($portada !== '') { $ld['image'] = IACAT_BASE . strtok($portada, '?'); }
    foreach ($ops as $o) {
        $r = ['@type' => 'Review', 'author' => ['@type' => 'Person', 'name' => (string) $o['nom']], 'reviewBody' => (string) $o['text'], 'datePublished' => substr((string) $o['data'], 0, 10), 'inLanguage' => 'ca'];
        if (!empty($o['estrelles'])) { $r['reviewRating'] = ['@type' => 'Rating', 'ratingValue' => (int) $o['estrelles'], 'bestRating' => 5, 'worstRating' => 1]; }
        $ld['review'][] = $r;
    }
    if ($mitjana !== null) { $ld['aggregateRating'] = ['@type' => 'AggregateRating', 'ratingValue' => $mitjana, 'ratingCount' => $nNotes, 'bestRating' => 5, 'worstRating' => 1]; }

    iacat_capcalera([
        'titol' => $titol . ', de ' . $b['autor'] . ' · Club de lectura',
        'descripcio' => (string) $b['obertura'],
        'cami' => $cami,
        'molla' => $titol,
        'mollaPare' => ['Club de lectura', CLUB_CAMI],
        'css' => $css,
        'tipusOg' => 'book',
        'imatgeOg' => $portada !== '' ? strtok($portada, '?') : '',
        'jsonld' => $ld,
    ]);
    ?>
    <article class="club-fitxa">
      <header class="club-fitxa__cap">
        <div class="club-fitxa__coberta"><?= club_portada_html($b, 'club-portada', false) ?></div>
        <div>
          <p class="editorial-kicker"><a href="<?= CLUB_CAMI ?>#<?= iacat_e((string) $b['tema']) ?>"><?= iacat_e((string) ($tema['nom'] ?? 'Club de lectura')) ?></a></p>
          <h1 class="club-fitxa__titol"><?= iacat_e($titol) ?></h1>
<?php if ($subtitol !== ''): ?>
          <p class="club-fitxa__subtitol"><?= iacat_e($subtitol) ?></p>
<?php endif; ?>
          <p class="club-autor"><?= iacat_e((string) $b['autor']) ?></p>
          <p class="club-fitxa__dades"><?= iacat_e(implode(' · ', array_filter([(string) ($b['editorial'] ?? ''), (string) ($b['any'] ?? '')]))) ?></p>
          <p class="club-fitxa__lectors"><?php if ($mitjana !== null): ?><?= club_estrelles($mitjana, 'Valoració dels lectors') ?> <?= str_replace('.', ',', (string) $mitjana) ?> de mitjana · <?php endif; ?><?= $n ? $n . ' ' . ($n === 1 ? 'opinió de lector' : 'opinions de lectors') : 'Encara no hi ha cap opinió de lector' ?> · <a href="#opina">Opina</a></p>
        </div>
      </header>

      <section class="club-debat" aria-labelledby="debat-titol">
        <h2 id="debat-titol" class="club-etiqueta">Per obrir el debat</h2>
        <p class="club-debat__text"><?= iacat_e((string) $b['obertura']) ?></p>
        <p class="club-debat__signatura"><?= iacat_e((string) $ressenyador['nom']) ?>, <?= iacat_e((string) ($ressenyador['rol'] ?? '')) ?> · <?= club_estrelles((float) $b['estrelles'], 'La seva valoració') ?></p>
        <details class="club-ressenya">
          <summary>Llegeix la ressenya sencera</summary>
<?php foreach ((array) $b['ressenya'] as $p): ?>
          <p><?= iacat_e((string) $p) ?></p>
<?php endforeach; ?>
          <p class="club-ressenya__nota"><?php if (($b['origen_ressenya'] ?? '') === 'club'): ?><?= $esEs ? 'Traducció de l’original en castellà, escrit' : 'Escrita' ?> per al club de lectura el <?php else: ?><?= $esEs ? 'Traducció de l’original en castellà, publicat' : 'Publicada originalment' ?> a Amazon el <?php endif; ?><?= iacat_e(iacat_data_llarga((string) ($b['data_ressenya'] ?? ''))) ?>.</p>
        </details>
      </section>

      <section class="club-pregunta" aria-label="La pregunta">
        <p class="club-etiqueta">La pregunta</p>
        <p class="club-pregunta__text"><?= iacat_e((string) $b['pregunta']) ?></p>
      </section>

      <section class="club-opinions" aria-labelledby="opinions-titol">
        <h2 id="opinions-titol">Opinions dels lectors<?= $n ? ' <span>(' . $n . ')</span>' : '' ?></h2>
<?php if (!$ops): ?>
        <p class="club-buit">Encara no n’hi ha cap. Si l’has llegit, la teva pot ser la primera.</p>
<?php else: ?>
        <ol class="club-opinions__llista">
<?php foreach ($ops as $o): ?>
          <li class="club-opinio">
            <p class="club-opinio__qui"><strong><?= iacat_e((string) $o['nom']) ?></strong><?= ($o['lloc'] ?? '') !== '' ? ' <span>· ' . iacat_e((string) $o['lloc']) . '</span>' : '' ?><?= !empty($o['estrelles']) ? ' ' . club_estrelles((float) $o['estrelles'], 'Valoració') : '' ?></p>
            <div class="club-opinio__text"><?php foreach (preg_split('/\n{2,}/', (string) $o['text']) as $par): ?><p><?= nl2br(iacat_e(trim($par))) ?></p><?php endforeach; ?></div>
            <p class="club-opinio__data"><?= iacat_e(iacat_data_llarga(substr((string) $o['data'], 0, 10))) ?></p>
          </li>
<?php endforeach; ?>
        </ol>
<?php endif; ?>
      </section>

      <section class="club-form" id="opina" aria-labelledby="opina-titol">
        <h2 id="opina-titol">Dona la teva opinió</h2>
<?php if ($estatEnviament === 'enviada'): ?>
        <p class="club-form__resultat club-form__resultat--ok" role="status">Gràcies! La teva opinió es publicarà quan l’haguem revisada.</p>
<?php elseif ($estatEnviament === 'error'): ?>
        <p class="club-form__resultat club-form__resultat--error" role="alert">No s’ha pogut enviar. Revisa que el nom tingui almenys 2 lletres i l’opinió, almenys 40 caràcters.</p>
<?php endif; ?>
        <form class="js-club-form" method="post" action="/api.php?action=opinio" novalidate>
          <input type="hidden" name="llibre" value="<?= iacat_e((string) $b['id']) ?>">
          <input type="hidden" name="segell" value="<?= iacat_e(club_segell_formulari()) ?>">
          <div class="club-form__parany" aria-hidden="true"><label>Web <input type="text" name="web" tabindex="-1" autocomplete="off"></label></div>
          <div class="club-form__fila">
            <label>Nom <span>(es publicarà; pot ser un pseudònim)</span><input type="text" name="nom" required minlength="2" maxlength="60" autocomplete="nickname"></label>
            <label>Població <span>(opcional)</span><input type="text" name="lloc" maxlength="60"></label>
          </div>
          <fieldset class="club-form__estrelles">
            <legend>Valoració <span>(opcional)</span></legend>
<?php for ($i = 1; $i <= 5; $i++): ?>
            <label><input type="radio" name="estrelles" value="<?= $i ?>"><span aria-hidden="true"><?= str_repeat('★', $i) ?></span><span class="sr"><?= $i ?> de 5</span></label>
<?php endfor; ?>
          </fieldset>
          <label>La teva opinió<textarea name="text" rows="7" required minlength="40" maxlength="2500" placeholder="Què t’ha semblat? Pots respondre la pregunta o anar per on vulguis."></textarea></label>
          <p class="club-form__privacitat">Només desem el que escrius aquí: el nom, la població si la poses, la valoració i el text. No et demanem el correu i no fem servir galetes. Les opinions es llegeixen abans de publicar-les i no hi publiquem insults, publicitat ni dades personals d’altri. Pots demanar que retirem la teva escrivint a <a href="mailto:pomazon@hotmail.es">pomazon@hotmail.es</a>. Més informació a l’<a href="/avis-legal.html#privacitat">avís legal</a>.</p>
          <button type="submit" class="club-boto">Envia l’opinió</button>
          <p class="club-form__missatge" role="status" aria-live="polite"></p>
        </form>
      </section>
<?php
    $germans = array_values(array_filter($llibres, static fn($x) => ($x['tema'] ?? '') === ($b['tema'] ?? '') && $x['id'] !== $b['id']));
    if ($germans): ?>
      <section class="seccio-bloc" aria-labelledby="mes-tema">
        <h2 id="mes-tema">Més llibres sobre <?= iacat_e(mb_strtolower((string) ($tema['nom'] ?? 'aquest tema'))) ?></h2>
        <ul class="club-graella club-graella--petita">
<?php foreach ($germans as $g): [$gt] = club_titol_parts((string) $g['titol']); ?>
          <li class="club-llibre"><a href="<?= CLUB_CAMI . '/' . iacat_e((string) $g['id']) ?>"><?= club_portada_html($g) ?><span class="club-llibre__titol"><?= iacat_e($gt) ?></span><span class="club-llibre__autor"><?= iacat_e((string) $g['autor']) ?></span></a></li>
<?php endforeach; ?>
        </ul>
      </section>
<?php endif; ?>
      <p class="seccio-nota"><a href="<?= CLUB_CAMI ?>">← Tots els llibres del club</a></p>
    </article>
    <script>
    (() => {
      const form = document.querySelector('.js-club-form');
      if (!form || !window.fetch) return;
      const msg = form.querySelector('.club-form__missatge');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nom = form.nom.value.trim(), text = form.text.value.trim();
        if (nom.length < 2) { msg.textContent = 'Escriu el teu nom (o un pseudònim).'; form.nom.focus(); return; }
        if (text.length < 40) { msg.textContent = 'L’opinió és massa curta: mínim 40 caràcters (ara en té ' + text.length + ').'; form.text.focus(); return; }
        const boto = form.querySelector('button[type=submit]');
        boto.disabled = true; msg.textContent = 'Enviant…';
        try {
          const r = await fetch(form.action, { method: 'POST', body: new FormData(form), headers: { Accept: 'application/json' } });
          const j = await r.json();
          msg.textContent = j.message || (j.ok ? 'Gràcies!' : 'No s’ha pogut enviar.');
          msg.classList.toggle('club-form__missatge--ok', !!j.ok);
          if (j.ok) { form.reset(); form.querySelectorAll('input, textarea, button').forEach((el) => { el.disabled = true; }); }
          else { boto.disabled = false; }
        } catch (err) { msg.textContent = 'No s’ha pogut enviar. Comprova la connexió i torna-ho a provar.'; boto.disabled = false; }
      });
    })();
    </script>
<?php
    iacat_peu();
}
