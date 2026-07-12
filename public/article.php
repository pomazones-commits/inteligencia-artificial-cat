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
<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?= e($article['title']) ?> — intel·ligència artificial.cat</title><link rel="stylesheet" href="./styles.css"></head><body><main class="article-page"><a class="brand" href="./">intel·ligència<br><em>artificial</em><span>.cat</span></a><p class="eyebrow"><span class="tag"><?= e($article['category'] ?? 'ANÀLISI') ?></span> · <?= e($article['read'] ?? '5 MIN') ?></p><h1><?= e($article['title']) ?></h1><p class="article-dek"><?= e($article['excerpt']) ?></p><?php if (!empty($article['image'])): ?><img class="article-image" src="<?= e($article['image']) ?>" alt="Imatge relacionada amb l’article"><?php endif; ?><?php $sourceUrl = $article['sourceUrl'] ?? $article['url'] ?? ''; ?><?php if ($sourceUrl): ?><p class="article-source">Font: <a href="<?= e($sourceUrl) ?>" target="_blank" rel="noreferrer"><?= e($article['sourceName'] ?? 'Font original') ?></a><?php if (!empty($article['sourceDate'])): ?> · <?= e($article['sourceDate']) ?><?php endif; ?></p><?php endif; ?><div class="article-body"><?php foreach (preg_split('/\n\n+/', (string) ($article['body'] ?? '')) as $paragraph): ?><p><?= e($paragraph) ?></p><?php endforeach; ?></div><a class="text-link" href="./">← Torna a l’edició</a></main></body></html>
