<?php
declare(strict_types=1);

/* Una execució manual respon de seguida i continua al servidor, fora del límit del navegador. */
if (PHP_SAPI !== 'cli' && isset($_GET['manual']) && function_exists('fastcgi_finish_request')) {
  set_time_limit(600);
  header('Content-Type: text/plain; charset=UTF-8');
  echo "Publicació iniciada. Les notícies i les imatges s’estan generant.\n";
  fastcgi_finish_request();
}

/* Executa’l una vegada al dia amb Cron de Hostinger: php /ruta/a/public_html/cron/publish.php */
$config = is_file(__DIR__ . '/../../config.php') ? require __DIR__ . '/../../config.php' : [];
$key = $config['openai_api_key'] ?? '';
if (!$key || $key === 'ENGANXA_LA_TEU_CLAU_AQUI') exit("Falta configurar OPENAI API key.\n");

$feeds = ['https://techcrunch.com/category/artificial-intelligence/feed/', 'https://www.technologyreview.com/topic/artificial-intelligence/feed/'];
$fetchFeed = static function (string $url): string {
  $request = curl_init($url);
  curl_setopt_array($request, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_CONNECTTIMEOUT => 8,
    CURLOPT_TIMEOUT => 20,
    CURLOPT_USERAGENT => 'Intel-ligenciaArtificialCat/1.0 (+https://inteligencia-artificial.cat)'
  ]);
  $body = curl_exec($request);
  $status = (int) curl_getinfo($request, CURLINFO_HTTP_CODE);
  curl_close($request);
  return is_string($body) && $status >= 200 && $status < 300 ? $body : '';
};
$sources = [];
foreach ($feeds as $feed) {
  $feedBody = $fetchFeed($feed);
  if ($feedBody === '') continue;
  $xml = @simplexml_load_string($feedBody);
  if ($xml === false) continue;
  $publisher = parse_url($feed, PHP_URL_HOST) ?: 'Font original';
  foreach (($xml->channel->item ?? []) as $item) {
    $url = trim((string) $item->link);
    if (!$url) continue;
    $sources[] = ['title' => (string) $item->title, 'url' => $url, 'description' => strip_tags((string) $item->description), 'sourceName' => $publisher];
  }
}
$responseText = static function (array $response): string {
  if (is_string($response['output_text'] ?? null) && $response['output_text'] !== '') return $response['output_text'];
  foreach (($response['output'] ?? []) as $output) {
    foreach (($output['content'] ?? []) as $content) {
      if (is_string($content['text'] ?? null) && $content['text'] !== '') return $content['text'];
    }
  }
  return '';
};
if (count($sources) < 3) exit("No hi ha prou fonts verificables per publicar l’edició.\n");
$prompt = 'Ets l’editor d’un mitjà català. Selecciona 3 notícies sobre IA NOMÉS d’aquestes fonts. No inventis fets, xifres, titulars ni atribucions. Per a cada peça, el camp url ha de ser EXACTAMENT una de les URL de les fonts. Retorna únicament JSON amb {"items":[{"category":"MÓN","read":"4 MIN","slug":"...","title":"...","excerpt":"...","body":"exactament quatre paràgrafs complets, ben redactats en català","url":"URL exacta de la font"}]}. Els quatre paràgrafs han d’explicar el context, els fets verificats, la rellevància i els límits o les conseqüències, sense repetir informació. Fonts: ' . json_encode(array_slice($sources, 0, 12), JSON_UNESCAPED_UNICODE);
$request = curl_init('https://api.openai.com/v1/responses');
curl_setopt_array($request, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 120, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Content-Type: application/json'], CURLOPT_POSTFIELDS => json_encode(['model' => 'gpt-4.1-mini', 'input' => $prompt])]);
$responseBody = curl_exec($request);
$responseError = curl_error($request);
curl_close($request);
$response = json_decode(is_string($responseBody) ? $responseBody : '', true);
$text = $responseText(is_array($response) ? $response : []);
if (!$text && !empty($response['error']['message'])) exit('Error d’OpenAI: ' . $response['error']['message'] . "\n");
if (!$text && $responseError) exit('Error de connexió amb OpenAI: ' . $responseError . "\n");
if (!preg_match('/\{[\s\S]*\}/', $text, $match)) exit("No s’ha pogut generar l’edició.\n");
$edition = json_decode($match[0], true);
if (empty($edition['items'])) exit("L’edició retornada no és vàlida.\n");
$sourcesByUrl = [];
foreach ($sources as $source) $sourcesByUrl[$source['url']] = $source;
$edition['items'] = array_values(array_filter($edition['items'], static function ($article) use ($sourcesByUrl) {
  return is_array($article) && !empty($article['url']) && isset($sourcesByUrl[$article['url']]);
}));
if (count($edition['items']) < 3) exit("L’edició conté fonts que no s’han pogut verificar. No s’ha publicat.\n");
$edition['updatedAt'] = gmdate('c');
if (!is_dir(__DIR__ . '/../assets')) mkdir(__DIR__ . '/../assets', 0755, true);
foreach ($edition['items'] as &$article) {
  $source = $sourcesByUrl[$article['url']];
  $article['sourceUrl'] = $source['url'];
  $article['sourceName'] = $source['sourceName'];
  unset($article['url']);
  $imagePrompt = 'Fotografia editorial fotorealista, sense text ni logotips, relacionada amb aquesta notícia sobre intel·ligència artificial. Escena natural, llum cinematogràfica, composició horitzontal per a portada de mitjà digital. Titular: ' . ($article['title'] ?? '') . '. Context: ' . ($article['excerpt'] ?? '');
  $imageRequest = curl_init('https://api.openai.com/v1/images/generations');
  curl_setopt_array($imageRequest, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 150, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Content-Type: application/json'], CURLOPT_POSTFIELDS => json_encode(['model' => 'gpt-image-1', 'prompt' => $imagePrompt, 'n' => 1, 'size' => '1536x1024', 'quality' => 'medium'])]);
  $imageResponse = json_decode((string) curl_exec($imageRequest), true);
  curl_close($imageRequest);
  $imageBase64 = $imageResponse['data'][0]['b64_json'] ?? '';
  if ($imageBase64) {
    $safeSlug = preg_replace('/[^a-z0-9-]+/i', '-', (string) ($article['slug'] ?? uniqid('article-', true)));
    $imageFile = $safeSlug . '-' . gmdate('Ymd') . '.png';
    file_put_contents(__DIR__ . '/../assets/' . $imageFile, base64_decode($imageBase64));
    $article['image'] = './assets/' . $imageFile;
  }
}
unset($article);
file_put_contents(__DIR__ . '/../data/articles.json', json_encode($edition, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES));
file_put_contents(__DIR__ . '/../news.js', 'window.IA_NEWS = ' . json_encode($edition['items'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n");

/* La mateixa tasca diària publica una reflexió només els divendres (hora de Barcelona). */
$now = new DateTimeImmutable('now', new DateTimeZone('Europe/Madrid'));
if ($now->format('N') === '5') {
  $themes = array_map(static fn(array $article): array => [
    'title' => (string) ($article['title'] ?? ''),
    'excerpt' => (string) ($article['excerpt'] ?? '')
  ], $edition['items']);
  $reflectionPrompt = 'Ets l’autor d’un quadern editorial català sobre tecnologia. Escriu una reflexió setmanal serena, clara i exigent sobre la intel·ligència artificial. Inspira’t només en aquests temes de l’edició, però no inventis fets, xifres ni atribucions. No facis promoció ni prediccions. Retorna únicament JSON vàlid amb {"date":"DD.MM.AAAA","title":"...","dek":"...","body":["paràgraf 1","paràgraf 2","paràgraf 3"]}. Cada paràgraf ha de tenir entre 45 i 85 paraules. Temes: ' . json_encode($themes, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
  $reflectionRequest = curl_init('https://api.openai.com/v1/responses');
  curl_setopt_array($reflectionRequest, [CURLOPT_POST => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 10, CURLOPT_TIMEOUT => 120, CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $key, 'Content-Type: application/json'], CURLOPT_POSTFIELDS => json_encode(['model' => 'gpt-4.1-mini', 'input' => $reflectionPrompt])]);
  $reflectionResponse = json_decode((string) curl_exec($reflectionRequest), true);
  curl_close($reflectionRequest);
  $reflectionText = $responseText(is_array($reflectionResponse) ? $reflectionResponse : []);
  if (preg_match('/\{[\s\S]*\}/', $reflectionText, $reflectionMatch)) {
    $reflection = json_decode($reflectionMatch[0], true);
    if (is_array($reflection) && !empty($reflection['title']) && !empty($reflection['dek']) && is_array($reflection['body']) && count($reflection['body']) >= 2) {
      $reflection['date'] = $now->format('d.m.Y');
      $reflection['body'] = array_values(array_slice(array_map('strval', $reflection['body']), 0, 3));
      file_put_contents(__DIR__ . '/../reflection.js', 'window.IA_REFLECTION = ' . json_encode($reflection, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . ";\n");
      echo "Reflexió de divendres publicada.\n";
    }
  }
}
echo "Edició publicada: " . count($edition['items']) . " articles.\n";
