# Roadmap Firebase / IA

## Fase 1: App familiar

- Frontend React en Firebase Hosting.
- Auth con Google para los familiares.
- Firestore para opciones, votos, comentarios y estados.
- Vista por secciones: hospedajes, planes, comida, itinerario y ciudades futuras.

## Fase 2: Colaboración real

- Guardar nuevas sugerencias en `tripOptions`. Listo en primera versión.
- Permitir votos por familiar en `votes`. Listo en primera versión.
- Marcar opciones como `active`, `pending` o `removed`. Listo en primera versión.
- Panel simple de aprobación para Camilo.

## Fase 3: IA

- Cloud Function `analyzeTripOption`.
- Entrada: link, ciudad, categoría, grupo objetivo y notas.
- Salida: nombre, fotos, precio, ubicación, capacidad, pros/contras, puntaje y dudas.
- Guardar el análisis en Firestore.
- APIs listas: Vertex AI, Firebase Vertex AI, Generative Language y Secret Manager.

## Fase 4: Google Maps

- Geocoding para direcciones.
- Routes API para tiempos reales.
- Map JavaScript API para marcadores y líneas hacia IFEMA. Listo en primera versión.
- Itinerarios por día con trayectos validados.
- API key de navegador creada con restricciones por dominio y por APIs de Maps.

## Fase 5: Multi-ciudad

- Crear colecciones por etapa del viaje.
- Madrid queda como fase F1.
- París / España se modelan como fases candidatas hasta decidir destino.
