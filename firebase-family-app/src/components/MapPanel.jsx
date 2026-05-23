import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Car,
  CheckCircle2,
  CircleDollarSign,
  Footprints,
  Heart,
  MapPinned,
  TrainFront,
} from 'lucide-react'
import { categoryConfig } from '../data/trip'
import { hasMapsKey, loadGoogleMapsLibraries } from '../services/googleMaps'

const routeModes = {
  TRANSIT: {
    label: 'Transporte público',
    icon: TrainFront,
  },
  WALKING: {
    label: 'Andando',
    icon: Footprints,
  },
  DRIVING: {
    label: 'Coche',
    icon: Car,
  },
}

const mapCategories = [
  { id: 'all', label: 'Todos', emoji: '🗺️' },
  { id: 'lodging', label: 'Hospedajes', emoji: '🏨' },
  { id: 'food', label: 'Comida', emoji: '🍽️' },
  { id: 'activities', label: 'Actividades', emoji: '🎯' },
  { id: 'transport', label: 'Traslados', emoji: '🚗' },
]

const catEmoji = { lodging: '🏨', food: '🍽️', activities: '🎯', transport: '🚗', transfer: '🚗' }

function optionVotes(votes, optionId) {
  return votes?.[optionId]?.length || 0
}

function citySelectionOptions(options, budgetOptionIds, votes) {
  return options
    .filter((option) => budgetOptionIds.includes(option.id) || optionVotes(votes, option.id) > 0)
    .sort((a, b) => {
      const budgetDelta = Number(budgetOptionIds.includes(b.id)) - Number(budgetOptionIds.includes(a.id))
      if (budgetDelta) return budgetDelta
      return optionVotes(votes, b.id) - optionVotes(votes, a.id)
    })
}

function CitySelectionPanel({ budgetOptionIds, city, options, votes }) {
  const selectedOptions = citySelectionOptions(options, budgetOptionIds, votes)
  const budgetCount = options.filter((option) => budgetOptionIds.includes(option.id)).length
  const votedCount = options.filter((option) => optionVotes(votes, option.id) > 0).length
  const categoryCounts = options.reduce((acc, option) => {
    acc[option.category] = (acc[option.category] || 0) + 1
    return acc
  }, {})

  return (
    <aside className="city-selection-panel" aria-label={`Selección de ${city}`}>
      <div>
        <p className="eyebrow">Selección de ciudad</p>
        <h3>{city}</h3>
      </div>

      <div className="city-selection-kpis">
        <article>
          <strong>{options.length}</strong>
          <span>guardadas</span>
        </article>
        <article>
          <strong>{budgetCount}</strong>
          <span>presupuesto</span>
        </article>
        <article>
          <strong>{votedCount}</strong>
          <span>con votos</span>
        </article>
      </div>

      <div className="city-selection-cats">
        {Object.entries(categoryCounts).map(([category, count]) => (
          <span className={`city-selection-cat ${category}`} key={category}>
            {catEmoji[category] || '📍'} {count} {categoryConfig[category]?.shortLabel || category}
          </span>
        ))}
      </div>

      {selectedOptions.length ? (
        <div className="city-selection-list">
          {selectedOptions.slice(0, 8).map((option) => {
            const votesCount = optionVotes(votes, option.id)
            const inBudget = budgetOptionIds.includes(option.id)
            return (
              <article key={option.id}>
                <span className={`route-code-badge ${option.category}`}>{option.code}</span>
                <div>
                  <strong>{option.title}</strong>
                  <small>{categoryConfig[option.category]?.shortLabel || option.category}</small>
                </div>
                <div className="city-selection-flags">
                  {inBudget ? (
                    <span title="Incluido en presupuesto">
                      <CircleDollarSign size={13} aria-hidden="true" />
                    </span>
                  ) : null}
                  {votesCount ? (
                    <span title={`${votesCount} votos`}>
                      <Heart size={13} aria-hidden="true" />
                      {votesCount}
                    </span>
                  ) : null}
                </div>
              </article>
            )
          })}
        </div>
      ) : (
        <p className="city-selection-empty">
          Aún no hay opciones votadas o añadidas al presupuesto en esta ciudad.
        </p>
      )}
    </aside>
  )
}

