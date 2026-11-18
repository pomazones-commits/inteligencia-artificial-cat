#!/usr/bin/env python3
"""Fotografies reals amb llicència per a les notícies del lot (27.09.2026).

Per què existeix: quan una notícia parla d'una persona, d'un acte o d'un producte
concrets, la il·lustració generada amb IA hi posa algú o alguna cosa que no és
(el 26.09.2026: «Illa clou l'AI Summit» amb una altra persona, i «Meta presenta
unes ulleres» amb unes ulleres inventades). La foto del mitjà que dona la
notícia no es pot fer servir perquè té drets. Les d'algunes fonts, sí:
automation/image-sources.json diu quines i amb quines condicions.

Què fa, per a cada notícia de incoming/news-batch.json:

1. Si el lot porta el camp intern `imageFetch`, fa servir aquella foto.
2. Si no, i el TÍTOL esmenta una persona del banc de retrats
   (automation/retrats.json: Altman, Amodei, Huang, Illa…), hi posa el seu retrat.
3. Descarrega la foto (només de servidors de la llista), la retalla a format
   horitzontal si és vertical, la desa com a public/assets/<slug>-AAAAMMDD-foto.jpg
   (JPEG, 1200 px, < 350 KB) i hi posa `image`, `imageCredit`, `imageLicense` i
   `imageSourceUrl`.

`imageFetch` pot ser:
  - "File:Nom del fitxer.jpg" (o l'URL de la seva pàgina): Wikimedia Commons.
  - "wikidata:Q7407093": la imatge principal (P18) d'aquell element de Wikidata.
  - "openverse:<id>": una imatge d'Openverse (Flickr, Commons…) amb llicència lliure.
    En aquests tres casos l'autor i la llicència es llegeixen de l'API, no del
    lot, i la foto es rebutja si la llicència no és lliure (res de NC ni de ND).
  - l'URL directe d'una foto d'una font «directe» de la llista (Generalitat,
    Parlament, Moncloa, Comissió Europea, Meta): llavors el lot HA de portar
    `imageCredit` i `imageLicense`, llevat que la font en tingui un per defecte.
    Si la font diu `nomesPerA` (Meta), la notícia n'ha de parlar.

Si no va bé (llicència, servidor no autoritzat, imatge massa petita), la notícia
es queda amb la imatge que ja tenia (la il·lustració) i se li treuen els camps de
crèdit: mai no es publica un crèdit de foto sobre una il·lustració.

L'executa primer la sessió editorial (sense --final): si el seu sandbox no
arriba al servidor, ho deixa tot com estava. Després, el workflow content-hub.yml
el torna a executar amb --final abans d'ingerir el lot (GitHub Actions sí que
hi té accés); allà, si tampoc no va, es queda la il·lustració.
Mai no fa fallar la publicació: en el pitjor dels casos, surt amb 0 i avisa.

Ús:
  python3 automation/scripts/fotos-llicencia.py --input incoming/news-batch.json --public-dir public
  python3 automation/scripts/fotos-llicencia.py --final ...   (només al workflow)
  python3 automation/scripts/fotos-llicencia.py --self-test
  python3 automation/scripts/fotos-llicencia.py --refes incoming/refes-fotos.json   (workflow refes-fotos.yml)
"""

import argparse
import datetime
import html
import io
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

AGENT = 'IA.cat-fotos/1.1 (+https://inteligencia-artificial.cat/redaccio.html)'
COMMONS_API = 'https://commons.wikimedia.org/w/api.php'
WIKIDATA_API = 'https://www.wikidata.org/w/api.php'
OPENVERSE_API = 'https://api.openverse.org/v1/images/'
AQUI = os.path.dirname(os.path.abspath(__file__))
MAX_BYTES = 15 * 1024 * 1024
MAX_COSTAT = 1200
MIN_AMPLADA = 1000          # 18.11.2026: abans 600; una foto de 909 px es veia desenfocada
MAX_CANDIDATS = 14          # retrats del banc: fotos que es proven com a molt
MAX_PES = 350 * 1024
PROPORCIO = 1184 / 864      # la de les il·lustracions del web
CAMPS_CREDIT = ('imageCredit', 'imageLicense', 'imageSourceUrl')
LLICENCIES_OPENVERSE = {'by': 'CC BY', 'by-sa': 'CC BY-SA', 'cc0': 'CC0', 'pdm': 'Domini públic'}


class Rebutjada(Exception):
    """La foto no es pot fer servir; la notícia es queda amb la il·lustració."""


# ── Llicències ────────────────────────────────────────────────────────────────

def llicencia_lliure(nom):
    """Llicència d'un fitxer de Commons. Commons només admet contingut lliure, però
    per si de cas es rebutja tot el que porti NC (no comercial), ND (sense obra
    derivada), «fair use» o res de res."""
    n = (nom or '').strip().lower().replace('_', ' ')
    if not n:
        return False
    if re.search(r'\b(nc|nd)\b', n.replace('-', ' ')):
        return False
    return not any(p in n for p in ('fair use', 'non-free', 'all rights reserved', 'noncommercial', 'noderivs'))


def nom_llicencia(nom):
    n = (nom or '').strip()
    return 'Domini públic' if n.lower().startswith('public domain') else n


def text_pla(valor):
    """L'API de Commons torna l'autor en HTML; en volem el text."""
    sense = re.sub(r'<[^>]+>', ' ', valor or '')
    return re.sub(r'\s+', ' ', html.unescape(sense)).strip()


def curt(text, maxim=80):
    return text if len(text) <= maxim else text[:maxim - 3].rstrip() + '…'


# ── Fonts autoritzades ────────────────────────────────────────────────────────

def carrega_json(cami, clau):
    with open(cami, encoding='utf-8') as f:
        return json.load(f).get(clau, [])


def host_coincideix(host, patro):
    patro = patro.lower()
    return host == patro or (patro.startswith('.') and host.endswith(patro))


def font_del_host(fonts, url):
    host = (urllib.parse.urlsplit(url or '').hostname or '').lower()
    for font in fonts:
        if any(host_coincideix(host, h) for h in font.get('hosts', [])):
            return font
    return None


