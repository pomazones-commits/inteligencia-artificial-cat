<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Peces editorials amb adreça fixa (24.09.2026).
//
// «La tribuna», «Estudis», l'anàlisi setmanal, el Quadern IA i la reflexió del
// dia viuen en fitxers de dades JS (window.IA_*). Fins ara les peces arxivades
// s'obrien amb ?arxiu=N, i com que cada peça nova s'afegeix AL DAVANT de la
// llista, el mateix enllaç passava a mostrar una altra peça cada vegada que se
// n'arxivava una. Aquest fitxer dona a cada peça un identificador estable:
//
//   - reflexió del dia → la data (AAAA-MM-DD), que és única;
//   - la resta         → el títol convertit en slug; si dos títols d'una mateixa
//                        secció coincideixen, el més recent porta la data al final.
//
// ⚠️ L'algorisme ha de ser IDÈNTIC al de /peces.js (el navegador el fa servir
// per als botons de compartir i per a les pàgines d'arxiu). Si en canvies un,
// canvia l'altre i passa `node automation/tests/peces-paritat.test.mjs`.
//
// El fan servir: peca.php (les pàgines /tribuna/<id>…), sitemap.php, feed.php,
// podcast.php i autors.php. No escriu res: només llegeix.
// ---------------------------------------------------------------------------

const IACAT_BASE = 'https://inteligencia-artificial.cat';

function iacat_seccions(): array
{
    return [
        'tribuna' => [
            'nom' => 'La tribuna', 'cami' => 'tribuna', 'html' => 'tribuna.html', 'arxiuHtml' => 'arxiu-tribuna.html',
            'vigent' => ['tribuna.js', 'IA_TRIBUNA'], 'arxiu' => ['tribuna-arxiu.js', 'IA_TRIBUNA_ARXIU'],
            'resum' => ['excerpt'], 'audio' => 'tribuna-', 'clau' => 'titol',
        ],
        'estudis' => [
            'nom' => 'Estudis', 'cami' => 'estudis', 'html' => 'estudi.html', 'arxiuHtml' => 'arxiu-estudis.html',
            'vigent' => ['estudis.js', 'IA_ESTUDI'], 'arxiu' => ['estudis-arxiu.js', 'IA_ESTUDIS_ARXIU'],
            'resum' => ['excerpt', 'abstract'], 'audio' => 'estudi-', 'clau' => 'titol',
        ],
        'analisi' => [
            'nom' => 'Anàlisi de la setmana', 'cami' => 'analisi', 'html' => 'analisi.html', 'arxiuHtml' => 'arxiu-analisis.html',
            'vigent' => ['analysis.js', 'IA_ANALYSIS'], 'arxiu' => ['analysis-arxiu.js', 'IA_ANALISIS_ARXIU'],
            'resum' => ['excerpt'], 'audio' => 'analisi-', 'clau' => 'titol',
        ],
        'quadern' => [
            'nom' => 'Quadern IA', 'cami' => 'quadern', 'html' => 'quadern.html', 'arxiuHtml' => 'arxiu-quadern.html',
            'vigent' => ['reflection.js', 'IA_REFLECTION'], 'arxiu' => ['quadern-arxiu.js', 'IA_QUADERN_ARXIU'],
            'resum' => ['dek'], 'audio' => 'quadern-', 'clau' => 'titol',
        ],
        'reflexio' => [
            'nom' => 'La reflexió del dia', 'cami' => 'reflexio', 'html' => 'reflexio.html', 'arxiuHtml' => 'arxiu-reflexions.html',
            'vigent' => ['reflexio-diaria.js', 'IA_REFLEXIO_DIARIA'], 'arxiu' => ['reflexions-arxiu.js', 'IA_REFLEXIONS_ARXIU'],
            'resum' => ['dek'], 'audio' => 'reflexio-', 'clau' => 'data',
        ],
    ];
}

/** Llegeix `window.VAR = …;` d'un fitxer de dades i en retorna el valor (o null). */
function iacat_llegeix_js(string $fitxer, string $variable)
{
    $ruta = dirname(__DIR__) . '/' . $fitxer;
    if (!is_file($ruta)) { return null; }
    $text = (string) file_get_contents($ruta);
    // L'última assignació a principi de línia: els comentaris de capçalera
    // també esmenten «window.IA_…», però mai a la columna 0.
    if (!preg_match_all('/^window\.' . preg_quote($variable, '/') . '\s*=\s*/m', $text, $m, PREG_OFFSET_CAPTURE)) { return null; }
    $darrer = end($m[0]);
    $json = rtrim(substr($text, $darrer[1] + strlen($darrer[0])));
    $json = rtrim($json, ";\n\r\t ");
    if ($json === 'null' || $json === '') { return null; }
    $valor = json_decode($json, true);
    return is_array($valor) ? $valor : null;
}

/** Slug d'un títol. Ha de donar el mateix resultat que IAPeces.slug() de peces.js. */
function iacat_slug(string $text): string
{
    $text = function_exists('mb_strtolower') ? mb_strtolower($text, 'UTF-8') : strtolower($text);
    $text = strtr($text, [
        'à' => 'a', 'á' => 'a', 'â' => 'a', 'ä' => 'a', 'ã' => 'a', 'å' => 'a',
        'è' => 'e', 'é' => 'e', 'ê' => 'e', 'ë' => 'e',
        'ì' => 'i', 'í' => 'i', 'î' => 'i', 'ï' => 'i',
        'ò' => 'o', 'ó' => 'o', 'ô' => 'o', 'ö' => 'o', 'õ' => 'o',
        'ù' => 'u', 'ú' => 'u', 'û' => 'u', 'ü' => 'u',
        'ç' => 'c', 'ñ' => 'n', '·' => '', 'ŀ' => 'l',
    ]);
    $text = (string) preg_replace('/[^a-z0-9]+/', '-', $text);
    $text = trim($text, '-');
    // Màxim 80 caràcters, tallant en un guionet (mai a mig mot) si n'hi ha un prou avançat.
    if (strlen($text) > 80) {
        $tall = substr($text, 0, 81);
        $guio = strrpos($tall, '-');
        $text = rtrim($guio !== false && $guio > 40 ? substr($tall, 0, $guio) : substr($text, 0, 80), '-');
    }
    return $text !== '' ? $text : 'peca';
}

