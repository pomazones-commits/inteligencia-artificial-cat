<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Club de lectura — moderació de les opinions (08.10.2026).
//
// No hi ha usuari ni contrasenya: cada enllaç porta una signatura HMAC feta amb
// la clau secreta del servidor (data/club-secret.txt, inc/club.php).
//   ?id=<opinió>&t=<signatura>  → una opinió, amb els botons Publica / Descarta / Retira
//   ?t=<signatura de 'llista'>   → totes les opinions pendents i les publicades
// Els canvis només es fan per POST: alguns filtres de correu obren els enllaços
// dels missatges per comprovar-los, i un simple GET no ha de publicar res.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/club.php';

header('Content-Type: text/html; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');

$id = (string) ($_REQUEST['id'] ?? '');
$t = (string) ($_REQUEST['t'] ?? '');
$esLlista = $id === '' && preg_match('/^[0-9a-f]{32}$/', $t) === 1 && hash_equals(club_signa('modera:llista'), $t);
$valid = $esLlista || club_token_valid($id, $t);
$missatge = '';

if ($valid && !$esLlista && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $accio = (string) ($_POST['accio'] ?? '');
    $estats = ['publica' => 'aprovada', 'descarta' => 'rebutjada', 'retira' => 'rebutjada'];
    if (isset($estats[$accio])) {
        $nou = $estats[$accio];
        // Publicar canvia l'estat; descartar o retirar ESBORRA l'opinió del fitxer
        // (és el que promet l'avís legal, §5 b: no es guarden dades que no es publiquen).
        club_modifica_opinions(static function (array $llista) use ($id, $nou): array {
            $sortida = [];
            foreach ($llista as $o) {
                if (($o['id'] ?? '') !== $id) { $sortida[] = $o; continue; }
                if ($nou === 'aprovada') { $o['estat'] = 'aprovada'; $o['moderada'] = date('c'); $sortida[] = $o; }
            }
            return $sortida;
        });
        $missatge = $accio === 'publica' ? 'Publicada. Ja es veu a la fitxa del llibre.' : ($accio === 'retira' ? 'Retirada i esborrada: ja no es veu al web.' : 'Descartada i esborrada: no es publicarà.');
    }
}

$opinions = club_opinions_totes();
$trobada = null;
foreach ($opinions as $o) { if (($o['id'] ?? '') === $id) { $trobada = $o; } }

