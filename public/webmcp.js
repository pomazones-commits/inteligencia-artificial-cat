/*
 * WebMCP — eines per a agents d'IA que treballen dins del navegador (11.10.2026).
 *
 * Què és: WebMCP és una proposta de la W3C (Community Group, esborrany de 2026)
 * perquè una pàgina declari «eines» que un agent integrat al navegador pot
 * cridar directament, en lloc d'haver de llegir la pantalla i clicar.
 * Chrome l'ofereix en prova d'origen (origin trial); la resta de navegadors,
 * de moment no. On no hi és, aquest fitxer no fa absolutament res.
 *
 * Què hi declarem: QUATRE eines de NOMÉS LECTURA sobre dades que el web ja
 * publica (data/articles.json, radar.js, data/arxiu.json, data/agenda.json).
 * Cap eina no escriu res, no envia formularis ni toca el butlletí, i tot es fa
 * dins del navegador del lector: cap petició a tercers, cap galeta ni
 * emmagatzematge (l'avís legal continua sent cert).
 *
 * Qui el carrega: shared.js (pàgines interiors) i index.html (portada).
 * Rutes ABSOLUTES a tot el fitxer: també s'executa a /tema/<slug>.
 *
 * API: document.modelContext.registerTool({name, description, inputSchema,
 * annotations, execute}). Fins a Chrome 149 vivia a navigator.modelContext:
 * es proven tots dos llocs. Els navegadors antics de la prova passaven els
 * arguments com a text JSON: també s'accepta.
 */
