# Viaje Familia Septiembre 2026 App

Nueva app colaborativa para planear el viaje familiar a Madrid, F1 y posibles ciudades posteriores.

La página actual de GitHub Pages queda intacta en la raíz del repositorio. Esta carpeta contiene la nueva app Firebase.

## Primer uso local

```bash
npm install
npm run dev
```

Para revisar todo antes de desplegar:

```bash
npm run lint
npm run build
npm run functions:check
```

## Firebase

El proyecto está preparado para:

- Firebase Hosting.
- Firebase Auth.
- Cloud Firestore.
- Cloud Functions / Vertex AI.
- Google Maps Platform para rutas e itinerarios.

Copia `.env.example` a `.env.local` y completa los valores de Firebase cuando el proyecto exista.

```bash
cp .env.example .env.local
npm run build
npm run functions:check
firebase deploy --only hosting,firestore:rules,firestore:indexes,functions
```

Proyecto creado:

- Project ID: `viaje-familia-sept-2026`
- Firebase Console: https://console.firebase.google.com/project/viaje-familia-sept-2026/overview
- Hosting: https://viaje-familia-sept-2026.web.app
- Firestore: `(default)` en `europe-west1`, free tier activo
- Billing: activo
- Maps browser key: creada y restringida por dominios permitidos
- Maps functions key: creada, restringida por APIs y guardada como Secret Manager `GOOGLE_MAPS_API_KEY`
- Firebase browser key: restringida por dominios permitidos
- Cloud Functions: Node.js 22 en `europe-west1`
- Artifact Registry: limpieza automática de imágenes mayores a 14 días

La app local ya tiene `.env.local` con la configuración pública de Firebase. Ese archivo no se sube al repo porque `*.local` está ignorado.

APIs activadas:

- Firebase/Auth/Firestore: `firebase.googleapis.com`, `identitytoolkit.googleapis.com`, `firestore.googleapis.com`, `firebaserules.googleapis.com`, `firebasestorage.googleapis.com`, `firebaseappcheck.googleapis.com`.
- Hosting/backend: `firebasehosting.googleapis.com`, `cloudfunctions.googleapis.com`, `run.googleapis.com`, `cloudbuild.googleapis.com`, `artifactregistry.googleapis.com`, `eventarc.googleapis.com`, `pubsub.googleapis.com`, `secretmanager.googleapis.com`.
- IA: `aiplatform.googleapis.com`, `firebasevertexai.googleapis.com`, `generativelanguage.googleapis.com`.
- Maps/rutas: `maps-backend.googleapis.com`, `routes.googleapis.com`, `directions-backend.googleapis.com`, `distance-matrix-backend.googleapis.com`, `geocoding-backend.googleapis.com`, `places.googleapis.com`, `static-maps-backend.googleapis.com`.
- Llaves: `apikeys.googleapis.com`.

## Estructura

- `src/data/trip.js`: datos iniciales de familia, ciudades, opciones e itinerario.
- `src/services/firebaseClient.js`: inicialización opcional de Firebase por variables de entorno.
- `src/services/tripRepository.js`: sincronización de opciones y votos con Firestore.
- `src/services/aiFunctions.js`: llamadas autenticadas a Cloud Functions.
- `src/services/googleMaps.js`: carga controlada de Google Maps en el navegador.
- `functions/index.js`: backend IA con Gemini/Vertex AI, Places, Routes y Firestore Admin.
- `legacy-current-site/`: copia de la web estática actual como referencia.
- `firebase.json`: configuración de Hosting, Firestore y Functions.
- `firestore.rules`: reglas iniciales para colaboración familiar autenticada.

## Funcionalidad actual

- Login con Google.
- Pantalla de inicio obligatoria; sin sesión no se entra a la app.
- Con sesión, se sincronizan opciones, votos, ciudades y estado de retirar/restaurar en Firestore.
- Las opciones base se siembran automáticamente en Firestore cuando entra el primer usuario.
- Mapa real de Google Maps con marcadores y rutas hacia IFEMA / MADRING.
- Selector de ruta: transporte público, andando o coche, con tiempos estimados visibles por opción.
- Ciudades dinámicas con fechas, país, traslado e idea del plan.
- Perfiles de grupo de viaje para reutilizar la app en futuros viajes.
- Presupuesto por persona: permite seleccionar hospedajes, planes, comidas y traslados para calcular total y reparto.
- Búsqueda guiada de hospedajes con fechas y ocupación en Booking/Airbnb; Google Travel se separa en grupos de máximo 6 personas.
- Importación de links externos: si una opción gusta en Booking/Airbnb/Google Travel, se pega el link y la IA la agrega a Hospedajes.
- Búsqueda de traslados entre ciudades con Omio: compara tren, bus y avión y agrega la partida al presupuesto.
- La IA intenta extraer precios desde metadatos y texto público; si la plataforma oculta tarifa, se puede escribir precio visto total o por persona.
- Los adultos agregan opciones directamente como activas; menores quedan como pendientes de revisión.
- Sugerencias de restaurantes con Google Maps Places y opción de agregarlos a comida.
- Cloud Function `analyzeTripOption`: analiza links, extrae metadatos públicos, cruza Places/Routes y guarda la opción en Firestore.
- Cloud Function `suggestLodgingSearch`: genera búsquedas y criterios para Booking, Airbnb y Google Travel sin inventar disponibilidad.
- Cloud Function `suggestFoodPlaces`: obtiene lugares desde Google Places y los ordena con IA.
- Cloud Function `suggestTransferSearch`: prepara búsquedas Omio para tren, bus y avión.
- Cloud Function `generateItinerary`: crea itinerarios familiares teniendo en cuenta F1, niños, ciudades y opciones guardadas.
- Fallback visual si Google Maps no carga.

## Conexiones locales

Firebase CLI, GCloud CLI y ADC quedaron autenticados con `juancamilo.sarmiento@gmail.com`.

Comandos útiles:

```bash
firebase login
gcloud auth login
gcloud billing accounts list
```

Siguientes pasos: añadir App Check obligatorio, panel de aprobación para Camilo y extracción más profunda mediante proveedores autorizados o APIs externas de hospedaje.
