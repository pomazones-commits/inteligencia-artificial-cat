#!/usr/bin/env python3
"""Esborra del servidor els MP3 d'àudio més antics que N dies (per defecte 90).

Per què existeix (10.08.2026): l'àudio és el que fa créixer el disc del web.
El primer mes d'operació va ocupar 2,25 GB amb ~25 MP3 nous al dia; a aquest
ritme (~2 GB/mes) el pla d'allotjament s'omple en poc més de dos anys. Ningú no
escolta la notícia de fa tres mesos, així que es retiren.

⚠️ EL PANY IMPORTANT — la llista de protegits.
`genera_audio.py` té una passada horària de repesca que torna a generar
qualsevol MP3 que falti de les peces PUBLICADES ARA. Si esborréssim per edat
sense mirar res més, les peces manuals de llarga durada («La tribuna», «Estudis»)
entrarien en un bucle: cada setmana les esborraríem i cada hora es tornarien a
sintetitzar i a pujar. Per això, abans d'esborrar res, aquest script calcula
EXACTAMENT els mateixos noms de fitxer que generaria `genera_audio.py` avui i
els declara intocables, tinguin l'edat que tinguin.

⚠️ I per això la llista de peces i la lectura de dates s'IMPORTEN de
`genera_audio.py` en comptes de copiar-les. Copiar-les va ser el primer intent
i tenia un error de veritat: la data de l'anàlisi i la del quadern venen en
format DD.MM.AAAA i la còpia només entenia AAAA-MM-DD, o sigui que quatre de
les sis peces fixes quedaven desprotegides i entraven al bucle. Important:
**si algun dia s'afegeix una peça nova a `PECES_EXTRES` de `genera_audio.py`,
aquest script se n'assabenta sol.** No el toqueu per això.

Ordre de la casa: no esborra mai res que no acabi en `.mp3`, que no visqui a
`assets/audio/`, o que tingui un nom que no encaixi amb el patró dels slugs.

Ús:
    python automation/scripts/neteja_audio.py                  # esborra de debò
    python automation/scripts/neteja_audio.py --simulacio      # només diu què faria
    python automation/scripts/neteja_audio.py --dies 120       # un altre termini
    python automation/scripts/neteja_audio.py --forca          # salta el fre de seguretat

Variables d'entorn (les mateixes que genera_audio.py i desplega.yml):
    SSH_PRIVATE_KEY, SSH_HOST, SSH_USER, SSH_PORT (65002), SSH_PATH
"""
import argparse
import json
import os
import re
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

# Les peces, la lectura dels window.IA_* i la normalització de dates surten
# d'aquí: una sola definició per a tot el projecte (vegeu la capçalera).
sys.path.insert(0, str(Path(__file__).resolve().parent))
from genera_audio import (  # noqa: E402
    ARTICLES,
    PECES_EXTRES,
    SSH_PATH_DEFECTE,
    data_iso,
    llegeix_ia_js,
)

# Un nom de fitxer esborrable: lletres minúscules, xifres, guions, punts.
# Res de barres, res d'espais, res de «..». Si un nom no encaixa, es deixa estar.
NOM_SEGUR = re.compile(r"^[a-z0-9][a-z0-9._-]*\.mp3$")

# Fre de seguretat: si una passada vol esborrar més de la meitat dels fitxers
# i són més de 200, alguna cosa va malament (rellotge del servidor, ruta
# equivocada, articles.json buit...). Millor parar i mirar-ho.
LLINDAR_ABSOLUT = 200
LLINDAR_FRACCIO = 0.5


def protegits() -> set:
    """Els noms de MP3 que genera_audio.py generaria ARA mateix."""
    noms = set()

    if ARTICLES.is_file():
        try:
            items = json.loads(ARTICLES.read_text(encoding="utf-8")).get("items", [])
        except json.JSONDecodeError:
            items = []
            print("::warning::articles.json no es pot llegir; les notícies d'avui no queden protegides.")
        for item in items:
            slug = (item.get("slug") or "").strip()
            if slug:
                noms.add(f"{slug}.mp3")
    else:
        print(f"::warning::No s'ha trobat {ARTICLES}; les notícies d'avui no queden protegides.")

    for fitxer, prefix, _camps in PECES_EXTRES:
        dades = llegeix_ia_js(fitxer)
        iso = data_iso(str(dades.get("date", "")))
        if iso:
            noms.add(f"{prefix}-{iso}.mp3")

    return noms


