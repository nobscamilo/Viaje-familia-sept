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

La app local ya tiene `.env.local` con la configuración pública de Firebase. Ese archivo no se sube al repo porque `*.local` está ignorado.

## Estructura

- `src/data/trip.js`: datos iniciales de familia, ciudades, opciones e itinerario.
- `src/services/firebaseClient.js`: inicialización opcional de Firebase por variables de entorno.
- `legacy-current-site/`: copia de la web estática actual como referencia.
- `firebase.json`: configuración de Hosting y Firestore.
- `firestore.rules`: reglas iniciales para colaboración familiar autenticada.

## Pendiente de enlazar

Firebase CLI, GCloud CLI y ADC quedaron autenticados con `juancamilo.sarmiento@gmail.com`.

La primera cuenta de facturación abierta (`01535C-22D39F-1D84A8`) no pudo vincularse porque Google devolvió `Cloud billing quota exceeded`. Para activar Maps Platform, Vertex AI y rutas con costo hace falta una de estas dos opciones:

- Pedir aumento de cuota de billing para esa cuenta.
- Confirmar que se use otra cuenta de facturación abierta.

Comandos útiles:

```bash
firebase login
gcloud auth login
gcloud billing accounts list
```

Luego se podrán activar Maps/Vertex AI y añadir Cloud Functions.
