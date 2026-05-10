import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  CloudOff,
  Heart,
  Home,
  Landmark,
  Loader2,
  LogIn,
  LogOut,
  MapPinned,
  Plane,
  Plus,
  Route,
  Sparkles,
  Trash2,
  Utensils,
  Users,
} from 'lucide-react'
import './App.css'
import {
  categoryConfig,
  cityIdeas,
  familyMembers,
  initialOptions,
  itineraryDraft,
  tripSegments,
} from './data/trip'
import {
  firebaseAuth,
  getFirebaseStatus,
  googleProvider,
  isFirebaseConfigured,
} from './services/firebaseClient'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { hasMapsKey, loadGoogleMaps } from './services/googleMaps'
import {
  canUseFirestore,
  saveOptionVotes,
  saveTripOption,
  saveUserProfile,
  seedInitialTripOptions,
  subscribeTripOptions,
  subscribeVotes,
  updateTripOptionStatus,
} from './services/tripRepository'

const tabs = [
  { id: 'lodging', icon: Home },
  { id: 'activities', icon: Landmark },
  { id: 'food', icon: Utensils },
  { id: 'itinerary', icon: Route },
]

const targetLabels = {
  family: 'Toda la familia',
  f1: 'Grupo F1',
  'non-f1': 'Planes sin F1',
}

const cityFilters = ['Todas', 'Madrid', 'París', 'España por decidir']

const ifemaCoords = { lat: 40.4625, lng: -3.6155 }

const fallbackImages = {
  lodging:
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
  activities:
    'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=1200&q=80',
  food: 'https://images.unsplash.com/photo-1515443961218-a51367888e4b?auto=format&fit=crop&w=1200&q=80',
}

function currency(value) {
  if (!value) return 'Por estimar'
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function getHostname(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'link pendiente'
  }
}