/** Data d'una peça en ISO (AAAA-MM-DD), tant si ve com DD.MM.AAAA com si ja és ISO. */
function iacat_data_iso(string $data): string
{
    if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $data, $m)) { return $m[3] . '-' . $m[2] . '-' . $m[1]; }
    if (preg_match('/^(\d{4})-(\d{2})-(\d{2})$/', $data)) { return $data; }
    return '';
}

/**
 * Totes les peces d'una secció, de la més recent a la més antiga.
 * Cada element: tipus, id, idx (-1 = la vigent; N = posició a l'arxiu), item,
 * url, dataIso, titol, resum.
 */
function iacat_peces(string $tipus): array
{
    static $cau = [];
    if (isset($cau[$tipus])) { return $cau[$tipus]; }
    $seccions = iacat_seccions();
    if (!isset($seccions[$tipus])) { return []; }
    $s = $seccions[$tipus];

    // Llista en l'ordre del web: la vigent primer i després l'arxiu.
    $llista = [];
    $vigent = iacat_llegeix_js($s['vigent'][0], $s['vigent'][1]);
    if (is_array($vigent) && !empty($vigent['title'])) { $llista[] = ['idx' => -1, 'item' => $vigent]; }
    if ($s['arxiu']) {
        $arxiu = iacat_llegeix_js($s['arxiu'][0], $s['arxiu'][1]);
        foreach ((array) $arxiu as $i => $item) {
            if (is_array($item) && !empty($item['title'])) { $llista[] = ['idx' => (int) $i, 'item' => $item]; }
        }
    }

    // Identificadors: de la més antiga a la més recent, perquè una peça nova
    // no canviï mai l'identificador de les que ja hi eren.
    $usats = [];
    $perClau = [];
    for ($k = count($llista) - 1; $k >= 0; $k--) {
        $item = $llista[$k]['item'];
        $data = (string) ($item['date'] ?? '');
        $iso = iacat_data_iso($data);
        $clau = $item['title'] . '|' . $data;
        if (isset($perClau[$clau])) { $llista[$k]['id'] = $perClau[$clau]; continue; }
        if (!empty($item['id']) && is_string($item['id'])) {
            // Camp opcional «id»: fixa l'adreça a mà (p. ex. si mai es corregeix el títol
            // d'una peça ja publicada, s'hi posa l'identificador antic i l'enllaç no es trenca).
            $id = iacat_slug($item['id']);
        } elseif ($s['clau'] === 'data') {
            $id = $iso !== '' ? $iso : iacat_slug((string) $item['title']);
        } else {
            $id = iacat_slug((string) $item['title']);
        }
        if (isset($usats[$id])) {
            $base = $id . ($iso !== '' ? '-' . str_replace('-', '', $iso) : '');
            $id = $base;
            $n = 2;
            while (isset($usats[$id])) { $id = $base . '-' . $n++; }
        }
        $usats[$id] = true;
        $perClau[$clau] = $id;
        $llista[$k]['id'] = $id;
    }

    $peces = [];
    $vistos = [];
    foreach ($llista as $entrada) {
        if (isset($vistos[$entrada['id']])) { continue; }
        $vistos[$entrada['id']] = true;
        $item = $entrada['item'];
        $resum = '';
        foreach ($s['resum'] as $camp) {
            if (!empty($item[$camp]) && is_string($item[$camp])) { $resum = $item[$camp]; break; }
        }
        $peces[] = [
            'tipus' => $tipus,
            'seccio' => $s['nom'],
            'id' => $entrada['id'],
            'idx' => $entrada['idx'],
            'item' => $item,
            'url' => IACAT_BASE . '/' . $s['cami'] . '/' . $entrada['id'],
            'dataIso' => iacat_data_iso((string) ($item['date'] ?? '')),
            'titol' => (string) $item['title'],
            'resum' => $resum,
            'autor' => (string) ($item['author'] ?? ''),
        ];
    }
    return $cau[$tipus] = $peces;
}

function iacat_troba(string $tipus, string $id): ?array
{
    foreach (iacat_peces($tipus) as $peca) {
        if ($peca['id'] === $id) { return $peca; }
    }
    return null;
}

/** Totes les peces de totes les seccions, de la més recent a la més antiga. */
function iacat_totes_les_peces(): array
{
    $totes = [];
    foreach (array_keys(iacat_seccions()) as $tipus) {
        foreach (iacat_peces($tipus) as $peca) { $totes[] = $peca; }
    }
    usort($totes, static fn(array $a, array $b): int => strcmp($b['dataIso'], $a['dataIso']));
    return $totes;
}

/** Text pla d'un cos, tant si és una cadena amb \n\n com si és una llista de paràgrafs. */
function iacat_cos_text($cos): string
{
    if (is_array($cos)) {
        $parts = [];
        foreach ($cos as $p) { if (is_string($p)) { $parts[] = $p; } elseif (is_array($p) && isset($p['text'])) { $parts[] = (string) $p['text']; } }
        return implode("\n\n", $parts);
    }
    return is_string($cos) ? $cos : '';
}

function iacat_e(string $valor): string
{
    return htmlspecialchars($valor, ENT_QUOTES, 'UTF-8');
}
