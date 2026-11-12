#!/usr/bin/env python3
"""Extreu el retrat d'un col·laborador que arriba DINS d'un document (.docx, .odt, .pptx o .pdf).

Ordre d'en Rafael (06.11.2026, reafirmada el 12.11.2026, cas Bernabé Robles): si la foto de l'autor
ja és dins del Word o del PDF que ens ha enviat, NO se li torna a demanar. Aquest script la treu.

Ús:
  python3 -I automation/scripts/extreu-retrat.py <document> [--surt DIR]
      Llista les imatges del document (de més gran a més petita) i les desa a DIR
      (per defecte /tmp/retrats-<nom>). Descarta logotips i icones (costat curt < 200 px).
  python3 -I automation/scripts/extreu-retrat.py <document> --desa public/assets/tribuna-<nom>-AAAAMMDD.jpg [--tria N]
      Desa la imatge candidata N (per defecte 1, la més gran) com a JPEG per al web:
      com a molt 1.200 px de costat llarg i < 350 KB (els mateixos límits que fotos-drive.mjs).

Abans de fer servir --desa, MIRA la imatge (eina Read) per comprovar que és un retrat d'una sola
persona i que lliga amb l'autor. Si n'hi ha diverses de persones diferents, no s'endevina: es pregunta
quina és de qui (criteri «📷 Retrat enviat = autorització» de CLAUDE.md).

Només fa servir la biblioteca estàndard, Pillow (si hi és, per a mides i conversió) i `pdfimages`
(poppler-utils) per als PDF.
"""
import argparse
import io
import os
import shutil
import subprocess
import sys
import tempfile
import zipfile

MIN_COSTAT = 200          # px: per sota, és un logotip, una icona o una signatura
MAX_COSTAT = 1200         # px: com fotos-drive.mjs
MAX_BYTES = 350 * 1024    # com fotos-drive.mjs
EXT_IMATGE = ('.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tif', '.tiff', '.webp', '.jfif')

try:
    from PIL import Image, ImageOps
except ImportError:  # pragma: no cover
    Image = None


def mida(dades):
    if Image is None:
        return None
    try:
        with Image.open(io.BytesIO(dades)) as im:
            return im.size
    except Exception:
        return None


def imatges_zip(cami):
    """docx (word/media), odt (Pictures), pptx (ppt/media)."""
    trobades = []
    with zipfile.ZipFile(cami) as z:
        for nom in z.namelist():
            baix = nom.lower()
            if not baix.endswith(EXT_IMATGE):
                continue
            if not ('/media/' in baix or baix.startswith('pictures/')):
                continue
            trobades.append((os.path.basename(nom), z.read(nom)))
    return trobades


def imatges_pdf(cami):
    if not shutil.which('pdfimages'):
        sys.exit("Cal pdfimages (apt-get install -y poppler-utils).")
    tmp = tempfile.mkdtemp(prefix='pdfimg-')
    subprocess.run(['pdfimages', '-all', cami, os.path.join(tmp, 'img')], check=True)
    trobades = []
    for nom in sorted(os.listdir(tmp)):
        with open(os.path.join(tmp, nom), 'rb') as f:
            trobades.append((nom, f.read()))
    shutil.rmtree(tmp, ignore_errors=True)
    return trobades


def candidates(cami):
    ext = os.path.splitext(cami)[1].lower()
    if ext == '.pdf':
        brutes = imatges_pdf(cami)
    elif ext in ('.docx', '.docm', '.odt', '.pptx'):
        brutes = imatges_zip(cami)
    elif ext == '.doc':
        sys.exit("Format .doc antic: converteix-lo abans (soffice --headless --convert-to docx).")
    else:
        sys.exit(f"Format no previst: {ext}")
    vistes, llista = set(), []
    for nom, dades in brutes:
        if dades in vistes:          # la mateixa imatge repetida (capçaleres, etc.)
            continue
        vistes.add(dades)
        m = mida(dades)
        if m and min(m) < MIN_COSTAT:
            continue
        llista.append({'nom': nom, 'dades': dades, 'mida': m})
    llista.sort(key=lambda c: (c['mida'][0] * c['mida'][1]) if c['mida'] else len(c['dades']), reverse=True)
    return llista


def desa_web(dades, desti):
    if Image is None:
        sys.exit("Cal Pillow per desar la foto per al web (pip install --break-system-packages pillow).")
    original = Image.open(io.BytesIO(dades))
    orientacio = original.getexif().get(0x0112, 1)
    if original.format == 'JPEG' and max(original.size) <= MAX_COSTAT and len(dades) <= MAX_BYTES and orientacio == 1:
        # Ja és bona per al web: es desa tal qual, sense tornar-la a comprimir.
        os.makedirs(os.path.dirname(desti) or '.', exist_ok=True)
        with open(desti, 'wb') as f:
            f.write(dades)
        return original.size, len(dades)
    im = ImageOps.exif_transpose(original).convert('RGB')
    im.thumbnail((MAX_COSTAT, MAX_COSTAT))
    qualitat = 88
    while True:
        buf = io.BytesIO()
        im.save(buf, 'JPEG', quality=qualitat, optimize=True, progressive=True)
        if buf.tell() <= MAX_BYTES or qualitat <= 50:
            break
        qualitat -= 6
    os.makedirs(os.path.dirname(desti) or '.', exist_ok=True)
    with open(desti, 'wb') as f:
        f.write(buf.getvalue())
    return im.size, buf.tell()


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('document')
    ap.add_argument('--surt', help="carpeta on deixar les candidates")
    ap.add_argument('--desa', help="desti del retrat per al web (public/assets/...jpg)")
    ap.add_argument('--tria', type=int, default=1, help="número de candidata a desar (1 = la més gran)")
    a = ap.parse_args()

    llista = candidates(a.document)
    if not llista:
        print("CAP IMATGE: el document no porta cap foto (més enllà de logotips o icones). Llavors sí que cal demanar el retrat.")
        sys.exit(2)

    if a.desa:
        if not 1 <= a.tria <= len(llista):
            sys.exit(f"--tria ha d'anar d'1 a {len(llista)}")
        c = llista[a.tria - 1]
        m, pes = desa_web(c['dades'], a.desa)
        print(f"DESAT {a.desa} ({m[0]}x{m[1]}, {pes // 1024} KB) a partir de {c['nom']}")
        if c['mida'] and max(c['mida']) < 600:
            print("AVÍS: l'original és petit (<600 px); es veurà poc nítid, però és la foto que ens han enviat.")
        return

    surt = a.surt or os.path.join(tempfile.gettempdir(), 'retrats-' + os.path.splitext(os.path.basename(a.document))[0].replace(' ', '_'))
    os.makedirs(surt, exist_ok=True)
    for i, c in enumerate(llista, 1):
        ext = os.path.splitext(c['nom'])[1] or '.img'
        cami = os.path.join(surt, f"{i:02d}{ext}")
        with open(cami, 'wb') as f:
            f.write(c['dades'])
        m = f"{c['mida'][0]}x{c['mida'][1]}" if c['mida'] else '?'
        print(f"{i}\t{m}\t{len(c['dades']) // 1024} KB\t{cami}")
    print(f"{len(llista)} candidata(es). Mira-les amb Read abans de desar-ne cap amb --desa.")


if __name__ == '__main__':
    main()
