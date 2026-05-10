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
- Adultos agregan opciones directamente; menores quedan como pendientes. Listo.

## Fase 3: IA

- Cloud Function `analyzeTripOption`.
- Entrada: link, ciudad, categoría, grupo objetivo y notas.
- Salida: nombre, fotos, precio, ubicación, capacidad, pros/contras, puntaje y dudas.
- Guardar el análisis en Firestore. Listo.
- Cloud Function `suggestLodgingSearch` para búsquedas guiadas de hospedaje. Listo.
- Cloud Function `suggestFoodPlaces` para sugerencias de comida con Google Places + ranking IA. Listo.
- Cloud Function `suggestTransferSearch` para comparar traslados con Omio por tren, bus y avión. Listo.
- Cloud Function `generateItinerary` para itinerario familiar por ciudad/fechas. Listo.
- APIs listas: Vertex AI, Firebase Vertex AI, Generative Language y Secret Manager.
- Siguiente mejora: App Check obligatorio, control de costos por usuario y proveedores autorizados para disponibilidad real en Booking/Airbnb.

## Fase 4: Google Maps

- Geocoding para direcciones.
- Directions / Routes API para rutas en transporte público, andando o coche. Listo en primera versión.
- Map JavaScript API para marcadores, rutas hacia IFEMA y sugerencias Places. Listo en primera versión.
- Itinerarios por día con trayectos validados. Primera versión lista con IA.
- API key de navegador creada con restricciones por dominio y por APIs de Maps.
- API key server-side creada, restringida por APIs y guardada como secreto.

## Fase 5: Multi-ciudad

- Crear colecciones por etapa del viaje. Listo con `travelCities`.
- Madrid queda como fase F1.
- París / España se modelan como fases candidatas hasta decidir destino.
- La familia puede añadir ciudad, fechas, traslado e idea del plan desde la app.
- La app permite cambiar o crear perfiles de grupo de viaje con adultos y edades de niños. Listo con `travelGroups`.
- Presupuesto por persona con partidas seleccionables de hospedaje, comida, planes y traslados. Listo en frontend.