class Servidor:
    """Connexió SSH amb la mateixa clau que fa servir el desplegament."""

    def __init__(self, host: str, user: str, port: str, clau: str, arrel: str):
        self.dir_audio = f"{arrel.rstrip('/')}/assets/audio"
        self._tmp = tempfile.TemporaryDirectory()
        fitxer_clau = Path(self._tmp.name) / "clau"
        fitxer_clau.write_text(clau.rstrip() + "\n", encoding="utf-8")
        fitxer_clau.chmod(stat.S_IRUSR | stat.S_IWUSR)
        self._ssh = [
            "ssh",
            "-i", str(fitxer_clau),
            "-o", f"UserKnownHostsFile={self._tmp.name}/known_hosts",
            "-o", "StrictHostKeyChecking=accept-new",
            "-o", "ConnectTimeout=20",
            "-o", "BatchMode=yes",
            "-p", port,
            f"{user}@{host}",
        ]

    def ordre(self, ordre: str, entrada: str = "", timeout: int = 120):
        return subprocess.run(
            self._ssh + [ordre],
            input=entrada,
            capture_output=True,
            text=True,
            timeout=timeout,
        )

    def total_mp3(self) -> int:
        r = self.ordre(f"ls -1 '{self.dir_audio}' 2>/dev/null | grep -c '\\.mp3$' || true")
        try:
            return int((r.stdout or "0").strip() or 0)
        except ValueError:
            return 0

    def vells(self, dies: int):
        """Noms (sense ruta) dels MP3 modificats fa més de `dies`. None si falla."""
        ordre = (
            f"find '{self.dir_audio}' -maxdepth 1 -type f -name '*.mp3' "
            f"-mtime +{dies} -print"
        )
        try:
            r = self.ordre(ordre, timeout=180)
        except subprocess.TimeoutExpired:
            print("::error::El servidor no respon en llistar l'àudio.")
            return None
        if r.returncode != 0:
            print(f"::error::No s'ha pogut llistar el servidor (codi {r.returncode}): {r.stderr.strip()}")
            return None
        noms = []
        for linia in (r.stdout or "").splitlines():
            linia = linia.strip()
            if linia:
                noms.append(linia.rsplit("/", 1)[-1])
        return noms

    def esborra(self, noms: list) -> int:
        """Esborra els fitxers dins del directori d'àudio. Retorna quants n'ha tret."""
        if not noms:
            return 0
        # Els noms viatgen per stdin, no com a arguments: així no hi ha límit de
        # longitud de línia d'ordres ni cap caràcter per esquivar. I el `cd`
        # garanteix que no es pot tocar res fora del directori d'àudio.
        guio = (
            f"cd '{self.dir_audio}' || exit 1; "
            "n=0; while IFS= read -r f; do "
            '[ -f "$f" ] && rm -f -- "$f" && n=$((n+1)); '
            "done; echo \"$n\""
        )
        try:
            r = self.ordre(guio, entrada="\n".join(noms) + "\n", timeout=600)
        except subprocess.TimeoutExpired:
            print("::warning::Temps esgotat esborrant; la passada de la setmana vinent ho reprendrà.")
            return 0
        if r.returncode != 0:
            print(f"::error::No s'ha pogut esborrar (codi {r.returncode}): {r.stderr.strip()}")
            return 0
        try:
            return int((r.stdout or "0").strip().splitlines()[-1])
        except (ValueError, IndexError):
            return 0