def titol_commons(valor):
    """«File:X.jpg», «Fitxer:X.jpg» o l'URL de la pàgina → «File:X.jpg». Si no, None."""
    v = (valor or '').strip()
    m = re.match(r'^(file|fitxer|archivo|image):\s*(.+)$', v, re.I)
    if m:
        return 'File:' + m.group(2).strip()
    parts = urllib.parse.urlsplit(v)
    if (parts.hostname or '').lower() == 'commons.wikimedia.org' and '/wiki/' in parts.path:
        pagina = urllib.parse.unquote(parts.path.split('/wiki/', 1)[1]).replace('_', ' ')
        return titol_commons(pagina)
    return None


# ── Banc de retrats ───────────────────────────────────────────────────────────

def troba_retrat(titol, retrats):
    """La persona del banc que surt PRIMER al títol, o None. Paraula sencera i
    majúscules com al banc («Illa» sol no hi és: seria una illa)."""
    millor = None
    for persona in retrats:
        if any(t in titol for t in persona.get('noSi', [])):
            continue
        for nom in [persona['nom'], *persona.get('alies', [])]:
            m = re.search(r'(?<![\w·])' + re.escape(nom) + r'(?![\w·])', titol)
            if m and (millor is None or m.start() < millor[0]):
                millor = (m.start(), persona)
    return millor[1] if millor else None


def assigna_retrats(items, retrats):
    """Posa `imageFetch` a les notícies que no en porten i parlen d'una persona del banc."""
    fets = []
    for item in items:
        if not isinstance(item, dict) or item.get('imageFetch'):
            continue
        if re.search(r'-foto\.(jpe?g|webp)$', str(item.get('image', ''))):
            continue  # ja té una foto real
        persona = troba_retrat(str(item.get('title', '')), retrats)
        if persona:
            item['imageFetch'] = persona.get('fitxer') or f'wikidata:{persona["wikidata"]}'
            item.pop('imageCredit', None)
            item.pop('imageLicense', None)
            item.pop('imageSourceUrl', None)
            fets.append(f'RETR {item.get("slug", "?")}: retrat de {persona["nom"]}')
    return fets


# ── Xarxa (substituïble a les proves) ─────────────────────────────────────────

def baixa(url, limit=MAX_BYTES):
    req = urllib.request.Request(url, headers={'User-Agent': AGENT, 'Accept': '*/*'})
    with urllib.request.urlopen(req, timeout=25) as resposta:
        dades = resposta.read(limit + 1)
        if len(dades) > limit:
            raise Rebutjada(f'la imatge passa de {limit // 1024 // 1024} MB')
        return resposta.geturl(), dades


def baixa_json(url, baixa_fn):
    _, cos = baixa_fn(url, 2 * 1024 * 1024)
    return json.loads(cos.decode('utf-8'))


def info_commons(titol, baixa_fn):
    query = urllib.parse.urlencode({
        'action': 'query', 'format': 'json', 'formatversion': '2',
        'prop': 'imageinfo', 'iiprop': 'url|extmetadata|mime|size',
        'iiurlwidth': str(MAX_COSTAT + 80), 'titles': titol,
    })
    pagines = baixa_json(f'{COMMONS_API}?{query}', baixa_fn).get('query', {}).get('pages', [])
    if not pagines or 'imageinfo' not in pagines[0]:
        raise Rebutjada(f'{titol} no existeix a Commons')
    ii = pagines[0]['imageinfo'][0]
    meta = ii.get('extmetadata', {})
    llicencia = text_pla((meta.get('LicenseShortName') or {}).get('value', ''))
    if not llicencia_lliure(llicencia):
        raise Rebutjada(f'llicència no admesa a Commons: «{llicencia or "desconeguda"}»')
    autor = curt(text_pla((meta.get('Artist') or {}).get('value', '')) or 'Autor desconegut')
    return {
        'fitxer': ii.get('thumburl') or ii.get('url'),
        'credit': f'{autor} / Wikimedia Commons',
        'llicencia': nom_llicencia(llicencia),
        'pagina': ii.get('descriptionurl') or f'https://commons.wikimedia.org/wiki/{urllib.parse.quote(titol.replace(" ", "_"))}',
    }


def info_wikidata(qid, baixa_fn):
    if not re.match(r'^Q\d+$', qid):
        raise Rebutjada(f'identificador de Wikidata no vàlid: {qid}')
    query = urllib.parse.urlencode({'action': 'wbgetclaims', 'entity': qid, 'property': 'P18', 'format': 'json'})
    claims = baixa_json(f'{WIKIDATA_API}?{query}', baixa_fn).get('claims', {}).get('P18', [])
    # La imatge «preferida» si n'hi ha; si no, la primera.
    claims = sorted(claims, key=lambda c: c.get('rank') != 'preferred')
    fitxer = next((c['mainsnak'].get('datavalue', {}).get('value') for c in claims if c.get('mainsnak')), None)
    if not fitxer:
        raise Rebutjada(f'{qid} no té imatge a Wikidata')
    return info_commons('File:' + fitxer, baixa_fn)


def candidats_wikidata(qid, baixa_fn):
    """Fotos possibles d'una persona del banc (18.11.2026): primer les imatges
    principals (P18) de Wikidata, i després les fotos JPEG prou grans de la seva
    categoria de Commons (P373), de la més gran a la més petita. Abans només es
    provava la P18: si era petita o mal enquadrada (Fei-Fei Li, 17.11.2026), no
    hi havia alternativa."""
    if not re.match(r'^Q\d+$', qid):
        raise Rebutjada(f'identificador de Wikidata no vàlid: {qid}')
    query = urllib.parse.urlencode({'action': 'wbgetclaims', 'entity': qid, 'format': 'json'})
    claims = baixa_json(f'{WIKIDATA_API}?{query}', baixa_fn).get('claims', {})
    valor = lambda c: (c.get('mainsnak') or {}).get('datavalue', {}).get('value')  # noqa: E731
    p18 = sorted(claims.get('P18', []), key=lambda c: c.get('rank') != 'preferred')
    titols = [f'File:{valor(c)}' for c in p18 if valor(c)]
    categoria = next((valor(c) for c in claims.get('P373', []) if valor(c)), None)
    if categoria:
        query = urllib.parse.urlencode({
            'action': 'query', 'format': 'json', 'formatversion': '2', 'generator': 'categorymembers',
            'gcmtitle': f'Category:{categoria}', 'gcmtype': 'file', 'gcmlimit': '50',
            'prop': 'imageinfo', 'iiprop': 'size|mime',
        })
        extra = []
        for pagina in baixa_json(f'{COMMONS_API}?{query}', baixa_fn).get('query', {}).get('pages', []):
            ii = (pagina.get('imageinfo') or [{}])[0]
            if ii.get('mime') == 'image/jpeg' and ii.get('width', 0) >= MIN_AMPLADA and ii.get('height', 0) >= MIN_AMPLADA * 0.6:
                extra.append((ii['width'] * ii['height'], pagina.get('title', '')))
        titols += [t for _, t in sorted(extra, reverse=True) if t and t not in titols]
    # I, si cal, fotos lliures de Flickr i altres fonts d'Openverse que portin el
    # nom de la persona al títol (Commons sovint només en té retalls petits).
    titols += candidats_openverse(nom_wikidata(qid, baixa_fn), baixa_fn)
    if not titols:
        raise Rebutjada(f'{qid} no té imatge a Wikidata')
    return titols


