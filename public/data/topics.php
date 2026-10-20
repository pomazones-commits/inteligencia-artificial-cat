<?php
declare(strict_types=1);

// Taxonomia de lectura: els EIXOS TEMÀTICS (des del 20.10.2026, decisió d'en Rafael).
//
// Sis eixos transversals que agrupen els divuit temes sobre els quals en Rafael
// escriu a Masticadores, més «Novetats, models i productes» (el flux de notícies de
// producte, que no és un eix de col·laboracions) i la pàgina territorial «IA a
// Catalunya». Cada eix té pàgina pròpia a /tema/<clau> (tema.php) i cada notícia i
// cada peça signada en porta l'etiqueta (article.php, peca.php).
//
// Com s'assigna l'eix: inc/eixos.php (iacat_eix). Ordre: camp «eix» explícit de la
// peça → data/eixos-peces.json → paraules «fortes» → categoria → paraules → recanvi.
// Aquest fitxer només classifica el contingut ja publicat; no participa en la
// generació ni modifica cap contracte del Content Hub.
//
//   'tipus'      'eix' (eix temàtic), 'novetats' (només notícies) o 'territori'.
//   'temes'      els temes de Masticadores que aplega (es mostren a la pàgina).
//   'categories' categories del Content Hub que hi van directament.
//   'fortes'     expressions que hi porten la peça sigui quina sigui la categoria.
//   'paraules'   expressions que hi porten la peça quan la categoria no decideix.
// Les expressions són regex PCRE sobre el títol + l'entradeta en minúscules.
// Antigues claus (fins al 20.10.2026): tema.php les redirigeix (301) a l'eix nou.
return [
    'poder-i-geopolitica' => [
        'tipus' => 'eix',
        'title' => 'Poder i geopolítica de la intel·ligència artificial',
        'short' => 'Poder i geopolítica',
        'description' => 'Geopolítica i sobirania tecnològica, regulació, governança, poder corporatiu i la militarització de la IA.',
        'temes' => ['Geopolítica i sobirania tecnològica', 'Regulació, governança i poder corporatiu', 'Militarització i guerra'],
        'categories' => ['POLÍTICA', 'GOVERNANÇA', 'REGULACIÓ', 'REGULACIO', 'GEOPOLÍTICA', 'DEFENSA', 'JUSTÍCIA', 'NORMATIVA', 'LLEI', 'LEGISLACIÓ', 'DRET', 'GOVERN', 'COMPETÈNCIA'],
        'fortes' => ['militar', 'pentàgon', 'departament de (defensa|guerra)', 'armes? autònom', 'robots? assassins?', 'drons? (militars?|de combat|armats?)', 'camps? de batalla', '\botan\b', 'sobirania (tecnològica|digital)'],
        'paraules' => ['\blleis?\b', 'regulaci', 'reglament', 'ai act', 'parlament', 'comissió europea', 'brussel·les', 'ministeri', 'geopolític', 'sobirania', 'antimonopoli', 'tribunals?', 'demand[ae]', 'jutge', 'democràci', 'eleccions'],
        'resources' => [
            ['label' => 'Guia oficial · PDF', 'title' => 'Criteris d’ús de la IA generativa a l’Administració', 'description' => 'Principis, límits, supervisió humana i protecció de dades al sector públic català.', 'url' => '/dossiers/criteris-ia-generativa-2025.pdf'],
        ],
    ],
    'economia-i-treball' => [
        'tipus' => 'eix',
        'title' => 'IA, economia i treball',
        'short' => 'Economia i treball',
        'description' => 'Empreses, indústria, inversió, xips, energia i centres de dades, i com la IA transforma la feina, l’ocupació i la desigualtat.',
        'temes' => ['Economia, indústria i infraestructures', 'Treball, ocupació i desigualtat'],
        'categories' => ['EMPRESA', 'EMPRESES', 'MERCATS', 'INVERSIÓ', 'INFRAESTRUCTURA', 'XIPS', 'ECONOMIA', 'TREBALL', 'NEGOCI', 'NEGOCIS', 'FINANCES', 'ENERGIA', 'MERCAT LABORAL', 'INDÚSTRIA', 'COMERÇ', 'CENTRES DE DADES', 'MAQUINARI', 'ADQUISICIONS', 'ADOPCIÓ', 'CONSUM', 'MOBILITAT'],
        'fortes' => ['llocs de treball', 'mercat laboral', 'acomiad', 'desocupaci', 'atur\b', 'sindicat'],
        'paraules' => ['empres', 'inversi', 'milions', 'startup', 'start-up', '\bfeina', 'treball', 'ocupaci', 'ingressos', 'borsa', 'centres? de dades', '\bxips?\b', 'semiconductor', 'energia', 'indústri', '\bpimes?\b', 'econom', 'turisme', 'banca', 'comerç'],
    ],
    'ciencia-salut-i-robotica' => [
        'tipus' => 'eix',
        'title' => 'Ciència, salut i robòtica',
        'short' => 'Ciència, salut i robòtica',
        'description' => 'La IA a la recerca científica, la medicina i la salut pública, i la robòtica i la IA física.',
        'temes' => ['Salut i medicina', 'Ciència i recerca', 'Robòtica i IA física'],
        'categories' => ['CIÈNCIA', 'CIENCIA', 'SALUT', 'RECERCA', 'ROBÒTICA', 'BIOTECNOLOGIA', 'MATEMÀTIQUES', 'MEDIAMBIENT'],
        'fortes' => ['humanoide', 'robòtica', '\brobots?\b'],
        'paraules' => ['salut', 'hospital', 'metges?\b', 'pacient', 'càncer', 'clínic', 'diagnòstic', 'medicament', 'fàrmac', 'recerca', 'investigador', 'científic', 'laboratori', 'genom', 'proteïn', 'física', 'química', 'astron', 'clima', 'matemàti', 'neurocièn'],
    ],
    'riscos-seguretat-i-drets' => [
        'tipus' => 'eix',
        'title' => 'Riscos, seguretat i drets',
        'short' => 'Riscos, seguretat i drets',
        'description' => 'AGI, superintel·ligència i risc existencial, la seguretat dels agents autònoms, la ciberseguretat, la privacitat i la vigilància.',
        'temes' => ['AGI, superintel·ligència i risc existencial', 'Seguretat i riscos dels agents autònoms', 'Privacitat i vigilància'],
        'categories' => ['SEGURETAT', 'CIBERSEGURETAT', 'PRIVACITAT', 'VIGILÀNCIA'],
        'fortes' => ['superintel·lig', '\bagi\b', 'risc existencial', 'alineament', 'extinció', 'reconeixement facial', 'vigilància massiva'],
        'paraules' => ['ciberseguretat', 'ciberatac', 'ciberestaf', 'hackers?', 'vulnerabilitat', 'privacitat', 'privadesa', 'dades personals', 'vigilància', 'deepfake', 'ultrafals', '\bfrau', 'estaf', 'seguretat', '\brisc(os)?\b'],
        'resources' => [
            ['label' => 'Informe oficial · PDF', 'title' => 'Intel·ligència artificial i decisions automatitzades a Catalunya', 'description' => 'L’informe de l’Autoritat Catalana de Protecció de Dades (2020): més de 50 exemples d’algorismes que decideixen, els seus riscos i recomanacions.', 'url' => '/dossiers/apdcat-decisions-automatitzades-2020.pdf'],
        ],
    ],
    'ment-etica-i-humanisme' => [
        'tipus' => 'eix',
        'title' => 'Ment, ètica i humanisme',
        'short' => 'Ment, ètica i humanisme',
        'description' => 'Consciència, ment i filosofia de la intel·ligència artificial, i l’ètica, la religió i l’humanisme davant les màquines.',
        'temes' => ['Consciència, ment i filosofia', 'Ètica, religió i humanisme'],
        'categories' => [],
        'fortes' => ['consciènci', 'filosof', 'filòsof', '\bètic', '\bmoral', 'religi', '\bpapa\b', 'vatica', 'humanisme', 'algorètica', 'dignitat humana'],
        'paraules' => ['\bment\b', 'emocions?', 'sentiments?'],
    ],
    'societat-cultura-i-educacio' => [
        'tipus' => 'eix',
        'title' => 'Societat, cultura i educació',
        'short' => 'Societat, cultura i educació',
        'description' => 'Impacte social, afectes i pensament crític, cultura, creació i drets d’autor, llengua i educació en l’era de la IA.',
        'temes' => ['Societat, afectes i pensament crític', 'Cultura, creació i drets d’autor', 'Educació'],
        'categories' => ['SOCIETAT', 'CULTURA', 'EDUCACIÓ', 'INDÚSTRIA MUSICAL', 'IA I SOCIETAT', 'MITJANS', 'OPINIÓ'],
        'fortes' => ['drets d.autor', 'escol(a|es)\b', 'alumn', '\baul(a|es)\b'],
        'paraules' => ['educaci', 'docent', 'professorat', 'cultura', 'artist', 'músic', 'cinema', 'pel·lícul', 'llibres?\b', 'periodis', 'mitjans', '\bllengua', 'català', 'xarxes socials', 'menors', 'joves', 'gènere', 'solitud', 'companyia'],
    ],
    'novetats-models-i-productes' => [
        'tipus' => 'novetats',
        'title' => 'Novetats, models i productes',
        'short' => 'Novetats i models',
        'description' => 'Els nous models, agents, aplicacions i eines d’intel·ligència artificial, explicats amb context i en català.',
        'temes' => ['Novetats, models i productes'],
        'categories' => ['TECNOLOGIA', 'PRODUCTE', 'PRODUCTES', 'MODELS', 'MODELS OBERTS', 'AGENTS', 'API', 'SOFTWARE'],
        'fortes' => [],
        'paraules' => [],
    ],
    'catalunya' => [
        'tipus' => 'territori',
        'title' => 'Intel·ligència artificial als territoris de parla catalana',
        'short' => 'IA a Catalunya',
        'description' => 'Projectes, empreses, recerca, institucions i impacte territorial de la intel·ligència artificial a Catalunya, la Comunitat Valenciana, les Illes Balears i Andorra.',
        'temes' => [],
        'categories' => ['CATALUNYA', 'COMUNITAT VALENCIANA', 'ILLES BALEARS', 'ANDORRA', 'CATALUNYA NORD'],
        'fortes' => [],
        'paraules' => [],
        'resources' => [
            ['label' => 'Documents oficials', 'title' => 'Estratègies i informes d’IA a Catalunya', 'description' => 'La documentació pública de la Generalitat i els seus organismes, reunida i ordenada.', 'url' => '/dossiers.html'],
        ],
    ],
];
