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
- Las búsquedas guiadas ya guardan solicitudes en `searchRequests`; la siguiente mejora es convertirlas en análisis automático con Functions para evitar scraping inseguro desde el navegador.

## Fase 4: Google Maps

- Geocoding para direcciones.
- Directions / Routes API para rutas en transporte público, andando o coche. Listo en primera versión.
- Map JavaScript API para marcadores, rutas hacia IFEMA y sugerencias Places. Listo en primera versión.
- Itinerarios por día con trayectos validados.
- API key de navegador creada con restricciones por dominio y por APIs de Maps.

## Fase 5: Multi-ciudad

- Crear colecciones por etapa del viaje. Listo con `travelCities`.
- Madrid queda como fase F1.
- París / España se modelan como fases candidatas hasta decidir destino.
- La familia puede añadir ciudad, fechas, traslado e idea del plan desde la app.
