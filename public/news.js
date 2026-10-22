window.IA_NEWS = [
  {
    "category": "CIBERSEGURETAT",
    "read": "5 MIN",
    "slug": "php2shell-falles-critiques-php-descobertes-amb-ia",
    "title": "Descobertes amb IA, dues falles crítiques de PHP permeten prendre el control de servidors sense contrasenya",
    "excerpt": "Wiz i l'empresa Calif, amb models de Google i OpenAI, han trobat dos errors presents en gairebé totes les versions de PHP. El pegat és disponible des d'ahir i l'NSA recomana aplicar-lo o desconnectar el servidor.",
    "sourceName": "Wiz Research",
    "sourceUrl": "https://www.wiz.io/blog/php2shell-php-rce",
    "sourceDate": "21 d'octubre de 2026",
    "body": "PHP és el llenguatge amb què funciona una part enorme del web: Wiz calcula que s'hi basa al voltant del 70% dels llocs, i és el motor de gestors de continguts com WordPress, Drupal o Joomla. Per això una falla a l'arrel de PHP no afecta una sola aplicació, sinó milers de servidors alhora.\n\nAquest dimecres 21 d'octubre, el projecte PHP ha publicat els pegats de dues vulnerabilitats, identificades com a CVE-2026-109618 i CVE-2026-109619, amb una gravetat de 9,2 sobre 10. Són errors de memòria que apareixen quan PHP gestiona errors fatals, sobretot quan es queda sense memòria: l'estat intern queda malmès i una petició posterior pot aprofitar-ho per llegir o alterar la memòria del servidor. Segons Wiz, l'atac permet executar codi sense autenticació i filtrar contrasenyes, claus d'API o certificats, i l'equip el va demostrar contra les imatges de contenidor més recents de WordPress, Drupal i Joomla. Wiz va fer servir el seu agent Wiz Atlas, Gemini 4 Argon i GPT-5.6 Sol; l'empresa de seguretat Calif, dins la iniciativa «Patch the Planet» d'OpenAI, va trobar una de les falles amb GPT-5.6 Sol. Wiz data el descobriment el 19 d'agost i l'avís al projecte PHP el 24 d'agost.\n\nSegons TechCrunch, l'Agència de Seguretat Nacional dels Estats Units (NSA) ha avisat que, si un servidor no es pot actualitzar de seguida, s'ha de desconnectar fins que ho estigui. L'errada afecta versions des de PHP 5.4, i la recomanació és actualitzar a versions amb el pegat, com la 8.5.12. Wiz adverteix que la IA fa baixar la dificultat d'aquest tipus de troballes, també per a qui vulgui atacar, mentre que Google DeepMind hi veu una prova que la IA de frontera pot ser decisiva per a la defensa.\n\nHi ha límits clars. Ni Wiz ni OpenAI no han informat de cap explotació en circumstàncies reals: les proves d'atac són les que han fet els mateixos investigadors. Les versions de PHP 8.1 i anteriors ja no reben suport del projecte, de manera que molts servidors antics depenen de còpies d'adaptació mantingudes per tercers o d'una migració que costa temps. I algunes webs secundàries atribueixen l'avís també a l'FBI o a altres governs, un detall que TechCrunch no confirma.",
    "image": "./assets/php2shell-falles-critiques-php-descobertes-amb-ia-20261022.jpg"
  },
  {
    "category": "EMPRESES",
    "read": "4 MIN",
    "slug": "openai-models-google-cloud-model-garden",
    "title": "OpenAI porta els seus models a Google Cloud, que ja ofereix també Gemini i Claude",
    "excerpt": "Els clients de Google Cloud podran comprar els models de frontera i els fluxos de treball de Codex d'OpenAI al Model Garden. L'accés des d'Antigravity i de l'agent Gemini arribarà «aviat».",
    "sourceName": "PYMNTS",
    "sourceUrl": "https://www.pymnts.com/news/artificial-intelligence/2026/openai-brings-its-frontier-ai-models-to-google-cloud/",
    "sourceDate": "21 d'octubre de 2026",
    "body": "Durant anys, la relació d'OpenAI amb els núvols va dependre de Microsoft. Aquesta exclusivitat va acabar, i segons el mitjà The Decoder, Amazon va començar a oferir els models d'OpenAI a l'abril. Ara se suma un altre dels grans: Google.\n\nEl 21 d'octubre, OpenAI i Google han anunciat una aliança perquè els models de frontera d'OpenAI i els fluxos de treball de Codex, el seu agent de programació, estiguin disponibles al Model Garden de Google Cloud. Els clients hi tindran accés «natiu» per construir fluxos d'agents a gran escala, amb la governança de dades i la infraestructura de Google Cloud, i podran comprar-los des d'aquest catàleg. L'accés des de Google Antigravity i des de l'agent de Gemini es dona com a «proper». Segons un recull de Fox News, les dades dels clients no s'utilitzaran per entrenar els models.\n\nAmb aquest pas, Google Cloud és l'únic gran proveïdor que ofereix models de les tres empreses: els seus propis Gemini, Claude d'Anthropic i ara els d'OpenAI. Segons Reuters, citat per PYMNTS, el conseller delegat de Google Cloud, Thomas Kurian, defensa que la plataforma és oberta a qualsevol model popular entre els desenvolupadors. Reuters hi afegeix que els núvols s'han convertit en el canal comercial principal dels laboratoris: segons el document de sortida a borsa d'Anthropic, el 47% dels seus ingressos del 2025 van venir dels núvols d'Amazon i de Google.\n\nLes fonts no detallen quins models concrets arriben ni a partir de quan estaran disponibles per a tothom, i tampoc no expliquen les condicions econòmiques, com ara el percentatge que Google es queda de cada venda. Convé esperar els anuncis oficials de preus i de disponibilitat abans de valorar-ne l'abast real.",
    "image": "./assets/openai-models-google-cloud-model-garden-20261022.jpg"
  },
  {
    "category": "TECNOLOGIA",
    "read": "3 MIN",
    "slug": "anthropic-claude-duet-agent-personal-proactiu",
    "title": "Anthropic estrena Claude Duet, un agent personal que treballa en segon pla, per a una llista d'espera als Estats Units",
    "excerpt": "L'aplicació, en vista prèvia de recerca, es basa en Opus 5.5 i s'executa en una màquina virtual pròpia: prepara una llista de prioritats al matí i avisa quan alguna cosa requereix atenció.",
    "sourceName": "Lowyat.NET",
    "sourceUrl": "https://www.lowyat.net/2026/408109/anthropic-claude-duet-personal-agent/",
    "sourceDate": "22 d'octubre de 2026",
    "body": "Els agents d'IA que no esperen que els parlin, sinó que prenen la iniciativa, són la nova batalla entre els grans laboratoris: Meta té Muse i OpenAI, Dots. Anthropic hi entra ara amb Claude Duet, segons explica el mitjà tecnològic Lowyat.NET.\n\nDuet és una aplicació independent per a Android i iOS, en vista prèvia de recerca, que es basa en Opus 5.5 i aprofita el compte de Claude de l'usuari: la memòria, les habilitats i les aplicacions connectades. S'executa en una màquina virtual pròpia, per això pot treballar en segon pla sense tenir cap sessió de Claude oberta. Cada matí elabora una llista breu de tasques prioritàries a partir de les dades de les aplicacions connectades, durant el dia vigila aplicacions i missatges i avisa quan cal atenció, i també fa encàrrecs com programar reunions o crear aplicacions.\n\nLa clau, segons el mitjà, és el control: Duet demana permís abans d'accions com fer un pagament o enviar un correu. Anthropic afegeix un classificador nou i un missatge de sistema pensats per evitar filtracions de dades sensibles; rebutja sol·licituds de la informació més delicada, com els números de targeta, no veu directament les contrasenyes ni les credencials d'inici de sessió, i comparteix altres dades sensibles només si l'usuari ho indica expressament.\n\nPer ara l'accés és només per a alguns subscriptors dels Estats Units, amb llista d'espera. La informació prové d'un únic mitjà secundari: no hem pogut localitzar l'anunci oficial d'Anthropic, que diu que donarà més detalls de seguretat més endavant. L'article mateix adverteix que un agent que demana tantes dades personals pot no encaixar amb qui prioritza la privadesa.",
    "image": "./assets/anthropic-claude-duet-agent-personal-proactiu-20261022.jpg"
  },
  {
    "category": "TECNOLOGIA",
    "read": "3 MIN",
    "slug": "gemini-personal-intelligence-android-auto-espanya",
    "title": "Google porta Gemini al cotxe amb accés a Gmail i al calendari, però a Espanya haurà d'esperar",
    "excerpt": "Gemini amb Personal Intelligence arriba a Android Auto i, en pocs mesos, als cotxes amb Android Automotive. L'Espai Econòmic Europeu en queda fora per les normes de privadesa.",
    "sourceName": "El Nacional",
    "sourceUrl": "https://www.elnacional.cat/ca/tecnologia/gemini-llegira-teu-gmail-teu-calendari-cotxe-pero-espanya-haura-esperar_1712995_102.html",
    "sourceDate": "21 d'octubre de 2026",
    "body": "Parlar amb l'assistent mentre es condueix és una de les promeses més antigues dels cotxes connectats. Google hi afegeix ara un pas: que l'assistent no només respongui, sinó que sàpiga què hi ha a la safata d'entrada i a l'agenda del conductor.\n\nSegons l'anunci de Google que recull El Nacional, Gemini amb Personal Intelligence arriba primer a Android Auto. Amb l'autorització prèvia de l'usuari, aquest assistent de veu mans lliures podrà consultar informació d'aplicacions com Gmail, Calendar, la Cerca, Google Fotos, Maps i YouTube. Els cotxes amb Android Automotive el rebran «en els pròxims mesos». Els usuaris de CarPlay no tindran la funció completa, però trobaran una icona de Gemini a Google Maps per activar l'assistent.\n\nEl desplegament és global, per a majors de 18 anys amb comptes personals compatibles, però no inclou Espanya: segons el mateix article, l'Espai Econòmic Europeu queda exclòs per normes de privadesa com el reglament de protecció de dades. Els conductors espanyols tindran les funcions habituals de Gemini al cotxe, sense la integració de dades entre aplicacions.\n\nEl text no dona una data de llançament concreta ni explica quan podrà arribar la funció a Europa. Tampoc no detalla quines dades guarda o processa Google quan el conductor fa una consulta, un aspecte clau per valorar l'impacte en la privadesa.",
    "image": "./assets/gemini-personal-intelligence-android-auto-espanya-20261022.jpg"
  },
  {
    "category": "EMPRESES",
    "read": "3 MIN",
    "slug": "stubbs-long-term-benefit-trust-anthropic",
    "title": "El físic Christopher Stubbs, antic degà de ciències de Harvard, s'incorpora al fideïcomís de govern d'Anthropic",
    "excerpt": "Anthropic ha anunciat que Stubbs entra al Long-Term Benefit Trust, l'òrgan que pot nomenar la majoria del consell d'administració de l'empresa.",
    "sourceName": "Anthropic",
    "sourceUrl": "https://www.anthropic.com/news",
    "sourceDate": "21 d'octubre de 2026",
    "body": "Anthropic es va constituir com una empresa d'interès públic i, a més, va crear una figura poc habitual al sector: el Long-Term Benefit Trust, un fideïcomís format per persones sense interessos econòmics a l'empresa que vetlla perquè les decisions no se supeditin només al benefici.\n\nEl 21 d'octubre, Anthropic ha anunciat que el físic Christopher Stubbs, antic degà de ciències de la Universitat Harvard, s'hi incorpora. L'empresa destaca la seva experiència en cosmologia observacional i en mesura de precisió. Segons un recull de Fox News sobre l'actualitat de la IA d'aquell dia, aquest fideïcomís té la facultat de nomenar la majoria del consell d'administració.\n\nLa notícia arriba pocs dies després que Anthropic anunciés, el 18 d'octubre, que destinarà una part de les seves accions a un nou fons d'interès públic, i en plena preparació de la sortida a borsa de l'empresa. En aquest context, la composició de l'òrgan que controla el consell d'administració interessa als inversors i als reguladors.\n\nLa informació de què disposem és la breu nota del web d'Anthropic i el resum d'un mitjà: no hi ha detalls sobre el procés de selecció ni sobre si Stubbs substitueix algú o amplia el fideïcomís. Tampoc no es pot saber, per ara, quina influència real tindrà sobre les decisions de l'empresa.",
    "image": "./assets/stubbs-long-term-benefit-trust-anthropic-20261022.jpg"
  }
];
