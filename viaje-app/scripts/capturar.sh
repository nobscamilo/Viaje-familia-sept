#!/bin/bash
# Captura la app en un viewport de movil de verdad.
#
#   ALTO=2400 scripts/capturar.sh '/?hoy=2026-09-11T09:00' /tmp/x.png
#   ALTO=1600 scripts/capturar.sh '/decisiones?demo=1'     /tmp/y.png
#   ANCHO=375 scripts/capturar.sh '/cuentas'               /tmp/se.png
#
# ANCHO por defecto 430 (iPhone grande). Usa 375 —un iPhone SE— antes de dar
# por buena cualquier fila con importes: es el ancho que las parte.
#
# OJO: reutiliza /tmp/local-dist si existe. Borralo antes de verificar un
# cambio, o estaras mirando la compilacion de ayer y creyendo que funciona.
# Me paso el 28 de agosto: la barra de acciones no salia porque el build era
# viejo, y casi la doy por rota. `--window-size` de Chrome
# NO fija el viewport: renderiza mas ancho y recorta. El iframe de
# marco-movil.html si da 430 px reales.
set -e
cd "$(dirname "$0")/.." || exit 1
export PATH="$HOME/.nvm/versions/node/v26.0.0/bin:/usr/local/bin:/usr/bin:/bin"
RUTA="${1:-/}"
SALIDA="${2:-/tmp/captura.png}"

# Un servidor arrancado antes de borrar /tmp/local-dist se queda sirviendo
# el directorio BORRADO: `pgrep` dice que vive y las capturas salen de la
# compilacion de hace media hora. Matarlo siempre cuesta un segundo; no
# matarlo cuesta media tarde persiguiendo un fallo que no existe.
pkill -f "servir.py 4319" 2>/dev/null || true   # sin coincidencias devuelve 1, y hay `set -e`

if [ ! -f /tmp/local-dist/index.html ]; then
  VITE_FIREBASE_API_KEY='' VITE_FIREBASE_PROJECT_ID='' \
    npx vite build --outDir /tmp/local-dist --base ./ > /tmp/build-local.log 2>&1
fi
# El marco se copia SIEMPRE, no solo al compilar. Estaba dentro del `if` y una
# mejora del propio marco (el parametro `w`) no llegaba nunca si no tocaba
# recompilar: la captura salia con el ancho de antes y parecia un fallo de la
# app. Copiar un archivo de 1 KB no cuesta nada; perseguir eso, media hora.
cp scripts/marco-movil.html /tmp/local-dist/_marco.html
nohup python3 "$(pwd)/scripts/servir.py" 4319 /tmp/local-dist > /dev/null 2>&1 &
sleep 2
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless --disable-gpu --hide-scrollbars --window-size=$(( ${ANCHO:-430} + 40 )),${ALTO:-2200} \
  --screenshot="$SALIDA" \
  "http://localhost:4319/_marco.html?w=${ANCHO:-430}&h=$(( ${ALTO:-2200} - 50 ))&r=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$RUTA")" \
  > /dev/null 2>&1
echo "$SALIDA"
