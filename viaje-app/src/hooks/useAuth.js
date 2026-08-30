import { useCallback, useEffect, useState } from 'react'
import { firebaseListo, getFb } from '../services/firebase.js'

/**
 * Sesión. En modo local devuelve a Camilo como si hubiera entrado, para poder
 * trabajar la interfaz sin montar autenticación ni pedir credenciales.
 */
const USUARIO_LOCAL = { uid: 'local-camilo', travelerId: 'camilo', name: 'Camilo', local: true }

export function useAuth() {
  const [user, setUser] = useState(firebaseListo ? undefined : USUARIO_LOCAL)

  const [falloArranque, setFalloArranque] = useState(null)

  useEffect(() => {
    if (!firebaseListo) return undefined
    let vivo = true
    let apagar = () => {}

    // Si el SDK no responde, la app NO puede quedarse girando para siempre.
    // Sin esto, una configuracion mala o una red caida dejan un "Un momento..."
    // eterno, que es la peor pantalla posible: no dice nada y no se puede salir.
    const plazo = setTimeout(() => {
      if (!vivo) return
      setUser((actual) => (actual === undefined ? null : actual))
      setFalloArranque('Firebase no respondió. Puede ser la conexión o la configuración.')
    }, 8000)

    getFb()
      .then((fb) => {
        if (!vivo || !fb) return
        apagar = fb.fa.onAuthStateChanged(
          fb.auth,
          (u) => {
            clearTimeout(plazo)
            setUser(u ? { uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL } : null)
          },
          (e) => { clearTimeout(plazo); setFalloArranque(e.message); setUser(null) },
        )
      })
      .catch((e) => { clearTimeout(plazo); setFalloArranque(e.message); setUser(null) })

    return () => { vivo = false; clearTimeout(plazo); apagar() }
  }, [])

  const entrar = useCallback(async () => {
    const fb = await getFb()
    if (!fb) return
    await fb.fa.signInWithPopup(fb.auth, fb.googleProvider)
  }, [])

  const salir = useCallback(async () => {
    const fb = await getFb()
    if (!fb) return
    await fb.fa.signOut(fb.auth)
  }, [])

  return {
    user,
    cargando: user === undefined,
    falloArranque,
    entrar,
    salir,
    modoLocal: !firebaseListo,
  }
}