def nom_wikidata(qid, baixa_fn):
    query = urllib.parse.urlencode({'action': 'wbgetentities', 'ids': qid, 'props': 'labels',
                                    'languages': 'en|ca', 'format': 'json'})
    try:
        etiquetes = baixa_json(f'{WIKIDATA_API}?{query}', baixa_fn).get('entities', {}).get(qid, {}).get('labels', {})
    except Rebutjada:
        return ''
    return str((etiquetes.get('en') or etiquetes.get('ca') or {}).get('value', '')).strip()


def candidats_openverse(nom, baixa_fn, maxim=6):
    """Fotos d'Openverse amb llicència lliure, prou grans i amb el nom sencer de la
    persona al títol (no n'hi ha prou amb les etiquetes: s'hi colen altres
    ponents del mateix acte). Torna ['openverse:<id>', …]."""
    if len(nom) < 5:
        return []
    # Sense clau, Openverse només admet fins a 20 resultats per pàgina (amb 40, 401).
    query = urllib.parse.urlencode({'q': nom, 'license': 'by,by-sa,cc0,pdm', 'page_size': '20'})
    try:
        resultats = baixa_json(f'{OPENVERSE_API}?{query}', baixa_fn).get('results', [])
    except Exception as error:  # noqa: BLE001 — sense Openverse, es continua amb el que hi hagi
        print(f'     Openverse no respon ({error})')
        return []
    clau = nom.lower()
    bons = [r for r in resultats if isinstance(r, dict) and clau in str(r.get('title', '')).lower()
            and (r.get('width') or 0) >= MIN_AMPLADA and (r.get('height') or 0) >= MIN_AMPLADA * 0.6
            and re.match(r'^[0-9a-f-]{36}$', str(r.get('id', '')))]
    return [f'openverse:{r["id"]}' for r in bons[:maxim]]


def retrat_wikidata(qid, fonts, desti, baixa_fn, estricte=False):
    """Prova les fotos de candidats_wikidata() fins a trobar-ne una prou gran i amb
    la cara ben enquadrada. Si cap no ho està, es queda la primera prou gran on
    OpenCV hagi trobat una cara; MAI una foto sense cap cara (18.11.2026: la primera
    prova va triar un cartell amb el nom de Fei-Fei Li). Sense OpenCV no es pot
    comprovar res i es queda la primera prou gran, llevat que `estricte` (refer una
    foto publicada), que llavors no en tria cap. Torna (crèdit, llicència, pàgina, pes)."""
    motius, reserva = [], None
    for titol in candidats_wikidata(qid, baixa_fn)[:MAX_CANDIDATS]:
        try:
            if titol.startswith('openverse:'):
                info = info_openverse(titol.split(':', 1)[1], baixa_fn)
            else:
                info = info_commons(titol, baixa_fn)
            url = info.get('fitxer') or ''
            if not font_del_host(fonts, url):
                raise Rebutjada(f'fitxer fora de la llista de servidors ({url[:120] or "sense URL"})')
            on_acaba, dades = baixa_fn(url)
            if not font_del_host(fonts, on_acaba):
                raise Rebutjada('redirecció fora de la llista de servidors')
            im, posada, cares = prepara(dades)
        except Rebutjada as error:
            motius.append(f'{titol}: {error}')
            continue
        if posada is True or (posada is None and not estricte):
            for motiu in motius:
                print(f'     descartada {motiu}')
            return info['credit'], info['llicencia'], info['pagina'], desa_jpeg(None, desti, im=im)
        if posada is None:
            motius.append(f'{titol}: sense OpenCV no es pot comprovar la cara')
        elif not cares:
            motius.append(f'{titol}: no hi ha cap cara')
        else:
            motius.append(f'{titol}: cara mal enquadrada')
            reserva = reserva or (info, im)
    if reserva and not estricte:
        info, im = reserva
        return info['credit'], info['llicencia'], info['pagina'], desa_jpeg(None, desti, im=im)
    raise Rebutjada('cap foto bona: ' + '; '.join(motius))


def info_openverse(ident, baixa_fn):
    if not re.match(r'^[0-9a-f-]{36}$', ident):
        raise Rebutjada(f'identificador d\'Openverse no vàlid: {ident}')
    dades = baixa_json(f'{OPENVERSE_API}{ident}/', baixa_fn)
    codi = str(dades.get('license', '')).lower()
    if codi not in LLICENCIES_OPENVERSE:
        raise Rebutjada(f'llicència no admesa a Openverse: «{codi or "desconeguda"}»')
    versio = str(dades.get('license_version') or '').strip()
    llicencia = LLICENCIES_OPENVERSE[codi] + (f' {versio}' if versio and codi in ('by', 'by-sa') else '')
    origen = {'flickr': 'Flickr', 'wikimedia': 'Wikimedia Commons'}.get(str(dades.get('source', '')).lower(),
                                                                      str(dades.get('source', '')).capitalize())
    autor = curt(text_pla(str(dades.get('creator') or '')) or 'Autor desconegut')
    return {
        'fitxer': dades.get('url'),
        'credit': f'{autor} / {origen}',
        'llicencia': llicencia,
        'pagina': dades.get('foreign_landing_url') or '',
    }


# ── Imatge ────────────────────────────────────────────────────────────────────

