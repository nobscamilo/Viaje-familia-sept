#!/bin/bash
# deploy-phase1.command
# Build + deploy Firebase Hosting para Phase 2 multi-trip.
# Uso: doble-click en Finder.

set -e

PROJECT_DIR="/Users/camilosar/Documents/Claude/Projects/Viaje sept/firebase-family-app"

cd "$PROJECT_DIR"

echo "════════════════════════════════════════════════════════════"
echo "  Phase 2 multi-trip — Build + Deploy"
echo "  $(date)"
echo "════════════════════════════════════════════════════════════"
echo ""

# Limpiar dist viejo
echo "▶ Limpiando dist/ anterior…"
rm -rf dist

# Build
echo ""
echo "▶ npm run build"
echo "────────────────────────────────────────────────────────────"
npm run build
BUILD_EXIT=$?

if [ $BUILD_EXIT -ne 0 ]; then
  echo ""
  echo "❌ Build falló. No se desplegará."
  echo ""
  read -n 1 -s -r -p "Pulsa cualquier tecla para cerrar…"
  exit $BUILD_EXIT
fi

# Deploy completo: hosting + reglas/indexes + functions.
echo ""
echo "▶ firebase deploy --only hosting,firestore:rules,firestore:indexes,functions"
echo "────────────────────────────────────────────────────────────"
firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
DEPLOY_EXIT=$?

echo ""
echo "════════════════════════════════════════════════════════════"
if [ $DEPLOY_EXIT -eq 0 ]; then
  echo "✅ Deploy completado."
else
  echo "❌ Deploy falló (exit code: $DEPLOY_EXIT)."
fi
echo "════════════════════════════════════════════════════════════"
echo ""
read -n 1 -s -r -p "Pulsa cualquier tecla para cerrar…"
