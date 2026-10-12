window.IA_NEWS = [
  {
    "category": "TECNOLOGIA",
    "read": "4 MIN",
    "slug": "anthropic-claude-1000-agents-fluxos-dinamics",
    "title": "Anthropic deixa que un agent de Claude en dirigeixi fins a 1.000 més a la vegada, i en una prova troba 66 de 70 errors",
    "excerpt": "Els «fluxos dinàmics» de Claude Managed Agents reparteixen una tasca entre molts subagents. En la prova de l'empresa, un sol agent en trobava entre 14 i 27.",
    "sourceName": "The Decoder (a partir de la documentació d'Anthropic)",
    "sourceUrl": "https://the-decoder.com/anthropics-claude-can-now-orchestrate-up-to-1000-ai-agents-in-parallel-through-dynamic-workflows/",
    "sourceDate": "9 d'octubre de 2026",
    "body": "Els agents d'IA treballen cada cop més en equip: un en fa de cap, planifica la feina i la reparteix entre altres agents més petits. Anthropic acaba d'afegir aquesta manera de treballar a Claude Managed Agents, el servei amb què les empreses configuren i executen agents de Claude, sota el nom de «fluxos dinàmics» (dynamic workflows).\n\nSegons The Decoder, que cita la documentació de l'empresa, un agent principal elabora un pla, assigna tasques a subagents i després en fusiona els resultats. Cada execució pot fer treballar fins a 1.000 agents en paral·lel. Per provar-ho, Anthropic va amagar 70 errors en un codi de 116.000 línies: un sol agent en trobava entre 14 i 27 per execució, mentre que el flux dinàmic en va detectar 66 de manera constant. Es pot activar escollint el tipus d'agent «multiagent_20261001».\n\nLa promesa és poder encarregar a la IA feines grans, com revisar una base de codi sencera, que un sol agent no acaba de cobrir. Això s'afegeix a la tendència de les últimes setmanes, amb productes que deleguen la feina a subagents, com el d'empresa de Google de fa tres dies.\n\nCal llegir-ho amb cautela. És una prova de la mateixa empresa, amb errors plantats a propòsit, i no se sap si la millora es manté en altres tipus de tasques. Anthropic avisa que aquests fluxos poden gastar molts tokens (les unitats en què es mesura el consum d'un model) i recomana començar amb proves petites; un enginyer d'OpenAI citat per The Decoder ja ha qualificat els eixams d'agents de malbaratament de recursos. L'article no indica el preu.",
    "image": "./assets/anthropic-claude-1000-agents-fluxos-dinamics-20261012.jpg"
  },
  {
    "category": "CIÈNCIA",
    "read": "4 MIN",
    "slug": "lace-ia-disseny-algorismes-nature-machine-intelligence",
    "title": "Una IA dissenya en una hora i per menys de 10 dòlars programes per planificar rutes de remolcadors i terminals de contenidors",
    "excerpt": "Un equip de Singapur publica a «Nature Machine Intelligence» un sistema que, a partir d'una descripció en llenguatge natural, construeix algorismes que arriben al 97%-99% del millor resultat.",
    "sourceName": "Nature Machine Intelligence (via Tech Xplore, NTU Singapur)",
    "sourceUrl": "https://techxplore.com/news/2026-10-ai-custom-decision-software-hour.html",
    "sourceDate": "9 d'octubre de 2026",
    "body": "Els problemes d'optimització, com decidir en quin ordre ha de moure els contenidors una terminal portuària o quines rutes han de fer els remolcadors, se solen resoldre amb programes fets a mida per especialistes, un encàrrec que pot trigar mesos. Un equip de la Universitat Tecnològica de Nanyang (NTU), a Singapur, proposa que ho faci un model de llenguatge, i ho ha publicat a la revista revisada per parells «Nature Machine Intelligence» (DOI 10.1038/s42256-026-01307-8).\n\nEl sistema, anomenat LACE, parteix d'una descripció del problema escrita en llenguatge corrent. Primer el divideix en peces amb normes ben definides i després fa «evolucionar» un equip d'heurístiques (receptes de càlcul aproximades) que es complementen entre si, les avalua i les va afinant. En quatre problemes marítims nous, LACE va arribar al 97%-99% del millor resultat de qualsevol dels mètodes provats, amb una hora de treball i menys de 10 dòlars de còmput per problema. Segons l'article, altres sistemes basats en models de llenguatge, com FunSearch de Google, no van aconseguir produir algorismes viables per a aquests casos.\n\nSi es confirma en altres àmbits, podria abaratir molt l'accés a programes d'optimització per a ports, hospitals o empreses de logística que no poden pagar un desenvolupament a mida. Els autors defensen que un bon disseny del sistema pot comptar més que un model més gros.\n\nLes limitacions són clares. L'avaluació cobreix només quatre problemes del món marítim; l'ús per reassignar llits d'hospital és una aplicació futura, no una prova feta, i la comparació amb «mesos» i «centenars de milers de dòlars» del desenvolupament tradicional és una estimació dels autors, no una mesura.",
    "image": "./assets/lace-ia-disseny-algorismes-nature-machine-intelligence-20261012.jpg"
  },
  {
    "category": "CIÈNCIA",
    "read": "4 MIN",
    "slug": "yale-microsoft-models-llenguatge-rols-continguts-preprint",
    "title": "Un estudi de Yale i Microsoft apunta que els models de llenguatge organitzen la informació per rols i continguts, com una gramàtica",
    "excerpt": "Els autors van substituir la representació interna de set grans models per una estructura de «rol i contingut» i el comportament gairebé no va canviar. És una prepublicació.",
    "sourceName": "arXiv (via Tech Xplore, Universitat Yale)",
    "sourceUrl": "https://techxplore.com/news/2026-10-neural-network-ai-chatbots-humans.html",
    "sourceDate": "9 d'octubre de 2026",
    "body": "Per què un model de llenguatge és capaç de fer una resta, seguir una regla lògica o entendre quin adjectiu qualifica quin nom? Per dins, només té llargues llistes de nombres, anomenades vectors, i ningú no sap del tot com hi codifica el significat. Un equip de la Universitat Yale, la de Nova York i Microsoft proposa una pista concreta.\n\nEl treball, liderat per Tom McCoy, de Yale, amb Paul Soulos i Paul Smolensky (Microsoft), i Tal Linzen (NYU), és una prepublicació a arXiv (2608.29530) i, per tant, encara no està revisada per parells. Els autors van analitzar xarxes petites entrenades per manipular llistes i set grans models de llenguatge, sense que la nota en citi els noms, en quatre àmbits: llenguatge, aritmètica, lògica i programació. Hi van substituir les representacions internes per unes altres basades en «farcits» i «rols», una estructura que separa què és una cosa de quina funció hi fa, com en una frase s'hi distingeix el qui i el què. El comportament dels models va canviar poc. I quan editaven aquestes representacions a mà, les respostes canviaven de manera previsible: en un exemple, retocar el vector de «llest» feia que el model l'apliqués a l'objecte i no al subjecte.\n\nLes conclusions dels autors són que els models «convergeixen de manera natural» cap a aquesta estructura. Si és així, ajudaria a obrir la «caixa negra» dels models i a entendre per què fallen.\n\nCal ser prudent: és un resultat sense revisar, la nota no detalla els models ni les proves, i el mateix McCoy admet que el treball «només grata la superfície» del que cal estudiar per entendre com les xarxes neuronals codifiquen la informació.",
    "image": "./assets/yale-microsoft-models-llenguatge-rols-continguts-preprint-20261012.jpg"
  },
  {
    "category": "ECONOMIA",
    "read": "3 MIN",
    "slug": "nvidia-negocia-comprar-reflection-ai",
    "title": "Nvidia negocia comprar Reflection AI, la startup d'IA oberta en què ja ha invertit 800 milions de dòlars, segons el «Financial Times»",
    "excerpt": "Les converses són en una fase inicial i podrien acabar en una compra completa o en una inversió més gran, amb un possible acord en qüestió de setmanes.",
    "sourceName": "Ara (a partir del «Financial Times»)",
    "sourceUrl": "https://www.ara.cat/economia/tecnologia/nvidia-negocia-comprar-negoci-d-ia-codi-obert_25_5876184.html",
    "sourceDate": "11 d'octubre de 2026",
    "body": "Nvidia, la fabricant de xips que és avui l'empresa més valuosa del món, estudia comprar Reflection AI, una startup nord-americana que desenvolupa models d'IA de codi obert i agents de programació. Ho avança el «Financial Times», i ho recull el diari Ara l'11 d'octubre.\n\nSegons aquesta informació, les converses són en una fase inicial i podrien acabar tant en una compra completa com en una inversió més gran que l'actual; un acord podria arribar en qüestió de setmanes. Nvidia ja havia invertit uns 800 milions de dòlars a Reflection, segons el mateix relat. L'article no n'indica el preu.\n\nL'operació s'entén en el context de l'aposta de Nvidia per la IA oberta. Reflection és la startup que el 6 d'octubre va presentar Beam, un model obert de 501.000 milions de paràmetres pensat per plantar cara als models xinesos com DeepSeek i Qwen. Per a Nvidia, que els models oberts s'estenguin vol dir més demanda de potència de càlcul, que és el seu negoci.\n\nNo hi ha confirmació de cap de les dues empreses, i tot el que se sap prové de fonts no identificades citades pel diari britànic; ni el calendari ni el model de l'operació no són segurs. Tampoc no hi ha detalls sobre com encaixaria Reflection dins de Nvidia ni sobre què en pensaria un regulador.",
    "image": "./assets/nvidia-negocia-comprar-reflection-ai-20261012.jpg"
  },
  {
    "category": "SOCIETAT",
    "read": "4 MIN",
    "slug": "segells-llibres-escrits-per-humans-fira-frankfurt",
    "title": "Els segells de «llibre escrit per humans» es multipliquen després dels casos d'autors sospitosos d'haver fet servir la IA",
    "excerpt": "A la Fira del Llibre de Frankfurt es van presentar iniciatives del Regne Unit, França i Alemanya. Als Estats Units, uns 6.500 títols porten ja el distintiu de l'Authors Guild.",
    "sourceName": "AFP (via Tech Xplore)",
    "sourceUrl": "https://techxplore.com/news/2026-10-human-authored-gain-ground-ai.html",
    "sourceDate": "10 d'octubre de 2026",
    "body": "El sector del llibre no té manera fàcil de saber si una novel·la l'ha escrit una persona. Per això es multipliquen els segells que certifiquen una «creació humana», segons una crònica d'AFP signada per Sam Reeves, que situa el debat a la Fira del Llibre de Frankfurt, la més gran del sector, on es van presentar iniciatives del Regne Unit, França i Alemanya.\n\nA França, l'editorial d'autopublicació Librinova, cofundada per Charlotte Allibert, passa les obres per programes de detecció d'IA i per una entrevista amb un auditor; unes 200 han rebut el segell. Al Regne Unit, Books By People, cofundada per Esme Dennys, ha registrat una marca de certificació i admet un ús limitat de la IA, per exemple per corregir ortografia. Als Estats Units, el distintiu «human authored» de l'Authors Guild és d'autocertificació i en porten uns 6.500 títols.\n\nEl detonant són dos casos recents. Al setembre, un compte anònim va acusar de fer servir IA l'escriptor haitianocanadenc Thelyson Orelien amb la novel·la «It Was Either That or Die», a partir de pàgines web de detecció; ell ho nega i diu que l'ataquen per racisme, però va quedar fora d'un gran premi literari francès. Abans, Hachette va cancel·lar la publicació de «Shy Girl» de Mia Ballard per presumpta IA; l'autora diu que va ser una persona contractada per editar-la.\n\nEls segells tenen límits. Mesuren coses diferents, permeten una part d'IA i es poden eludir, i hi ha qui és escèptic de les etiquetes: el responsable de la patronal alemanya, Sebastian Guggolz, recorda que «no hi ha un simple amb IA o sense IA». I els detectors d'IA, base d'alguna de les acusacions, són poc fiables.",
    "image": "./assets/segells-llibres-escrits-per-humans-fira-frankfurt-20261012.jpg"
  }
];
