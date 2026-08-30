import { useState } from 'react'
import { useTrip } from '../hooks/useTrip.js'
import { TRAVELERS } from '../data/travelers.js'
import { motivo } from '../services/unirse.js'

import './entrar.css'

/**
 * Puerta de entrada: el código y nada más.
 *
 * Antes había que pasar por Google primero. Eso era pedirle a siete personas
 * que hicieran dos cosas para entrar a mirar un itinerario, y la mitad no
 * volvió. Ahora el código personal ES la sesión: la Cloud Function comprueba
 * de quién es y devuelve un token a nombre de ese viajero.
 *
 * Google se queda como salida de emergencia, escondida, para las cuentas que
 * ya estaban enlazadas antes del cambio. Un cambio de identidad sin puerta
 * trasera deja a alguien fuera, siempre.
 */
export default function Entrar() {
  const { user, cargando, sinAcceso, enlazado } = useTrip()

  if (cargando) return <Marco><p className="entrar-nota">Un momento…</p></Marco>
  if (!user || sinAcceso || !enlazado) return <Unirse />
  return null
}

function Marco({ children }) {
  return (
    <div className="entrar">
      <div className="entrar-caja">{children}</div>
    </div>
  )
}

function Unirse() {
  const { apuntarme, crearElViaje, entrar, falloArranque, user } = useTrip()
  const [codigo, setCodigo] = useState('')
  const [estado, setEstado] = useState(null)
  const [quien, setQuien] = useState('')
  const [primeraVez, setPrimeraVez] = useState(false)

  const ocupado = estado === 'trabajando'

  const unirse = async (e) => {
    e?.preventDefault?.()
    if (codigo.trim().length < 6) return
    setEstado('trabajando')
    try {
      await apuntarme(codigo)
    } catch (err) {
      setEstado(motivo(err))
    }
  }

  const crear = async () => {
    if (!quien) return
    setEstado('trabajando')
    try {
      await crearElViaje(quien)
    } catch {
      setEstado('No se pudo crear. Puede que alguien lo haya creado ya: entra con tu código.')
    }
  }

  if (primeraVez) {
    return (
      <Marco>
        <p className="entrar-eyebrow">Primera vez</p>
        <h1 className="entrar-titulo">Crear el viaje</h1>
        <p className="entrar-nota">
          Se creará con los datos ya verificados: los nueve viajeros, la agenda
          y las decisiones abiertas. Quien lo cree queda como responsable.
        </p>
        <Selector valor={quien} alCambiar={setQuien} tomados={new Set()} />
        <button type="button" className="entrar-btn" onClick={crear} disabled={!quien || ocupado}>
          {ocupado ? 'Creando…' : 'Crear el viaje'}
        </button>
        <button type="button" className="entrar-link" onClick={() => setPrimeraVez(false)}>
          Ya existe, tengo mi código
        </button>
        {estado && !ocupado && <p className="entrar-fallo">{estado}</p>}
      </Marco>
    )
  }

  return (
    <Marco>
      <p className="entrar-eyebrow">Septiembre 2026</p>
      <h1 className="entrar-titulo">Madrid, Barcelona y París</h1>
      <p className="entrar-lede">
        Nueve personas, catorce días. Entra con tu código: cada uno tiene el
        suyo, y con él ya sabemos quién eres.
      </p>

      <form onSubmit={unirse}>
        <input
          className="entrar-campo entrar-codigo"
          type="text"
          inputMode="text"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck="false"
          autoComplete="one-time-code"
          maxLength={12}
          placeholder="ABCD1234"
          aria-label="Tu código personal"
          value={codigo}
          onChange={(e) => setCodigo(e.target.value.toUpperCase())}
        />
        <button
          type="submit"
          className="entrar-btn"
          disabled={codigo.trim().length < 6 || ocupado}
        >
          {ocupado ? 'Un momento…' : 'Entrar'}
        </button>
      </form>

      {estado && !ocupado && <p className="entrar-fallo">{estado}</p>}
      {falloArranque && <p className="entrar-fallo">{falloArranque}</p>}

      <p className="entrar-nota">
        ¿No tienes código? Pídeselo a Camilo. El tuyo solo sirve para ti.
      </p>

      {!user && (
        <button type="button" className="entrar-link" onClick={entrar}>
          Entrar con Google (solo si ya entrabas así antes)
        </button>
      )}
      <button type="button" className="entrar-link" onClick={() => setPrimeraVez(true)}>
        Nadie ha creado el viaje todavía
      </button>
    </Marco>
  )
}

function Selector({ valor, alCambiar, tomados }) {
  const adultos = TRAVELERS.filter((t) => t.age >= 18)
  return (
    <select className="entrar-campo" value={valor} onChange={(e) => alCambiar(e.target.value)}>
      <option value="">Elige tu nombre…</option>
      {adultos.map((t) => (
        <option key={t.id} value={t.id} disabled={tomados.has(t.id)}>
          {t.short}{tomados.has(t.id) ? ' — ya enlazado' : ''}
        </option>
      ))}
    </select>
  )
}
