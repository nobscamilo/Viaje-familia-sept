/**
 * Arranque de Firebase, PEREZOSO a propósito.
 *
 * Importar el SDK arriba del archivo mete ~600 kB en el arranque aunque la
 * app esté en modo local. En una app que se abre en el metro de Madrid con
 * dos rayas de cobertura, eso no es un detalle: es la diferencia entre ver la
 * hora del tren o no verla.
 *
 * Aquí solo se lee la configuración. El SDK se carga la primera vez que
 * alguien pide `getFb()`, y solo si hay credenciales.
 */

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

export const TRIP_ID = import.meta.env.VITE_TRIP_ID || 'sept-2026'

/** Con estas dos basta para saber si podemos hablar con el servidor. */
export const firebaseListo = Boolean(config.apiKey && config.projectId)

let promesa = null

/**
 * Devuelve { app, auth, db, googleProvider, fs, fa } o null en modo local.
 * `fs` y `fa` son los módulos de Firestore y Auth, para no repetir imports.
 */
export function getFb() {
  if (!firebaseListo) return Promise.resolve(null)
  if (promesa) return promesa

  promesa = (async () => {
    const [{ initializeApp }, fs, fa] = await Promise.all([
      import('firebase/app'),
      import('firebase/firestore'),
      import('firebase/auth'),
    ])

    const app = initializeApp(config)

    // Caché en disco: durante el viaje habrá aviones, metro y cobertura mala.
    // Que la agenda se vea sin red no es un extra, es el caso de uso.
    const db = fs.initializeFirestore(app, {
      localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }),
    })

    return {
      app,
      db,
      fs,
      fa,
      auth: fa.getAuth(app),
      googleProvider: new fa.GoogleAuthProvider(),
    }
  })()

  return promesa
}
