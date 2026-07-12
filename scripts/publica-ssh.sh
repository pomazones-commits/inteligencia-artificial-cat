#!/bin/bash
# Publica l'edició del dia a inteligencia-artificial.cat per SSH/SFTP (Hostinger).
# Substitueix l'FTP: aquest servidor no accepta pujades FTP (el canal de dades es bloqueja),
# però SSH (una sola connexió, port 65002) sí. Autenticació amb clau, sense contrasenya.
#
# Config a ~/.config/iacat/deploy.env: SSH_KEY, SSH_PORT, SSH_HOST, SSH_USER, DOCROOT
#
# Ús: scripts/publica-ssh.sh          → actualitza portada, puja per SFTP i verifica en viu
#     scripts/publica-ssh.sh --dry    → només actualitza la portada localment
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

# 2. Config SSH
ENV_FILE="$HOME/.config/iacat/deploy.env"
if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: falta $ENV_FILE amb SSH_KEY/SSH_PORT/SSH_HOST/SSH_USER/DOCROOT" >&2
  exit 1
fi
# shellcheck disable=SC1090
source "$ENV_FILE"
: "${SSH_KEY:?}" "${SSH_PORT:?}" "${SSH_HOST:?}" "${SSH_USER:?}" "${DOCROOT:?}"
# sftp usa -P (majúscula) per al port; ssh/scp usen -p (minúscula)
SFTPOPT=(-i "$SSH_KEY" -P "$SSH_PORT" -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20)

# 3. Fitxers de l'edició + imatges noves de les últimes 24 h
FITXERS=(index.html news.js radar.js reflection.js content/latest.json data/articles.json)
IMATGES=()
while IFS= read -r img; do IMATGES+=("assets/${img##*/}"); done \
  < <(find "$PUBLIC/assets" -type f \( -name '*.jpg' -o -name '*.png' \) -mtime -1)

# 4. Genera un guió sftp (una sola connexió puja tots els fitxers)
LOTE="$(mktemp)"
trap 'rm -f "$LOTE"' EXIT
{
  echo "cd $DOCROOT"
  echo "-mkdir content"; echo "-mkdir data"; echo "-mkdir assets"
  for f in "${FITXERS[@]}"; do echo "put \"$PUBLIC/$f\" \"$f\""; done
  for f in "${IMATGES[@]}"; do echo "put \"$PUBLIC/$f\" \"$f\""; done
} > "$LOTE"

echo "Pujant per SFTP: ${FITXERS[*]} ${IMATGES[*]:-(cap imatge nova)}"
set +e
SFTP_OUT="$(sftp "${SFTPOPT[@]}" -b "$LOTE" "$SSH_USER@$SSH_HOST" 2>&1)"; SFTP_RC=$?
set -e
# Ignora el soroll esperat (avís post-quàntic i els -mkdir de carpetes que ja existeixen)
echo "$SFTP_OUT" | grep -viE 'post-quantum|store now|need to be upgraded|openssh\.com/pq|remote mkdir' | grep -iE 'error|fail|denied' && { echo "ERROR en la pujada SFTP." >&2; exit 3; } || true
[ "$SFTP_RC" -eq 0 ] || { echo "ERROR: sftp ha retornat codi $SFTP_RC." >&2; exit 3; }
echo "Pujada SFTP completada."

# 5. Verificació en viu
sleep 3
AVUI_ISO="$AVUI_PUNT"
LIVE_INDEX="$(curl -s "https://inteligencia-artificial.cat/?nocache=$AVUI_VER")"
LIVE_NEWS="$(curl -s "https://inteligencia-artificial.cat/news.js?nocache=$AVUI_VER")"
SLUG_LOCAL="$(grep -o '"slug": *"[^"]*"' "$PUBLIC/news.js" | head -1 | cut -d'"' -f4)"

ok=1
echo "$LIVE_INDEX" | grep -q "Edició en viu · $AVUI_ISO" \
  && echo "VERIFICAT: la portada en viu mostra l'edició del $AVUI_ISO" \
  || { echo "ALERTA: la portada en viu NO mostra la data d'avui" >&2; ok=0; }
echo "$LIVE_NEWS" | grep -q "\"$SLUG_LOCAL\"" \
  && echo "VERIFICAT: news.js en viu conté l'article «$SLUG_LOCAL»" \
  || { echo "ALERTA: news.js en viu no coincideix amb el local" >&2; ok=0; }
# comprova que la primera imatge nova respon (si n'hi ha)
if [ "${#IMATGES[@]}" -gt 0 ]; then
  code="$(curl -s -o /dev/null -w '%{http_code}' "https://inteligencia-artificial.cat/${IMATGES[0]}?nocache=$AVUI_VER")"
  [ "$code" = "200" ] && echo "VERIFICAT: imatge ${IMATGES[0]} servida (200)" \
    || { echo "ALERTA: imatge ${IMATGES[0]} retorna $code" >&2; ok=0; }
fi

[ "$ok" = "1" ] && echo "Publicació completada i verificada." || { echo "Publicació amb ERRORS — revisa les alertes." >&2; exit 2; }