function displayImage(url) {
  if (!url) return ''
  if (url.includes('cf.bstatic.com') || url.includes('q-xx.bstatic.com')) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=720`
  }
  return url
}

function fallbackImage(option) {
  return fallbackImages[option.category] || fallbackImages.activities
}

function memberName(memberId) {
  return familyMembers.find((member) => member.id === memberId)?.name || 'Familiar'
}

function scoreDraft(draft) {
  let score = 64
  if (draft.category === 'lodging') score += 8
  if (draft.city === 'Madrid') score += 7
  if (draft.targetGroup === 'family') score += 5
  if (draft.targetGroup === 'non-f1') score += 4
  if (draft.url.trim()) score += 4
  if (draft.notes.trim().length > 60) score += 6
  return Math.min(score, 94)
}

function buildDraftOption(draft) {
  const fallbackTitle = draft.url
    ? `Opción de ${getHostname(draft.url)}`
    : 'Nueva opción familiar'

  return {
    id: `local-${Date.now()}`,
    code: 'NEW',
    category: draft.category,
    title: draft.title.trim() || fallbackTitle,
    source: draft.url ? getHostname(draft.url) : 'Propuesta familiar',
    city: draft.city,
    status: 'pending',
    url: draft.url.trim(),
    image: '',
    priceNight: null,
    priceTotal: null,
    rating: 'Pendiente de IA',
    reviews: null,
    capacity: draft.targetGroup === 'f1' ? 'Subgrupo F1' : 'Por verificar',
    transit: 'Por calcular con Maps',
    targetGroup: draft.targetGroup,
    aiScore: scoreDraft(draft),
    map: { x: 58, y: 48 },
    coords: null,
    highlights: [
      draft.notes.trim() || 'Pendiente de extracción automática del link',
      'La IA deberá revisar fotos, precio, ubicación y tiempos reales',
    ],
    cautions: ['Pendiente de aprobación y validación de disponibilidad'],
  }
}

function App() {
  const [activeTab, setActiveTab] = useState('lodging')
  const [selectedCity, setSelectedCity] = useState('Todas')
  const [activeMember, setActiveMember] = useState('camilo')
  const [showRemoved, setShowRemoved] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authReady, setAuthReady] = useState(!isFirebaseConfigured)
  const [syncStatus, setSyncStatus] = useState({
    label: 'Sincronizando',
    detail: 'Conectando opciones y votos familiares...',
    online: true,
  })
  const [options, setOptions] = useState(initialOptions)
  const [votes, setVotes] = useState({
    'lodging-m': ['camilo'],
    'lodging-b': ['juliana-novia'],
    'activity-retiro': ['cielo'],
  })
  const [draft, setDraft] = useState({
    title: '',
    url: '',
    category: 'lodging',
    city: 'Madrid',
    targetGroup: 'family',
    notes: '',
  })

  const firebaseStatus = getFirebaseStatus()
  const canSync = Boolean(currentUser && canUseFirestore())
  const displayedSyncStatus = currentUser
    ? syncStatus
    : {
        label: isFirebaseConfigured ? 'Sin sesión' : 'Modo local',
        detail: isFirebaseConfigured
          ? 'Inicia sesión para sincronizar sugerencias y votos.'
          : 'Configura Firebase para activar colaboración.',
        online: false,
      }
  const activeCategory = categoryConfig[activeTab]
  const f1Crew = familyMembers.filter((member) => member.group === 'f1')
  const familyCrew = familyMembers.filter((member) => member.group !== 'f1')

  useEffect(() => {
    if (!firebaseAuth) return undefined

    return onAuthStateChanged(firebaseAuth, (user) => {
      setCurrentUser(user)
      setAuthReady(true)
    })
  }, [])

  useEffect(() => {
    if (!currentUser || !canUseFirestore()) {
      return undefined
    }

    let active = true
    saveUserProfile(currentUser, activeMember)
      .then(() => seedInitialTripOptions(currentUser))
      .catch((error) => {
        if (!active) return
        setSyncStatus({
          label: 'Revisar permisos',
          detail: error.message,
          online: false,
        })
      })

    const unsubscribeOptions = subscribeTripOptions(
      (nextOptions) => {
        if (!active) return
        if (nextOptions.length) setOptions(nextOptions)
        setSyncStatus({
          label: 'Sincronizado',
          detail: currentUser.email || 'Sesión activa',
          online: true,
        })
      },
      (error) => {
        if (!active) return
        setSyncStatus({
          label: 'Sin conexión',
          detail: error.message,
          online: false,
        })
      },
    )

    const unsubscribeVotes = subscribeVotes(
      (nextVotes) => {
        if (active) setVotes(nextVotes)
      },
      (error) => {
        if (!active) return
        setSyncStatus({
          label: 'Votos locales',
          detail: error.message,
          online: false,
        })
      },
    )

    return () => {
      active = false
      unsubscribeOptions()
      unsubscribeVotes()
    }
  }, [activeMember, currentUser])

  const visibleOptions = useMemo(() => {
    return options
      .filter((option) => {
        if (option.category !== activeTab) return false
        if (!showRemoved && option.status === 'removed') return false
        if (selectedCity === 'Todas') return true
        if (selectedCity === 'España por decidir') {
          return option.city !== 'Madrid' && option.city !== 'París'
        }
        return option.city === selectedCity
      })
      .sort((a, b) => b.aiScore - a.aiScore)
  }, [activeTab, options, selectedCity, showRemoved])

  const bestOptions = useMemo(
    () =>
      options
        .filter((option) => option.status !== 'removed')
        .sort((a, b) => b.aiScore - a.aiScore)
        .slice(0, 4),
    [options],
  )

  const mapOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          option.status !== 'removed' &&
          option.city === 'Madrid' &&
          option.map &&
          option.category !== 'itinerary',
      ),
    [options],
  )

  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  async function handleSignIn() {
    if (!firebaseAuth || !googleProvider) return

    try {
      await signInWithPopup(firebaseAuth, googleProvider)
    } catch (error) {
      setSyncStatus({
        label: 'Login pendiente',
        detail: error.message,
        online: false,
      })
    }
  }

  async function handleSignOut() {
    if (!firebaseAuth) return
    await signOut(firebaseAuth)
    setOptions(initialOptions)
    setVotes({
      'lodging-m': ['camilo'],
      'lodging-b': ['juliana-novia'],
      'activity-retiro': ['cielo'],
    })
  }

  async function addOption(event) {
    event.preventDefault()
    const option = buildDraftOption(draft)
    setOptions((current) => [option, ...current])
    if (canSync) {
      await saveTripOption(option, currentUser)
    }
    setDraft({
      title: '',
      url: '',
      category: draft.category,
      city: draft.city,
      targetGroup: draft.targetGroup,
      notes: '',
    })
    setActiveTab(option.category)
  }

  function toggleVote(optionId) {
    const currentVotes = votes[optionId] || []
    const nextVotes = currentVotes.includes(activeMember)
      ? currentVotes.filter((memberId) => memberId !== activeMember)
      : [...currentVotes, activeMember]

    setVotes((current) => {
      return { ...current, [optionId]: nextVotes }
    })

    if (canSync) {
      saveOptionVotes(optionId, nextVotes, currentUser).catch((error) => {
        setSyncStatus({
          label: 'Voto local',
          detail: error.message,
          online: false,
        })
      })
    }
  }

  function removeOption(optionId) {
    setOptions((current) =>
      current.map((option) =>
        option.id === optionId ? { ...option, status: 'removed' } : option,
      ),
    )
    if (canSync) {
      updateTripOptionStatus(optionId, 'removed', currentUser).catch((error) => {
        setSyncStatus({
          label: 'Cambio local',
          detail: error.message,
          online: false,
        })
      })
    }
  }

  function restoreOption(optionId) {
    setOptions((current) =>
      current.map((option) =>
        option.id === optionId ? { ...option, status: 'active' } : option,
      ),
    )
    if (canSync) {
      updateTripOptionStatus(optionId, 'active', currentUser).catch((error) => {
        setSyncStatus({
          label: 'Cambio local',
          detail: error.message,
          online: false,
        })
      })
    }
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Viaje familiar septiembre 2026</p>
          <h1>Plan familiar Madrid y siguientes ciudades</h1>
        </div>
        <div className="status-stack">
          <div className={`firebase-pill ${firebaseStatus.ready ? 'ready' : ''}`}>
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{firebaseStatus.label}</span>
          </div>
          <div className={`sync-pill ${displayedSyncStatus.online ? 'ready' : ''}`}>
            {displayedSyncStatus.online ? (
              <CheckCircle2 size={18} aria-hidden="true" />
            ) : (
              <CloudOff size={18} aria-hidden="true" />
            )}
            <span>{displayedSyncStatus.label}</span>
          </div>
          {currentUser ? (
            <button className="auth-button" onClick={handleSignOut} type="button">
              <LogOut size={17} aria-hidden="true" />
              Salir
            </button>
          ) : (
            <button
              className="auth-button primary"
              disabled={!authReady || !isFirebaseConfigured}
              onClick={handleSignIn}
              type="button"
            >
              {authReady ? (
                <LogIn size={17} aria-hidden="true" />
              ) : (
                <Loader2 size={17} aria-hidden="true" />
              )}
              Entrar con Google
            </button>
          )}
        </div>
      </header>

      <section className="summary-grid" aria-label="Resumen del viaje">
        {tripSegments.map((segment) => (
          <article className="segment-card" key={segment.id}>
            <div className="segment-dot" style={{ background: segment.color }} />
            <p>{segment.dates}</p>
            <h2>
              {segment.city}, {segment.country}
            </h2>
            <span>{segment.focus}</span>
            <strong>{segment.status}</strong>
          </article>
        ))}
        <article className="family-card">
          <Users size={22} aria-hidden="true" />
          <p>Grupo completo</p>
          <h2>9 viajeros</h2>
          <span>{f1Crew.length} van a F1, {familyCrew.length} necesitan planes alternos</span>
        </article>
      </section>

      <section className="collab-strip" aria-label="Estado de colaboración">
        <div>
          <p className="eyebrow">Colaboración familiar</p>
          <h2>{displayedSyncStatus.detail}</h2>
        </div>
        <div className="collab-actions">
          <span>{currentUser ? currentUser.displayName || currentUser.email : 'Sin sesión'}</span>
          <strong>Votando como {memberName(activeMember)}</strong>
        </div>
      </section>

      <section className="workspace">
        <aside className="side-panel" aria-label="Familia y filtros">
          <div className="panel-block">
            <div className="panel-title">
              <Users size={18} aria-hidden="true" />
              <h2>Familia</h2>
            </div>
            <div className="member-list">
              {familyMembers.map((member) => (
                <button
                  className={`member-button ${activeMember === member.id ? 'active' : ''}`}
                  key={member.id}
                  onClick={() => setActiveMember(member.id)}
                  type="button"
                >
                  <span>{member.name}</span>
                  <small>{member.role}</small>
                </button>
              ))}
            </div>
          </div>

          <div className="panel-block groups">
            <h2>Grupos</h2>
            <div>
              <span>F1</span>
              <strong>{f1Crew.map((member) => member.name).join(', ')}</strong>
            </div>
            <div>
              <span>Planes alternos</span>
              <strong>{familyCrew.map((member) => member.name).join(', ')}</strong>
            </div>
          </div>
        </aside>

        <section className="main-panel">
          <nav className="tabbar" aria-label="Secciones">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const config = categoryConfig[tab.id]
              return (
                <button
                  className={activeTab === tab.id ? 'active' : ''}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  type="button"
                >
                  <Icon size={18} aria-hidden="true" />
                  <span>{config.label}</span>
                </button>
              )
            })}
          </nav>

          <div className="controls-row">
            <div className="city-filter" aria-label="Filtro por ciudad">
              {cityFilters.map((city) => (
                <button
                  className={selectedCity === city ? 'active' : ''}
                  key={city}
                  onClick={() => setSelectedCity(city)}
                  type="button"
                >
                  {city}
                </button>
              ))}
            </div>
            <button
              className="ghost-button"
              onClick={() => setShowRemoved((value) => !value)}
              type="button"
            >
              <Trash2 size={16} aria-hidden="true" />
              {showRemoved ? 'Ocultar retiradas' : 'Ver retiradas'}
            </button>
          </div>

          {activeTab === 'itinerary' ? (
            <ItineraryPanel />
          ) : (
            <OptionGrid
              activeCategory={activeCategory}
              activeMember={activeMember}
              onRemove={removeOption}
              onRestore={restoreOption}
              onVote={toggleVote}
              options={visibleOptions}
              votes={votes}
            />
          )}
        </section>
      </section>

      <section className="decision-map-grid">
        <section className="analysis-panel">
          <div className="section-heading">
            <Sparkles size={20} aria-hidden="true" />
            <div>
              <p className="eyebrow">Análisis IA</p>
              <h2>Mejor equilibrio familiar ahora</h2>
            </div>
          </div>
          <div className="ranking-list">
            {bestOptions.map((option, index) => (
              <article key={option.id}>
                <strong>{index + 1}</strong>
                <div>
                  <h3>{option.title}</h3>
                  <p>
                    {categoryConfig[option.category].shortLabel} · {targetLabels[option.targetGroup]}
                  </p>
                </div>
                <span>{option.aiScore}/100</span>
              </article>
            ))}
          </div>
        </section>

        <section className="map-panel">
          <div className="section-heading">
            <MapPinned size={20} aria-hidden="true" />
            <div>
              <p className="eyebrow">Mapa operativo</p>
              <h2>Madrid: opciones y planes</h2>
            </div>
          </div>
          <MadridMap options={mapOptions} />
        </section>
      </section>

      <section className="add-panel">
        <div className="section-heading">
          <Plus size={20} aria-hidden="true" />
          <div>
            <p className="eyebrow">Nueva sugerencia</p>
            <h2>Agregar link para analizar</h2>
          </div>
        </div>
        <form className="suggestion-form" onSubmit={addOption}>
          <label>
            <span>Nombre</span>
            <input
              onChange={(event) => updateDraft('title', event.target.value)}
              placeholder="Apartamento, restaurante, museo..."
              type="text"
              value={draft.title}
            />
          </label>
          <label>
            <span>Link</span>
            <input
              onChange={(event) => updateDraft('url', event.target.value)}
              placeholder="https://..."
              type="url"
              value={draft.url}
            />
          </label>
          <label>
            <span>Tipo</span>
            <select
              onChange={(event) => updateDraft('category', event.target.value)}
              value={draft.category}
            >
              <option value="lodging">Hospedaje</option>
              <option value="activities">Plan</option>
              <option value="food">Comida</option>
            </select>
          </label>
          <label>
            <span>Ciudad</span>
            <select
              onChange={(event) => updateDraft('city', event.target.value)}
              value={draft.city}
            >
              <option>Madrid</option>
              <option>París</option>
              <option>España por decidir</option>
            </select>
          </label>
          <label>
            <span>Grupo</span>
            <select
              onChange={(event) => updateDraft('targetGroup', event.target.value)}
              value={draft.targetGroup}
            >
              <option value="family">Toda la familia</option>
              <option value="f1">Grupo F1</option>
              <option value="non-f1">Planes sin F1</option>
            </select>
          </label>
          <label className="wide">
            <span>Notas</span>
            <textarea
              onChange={(event) => updateDraft('notes', event.target.value)}
              placeholder="Por qué puede servir, restricciones, precio visto, dudas..."
              value={draft.notes}
            />
          </label>
          <button className="primary-button" type="submit">
            <Plus size={18} aria-hidden="true" />
            Agregar opción
          </button>
        </form>
      </section>

      <section className="future-cities">
        <div className="section-heading">
          <CalendarDays size={20} aria-hidden="true" />
          <div>
            <p className="eyebrow">14-24 septiembre</p>
            <h2>Ciudades candidatas</h2>
          </div>
        </div>
        <div className="city-grid">
          {cityIdeas.map((idea) => (
            <article key={idea.id}>
              <span>{idea.country}</span>
              <h3>{idea.city}</h3>
              <p>{idea.angle}</p>
              <div className="progress">
                <i style={{ width: `${idea.readiness}%` }} />
              </div>
              <strong>{idea.dates}</strong>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}

function MadridMap({ options }) {
  const mapRef = useRef(null)
  const [mapError, setMapError] = useState('')
  const hasRealMap = hasMapsKey() && options.some((option) => option.coords)

  useEffect(() => {
    if (!hasRealMap || !mapRef.current) return undefined

    let cancelled = false
    let map
    const mapItems = []

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapRef.current) return

        map = new google.maps.Map(mapRef.current, {
          center: ifemaCoords,
          zoom: 12,
          mapTypeControl: false,
          fullscreenControl: false,
          streetViewControl: false,
          clickableIcons: false,
          styles: [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'off' }],
            },
          ],
        })

        const bounds = new google.maps.LatLngBounds()
        const infoWindow = new google.maps.InfoWindow()
        const ifemaPosition = new google.maps.LatLng(ifemaCoords.lat, ifemaCoords.lng)

        const ifemaMarker = new google.maps.Marker({
          map,
          position: ifemaPosition,
          title: 'IFEMA / MADRING',
          label: 'F1',
        })
        mapItems.push(ifemaMarker)
        bounds.extend(ifemaPosition)

        options
          .filter((option) => option.coords)
          .forEach((option) => {
            const position = new google.maps.LatLng(option.coords.lat, option.coords.lng)
            const marker = new google.maps.Marker({
              map,
              position,
              title: option.title,
              label: option.code,
            })
            const line = new google.maps.Polyline({
              map,
              path: [position, ifemaPosition],
              geodesic: true,
              strokeColor: option.category === 'lodging' ? '#2563eb' : '#0f766e',
              strokeOpacity: 0.55,
              strokeWeight: 3,
            })

            marker.addListener('click', () => {
              infoWindow.setContent(
                `<strong>${option.title}</strong><br>${option.transit}<br>${option.aiScore}/100`,
              )
              infoWindow.open({ anchor: marker, map })
            })

            mapItems.push(marker, line)
            bounds.extend(position)
          })

        map.fitBounds(bounds, 42)
      })
      .catch((error) => {
        if (!cancelled) setMapError(error.message)
      })

    return () => {
      cancelled = true
      mapItems.forEach((item) => item.setMap(null))
      map = null
    }
  }, [hasRealMap, options])

  if (!hasRealMap || mapError) {
    return <ConceptMap mapOptions={options} note={mapError} />
  }

  return (
    <div className="real-map-wrap">
      <div className="google-map" ref={mapRef} />
      <div className="map-caption">
        <CheckCircle2 size={16} aria-hidden="true" />
        <span>Mapa real con marcadores y líneas hacia IFEMA / MADRING</span>
      </div>
    </div>
  )
}

function ConceptMap({ mapOptions, note }) {
  return (
    <div className="map-stage" aria-label="Mapa conceptual de Madrid">
      <div className="route-line route-one" />
      <div className="route-line route-two" />
      <div className="ifema-pin">
        <Plane size={16} aria-hidden="true" />
        <span>IFEMA</span>
      </div>
      {mapOptions.map((option) => (
        <a
          className={`map-pin ${option.category}`}
          href={option.url || '#'}
          key={option.id}
          rel="noreferrer"
          style={{ left: `${option.map.x}%`, top: `${option.map.y}%` }}
          target={option.url ? '_blank' : undefined}
          title={option.title}
        >
          {option.code}
        </a>
      ))}
      {note ? <span className="map-note">{note}</span> : null}
    </div>
  )
}

function OptionGrid({
  activeCategory,
  activeMember,
  onRemove,
  onRestore,
  onVote,
  options,
  votes,
}) {
  if (!options.length) {
    return (
      <div className="empty-state">
        <Sparkles size={26} aria-hidden="true" />
        <h2>No hay opciones en esta vista</h2>
        <p>Agrega una sugerencia o cambia de ciudad.</p>
      </div>
    )
  }

  return (
    <div className="option-grid">
      {options.map((option) => {
        const optionVotes = votes[option.id] || []
        const hasVote = optionVotes.includes(activeMember)
        return (
          <article className={`option-card ${option.status}`} key={option.id}>
            <div className="option-media">
              <OptionImage option={option} />
              <span className="score-badge">{option.aiScore}/100</span>
            </div>
            <div className="option-body">
              <div className="option-title-row">
                <span className="code-badge">{option.code}</span>
                <div>
                  <p>{option.source} · {option.city}</p>
                  <h2>{option.title}</h2>
                </div>
              </div>

              <div className="metric-row">
                <span>
                  <CircleDollarSign size={16} aria-hidden="true" />
                  {currency(option.priceNight)}
                </span>
                <span>
                  <Users size={16} aria-hidden="true" />
                  {option.capacity}
                </span>
                <span>
                  <Route size={16} aria-hidden="true" />
                  {option.transit}
                </span>
              </div>

              <div className="tag-row">
                <span>{activeCategory.shortLabel}</span>
                <span>{targetLabels[option.targetGroup]}</span>
                <span>{option.rating}</span>
              </div>

              <ul className="signal-list">
                {option.highlights.slice(0, 2).map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>

              <div className="card-actions">
                <button
                  className={hasVote ? 'liked' : ''}
                  onClick={() => onVote(option.id)}
                  type="button"
                >
                  <Heart size={17} aria-hidden="true" />
                  {optionVotes.length}
                </button>
                {option.url ? (
                  <a href={option.url} rel="noreferrer" target="_blank">
                    Ver link
                  </a>
                ) : null}
                {option.status === 'removed' ? (
                  <button onClick={() => onRestore(option.id)} type="button">
                    Restaurar
                  </button>
                ) : (
                  <button onClick={() => onRemove(option.id)} type="button">
                    <Trash2 size={16} aria-hidden="true" />
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}

function OptionImage({ option }) {
  const [imageFailed, setImageFailed] = useState(false)
  const src = imageFailed || !option.image ? fallbackImage(option) : displayImage(option.image)

  return (
    <img
      alt={option.title}
      onError={() => setImageFailed(true)}
      referrerPolicy="no-referrer"
      src={src}
    />
  )
}

function ItineraryPanel() {
  return (
    <div className="itinerary-panel">
      {itineraryDraft.map((item) => (
        <article key={`${item.day}-${item.title}`}>
          <div className="date-chip">{item.day}</div>
          <div>
            <p>{item.city}</p>
            <h2>{item.title}</h2>
            <div className="itinerary-columns">
              <span>
                <Users size={16} aria-hidden="true" />
                {item.family}
              </span>
              <span>
                <Plane size={16} aria-hidden="true" />
                {item.f1}
              </span>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

export default App
