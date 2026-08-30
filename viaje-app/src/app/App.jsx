import { Navigate, Route, Routes } from 'react-router'
import AppShell from './AppShell.jsx'
import Entrar from './Entrar.jsx'
import Ahora from './surfaces/Ahora.jsx'
import Decisiones from './surfaces/Decisiones.jsx'
import Copiloto from './surfaces/Copiloto.jsx'
import Mapa from './surfaces/Mapa.jsx'
import Cuentas from './surfaces/Cuentas.jsx'
import Ajustes from './surfaces/Ajustes.jsx'
import { useTrip } from '../hooks/useTrip.js'

/**
 * Cuatro superficies, y la cuarta se gano el sitio.
 *
 * La regla original era «tres y nada mas», contra la app vieja de siete
 * pestañas. El Mapa entra el 26 de agosto de 2026 porque responde una
 * pregunta que ninguna de las otras tres respondia — «¿donde queda esto?» —
 * y porque una direccion en texto no le sirve a nadie que este de pie en una
 * calle que no conoce. La regla sigue viva: la quinta tendra que justificarse
 * igual de bien.
 */
export default function App() {
  const { user, cargando, sinAcceso, enlazado, modoLocal } = useTrip()

  // La puerta se pone delante de todo mientras falte algo: sesión, viaje o
  // saber quién eres. En modo local nada de esto aplica.
  const faltaAlgo = !modoLocal && (cargando || !user || sinAcceso || !enlazado)
  if (faltaAlgo) return <Entrar />

  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Ahora />} />
        <Route path="decisiones" element={<Decisiones />} />
        <Route path="mapa" element={<Mapa />} />
        <Route path="cuentas" element={<Cuentas />} />
        <Route path="copiloto" element={<Copiloto />} />
        {/* Ajustes NO va en la barra de abajo: ahi caben cuatro cosas que se
            usan todos los dias, y esto se usa dos veces en el viaje. Vive
            detras del avatar, que es donde la gente busca los ajustes. */}
        <Route path="ajustes" element={<Ajustes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
