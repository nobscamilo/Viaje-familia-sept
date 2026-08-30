#!/bin/sh
# Guarda una clave nueva de Gemini en Secret Manager y redespliega el copiloto.
#
# La clave se teclea aqui y va directa al gestor de secretos: NO pasa por el
# chat, no queda en el historial del terminal (se lee sin eco) y no toca ningun
# archivo del repositorio.
#
# Sacala de https://aistudio.google.com/apikey  (Google AI Studio, no Cloud).

set -e
cd "$(dirname "$0")/.." || exit 1
export PATH="/opt/homebrew/bin:$HOME/.nvm/versions/node/v26.0.0/bin:$PATH"
P=viaje-familia-sept-2026

printf 'Pega la clave de Gemini (no se vera al escribir): '
stty -echo 2>/dev/null
read -r CLAVE
stty echo 2>/dev/null
printf '\n'

if [ -z "$CLAVE" ]; then
  echo "No pegaste nada."
  exit 1
fi

echo "Comprobando la clave antes de guardarla…"
RES=$(curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$CLAVE")
case "$RES" in
  *'"models"'*) echo "  ✔ la clave funciona" ;;
  *) echo "  ✘ Google la rechaza:"; echo "$RES" | head -c 200; echo; exit 1 ;;
esac

printf '%s' "$CLAVE" | gcloud secrets versions add GEMINI_API_KEY --project=$P --data-file=-
echo "  ✔ guardada como version nueva del secreto"

echo "Redesplegando el copiloto para que la recoja…"
npx firebase deploy --only functions --project=$P --non-interactive --force > /tmp/fn.log 2>&1
tail -4 /tmp/fn.log

echo
echo "Ahora prueba:  sh scripts/probar-copiloto.sh"
