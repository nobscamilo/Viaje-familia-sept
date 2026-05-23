/**
 * CreateTripModal.jsx
 * Two-step modal for creating a new trip.
 * Step 1 — Basics: name, emoji, main destination + fixed dates.
 * Step 2 — Survey: base city, full return date, group composition.
 */

import { useState } from 'react'
import { ArrowLeft, ArrowRight, Loader2, Users, X } from 'lucide-react'
import { createTrip } from '../services/tripsRepository'

const EMOJI_OPTIONS = ['✈️', '🏖️', '🏔️', '🏎️', '🗺️', '🌍', '🎡', '🏰', '🌊', '🎭']

function parseChildrenAges(raw) {
  return raw
    .split(/[,;\s]+/)
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n) && n >= 0 && n <= 17)
}

export default function CreateTripModal({ currentUser, onClose, onCreated }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    emoji: '✈️',
    // survey fields
    returnDate: '',
    baseCity: '',
    adults: '2',
    childrenAgesRaw: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  function goNext(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('El nombre del viaje es obligatorio.')
      return
    }
    setError(null)
    setStep(2)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const adults = Math.max(1, parseInt(form.adults, 10) || 2)
    const childrenAges = parseChildrenAges(form.childrenAgesRaw)
    if (adults < 1) {
      setError('Debe haber al menos 1 adulto.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const trip = await createTrip(
        {
          name: form.name,
          destination: form.destination,
          startDate: form.startDate,
          endDate: form.endDate,
          returnDate: form.returnDate,
          baseCity: form.baseCity,
          adults,
          childrenAges,
          emoji: form.emoji,
        },
        currentUser,
      )
      onCreated(trip)
    } catch (err) {
      setError(err.message || 'Error al crear el viaje. Inténtalo de nuevo.')
      setBusy(false)
    }
  }

  return (
    <div className="add-modal-overlay" role="dialog" aria-modal="true" aria-label="Crear viaje">
      <div className="add-modal create-trip-modal">
        {/* Header */}
        <div className="add-modal-header">
          <div>
            {step === 2 && (
              <button
                className="trip-back-btn"
                type="button"
                onClick={() => { setStep(1); setError(null) }}
                aria-label="Volver"
              >
                <ArrowLeft size={15} aria-hidden="true" /> Atrás
              </button>
            )}
            <h2>{step === 1 ? 'Nuevo viaje' : 'Detalles del grupo'}</h2>
            <p className="create-trip-step-label">
              Paso {step} de 2 — {step === 1 ? 'Destino y fechas' : 'Ciudad base y viajeros'}
            </p>
          </div>
          <button className="add-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* ── STEP 1 ─────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <div className="trip-emoji-row">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className={`trip-emoji-btn${form.emoji === emoji ? ' selected' : ''}`}
                  onClick={() => update('emoji', emoji)}
                  aria-label={emoji}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <form onSubmit={goNext} className="modal-form">
              <label className="modal-field">
                <span>Nombre del viaje *</span>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => update('name', e.target.value)}
                  placeholder="Ej: Viaje a Roma verano 2027"
                  maxLength={80}
                  required
                  autoFocus
                />
              </label>

              <label className="modal-field">
                <span>Destino / evento principal</span>
                <input
                  type="text"
                  value={form.destination}
                  onChange={(e) => update('destination', e.target.value)}
                  placeholder="Ej: Madrid F1, Roma, París…"
                  maxLength={80}
                />
              </label>

              <p className="modal-field-hint">
                Fechas inamovibles del destino principal (el evento central del viaje).
              </p>
              <div className="modal-field-row">
                <label className="modal-field">
                  <span>Inicio del evento</span>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => update('startDate', e.target.value)}
                  />
                </label>
                <label className="modal-field">
                  <span>Fin del evento</span>
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => update('endDate', e.target.value)}
                    min={form.startDate || undefined}
                  />
                </label>
              </div>

              {error && <p className="modal-error" role="alert">{error}</p>}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="login-button">
                  Siguiente <ArrowRight size={15} aria-hidden="true" />
                </button>
              </div>
            </form>
          </>
        )}

        {/* ── STEP 2 ─────────────────────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="modal-form">
            <label className="modal-field">
              <span>Ciudad base (sin hospedaje) <span className="modal-field-optional">opcional</span></span>
              <input
                type="text"
                value={form.baseCity}
                onChange={(e) => update('baseCity', e.target.value)}
                placeholder="Ej: Guardo, Santander, tu ciudad natal…"
                maxLength={80}
                autoFocus
              />
              <small className="modal-field-desc">
                Ciudad desde la que salís. No se busca alojamiento ahí — solo excursiones de día.
              </small>
            </label>

            <label className="modal-field">
              <span>Fecha de regreso a casa <span className="modal-field-optional">opcional</span></span>
              <input
                type="date"
                value={form.returnDate}
                onChange={(e) => update('returnDate', e.target.value)}
                min={form.endDate || undefined}
              />
              <small className="modal-field-desc">
                Último día del viaje completo. Define la ventana disponible para ciudades extra.
              </small>
            </label>

            <div className="modal-survey-group">
              <p className="modal-survey-label">
                <Users size={14} aria-hidden="true" /> Composición del grupo
              </p>
              <div className="modal-field-row">
                <label className="modal-field">
                  <span>Adultos</span>
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={form.adults}
                    onChange={(e) => update('adults', e.target.value)}
                  />
                </label>
                <label className="modal-field">
                  <span>Edades de los niños <span className="modal-field-optional">opcional</span></span>
                  <input
                    type="text"
                    value={form.childrenAgesRaw}
                    onChange={(e) => update('childrenAgesRaw', e.target.value)}
                    placeholder="Ej: 3, 7, 12"
                  />
                </label>
              </div>
              <small className="modal-field-desc">
                Separa las edades con comas. Déjalo vacío si no viajan niños.
              </small>
            </div>

            {error && <p className="modal-error" role="alert">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="secondary-button" onClick={() => { setStep(1); setError(null) }} disabled={busy}>
                Atrás
              </button>
              <button type="submit" className="login-button" disabled={busy}>
                {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : null}
                {busy ? 'Creando…' : 'Crear viaje'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
