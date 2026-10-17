<?php
declare(strict_types=1);
// ---------------------------------------------------------------------------
// Butlletí: baixa amb un clic (17.10.2026).
// Cada butlletí porta un enllaç signat per a cada destinatari. El GET mostra el
// botó; la baixa es fa per POST (també el POST «List-Unsubscribe=One-Click» que
// fan Gmail i altres clients des del seu botó de baixa, RFC 8058).
// ---------------------------------------------------------------------------
require __DIR__ . '/inc/butlleti.php';

// ?r=1: enllaç de l'avís a la redacció per treure una alta dubtosa (signatura pròpia, «treu»).
if ((string) ($_REQUEST['r'] ?? '') === '1') {
    $correu = butlleti_valida_enllac('treu', (string) ($_REQUEST['e'] ?? ''), (string) ($_REQUEST['t'] ?? ''));
    if ($correu === null) {
        butlleti_pagina('Enllaç no vàlid', '<p>Aquest enllaç no és vàlid.</p>');
    }
    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        butlleti_canvia_estat($correu, 'exclos', 'treta per la redacció');
        butlleti_log('adreca treta per la redaccio ' . substr(sha1($correu), 0, 10));
        butlleti_pagina('Adreça treta', '<p><strong>' . butlleti_esc($correu) . '</strong> ja no rebrà el butlletí, i si es torna a apuntar no s\'hi afegirà.</p>');
    }
    butlleti_pagina('Treure una alta',
        '<p>Vols treure <strong>' . butlleti_esc($correu) . '</strong> de la llista del butlletí? No rebrà cap correu ni cap avís.</p>'
        . '<form method="post"><input type="hidden" name="e" value="' . butlleti_esc((string) $_REQUEST['e']) . '">'
        . '<input type="hidden" name="t" value="' . butlleti_esc((string) $_REQUEST['t']) . '"><input type="hidden" name="r" value="1">'
        . '<button type="submit">Sí, treu-la</button></form>');
}

$correu = butlleti_valida_enllac('baixa', (string) ($_REQUEST['e'] ?? ''), (string) ($_REQUEST['t'] ?? ''));
if ($correu === null) {
    butlleti_pagina('Enllaç no vàlid', '<p>Aquest enllaç de baixa no és vàlid. Si vols deixar de rebre el butlletí, respon qualsevol butlletí amb la paraula «baixa».</p>');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (butlleti_estat_de($correu) !== 'baixa') {
        butlleti_canvia_estat($correu, 'baixa', 'enllaç de baixa');
        butlleti_log('baixa ' . substr(sha1($correu), 0, 10));
        butlleti_correu_simple(BUTLLETI_REDACCIO, 'IA.cat: baixa del butlletí', [
            'Una persona s\'ha donat de baixa del butlletí amb l\'enllaç del correu i ja no el rebrà més.',
            'Correu: ' . $correu,
        ]);
    }
    butlleti_pagina('Baixa feta', '<p>Fet: ja no rebràs més «La setmana d\'IA, en cinc minuts». Si ha estat un error, et pots tornar a apuntar des del web quan vulguis.</p>');
}

butlleti_pagina('Donar-se de baixa',
    '<p>Vols deixar de rebre «La setmana d\'IA, en cinc minuts» a <strong>' . butlleti_esc($correu) . '</strong>?</p>'
    . '<form method="post"><input type="hidden" name="e" value="' . butlleti_esc((string) $_REQUEST['e']) . '">'
    . '<input type="hidden" name="t" value="' . butlleti_esc((string) $_REQUEST['t']) . '"><button type="submit">Sí, dona\'m de baixa</button></form>');
