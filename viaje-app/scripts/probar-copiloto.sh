#!/bin/sh
# Prueba el copiloto contra Gemini, Places y Routes de verdad.
# Saca las claves de Secret Manager: no las guarda en ningun archivo.
cd "$(dirname "$0")/.." || exit 1
export PATH="/opt/homebrew/bin:$HOME/.nvm/versions/node/v26.0.0/bin:$PATH"
P=viaje-familia-sept-2026

GEMINI_API_KEY=$(gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=$P 2>/dev/null)
GOOGLE_MAPS_API_KEY=$(gcloud secrets versions access latest --secret=GOOGLE_MAPS_API_KEY --project=$P 2>/dev/null)

if [ -z "$GEMINI_API_KEY" ] || [ -z "$GOOGLE_MAPS_API_KEY" ]; then
  echo "No pude leer los secretos. ¿Sesión de gcloud activa?"
  exit 1
fi

export GEMINI_API_KEY GOOGLE_MAPS_API_KEY
node functions/prueba-copiloto.mjs "$@"
