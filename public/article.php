<?php
declare(strict_types=1);

$articlesFile = __DIR__ . '/data/articles.json';
$edition = is_file($articlesFile) ? json_decode((string) file_get_contents($articlesFile), true) : ['items' => []];
$slug = preg_replace('/[^a-z0-9-]/', '', strtolower((string) ($_GET['slug'] ?? '')));
$article = null;
foreach (($edition['items'] ?? []) as $item) if (($item['slug'] ?? '') === $slug) { $article = $item; break; }
if (!$article) { http_response_code(404); $article = ['title' => 'Article no trobat', 'excerpt' => 'Aquesta història ja no està disponible.', 'category' => 'ARXIU', 'body' => 'Torna a l’edició per descobrir les últimes històries.']; }
function e(string $value): string { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }
?>
<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?= e($article['title']) ?> — intel·ligència artificial.cat</title><link rel="stylesheet" href="./styles.css"><style>.tts-player{display:flex;flex-wrap:wrap;align-items:center;gap:12px;margin:18px 0 6px}.tts-player button{display:inline-flex;align-items:center;gap:8px;padding:10px 18px;border:1px solid #1d2760;border-radius:999px;background:#1d2760;color:#fff;font-family:inherit;font-size:13px;font-weight:600;line-height:1;cursor:pointer}.tts-player button:hover{opacity:.88}.tts-player .tts-stop{background:transparent;color:#1d2760;padding:10px 14px}.tts-note{font-size:12px;color:#4c596f}</style></head><body><main class="article-page"><a class="brand" href="./">intel·ligència<br><em>artificial</em><span>.cat</span></a><p class="eyebrow"><span class="tag"><?= e($article['category'] ?? 'ANÀLISI') ?></span> · <?= e($article['read'] ?? '5 MIN') ?></p><h1><?= e($article['title']) ?></h1><p class="article-dek"><?= e($article['excerpt']) ?></p><div class="tts-player" id="tts-player" hidden><button type="button" id="tts-toggle" aria-pressed="false"><span id="tts-icon" aria-hidden="true">🔊</span><span id="tts-label">Escolta la notícia</span></button><button type="button" class="tts-stop" id="tts-stop" hidden>■ Atura</button><span class="tts-note" id="tts-note"></span></div><?php if (!empty($article['image'])): ?><img class="article-image" src="<?= e($article['image']) ?>" alt="Imatge relacionada amb l’article"><?php endif; ?><?php $sourceUrl = $article['sourceUrl'] ?? $article['url'] ?? ''; ?><?php if ($sourceUrl): ?><p class="article-source">Font: <a href="<?= e($sourceUrl) ?>" target="_blank" rel="noreferrer"><?= e($article['sourceName'] ?? 'Font original') ?></a><?php if (!empty($article['sourceDate'])): ?> · <?= e($article['sourceDate']) ?><?php endif; ?></p><?php endif; ?><div class="article-body"><?php foreach (preg_split('/\n\n+/', (string) ($article['body'] ?? '')) as $paragraph): ?><p><?= e($paragraph) ?></p><?php endforeach; ?></div><a class="text-link" href="./">← Torna a l’edició</a></main><script>(() => {
  if (!('speechSynthesis' in window) || !window.SpeechSynthesisUtterance) return;
  const synth = window.speechSynthesis;
  synth.getVoices();
  const player = document.getElementById('tts-player');
  const toggle = document.getElementById('tts-toggle');
  const stopBtn = document.getElementById('tts-stop');
  const label = document.getElementById('tts-label');
  const icon = document.getElementById('tts-icon');
  const note = document.getElementById('tts-note');
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
      u.rate = 1;
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
  window.addEventListener('pagehide', () => synth.cancel());
})();</script></body></html>
