#!/bin/sh
# Despliega las Cloud Functions en segundo plano y deja el registro en
# /tmp/fn.log. Va en un script porque osascript rompe las comillas y los
# `&` de una linea larga, y porque el despliegue tarda mas que el limite
# de una llamada.
cd "$(dirname "$0")/.." || exit 1
export PATH="$HOME/.nvm/versions/node/v26.0.0/bin:$PATH"
rm -f /tmp/fn.log
npx firebase deploy --only functions --project viaje-familia-sept-2026 \
  --non-interactive --force > /tmp/fn.log 2>&1
echo "---FIN:$?" >> /tmp/fn.log
