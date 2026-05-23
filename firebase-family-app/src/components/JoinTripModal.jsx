/**
 * JoinTripModal.jsx
 * Shown when the URL contains ?join=CODE after the user authenticates.
 * Resolves the trip, shows its details, and lets the user confirm joining.
 */

import { useEffect, useState } from 'react'
import { Check, Loader2, Users, X } from 'lucide-react'
import { getTripByJoinCode, joinTripByCode } from '../services/tripsRepository'

export default function JoinTripModal({ joinCode, currentUser, onJoined, onDismiss }) {
  const [trip, setTrip] = useState(null)
  const [resolving, setResolving] = useState(true)
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState(null)
  const [joined, setJoined] = useState(false)

  // Resolve the trip from the join code on mount
  useEffect(() => {
    if (!joinCode) return
    let active = true

    async function resolveInvite() {
      setResolving(true)
      setError(null)
      try {
        const result = await getTripByJoinCode(joinCode)
        if (!active) return
        if (!result) {
          setError(`No se encontró ningún viaje con el código "${joinCode}". Puede que el enlace sea incorrecto o haya expirado.`)
        } else {
          setTrip(result)
        }
      } catch (err) {
        if (!active) return
        setError(err.message || 'Error al buscar el viaje.')
      } finally {
        if (active) setResolving(false)
      }
    }

    resolveInvite()
    return () => {
      active = false
    }
  }, [joinCode])

  async function handleJoin() {
    if (!trip || joining) return
    setJoining(true)
    setError(null)
    try {
      const updatedTrip = await joinTripByCode(joinCode, currentUser)
      setJoined(true)
      // Brief pause so the ✓ is visible before entering
      setTimeout(() => onJoined(updatedTrip), 1200)
    } catch (err) {
      setError(err.message || 'Error al unirte al viaje.')
      setJoining(false)
    }
  }

  const memberCount = trip?.memberCount ?? (trip?.members ? Object.keys(trip.members).length : 0)
  const alreadyMember =
    trip?.alreadyMember || trip?.members?.[currentUser?.uid] !== undefined

  return (
    <div className="add-modal-overlay" role="dialog" aria-modal="true" aria-label="Unirse a viaje">
      <div className="add-modal" style={{ textAlign: 'center', maxWidth: 480 }}>
        {/* Close button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button className="add-modal-close" onClick={onDismiss} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {resolving && (
          <>
            <Loader2 size={32} className="spin" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p style={{ color: 'var(--muted)' }}>Buscando el viaje con código <strong>{joinCode}</strong>…</p>
          </>
        )}

        {!resolving && error && (
          <>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>😕</div>
            <h2 style={{ margin: '0 0 10px' }}>Enlace no válido</h2>
            <p style={{ color: 'var(--muted)', margin: '0 0 20px' }}>{error}</p>
            <button className="secondary-button" onClick={onDismiss}>
              Volver al inicio
            </button>
          </>
        )}

        {!resolving && trip && !joined && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 8 }}>{trip.emoji || '✈️'}</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', margin: '0 0 6px' }}>
              Te invitaron a un viaje
            </p>
            <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem' }}>{trip.name}</h2>
            {trip.destination && (
              <p style={{ margin: '0 0 4px', color: 'var(--muted)' }}>📍 {trip.destination}</p>
            )}
            {(trip.startDate || trip.endDate) && (
              <p style={{ margin: '0 0 4px', color: 'var(--muted)' }}>
                📅 {trip.startDate || ''}{trip.startDate && trip.endDate ? ' – ' : ''}{trip.endDate || ''}
              </p>
            )}
            <p style={{ margin: '8px 0 20px', color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Users size={14} />
              {memberCount === 1 ? '1 miembro' : `${memberCount} miembros`}
            </p>

            {alreadyMember && (
              <p style={{ color: 'var(--green)', fontWeight: 700, marginBottom: 16 }}>
                ✓ Ya eres miembro de este viaje.
              </p>
            )}

            {error && (
              <p style={{ color: 'var(--coral)', fontWeight: 700, marginBottom: 12 }}>
                {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button className="secondary-button" onClick={onDismiss} disabled={joining}>
                Cancelar
              </button>
              <button className="login-button" onClick={handleJoin} disabled={joining}>
                {joining
                  ? <><Loader2 size={16} className="spin" /> Uniéndome…</>
                  : alreadyMember
                    ? 'Entrar al viaje'
                    : 'Unirme al viaje'
                }
              </button>
            </div>
          </>
        )}

        {joined && (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>🎉</div>
            <h2 style={{ margin: '0 0 8px' }}>¡Te uniste!</h2>
            <p style={{ color: 'var(--muted)' }}>
              Entrando a <strong>{trip?.name}</strong>…
            </p>
            <Check size={32} style={{ color: 'var(--green)', margin: '16px auto 0', display: 'block' }} />
          </>
        )}
      </div>
    </div>
  )
}
