/**
 * La app de administrador, inicializada UNA vez.
 *
 * Existe por un detalle de los modulos ES: los `import` se evaluan antes que
 * el cuerpo del modulo que los importa. `planes.js` pedia Firestore al
 * cargarse, y eso ocurria antes del `initializeApp()` de `index.js`: la
 * funcion se caia al arrancar, no al llamarla. Con `getApps()` da igual quien
 * llegue primero.
 */
import { getApps, initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

if (!getApps().length) initializeApp()

export const db = getFirestore()
