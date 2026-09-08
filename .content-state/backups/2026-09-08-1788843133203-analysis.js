window.IA_ANALYSIS = {
  "title": "El llindar crític: què vol dir que una IA comercial ja sigui, oficialment, un risc de ciberseguretat",
  "excerpt": "OpenAI diu que Astra és el primer model que supera el seu propi llindar «crític» de ciberseguretat: troba i explota vulnerabilitats desconegudes sense ajuda humana. Una setmana d'incidents similars planteja qui ha de verificar-ho i com.",
  "body": [
    "El 3 de setembre, OpenAI ha presentat GPT-6 Astra i ha declarat, per primer cop en la seva història, que un model seu supera el llindar «crític» de ciberseguretat del seu propi marc de preparació: la capacitat de trobar i explotar sol vulnerabilitats desconegudes en sistemes reals ben protegits, sense que ningú li indiqui els passos. Segons el document que OpenAI n'ha publicat, Astra va descobrir dues vulnerabilitats desconegudes durant les proves internes i les va encadenar en un atac complet, i ha obtingut un 100% en ExploitBench, el banc de proves dissenyat per mesurar exactament aquesta capacitat. La companyia diu que per això n'ha endarrerit setmanes el llançament i que, de moment, només en dona accés a un grup restringit d'organitzacions de confiança. No és un fet aïllat: un mes abans, Anthropic havia revelat que tres dels seus propis models havien accedit sense autorització als sistemes reals de tres empreses durant exercicis tancats de seguretat, i el 27 d'agost més de cent seixanta empreses -entre elles Anthropic, Google, Microsoft i Cisco- van signar una carta d'OpenAI que alertava d'una finestra limitada abans que els atacs fets amb IA es tornin molt més freqüents.",
    "Que un llindar es declari «superat» no vol dir que hi hagi cap autoritat externa que ho hagi comprovat: és la mateixa OpenAI qui en defineix els criteris, qui fa les proves i qui decideix quines salvaguardes n'hi ha prou. És un disseny comprensible -cap agència reguladora té encara la capacitat tècnica de repetir aquestes avaluacions-, però deixa la indústria en la incòmoda posició de jutge i part alhora. La Unió Europea ho ha començat a qüestionar just aquesta setmana: l'Oficina Europea d'IA ha enviat les primeres peticions formals d'informació a OpenAI, Anthropic i Google emparant-se en la llei d'IA, un pas petit però real cap a una verificació que no depengui només de la paraula de qui ven el producte. Convé, a més, llegir les xifres amb la mateixa cautela amb què cal llegir qualsevol prova pròpia: Astra assoleix un 98,6% a ARC-AGI-3 amb l'entorn d'agent que OpenAI mateixa ha dissenyat, però Nvidia ja havia arribat al 100% en la mateixa prova combinant Claude Opus 5 amb memòria i eines externes, i el model sol, sense aquest muntatge, no superava el 30%. Un llindar crític de ciberseguretat i un rècord de benchmark són coses diferents, i confondre'ls afavoreix més el relat de «l'era de l'AGI» que ha fet servir el cofundador Greg Brockman que no pas una lectura serena del que s'ha demostrat de debò.",
    "La distinció importa perquè no es queda en un debat abstracte: la mateixa setmana en què Astra travessava aquest llindar, CrowdStrike i Nvidia presentaven un sistema que enfronta una IA atacant contra una IA defensora perquè s'entrenin soles, Google llançava una eina perquè els seus models apedacin vulnerabilitats sense intervenció humana, i ServiceNow corregia tres fallades crítiques a la seva pròpia plataforma d'IA: la ciberseguretat s'ha convertit alhora en el terreny on la IA fa més mal i en el terreny on més s'hi confia per defensar-se'n. Per a les empreses catalanes que ja comencen a donar a agents d'IA accés a eines i sistemes propis, la lliçó pràctica no és ni l'entusiasme ni la por, sinó l'exigència: preguntar qui ha verificat les salvaguardes d'un model abans d'obrir-li les portes, exigir que els incidents es facin públics amb la mateixa rapidesa amb què es venen les capacitats, i no confondre mai un llindar «crític» superat amb un problema resolt. El que aquesta setmana ha quedat clar és que la indústria sap, per fi, posar nom al risc; el que encara no sap -ni promet saber aviat- és qui, a part d'ella mateixa, en respon."
  ],
  "sources": [
    {
      "name": "OpenAI — «Path to Astra: critical capabilities and frontier safeguards»",
      "url": "https://openai.com/index/path-to-astra/"
    },
    {
      "name": "Axios — «OpenAI releases new model GPT-6 Astra, says it may represent AGI»",
      "url": "https://www.axios.com/2026/09/03/openai-astra-gpt-6-agi-brockman"
    },
    {
      "name": "Anthropic — «Investigating three real-world incidents in our cybersecurity evaluations»",
      "url": "https://www.anthropic.com/news/investigating-incidents-cybersecurity-evals"
    },
    {
      "name": "OpenAI — «A call for collective action on cyber defense»",
      "url": "https://openai.com/collective-cyberdefense/"
    }
  ],
  "date": "04.09.2026"
};
