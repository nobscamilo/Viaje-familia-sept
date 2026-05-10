# Viaje Familia Septiembre 2026 App

Nueva app colaborativa para planear el viaje familiar a Madrid, F1 y posibles ciudades posteriores.

La página actual de GitHub Pages queda intacta en la raíz del repositorio. Esta carpeta contiene la nueva app Firebase.

## Primer uso local

```bash
npm install
npm run dev
```

## Firebase

El proyecto está preparado para:

- Firebase Hosting.
- Firebase Auth.
- Cloud Firestore.
- Cloud Functions / Vertex AI en una fase posterior.
- Google Maps Platform para rutas e itinerarios.

Copia `.env.example` a `.env.local` y completa los valores de Firebase cuando el proyecto exista.

```bash
cp .env.example .env.local
npm run build
firebase deploy --only hosting
```

Proyecto creado:

- Project ID: `viaje-familia-sept-2026`
- Firebase Console: https://console.firebase.google.com/project/viaje-familia-sept-2026/overview
- Hosting: https://viaje-familia-sept-2026.web.app
- Firestore: `(default)` en `europe-west1`, free tier activo
- Billing: activo
- Maps browser key: creada y restringida por dominios permitidos
- Firebase browser key: restringida por dominios permitidos

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
- `src/services/googleMaps.js`: carga controlada de Google Maps en el navegador.
- `legacy-current-site/`: copia de la web estática actual como referencia.
- `firebase.json`: configuración de Hosting y Firestore.
- `firestore.rules`: reglas iniciales para colaboración familiar autenticada.

## Funcionalidad actual

- Login con Google.
- Pantalla de inicio obligatoria; sin sesión no se entra a la app.
- Con sesión, se sincronizan opciones, votos, ciudades y estado de retirar/restaurar en Firestore.
- Las opciones base se siembran automáticamente en Firestore cuando entra el primer usuario.
- Mapa real de Google Maps con marcadores y rutas hacia IFEMA / MADRING.
- Selector de ruta: transporte público, andando o coche.
- Ciudades dinámicas con fechas, país, traslado e idea del plan.
- Búsqueda guiada de hospedajes con enlaces preparados a Booking, Airbnb y Google Travel.
- Sugerencias de restaurantes con Google Maps Places y opción de agregarlos a comida.
- Fallback visual si Google Maps no carga.

## Conexiones locales

Firebase CLI, GCloud CLI y ADC quedaron autenticados con `juancamilo.sarmiento@gmail.com`.

Comandos útiles:

```bash
firebase login
gcloud auth login
gcloud billing accounts list
```

Siguientes pasos: añadir Cloud Functions para análisis con IA, extracción controlada de links, generación de itinerarios y llamadas de servidor a Vertex AI / Maps Routes.