function TripMap({ city, destinationCoords, options, routeMode }) {
  const mapRef = useRef(null)
  const [mapError, setMapError] = useState('')
  const [routeSummaries, setRouteSummaries] = useState({})
  const hasDestination = Boolean(destinationCoords?.lat && destinationCoords?.lng)
  const hasRealMap = hasMapsKey() && hasDestination

  useEffect(() => {
    if (!hasRealMap || !mapRef.current) return undefined

    let cancelled = false
    const mapItems = []
    setMapError('')
    setRouteSummaries({})

    loadGoogleMapsLibraries(['core', 'maps', 'marker', 'routes'])
      .then(({ google, libraries }) => {
        if (cancelled || !mapRef.current) return
        const mapsLibrary = libraries.maps || google.maps
        const coreLibrary = libraries.core || google.maps
        const markerLibrary = libraries.marker || google.maps
        const routesLibrary = libraries.routes || google.maps
        const GoogleMap = mapsLibrary.Map || google.maps.Map
        const InfoWindow = mapsLibrary.InfoWindow || google.maps.InfoWindow
        const Polyline = mapsLibrary.Polyline || google.maps.Polyline
        const LatLng = coreLibrary.LatLng || google.maps.LatLng
        const LatLngBounds = coreLibrary.LatLngBounds || google.maps.LatLngBounds
        const Point = coreLibrary.Point || google.maps.Point
        const Size = coreLibrary.Size || google.maps.Size
        const Marker = markerLibrary.Marker || google.maps.Marker
        const DirectionsService = routesLibrary.DirectionsService || google.maps.DirectionsService
        const DirectionsRenderer = routesLibrary.DirectionsRenderer || google.maps.DirectionsRenderer
        const DirectionsStatus = routesLibrary.DirectionsStatus || google.maps.DirectionsStatus
        const TravelMode = routesLibrary.TravelMode || google.maps.TravelMode

        const map = new GoogleMap(mapRef.current, {
          center: destinationCoords,
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

        const bounds = new LatLngBounds()
        const infoWindow = new InfoWindow()
        const directionsService = new DirectionsService()
        const destinationPosition = new LatLng(destinationCoords.lat, destinationCoords.lng)
        const isMadrid = city === 'Madrid'

        const categoryColors = {
          lodging: { fill: '#2563eb', stroke: '#1e40af' },
          food: { fill: '#ea580c', stroke: '#c2410c' },
          activities: { fill: '#0d9488', stroke: '#0f766e' },
          transport: { fill: '#7c3aed', stroke: '#6d28d9' },
          transfer: { fill: '#7c3aed', stroke: '#6d28d9' },
        }
        const defaultColor = { fill: '#475569', stroke: '#334155' }

        function makePinIcon(label, category) {
          const { fill, stroke } = categoryColors[category] || defaultColor
          const text = (label || '').substring(0, 3)
          const fontSize = text.length > 2 ? 8 : 10
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
            <path d="M20 1C9.507 1 1 9.507 1 20c0 14.255 19 29 19 29S39 34.255 39 20C39 9.507 30.493 1 20 1z" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
            <circle cx="20" cy="20" r="11" fill="rgba(255,255,255,0.25)"/>
            <text x="20" y="${20 + fontSize / 2 + 1}" font-family="Arial,Helvetica,sans-serif" font-size="${fontSize}" font-weight="700" fill="#fff" text-anchor="middle">${text}</text>
          </svg>`
          return {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
            scaledSize: new Size(40, 50),
            anchor: new Point(20, 50),
          }
        }

        function makeDestinationIcon(label) {
          const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">
            <path d="M22 1C10.402 1 1 10.402 1 22c0 15.681 21 31 21 31S43 37.681 43 22C43 10.402 33.598 1 22 1z" fill="#dc2626" stroke="#991b1b" stroke-width="2"/>
            <circle cx="22" cy="22" r="13" fill="rgba(255,255,255,0.2)"/>
            <text x="22" y="17" font-family="Arial,Helvetica,sans-serif" font-size="8" font-weight="800" fill="#fff" text-anchor="middle">${label}</text>
            <text x="22" y="28" font-size="14" text-anchor="middle">🏁</text>
          </svg>`
          return {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
            scaledSize: new Size(44, 54),
            anchor: new Point(22, 54),
          }
        }

        const destinationMarker = new Marker({
          map,
          position: destinationPosition,
          title: isMadrid ? 'IFEMA / MADRING' : `Centro de ${city}`,
          icon: makeDestinationIcon(isMadrid ? 'F1' : 'C'),
          zIndex: 100,
        })
        mapItems.push(destinationMarker)
        bounds.extend(destinationPosition)

        const locatedOptions = options.filter((option) => option.coords)

        locatedOptions.forEach((option) => {
          const position = new LatLng(option.coords.lat, option.coords.lng)
          const marker = new Marker({
            map,
            position,
            title: option.title,
            icon: makePinIcon(option.code, option.category),
            zIndex: 10,
          })
          const fallbackLine = new Polyline({
            map,
            path: [position, destinationPosition],
            geodesic: true,
            strokeColor: option.category === 'lodging' ? '#2563eb' : '#0f766e',
            strokeOpacity: 0.55,
            strokeWeight: 3,
          })

          const routeLabel = routeModes[routeMode]?.label || 'Ruta'
          marker.routeStatus = option.transit
          setRouteSummaries((current) => ({
            ...current,
            [option.id]: {
              title: option.title,
              code: option.code,
              status: option.id === 'f1-madring' ? 'Destino de referencia' : 'Calculando...',
            },
          }))

          marker.addListener('click', () => {
            infoWindow.setContent(
              `<strong>${option.title}</strong><br>${routeLabel}<br>${marker.routeStatus || option.transit}<br>${option.aiScore}/100`,
            )
            infoWindow.open({ anchor: marker, map })
          })

          if (option.id !== 'f1-madring') {
            directionsService.route(
              {
                origin: position,
                destination: destinationPosition,
                travelMode: TravelMode[routeMode],
              },
              (result, status) => {
                if (status !== DirectionsStatus.OK || !result) {
                  marker.routeStatus = 'Sin tiempo disponible'
                  setRouteSummaries((current) => ({
                    ...current,
                    [option.id]: {
                      title: option.title,
                      code: option.code,
                      status: 'Sin tiempo disponible',
                    },
                  }))
                  return
                }
                const leg = result.routes?.[0]?.legs?.[0]
                const duration = leg?.duration?.text || 'Tiempo no disponible'
                const distance = leg?.distance?.text || ''
                marker.routeStatus = `${duration}${distance ? ` · ${distance}` : ''}`
                setRouteSummaries((current) => ({
                  ...current,
                  [option.id]: {
                    title: option.title,
                    code: option.code,
                    duration,
                    distance,
                    status: `${duration}${distance ? ` · ${distance}` : ''}`,
                  },
                }))
                fallbackLine.setMap(null)
                const renderer = new DirectionsRenderer({
                  directions: result,
                  map,
                  preserveViewport: true,
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: option.category === 'lodging' ? '#2563eb' : '#0f766e',
                    strokeOpacity: 0.72,
                    strokeWeight: 4,
                  },
                })
                mapItems.push(renderer)
              },
            )
          }

          mapItems.push(marker, fallbackLine)
          bounds.extend(position)
        })

        if (locatedOptions.length) {
          map.fitBounds(bounds, 42)
        } else {
          map.setCenter(destinationCoords)
          map.setZoom(isMadrid ? 11 : 12)
        }
      })
      .catch((error) => {
        if (!cancelled) setMapError(error.message)
      })

    return () => {
      cancelled = true
      mapItems.forEach((item) => item.setMap(null))
    }
  }, [city, destinationCoords, hasRealMap, options, routeMode])

  if (!hasRealMap || mapError) {
    return <ConceptMap city={city} mapOptions={options} note={mapError} />
  }

  return (
    <div className="real-map-wrap">
      <div className="google-map" ref={mapRef} />
      <div className="map-caption">
        <CheckCircle2 size={16} aria-hidden="true" />
        <span>
          Rutas en modo {routeModes[routeMode]?.label || 'ruta'} hacia {city === 'Madrid' ? 'IFEMA / MADRING' : `centro de ${city}`}
        </span>
      </div>
      <div className="map-legend">
        <span className="map-legend-item lodging">🏨 Hospedaje</span>
        <span className="map-legend-item food">🍽️ Comida</span>
        <span className="map-legend-item activities">🎯 Actividad</span>
        <span className="map-legend-item transport">🚗 Traslado</span>
        <span className="map-legend-item destination">🏁 F1 Destino</span>
      </div>
      <div className="route-summary-list">
        {options
          .filter((option) => option.coords && option.id !== 'f1-madring')
          .map((option) => {
            const summary = routeSummaries[option.id]
            return (
              <article key={option.id} className={`route-item-${option.category || 'default'}`}>
                <span className={`route-code-badge ${option.category}`}>{option.code}</span>
                <div className="route-item-info">
                  <strong>{option.title}</strong>
                  <small>{categoryConfig[option.category]?.shortLabel || option.category}</small>
                </div>
                <em className={summary?.duration ? 'route-time-ok' : ''}>{summary?.status || 'Calculando...'}</em>
              </article>
            )
          })}
      </div>
    </div>
  )
}

function ConceptMap({ city, mapOptions, note }) {
  return (
    <div className="map-stage" aria-label={`Mapa conceptual de ${city}`}>
      <div className="route-line route-one" />
      <div className="route-line route-two" />
      <div className="ifema-pin">
        <span className="ifema-flag">🏁</span>
        <span>{city === 'Madrid' ? 'IFEMA' : city}</span>
      </div>
      {mapOptions.map((option) => (
        <a
          className={`map-pin ${option.category}`}
          href={option.url || '#'}
          key={option.id}
          rel="noreferrer"
          style={{ left: `${option.map.x}%`, top: `${option.map.y}%` }}
          target={option.url ? '_blank' : undefined}
          title={`${option.title} (${option.code})`}
        >
          <span className="map-pin-emoji">{catEmoji[option.category] || '📍'}</span>
          <span className="map-pin-code">{option.code}</span>
        </a>
      ))}
      <div className="concept-map-legend">
        {Object.entries(catEmoji).map(([cat, emoji]) => (
          mapOptions.some((option) => option.category === cat) ? (
            <span className={`map-legend-item ${cat}`} key={cat}>
              {emoji} {categoryConfig[cat]?.shortLabel || cat}
            </span>
          ) : null
        ))}
      </div>
      {note ? <span className="map-note">{note}</span> : null}
    </div>
  )
}

export default function MapPanel({
  budgetOptionIds = [],
  city,
  destinationCoords,
  onRouteModeChange,
  options = [],
  routeMode,
  votes = {},
}) {
  const [categoryFilter, setCategoryFilter] = useState('all')
  const visibleOptions = useMemo(
    () =>
      categoryFilter === 'all'
        ? options
        : options.filter((option) => option.category === categoryFilter),
    [categoryFilter, options],
  )
  const activeCategories = mapCategories.filter(
    ({ id }) => id === 'all' || options.some((option) => option.category === id),
  )

  return (
    <section className="map-panel">
      <div className="section-heading">
        <MapPinned size={20} aria-hidden="true" />
        <div>
          <p className="eyebrow">Mapa de la ciudad activa</p>
          <h2>{city}: {options.length ? 'opciones ubicadas' : 'sin opciones guardadas todavía'}</h2>
        </div>
      </div>

      <div className="route-mode-control" aria-label="Modo de ruta">
        {Object.entries(routeModes).map(([mode, config]) => {
          const Icon = config.icon
          return (
            <button
              className={routeMode === mode ? 'active' : ''}
              key={mode}
              onClick={() => onRouteModeChange(mode)}
              type="button"
            >
              <Icon size={16} aria-hidden="true" />
              {config.label}
            </button>
          )
        })}
      </div>

      {options.length > 0 ? (
        <div className="map-cat-filter" role="group" aria-label="Filtrar mapa por categoría">
          {activeCategories.map(({ id, label, emoji }) => (
            <button
              key={id}
              className={`map-cat-btn ${id} ${categoryFilter === id ? 'active' : ''}`}
              onClick={() => setCategoryFilter(id)}
              type="button"
            >
              {emoji} {label}
              {id !== 'all' ? (
                <span className="map-cat-count">
                  {options.filter((option) => option.category === id).length}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="map-status">
        <strong>{city}</strong>
        <span>
          Centro: {destinationCoords
            ? `${destinationCoords.lat.toFixed(3)}, ${destinationCoords.lng.toFixed(3)}`
            : 'por definir'}
        </span>
        <span>
          {categoryFilter === 'all'
            ? `${options.length} opciones visibles`
            : `${visibleOptions.length} de ${options.length} opciones`}
        </span>
      </div>

      {options.length === 0 ? (
        <div className="map-empty-callout">
          <strong>{city} ya puede mostrarse en el mapa.</strong>
          <span>
            Falta agregar hospedajes, comida o planes de esta ciudad para que aparezcan
            marcadores y tiempos de desplazamiento.
          </span>
        </div>
      ) : null}

      <div className="map-panel-layout">
        <TripMap
          city={city}
          destinationCoords={destinationCoords}
          options={visibleOptions}
          routeMode={routeMode}
        />
        <CitySelectionPanel
          budgetOptionIds={budgetOptionIds}
          city={city}
          options={options}
          votes={votes}
        />
      </div>
    </section>
  )
}