def main() -> int:
    sys.stdout.reconfigure(line_buffering=True)

    arg = argparse.ArgumentParser(description="Retirada dels MP3 antics del servidor.")
    arg.add_argument("--dies", type=int, default=90, help="edat mínima per esborrar (per defecte 90)")
    arg.add_argument("--simulacio", action="store_true", help="no esborra res, només ho explica")
    arg.add_argument("--forca", action="store_true", help="salta el fre de seguretat")
    opcions = arg.parse_args()

    if opcions.dies < 30:
        print("::error::El termini mínim és de 30 dies. Amb menys es trepitja contingut viu.")
        return 1

    clau = os.environ.get("SSH_PRIVATE_KEY", "").strip()
    host = os.environ.get("SSH_HOST", "").strip()
    user = os.environ.get("SSH_USER", "").strip()
    if not (clau and host and user):
        print("Els secrets SSH_* no estan definits; no hi ha res a fer.")
        return 0

    servidor = Servidor(
        host, user,
        os.environ.get("SSH_PORT", "").strip() or "65002",
        clau,
        os.environ.get("SSH_PATH", "").strip() or SSH_PATH_DEFECTE,
    )

    total = servidor.total_mp3()
    if total == 0:
        print(f"Cap MP3 a {servidor.dir_audio} (o el directori no respon). No es toca res.")
        return 0

    candidats = servidor.vells(opcions.dies)
    if candidats is None:
        return 1

    intocables = protegits()
    print(f"MP3 al servidor: {total}")
    print(f"Peces publicades ara (intocables): {len(intocables)}")
    print(f"Amb més de {opcions.dies} dies: {len(candidats)}")

    # Xarxa contra un error de configuració: si la llista d'intocables surt
    # sospitosament curta, és que el repositori no s'ha llegit bé. Amb una
    # edició normal n'hi ha ~26 (20 notícies + les peces fixes).
    if len(intocables) < 5:
        print("::error::La llista de peces publicades ha sortit gairebé buida. "
              "Això vol dir que el repositori no s'ha llegit bé, no que no hi hagi peces. "
              "No s'esborra res.")
        return 1

    a_esborrar, saltats_protegits, saltats_nom = [], [], []
    for nom in candidats:
        if nom in intocables:
            saltats_protegits.append(nom)
        elif not NOM_SEGUR.match(nom):
            saltats_nom.append(nom)
        else:
            a_esborrar.append(nom)

    if saltats_protegits:
        print(f"Protegits tot i ser vells ({len(saltats_protegits)}): "
              f"{', '.join(sorted(saltats_protegits))}")
    if saltats_nom:
        print(f"::warning::{len(saltats_nom)} fitxer(s) amb un nom que no encaixa amb el patró; no es toquen.")

    if not a_esborrar:
        print("Res per retirar. Fet.")
        return 0

    if (not opcions.forca
            and len(a_esborrar) > LLINDAR_ABSOLUT
            and len(a_esborrar) > total * LLINDAR_FRACCIO):
        print(f"::error::El fre de seguretat ha saltat: {len(a_esborrar)} de {total} MP3 "
              f"({len(a_esborrar) * 100 // total}%). Reviseu-ho i, si és correcte, "
              f"torneu-ho a llançar amb --forca.")
        return 1

    # El registre del que es retira, però sense inundar el log d'Actions:
    # amb 150 fitxers a la setmana, la llista sencera tapa la resta de la sortida.
    print(f"A retirar: {len(a_esborrar)}")
    ordenats = sorted(a_esborrar)
    for nom in ordenats[:20]:
        print(f"  - {nom}")
    if len(ordenats) > 20:
        print(f"  … i {len(ordenats) - 20} més (primer: {ordenats[0]}; últim: {ordenats[-1]})")

    if opcions.simulacio:
        print("SIMULACIÓ: no s'ha esborrat res.")
        return 0

    trets = servidor.esborra(a_esborrar)
    print(f"Retirats {trets} de {len(a_esborrar)} MP3.")
    if trets != len(a_esborrar):
        print("::warning::Algun fitxer no s'ha pogut esborrar; la passada de la setmana vinent ho reintentarà.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
