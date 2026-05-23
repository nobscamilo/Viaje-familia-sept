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
  LogOut,
  MapPin,
  Plus,
  Users,
} from 'lucide-react'
import { isTripAdmin } from '../services/tripsRepository'

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

// ─── Trip Card ─────────────────────────────────────────────────────────────────

function TripCard({ trip, onEnter }) {
  const [copied, setCopied] = useState(false)
  const dateRange = formatDateRange(trip.startDate, trip.endDate)
  const count = memberCount(trip.members)
  const shareUrl = buildShareUrl(trip.joinCode)

  async function handleCopyLink(e) {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback: prompt
      window.prompt('Copia este enlace de invitación:', shareUrl)
    }
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
          title={`Copiar enlace: ${shareUrl}`}
          aria-label="Copiar enlace de invitación"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? 'Copiado' : 'Invitar'}
        </button>
        <span className="trip-enter-btn" aria-hidden="true">
          <ChevronRight size={18} />
        </span>
      </div>
    </article>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function TripDashboard({ currentUser, userTrips, tripsLoading, onEnterTrip, onSignOut }) {
  const [showCreate, setShowCreate] = useState(false)
  const canCreateTrips = isTripAdmin(currentUser)

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
              <TripCard key={trip.id} trip={trip} onEnter={onEnterTrip} />
            ))}
          </div>
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
    </main>
  )
}
