<?php
declare(strict_types=1);

$base = 'https://inteligencia-artificial.cat';
$articlesFile = __DIR__ . '/data/articles.json';
$edition = is_file($articlesFile) ? json_decode((string) file_get_contents($articlesFile), true) : ['items' => []];
$slug = preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($_GET['slug'] ?? '')));
$article = null;
$publishedIso = '';
foreach (($edition['items'] ?? []) as $item) if (($item['slug'] ?? '') === $slug) { $article = $item; break; }
if ($article) { $publishedIso = substr((string) ($edition['updatedAt'] ?? ''), 0, 10); }
if (!$article && $slug !== '') {
    // Hemeroteca: les notícies no moren quan canvia l'edició del dia.
    $arxiuFile = __DIR__ . '/data/arxiu.json';
    $arxiu = is_file($arxiuFile) ? json_decode((string) file_get_contents($arxiuFile), true) : ['editions' => []];
    foreach (($arxiu['editions'] ?? []) as $ed) {
        foreach (($ed['items'] ?? []) as $item) {
            if (($item['slug'] ?? '') === $slug) {
                $article = $item;
                if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', (string) ($ed['date'] ?? ''), $m)) {
                    $publishedIso = $m[3] . '-' . $m[2] . '-' . $m[1];
                }
                break 2;
            }
        }
    }
}
$found = $article !== null;
if (!$article) { http_response_code(404); $article = ['title' => 'Article no trobat', 'excerpt' => 'Aquesta història ja no està disponible.', 'category' => 'ARXIU', 'body' => 'Torna a l’edició per descobrir les últimes històries.']; }
function e(string $value): string { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
$audioFile = __DIR__ . '/assets/audio/' . $slug . '.mp3';
$audioUrl = ($slug !== '' && is_file($audioFile)) ? './assets/audio/' . $slug . '.mp3?v=' . (string) filemtime($audioFile) : '';
$canonical = $base . '/article.php?slug=' . rawurlencode($slug);
$desc = trim((string) ($article['excerpt'] ?? ''));
$imgAbs = !empty($article['image']) ? $base . '/' . ltrim(preg_replace('#^\./#', '', (string) $article['image']), '/') : '';
$jsonld = null;
if ($found) {
    $jsonld = [
        '@context' => 'https://schema.org',
        '@type' => 'NewsArticle',
        'headline' => (string) $article['title'],
        'description' => $desc,
        'inLanguage' => 'ca',
        'mainEntityOfPage' => $canonical,
        'author' => ['@type' => 'Organization', 'name' => 'intel·ligènciaartificial.cat', 'url' => $base],
        'publisher' => ['@type' => 'NewsMediaOrganization', 'name' => 'intel·ligènciaartificial.cat', 'url' => $base],
    ];
    if ($imgAbs !== '') { $jsonld['image'] = [$imgAbs]; }
    if ($publishedIso !== '') { $jsonld['datePublished'] = $publishedIso; $jsonld['dateModified'] = $publishedIso; }
}
?>
<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?= e($article['title']) ?> — intel·ligència artificial.cat</title><?php if ($found): ?><meta name="description" content="<?= e($desc) ?>"><link rel="canonical" href="<?= e($canonical) ?>"><meta property="og:type" content="article"><meta property="og:site_name" content="intel·ligènciaartificial.cat"><meta property="og:locale" content="ca_ES"><meta property="og:title" content="<?= e($article['title']) ?>"><meta property="og:description" content="<?= e($desc) ?>"><meta property="og:url" content="<?= e($canonical) ?>"><?php if ($imgAbs !== ''): ?><meta property="og:image" content="<?= e($imgAbs) ?>"><meta name="twitter:card" content="summary_large_image"><?php else: ?><meta name="twitter:card" content="summary"><?php endif; ?><script type="application/ld+json"><?= json_encode($jsonld, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) ?></script><?php else: ?><meta name="robots" content="noindex"><?php endif; ?><link rel="stylesheet" href="./styles.css"><style>.tts-player{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:18px 0 6px}.tts-player button{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border:1px solid #1d2760;border-radius:999px;background:#1d2760;color:#fff;font-family:inherit;font-size:13px;font-weight:600;line-height:1;cursor:pointer}.tts-player button:hover{opacity:.88}.tts-player .tts-stop{background:transparent;color:#1d2760;padding:10px 14px}.tts-note{font-size:12px;color:#4c596f}.tts-player [hidden]{display:none}.tts-player audio{width:100%;max-width:460px;height:40px}.tts-audio-label{font-size:13px;font-weight:600;color:#1d2760;white-space:nowrap}.tts-speed{font-size:12px;color:#4c596f;display:inline-flex;align-items:center;gap:6px}.tts-speed select{font-family:inherit;font-size:12px;padding:4px 8px;border:1px solid #c9d2e3;border-radius:8px;background:#fff;color:#1d2760;cursor:pointer}</style></head><body><main class="article-page"><a class="brand" href="./">intel·ligència<br><em>artificial</em><span>.cat</span></a><p class="eyebrow"><span class="tag"><?= e($article['category'] ?? 'ANÀLISI') ?></span> · <?= e($article['read'] ?? '5 MIN') ?></p><h1><?= e($article['title']) ?></h1><p class="article-dek"><?= e($article['excerpt']) ?></p><?php if ($audioUrl): ?><div class="tts-player"><span class="tts-audio-label">🎧 Escolta la notícia</span><audio id="tts-audio" controls preload="none" src="<?= e($audioUrl) ?>">El teu navegador no pot reproduir l'àudio.</audio><label class="tts-speed">Velocitat <select id="tts-speed" aria-label="Velocitat de reproducció"><option value="1">1×</option><option value="1.25" selected>1,25×</option><option value="1.5">1,5×</option><option value="1.75">1,75×</option><option value="2">2×</option></select></label></div><?php else: ?><div class="tts-player" id="tts-player" hidden><button type="button" id="tts-toggle" aria-pressed="false"><span id="tts-icon" aria-hidden="true">🔊</span><span id="tts-label">Escolta la notícia</span></button><button type="button" class="tts-stop" id="tts-stop" hidden>■ Atura</button><span class="tts-note" id="tts-note"></span><label class="tts-speed">Velocitat <select id="tts-speed" aria-label="Velocitat de reproducció"><option value="1">1×</option><option value="1.25" selected>1,25×</option><option value="1.5">1,5×</option><option value="1.75">1,75×</option><option value="2">2×</option></select></label></div><?php endif; ?><?php if (!empty($article['image'])): ?><img class="article-image" src="<?= e($article['image']) ?>" alt="Imatge relacionada amb l’article"><?php endif; ?><?php $sourceUrl = $article['sourceUrl'] ?? $article['url'] ?? ''; ?><?php if ($sourceUrl): ?><p class="article-source">Font: <a href="<?= e($sourceUrl) ?>" target="_blank" rel="noreferrer"><?= e($article['sourceName'] ?? 'Font original') ?></a><?php if (!empty($article['sourceDate'])): ?> · <?= e($article['sourceDate']) ?><?php endif; ?></p><?php endif; ?><div class="article-body"><?php foreach (preg_split('/\n\n+/', (string) ($article['body'] ?? '')) as $paragraph): ?><p><?= e($paragraph) ?></p><?php endforeach; ?></div><a class="text-link" href="./">← Torna a l’edició</a></main><script>(() => {
  if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return;
  const synth = window.speechSynthesis;
  synth.getVoices();
  const player = document.getElementById('tts-player');
  if (!player) return;
  const toggle = document.getElementById('tts-toggle');
  const stopBtn = document.getElementById('tts-stop');
  const label = document.getElementById('tts-label');
  const icon = document.getElementById('tts-icon');
  const note = document.getElementById('tts-note');
  const speedSel = document.getElementById('tts-speed');
  let rate = speedSel ? (parseFloat(speedSel.value) || 1.25) : 1.25;
  const parts = [];
  const h1 = document.querySelector('h1');
  if (h1) parts.push(h1.textContent.trim());
  const dek = document.querySelector('.article-dek');
  if (dek && dek.textContent.trim()) parts.push(dek.textContent.trim());
  document.querySelectorAll('.article-body p').forEach(p => { const t = p.textContent.trim(); if (t) parts.push(t); });
  if (!parts.length) return;
  player.hidden = false;
  let state = 'idle';
  const catalanVoice = () => {
    const voices = synth.getVoices().filter(v => /^ca([-_]|$)/i.test(v.lang));
    return voices.find(v => /google|natural|neural/i.test(v.name)) || voices[0] || null;
  };
  function setUI() {
    stopBtn.hidden = state === 'idle';
    icon.textContent = state === 'playing' ? '⏸' : '🔊';
    label.textContent = state === 'playing' ? 'Pausa' : (state === 'paused' ? 'Continua' : 'Escolta la notícia');
    toggle.setAttribute('aria-pressed', String(state === 'playing'));
  }
  function reset() { state = 'idle'; setUI(); }
  function speakAll() {
    synth.cancel();
    const voice = catalanVoice();
    note.textContent = voice ? '' : 'Aquest dispositiu no té cap veu en català instal·lada: se sentirà la veu per defecte.';
    parts.forEach((text, index) => {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'ca-ES';
      if (voice) u.voice = voice;
      u.rate = rate;
      if (index === parts.length - 1) u.onend = reset;
      synth.speak(u);
    });
    state = 'playing';
    setUI();
  }
  toggle.addEventListener('click', () => {
    if (state === 'idle') speakAll();
    else if (state === 'playing') { synth.pause(); state = 'paused'; setUI(); }
    else { synth.resume(); state = 'playing'; setUI(); }
  });
  stopBtn.addEventListener('click', () => { synth.cancel(); reset(); });
  if (speedSel) speedSel.addEventListener('change', () => { rate = parseFloat(speedSel.value) || 1; if (state === 'playing') speakAll(); });
  window.addEventListener('pagehide', () => synth.cancel());
})();</script>
<script>(() => { const a = document.getElementById('tts-audio'); const s = document.getElementById('tts-speed'); if (!a || !s) return; const ap = () => { a.playbackRate = parseFloat(s.value) || 1; }; ap(); a.addEventListener('loadedmetadata', ap); a.addEventListener('play', ap); s.addEventListener('change', ap); })();</script></body></html>
