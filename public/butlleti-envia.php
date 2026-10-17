<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Butlletí: envia les edicions pendents (17.10.2026). Vegeu inc/butlleti.php.
//
// No porta cap clau: qualsevol crida només fa el que ja tocava fer (enviar les
// edicions de data/butlleti/ que encara no s'han enviat) i no pot repetir mai
// una edició. La crida el workflow desplega.yml just després de cada
// desplegament; si es talla a mitges, la passada següent continua on era.
// La resposta no conté cap adreça.
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/butlleti.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Robots-Tag: noindex, nofollow');
@set_time_limit(240);
ignore_user_abort(true);

echo json_encode(['ok' => true, 'edicions' => butlleti_processa()], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
