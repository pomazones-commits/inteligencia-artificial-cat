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
        // El 5è paràmetre (-f) fixa el sobre-remitent: sense això, Hostinger envia
        // amb l'usuari del sistema com a remitent i Gmail ho sol descartar en silenci.
        $enviat = @mail('pomazona@gmail.com', 'IA.cat: subscriptor nou al butlletí', $avis, $capceleres, '-f no-reply@inteligencia-artificial.cat');
        // Registre de diagnòstic (no públic, vegeu .htaccess): permet saber si mail() accepta l'enviament.
        @file_put_contents($dataDir . '/mail.log', date('c') . ' subscriptor=' . $email . ' mail()=' . ($enviat ? 'OK' : 'ERROR') . PHP_EOL, FILE_APPEND | LOCK_EX);
    }
    respond(['ok' => true, 'message' => 'Gràcies! Rebràs el butlletí el pròxim dissabte.']);
}

// Club de lectura (08.10.2026): opinió d'un lector sobre un llibre. Queda
// PENDENT i s'avisa per correu amb un enllaç de moderació; no es publica fins
// que algú l'aprova a club-modera.php. Vegeu inc/club.php.
if ($action === 'opinio' && $_SERVER['REQUEST_METHOD'] === 'POST') {
    require_once __DIR__ . '/inc/club.php';
    $volJson = str_contains((string) ($_SERVER['HTTP_ACCEPT'] ?? ''), 'application/json');
    $llibreId = (string) ($_POST['llibre'] ?? '');
    $llibre = club_llibre($llibreId);
    $torna = static function (bool $ok, string $missatge, int $status = 200) use ($volJson, $llibreId): never {
        if ($volJson) { respond(['ok' => $ok, 'message' => $missatge], $status); }
        // Sense JavaScript: tornem a la fitxa amb el resultat a l'adreça.
        header('Content-Type: text/html; charset=utf-8');
        $desti = CLUB_CAMI . (preg_match('/^[a-z0-9-]{3,90}$/', $llibreId) ? '/' . $llibreId : '') . '?opinio=' . ($ok ? 'enviada' : 'error') . '#opina';
        header('Location: ' . $desti, true, 303);
        exit;
    };
    if (!$llibre) { $torna(false, 'Aquest llibre no és al club.', 404); }

    // Paranys antibots: un camp invisible que una persona deixa buit i un formulari
    // que no es pot enviar en menys de 5 segons ni passat un dia. Als bots se'ls
    // respon que tot ha anat bé, perquè no aprenguin a esquivar el parany.
    $correcte = 'Gràcies! La teva opinió es publicarà quan l’haguem revisada.';
    if (trim((string) ($_POST['web'] ?? '')) !== '') { $torna(true, $correcte); }
    $edat = club_edat_segell((string) ($_POST['segell'] ?? ''));
    if ($edat === null || $edat > 86400) { $torna(false, 'El formulari ha caducat. Torna a carregar la pàgina i prova-ho de nou.', 422); }
    if ($edat < 5) { $torna(true, $correcte); }

    $net = static fn(string $v): string => trim((string) preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $v));
    $nom = $net((string) ($_POST['nom'] ?? ''));
    $lloc = $net((string) ($_POST['lloc'] ?? ''));
    $text = $net(str_replace("\r\n", "\n", (string) ($_POST['text'] ?? '')));
    $estrelles = (int) ($_POST['estrelles'] ?? 0);
    if (mb_strlen($nom) < 2 || mb_strlen($nom) > 60) { $torna(false, 'Escriu el teu nom (o com vols que et diguem), entre 2 i 60 caràcters.', 422); }
    if (mb_strlen($lloc) > 60) { $torna(false, 'La població pot tenir com a màxim 60 caràcters.', 422); }
    if (mb_strlen($text) < 40) { $torna(false, 'L’opinió és massa curta: explica’ns una mica més què t’ha semblat (mínim 40 caràcters).', 422); }
    if (mb_strlen($text) > 2500) { $torna(false, 'L’opinió és massa llarga (màxim 2.500 caràcters).', 422); }
    if (preg_match_all('#https?://|www\.#i', $text) > 1) { $torna(false, 'L’opinió no pot portar més d’un enllaç.', 422); }
    if ($estrelles < 1 || $estrelles > 5) { $estrelles = null; }

    // Fre contra inundacions: amb 30 opinions pendents, no se n'accepten més fins que es moderin.
    $pendents = count(array_filter(club_opinions_totes(), static fn($o) => ($o['estat'] ?? '') === 'pendent'));
    if ($pendents >= 30) { $torna(false, 'Ara mateix tenim moltes opinions per revisar. Torna-ho a provar d’aquí a uns dies.', 503); }

    $id = date('Ymd') . '-' . bin2hex(random_bytes(4));
    $opinio = ['id' => $id, 'llibre' => $llibreId, 'nom' => $nom, 'lloc' => $lloc, 'text' => $text, 'estrelles' => $estrelles, 'data' => date('c'), 'estat' => 'pendent'];
    $desat = club_modifica_opinions(static function (array $llista) use ($opinio): array { $llista[] = $opinio; return $llista; });
    if (!$desat) { $torna(false, 'No hem pogut desar l’opinió. Torna-ho a provar d’aquí a una estona.', 500); }

    [$titol] = club_titol_parts((string) $llibre['titol']);
    $avis = "Opinió nova al club de lectura — PENDENT DE MODERAR\n\n"
        . 'Llibre: ' . $titol . ' (' . $llibre['autor'] . ")\n"
        . 'Nom: ' . $nom . ($lloc !== '' ? ' (' . $lloc . ')' : '') . "\n"
        . 'Valoració: ' . ($estrelles ? str_repeat('★', $estrelles) . str_repeat('☆', 5 - $estrelles) : 'sense valoració') . "\n"
        . 'Data: ' . date('d.m.Y H:i') . " (hora del servidor)\n\n"
        . "------------------------------------------------------------\n" . $text . "\n------------------------------------------------------------\n\n"
        . "Per publicar-la o descartar-la (obre una pàgina amb els dos botons):\n" . club_enllac_moderacio($id) . "\n\n"
        . "Totes les opinions (pendents i publicades):\n" . IACAT_BASE . '/club-modera.php?t=' . club_signa('modera:llista') . "\n";
    $capceleres = 'From: IA.cat <no-reply@inteligencia-artificial.cat>' . "\r\n" . 'Content-Type: text/plain; charset=UTF-8';
    $assumpte = '=?UTF-8?B?' . base64_encode('IA.cat club de lectura: opinió nova sobre «' . $titol . '»') . '?=';
    $enviat = @mail('pomazona@gmail.com', $assumpte, $avis, $capceleres, '-f no-reply@inteligencia-artificial.cat');
    @file_put_contents($dataDir . '/mail.log', date('c') . ' club-opinio=' . $id . ' mail()=' . ($enviat ? 'OK' : 'ERROR') . PHP_EOL, FILE_APPEND | LOCK_EX);

    $torna(true, $correcte);
}

respond(['ok' => false, 'message' => 'Acció no disponible.'], 404);
