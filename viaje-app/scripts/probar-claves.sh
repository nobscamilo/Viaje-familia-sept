#!/bin/sh
# Comprueba que las claves guardadas en Secret Manager sirven de verdad.
# No imprime ninguna clave, solo su prefijo y el resultado.
export PATH="/opt/homebrew/bin:$PATH"
P=viaje-familia-sept-2026

for S in GEMINI_API_KEY GOOGLE_MAPS_API_KEY; do
  K=$(gcloud secrets versions access latest --secret=$S --project=$P 2>/dev/null)
  V=$(gcloud secrets versions list $S --project=$P --format='value(createTime)' --limit=1 2>/dev/null)
  echo "--- $S"
  echo "    prefijo: $(printf %.10s "$K")…   largo: ${#K}   creada: $V"
done

echo
echo "--- prueba Gemini (generativelanguage)"
K=$(gcloud secrets versions access latest --secret=GEMINI_API_KEY --project=$P 2>/dev/null)
curl -s "https://generativelanguage.googleapis.com/v1beta/models?key=$K" \
  | head -c 220
echo
echo
echo "--- prueba Places"
M=$(gcloud secrets versions access latest --secret=GOOGLE_MAPS_API_KEY --project=$P 2>/dev/null)
curl -s -X POST 'https://places.googleapis.com/v1/places:searchText' \
  -H 'Content-Type: application/json' \
  -H "X-Goog-Api-Key: $M" \
  -H 'X-Goog-FieldMask: places.displayName,places.rating' \
  -d '{"textQuery":"restaurante familiar cerca de Puerta del Sol Madrid","maxResultCount":2,"languageCode":"es"}' \
  | head -c 300
echo
