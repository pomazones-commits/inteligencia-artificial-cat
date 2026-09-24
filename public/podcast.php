<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Pòdcast «En veu alta» (24.09.2026) — /podcast.xml
//
// RSS amb les etiquetes d'Apple Podcasts i Spotify. NO genera cap àudio: fa
// servir els MP3 que el workflow «Àudio de l'edició» ja puja cada dia a
// assets/audio/ (reflexio-, analisi-, quadern-, tribuna- i estudi-AAAA-MM-DD).
// Només hi surten els episodis que tenen el fitxer al servidor: quan la neteja
// setmanal retira un MP3 de més de 90 dies, l'episodi desapareix sol del canal.
// Per donar-lo d'alta a Spotify o Apple Podcasts n'hi ha prou amb aquesta adreça.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/peces.php';

header('Content-Type: text/xml; charset=utf-8');
$x = static fn(string $v): string => htmlspecialchars($v, ENT_XML1 | ENT_QUOTES, 'UTF-8');
$seccions = iacat_seccions();
$dirAudio = __DIR__ . '/assets/audio/';
$hores = ['reflexio' => '19:00', 'analisi' => '09:00', 'quadern' => '09:30', 'tribuna' => '08:00', 'estudis' => '08:30'];

$episodis = [];
foreach (iacat_totes_les_peces() as $peca) {
    if ($peca['dataIso'] === '') { continue; }
    $nom = $seccions[$peca['tipus']]['audio'] . $peca['dataIso'] . '.mp3';
    if (!is_file($dirAudio . $nom)) { continue; }
    $peca['_mp3'] = $nom;
    $peca['_mida'] = (int) filesize($dirAudio . $nom);
    $peca['_data'] = strtotime($peca['dataIso'] . 'T' . ($hores[$peca['tipus']] ?? '08:00') . ':00+02:00') ?: time();
    $episodis[] = $peca;
}
usort($episodis, static fn(array $a, array $b): int => $b['_data'] <=> $a['_data']);
$episodis = array_slice($episodis, 0, 150);

$descripcioCanal = 'La intel·ligència artificial explicada en català, per escoltar. Cada vespre, la reflexió del dia: què ha passat avui en IA i què vol dir. '
    . 'Cada setmana, l’anàlisi, el Quadern IA i les peces signades de «La tribuna» i «Estudis». '
    . 'Episodis llegits amb veu sintètica a partir dels textos d’intel·ligènciaartificial.cat, un web de divulgació sense ànim de lucre.';

echo "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n";
echo '<rss version="2.0" xmlns:itunes="http://www.itunes.com/dtds/podcast-1.0.dtd" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">' . "\n<channel>\n";
echo "  <title>En veu alta — intel·ligènciaartificial.cat</title>\n";
echo '  <link>' . IACAT_BASE . "/podcast.html</link>\n";
echo '  <atom:link href="' . IACAT_BASE . '/podcast.xml" rel="self" type="application/rss+xml"/>' . "\n";
echo "  <language>ca</language>\n";
echo '  <description>' . $x($descripcioCanal) . "</description>\n";
echo '  <itunes:summary>' . $x($descripcioCanal) . "</itunes:summary>\n";
echo "  <itunes:author>intel·ligènciaartificial.cat</itunes:author>\n";
echo "  <itunes:owner><itunes:name>intel·ligènciaartificial.cat</itunes:name><itunes:email>pomazona@gmail.com</itunes:email></itunes:owner>\n";
echo '  <itunes:image href="' . IACAT_BASE . '/assets/podcast-portada.jpg"/>' . "\n";
echo '  <image><url>' . IACAT_BASE . '/assets/podcast-portada.jpg</url><title>En veu alta — intel·ligènciaartificial.cat</title><link>' . IACAT_BASE . "/podcast.html</link></image>\n";
echo "  <itunes:category text=\"Technology\"/>\n  <itunes:category text=\"Science\"/>\n";
echo "  <itunes:explicit>false</itunes:explicit>\n  <itunes:type>episodic</itunes:type>\n";
echo '  <copyright>© ' . date('Y') . " intel·ligènciaartificial.cat</copyright>\n";
if ($episodis) { echo '  <lastBuildDate>' . $x(date(DATE_RSS, $episodis[0]['_data'])) . "</lastBuildDate>\n"; }

foreach ($episodis as $e) {
    $autor = $e['autor'] !== '' ? $e['autor'] : 'Redacció IA.cat';
    $titol = $e['titol'];
    $desc = trim($e['resum']);
    $text = $e['seccio'] . ($e['autor'] !== '' ? ', per ' . $e['autor'] : '') . '. ' . $desc . ' Llegeix-ho: ' . $e['url'];
    $mp3 = IACAT_BASE . '/assets/audio/' . $e['_mp3'];
    echo "  <item>\n";
    echo '    <title>' . $x($titol) . "</title>\n";
    echo '    <link>' . $x($e['url']) . "</link>\n";
    echo '    <guid isPermaLink="false">' . $x($e['url']) . "</guid>\n";
    echo '    <pubDate>' . $x(date(DATE_RSS, $e['_data'])) . "</pubDate>\n";
    echo '    <description>' . $x($text) . "</description>\n";
    echo '    <itunes:summary>' . $x($text) . "</itunes:summary>\n";
    echo '    <itunes:author>' . $x($autor) . "</itunes:author>\n";
    echo '    <enclosure url="' . $x($mp3) . '" length="' . $e['_mida'] . "\" type=\"audio/mpeg\"/>\n";
    echo "    <itunes:explicit>false</itunes:explicit>\n    <itunes:episodeType>full</itunes:episodeType>\n";
    echo "  </item>\n";
}
echo "</channel>\n</rss>\n";
