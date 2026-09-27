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
    Parlament, Moncloa, Comissió Europea): llavors el lot HA de portar
    `imageCredit` i `imageLicense`.

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
MIN_AMPLADA = 600
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

def retalla_horitzontal(im):
    """Totes les imatges del web són apaïsades i amb la mateixa proporció que les
    il·lustracions (1184×864). Qualsevol foto es retalla exactament a aquesta
    proporció:
      - si és vertical o quadrada (els retrats), es talla per dalt i per baix,
        amb el centre al 35% de l'alçada, on sol haver-hi la cara;
      - si és més allargada (una panoràmica), es talla pels costats, centrada."""
    objectiu = PROPORCIO
    if abs(im.width / im.height - objectiu) < 0.01:
        return im
    if im.width / im.height < objectiu:
        alt = round(im.width / objectiu)
        dalt = max(0, min(round(im.height * 0.35 - alt / 2), im.height - alt))
        return im.crop((0, dalt, im.width, dalt + alt))
    ample = round(im.height * objectiu)
    esquerra = (im.width - ample) // 2
    return im.crop((esquerra, 0, esquerra + ample, im.height))


def desa_jpeg(dades, desti):
    from PIL import Image, ImageOps
    try:
        im = Image.open(io.BytesIO(dades))
        im.load()
    except Exception as error:  # noqa: BLE001 — qualsevol cosa que no sigui una imatge
        raise Rebutjada(f'no és una imatge: {error}')
    im = ImageOps.exif_transpose(im).convert('RGB')
    if im.width < MIN_AMPLADA:
        raise Rebutjada(f'massa petita ({im.width} px d\'amplada)')
    im = retalla_horitzontal(im)
    im.thumbnail((MAX_COSTAT, MAX_COSTAT))
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
        credit = str(item.get('imageCredit', '')).strip()
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


def processa(item, fonts, public_dir, data, baixa_fn=baixa, final=True):
    original = {camp: item[camp] for camp in ('imageFetch',) + CAMPS_CREDIT if camp in item}
    peticio = str(item.pop('imageFetch', '') or '').strip()
    if not peticio:
        return None
    try:
        slug = item.get('slug', '')
        if not re.match(r'^[a-z0-9]+(?:-[a-z0-9]+)*$', slug):
            raise Rebutjada('slug no vàlid')
        url, credit, llicencia, pagina = resol(peticio, item, fonts, baixa_fn)
        if not font_del_host(fonts, url):
            raise Rebutjada(f'el fitxer és a {urllib.parse.urlsplit(url).hostname}, fora de la llista')
        on_acaba, dades = baixa_fn(url)
        if not font_del_host(fonts, on_acaba):
            raise Rebutjada(f'la descàrrega ha acabat a {urllib.parse.urlsplit(on_acaba).hostname}, fora de la llista')
        nom = f'{slug}-{data.replace("-", "")}-foto.jpg'
        pes = desa_jpeg(dades, os.path.join(public_dir, 'assets', nom))
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
        i = {'slug': 'altman', 'imageFetch': 'wikidata:Q7407093'}
        assert processa(i, fonts, tmp, '2026-09-26', xarxa).startswith('OK'), i
        assert i['imageCredit'] == 'Joan Pi / Wikimedia Commons'
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
        pano = retalla_horitzontal(Image.new('RGB', (3000, 1000)))
        assert abs(pano.width / pano.height - PROPORCIO) < 0.01 and pano.height == 1000
    print('fotos-llicencia: 15 proves OK')
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
    args = parser.parse_args()
    if args.self_test:
        return self_test()
    try:
        return executa(args)
    except Exception as error:  # noqa: BLE001
        print(f'fotos-llicencia: no s\'ha pogut processar el lot ({error}). Es publica amb les il·lustracions.', file=sys.stderr)
        return 0


if __name__ == '__main__':
    sys.exit(main())