def detecta_cares(im):
    """Cares de cara (no de perfil) amb OpenCV, de la més gran a la més petita:
    [(x, y, ample, alt), …]. None si OpenCV no hi és (sandbox de la sessió): llavors
    el retall fa servir la regla antiga. El workflow l'instal·la
    (opencv-python-headless)."""
    try:
        import cv2
        import numpy
    except Exception:  # noqa: BLE001
        return None
    gris = cv2.cvtColor(numpy.asarray(im.convert('RGB')), cv2.COLOR_RGB2GRAY)
    escala = 1.0
    if max(gris.shape) > 1600:
        escala = 1600 / max(gris.shape)
        gris = cv2.resize(gris, None, fx=escala, fy=escala, interpolation=cv2.INTER_AREA)
    gris = cv2.equalizeHist(gris)
    try:
        model = cv2.CascadeClassifier(os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml'))
    except Exception:  # noqa: BLE001 — una instal·lació d'OpenCV sense els models
        return None
    if model.empty():
        return None
    minim = max(24, int(min(gris.shape) * 0.06))
    trobades = model.detectMultiScale(gris, scaleFactor=1.1, minNeighbors=5, minSize=(minim, minim))
    cares = [tuple(int(round(v / escala)) for v in c) for c in trobades]
    return sorted(cares, key=lambda c: c[2] * c[3], reverse=True)


# Les fotos es mostren també en targetes 16:9 (portada, radar) amb object-fit:
# cover i centrades: d'una imatge 1184×864 se'n veu només la franja del mig, del
# 11,5% al 88,5% de l'alçada. El cap ha de quedar dins d'aquesta franja.
FRANJA_16_9 = (1 - PROPORCIO / (16 / 9)) / 2


def caixa_retall(amplada, alcada, cara=None):
    """La caixa (esquerra, dalt, dreta, baix) del retall a la proporció del web."""
    objectiu = PROPORCIO
    if abs(amplada / alcada - objectiu) < 0.01:
        return (0, 0, amplada, alcada)
    if amplada / alcada < objectiu:
        alt = round(amplada / objectiu)
        if cara:
            x, y, w, h = cara
            dalt = y + h / 2 - 0.42 * alt                     # la cara, una mica per sobre del centre
            dalt = min(dalt, y - 0.35 * h - (FRANJA_16_9 + 0.02) * alt)  # i els cabells, dins la franja 16:9
            dalt = max(dalt, y + 0.45 * h - 0.75 * alt)       # però els ulls, mai a baix de tot (primers plans)
        else:
            dalt = alcada * 0.35 - alt / 2
        dalt = int(max(0, min(round(dalt), alcada - alt)))
        return (0, dalt, amplada, dalt + alt)
    ample = round(alcada * objectiu)
    centre = (cara[0] + cara[2] / 2) if cara else amplada / 2
    esquerra = int(max(0, min(round(centre - ample / 2), amplada - ample)))
    return (esquerra, 0, esquerra + ample, alcada)


def retalla_horitzontal(im, cares=None):
    """Totes les imatges del web són apaïsades i amb la mateixa proporció que les
    il·lustracions (1184×864). Qualsevol foto es retalla exactament a aquesta
    proporció.
      - Amb una cara detectada (18.11.2026, arran de la foto de Fei-Fei Li amb el
        cap tallat): el retall es fa al voltant de la cara més gran, amb el cap
        sencer (cabells inclosos) dins de la franja que es veu a les targetes 16:9.
      - Sense cara: si és vertical o quadrada (els retrats), es talla per dalt i
        per baix, amb el centre al 35% de l'alçada; si és més allargada (una
        panoràmica), es talla pels costats, centrada."""
    caixa = caixa_retall(im.width, im.height, cares[0] if cares else None)
    return im if caixa == (0, 0, im.width, im.height) else im.crop(caixa)


def cara_ben_posada(cares, caixa):
    """Per als retrats del banc: amb les cares detectades a la foto original i la
    caixa del retall, diu si al retall hi ha una sola cara principal, prou gran,
    amb el front sencer i els ulls dins de la franja visible de les targetes 16:9.
    None si no es pot saber (sense OpenCV)."""
    if cares is None:
        return None
    esquerra, dalt, dreta, baix = caixa
    alt = baix - dalt
    dins = [(x - esquerra, y - dalt, w, h) for x, y, w, h in cares
            if x + w / 2 > esquerra and x + w / 2 < dreta and y + h / 2 > dalt and y + h / 2 < baix]
    if not dins:
        return False
    x, y, w, h = dins[0]
    if h < 0.14 * alt:
        return False                                   # massa petita: foto de grup o de lluny
    if len(dins) > 1 and dins[1][2] * dins[1][3] > 0.6 * w * h:
        return False                                   # dues persones igual de grans: no és un retrat
    # El front no pot quedar tallat a la imatge, i els ulls (a un 40% de la
    # caixa de la cara) han de quedar ben dins de la franja de les targetes 16:9.
    return (y - 0.1 * h >= 0 and y + 0.3 * h >= FRANJA_16_9 * alt
            and y + 0.45 * h <= (1 - FRANJA_16_9) * alt)


def prepara(dades, exigeix_cara=False):
    """Obre, gira, retalla i redueix la foto. Torna (imatge, ben_posada, cares),
    on ben_posada és True/False segons cara_ben_posada() o None sense OpenCV, i
    cares, les cares detectades (None sense OpenCV). Amb `exigeix_cara`, rebutja
    la foto si ben_posada és False."""
    from PIL import Image, ImageOps
    try:
        im = Image.open(io.BytesIO(dades))
        im.load()
    except Exception as error:  # noqa: BLE001 — qualsevol cosa que no sigui una imatge
        raise Rebutjada(f'no és una imatge: {error}')
    im = ImageOps.exif_transpose(im).convert('RGB')
    cares = detecta_cares(im)
    caixa = caixa_retall(im.width, im.height, cares[0] if cares else None)
    posada = cara_ben_posada(cares, caixa)
    im = im.crop(caixa) if caixa != (0, 0, im.width, im.height) else im
    if im.width < MIN_AMPLADA:
        raise Rebutjada(f'massa petita ({im.width} px d\'amplada un cop retallada; en calen {MIN_AMPLADA})')
    if exigeix_cara and posada is False:
        raise Rebutjada('no hi ha cap cara ben enquadrada')
    im.thumbnail((MAX_COSTAT, MAX_COSTAT))
    return im, posada, cares


def desa_jpeg(dades, desti, exigeix_cara=False, im=None):
    im = im or prepara(dades, exigeix_cara)[0]
    for qualitat in (86, 80, 74, 68):
        sortida = io.BytesIO()
        im.save(sortida, 'JPEG', quality=qualitat, optimize=True, progressive=True)
        if sortida.tell() <= MAX_PES:
            break
    os.makedirs(os.path.dirname(desti), exist_ok=True)
    with open(desti, 'wb') as f:
        f.write(sortida.getvalue())
    return sortida.tell()


# ── Una notícia ───────────────────────────────────────────────────────────────

def error_de_xarxa(error):
    """El servidor no s'ha pogut ni contactar (sandbox, DNS, temps). Un 404 o un 403 del
    servidor mateix NO ho és: aquella foto no hi és i no val la pena reintentar-ho."""
    if isinstance(error, urllib.error.HTTPError):
        return False
    return isinstance(error, (urllib.error.URLError, TimeoutError, ConnectionError, OSError))


def resol(peticio, item, fonts, baixa_fn):
    """Retorna (url del fitxer, crèdit, llicència, pàgina d'origen)."""
    titol = titol_commons(peticio)
    if titol:
        info = info_commons(titol, baixa_fn)
    elif peticio.lower().startswith('wikidata:'):
        info = info_wikidata(peticio.split(':', 1)[1].strip(), baixa_fn)
    elif peticio.lower().startswith('openverse:'):
        info = info_openverse(peticio.split(':', 1)[1].strip().lower(), baixa_fn)
    else:
        if not re.match(r'^https://', peticio):
            raise Rebutjada('imageFetch ha de ser «File:…», «wikidata:Q…», «openverse:…» o un URL https')
        font = font_del_host(fonts, peticio)
        if not font or not font.get('directe'):
            raise Rebutjada(f'{urllib.parse.urlsplit(peticio).hostname} no és una font directa d\'automation/image-sources.json')
        tema = f"{item.get('title', '')} {item.get('excerpt', '')}"
        if font.get('nomesPerA') and not any(re.search(r'(?<![\w·])' + re.escape(p) + r'(?![\w·])', tema) for p in font['nomesPerA']):
            raise Rebutjada(f'les fotos de {font["id"]} només es poden fer servir en notícies sobre {font["id"].capitalize()}')
        credit = str(item.get('imageCredit', '')).strip() or ('' if '<' in font.get('credit', '<') else font['credit'])
        llicencia = str(item.get('imageLicense', '')).strip() or font.get('llicencia', '')
        if not credit or not llicencia:
            raise Rebutjada('falten imageCredit o imageLicense')
        pagina = str(item.get('imageSourceUrl', '')).strip()
        if not pagina and font_del_host(fonts, item.get('sourceUrl', '')) is font:
            pagina = item['sourceUrl']
        return peticio, credit, llicencia, pagina
    if not info.get('fitxer'):
        raise Rebutjada('la font no dona cap URL de fitxer')
    return info['fitxer'], info['credit'], info['llicencia'], info['pagina']


def processa(item, fonts, public_dir, data, baixa_fn=baixa, final=True, sufix='', estricte=False):
    original = {camp: item[camp] for camp in ('imageFetch',) + CAMPS_CREDIT if camp in item}
    peticio = str(item.pop('imageFetch', '') or '').strip()
    if not peticio:
        return None
    try:
        slug = item.get('slug', '')
        if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', slug):
            raise Rebutjada('slug no vàlid')
        nom = f'{slug}-{data.replace("-", "")}{sufix}-foto.jpg'
        desti = os.path.join(public_dir, 'assets', nom)
        if peticio.lower().startswith('wikidata:'):
            credit, llicencia, pagina, pes = retrat_wikidata(peticio.split(':', 1)[1].strip(), fonts, desti, baixa_fn,
                                                             estricte=estricte)
        else:
            url, credit, llicencia, pagina = resol(peticio, item, fonts, baixa_fn)
            if not font_del_host(fonts, url):
                raise Rebutjada(f'el fitxer és a {urllib.parse.urlsplit(url).hostname}, fora de la llista')
            on_acaba, dades = baixa_fn(url)
            if not font_del_host(fonts, on_acaba):
                raise Rebutjada(f'la descàrrega ha acabat a {urllib.parse.urlsplit(on_acaba).hostname}, fora de la llista')
            pes = desa_jpeg(dades, desti)
        item['image'] = f'./assets/{nom}'
        item['imageCredit'] = credit
        item['imageLicense'] = llicencia
        if pagina.startswith('http'):
            item['imageSourceUrl'] = pagina
        else:
            item.pop('imageSourceUrl', None)
        return f'OK   {slug}: {nom} ({pes // 1024} KB) — {credit} ({llicencia})'
    except Exception as error:  # noqa: BLE001 — mai no ha d'aturar la publicació
        if not final and error_de_xarxa(error):
            # A la sessió editorial: el seu sandbox no hi arriba. Es deixa tot com
            # estava perquè ho torni a provar el workflow, que sí que hi arriba.
            item.update(original)
            return f'PEND {item.get("slug", "?")}: sense xarxa ({error}); ho farà el workflow content-hub.yml'
        for camp in CAMPS_CREDIT:
            item.pop(camp, None)
        motiu = error if isinstance(error, Rebutjada) else f'{type(error).__name__}: {error}'
        queda = item.get('image') or 'sense imatge'
        return f'NO   {item.get("slug", "?")}: {motiu} → es queda amb {queda}'


def avui_madrid():
    try:
        from zoneinfo import ZoneInfo
        return datetime.datetime.now(ZoneInfo('Europe/Madrid')).date().isoformat()
    except Exception:  # noqa: BLE001
        return datetime.date.today().isoformat()


def executa(args):
    with open(args.input, encoding='utf-8') as f:
        payload = json.load(f)
    items = payload if isinstance(payload, list) else payload.get('items', [])
    for linia in assigna_retrats(items, carrega_json(args.retrats, 'persones')):
        print(linia)
    if not any(isinstance(i, dict) and i.get('imageFetch') for i in items):
        print('Cap notícia demana foto amb llicència.')
        return 0
    fonts = carrega_json(args.sources, 'fonts')
    data = args.date or avui_madrid()
    for item in items:
        if isinstance(item, dict):
            linia = processa(item, fonts, args.public_dir, data, final=args.final)
            if linia:
                print(linia)
    with open(args.input, 'w', encoding='utf-8') as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
        f.write('\n')
    return 0


# ── Refer la foto d'una notícia ja publicada (18.11.2026) ─────────────────────
# Cua incoming/refes-fotos.json: [{"slug": "<slug>", "imageFetch": "<opcional>",
# "motiu": "<per què>"}]. Sense imageFetch, es torna a buscar el retrat del banc
# per la persona del títol (amb el retall nou i les fotos alternatives). La foto
# nova es desa amb un nom nou (<slug>-AAAAMMDD-N-foto.jpg) perquè la memòria cau
# del navegador i del servidor no serveixi la vella, i content-hub.mjs
# canvia-imatge hi posa la ruta i el crèdit a tot arreu. L'executa el workflow
# refes-fotos.yml. Les entrades que fallen es queden a la cua amb el camp `error`.

def troba_publicada(public_dir, slug):
    for cami, clau in (('data/archive.json', None), ('data/articles.json', 'items')):
        try:
            with open(os.path.join(public_dir, cami), encoding='utf-8') as f:
                dades = json.load(f)
        except (OSError, ValueError):
            continue
        for item in (dades.get(clau, []) if clau else dades) or []:
            if isinstance(item, dict) and item.get('slug') == slug:
                return item
    return None


def refes(args):
    import subprocess
    with open(args.refes, encoding='utf-8') as f:
        cua = json.load(f)
    if not isinstance(cua, list) or not cua:
        print('Cua de fotos per refer buida.')
        return 0
    fonts = carrega_json(args.sources, 'fonts')
    retrats = carrega_json(args.retrats, 'persones')
    queden = []
    for entrada in cua:
        slug = str((entrada or {}).get('slug', '')).strip()
        publicada = troba_publicada(args.public_dir, slug) if slug else None
        if not publicada:
            queden.append({**entrada, 'error': 'no és cap notícia publicada'})
            print(f'NO   {slug or "?"}: no és cap notícia publicada')
            continue
        peticio = str(entrada.get('imageFetch', '')).strip()
        if not peticio:
            persona = troba_retrat(str(publicada.get('title', '')), retrats)
            peticio = (persona.get('fitxer') or f'wikidata:{persona["wikidata"]}') if persona else ''
        if not peticio:
            queden.append({**entrada, 'error': 'cap persona del banc al títol i cap imageFetch'})
            print(f'NO   {slug}: cap persona del banc al títol i cap imageFetch')
            continue
        m = re.search(r'-(\d{4})(\d{2})(\d{2})(?:-\d+)?-foto\.|-(\d{4})(\d{2})(\d{2})\.', str(publicada.get('image', '')))
        grups = [g for g in (m.groups() if m else ()) if g]
        data = '-'.join(grups[:3]) if len(grups) >= 3 else avui_madrid()
        n = 2
        while os.path.exists(os.path.join(args.public_dir, 'assets', f'{slug}-{data.replace("-", "")}-{n}-foto.jpg')):
            n += 1
        item = {'slug': slug, 'title': publicada.get('title', ''), 'excerpt': publicada.get('excerpt', ''),
                'image': publicada.get('image', ''), 'imageFetch': peticio}
        linia = processa(item, fonts, args.public_dir, data, final=True, sufix=f'-{n}', estricte=True)
        print(linia)
        if not linia.startswith('OK'):
            queden.append({**entrada, 'error': linia})
            continue
        ordre = ['node', os.path.join(AQUI, 'content-hub.mjs'), 'canvia-imatge', '--slug', slug,
                 '--image', item['image'], '--credit', item['imageCredit'], '--llicencia', item['imageLicense'],
                 '--public-dir', args.public_dir, '--state-dir', args.state_dir]
        if item.get('imageSourceUrl'):
            ordre += ['--font', item['imageSourceUrl']]
        subprocess.run(ordre, check=True)
    with open(args.refes, 'w', encoding='utf-8') as f:
        json.dump(queden, f, ensure_ascii=False, indent=2)
        f.write('\n')
    return 1 if queden else 0


# ── Proves sense xarxa ────────────────────────────────────────────────────────

def self_test():
    import tempfile
    from PIL import Image

    assert llicencia_lliure('CC BY-SA 4.0') and llicencia_lliure('CC BY 2.0') and llicencia_lliure('CC0')
    assert llicencia_lliure('Public domain') and llicencia_lliure('Attribution') and llicencia_lliure('OGL 3')
    assert not llicencia_lliure('CC BY-NC-SA 4.0') and not llicencia_lliure('CC BY-ND 4.0') and not llicencia_lliure('')
    assert titol_commons('File:Salvador Illa 2024.jpg') == 'File:Salvador Illa 2024.jpg'
    assert titol_commons('https://commons.wikimedia.org/wiki/File:Salvador_Illa_2024.jpg') == 'File:Salvador Illa 2024.jpg'
    assert titol_commons('https://cdn-govern.watchity.net/govern/images/1.jpg') is None
    assert text_pla('<a href="x">Joan &amp; Anna</a>') == 'Joan & Anna'

    fonts = carrega_json(os.path.join(AQUI, '..', 'image-sources.json'), 'fonts')
    retrats = carrega_json(os.path.join(AQUI, '..', 'retrats.json'), 'persones')
    # Banc de retrats: nom sencer, àlies, el primer que surt, i cap fals positiu.
    nom = lambda t: (troba_retrat(t, retrats) or {}).get('nom')  # noqa: E731
    assert nom('Sam Altman diu que GPT-6 arribarà aviat') == 'Sam Altman'
    assert nom('Jensen Huang i Altman pacten un acord') == 'Jensen Huang'
    assert nom("Amodei avisa dels riscos de l'IA") == 'Dario Amodei'
    assert nom('Daniela Amodei explica la ronda de finançament') is None
    assert nom("El president Illa clou l'AI Summit") == 'Salvador Illa'
    assert nom("Una illa artificial per a centres de dades") is None
    assert nom('Trumpeter: una eina nova') is None
    assert nom('El papa Lleó XIV publica una encíclica sobre la IA') == 'Lleó XIV'
    items = [{'slug': 'a', 'title': 'Sam Altman parla', 'image': './assets/a-1.jpg', 'imageCredit': 'x'},
             {'slug': 'b', 'title': 'Sam Altman parla', 'imageFetch': 'File:Event.jpg'},
             {'slug': 'c', 'title': 'Sam Altman parla', 'image': './assets/c-1-foto.jpg'},
             {'slug': 'd', 'title': 'Un robot nou'}]
    assert len(assigna_retrats(items, retrats)) == 1
    assert items[0]['imageFetch'] == 'wikidata:Q7407093' and 'imageCredit' not in items[0]
    assert items[1]['imageFetch'] == 'File:Event.jpg' and 'imageFetch' not in items[2] and 'imageFetch' not in items[3]

    buf = io.BytesIO()
    Image.new('RGB', (2400, 1600), (40, 90, 160)).save(buf, 'PNG')
    foto = buf.getvalue()
    vertical = io.BytesIO()
    Image.new('RGB', (1000, 1400), (200, 90, 60)).save(vertical, 'JPEG')

    def xarxa(url, limit=MAX_BYTES):
        if url.startswith(WIKIDATA_API):
            return url, json.dumps({'claims': {'P18': [{'rank': 'normal', 'mainsnak': {'datavalue': {'value': 'A.jpg'}}}]}}).encode()
        if url.startswith(COMMONS_API):
            llic = 'CC BY-NC 2.0' if 'NC' in url else 'CC BY-SA 4.0'
            return url, json.dumps({'query': {'pages': [{'imageinfo': [{
                'thumburl': 'https://upload.wikimedia.org/x/1280px-a.jpg',
                'descriptionurl': 'https://commons.wikimedia.org/wiki/File:A.jpg',
                'extmetadata': {'LicenseShortName': {'value': llic}, 'Artist': {'value': '<a>Joan Pi</a>'}},
            }]}]}}).encode()
        if url.startswith(OPENVERSE_API):
            codi = 'by-nc' if 'aaaaaaaa' in url else 'by'
            return url, json.dumps({'license': codi, 'license_version': '2.0', 'source': 'flickr', 'creator': 'TechCrunch',
                                    'url': 'https://live.staticflickr.com/65535/1_b.jpg',
                                    'foreign_landing_url': 'https://www.flickr.com/photos/techcrunch/1'}).encode()
        if 'redirigeix' in url:
            return 'https://exemple.com/a.jpg', foto
        if 'vertical' in url:
            return url, vertical.getvalue()
        return url, foto

    with tempfile.TemporaryDirectory() as tmp:
        # 1. Generalitat, amb crèdit: s'hi posa la foto i el crèdit.
        a = {'slug': 'illa-summit', 'image': './assets/illa-summit-20260926.jpg', 'sourceUrl': 'https://govern.cat/gov/notes-premsa/1/x',
             'imageFetch': 'https://cdn-govern.watchity.net/govern/images/1.jpg', 'imageCredit': 'Arnau Carbonell / Generalitat de Catalunya', 'imageLicense': 'CC0'}
        assert processa(a, fonts, tmp, '2026-09-26', xarxa).startswith('OK'), a
        assert a['image'] == './assets/illa-summit-20260926-foto.jpg' and a['imageSourceUrl'].startswith('https://govern.cat/')
        assert 'imageFetch' not in a
        desat = Image.open(os.path.join(tmp, 'assets', 'illa-summit-20260926-foto.jpg'))
        assert desat.format == 'JPEG' and max(desat.size) == MAX_COSTAT
        # 2. Commons: l'autor i la llicència surten de l'API, no del lot.
        b = {'slug': 'commons', 'imageFetch': 'File:A.jpg', 'imageCredit': 'inventat', 'imageLicense': 'inventada'}
        assert processa(b, fonts, tmp, '2026-09-26', xarxa).startswith('OK'), b
        assert b['imageCredit'] == 'Joan Pi / Wikimedia Commons' and b['imageLicense'] == 'CC BY-SA 4.0'
        # 3. Commons amb NC: rebutjada, es queda la il·lustració i cap crèdit.
        c = {'slug': 'nc', 'image': './assets/nc-20260926.jpg', 'imageFetch': 'File:NC.jpg', 'imageCredit': 'x', 'imageLicense': 'y'}
        assert processa(c, fonts, tmp, '2026-09-26', xarxa).startswith('NO')
        assert c == {'slug': 'nc', 'image': './assets/nc-20260926.jpg'}, c
        # 4. Un diari: fora de la llista. I un URL directe de Commons tampoc (cal passar per l'API).
        d = {'slug': 'diari', 'imageFetch': 'https://www.lavanguardia.com/foto.jpg', 'imageCredit': 'x', 'imageLicense': 'y'}
        assert processa(d, fonts, tmp, '2026-09-26', xarxa).startswith('NO') and 'imageCredit' not in d
        d2 = {'slug': 'directe-commons', 'imageFetch': 'https://upload.wikimedia.org/a.jpg', 'imageCredit': 'x', 'imageLicense': 'y'}
        assert processa(d2, fonts, tmp, '2026-09-26', xarxa).startswith('NO')
        # 5. Una redirecció cap a fora de la llista.
        e = {'slug': 'redir', 'imageFetch': 'https://govern.cat/redirigeix.jpg', 'imageCredit': 'x', 'imageLicense': 'CC0'}
        assert processa(e, fonts, tmp, '2026-09-26', xarxa).startswith('NO')
        # 6. Generalitat sense crèdit: rebutjada.
        f = {'slug': 'sense-credit', 'imageFetch': 'https://cdn-govern.watchity.net/govern/images/2.jpg'}
        assert processa(f, fonts, tmp, '2026-09-26', xarxa).startswith('NO')
        # 7. Error de xarxa: no peta, es queda la il·lustració.
        def caiguda(url, limit=MAX_BYTES):
            raise OSError('connexió rebutjada')
        g = {'slug': 'caiguda', 'image': './assets/caiguda-20260926.jpg', 'imageFetch': 'File:A.jpg', 'imageCredit': 'x', 'imageLicense': 'y'}
        assert processa(g, fonts, tmp, '2026-09-26', caiguda).startswith('NO') and g['image'] == './assets/caiguda-20260926.jpg'
        assert 'imageCredit' not in g and 'imageFetch' not in g
        # 7b. El mateix a la sessió editorial (no final): es deixa per al workflow.
        g2 = {'slug': 'caiguda', 'image': './assets/caiguda-20260926.jpg', 'imageFetch': 'File:A.jpg', 'imageCredit': 'x', 'imageLicense': 'y'}
        assert processa(g2, fonts, tmp, '2026-09-26', caiguda, final=False).startswith('PEND')
        assert g2['imageFetch'] == 'File:A.jpg' and g2['imageCredit'] == 'x'
        # 7c. Però una llicència dolenta es rebutja igualment a la sessió.
        c2 = {'slug': 'nc', 'imageFetch': 'File:NC.jpg'}
        assert processa(c2, fonts, tmp, '2026-09-26', xarxa, final=False).startswith('NO') and 'imageFetch' not in c2
        # 8. Una imatge massa petita.
        petita = io.BytesIO()
        Image.new('RGB', (300, 200)).save(petita, 'JPEG')
        h = {'slug': 'petita', 'imageFetch': 'https://cdn-govern.watchity.net/p.jpg', 'imageCredit': 'x', 'imageLicense': 'CC0'}
        assert processa(h, fonts, tmp, '2026-09-26', lambda u, l=MAX_BYTES: (u, petita.getvalue())).startswith('NO')
        # 9. Wikidata → P18 → Commons.
        #    Amb OpenCV, la foto de prova (un color pla, sense cap cara) es rebutja:
        #    mai un retrat sense cara (18.11.2026).
        i = {'slug': 'altman', 'imageFetch': 'wikidata:Q7407093'}
        resultat = processa(i, fonts, tmp, '2026-09-26', xarxa)
        if detecta_cares(Image.new('RGB', (64, 64))) is None:
            assert resultat.startswith('OK'), i
            assert i['imageCredit'] == 'Joan Pi / Wikimedia Commons'
        else:
            assert resultat.startswith('NO') and 'cap cara' in resultat, resultat
        # 10. Openverse (Flickr): llicència i autor de l'API; NC rebutjada.
        j = {'slug': 'openverse', 'imageFetch': 'openverse:20e482af-3fc3-4d5e-a07d-57a1ec28109c'}
        assert processa(j, fonts, tmp, '2026-09-26', xarxa).startswith('OK'), j
        assert j['imageCredit'] == 'TechCrunch / Flickr' and j['imageLicense'] == 'CC BY 2.0'
        assert j['imageSourceUrl'] == 'https://www.flickr.com/photos/techcrunch/1'
        k = {'slug': 'openverse-nc', 'imageFetch': 'openverse:aaaaaaaa-3fc3-4d5e-a07d-57a1ec28109c'}
        assert processa(k, fonts, tmp, '2026-09-26', xarxa).startswith('NO')
        # 11. Un retrat vertical es retalla apaïsat.
        v = {'slug': 'vertical', 'imageFetch': 'https://cdn-govern.watchity.net/vertical.jpg', 'imageCredit': 'x', 'imageLicense': 'CC0'}
        assert processa(v, fonts, tmp, '2026-09-26', xarxa).startswith('OK')
        amp, alc = Image.open(os.path.join(tmp, 'assets', 'vertical-20260926-foto.jpg')).size
        assert amp > alc and abs(amp / alc - PROPORCIO) < 0.02, (amp, alc)
        # 12. Totes les fotos surten apaïsades i amb la proporció del web: també la
        # de l'1 (3:2) i una panoràmica.
        for nom_fitxer in ('illa-summit-20260926-foto.jpg', 'commons-20260926-foto.jpg'):
            amp, alc = Image.open(os.path.join(tmp, 'assets', nom_fitxer)).size
            assert abs(amp / alc - PROPORCIO) < 0.02, (nom_fitxer, amp, alc)
        # 13. Meta: només en notícies sobre Meta; el crèdit per defecte és «Meta».
        m1 = {'slug': 'meta-ulleres', 'title': 'Meta presenta unes ulleres de realitat virtual', 'excerpt': '',
              'imageFetch': 'https://about.fb.com/wp-content/uploads/2026/09/ulleres.jpg'}
        assert processa(m1, fonts, tmp, '2026-09-26', xarxa).startswith('OK'), m1
        assert m1['imageCredit'] == 'Meta' and m1['imageLicense'] == 'Ús de premsa (Meta)'
        m2 = {'slug': 'altres', 'title': 'Google presenta un model nou', 'excerpt': 'Sense relació.',
              'imageFetch': 'https://about.fb.com/wp-content/uploads/2026/09/x.jpg'}
        assert processa(m2, fonts, tmp, '2026-09-26', xarxa).startswith('NO'), m2
        pano = retalla_horitzontal(Image.new('RGB', (3000, 1000)))
        assert abs(pano.width / pano.height - PROPORCIO) < 0.01 and pano.height == 1000
        # 14. Retall amb cara (18.11.2026): el cap sencer dins de la franja 16:9.
        caixa = caixa_retall(1000, 2000, (400, 700, 200, 200))
        alt = caixa[3] - caixa[1]
        assert abs(1000 / alt - PROPORCIO) < 0.01
        assert 700 - 0.35 * 200 - caixa[1] >= FRANJA_16_9 * alt, caixa
        assert cara_ben_posada([(400, 700, 200, 200)], caixa) is True
        # 15. Cara enganxada a dalt de tot (la foto de Fei-Fei Li del 17.11.2026),
        # cara petita (foto de grup) i sense OpenCV.
        assert cara_ben_posada([(450, 0, 207, 207)], (0, 0, 909, 663)) is False
        assert cara_ben_posada([(450, 300, 40, 40)], (0, 0, 909, 663)) is False
        assert cara_ben_posada(None, (0, 0, 909, 663)) is None
    print('fotos-llicencia: 18 proves OK')
    return 0


def main():
    parser = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    parser.add_argument('--input', default='incoming/news-batch.json')
    parser.add_argument('--public-dir', default='public')
    parser.add_argument('--sources', default=os.path.join(AQUI, '..', 'image-sources.json'))
    parser.add_argument('--retrats', default=os.path.join(AQUI, '..', 'retrats.json'))
    parser.add_argument('--date', help='data de l\'edició AAAA-MM-DD (per defecte, avui a Madrid)')
    parser.add_argument('--final', action='store_true',
                        help='darrera oportunitat (workflow): si la xarxa falla, es treu la petició i es queda la il·lustració')
    parser.add_argument('--self-test', action='store_true')
    parser.add_argument('--refes', metavar='CUA', help='refà la foto de notícies ja publicades (incoming/refes-fotos.json)')
    parser.add_argument('--state-dir', default='.content-state')
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    if args.refes:
        return refes(args)
    try:
        return executa(args)
    except Exception as error:  # noqa: BLE001
        print(f'fotos-llicencia: no s\'ha pogut processar el lot ({error}). Es publica amb les il·lustracions.', file=sys.stderr)
        return 0


if __name__ == '__main__':
    sys.exit(main())
