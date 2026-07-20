<?php
declare(strict_types=1);

// Pàgina "La imatge del dia": mostra la fotografia editorial diària i el seu
// text associat (camp "body" de daily-image.js), a l'estil dels articles.
$base = 'https://inteligencia-artificial.cat';
$file = __DIR__ . '/daily-image.js';
$raw = is_file($file) ? (string) file_get_contents($file) : '';
$data = [];
$start = strpos($raw, '{');
$end = strrpos($raw, '}');
if ($start !== false && $end !== false && $end > $start) {
    $decoded = json_decode(substr($raw, $start, $end - $start + 1), true);
    if (is_array($decoded)) { $data = $decoded; }
}

function e(string $value): string { return htmlspecialchars($value, ENT_QUOTES, 'UTF-8'); }

$title   = trim((string) ($data['title'] ?? 'La imatge del dia'));
$kicker  = trim((string) ($data['kicker'] ?? 'IA × Societat'));
$caption = trim((string) ($data['caption'] ?? ''));
$credit  = trim((string) ($data['credit'] ?? 'Imatge editorial generada amb IA'));
$image   = trim((string) ($data['image'] ?? ''));
$alt     = trim((string) ($data['alt'] ?? 'Fotografia editorial del dia'));
$bodyRaw = trim((string) ($data['body'] ?? ''));
if ($bodyRaw === '') { $bodyRaw = $caption; }

$dateLabel = '';
if (!empty($data['date']) && preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', (string) $data['date'], $m)) {
    $dateLabel = $m[3] . '.' . $m[2] . '.' . $m[1];
}

$canonical = $base . '/imatge-del-dia.php';
$imgAbs = $image !== '' ? $base . '/' . ltrim(preg_replace('#^\./#', '', $image), '/') : '';
$desc = $caption !== '' ? $caption : $title;
?>
<!doctype html>
<html lang="ca">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title><?= e($title) ?> — La imatge del dia · intel·ligència artificial.cat</title>
<meta name="description" content="<?= e($desc) ?>">
<link rel="canonical" href="<?= e($canonical) ?>">
<meta property="og:type" content="article">
<meta property="og:site_name" content="intel·ligènciaartificial.cat">
<meta property="og:locale" content="ca_ES">
<meta property="og:title" content="<?= e($title) ?>">
<meta property="og:description" content="<?= e($desc) ?>">
<meta property="og:url" content="<?= e($canonical) ?>">
<?php if ($imgAbs !== ''): ?>
<meta property="og:image" content="<?= e($imgAbs) ?>">
<meta name="twitter:card" content="summary_large_image">
<?php else: ?>
<meta name="twitter:card" content="summary">
<?php endif; ?>
<link rel="stylesheet" href="./styles.css">
</head>
<body>
<main class="article-page">
<a class="brand" href="./">intel·ligència<br><em>artificial</em><span>.cat</span></a>
<p class="eyebrow"><span class="tag"><?= e($kicker) ?></span><?php if ($dateLabel !== ''): ?> · Imatge del dia <?= e($dateLabel) ?><?php endif; ?></p>
<h1><?= e($title) ?></h1>
<?php if ($caption !== ''): ?><p class="article-dek"><?= e($caption) ?></p><?php endif; ?>
<?php if ($image !== ''): ?><img class="article-image" src="<?= e($image) ?>" alt="<?= e($alt) ?>"><?php endif; ?>
<div class="article-body">
<?php foreach (preg_split('/\n\n+/', $bodyRaw) as $paragraph): $paragraph = trim($paragraph); ?>
<?php if ($paragraph !== ''): ?><p><?= e($paragraph) ?></p><?php endif; ?>
<?php endforeach; ?>
</div>
<p class="article-source" style="color:#5a5752;font:10px 'DM Mono',monospace;letter-spacing:.06em;text-transform:uppercase;margin-top:34px"><?= e($credit) ?></p>
<a class="text-link" href="./">← Torna a l'edició</a>
</main>
</body>
</html>

