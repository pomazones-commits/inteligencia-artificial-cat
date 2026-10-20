<?php
declare(strict_types=1);
// Prova dels eixos temàtics (20.10.2026): php scripts/prova-eixos.php
// Comprova que data/topics.php i data/eixos-peces.json són coherents i que el
// classificador (public/inc/eixos.php) dona l'eix esperat en casos de referència.
require __DIR__ . '/../public/inc/eixos.php';
require_once __DIR__ . '/../public/inc/peces.php';

$errors = 0;
$falla = static function (string $missatge) use (&$errors): void { $errors++; fwrite(STDERR, "✗ $missatge\n"); };

$tots = iacat_eixos_tots();
$eixos = iacat_eixos();
foreach ($tots as $clau => $eix) {
    foreach (['tipus', 'title', 'short', 'description', 'categories'] as $camp) {
        if (!array_key_exists($camp, $eix)) { $falla("$clau: falta el camp $camp"); }
    }
    foreach (['fortes', 'paraules'] as $camp) {
        $re = iacat_eix_regex((array) ($eix[$camp] ?? []));
        if ($re !== null && @preg_match($re, '') === false) { $falla("$clau: expressió no vàlida a $camp"); }
    }
}
foreach (iacat_eix_claus_antigues() as $antiga => $nova) {
    if (!isset($eixos[$nova])) { $falla("clau antiga $antiga apunta a $nova, que no existeix"); }
}

// Cada assignació manual ha d'apuntar a una peça que existeix i a un eix vàlid.
$existents = [];
foreach (iacat_totes_les_peces() as $peca) { $existents[$peca['tipus'] . '/' . $peca['id']] = true; }
foreach (iacat_eix_assignacions() as $clauPeca => $eix) {
    if (!isset($eixos[$eix])) { $falla("eixos-peces.json: $clauPeca → $eix no és cap eix"); }
    if (!isset($existents[$clauPeca])) { $falla("eixos-peces.json: la peça $clauPeca no existeix (ha canviat el títol?)"); }
}

$casos = [
    [['category' => 'TECNOLOGIA', 'title' => 'OpenAI llança GPT-5.6'], 'novetats-models-i-productes'],
    [['category' => 'GOVERNANÇA', 'title' => 'La Comissió Europea aplica el reglament d’IA'], 'poder-i-geopolitica'],
    [['category' => 'TECNOLOGIA', 'title' => 'El Pentàgon prova drons autònoms amb IA'], 'poder-i-geopolitica'],
    [['category' => 'EMPRESA', 'title' => 'Tres agents provoquen una «guerra de territoris»'], 'economia-i-treball'],
    [['category' => 'SALUT', 'title' => 'Un algorisme detecta el càncer de pulmó'], 'ciencia-salut-i-robotica'],
    [['category' => 'INVERSIÓ', 'title' => 'Una empresa de robots humanoides surt a borsa'], 'ciencia-salut-i-robotica'],
    [['category' => 'CIÈNCIA', 'title' => 'Un estudi sobre la consciència de les màquines'], 'ment-etica-i-humanisme'],
    [['category' => 'TECNOLOGIA', 'title' => 'Altman diu que l’AGI arribarà el 2028'], 'riscos-seguretat-i-drets'],
    [['category' => 'CATALUNYA', 'title' => 'Una escola de Girona prova tutors amb IA a l’aula'], 'societat-cultura-i-educacio'],
    [['category' => 'CATALUNYA', 'title' => 'Una empresa de Reus inverteix 10 milions en IA'], 'economia-i-treball'],
    [['category' => 'COMUNITAT VALENCIANA', 'title' => 'L’hospital La Fe estrena un sistema de diagnòstic'], 'ciencia-salut-i-robotica'],
    [['title' => 'Un text sense categoria ni paraules clau'], 'novetats-models-i-productes'],
    [['eix' => 'ment-etica-i-humanisme', 'category' => 'EMPRESA', 'title' => 'Camp explícit'], 'ment-etica-i-humanisme'],
];
foreach ($casos as [$item, $esperat]) {
    $obtingut = iacat_eix($item);
    if ($obtingut !== $esperat) { $falla("«{$item['title']}»: $obtingut (esperat $esperat)"); }
}
if (iacat_eix(['title' => 'Una peça sense pistes'], 'tribuna/inventada') !== 'societat-cultura-i-educacio') {
    $falla('recanvi de les peces signades');
}

if ($errors > 0) { fwrite(STDERR, "$errors errors\n"); exit(1); }
echo '✓ eixos: ' . count($tots) . ' pàgines, ' . count(iacat_eix_assignacions()) . ' peces assignades, ' . count($casos) . " casos correctes\n";
