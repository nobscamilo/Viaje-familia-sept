import { useState } from 'react'
import { useTrip } from '../hooks/useTrip.js'
import { TRAVELERS } from '../data/travelers.js'
import { TRIP } from '../data/trip-madrid-2026.js'
import { daysUntil } from '../domain/dates.js'
import { motivo } from '../services/unirse.js'
import Icon from '../ui/Icon.jsx'
import './entrar.css'

/**
 * Puerta de entrada: el código y nada más.
 *
 * Rediseño Stitch Liquid Glass: portal privado con ambient glow,
 * tarjeta de cristal reflectivo, cuenta atrás dinámica y botón terracota.
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
      <header className="entrar-top">
        <div className="entrar-badge">
          <span className="entrar-dot-wrap">
            <span className="entrar-dot-ping" />
            <span className="entrar-dot" />
          </span>
          <span>Portal Privado · Septiembre 2026</span>
        </div>
      </header>

      <main className="entrar-main">
        <div className="entrar-caja">
          <div className="entrar-glow-1" />
          <div className="entrar-glow-2" />
          {children}
        </div>
      </main>

      <footer className="entrar-pie">
        <div className="entrar-pie-pill">
          <span className="entrar-pie-dot" />
          <span>Bitácora de viaje confidencial · Familia 2026</span>
        </div>
      </footer>
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

  const faltan = Math.max(0, daysUntil(TRIP.startDate, new Date()))

  return (
    <Marco>
      <div className="entrar-head-stitch">
        <h1 className="entrar-titulo">Viaje Familiar 2026</h1>
        <p className="entrar-sub-italic">Madrid • Barcelona • París</p>
        <div className="entrar-countdown-pill">
          <Icon name="calendar" size={13} />
          <span>Faltan <strong>{faltan}</strong> días para la partida</span>
        </div>
      </div>

      <p className="entrar-lede">
        Nueve personas, catorce días. Ingresa tu código personal para acceder a la bitácora familiar.
      </p>

      <form onSubmit={unirse} className="entrar-form">
        <div className="entrar-input-grupo">
          <label htmlFor="codigo-pin" className="entrar-label-code">
            Código de Invitación (8 Caracteres)
          </label>
          <input
            id="codigo-pin"
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
          <span className="entrar-input-hint">Ingresa la clave personal compartida para el grupo</span>
        </div>

        <button
          type="submit"
          className="entrar-btn"
          disabled={codigo.trim().length < 6 || ocupado}
        >
          {ocupado ? (
            <span>Verificando credenciales…</span>
          ) : (
            <span className="entrar-btn-inner">
              <span>Ingresar al portal</span>
              <span aria-hidden="true">→</span>
            </span>
          )}
        </button>
      </form>

      {estado && !ocupado && <p className="entrar-fallo">{estado}</p>}
      {falloArranque && <p className="entrar-fallo">{falloArranque}</p>}

      <div className="entrar-links-stitch">
        <a
          className="entrar-pill-link"
          href="https://wa.me/?text=Hola%20Camilo,%20por%20favor%20envíame%20el%20código%20del%20portal%20familiar"
          target="_blank"
          rel="noopener noreferrer"
        >
          Pedir código a Camilo
        </a>
        {!user && (
          <button type="button" className="entrar-pill-link" onClick={entrar}>
            Entrar con Google
          </button>
        )}
      </div>

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