(() => {
  'use strict';
  if (window.__IACAT_WEBMCP__) return;
  const mc = (typeof document !== 'undefined' && document.modelContext) || (typeof navigator !== 'undefined' && navigator.modelContext);
  if (!mc || typeof mc.registerTool !== 'function') return;
  window.__IACAT_WEBMCP__ = true;

  const BASE = 'https://inteligencia-artificial.cat';
  const MAX_COS = 12000; // caràcters de cos per notícia: prou per llegir-la sencera

  // ── Utilitats ─────────────────────────────────────────────────────────────
  const cau = {};
  const json = ruta => (cau[ruta] ||= fetch(ruta, { credentials: 'omit' }).then(r => {
    if (!r.ok) throw new Error(`HTTP ${r.status} a ${ruta}`);
    return r.json();
  }).catch(e => { delete cau[ruta]; throw e; }));

  // Llegeix «window.VAR = …;» d'un fitxer de dades sense executar-lo
  // (mateixa lògica que iacat_llegeix_js d'inc/peces.php).
  const dadesJs = (ruta, variable) => (cau[ruta] ||= fetch(ruta, { credentials: 'omit' }).then(r => r.text()).then(text => {
    const re = new RegExp('^window\\.' + variable + '\\s*=\\s*', 'gm');
    let darrer = null, m;
    while ((m = re.exec(text))) darrer = m;
    if (!darrer) return null;
    const cos = text.slice(darrer.index + darrer[0].length).trim().replace(/;\s*$/, '');
    return cos === 'null' ? null : JSON.parse(cos);
  }).catch(e => { delete cau[ruta]; throw e; }));

  const args = entrada => {
    if (typeof entrada === 'string') { try { return JSON.parse(entrada) || {}; } catch { return {}; } }
    return entrada && typeof entrada === 'object' ? entrada : {};
  };
  const enter = (v, def, min, max) => {
    const n = Number.parseInt(v, 10);
    return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
  };
  const resposta = obj => JSON.stringify(obj, null, 1);
  const urlNoticia = slug => `${BASE}/article.php?slug=${encodeURIComponent(slug)}`;
  const urlAbs = ruta => !ruta ? '' : /^https?:/i.test(ruta) ? ruta : BASE + '/' + String(ruta).replace(/^\.?\//, '');

  // Mateix criteri que el cercador de l'hemeroteca (arxiu.html): sense accents
  // ni majúscules, i «l·l» equival a «ll».
  const fold = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/l[·.•ŀ]l/g, 'll').replace(/ŀl/g, 'll');
  const termes = consulta => {
    const out = [];
    String(consulta || '').replace(/"([^"]+)"|(\S+)/g, (_, frase, mot) => { const t = fold(frase || mot).trim(); if (t) out.push(t); return ''; });
    return out;
  };
  // DD.MM.AAAA → AAAA-MM-DD (les edicions de l'arxiu porten la data així).
  const iso = d => { const m = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(String(d || '')); return m ? `${m[3]}-${m[2]}-${m[1]}` : String(d || ''); };
  const avui = () => {
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    return p; // AAAA-MM-DD
  };

  const fitxa = (item, extra = {}) => ({
    titol: item.title || '',
    entradeta: item.excerpt || '',
    categoria: item.category || '',
    url: item.slug ? urlNoticia(item.slug) : '',
    slug: item.slug || '',
    font: item.sourceName || '',
    font_url: item.sourceUrl || '',
    data_font: item.sourceDate || '',
    ...extra
  });

  // ── Les eines ─────────────────────────────────────────────────────────────
  const eines = [
    {
      name: 'iacat_noticies_avui',
      description: "Notícies sobre intel·ligència artificial de l'edició d'avui d'IA.cat (en català): titular, entradeta, categoria, enllaç i font original de cadascuna, i opcionalment el radar de notícies de Catalunya. Per llegir-ne una sencera, fes servir iacat_llegeix_noticia amb l'slug.",
      inputSchema: {
        type: 'object',
        properties: {
          categoria: { type: 'string', description: "Filtra per categoria (p. ex. CIÈNCIA, SALUT, SEGURETAT, EMPRESA). Sense accents ni majúscules també val." },
          incloure_radar: { type: 'boolean', description: "Si és true (per defecte), afegeix «La IA que passa aquí», les notícies de Catalunya." },
          maxim: { type: 'integer', minimum: 1, maximum: 30, description: 'Nombre màxim de notícies (per defecte, totes: fins a 20).' }
        }
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async entrada => {
        const a = args(entrada);
        const edicio = await json('/data/articles.json');
        let items = (edicio.items || []).filter(i => i && i.slug && i.title);
        if (a.categoria) { const c = fold(a.categoria); items = items.filter(i => fold(i.category).includes(c)); }
        items = items.slice(0, enter(a.maxim, 30, 1, 30));
        const sortida = {
          web: 'intel·ligènciaartificial.cat',
          edicio_actualitzada: edicio.updatedAt || '',
          noticies: items.map(i => fitxa(i))
        };
        if (a.incloure_radar !== false) {
          const radar = await dadesJs('/radar.js', 'IA_RADAR').catch(() => null);
          sortida.radar_catalunya = (Array.isArray(radar) ? radar : []).map(r => ({
            titol: r.title || '', resum: r.summary || '', lloc: r.place || '', data: r.date || '',
            categoria: r.category || '', font: r.source || '', url: r.url || ''
          }));
        }
        return resposta(sortida);
      }
    },
    {
      name: 'iacat_llegeix_noticia',
      description: "Text sencer d'una notícia d'IA.cat (en català), d'avui o de l'hemeroteca, a partir del seu slug (el que torna iacat_noticies_avui o iacat_cerca_hemeroteca, o el paràmetre ?slug= de l'adreça article.php).",
      inputSchema: {
        type: 'object',
        properties: { slug: { type: 'string', description: "Identificador de la notícia, p. ex. 'google-amie-lancet-assaig-atencio-primaria-beth-israel'." } },
        required: ['slug']
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async entrada => {
        const slug = String(args(entrada).slug || '').trim().replace(/^.*[?&]slug=/, '').replace(/[&#].*$/, '');
        if (!slug) return resposta({ error: "Cal l'slug de la notícia." });
        let trobada = null, edicioData = '';
        const edicio = await json('/data/articles.json');
        trobada = (edicio.items || []).find(i => i && i.slug === slug) || null;
        if (trobada) edicioData = (edicio.updatedAt || '').slice(0, 10);
        if (!trobada) {
          const arxiu = await json('/data/arxiu.json');
          for (const ed of arxiu.editions || []) {
            const it = (ed.items || []).find(i => i && i.slug === slug);
            if (it) { trobada = it; edicioData = iso(ed.date); break; }
          }
        }
        if (!trobada) return resposta({ error: `No hi ha cap notícia amb l'slug «${slug}».` });
        const cos = Array.isArray(trobada.body) ? trobada.body.map(p => (typeof p === 'string' ? p : p?.text || '')).join('\n\n') : String(trobada.body || '');
        return resposta(fitxa(trobada, {
          edicio: edicioData,
          cos: cos.length > MAX_COS ? cos.slice(0, MAX_COS) + ' […]' : cos,
          imatge: urlAbs(trobada.image),
          autoria: 'Redacció IA.cat'
        }));
      }
    },
    {
      name: 'iacat_cerca_hemeroteca',
      description: "Cerca a l'hemeroteca d'IA.cat (totes les edicions anteriors de notícies sobre intel·ligència artificial, en català). Busca al titular, l'entradeta, la categoria, la font i el cos; ignora accents i majúscules i accepta frases entre cometes. Torna les coincidències de la més recent a la més antiga.",
      inputSchema: {
        type: 'object',
        properties: {
          consulta: { type: 'string', description: 'Paraules a buscar, en català. Totes han de sortir a la notícia. Exemple: "centre de dades" Tarragona' },
          categoria: { type: 'string', description: 'Opcional: limita a una categoria (CIÈNCIA, SALUT, POLÍTICA…).' },
          des_de: { type: 'string', description: "Opcional: data mínima de l'edició, AAAA-MM-DD." },
          fins_a: { type: 'string', description: "Opcional: data màxima de l'edició, AAAA-MM-DD." },
          maxim: { type: 'integer', minimum: 1, maximum: 25, description: 'Nombre màxim de resultats (per defecte 10).' }
        },
        required: ['consulta']
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async entrada => {
        const a = args(entrada);
        const t = termes(a.consulta);
        if (!t.length) return resposta({ error: 'Cal una consulta.' });
        const cat = a.categoria ? fold(a.categoria) : '';
        const maxim = enter(a.maxim, 10, 1, 25);
        const arxiu = await json('/data/arxiu.json');
        const resultats = [];
        let total = 0;
        for (const ed of arxiu.editions || []) {
          const data = iso(ed.date);
          if (a.des_de && data < a.des_de) continue;
          if (a.fins_a && data > a.fins_a) continue;
          for (const it of ed.items || []) {
            if (!it || !it.slug) continue;
            if (cat && !fold(it.category).includes(cat)) continue;
            const pallers = fold([it.title, it.excerpt, it.category, it.sourceName, typeof it.body === 'string' ? it.body : ''].join(' \n '));
            if (!t.every(x => pallers.includes(x))) continue;
            total++;
            if (resultats.length < maxim) resultats.push(fitxa(it, { edicio: data }));
          }
        }
        return resposta({ consulta: a.consulta, coincidencies: total, mostrades: resultats.length, resultats, hemeroteca: `${BASE}/arxiu.html?q=${encodeURIComponent(a.consulta)}` });
      }
    },
    {
      name: 'iacat_agenda',
      description: "Actes sobre intel·ligència artificial als territoris de parla catalana segons l'agenda d'IA.cat: congressos, jornades, cursos, trobades, hackatons i convocatòries, amb data, lloc, format, preu i enllaç oficial. Per defecte, només els que encara no han acabat, del més proper al més llunyà.",
      inputSchema: {
        type: 'object',
        properties: {
          territori: { type: 'string', enum: ['catalunya', 'comunitat-valenciana', 'illes-balears', 'andorra', 'catalunya-nord', 'en-linia'], description: 'Opcional: limita a un territori.' },
          tipus: { type: 'string', enum: ['congrés', 'jornada', 'fira', 'webinar', 'curs', 'hackató', 'trobada', 'convocatòria'], description: "Opcional: limita a un tipus d'acte." },
          des_de: { type: 'string', description: 'Opcional: data a partir de la qual buscar, AAAA-MM-DD (per defecte, avui).' },
          text: { type: 'string', description: "Opcional: paraules que han de sortir al títol, l'organitzador, el lloc o la descripció." },
          maxim: { type: 'integer', minimum: 1, maximum: 50, description: 'Nombre màxim d\'actes (per defecte 15).' }
        }
      },
      annotations: { readOnlyHint: true, untrustedContentHint: true },
      execute: async entrada => {
        const a = args(entrada);
        const agenda = await json('/data/agenda.json');
        const des = a.des_de || avui();
        const t = termes(a.text);
        const tipus = a.tipus ? fold(a.tipus) : '';
        let actes = (agenda.actes || []).filter(x => x && x.titol && (x.fi || x.inici || '') >= des);
        if (a.territori) actes = actes.filter(x => x.territori === a.territori);
        if (tipus) actes = actes.filter(x => fold(x.tipus) === tipus);
        if (t.length) actes = actes.filter(x => { const p = fold([x.titol, x.organitza, x.lloc, x.descripcio].join(' ')); return t.every(y => p.includes(y)); });
        actes.sort((x, y) => String(x.inici || '').localeCompare(String(y.inici || '')));
        const total = actes.length;
        actes = actes.slice(0, enter(a.maxim, 15, 1, 50)).map(x => ({
          titol: x.titol, organitza: x.organitza || '', inici: x.inici || '', fi: x.fi || '',
          lloc: x.lloc || '', territori: x.territori || '', format: x.format || '', tipus: x.tipus || '',
          preu: x.preu || '', descripcio: x.descripcio || '', url: x.url || ''
        }));
        return resposta({ agenda_actualitzada: agenda.actualitzat || '', des_de: des, coincidencies: total, actes, pagina: `${BASE}/agenda` });
      }
    }
  ];

  for (const eina of eines) {
    try {
      const r = mc.registerTool(eina);
      if (r && typeof r.catch === 'function') r.catch(() => {});
    } catch (e) {
      // Una eina amb el mateix nom ja registrada, o una versió del navegador
      // que no accepta algun camp: no ha de trencar mai la pàgina.
    }
  }
})();
