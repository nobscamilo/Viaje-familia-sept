/**
 * CreateTripModal.jsx
 * Modal form to create a new trip. After creation it returns the trip
 * object (including the generated joinCode) so the parent can enter it
 * and/or show the share link immediately.
 */

import { useState } from 'react'
import { Loader2, X } from 'lucide-react'
import { createTrip } from '../services/tripsRepository'

const EMOJI_OPTIONS = ['✈️', '🏖️', '🏔️', '🏎️', '🗺️', '🌍', '🎡', '🏰', '🌊', '🎭']

export default function CreateTripModal({ currentUser, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '',
    destination: '',
    startDate: '',
    endDate: '',
    description: '',
    emoji: '✈️',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }))
    setError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.name.trim()) {
      setError('El nombre del viaje es obligatorio.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const trip = await createTrip(form, currentUser)
      onCreated(trip)
    } catch (err) {
      setError(err.message || 'Error al crear el viaje. Inténtalo de nuevo.')
      setBusy(false)
    }
  }

  return (
    <div className="add-modal-overlay" role="dialog" aria-modal="true" aria-label="Crear viaje">
      <div className="add-modal">
        {/* Header */}
        <div className="add-modal-header">
          <div>
            <h2>Nuevo viaje</h2>
            <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.9rem' }}>
              Se generará un enlace de invitación que puedes compartir.
            </p>
          </div>
          <button className="add-modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Emoji picker */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="modal-form">
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
            <span>Destino principal</span>
            <input
              type="text"
              value={form.destination}
              onChange={(e) => update('destination', e.target.value)}
              placeholder="Ej: Roma, Italia"
              maxLength={80}
            />
          </label>

          <div className="modal-field-row">
            <label className="modal-field">
              <span>Fecha de inicio</span>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => update('startDate', e.target.value)}
              />
            </label>
            <label className="modal-field">
              <span>Fecha de fin</span>
              <input
                type="date"
                value={form.endDate}
                onChange={(e) => update('endDate', e.target.value)}
                min={form.startDate || undefined}
              />
            </label>
          </div>

          <label className="modal-field">
            <span>Descripción (opcional)</span>
            <textarea
              value={form.description}
              onChange={(e) => update('description', e.target.value)}
              placeholder="Una línea sobre el plan del viaje…"
              rows={2}
              maxLength={240}
            />
          </label>

          {error && (
            <p className="modal-error" role="alert">
              {error}
            </p>
          )}

          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>
              Cancelar
            </button>
            <button type="submit" className="login-button" disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" aria-hidden="true" /> : null}
              {busy ? 'Creando…' : 'Crear viaje'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
