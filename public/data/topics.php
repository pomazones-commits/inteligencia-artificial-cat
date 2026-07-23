<?php
declare(strict_types=1);

// Taxonomia de lectura. Aquest fitxer només classifica el contingut ja publicat;
// no participa en la generació ni modifica cap contracte del Content Hub.
return [
    'catalunya' => [
        'title' => 'Intel·ligència artificial a Catalunya',
        'short' => 'IA a Catalunya',
        'description' => 'Projectes, empreses, recerca, institucions i impacte territorial de la intel·ligència artificial a Catalunya.',
        'categories' => ['CATALUNYA'],
        'resources' => [
            ['label' => 'Documents oficials', 'title' => 'Estratègies i informes d’IA a Catalunya', 'description' => 'La documentació pública de la Generalitat i els seus organismes, reunida i ordenada.', 'url' => '/dossiers.html'],
        ],
    ],
    'tecnologia' => [
        'title' => 'Tecnologia i models d’intel·ligència artificial',
        'short' => 'Tecnologia',
        'description' => 'Models, agents, programari, robòtica i avenços tècnics explicats amb context i en català.',
        'categories' => ['TECNOLOGIA'],
    ],
    'empresa-i-treball' => [
        'title' => 'IA, empresa i treball',
        'short' => 'Empresa i treball',
        'description' => 'Com la intel·ligència artificial transforma empreses, professions, inversió, productivitat i mercat laboral.',
        'categories' => ['MERCATS', 'INVERSIÓ'],
    ],
    'politica-i-governanca' => [
        'title' => 'Política, regulació i governança de la IA',
        'short' => 'Política i governança',
        'description' => 'Lleis, institucions, geopolítica, drets i decisions públiques que defineixen el desenvolupament de la IA.',
        'categories' => ['POLÍTICA', 'GOVERNANÇA'],
        'resources' => [
            ['label' => 'Guia oficial · PDF', 'title' => 'Criteris d’ús de la IA generativa a l’Administració', 'description' => 'Principis, límits, supervisió humana i protecció de dades al sector públic català.', 'url' => '/dossiers/criteris-ia-generativa-2025.pdf'],
        ],
    ],
    'seguretat' => [
        'title' => 'Seguretat i riscos de la intel·ligència artificial',
        'short' => 'Seguretat',
        'description' => 'Ciberseguretat, vulnerabilitats, privacitat, avaluacions i riscos dels sistemes d’intel·ligència artificial.',
        'categories' => ['SEGURETAT'],
        'resources' => [
            ['label' => 'Recurs oficial', 'title' => 'IA i decisions automatitzades', 'description' => 'Informació de l’Autoritat Catalana de Protecció de Dades sobre intel·ligència artificial.', 'url' => 'https://apdcat.gencat.cat/ca/documentacio/intelligencia_artificial/'],
        ],
    ],
    'societat-i-cultura' => [
        'title' => 'IA, societat i cultura',
        'short' => 'Societat i cultura',
        'description' => 'Impacte social, cultura, llengua, creativitat, drets d’autor i vida quotidiana en l’era de la IA.',
        'categories' => ['SOCIETAT'],
    ],
    'infraestructura-i-energia' => [
        'title' => 'Infraestructura, xips i energia per a la IA',
        'short' => 'Infraestructura i energia',
        'description' => 'Centres de dades, semiconductors, computació i energia: la infraestructura material de la intel·ligència artificial.',
        'categories' => ['INFRAESTRUCTURA'],
    ],
];
