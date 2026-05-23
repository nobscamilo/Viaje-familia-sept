/**
 * TripDashboard.jsx
 * Shown right after login. Lists the user's trips and lets them
 * create a new one or copy a shareable join link.
 */

import { lazy, Suspense, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronRight,
  Copy,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  Trash2,
  Users,
} from 'lucide-react'
import { isTripAdmin, MADRID_F1_TRIP_ID } from '../services/tripsRepository'

const CreateTripModal = lazy(() => import('./CreateTripModal'))

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDateRange(startDate, endDate) {
  if (!startDate && !endDate) return null
  const fmt = (d) => {
    if (!d) return ''
    const dt = new Date(d + 'T12:00:00Z')
    return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (!endDate) return fmt(startDate)
  return `${fmt(startDate)} – ${fmt(endDate)}`
}

function memberCount(members) {
  if (!members) return 0
  return Object.keys(members).length
}

function buildShareUrl(joinCode) {
  const base = window.location.origin + window.location.pathname
  return `${base}?join=${joinCode}`
}

// ─── Delete Confirmation Modal ─────────────────────────────────────────────────

function DeleteTripModal({ trip, onCancel, onConfirm, busy }) {
  return (
    <div className="add-modal-overlay" role="dialog" aria-modal="true" aria-label="Borrar viaje">
      <div className="add-modal delete-trip-modal">
        <div className="delete-trip-icon">🗑️</div>
        <h2>¿Borrar este viaje?</h2>
        <p className="delete-trip-name">{trip.emoji || '✈️'} {trip.name}</p>
        <p className="delete-trip-warning">
          Esta acción es permanente. Se elimina el viaje y todos los miembros perderán acceso.
          Las opciones guardadas quedarán huérfanas.
        </p>
        <div className="modal-actions">
          <button type="button" className="secondary-button" onClick={onCancel} disabled={busy}>
            Cancelar
          </button>
          <button type="button" className="delete-confirm-btn" onClick={onConfirm} disabled={busy}>
            {busy ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Trash2 size={15} aria-hidden="true" />}
            {busy ? 'Borrando…' : 'Sí, borrar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Trip Card ─────────────────────────────────────────────────────────────────

function TripCard({ trip, canDelete, onEnter, onDelete }) {
  const [copied, setCopied] = useState(false)
  const dateRange = formatDateRange(trip.startDate, trip.endDate)
  const count = memberCount(trip.members)
  const hasJoinCode = Boolean(trip.joinCode)
  const shareUrl = hasJoinCode ? buildShareUrl(trip.joinCode) : ''
  const isProtected = trip.id === MADRID_F1_TRIP_ID

  async function handleCopyLink(e) {
    e.stopPropagation()
    if (!hasJoinCode) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      window.prompt('Copia este enlace de invitación:', shareUrl)
    }
  }

  function handleDelete(e) {
    e.stopPropagation()
    onDelete(trip)
  }

  return (
    <article className="trip-card" onClick={() => onEnter(trip)}>
      <div className="trip-card-emoji">{trip.emoji || '✈️'}</div>
      <div className="trip-card-body">
        <h2 className="trip-card-name">{trip.name}</h2>
        {trip.destination && (
          <p className="trip-card-meta">
            <MapPin size={13} aria-hidden="true" />
            {trip.destination}
          </p>
        )}
        {dateRange && (
          <p className="trip-card-meta">
            <CalendarDays size={13} aria-hidden="true" />
            {dateRange}
          </p>
        )}
        <p className="trip-card-meta">
          <Users size={13} aria-hidden="true" />
          {count === 1 ? '1 miembro' : `${count} miembros`}
        </p>
        {trip.description && (
          <p className="trip-card-desc">{trip.description}</p>
        )}
      </div>
      <div className="trip-card-actions">
        <button
          className="trip-share-btn"
          onClick={handleCopyLink}
          disabled={!hasJoinCode}
          title={hasJoinCode ? `Copiar enlace: ${shareUrl}` : 'Recarga la página para generar el enlace'}
          aria-label="Copiar enlace de invitación"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copiado' : 'Invitar'}
        </button>
        {canDelete && !isProtected && (
          <button
            className="trip-delete-btn"
            onClick={handleDelete}
            title="Borrar viaje"
            aria-label="Borrar viaje"
          >
            <Trash2 size={14} />
          </button>
        )}
        <span className="trip-enter-btn" aria-hidden="true">
          <ChevronRight size={18} />
        </span>
      </div>
    </article>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function TripDashboard({ currentUser, userTrips, tripsLoading, onEnterTrip, onDeleteTrip, onSignOut }) {
  const [showCreate, setShowCreate] = useState(false)
  const [tripToDelete, setTripToDelete] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState(null)
  const canCreateTrips = isTripAdmin(currentUser)

  async function handleConfirmDelete() {
    if (!tripToDelete || deleteBusy) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await onDeleteTrip(tripToDelete.id)
      setTripToDelete(null)
    } catch (err) {
      setDeleteError(err.message || 'No se pudo borrar el viaje.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <main className="dashboard-screen">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <span className="dashboard-logo">✈️</span>
          <div>
            <p className="eyebrow">Planificador familiar</p>
            <h1 className="dashboard-title">Mis viajes</h1>
          </div>
        </div>
        <div className="dashboard-header-right">
          {currentUser?.photoURL && (
            <img
              src={currentUser.photoURL}
              alt={currentUser.displayName || 'Perfil'}
              className="dashboard-avatar"
            />
          )}
          <span className="dashboard-user-name">
            {currentUser?.displayName || currentUser?.email || 'Viajero'}
          </span>
          <button className="auth-button" onClick={onSignOut} title="Cerrar sesión">
            <LogOut size={15} aria-hidden="true" />
            Salir
          </button>
        </div>
      </header>

      {/* Content */}
      <section className="dashboard-content">
        {tripsLoading ? (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">⏳</div>
            <p>Cargando viajes…</p>
          </div>
        ) : userTrips.length === 0 ? (
          <div className="dashboard-empty">
            <div className="dashboard-empty-icon">🗺️</div>
            <h2>Aún no tienes viajes</h2>
            <p>Crea tu primer viaje o únete a uno con un enlace de invitación.</p>
          </div>
        ) : (
          <div className="trips-grid">
            {userTrips.map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                canDelete={canCreateTrips}
                onEnter={onEnterTrip}
                onDelete={setTripToDelete}
              />
            ))}
          </div>
        )}

        {deleteError && (
          <p className="modal-error" role="alert" style={{ textAlign: 'center', marginTop: '0.5rem' }}>
            {deleteError}
          </p>
        )}

        {/* Create Trip CTA — only for admins (Camilo & Juliana Bueno) */}
        {canCreateTrips && (
          <button
            className="create-trip-btn"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={18} aria-hidden="true" />
            Crear nuevo viaje
          </button>
        )}

        <p className="dashboard-join-hint">
          {canCreateTrips
            ? '¿Te invitaron a un viaje? Pide el enlace de invitación y se abrirá directo aquí.'
            : '¿Te invitaron a un viaje? Pide a Camilo o Juliana Bueno el enlace de invitación.'}
        </p>
      </section>

      {/* Create Trip Modal */}
      {showCreate && (
        <Suspense fallback={null}>
          <CreateTripModal
            currentUser={currentUser}
            onClose={() => setShowCreate(false)}
            onCreated={(trip) => {
              setShowCreate(false)
              onEnterTrip(trip)
            }}
          />
        </Suspense>
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <DeleteTripModal
          trip={tripToDelete}
          busy={deleteBusy}
          onCancel={() => { setTripToDelete(null); setDeleteError(null) }}
          onConfirm={handleConfirmDelete}
        />
      )}
    </main>
  )
}
