import { useMemo, useState } from 'react'
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Heart,
  Home,
  Landmark,
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
import { getFirebaseStatus } from './services/firebaseClient'

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
  const activeCategory = categoryConfig[activeTab]
  const f1Crew = familyMembers.filter((member) => member.group === 'f1')
  const familyCrew = familyMembers.filter((member) => member.group !== 'f1')

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

  function addOption(event) {
    event.preventDefault()
    const option = buildDraftOption(draft)
    setOptions((current) => [option, ...current])
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
    setVotes((current) => {
      const currentVotes = current[optionId] || []
      const nextVotes = currentVotes.includes(activeMember)
        ? currentVotes.filter((memberId) => memberId !== activeMember)
        : [...currentVotes, activeMember]
      return { ...current, [optionId]: nextVotes }
    })
  }

  function removeOption(optionId) {
    setOptions((current) =>
      current.map((option) =>
        option.id === optionId ? { ...option, status: 'removed' } : option,
      ),
    )
  }

  function restoreOption(optionId) {
    setOptions((current) =>
      current.map((option) =>
        option.id === optionId ? { ...option, status: 'active' } : option,
      ),
    )
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Viaje familiar septiembre 2026</p>
          <h1>Plan familiar Madrid y siguientes ciudades</h1>
        </div>
        <div className={`firebase-pill ${firebaseStatus.ready ? 'ready' : ''}`}>
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{firebaseStatus.label}</span>
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
          </div>
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
