import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
}

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)

let app
let auth
let db
let functions

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig)
  auth = getAuth(app)
  db = getFirestore(app)
  functions = getFunctions(app, 'europe-west1')
}

export const firebaseApp = app
export const firebaseAuth = auth
export const firestoreDb = db
export const cloudFunctions = functions
export const googleProvider = isFirebaseConfigured
  ? new GoogleAuthProvider()
  : null

export function getFirebaseStatus() {
  if (!isFirebaseConfigured) {
    return {
      label: 'Modo local',
      detail: 'Listo para conectar Firebase cuando exista el proyecto.',
      ready: false,
    }
  }

  return {
    label: 'Firebase listo',
    detail: firebaseConfig.projectId,
    ready: true,
  }
}
