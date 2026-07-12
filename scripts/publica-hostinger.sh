#!/bin/bash
# Publica l'edició del dia a inteligencia-artificial.cat via FTP (Hostinger).
#
# Credencials: ~/.config/iacat/ftp.env amb
#   FTP_HOST=ftp.inteligencia-artificial.cat
#   FTP_USER=...
#   FTP_PASS=...
#   FTP_DIR=public_html        # arrel web dins del compte FTP ("." si el compte ja hi apunta)
#
# Ús: scripts/publica-hostinger.sh          → actualitza portada + puja + verifica
#     scripts/publica-hostinger.sh --dry    → només actualitza la portada localment
set -euo pipefail

PROJECTE="$(cd "$(dirname "$0")/.." && pwd)"
PUBLIC="$PROJECTE/public"
AVUI_PUNT="$(date +%d.%m.%Y)"     # 12.07.2026 — data visible a la portada
AVUI_VER="$(date +%Y%m%d%H)"      # 2026071209 — cache busting dels scripts

# 1. Actualitza la data de la portada i la versió dels scripts a index.html
sed -i '' -E "s/Edició en viu · [0-9]{2}\.[0-9]{2}\.[0-9]{4}/Edició en viu · $AVUI_PUNT/" "$PUBLIC/index.html"
sed -i '' -E "s/\.js\?v=[0-9]+/.js?v=$AVUI_VER/g" "$PUBLIC/index.html"
echo "Portada actualitzada: $AVUI_PUNT (v=$AVUI_VER)"

[ "${1:-}" = "--dry" ] && exit 0

# 2. Credencials
ENV_FILE="$HOME/.config/iacat/ftp.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: falta $ENV_FILE amb FTP_HOST/FTP_USER/FTP_PASS/FTP_DIR" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"
: "${FTP_HOST:?}" "${FTP_USER:?}" "${FTP_PASS:?}"
FTP_DIR="${FTP_DIR:-public_html}"

# El host srv1589.hstgr.io està cobert pel certificat *.hstgr.io: TLS valida directament.

# 3. Puja els fitxers de l'edició (FTPS explícit si el servidor l'ofereix)
FITXERS=(
  "index.html"
  "news.js"
  "radar.js"
  "reflection.js"
  "content/latest.json"
  "data/articles.json"
)
for f in "${FITXERS[@]}"; do
  echo "Pujant $f ..."
  curl -sS --ssl-reqd --ftp-create-dirs \
    -T "$PUBLIC/$f" \
    -u "$FTP_USER:$FTP_PASS" \
    "ftp://$FTP_HOST/$FTP_DIR/$f"
done

# 3b. Puja les imatges generades avui (assets nous de les últimes 24 h)
while IFS= read -r img; do
  rel="${img#"$PUBLIC/"}"
  echo "Pujant $rel ..."
  curl -sS --ssl-reqd --ftp-create-dirs \
    -T "$img" \
    -u "$FTP_USER:$FTP_PASS" \
    "ftp://$FTP_HOST/$FTP_DIR/$rel"
done < <(find "$PUBLIC/assets" -type f \( -name '*.jpg' -o -name '*.png' \) -mtime -1)

# 4. Verificació en viu: la portada ha de dur la data d'avui i news.js el primer slug local
sleep 3
LIVE_INDEX="$(curl -s "https://inteligencia-artificial.cat/?nocache=$AVUI_VER")"
LIVE_NEWS="$(curl -s "https://inteligencia-artificial.cat/news.js?nocache=$AVUI_VER")"
SLUG_LOCAL="$(grep -o '"slug": *"[^"]*"' "$PUBLIC/news.js" | head -1 | cut -d'"' -f4)"

echo "$LIVE_INDEX" | grep -q "Edició en viu · $AVUI_PUNT" \
  && echo "VERIFICAT: la portada en viu mostra l'edició del $AVUI_PUNT" \
  || { echo "ALERTA: la portada en viu NO mostra la data d'avui" >&2; exit 2; }
echo "$LIVE_NEWS" | grep -q "\"$SLUG_LOCAL\"" \
  && echo "VERIFICAT: news.js en viu conté l'article «$SLUG_LOCAL»" \
  || { echo "ALERTA: news.js en viu no coincideix amb el local" >&2; exit 2; }

echo "Publicació completada i verificada."
