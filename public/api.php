<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, max-age=0');

$dataDir = __DIR__ . '/data';
$articlesFile = $dataDir . '/articles.json';
$action = $_GET['action'] ?? '';

function respond(array $payload, int $status = 200): never {
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

if ($action === 'latest') {
    if (!is_file($articlesFile)) respond(['items' => [], 'updatedAt' => null]);
    $edition = json_decode((string) file_get_contents($articlesFile), true);
    respond($edition ?: ['items' => [], 'updatedAt' => null]);
}

if ($action === 'subscribe' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = filter_var(trim((string) ($_POST['email'] ?? '')), FILTER_VALIDATE_EMAIL);
    if (!$email) respond(['ok' => false, 'message' => 'Introdueix un correu electrònic vàlid.'], 422);

    if (!is_dir($dataDir)) mkdir($dataDir, 0755, true);
    $subscriptions = $dataDir . '/subscribers.csv';
    $exists = is_file($subscriptions) && str_contains((string) file_get_contents($subscriptions), $email);
    if (!$exists) {
        file_put_contents($subscriptions, date('c') . ',' . $email . PHP_EOL, FILE_APPEND | LOCK_EX);
        // Avís per correu a la redacció per cada subscriptor nou (mai bloqueja la resposta).
        $avis = "Nou subscriptor del butlletí «La setmana d'IA, en cinc minuts»\n\n"
            . 'Correu: ' . $email . "\n"
            . 'Data: ' . date('d.m.Y H:i') . " (hora del servidor)\n"
            . 'Total aproximat de subscriptors: ' . max(1, count(file($subscriptions) ?: [])) . "\n";
        $capceleres = 'From: IA.cat <no-reply@inteligencia-artificial.cat>' . "\r\n"
            . 'Reply-To: ' . $email . "\r\n"
            . 'Content-Type: text/plain; charset=UTF-8';
        @mail('pomazones@gmail.com', 'IA.cat: subscriptor nou al butlletí', $avis, $capceleres);
    }
    respond(['ok' => true, 'message' => 'Gràcies! Ja formes part de l’edició de divendres.']);
}

respond(['ok' => false, 'message' => 'Acció no disponible.'], 404);