function modera_fitxa(array $o, bool $ambBotons): void
{
    $b = club_llibre((string) ($o['llibre'] ?? '')) ?? ['titol' => '(llibre desconegut)', 'autor' => '', 'id' => ''];
    [$titol] = club_titol_parts((string) $b['titol']);
    $estat = ['pendent' => 'Pendent', 'aprovada' => 'Publicada', 'rebutjada' => 'Descartada'][$o['estat'] ?? ''] ?? '?';
    ?>
    <article class="mod-op mod-op--<?= iacat_e((string) ($o['estat'] ?? '')) ?>">
      <p class="mod-meta"><strong><?= iacat_e($estat) ?></strong> · <a href="<?= CLUB_CAMI . '/' . iacat_e((string) $b['id']) ?>" target="_blank" rel="noopener"><?= iacat_e($titol) ?></a> · <?= iacat_e(date('d.m.Y H:i', strtotime((string) ($o['data'] ?? 'now')))) ?></p>
      <p class="mod-qui"><?= iacat_e((string) ($o['nom'] ?? '')) ?><?= ($o['lloc'] ?? '') !== '' ? ' (' . iacat_e((string) $o['lloc']) . ')' : '' ?> <?= club_estrelles(isset($o['estrelles']) && $o['estrelles'] ? (float) $o['estrelles'] : null, 'Valoració') ?></p>
      <div class="mod-text"><?= nl2br(iacat_e((string) ($o['text'] ?? ''))) ?></div>
<?php if ($ambBotons): ?>
      <form method="post" class="mod-botons">
        <input type="hidden" name="id" value="<?= iacat_e((string) $o['id']) ?>"><input type="hidden" name="t" value="<?= iacat_e(club_signa('modera:' . $o['id'])) ?>">
<?php if (($o['estat'] ?? '') !== 'aprovada'): ?>
        <button name="accio" value="publica" class="b-si">Publica-la</button>
<?php endif; ?>
<?php if (($o['estat'] ?? '') === 'pendent'): ?>
        <button name="accio" value="descarta" class="b-no">Descarta-la</button>
<?php elseif (($o['estat'] ?? '') === 'aprovada'): ?>
        <button name="accio" value="retira" class="b-no">Retira-la del web</button>
<?php endif; ?>
      </form>
<?php else: ?>
      <p><a href="<?= iacat_e(club_enllac_moderacio((string) $o['id'])) ?>">Obre-la per moderar-la →</a></p>
<?php endif; ?>
    </article>
<?php
}
?><!doctype html>
<html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow">
<title>Moderació · Club de lectura · IA.cat</title>
<style>
:root{--tinta:#14161f;--paper:#fff;--fons:#f6f7fb;--linia:#dfe2ea;--blau:#2446d8;--suau:#5b6070}
@media (prefers-color-scheme:dark){:root{--tinta:#eef0f6;--paper:#1b1e28;--fons:#12141b;--linia:#323645;--blau:#8ea6ff;--suau:#a3a8b8}}
body{margin:0;background:var(--fons);color:var(--tinta);font:16px/1.55 system-ui,-apple-system,sans-serif}
main{max-width:720px;margin:0 auto;padding:28px 16px 60px}
h1{font-size:24px;margin:0 0 4px}a{color:var(--blau)}
.avis{padding:14px 16px;border-radius:10px;background:#e3f6e8;color:#14532d;font-weight:600}
.mod-op{margin:18px 0;padding:18px;border:1px solid var(--linia);border-radius:12px;background:var(--paper)}
.mod-op--rebutjada{opacity:.6}.mod-meta{margin:0;color:var(--suau);font-size:13px}.mod-qui{margin:8px 0;font-weight:600}
.mod-text{white-space:normal;font-size:16px}.mod-botons{display:flex;flex-wrap:wrap;gap:10px;margin-top:16px}
button{padding:12px 20px;border:0;border-radius:999px;font:600 15px system-ui;cursor:pointer}.b-si{background:#15803d;color:#fff}.b-no{background:var(--linia);color:var(--tinta)}
.club-estrelles{color:#c58b00;letter-spacing:1px}
</style></head><body><main>
<h1>Club de lectura · moderació</h1>
<p style="color:var(--suau);margin-top:0">Pàgina privada: només s’hi arriba amb l’enllaç del correu.</p>
<?php if (!$valid): ?>
  <p>Aquest enllaç no és vàlid o ha caducat.</p>
<?php else: ?>
<?php if ($missatge !== ''): ?><p class="avis"><?= iacat_e($missatge) ?></p><?php endif; ?>
<?php if (!$esLlista): ?>
<?php if ($trobada) { modera_fitxa($trobada, true); } elseif ($missatge === '') { echo '<p>No trobem aquesta opinió: potser ja s’ha descartat.</p>'; } ?>
<?php else:
    $pend = array_filter($opinions, static fn($o) => ($o['estat'] ?? '') === 'pendent');
    $pub = array_filter($opinions, static fn($o) => ($o['estat'] ?? '') === 'aprovada'); ?>
  <h2>Pendents (<?= count($pend) ?>)</h2>
<?php foreach (array_reverse($pend) as $o) { modera_fitxa($o, false); } if (!$pend) { echo '<p>Cap opinió pendent.</p>'; } ?>
  <h2>Publicades (<?= count($pub) ?>)</h2>
<?php foreach (array_reverse($pub) as $o) { modera_fitxa($o, false); } ?>
<?php endif; ?>
  <p style="margin-top:30px"><a href="<?= iacat_e(IACAT_BASE . '/club-modera.php?t=' . club_signa('modera:llista')) ?>">Totes les opinions</a> · <a href="<?= CLUB_CAMI ?>">Club de lectura</a></p>
<?php endif; ?>
</main></body></html>
