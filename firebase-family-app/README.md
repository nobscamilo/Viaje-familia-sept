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

## Estructura

- `src/data/trip.js`: datos iniciales de familia, ciudades, opciones e itinerario.
- `src/services/firebaseClient.js`: inicialización opcional de Firebase por variables de entorno.
- `legacy-current-site/`: copia de la web estática actual como referencia.
- `firebase.json`: configuración de Hosting y Firestore.
- `firestore.rules`: reglas iniciales para colaboración familiar autenticada.

## Pendiente de enlazar

En esta terminal aún no hay sesión activa de Firebase/GCloud. Cuando esté autenticada:

```bash
firebase login
gcloud auth login
gcloud billing accounts list
```

Luego se podrá crear el proyecto, activar billing con la cuenta correcta y añadir las APIs de Maps/Vertex AI.
