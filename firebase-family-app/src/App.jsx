import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  CloudOff,
  ExternalLink,
  Heart,
  Home,
  Hotel,
  Landmark,
  Layers,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  MapPinned,
  Menu,
  MessageCircle,
  Navigation,
  Plane,
  Plus,
  Route,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrainFront,
  Utensils,
  Users,
  X,
} from 'lucide-react'
import './App.css'
import {
  categoryConfig,
  cityIdeas,
  familyMembers,
  familyProfiles,
  initialOptions,
  itineraryDraft,
} from './data/trip'
import {
  firebaseAuth,
  getFirebaseStatus,
  googleProvider,
  isFirebaseConfigured,
} from './services/firebaseClient'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { hasMapsKey, loadGoogleMapsLibraries } from './services/googleMaps'
import {
  analyzeOptionWithAI,
  assessTripPlanWithAI,
  chatWithPlannerAI,
  generateItineraryWithAI,
  reanalyzeOptionWithAI,
  suggestDayTripsWithAI,
  suggestTransferWithAI,
  suggestFoodWithAI,
  suggestLodgingWithAI,
  suggestLodgingPlacesWithAI,
  verifyAvailabilityWithAI,
} from './services/aiFunctions'
import {
  canUseFirestore,
  saveOptionVotes,
  saveSearchRequest,
  saveTripBudget,
  saveTripOption,
  saveTravelGroup,
  saveTravelCity,
  saveUserProfile,
  seedMadridF1Data,
  subscribeTripBudget,
  subscribeTripOptions,
  subscribeTravelCities,
  subscribeTravelGroups,
  subscribeVotes,
  updateTravelCityStatus,
  updateTripOptionStatus,
  MADRID_F1_TRIP_ID,
} from './services/tripRepository'
import {
  deleteTrip,
  isTripAdmin,
  seedMadridF1Trip,
  subscribeUserTrips,
} from './services/tripsRepository'
import {
  cityKey,
  citySuggestionNames,
  defaultBudgetOptionIdsForTrip,
  defaultDraftForTrip,
  defaultSearchDraftForTrip,
  defaultTransferDraftForTrip,
  groupSummary,
  primaryTripCity,
  tripDatesForSearch,
} from './utils/tripDefaults'

const TripDashboard = lazy(() => import('./components/TripDashboard'))
const JoinTripModal = lazy(() => import('./components/JoinTripModal'))
const PlaceSuggestionModal = lazy(() => import('./components/PlaceSuggestionModal'))
const MapPanel = lazy(() => import('./components/MapPanel'))

const tabs = [
  { id: 'lodging', icon: Home },
  { id: 'activities', icon: Landmark },
  { id: 'food', icon: Utensils },
  { id: 'transport', icon: TrainFront },
  { id: 'cities', icon: CalendarDays },
  { id: 'itinerary', icon: Route },
  { id: 'budget', icon: CircleDollarSign },
]

const optionWorkspaceTabs = ['lodging', 'food', 'activities']
const placeSuggestionLimit = 50
const suggestionPageSize = 5

const targetLabels = {
  family: 'Toda la familia',
  f1: 'Grupo F1',
  'non-f1': 'Planes sin F1',
}

const defaultTravelGroup = {
  id: 'grupo-del-viaje',
  name: 'Grupo del viaje',
  adults: 2,
  childrenAges: [],
  memberIds: [],
  budgetOptionIds: [],
  note: 'Ajusta el grupo cuando empiece la planeación.',
}

const childAgeByMemberId = {
  juanfe: 9,
  guillermo: 5,
}

const profileMemberFallbacks = {
  'familia-sept-2026': familyMembers.map((member) => member.id),
  'subgrupo-f1': ['camilo', 'juliana-bueno', 'fernando'],
  'subgrupo-plan-suave': ['julian-papa', 'cielo', 'juliana-hermana', 'juliancho', 'juanfe', 'guillermo'],
  pareja: ['camilo', 'juliana-bueno'],
  'adultos-4': ['camilo', 'juliana-bueno', 'julian-papa', 'fernando'],
}

const previewVotes = {
  'lodging-m': ['camilo'],
  'lodging-b': ['juliana-bueno'],
  'activity-retiro': ['cielo'],
}

function readPreviewMode() {
  try {
    return import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === '1'
  } catch {
    return false
  }
}

const ifemaCoords = { lat: 40.4625, lng: -3.6155 }

const obviousCityDefaults = {
  madrid: {
    country: 'España',
    transfer: 'Vuelo internacional o tren según origen',
    angle: 'Base para F1, museos, parques y comida familiar',
    coords: { lat: 40.4168, lng: -3.7038 },
  },
  barcelona: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'AVE desde Madrid',
    angle: 'Ciudad, playa, arquitectura y tren desde Madrid',
    coords: { lat: 41.3874, lng: 2.1686 },
  },
  valencia: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'AVE desde Madrid',
    angle: 'Ciudad de las Artes, playa y ritmo familiar',
    coords: { lat: 39.4699, lng: -0.3763 },
  },
  sevilla: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'AVE desde Madrid',
    angle: 'Centro histórico, comida y tren cómodo',
    coords: { lat: 37.3891, lng: -5.9845 },
  },
  paris: {
    country: 'Francia',
    dates: 'Posible 14-19 sep',
    transfer: 'Tren o vuelo desde Madrid',
    angle: 'Museos, paseo urbano y parques para niños',
    coords: { lat: 48.8566, lng: 2.3522 },
  },
  lisboa: {
    country: 'Portugal',
    dates: 'Flexible',
    transfer: 'Vuelo o tren/bus desde Madrid',
    angle: 'Miradores, tranvías y ritmo familiar',
    coords: { lat: 38.7223, lng: -9.1393 },
  },
  bilbao: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'Vuelo, tren o coche desde Madrid',
    angle: 'Guggenheim, comida y ciudad caminable',
    coords: { lat: 43.263, lng: -2.935 },
  },
  leon: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'Tren desde Madrid',
    angle: 'Catedral, casco histórico y plan tranquilo en familia',
    coords: { lat: 42.5987, lng: -5.5671 },
  },
  valladolid: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'Tren desde Madrid',
    angle: 'Ciudad cómoda, comida castellana y paseo fácil',
    coords: { lat: 41.6523, lng: -4.7245 },
  },
  santander: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'Tren, bus o coche desde Madrid',
    angle: 'Mar, paseos suaves y buen ritmo con niños',
    coords: { lat: 43.4623, lng: -3.8099 },
  },
  zaragoza: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'AVE desde Madrid',
    angle: 'Parada cómoda entre Madrid y Barcelona',
    coords: { lat: 41.6488, lng: -0.8891 },
  },
  cordoba: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'AVE desde Madrid',
    angle: 'Centro histórico, patios y plan cultural caminable',
    coords: { lat: 37.8882, lng: -4.7794 },
  },
  granada: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'AVE o coche desde Madrid',
    angle: 'Alhambra, centro histórico y tapas',
    coords: { lat: 37.1773, lng: -3.5986 },
  },
  malaga: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'AVE desde Madrid',
    angle: 'Playa, centro histórico y plan suave con niños',
    coords: { lat: 36.7213, lng: -4.4214 },
  },
  segovia: {
    country: 'España',
    dates: 'Flexible',
    transfer: 'Tren Avant o coche desde Madrid',
    angle: 'Acueducto, Alcázar, comida castellana y paseo fácil',
    coords: { lat: 40.9429, lng: -4.1088 },
  },
}

const smartSuggestionTypes = [
  {
    id: 'lodging',
    label: 'Hospedaje',
    actionLabel: 'Agregar a hospedaje',
    budgetLabel: 'Hospedaje + presupuesto',
    category: 'lodging',
    icon: Hotel,
    notes:
      'apartamentos o hoteles para familia con niños, bien valorados, ubicación central y capacidad suficiente para el grupo',
  },
  {
    id: 'food',
    label: 'Comida',
    actionLabel: 'Agregar a comida',
    budgetLabel: 'Comida + presupuesto',
    category: 'food',
    icon: Utensils,
    notes:
      'restaurantes familiares bien valorados, con muchas reseñas, reserva fácil y comida flexible para niños',
  },
  {
    id: 'activities',
    label: 'Actividades',
    actionLabel: 'Agregar a planes',
    budgetLabel: 'Plan + presupuesto',
    category: 'activities',
    icon: Landmark,
    notes:
      'actividades familiares bien valoradas, museos, miradores, parques y sitios fáciles de visitar en grupo',
  },
  {
    id: 'kids',
    label: 'Con niños',
    actionLabel: 'Agregar a planes',
    budgetLabel: 'Plan + presupuesto',
    category: 'activities',
    icon: Users,
    notes:
      'planes bien valorados para niños de 5 y 9 años, con poca fricción logística y buena puntuación en Google Maps',
  },
]

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
  if (memberId === 'juliana-novia') return 'Juliana Bueno'
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

function buildDraftOption(draft, status = 'pending') {
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
    status,
    url: draft.url.trim(),
    image: '',
    priceNight: Number(draft.priceNight) || null,
    priceTotal: Number(draft.priceTotal) || null,
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

function buildCityDraft(draft) {
  const slug = draft.city
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const isBase = Boolean(draft.isBase)
  return {
    id: `${slug || 'ciudad'}-${Date.now()}`,
    city: draft.city.trim(),
    country: draft.country.trim() || 'Por definir',
    dates: isBase ? 'Base / casa' : (draft.dates.trim() || 'Fechas por definir'),
    transfer: isBase ? 'Sin traslado (base)' : (draft.transfer.trim() || 'Traslado por definir'),
    angle: draft.angle.trim() || 'Pendiente de analizar con IA',
    coords: draft.coords || obviousCityDefaults[cityKey(draft.city)]?.coords || null,
    readiness: isBase ? 100 : 18,
    status: 'active',
    isBase,
    dayTrips: draft.dayTrips || [],
  }
}

function cityCenter(city, travelCities) {
  if (city === 'Todas') return { city: 'Madrid', coords: ifemaCoords }
  const fromTravel = travelCities.find((item) => item.city === city && item.status !== 'removed')
  return {
    city,
    coords:
      fromTravel?.coords ||
      obviousCityDefaults[cityKey(city)]?.coords ||
      (city === 'Madrid' ? ifemaCoords : null),
  }
}

async function resolveCityCoords(city) {
  if (city.coords || !hasMapsKey()) return city

  try {
    const { libraries } = await loadGoogleMapsLibraries(['geocoding'])
    const { Geocoder, GeocoderStatus } = libraries.geocoding
    const geocoder = new Geocoder()
    const address = [city.city, city.country === 'Por definir' ? '' : city.country]
      .filter(Boolean)
      .join(', ')
    const results = await new Promise((resolve) => {
      geocoder.geocode({ address }, (items, status) => {
        resolve(status === GeocoderStatus.OK ? items || [] : [])
      })
    })
    const location = results[0]?.geometry?.location
    if (!location) return city

    return {
      ...city,
      coords: {
        lat: location.lat(),
        lng: location.lng(),
      },
    }
  } catch {
    return city
  }
}

function priceBreakdown(option, nights = 4) {
  const priceNight = option.priceConfidence === 'missing' ? null : option.priceNight
  const priceTotal = option.priceConfidence === 'missing' ? null : option.priceTotal

  if (option.category === 'lodging') {
    const total = priceTotal || (priceNight ? priceNight * nights : null)
    const nightly = priceNight || (total ? Math.round(total / nights) : null)
    return {
      primary: nightly ? `${currency(nightly)} / noche` : 'Precio/noche por estimar',
      secondary: total ? `${currency(total)} total` : 'Total por estimar',
    }
  }

  if (option.category === 'transport' || option.budgetMode === 'perPerson') {
    return {
      primary: priceNight ? `${currency(priceNight)} / persona` : 'Precio/persona por estimar',
      secondary: priceTotal ? `${currency(priceTotal)} total` : 'Total por estimar',
    }
  }

  return {
    primary: priceTotal ? `${currency(priceTotal)} total` : currency(priceNight),
    secondary: priceNight && priceTotal ? `${currency(priceNight)} referencia` : '',
  }
}

function availabilityTone(status) {
  if (status === 'available') return 'ready'
  if (status === 'unavailable') return 'blocked'
  return 'unknown'
}

function formatAvailabilityDate(value) {
  if (!value) return ''
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value))
  } catch {
    return ''
  }
}

function parseTripDates(value) {
  const text = String(value || '').toLowerCase()
  const year = text.match(/\b(20\d{2})\b/)?.[1] || '2026'
  const monthMap = {
    ene: '01',
    enero: '01',
    feb: '02',
    febrero: '02',
    mar: '03',
    marzo: '03',
    abr: '04',
    abril: '04',
    may: '05',
    mayo: '05',
    jun: '06',
    junio: '06',
    jul: '07',
    julio: '07',
    ago: '08',
    agosto: '08',
    sep: '09',
    septiembre: '09',
    oct: '10',
    octubre: '10',
    nov: '11',
    noviembre: '11',
    dic: '12',
    diciembre: '12',
  }
  const monthKey = Object.keys(monthMap).find((key) => text.includes(key))
  const days = [...text.matchAll(/\b(\d{1,2})\b/g)]
    .map((match) => Number(match[1]))
    .filter((day) => day >= 1 && day <= 31)

  if (!monthKey || days.length < 2) {
    return { checkin: '', checkout: '' }
  }

  const month = monthMap[monthKey]
  const [startDay, endDay] = days

  return {
    checkin: `${year}-${month}-${String(startDay).padStart(2, '0')}`,
    checkout: `${year}-${month}-${String(endDay).padStart(2, '0')}`,
  }
}

function LoadingScreen({ title = 'Cargando', detail = 'Un momento mientras preparamos la app.' }) {
  return (
    <main className="login-screen">
      <div className="login-panel">
        <Loader2 size={28} aria-hidden="true" className="spin" />
        <h1>{title}</h1>
        <p>{detail}</p>
      </div>
    </main>
  )
}

function memberInitials(member) {
  return String(member?.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function MiniAvatar({ active = false, member }) {
  return (
    <span
      className={`mini-avatar ${active ? 'active' : ''}`}
      title={member?.name || 'Familiar'}
    >
      {memberInitials(member)}
    </span>
  )
}

function memberIdsForProfile(profile = {}) {
  const rawIds = Array.isArray(profile.memberIds)
    ? profile.memberIds
    : profileMemberFallbacks[profile.id] || []
  return rawIds.filter((id, index, list) =>
    familyMembers.some((member) => member.id === id) && list.indexOf(id) === index,
  )
}

function enrichTravelGroup(profile = defaultTravelGroup) {
  const memberIds = memberIdsForProfile(profile)
  const members = memberIds
    .map((id) => familyMembers.find((member) => member.id === id))
    .filter(Boolean)
  const derivedAdults = members.filter((member) => member.adult).length
  const derivedChildrenAges = members
    .filter((member) => !member.adult)
    .map((member) => childAgeByMemberId[member.id])
    .filter(Boolean)
  const adults = memberIds.length ? derivedAdults : Number(profile.adults) || 0
  const childrenAges = memberIds.length
    ? derivedChildrenAges
    : Array.isArray(profile.childrenAges)
      ? profile.childrenAges
      : []

  return {
    ...defaultTravelGroup,
    ...profile,
    memberIds,
    adults,
    childrenAges,
    totalTravelers: adults + childrenAges.length,
    budgetOptionIds: Array.isArray(profile.budgetOptionIds) ? profile.budgetOptionIds : [],
  }
}

function isPlanningGroup(profile = {}) {
  return Boolean(
    profile.kind === 'subgroup' ||
      profile.memberIds?.length ||
      profile.date ||
      profile.startTime ||
      profile.endTime ||
      profile.focus,
  )
}

function getDaysList(startStr, endStr) {
  const list = []
  if (!startStr) return list
  const start = new Date(`${startStr}T00:00:00Z`)
  const end = endStr ? new Date(`${endStr}T00:00:00Z`) : new Date(start.getTime() + 12 * 24 * 3600000)
  
  let current = new Date(start.getTime())
  let limit = 0
  while (current <= end && limit < 100) {
    list.push(new Date(current.getTime()))
    current.setUTCDate(current.getUTCDate() + 1)
    limit++
  }
  return list
}

function parseCityDateRange(rangeStr, defaultYear = 2026) {
  if (!rangeStr) return null
  const str = rangeStr.toLowerCase()
  const numbers = str.match(/\d+/g)
  if (!numbers || numbers.length < 2) return null
  
  let startDay = parseInt(numbers[0], 10)
  let endDay = parseInt(numbers[1], 10)
  
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const monthsFull = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  
  let monthIndex = 8 // default: Sep
  for (let i = 0; i < 12; i++) {
    if (str.includes(months[i]) || str.includes(monthsFull[i])) {
      monthIndex = i
      break
    }
  }
  
  let year = defaultYear
  if (numbers.length >= 3) {
    const potentialYear = parseInt(numbers[2], 10)
    if (potentialYear >= 2020 && potentialYear <= 2030) {
      year = potentialYear
    }
  }
  
  return {
    startDay,
    endDay,
    monthIndex,
    year,
  }
}

function isDateInCityRange(date, range) {
  if (!range) return false
  const dYear = date.getUTCFullYear()
  const dMonth = date.getUTCMonth()
  const dDay = date.getUTCDate()
  
  if (dYear !== range.year) return false
  if (dMonth !== range.monthIndex) return false
  return dDay >= range.startDay && dDay <= range.endDay
}

function matchCityForDate(date, activeTravelCities, activeTrip) {
  const mainStart = activeTrip?.startDate || '2026-09-10'
  const mainEnd = activeTrip?.endDate || '2026-09-14'
  const dStr = date.toISOString().split('T')[0]
  
  if (dStr >= mainStart && dStr <= mainEnd) {
    return 'Madrid'
  }
  
  // Try matching active travel cities
  for (const city of activeTravelCities) {
    const range = parseCityDateRange(city.dates)
    if (range && isDateInCityRange(date, range)) {
      return city.city
    }
  }
  
  if (dStr < mainStart) {
    return 'Madrid'
  }
  return 'Por decidir'
}

function formatItineraryDayLabel(date) {
  const daysShort = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  const monthsShort = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  const d = date.getUTCDate()
  const dayName = daysShort[date.getUTCDay()]
  const monthName = monthsShort[date.getUTCMonth()]
  return `${dayName} ${d} ${monthName}`
}

function getGuardoPrepopulatedPlan(date) {
  const d = date.getUTCDate()
  if (d === 19) {
    return {
      title: 'Excursión a Comillas (El Capricho de Gaudí)',
      familyPlan: 'Viaje en coche desde Guardo a Comillas (~1h 50m). Visita guiada a El Capricho de Gaudí (maravilla modernista ideal para niños y adultos), paseo por el pintoresco casco de Comillas y almuerzo frente al mar Cantábrico.',
      f1Plan: 'Acompaña al grupo familiar en la excursión costera y visita cultural.',
      foodIdea: 'Marisquería o raciones en el puerto de Comillas.',
      routeNotes: 'Ruta Guardo -> Comillas por carretera escénica. Retorno por la tarde.',
      backup: 'Palacio de Sobrellano en Comillas o visita guiada a la Cueva de El Soplao.',
      energyLevel: 'alta',
    }
  } else if (d === 20) {
    return {
      title: 'Excursión a Santander (La Magdalena y Bahía)',
      familyPlan: 'Desplazamiento a Santander (~2h). Paseo por la Península de la Magdalena (visita al palacio real, minizoo exterior de animales marinos y trenecito "Magdaleno"). Tarde de paseo suave por El Sardinero y la bahía.',
      f1Plan: 'Paseo marítimo y disfrute familiar en la capital cántabra.',
      foodIdea: 'Rabas de calamar y pescados frescos frente al mar.',
      routeNotes: 'Guardo -> Santander en coche. Parking recomendado en La Magdalena.',
      backup: 'Visita interactiva al Centro Botín o al Museo Marítimo del Cantábrico.',
      energyLevel: 'media',
    }
  } else if (d === 21) {
    return {
      title: 'Naturaleza en Guardo y Montaña Palentina',
      familyPlan: 'Día tranquilo y de descanso en Guardo. Senda suave por la naturaleza de la Montaña Palentina o miradores locales. Tarde de juegos comunes y asado en el alojamiento familiar.',
      f1Plan: 'Descanso de conducción, asado y relax familiar en la base de Guardo.',
      foodIdea: 'Asado campestre en la casa base o cordero local.',
      routeNotes: 'Trayectos locales cortos en coche.',
      backup: 'Visita techada a la espectacular Villa Romana de La Olmeda.',
      energyLevel: 'suave',
    }
  } else if (d === 22) {
    return {
      title: 'Despedida de Guardo y Retorno',
      familyPlan: 'Check-out tranquilo por la mañana. Almuerzo tradicional y viaje de regreso de los grupos de conexión.',
      f1Plan: 'Regreso y fin del segmento norte.',
      foodIdea: 'Menú tradicional de cocina castellana en ruta.',
      routeNotes: 'Guardo -> Madrid u otro destino de conexión en coche.',
      backup: 'Parada intermedia en León o Palencia para descansar en interiores.',
      energyLevel: 'media',
    }
  }
  return null
}

function generateFallbackItinerary(activeTrip, activeTravelCities, travelGroups) {
  const startStr = activeTrip?.startDate || '2026-09-10'
  const endStr = activeTrip?.returnDate || activeTrip?.endDate || '2026-09-22'
  const daysList = getDaysList(startStr, endStr)
  
  return daysList.map((date, index) => {
    const dateLabel = formatItineraryDayLabel(date)
    const city = matchCityForDate(date, activeTravelCities, activeTrip)
    
    let title = 'Día de viaje'
    let familyPlan = 'Paseo libre, exploración y actividades familiares según el ritmo del grupo.'
    let f1Plan = ''
    let foodIdea = ''
    let routeNotes = ''
    let backup = ''
    let energyLevel = 'media'
    
    if (city === 'Madrid') {
      const draftIndex = index < 5 ? index : -1
      if (draftIndex !== -1 && itineraryDraft[draftIndex]) {
        const item = itineraryDraft[draftIndex]
        title = item.title
        familyPlan = item.family
        f1Plan = item.f1 || ''
      } else {
        title = 'Exploración de Madrid'
        familyPlan = 'Día libre en Madrid para visitar museos, parques o realizar compras.'
        f1Plan = 'Plan flexible libre en Madrid.'
      }
    } else if (city === 'Guardo') {
      const guardoPlan = getGuardoPrepopulatedPlan(date)
      if (guardoPlan) {
        title = guardoPlan.title
        familyPlan = guardoPlan.familyPlan
        f1Plan = guardoPlan.f1Plan
        foodIdea = guardoPlan.foodIdea
        routeNotes = guardoPlan.routeNotes
        backup = guardoPlan.backup
        energyLevel = guardoPlan.energyLevel
      }
    } else {
      title = `Estancia en ${city}`
      familyPlan = `Día para recorrer ${city}, pasear en familia y disfrutar del ritmo local.`
      f1Plan = `Plan libre en ${city}.`
    }
    
    return {
      date: dateLabel,
      city,
      title,
      familyPlan,
      f1Plan,
      foodIdea,
      routeNotes,
      backup,
      energyLevel,
    }
  })
}

function defaultSubgroupDraftForTrip(trip) {
  return {
    name: '',
    date: trip?.startDate || '2026-09-11',
    startTime: '10:00',
    endTime: '16:00',
    focus: '',
    memberIds: [],
  }
}

function searchTypeForTab(tab, currentType = 'lodging') {
  if (tab === 'lodging') return 'lodging'
  if (tab === 'activities') return 'activities'
  if (tab === 'food') return 'food'
  if (tab === 'transport') return 'transport'
  return ['lodging', 'food', 'activities', 'transport'].includes(currentType) ? currentType : 'lodging'
}

function smartConfigForType(type) {
  return smartSuggestionTypes.find((item) => item.id === type) || smartSuggestionTypes[0]
}

function searchMetaForType(type) {
  if (type === 'activities') {
    return {
      title: 'Planes por ciudad',
      typeLabel: 'Planes',
      action: 'Sugerir planes',
      icon: Landmark,
    }
  }
  if (type === 'food') {
    return {
      title: 'Comida por ciudad',
      typeLabel: 'Comida',
      action: 'Sugerir comida',
      icon: Utensils,
    }
  }
  return {
    title: 'Hospedajes por ciudad',
    typeLabel: 'Hospedajes',
    action: 'Preparar búsqueda',
    icon: Hotel,
  }
}

function pagedItems(items, page, pageSize = suggestionPageSize) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize
  return {
    page: safePage,
    totalPages,
    items: items.slice(start, start + pageSize),
  }
}

function itinerarySubgroupPayload(profile, options, nights, f1Count) {
  const group = enrichTravelGroup(profile)
  const budgetOptions = (group.budgetOptionIds || [])
    .map((optionId) => options.find((option) => option.id === optionId))
    .filter(Boolean)
    .map((option) => {
      const budget = optionBudget(option, group, f1Count, nights)
      return {
        id: option.id,
        title: option.title,
        category: option.category,
        city: option.city,
        total: budget.total || null,
        perPerson: budget.perPerson || null,
      }
    })

  return {
    id: group.id,
    name: group.name,
    members: group.memberIds.map(memberName),
    memberIds: group.memberIds,
    adults: group.adults,
    childrenAges: group.childrenAges,
    totalTravelers: group.totalTravelers,
    date: group.date || '',
    startTime: group.startTime || '',
    endTime: group.endTime || '',
    focus: group.focus || group.note || '',
    budgetOptions,
  }
}

function FrontendUpdatePanel({
  activeMember,
  budgetOptionIds,
  currentTravelGroup,
  onAddOption,
  onOpenDecision,
  onPasteLink,
  onVote,
  options,
  votes,
}) {
  const liveOptions = options.filter((option) => option.status !== 'removed')
  const voteCount = (option) => votes[option.id]?.length || 0
  const candidates = liveOptions
    .filter((option) => option.category === 'lodging')
    .sort((a, b) => (voteCount(b) - voteCount(a)) || (b.aiScore || 0) - (a.aiScore || 0))
    .slice(0, 2)
  const fallbackCandidates = candidates.length >= 2
    ? candidates
    : liveOptions
      .slice()
      .sort((a, b) => (voteCount(b) - voteCount(a)) || (b.aiScore || 0) - (a.aiScore || 0))
      .slice(0, 2)
  const [primary] = fallbackCandidates
  const decisionVoters = new Set(
    fallbackCandidates.flatMap((option) => votes[option.id] || []),
  )
  const currentMemberVotedPrimary = Boolean(primary && votes[primary.id]?.includes(activeMember))
  const budgetOptions = budgetOptionIds
    .map((id) => liveOptions.find((option) => option.id === id))
    .filter(Boolean)
  const leadingOption = liveOptions
    .slice()
    .sort((a, b) => (voteCount(b) - voteCount(a)) || (b.aiScore || 0) - (a.aiScore || 0))[0]

  return (
    <div className="quick-action-bar" role="toolbar" aria-label="Acciones rápidas">
      {/* ── Añadir opciones ── */}
      <div className="qab-group">
        <button className="qab-btn qab-btn-primary" onClick={onPasteLink} type="button">
          <ExternalLink size={13} aria-hidden="true" />
          Pegar link
        </button>
        <button className="qab-btn" onClick={onAddOption} type="button">
          <Plus size={13} aria-hidden="true" />
          Manual
        </button>
      </div>

      <div className="qab-sep" aria-hidden="true" />

      {/* ── Votación ── */}
      <div className="qab-group">
        {decisionVoters.size > 0 && (
          <span className="qab-meta">
            {decisionVoters.size}/{familyMembers.length} votaron
          </span>
        )}
        <button
          className={`qab-btn ${currentMemberVotedPrimary ? 'qab-btn-voted' : 'qab-btn-vote'}`}
          disabled={!primary}
          onClick={() => primary && onVote(primary.id)}
          title={primary ? `Votar por ${primary.title}` : 'Sin candidatos aún'}
          type="button"
        >
          <Heart size={13} aria-hidden="true" />
          {currentMemberVotedPrimary ? 'Quitar voto' : (primary ? `Votar ${primary.code}` : 'Votar')}
        </button>
        <button
          className="qab-btn"
          onClick={() => onOpenDecision(primary?.category || 'lodging')}
          type="button"
        >
          Comparar
        </button>
      </div>

      {/* ── Mini stats ── */}
      <div className="qab-stats">
        {leadingOption && voteCount(leadingOption) > 0 && (
          <span className="qab-stat" title={`${leadingOption.title} lidera con votos`}>
            🏆 {leadingOption.code} · {voteCount(leadingOption)}v
          </span>
        )}
        {budgetOptions.length > 0 && (
          <span className="qab-stat">
            💰 {budgetOptions.length} en presupuesto
          </span>
        )}
      </div>
    </div>
  )
}

function isAdultMember(memberId) {
  return Boolean(familyMembers.find((member) => member.id === memberId)?.adult)
}

function platformSearchLinks(search, profile) {
  const city = encodeURIComponent(search.city || 'Madrid')
  const dates = parseTripDates(search.dates)
  const adults = Math.max(1, Number(profile?.adults) || 1)
  const childrenAges = profile?.childrenAges || []
  const children = childrenAges.length
  const total = adults + children
  const query = encodeURIComponent(
    `${search.city || 'Madrid'} alojamiento ${total} personas ${search.dates || ''}`,
  )
  const dateParams = dates.checkin && dates.checkout
    ? `&checkin=${dates.checkin}&checkout=${dates.checkout}`
    : ''
  const bookingAges = childrenAges.map((age) => `&age=${age}`).join('')
  const bookingDates = dates.checkin && dates.checkout
    ? `&checkin=${dates.checkin}&checkout=${dates.checkout}`
    : ''
  const googleDates = dates.checkin && dates.checkout
    ? ` ${dates.checkin} ${dates.checkout}`
    : ''

  return [
    {
      label: 'Booking',
      url: `https://www.booking.com/searchresults.es.html?ss=${city}${bookingDates}&group_adults=${adults}&group_children=${children}${bookingAges}&no_rooms=1`,
    },
    {
      label: 'Airbnb',
      url: `https://www.airbnb.com/s/${city}/homes?adults=${adults}&children=${children}${dateParams}`,
    },
    {
      label: total > 6 ? 'Google Travel 6 personas' : 'Google Travel',
      url: `https://www.google.com/travel/search?q=${query}${encodeURIComponent(googleDates)}&adults=${Math.min(total, 6)}`,
    },
    ...(total > 6
      ? [
          {
            label: `Google Travel resto (${total - 6})`,
            url: `https://www.google.com/travel/search?q=${encodeURIComponent(`${search.city || 'Madrid'} alojamiento ${total - 6} personas${googleDates}`)}&adults=${total - 6}`,
          },
        ]
      : []),
  ]
}

function citySlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function omioLinks(transfer) {
  const from = citySlug(transfer.origin || 'Madrid')
  const to = citySlug(transfer.destination || 'Paris')

  return [
    { label: 'Omio comparar', url: `https://www.omio.es/viajes/${from}/${to}` },
    { label: 'Tren', url: `https://www.omio.es/trenes/${from}/${to}` },
    { label: 'Bus', url: `https://www.omio.es/autobuses/${from}/${to}` },
    { label: 'Avión', url: `https://www.omio.es/vuelos/${from}/${to}` },
  ]
}

function estimateNightsFromDates(value) {
  const dates = parseTripDates(value)
  if (!dates.checkin || !dates.checkout) return 4
  const start = new Date(`${dates.checkin}T00:00:00Z`)
  const end = new Date(`${dates.checkout}T00:00:00Z`)
  const nights = Math.round((end - start) / 86_400_000)
  return nights > 0 && nights < 60 ? nights : 4
}

function travelerCountForOption(option, profile, f1Count) {
  const total = (Number(profile?.adults) || 0) + (profile?.childrenAges?.length || 0)
  if (option.targetGroup === 'f1') return Math.max(1, f1Count)
  if (option.targetGroup === 'non-f1') return Math.max(1, total - f1Count)
  return Math.max(1, total)
}

function optionBudget(option, profile, f1Count, nights) {
  const travelers = travelerCountForOption(option, profile, f1Count)
  const priceNight = option.priceConfidence === 'missing' ? null : option.priceNight
  const priceTotal = option.priceConfidence === 'missing' ? null : option.priceTotal
  let total
  let perPerson

  if (option.category === 'lodging') {
    total = priceTotal || (priceNight ? priceNight * nights : null)
    perPerson = total ? total / travelers : null
  } else if (option.category === 'transport' || option.budgetMode === 'perPerson') {
    perPerson = priceNight || (priceTotal ? priceTotal / travelers : null)
    total = perPerson ? perPerson * travelers : priceTotal || null
  } else {
    total = priceTotal || null
    perPerson = total ? total / travelers : priceNight || null
    if (!total && perPerson) total = perPerson * travelers
  }

  return {
    travelers,
    total,
    perPerson,
    missing: !total && !perPerson,
  }
}

function getPlaceName(place) {
  // place.name = legacy PlaceResult | place.displayName = string (new Place class) | .text = REST API
  return place.name || (typeof place.displayName === 'string' ? place.displayName : place.displayName?.text) || 'Lugar sugerido'
}

function getPlaceId(place) {
  return place.placeId || place.place_id || place.id || getPlaceName(place)
}

function getPlaceAddress(place) {
  return place.formattedAddress || place.formatted_address || place.vicinity || ''
}

function getPlaceReviews(place) {
  return place.userRatingCount || place.user_ratings_total || 0
}

function getPlacePhoto(place) {
  if (place.photoUri || place.image) return place.photoUri || place.image
  const photo = place.photos?.[0]
  if (!photo) return ''
  // New Places API uses getURI(), legacy uses getUrl()
  if (photo.getURI) return photo.getURI({ maxWidth: 1200 })
  if (photo.getUrl) return photo.getUrl({ maxWidth: 1200, maxHeight: 800 })
  return ''
}

function getPlacePhotoCredit(place) {
  if (place.photoCredit || place.imageCredit) return place.photoCredit || place.imageCredit
  const attribution = place.photos?.[0]?.authorAttributions?.[0]
  return attribution?.displayName ? `Foto: ${attribution.displayName}` : ''
}

function getPlaceLocation(place) {
  if (place.location?.lat && place.location?.lng) return place.location
  if (place.location?.latitude && place.location?.longitude) {
    return { lat: place.location.latitude, lng: place.location.longitude }
  }
  if (place.geometry?.location) {
    return {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
    }
  }
  return null
}

function getPlaceUrl(place) {
  const name = getPlaceName(place)
  const placeId = getPlaceId(place)
  if (place.googleMapsUri) return place.googleMapsUri
  if (place.place_id || place.placeId) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}&query_place_id=${placeId}`
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name)}`
}

function parseDatesForBooking(datesText) {
  if (!datesText) return { checkin: '', checkout: '' }
  const text = datesText.toLowerCase()
  const year = text.match(/\b(20\d{2})\b/)?.[1] || '2026'
  const monthMap = {
    ene: '01', enero: '01', feb: '02', febrero: '02',
    mar: '03', marzo: '03', abr: '04', abril: '04',
    may: '05', mayo: '05', jun: '06', junio: '06',
    jul: '07', julio: '07', ago: '08', agosto: '08',
    sep: '09', septiembre: '09', oct: '10', octubre: '10',
    nov: '11', noviembre: '11', dic: '12', diciembre: '12',
  }
  const monthKey = Object.keys(monthMap).find((key) => text.includes(key))
  const days = [...text.matchAll(/\b(\d{1,2})\b/g)].map((m) => Number(m[1])).filter((d) => d >= 1 && d <= 31)
  if (!monthKey || days.length < 2) return { checkin: '', checkout: '' }
  return {
    checkin: `${year}-${monthMap[monthKey]}-${String(days[0]).padStart(2, '0')}`,
    checkout: `${year}-${monthMap[monthKey]}-${String(days[1]).padStart(2, '0')}`,
  }
}

function placeSmartLinks(place, resultType, dates, groupProfile) {
  const name = getPlaceName(place)
  const encodedName = encodeURIComponent(name)
  const city = place.formattedAddress
    ? encodeURIComponent(place.formattedAddress.split(',').slice(-2, -1)[0]?.trim() || '')
    : ''
  const q = encodeURIComponent(`${name} ${city ? decodeURIComponent(city) : ''}`.trim())

  if (resultType === 'lodging') {
    const parsed = parseDatesForBooking(dates)
    const adults = groupProfile?.adults || 2
    const children = (groupProfile?.childrenAges || []).length
    const ages = (groupProfile?.childrenAges || []).map((age) => `&age=${age}`).join('')
    const bookingDates = parsed.checkin ? `&checkin=${parsed.checkin}&checkout=${parsed.checkout}` : ''
    return [
      {
        label: 'Booking',
        url: `https://www.booking.com/searchresults.es.html?ss=${encodedName}+${city}${bookingDates}&group_adults=${adults}&group_children=${children}${ages}&no_rooms=1`,
      },
      {
        label: 'Airbnb',
        url: `https://www.airbnb.com/s/${encodedName}-${city}/homes?adults=${adults}&children=${children}${parsed.checkin ? `&checkin=${parsed.checkin}&checkout=${parsed.checkout}` : ''}`,
      },
    ]
  }
  if (resultType === 'food') {
    return [
      { label: 'Google Maps', url: `https://www.google.com/maps/search/${q}` },
      { label: 'TripAdvisor', url: `https://www.tripadvisor.es/Search?q=${q}` },
    ]
  }
  // activities / kids
  return [
    { label: 'GetYourGuide', url: `https://www.getyourguide.com/s/?q=${q}` },
    { label: 'Google Maps', url: `https://www.google.com/maps/search/${q}` },
  ]
}

function smartSuggestionQueries(label, notes, city) {
  return [
    `${notes} en ${city}`,
    `${label} mejor valorados en ${city}`,
    `${label} con muchas reseñas en ${city}`,
    `${label} recomendados para familias en ${city}`,
  ].filter((query, index, list) => query && list.indexOf(query) === index)
}

// Uses the new Places API (Place.searchByText) — replaces legacy PlacesService.textSearch
async function searchBrowserPlacesNew(Place, queries, limit, requestBase = {}) {
  const seen = new Set()
  const places = []

  for (const queryText of queries) {
    if (places.length >= limit) break
    try {
      const response = await Place.searchByText({
        textQuery: queryText,
        fields: ['id', 'displayName', 'formattedAddress', 'location', 'rating', 'userRatingCount', 'photos', 'googleMapsUri', 'businessStatus'],
        maxResultCount: Math.min(limit - places.length, 20),
        ...requestBase,
      })
      for (const place of (response?.places || [])) {
        if (!place.id || seen.has(place.id)) continue
        seen.add(place.id)
        places.push(place)
        if (places.length >= limit) break
      }
    } catch {
      // Continue to next query on error
    }
  }

  return places
}

function mergeOption(current, option) {
  return [option, ...current.filter((item) => item.id !== option.id)]
}

// Extract bathroom count: use stored field first, fall back to regex on title
function extractBathrooms(option) {
  if (option.bathrooms != null) return option.bathrooms
  const match = (option.title || '').match(/(\d+)\s*ba[ñn]o/i)
  return match ? parseInt(match[1], 10) : null
}

function aiScoreLabel(score) {
  if (!score || score <= 30) return 'Por revisar'
  return `IA ${score}`
}

function aiScoreTitle(score) {
  if (!score || score <= 30) {
    return 'La IA todavía no tiene datos suficientes para puntuar esta opción.'
  }
  return 'Encaje IA: mezcla precio, ubicación, logística familiar, capacidad y datos disponibles.'
}

function App() {
  const previewMode = readPreviewMode()
  const [activeTab, setActiveTab] = useState('overview')
  const [selectedCity, setSelectedCity] = useState('Todas')
  const [activeMember, setActiveMember] = useState('camilo')
  const [showRemoved, setShowRemoved] = useState(false)
  const [currentUser, setCurrentUser] = useState(null)
  const [authReady, setAuthReady] = useState(true)
  const [routeMode, setRouteMode] = useState('TRANSIT')
  const [syncStatus, setSyncStatus] = useState({
    label: 'Sincronizando',
    detail: 'Conectando opciones y votos familiares...',
    online: true,
  })
  const [options, setOptions] = useState(() => (previewMode ? initialOptions : []))
  const [travelCities, setTravelCities] = useState(() => (previewMode ? cityIdeas : []))
  const [travelGroups, setTravelGroups] = useState(() => (previewMode ? familyProfiles : []))
  const [activeTravelGroupId, setActiveTravelGroupId] = useState('familia-sept-2026')
  const [votes, setVotes] = useState(() => (previewMode ? previewVotes : {}))
  const [draft, setDraft] = useState(() => defaultDraftForTrip(null))
  const [cityDraft, setCityDraft] = useState({
    city: '',
    country: '',
    dates: '',
    transfer: '',
    angle: '',
    coords: null,
    isBase: false,
  })
  const [searchDraft, setSearchDraft] = useState(() => defaultSearchDraftForTrip(null))
  const [searchResult, setSearchResult] = useState(null)
  const [places, setPlaces] = useState([])
  const [placesPage, setPlacesPage] = useState(1)
  const [placesBusy, setPlacesBusy] = useState(false)
  const [smartSuggestionType, setSmartSuggestionType] = useState('food')
  const [smartSuggestions, setSmartSuggestions] = useState(null)
  const [smartSuggestionsPage, setSmartSuggestionsPage] = useState(1)
  const [smartSuggestionsBusy, setSmartSuggestionsBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [placeDraft, setPlaceDraft] = useState(null)
  const [itineraryBusy, setItineraryBusy] = useState(false)
  const [generatedItinerary, setGeneratedItinerary] = useState(null)
  const [externalLink, setExternalLink] = useState('')
  const [externalPriceTotal, setExternalPriceTotal] = useState('')
  const [externalPriceNight, setExternalPriceNight] = useState('')
  const [externalBusy, setExternalBusy] = useState(false)
  const [availabilityBusyId, setAvailabilityBusyId] = useState('')
  const [budgetOptionIds, setBudgetOptionIds] = useState(() => (previewMode ? ['lodging-m'] : []))
  const [transferDraft, setTransferDraft] = useState(() => defaultTransferDraftForTrip(null))
  const [transferResult, setTransferResult] = useState(null)
  const [transferBusy, setTransferBusy] = useState(false)
  const [subgroupDraft, setSubgroupDraft] = useState(() => defaultSubgroupDraftForTrip(null))

  // ── Topbar AI chat ──────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [showTopbarChat, setShowTopbarChat] = useState(false)
  const [topbarChatInput, setTopbarChatInput] = useState('')
  const [topbarChatHistory, setTopbarChatHistory] = useState([])
  const [topbarChatBusy, setTopbarChatBusy] = useState(false)
  const [gpsLoading, setGPSLoading] = useState(false)
  const topbarChatEndRef = useRef(null)

  async function handleTopbarChat(e) {
    if (e) e.preventDefault()
    const text = topbarChatInput.trim()
    if (!text || topbarChatBusy) return
    const newHistory = [...topbarChatHistory, { role: 'user', content: text }]
    setTopbarChatHistory(newHistory)
    setTopbarChatInput('')
    setTopbarChatBusy(true)
    try {
      const result = await chatPlanner(text, topbarChatHistory)
      if (result?.reply) {
        setTopbarChatHistory([...newHistory, { role: 'assistant', content: result.reply }])
      }
    } catch {
      setTopbarChatHistory([...newHistory, { role: 'assistant', content: 'Error al conectar con el planificador.' }])
    } finally {
      setTopbarChatBusy(false)
      topbarChatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }

  function getCurrentGPSLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('La geolocalización no está soportada en este navegador.'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          })
        },
        (error) => {
          let msg = 'Error al obtener la ubicación.'
          if (error.code === 1) msg = 'Permiso de ubicación denegado por el usuario.'
          else if (error.code === 2) msg = 'La ubicación no está disponible.'
          else if (error.code === 3) msg = 'Tiempo de espera agotado al buscar ubicación.'
          reject(new Error(msg))
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      )
    })
  }

  async function handleQuickGPSNearby() {
    if (topbarChatBusy || gpsLoading) return
    setGPSLoading(true)
    const tempHistory = [...topbarChatHistory, { role: 'user', content: '🔍 Buscando mi ubicación GPS actual...' }]
    setTopbarChatHistory(tempHistory)
    
    try {
      const loc = await getCurrentGPSLocation()
      const prompt = `Estoy en la ubicación GPS (Latitud: ${loc.lat.toFixed(6)}, Longitud: ${loc.lng.toFixed(6)}). Por favor, recomiéndame 10 lugares de interés turístico, restaurantes, o actividades interesantes cerca de mí para disfrutar en familia en nuestro viaje.`
      
      const updatedHistory = [...topbarChatHistory, { role: 'user', content: prompt }]
      setTopbarChatHistory(updatedHistory)
      setGPSLoading(false)
      setTopbarChatBusy(true)
      
      const result = await chatPlanner(prompt, topbarChatHistory)
      if (result?.reply) {
        setTopbarChatHistory([...updatedHistory, { role: 'assistant', content: result.reply }])
      }
    } catch (err) {
      console.error(err)
      const errorPrompt = `No pude obtener tu ubicación automáticamente (${err.message}). Por favor, sugiéreme qué lugares interesantes de interés general o actividades en familia podemos hacer hoy en Madrid.`
      const errorHistory = [...topbarChatHistory, { role: 'user', content: 'Recomendar sitios de interés general cerca de mí (GPS no disponible)' }]
      setTopbarChatHistory(errorHistory)
      setGPSLoading(false)
      setTopbarChatBusy(true)
      
      const result = await chatPlanner(errorPrompt, topbarChatHistory)
      if (result?.reply) {
        setTopbarChatHistory([...errorHistory, { role: 'assistant', content: result.reply }])
      }
    } finally {
      setGPSLoading(false)
      setTopbarChatBusy(false)
      setTimeout(() => topbarChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  async function handleQuickGPSRoute() {
    if (topbarChatBusy || gpsLoading) return
    setGPSLoading(true)
    const tempHistory = [...topbarChatHistory, { role: 'user', content: '📍 Calculando ruta desde mi ubicación GPS...' }]
    setTopbarChatHistory(tempHistory)
    
    try {
      const loc = await getCurrentGPSLocation()
      const prompt = `Estoy en la ubicación GPS (Latitud: ${loc.lat.toFixed(6)}, Longitud: ${loc.lng.toFixed(6)}). Por favor, explícame la mejor ruta de transporte (líneas de metro, cercanías o transporte público preferente, coche o caminando si está cerca) para llegar al recinto IFEMA Madrid (o el circuito de F1 si aplica) o al centro de Madrid desde mi ubicación actual. Dame detalles sobre estaciones y tiempos estimados.`
      
      const updatedHistory = [...topbarChatHistory, { role: 'user', content: prompt }]
      setTopbarChatHistory(updatedHistory)
      setGPSLoading(false)
      setTopbarChatBusy(true)
      
      const result = await chatPlanner(prompt, topbarChatHistory)
      if (result?.reply) {
        setTopbarChatHistory([...updatedHistory, { role: 'assistant', content: result.reply }])
      }
    } catch (err) {
      console.error(err)
      const errorPrompt = `No pude obtener tu ubicación automáticamente (${err.message}). Sugiéreme la mejor combinación de rutas y transporte público habitual (Metro o Cercanías) para movernos hacia el recinto de IFEMA y el circuito de F1 en Madrid desde la zona centro o las áreas de alojamiento más recomendadas.`
      const errorHistory = [...topbarChatHistory, { role: 'user', content: 'Sugerir rutas de transporte público hacia IFEMA (GPS no disponible)' }]
      setTopbarChatHistory(errorHistory)
      setGPSLoading(false)
      setTopbarChatBusy(true)
      
      const result = await chatPlanner(errorPrompt, topbarChatHistory)
      if (result?.reply) {
        setTopbarChatHistory([...errorHistory, { role: 'assistant', content: result.reply }])
      }
    } finally {
      setGPSLoading(false)
      setTopbarChatBusy(false)
      setTimeout(() => topbarChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  async function handleQuickSuggest50Restaurants() {
    if (topbarChatBusy || gpsLoading) return
    const prompt = `Sugiéreme un listado de al menos 50 excelentes restaurantes, cafeterías, taperías y sitios emblemáticos para comer en Madrid, clasificados por zonas recomendadas para el viaje (cerca de IFEMA, zona centro/Gran Vía, Retiro, Barrio de Salamanca, etc.) que sean adecuados para una familia de 9 personas con niños.`
    const newHistory = [...topbarChatHistory, { role: 'user', content: 'Sugerir 50 excelentes sitios para comer en Madrid por zonas' }]
    setTopbarChatHistory(newHistory)
    setTopbarChatBusy(true)
    try {
      const result = await chatPlanner(prompt, topbarChatHistory)
      if (result?.reply) {
        setTopbarChatHistory([...newHistory, { role: 'assistant', content: result.reply }])
      }
    } catch {
      setTopbarChatHistory([...newHistory, { role: 'assistant', content: 'Error al conectar con el planificador.' }])
    } finally {
      setTopbarChatBusy(false)
      setTimeout(() => topbarChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  async function handleQuickSuggest50Hotels() {
    if (topbarChatBusy || gpsLoading) return
    const prompt = `Recomienda un listado de al menos 50 opciones de alojamiento (hoteles con encanto, villas, grandes apartamentos y apartoteles) en Madrid que sean aptos y cómodos para hospedar a una familia numerosa de 9 personas con niños del 10 al 14 de septiembre de 2026.`
    const newHistory = [...topbarChatHistory, { role: 'user', content: 'Recomendar 50 alojamientos en Madrid para familia de 9 personas' }]
    setTopbarChatHistory(newHistory)
    setTopbarChatBusy(true)
    try {
      const result = await chatPlanner(prompt, topbarChatHistory)
      if (result?.reply) {
        setTopbarChatHistory([...newHistory, { role: 'assistant', content: result.reply }])
      }
    } catch {
      setTopbarChatHistory([...newHistory, { role: 'assistant', content: 'Error al conectar con el planificador.' }])
    } finally {
      setTopbarChatBusy(false)
      setTimeout(() => topbarChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    }
  }

  // ── Phase 1: multi-trip state ───────────────────────────────────────
  const [activeTripId, setActiveTripId] = useState(() => {
    try {
      return window.localStorage.getItem('activeTripId') || null
    } catch {
      return null
    }
  })
  const [userTrips, setUserTrips] = useState([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [pendingJoinCode, setPendingJoinCode] = useState(() => {
    try {
      const code = new URLSearchParams(window.location.search).get('join')
      return code ? code.trim().toUpperCase() : null
    } catch {
      return null
    }
  })
  const defaultedTripRef = useRef('')

  const firebaseStatus = getFirebaseStatus()
  const canSync = Boolean(currentUser && canUseFirestore())
  const displayedSyncStatus = currentUser || previewMode
    ? previewMode && !currentUser
      ? {
          label: 'Vista local',
          detail: 'Vista previa local: los cambios no se guardan en Firebase.',
          online: false,
        }
      : syncStatus
    : {
        label: isFirebaseConfigured ? 'Sin sesión' : 'Modo local',
        detail: isFirebaseConfigured
          ? 'Inicia sesión para sincronizar sugerencias y votos.'
          : 'Configura Firebase para activar colaboración.',
        online: false,
      }
  const activeCategory = categoryConfig[activeTab]
  const f1Crew = familyMembers.filter((member) => member.group === 'f1')
  const activeContributorIsAdult = isAdultMember(activeMember)
  const showOptionWorkspace = optionWorkspaceTabs.includes(activeTab)
  const activeTrip = useMemo(
    () => userTrips.find((t) => t.id === activeTripId) || null,
    [userTrips, activeTripId],
  )
  const normalizedTravelGroups = useMemo(
    () => (travelGroups.length ? travelGroups : familyProfiles).map((profile) => enrichTravelGroup(profile)),
    [travelGroups],
  )
  const currentTravelGroup = useMemo(
    () =>
      normalizedTravelGroups.find((profile) => profile.id === activeTravelGroupId) ||
      normalizedTravelGroups[0] ||
      enrichTravelGroup(defaultTravelGroup),
    [activeTravelGroupId, normalizedTravelGroups],
  )
  const activeTravelCities = useMemo(
    () => travelCities.filter((idea) => idea.status !== 'removed'),
    [travelCities],
  )
	  const cityFilters = useMemo(
	    () => {
	      const baseCity = primaryTripCity(activeTrip)
	      const fallbackCities = baseCity === 'Madrid' ? ['Madrid'] : [baseCity, 'Madrid']
	      return ['Todas', ...fallbackCities, ...activeTravelCities.map((idea) => idea.city)]
	        .filter((city, index, list) => city && list.indexOf(city) === index)
	    },
	    [activeTravelCities, activeTrip],
	  )
  const effectiveSelectedCity = cityFilters.includes(selectedCity) ? selectedCity : 'Todas'
  const budgetOptions = useMemo(
    () =>
      budgetOptionIds
        .map((optionId) => options.find((option) => option.id === optionId))
        .filter(Boolean),
    [budgetOptionIds, options],
  )
  const subgroupBudgetOptions = useMemo(
    () =>
      (currentTravelGroup.budgetOptionIds || [])
        .map((optionId) => options.find((option) => option.id === optionId))
        .filter(Boolean),
    [currentTravelGroup.budgetOptionIds, options],
  )
  const budgetNights = estimateNightsFromDates(searchDraft.dates)
  const activeSearchType = searchTypeForTab(activeTab, searchDraft.type)
  const activeSearchMeta = searchMetaForType(activeSearchType)
  const smartSuggestionTypeForTab = activeTab === 'activities' || activeTab === 'food'
    ? activeSearchType
    : activeTab === 'lodging'
      ? 'lodging'
      : smartSuggestionType

  const budgetTotalPerPerson = useMemo(() => {
    if (!budgetOptions.length) return null
    let total = 0
    for (const option of budgetOptions) {
      const b = optionBudget(option, currentTravelGroup, f1Crew.length, budgetNights)
      if (b.perPerson) total += b.perPerson
    }
    return total > 0 ? total : null
  }, [budgetOptions, currentTravelGroup, f1Crew.length, budgetNights])

  const daysUntilTrip = useMemo(() => {
    const tripStart = new Date(`${activeTrip?.startDate || '2026-09-10'}T00:00:00Z`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const diff = Math.ceil((tripStart - today) / 86_400_000)
    return diff > 0 ? diff : 0
  }, [activeTrip?.startDate])

	  useEffect(() => {
	    if (!firebaseAuth) return undefined

	    return onAuthStateChanged(firebaseAuth, (user) => {
	      setCurrentUser(user)
	      setAuthReady(true)
	      setTripsLoading(Boolean(user))
	      if (!user) {
	        setUserTrips([])
	      }
	    })
	  }, [])

	  useEffect(() => {
	    if (!currentUser || !canUseFirestore()) {
	      return undefined
	    }

	    let active = true

    saveUserProfile(currentUser, activeMember)
      .then(async () => {
        if (!isTripAdmin(currentUser)) return
        await seedMadridF1Trip(currentUser)
        await seedMadridF1Data(currentUser)
      })
	      .catch((error) => {
	        if (!active) return
        setSyncStatus({
          label: 'Revisar permisos',
          detail: error.message,
          online: false,
	        })
	      })

	    return () => {
	      active = false
	    }
	  }, [activeMember, currentUser])

	  useEffect(() => {
	    if (!currentUser || !canUseFirestore() || !activeTripId) {
	      return undefined
	    }

	    let active = true

	    const unsubscribeOptions = subscribeTripOptions(
	      activeTripId,
	      (nextOptions) => {
	        if (!active) return
	        setOptions(nextOptions)
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
	      activeTripId,
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

	    const unsubscribeCities = subscribeTravelCities(
	      activeTripId,
	      (nextCities) => {
	        if (active) setTravelCities(nextCities)
	      },
	      (error) => {
	        if (!active) return
	        setSyncStatus({
	          label: 'Ciudades locales',
	          detail: error.message,
	          online: false,
	        })
	      },
	    )

	    const unsubscribeGroups = subscribeTravelGroups(
	      activeTripId,
	      (nextGroups) => {
	        if (!active) return
	        setTravelGroups(nextGroups)
	        if (nextGroups.length && !nextGroups.some((profile) => profile.id === activeTravelGroupId)) {
	          setActiveTravelGroupId(nextGroups[0].id)
	        }
	      },
	      (error) => {
	        if (!active) return
	        setSyncStatus({
	          label: 'Grupos locales',
	          detail: error.message,
	          online: false,
	        })
	      },
	    )

	    const unsubscribeBudget = subscribeTripBudget(
	      activeTripId,
	      (nextOptionIds) => {
	        if (active) setBudgetOptionIds(nextOptionIds)
	      },
	      (error) => {
	        if (!active) return
	        setSyncStatus({
	          label: 'Presupuesto local',
	          detail: error.message,
	          online: false,
	        })
	      },
	    )

	    return () => {
	      active = false
	      unsubscribeOptions()
	      unsubscribeVotes()
	      unsubscribeCities()
	      unsubscribeGroups()
	      unsubscribeBudget()
	    }
	  }, [activeMember, activeTravelGroupId, activeTripId, currentUser])

  // ── Phase 1: subscribe to the user's trips list ─────────────────────
	  useEffect(() => {
	    if (!currentUser || !canUseFirestore()) {
	      return undefined
	    }
	    const unsubscribe = subscribeUserTrips(
	      currentUser.uid,
      (trips) => {
        setUserTrips(trips)
        setTripsLoading(false)
      },
      (error) => {
        console.error('subscribeUserTrips error:', error)
        setTripsLoading(false)
      },
	    )
	    return () => unsubscribe()
	  }, [currentUser])

  // Phase 1: persist activeTripId in localStorage
  useEffect(() => {
    try {
      if (activeTripId) window.localStorage.setItem('activeTripId', activeTripId)
      else window.localStorage.removeItem('activeTripId')
    } catch {
      // ignore quota / private mode
    }
  }, [activeTripId])

  // Custom Itinerary: load from localStorage on activeTripId change
  useEffect(() => {
    if (activeTripId) {
      try {
        const saved = window.localStorage.getItem(`custom_itinerary_${activeTripId}`)
        if (saved) {
          setGeneratedItinerary(JSON.parse(saved))
        }
      } catch (e) {
        console.error('Error loading custom itinerary:', e)
      }
    }
  }, [activeTripId])

  useEffect(() => {
    if (!activeTrip || defaultedTripRef.current === activeTrip.id) return
    applyTripDefaults(activeTrip)
    defaultedTripRef.current = activeTrip.id
  }, [activeTrip])

  const visibleOptions = useMemo(() => {
    return options
      .filter((option) => {
        if (option.category !== activeTab) return false
        if (!showRemoved && option.status === 'removed') return false
        if (effectiveSelectedCity === 'Todas') return true
        if (effectiveSelectedCity === 'España por decidir') {
          return option.city !== 'Madrid' && option.city !== 'París'
        }
        return option.city === effectiveSelectedCity
      })
      .sort((a, b) => b.aiScore - a.aiScore)
  }, [activeTab, effectiveSelectedCity, options, showRemoved])

  const mapOptions = useMemo(
    () =>
      options.filter(
        (option) =>
          option.status !== 'removed' &&
          option.city === (effectiveSelectedCity === 'Todas' ? 'Madrid' : effectiveSelectedCity) &&
          option.map &&
          option.category !== 'itinerary' &&
          (budgetOptionIds.includes(option.id) || (votes[option.id]?.length || 0) > 0),
      ),
    [budgetOptionIds, effectiveSelectedCity, options, votes],
	  )
	  const currentMapCity = cityCenter(effectiveSelectedCity, activeTravelCities)
	  function updateDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }))
  }

  function updateCityDraft(field, value) {
    setCityDraft((current) => {
      if (field !== 'city') return { ...current, [field]: value }

      const defaults = obviousCityDefaults[cityKey(value)]
      if (!defaults) return { ...current, city: value }

      return {
        ...current,
        city: value,
        country: defaults.country || current.country,
        dates: current.dates || defaults.dates || '',
        transfer: defaults.transfer || current.transfer,
        angle: current.angle || defaults.angle,
        coords: defaults.coords,
      }
    })
  }

  function updateSearchDraft(field, value) {
    setSearchDraft((current) => ({ ...current, [field]: value }))
  }

  function switchTab(tabId) {
    const nextType = searchTypeForTab(tabId, searchDraft.type)
    if (optionWorkspaceTabs.includes(tabId)) {
      const config = nextType === 'lodging' ? null : smartConfigForType(nextType)
      setSearchDraft((current) => ({
        ...current,
        type: nextType,
        notes: current.type === nextType ? current.notes : config?.notes || current.notes,
      }))
      setPlaces([])
      setSearchResult(null)
      setPlacesPage(1)
      setSmartSuggestionsPage(1)
      if (nextType === 'activities' || nextType === 'food') {
        setSmartSuggestionType(nextType)
      }
    }
    setActiveTab(tabId)
  }

  async function pasteExternalLinkFromClipboard() {
    if (!navigator.clipboard?.readText) {
      setAiFeedback({
        title: 'Portapapeles no disponible',
        detail: 'Pega el link manualmente en la búsqueda inteligente.',
        tone: 'warning',
      })
      return
    }

    try {
      const text = (await navigator.clipboard.readText()).trim()
      if (!/^https?:\/\//i.test(text)) {
        setAiFeedback({
          title: 'No encontré un link',
          detail: 'Copia primero un enlace de Booking, Airbnb o Google Maps.',
          tone: 'warning',
        })
        return
      }

      setExternalLink(text)
      setSearchDraft((current) => ({
        ...current,
        city: currentMapCity.city,
        type: 'lodging',
      }))
      setActiveTab('lodging')
      setAiFeedback({
        title: 'Link listo para analizar',
        detail: 'Lo dejé preparado en la búsqueda inteligente.',
        tone: 'ready',
      })
    } catch {
      setAiFeedback({
        title: 'Permiso de portapapeles',
        detail: 'El navegador no permitió leerlo. Pega el link manualmente abajo.',
        tone: 'warning',
      })
    }
  }

  function selectCityFilter(city) {
    setSelectedCity(city)

    if (city === 'Todas') return

    setDraft((current) => ({ ...current, city }))
    setSearchDraft((current) => ({ ...current, city }))
    setTransferDraft((current) => ({
      ...current,
      destination: city === 'Madrid' ? current.destination : city,
    }))
  }

  function updateTransferDraft(field, value) {
    setTransferDraft((current) => ({ ...current, [field]: value }))
  }

  function persistTripBudget(nextOptionIds) {
    if (!canSync) return
    saveTripBudget(nextOptionIds, currentUser, activeTripId).catch((error) => {
      setSyncStatus({
        label: 'Presupuesto local',
        detail: error.message,
        online: false,
      })
    })
  }

  function toggleBudgetOption(optionId) {
    const nextOptionIds = budgetOptionIds.includes(optionId)
      ? budgetOptionIds.filter((item) => item !== optionId)
      : [...budgetOptionIds, optionId]
    setBudgetOptionIds(nextOptionIds)
    persistTripBudget(nextOptionIds)
  }

  function addOptionToBudget(optionId) {
    const nextOptionIds = [...new Set([...budgetOptionIds, optionId])]
    setBudgetOptionIds(nextOptionIds)
    persistTripBudget(nextOptionIds)
  }

  function removeOptionFromBudget(optionId) {
    const nextOptionIds = budgetOptionIds.filter((item) => item !== optionId)
    setBudgetOptionIds(nextOptionIds)
    persistTripBudget(nextOptionIds)
  }

  function persistTravelGroup(profile) {
    if (!canSync) return
    saveTravelGroup(profile, currentUser, activeTripId).catch((error) => {
      setSyncStatus({
        label: 'Subgrupo local',
        detail: error.message,
        online: false,
      })
    })
  }

  function upsertTravelGroup(profile) {
    const normalized = enrichTravelGroup(profile)
    setTravelGroups((current) => {
      const source = current.length ? current : normalizedTravelGroups
      return [normalized, ...source.filter((item) => item.id !== normalized.id)]
    })
    persistTravelGroup(normalized)
    return normalized
  }

  function updateSubgroupDraft(field, value) {
    setSubgroupDraft((current) => ({ ...current, [field]: value }))
  }

  function toggleSubgroupDraftMember(memberId) {
    setSubgroupDraft((current) => {
      const memberIds = current.memberIds.includes(memberId)
        ? current.memberIds.filter((id) => id !== memberId)
        : [...current.memberIds, memberId]
      return { ...current, memberIds }
    })
  }

  function createSubgroup(event) {
    event.preventDefault()
    const memberIds = subgroupDraft.memberIds.length
      ? subgroupDraft.memberIds
      : [activeMember]
    const memberNames = memberIds.map(memberName)
    const name = subgroupDraft.name.trim() || `Subgrupo ${memberNames.slice(0, 2).join(' + ')}`
    const profile = upsertTravelGroup({
      id: `subgrupo-${citySlug(name)}-${Date.now()}`,
      name,
      memberIds,
      adults: memberIds.filter(isAdultMember).length,
      childrenAges: memberIds
        .filter((id) => !isAdultMember(id))
        .map((id) => childAgeByMemberId[id])
        .filter(Boolean),
      date: subgroupDraft.date,
      startTime: subgroupDraft.startTime,
      endTime: subgroupDraft.endTime,
      focus: subgroupDraft.focus.trim(),
      note: subgroupDraft.focus.trim(),
      kind: 'subgroup',
      budgetOptionIds: [],
    })
    setActiveTravelGroupId(profile.id)
    setSubgroupDraft(defaultSubgroupDraftForTrip(activeTrip))
    setAiFeedback({
      tone: 'ready',
      title: 'Subgrupo creado',
      detail: `${profile.name} ya tiene horario propio para el itinerario IA.`,
    })
  }

  function updateTravelGroup(groupId, patch) {
    const existing =
      normalizedTravelGroups.find((profile) => profile.id === groupId) ||
      currentTravelGroup
    upsertTravelGroup({ ...existing, ...patch })
  }

  function deleteTravelGroup(groupId) {
    setTravelGroups((current) => {
      const source = current.length ? current : normalizedTravelGroups
      return source.filter((item) => item.id !== groupId)
    })
    if (activeTravelGroupId === groupId) {
      setActiveTravelGroupId(null)
    }
  }

  function toggleSubgroupBudgetOption(optionId) {
    const currentIds = currentTravelGroup.budgetOptionIds || []
    const nextIds = currentIds.includes(optionId)
      ? currentIds.filter((id) => id !== optionId)
      : [...currentIds, optionId]
    updateTravelGroup(currentTravelGroup.id, { budgetOptionIds: nextIds })
  }

  // ── Phase 2: trip navigation handlers ───────────────────────────────
  function cleanJoinFromUrl() {
    try {
      const url = new URL(window.location.href)
      if (url.searchParams.has('join')) {
        url.searchParams.delete('join')
        window.history.replaceState({}, '', url.toString())
      }
    } catch {
      // ignore
    }
  }

  function applyTripDefaults(trip) {
    setDraft(defaultDraftForTrip(trip))
    setSearchDraft(defaultSearchDraftForTrip(trip, defaultTravelGroup))
    setTransferDraft(defaultTransferDraftForTrip(trip, defaultTravelGroup))
    setSubgroupDraft(defaultSubgroupDraftForTrip(trip))
    setSelectedCity('Todas')
  }

  function resetTripScopedState(trip) {
    const tripId = trip?.id || trip
    setOptions([])
    setTravelCities([])
    setTravelGroups([])
    setVotes({})
    setBudgetOptionIds(defaultBudgetOptionIdsForTrip(tripId))
    setGeneratedItinerary(null)
    setSearchResult(null)
    setPlaces([])
    setPlacesPage(1)
    setSmartSuggestions(null)
    setSmartSuggestionsPage(1)
    setPlaceDraft(null)
    setTransferResult(null)
    applyTripDefaults(trip)
    defaultedTripRef.current = tripId || ''
  }

  function handleEnterTrip(trip) {
    resetTripScopedState(trip)
    setActiveTripId(trip.id)
    setPendingJoinCode(null)
    cleanJoinFromUrl()
  }

  function handleBackToDashboard() {
    setActiveTripId(null)
    defaultedTripRef.current = ''
  }

  function handleDismissJoinModal() {
    setPendingJoinCode(null)
    cleanJoinFromUrl()
  }

  async function handleDeleteTrip(tripId) {
    await deleteTrip(tripId, currentUser)
    // If the deleted trip was active, go back to dashboard
    if (activeTripId === tripId) {
      setActiveTripId(null)
      defaultedTripRef.current = ''
    }
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
    setOptions(previewMode ? initialOptions : [])
    setTravelCities(previewMode ? cityIdeas : [])
    setTravelGroups(previewMode ? familyProfiles : [])
    setActiveTravelGroupId('familia-sept-2026')
    setVotes(previewMode ? previewVotes : {})
    setBudgetOptionIds(previewMode ? ['lodging-m'] : [])
    // Phase 1: reset multi-trip state
    setActiveTripId(null)
    setUserTrips([])
    setPendingJoinCode(null)
    setDraft(defaultDraftForTrip(null))
    setSearchDraft(defaultSearchDraftForTrip(null))
    setTransferDraft(defaultTransferDraftForTrip(null))
    setSubgroupDraft(defaultSubgroupDraftForTrip(null))
    defaultedTripRef.current = ''
    try {
      window.localStorage.removeItem('activeTripId')
    } catch {
      // ignore
    }
  }

  async function addOption(event) {
    event.preventDefault()

    if (canSync) {
      setAiBusy(true)
      setAiFeedback({
        tone: 'working',
        title: 'Analizando con IA',
        detail: 'Estoy leyendo el link, cruzando Maps y preparando pros/contras.',
      })

      try {
	        const result = await analyzeOptionWithAI({
	          tripId: activeTripId,
	          ...draft,
          dates: searchDraft.dates,
          isAdultContributor: activeContributorIsAdult,
          selectedMemberId: activeMember,
          groupProfile: currentTravelGroup,
          subgroups: normalizedTravelGroups.filter((p) => p.kind === 'subgroup'),
        })
        if (result.option) {
          setOptions((current) => mergeOption(current, result.option))
          setAiFeedback({
            tone: 'ready',
            title: 'Análisis agregado',
            detail: result.analysis?.summary || 'La opción quedó lista para votar y revisar.',
          })
          setDraft({
            title: '',
            url: '',
            category: draft.category,
            city: draft.city,
            targetGroup: draft.targetGroup,
            priceTotal: '',
            priceNight: '',
            notes: '',
          })
          setActiveTab(result.option.category)
          setAiBusy(false)
          setShowAddModal(false)
          return
        }
      } catch (error) {
        setAiFeedback({
          tone: 'warning',
          title: 'IA no disponible',
          detail: `${error.message}. Guardé la opción como pendiente para analizarla después.`,
        })
      } finally {
        setAiBusy(false)
      }
    }

    const option = buildDraftOption(draft, activeContributorIsAdult ? 'active' : 'pending')
    setOptions((current) => mergeOption(current, option))
	    if (canSync) {
	      await saveTripOption(option, currentUser, activeTripId)
	    }
    setDraft({
      title: '',
      url: '',
      category: draft.category,
      city: draft.city,
      targetGroup: draft.targetGroup,
      priceTotal: '',
      priceNight: '',
      notes: '',
    })
    setActiveTab(option.category)
    setShowAddModal(false)
  }

  async function analyzeExternalLink(event) {
    event.preventDefault()
    if (!externalLink.trim()) return

    setExternalBusy(true)
    setAiFeedback({
      tone: 'working',
      title: 'Trayendo opción externa',
      detail: 'Copié el link a la IA para convertirlo en hospedaje comparable.',
    })

    try {
	      const result = await analyzeOptionWithAI({
	        tripId: activeTripId,
	        title: '',
        url: externalLink,
        category: 'lodging',
        city: searchDraft.city,
        targetGroup: 'family',
        priceTotal: externalPriceTotal,
        priceNight: externalPriceNight,
        notes: searchDraft.notes,
        dates: searchDraft.dates,
        isAdultContributor: activeContributorIsAdult,
        selectedMemberId: activeMember,
        groupProfile: currentTravelGroup,
        subgroups: normalizedTravelGroups.filter((p) => p.kind === 'subgroup'),
      })

      if (result.option) {
        setOptions((current) => mergeOption(current, result.option))
        setExternalLink('')
        setExternalPriceTotal('')
        setExternalPriceNight('')
        setActiveTab('lodging')
        setAiFeedback({
          tone: 'ready',
          title: 'Hospedaje agregado',
          detail: result.analysis?.summary || 'El link externo ya quedó en la lista para comparar.',
        })
      }
    } catch (error) {
      setAiFeedback({
        tone: 'warning',
        title: 'No pude importar el link',
        detail: error.message,
      })
    } finally {
      setExternalBusy(false)
    }
  }

  async function addCity(event) {
    event.preventDefault()
    if (!cityDraft.city.trim()) return

    const city = await resolveCityCoords(buildCityDraft(cityDraft))
    setTravelCities((current) => [city, ...current])
    setSelectedCity(city.city)
    setDraft((current) => ({ ...current, city: city.city }))
    setSearchDraft((current) => ({
      ...current,
      city: city.city,
      dates: city.dates === 'Fechas por definir' ? current.dates : city.dates,
    }))
    setTransferDraft((current) => ({
      ...current,
      destination: city.city === 'Madrid' ? current.destination : city.city,
    }))
    setCityDraft({
      city: '',
      country: '',
      dates: '',
      transfer: '',
      angle: '',
      coords: null,
      isBase: false,
    })

	    if (canSync) {
	      await saveTravelCity(city, currentUser, activeTripId)
	    }
  }

  function removeCity(cityId) {
    const city = travelCities.find((item) => item.id === cityId)
    setTravelCities((current) =>
      current.map((item) =>
        item.id === cityId ? { ...item, status: 'removed' } : item,
      ),
    )
    if (city?.city === selectedCity) {
      setSelectedCity('Todas')
    }

	    if (canSync) {
	      updateTravelCityStatus(cityId, 'removed', currentUser, activeTripId).catch((error) => {
        setSyncStatus({
          label: 'Ciudad local',
          detail: error.message,
          online: false,
        })
      })
    }
  }

  function removeCityByName(cityName) {
    const city = travelCities.find(
      (item) => item.city === cityName && item.status !== 'removed',
    )
    if (city) removeCity(city.id)
  }

  async function updateCity(updatedCity) {
    setTravelCities((current) =>
      current.map((item) => (item.id === updatedCity.id ? { ...item, ...updatedCity } : item)),
    )
    if (canSync) {
      await saveTravelCity({ ...updatedCity }, currentUser, activeTripId)
    }
  }

  function autoFillCityDates() {
    const active = activeTravelCities.filter((c) => c.status !== 'removed')
    if (!active.length) return

    // Base: trip end date (or Sep 14 for Madrid F1), window of ~10 days
    const baseDateStr = activeTrip?.endDate || '2026-09-14'
    const base = new Date(`${baseDateStr}T00:00:00Z`)
    const totalDays = 10
    const daysPerCity = Math.max(2, Math.floor(totalDays / active.length))
    const months = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic']

    function fmtRange(start, end) {
      if (start.getUTCMonth() === end.getUTCMonth()) {
        return `${start.getUTCDate()}-${end.getUTCDate()} ${months[start.getUTCMonth()]} ${start.getUTCFullYear()}`
      }
      return `${start.getUTCDate()} ${months[start.getUTCMonth()]}-${end.getUTCDate()} ${months[end.getUTCMonth()]} ${start.getUTCFullYear()}`
    }

    let cursor = new Date(base)
    const updated = active.map((city) => {
      const start = new Date(cursor)
      const end = new Date(cursor.getTime() + daysPerCity * 86_400_000)
      cursor = end
      const key = cityKey(city.city)
      const defaultTransfer = obviousCityDefaults[key]?.transfer || city.transfer
      return {
        ...city,
        dates: fmtRange(start, end),
        transfer:
          city.transfer === 'Traslado por definir' || !city.transfer
            ? defaultTransfer
            : city.transfer,
        readiness: Math.min((city.readiness || 18) + 15, 65),
      }
    })

    setTravelCities((current) =>
      current.map((item) => {
        const u = updated.find((c) => c.id === item.id)
        return u || item
      }),
    )
    if (canSync) {
      updated.forEach((city) => saveTravelCity(city, currentUser, activeTripId))
    }
  }

  // ── Base city & day-trip helpers ──────────────────────────────────────────

  function toggleCityBase(cityId) {
    setTravelCities((current) =>
      current.map((item) => {
        if (item.id !== cityId) return item
        const wasBase = Boolean(item.isBase)
        const updated = {
          ...item,
          isBase: !wasBase,
          dayTrips: wasBase ? [] : (item.dayTrips || []),
          dates: !wasBase ? 'Base / casa' : (item.dates === 'Base / casa' ? 'Fechas por definir' : item.dates),
          transfer: !wasBase ? 'Sin traslado (base)' : (item.transfer === 'Sin traslado (base)' ? 'Traslado por definir' : item.transfer),
          readiness: !wasBase ? 100 : Math.min(item.readiness, 65),
        }
        if (canSync) saveTravelCity(updated, currentUser, activeTripId)
        return updated
      }),
    )
  }

  function addDayTrip(cityId, trip) {
    setTravelCities((current) =>
      current.map((item) => {
        if (item.id !== cityId) return item
        const updated = { ...item, dayTrips: [...(item.dayTrips || []), trip] }
        if (canSync) saveTravelCity(updated, currentUser, activeTripId)
        return updated
      }),
    )
  }

  function removeDayTrip(cityId, tripId) {
    setTravelCities((current) =>
      current.map((item) => {
        if (item.id !== cityId) return item
        const updated = { ...item, dayTrips: (item.dayTrips || []).filter((t) => t.id !== tripId) }
        if (canSync) saveTravelCity(updated, currentUser, activeTripId)
        return updated
      }),
    )
  }

  async function suggestDayTrips(cityId) {
    const city = activeTravelCities.find((c) => c.id === cityId)
    if (!city || !canSync) return null
    try {
      const result = await suggestDayTripsWithAI({
        tripId: activeTripId,
        baseCity: city.city,
        baseCountry: city.country,
        groupProfile: currentTravelGroup,
        subgroups: normalizedTravelGroups.filter((p) => p.kind === 'subgroup'),
      })
      if (result?.suggestions?.length) {
        result.suggestions.forEach((trip) => addDayTrip(cityId, trip))
      }
      return result
    } catch (err) {
      console.error('suggestDayTrips error', err)
      return null
    }
  }

  async function assessPlan() {
    if (!canSync) return null
    try {
      const tripContext = {
        mainCity: primaryTripCity(activeTrip),
        mainStart: activeTrip?.startDate || '',
        mainEnd: activeTrip?.endDate || '',
        returnDate: activeTrip?.returnDate || '',
      }
      return await assessTripPlanWithAI({
        tripId: activeTripId,
        groupProfile: currentTravelGroup,
        subgroups: normalizedTravelGroups.filter((p) => p.kind === 'subgroup'),
        tripContext,
      })
    } catch (err) {
      console.error('assessPlan error', err)
      return null
    }
  }

  async function chatPlanner(message, history) {
    if (!canSync || !message.trim()) return null
    try {
      const tripContext = {
        mainCity: primaryTripCity(activeTrip),
        mainStart: activeTrip?.startDate || '',
        mainEnd: activeTrip?.endDate || '',
        returnDate: activeTrip?.returnDate || '',
      }
      return await chatWithPlannerAI({
        tripId: activeTripId,
        groupProfile: currentTravelGroup,
        subgroups: normalizedTravelGroups.filter((p) => p.kind === 'subgroup'),
        message,
        history,
        tripContext,
      })
    } catch (err) {
      console.error('chatPlanner error', err)
      return null
    }
  }

  // ─────────────────────────────────────────────────────────────────────────

  function prepareCityLodging(city) {
    selectCityFilter(city.city)
    setSearchDraft((current) => ({
      ...current,
      type: 'lodging',
      city: city.city,
      dates: city.dates || current.dates,
      notes: `${groupSummary(currentTravelGroup)}, hospedaje cómodo y bien conectado`,
    }))
    setDraft((current) => ({ ...current, category: 'lodging', city: city.city }))
    setActiveTab('lodging')
  }

  function prepareCityTransfer(city) {
    selectCityFilter(city.city)
    setSearchDraft((current) => ({
      ...current,
      type: 'transport',
      city: city.city,
      dates: city.dates || current.dates,
    }))
    setTransferDraft((current) => ({
      ...current,
      origin: 'Madrid',
      destination: city.city,
      date: city.dates || current.date,
      notes: `Comparar tren, bus y avión para ${groupSummary(currentTravelGroup)}`,
    }))
    setActiveTab('transport')
  }

  function openCityMap(cityName) {
    selectCityFilter(cityName)
    setActiveTab('lodging')
  }

  function datesForOptionCity(cityName) {
    if (activeTrip?.id === MADRID_F1_TRIP_ID && cityName === 'Madrid') return '10-14 sep 2026'
    if (activeTrip && cityName === primaryTripCity(activeTrip)) {
      return tripDatesForSearch(activeTrip) || searchDraft.dates || 'Fechas por definir'
    }
    const city = activeTravelCities.find((item) => item.city === cityName)
    return city?.dates || searchDraft.dates || tripDatesForSearch(activeTrip) || 'Fechas por definir'
  }

  async function createLodgingSearch(event) {
    event.preventDefault()
    if (activeSearchType === 'food' || activeSearchType === 'activities') {
      await findFoodPlaces(activeSearchType)
      return
    }
    if (activeSearchType === 'transport') {
      await createTransferSearch()
      return
    }

    if (canSync) {
      setPlaces([])
      setSearchResult({
        id: `search-${Date.now()}`,
        type: activeSearchType,
        city: searchDraft.city,
        status: 'working',
        notes: 'La IA está preparando búsquedas y criterios de comparación.',
        links: [],
      })

      try {
	        const result = await suggestLodgingWithAI({
	          tripId: activeTripId,
	          ...searchDraft,
          groupProfile: currentTravelGroup,
          subgroups: normalizedTravelGroups.filter((p) => p.kind === 'subgroup'),
        })
        setSearchResult(result)
        return
      } catch (error) {
        setSearchResult({
          id: `search-${Date.now()}`,
          type: 'lodging',
          city: searchDraft.city,
          status: 'error',
          notes: `${error.message}. Te dejo los enlaces base para continuar.`,
          links: platformSearchLinks(searchDraft, currentTravelGroup),
        })
      }
    }

    const request = {
      id: `search-${Date.now()}`,
      type: activeSearchType,
      city: searchDraft.city,
      dates: searchDraft.dates,
      notes: searchDraft.notes,
      status: 'pending',
      platforms:
        searchDraft.type === 'lodging'
          ? ['Booking', 'Airbnb', 'Google Travel']
          : ['Google Maps Places'],
    }

    setSearchResult({
      ...request,
      links: platformSearchLinks(searchDraft, currentTravelGroup),
    })

	    if (canSync) {
	      await saveSearchRequest(request, currentUser, activeTripId)
	    }
  }

  async function createTransferSearch() {
    setTransferBusy(true)
    setTransferResult({
      id: `transfer-${Date.now()}`,
      type: 'transport',
      status: 'working',
      notes: 'Preparando enlaces de Omio y criterios de comparación.',
      links: [],
    })

	    const payload = {
	      tripId: activeTripId,
	      ...transferDraft,
      groupProfile: currentTravelGroup,
      notes: transferDraft.notes,
    }

    try {
      const result = canSync
        ? await suggestTransferWithAI(payload)
        : {
            id: `transfer-${Date.now()}`,
            type: 'transport',
            status: 'ready',
            origin: transferDraft.origin,
            destination: transferDraft.destination,
            date: transferDraft.date,
            notes: 'Búsqueda de traslado preparada con enlaces Omio.',
            links: omioLinks(transferDraft),
            analysis: {
              summary: 'Compara tren, bus y avión en Omio y copia el precio visto si quieres fijarlo en presupuesto.',
              comparisonCriteria: ['Precio por persona', 'Duración total', 'Número de cambios', 'Equipaje incluido'],
            },
          }
      setTransferResult(result)
    } catch (error) {
      setTransferResult({
        id: `transfer-${Date.now()}`,
        type: 'transport',
        status: 'error',
        origin: transferDraft.origin,
        destination: transferDraft.destination,
        date: transferDraft.date,
        notes: `${error.message}. Te dejo enlaces directos a Omio.`,
        links: omioLinks(transferDraft),
      })
    } finally {
      setTransferBusy(false)
    }
  }

  async function addTransferOption() {
    const pricePerPerson = Number(transferDraft.pricePerPerson) || null
    const travelers =
      (Number(currentTravelGroup.adults) || 0) + (currentTravelGroup.childrenAges?.length || 0)
    const option = {
      id: `transport-${citySlug(transferDraft.origin)}-${citySlug(transferDraft.destination)}-${Date.now()}`,
      code: `T${options.filter((item) => item.category === 'transport').length + 1}`,
      category: 'transport',
      title: `${transferDraft.origin} → ${transferDraft.destination}`,
      source: 'Omio',
      city: `${transferDraft.origin} → ${transferDraft.destination}`,
      status: activeContributorIsAdult ? 'active' : 'pending',
      url: omioLinks(transferDraft)[0].url,
      image: '',
      priceNight: pricePerPerson,
      priceTotal: pricePerPerson ? pricePerPerson * travelers : null,
      budgetMode: 'perPerson',
      rating: 'Comparar en Omio',
      reviews: null,
      capacity: groupSummary(currentTravelGroup),
      transit: 'Tren, bus o avión',
      targetGroup: 'family',
      aiScore: pricePerPerson ? 78 : 66,
      map: { x: 58, y: 48 },
      coords: null,
      highlights: [
        `Salida: ${transferDraft.date}`,
        'Comparar duración, cambios, equipaje y hora de llegada',
        transferResult?.analysis?.summary || 'Búsqueda preparada en Omio',
      ],
      cautions: ['Copiar precio real desde Omio si cambia la tarifa'],
    }

    setOptions((current) => mergeOption(current, option))
    addOptionToBudget(option.id)
    setActiveTab('budget')

	    if (canSync) {
	      await saveTripOption(option, currentUser, activeTripId)
	    }
  }

  async function verifyAvailability(option) {
    if (!option.url) return

    if (!canSync) {
      setAiFeedback({
        tone: 'warning',
        title: 'Inicia sesión para verificar',
        detail: 'La verificación usa Cloud Functions y guarda el resultado para toda la familia.',
      })
      return
    }

    setAvailabilityBusyId(option.id)
    setAiFeedback({
      tone: 'working',
      title: 'Verificando disponibilidad',
      detail: `Estoy revisando ${option.title} con fechas y grupo actual.`,
    })

    try {
	      const availability = await verifyAvailabilityWithAI({
	        tripId: activeTripId,
	        optionId: option.id,
        title: option.title,
        url: option.url,
        city: option.city,
        dates: datesForOptionCity(option.city),
        groupProfile: currentTravelGroup,
      })

      setOptions((current) =>
        current.map((item) =>
          item.id === option.id ? { ...item, availability } : item,
        ),
      )
      setAiFeedback({
        tone: availability.status === 'unavailable' ? 'warning' : 'ready',
        title: availability.label || 'Disponibilidad revisada',
        detail: availability.summary || 'Resultado guardado en la tarjeta.',
      })
    } catch (error) {
      setAiFeedback({
        tone: 'warning',
        title: 'No pude verificar',
        detail: error.message,
      })
    } finally {
      setAvailabilityBusyId('')
    }
  }

  async function findFoodPlaces(type = activeSearchType) {
    const config = smartConfigForType(type)
    const city = searchDraft.city || primaryTripCity(activeTrip)
    const notes = searchDraft.type === type ? searchDraft.notes || config.notes : config.notes
    setPlacesBusy(true)
    setPlaces([])
    setPlacesPage(1)

    if (canSync) {
      try {
        const result = await suggestFoodWithAI({
          tripId: activeTripId,
          ...searchDraft,
          city,
          kind: config.label,
          notes,
          limit: placeSuggestionLimit,
          groupProfile: currentTravelGroup,
        })
        setPlaces(result.places || [])
        setSearchResult({
          id: result.id,
          type: config.id,
          city: result.city,
          status: 'ready',
          notes: result.analysis?.summary || `Sugerencias de ${config.label.toLowerCase()} obtenidas con IA y Google Places.`,
          links: [],
          analysis: result.analysis,
        })
        setPlacesBusy(false)
        return
      } catch (error) {
        setSearchResult({
          id: `places-${Date.now()}`,
          type: 'food',
          city: searchDraft.city,
          status: 'error',
          notes: `${error.message}. Intento con Maps del navegador.`,
          links: [],
        })
      }
    }

    try {
      const { libraries } = await loadGoogleMapsLibraries(['places'])
      const Place = libraries.places.Place
      const browserPlaces = await searchBrowserPlacesNew(
        Place,
        smartSuggestionQueries(config.label, notes, city),
        placeSuggestionLimit,
        { region: 'es' },
      )
      setPlacesBusy(false)
      if (!browserPlaces.length) {
        setSearchResult({
          id: `places-${Date.now()}`,
          type: 'food',
          city: searchDraft.city,
          status: 'error',
          notes: 'Google Places no encontró resultados.',
          links: [],
        })
        return
      }

      setPlaces(browserPlaces)
      setSearchResult({
        id: `places-${Date.now()}`,
        type: config.id,
        city: searchDraft.city,
        status: 'ready',
        notes: `Sugerencias de ${config.label.toLowerCase()} obtenidas con Google Maps Places (${browserPlaces.length}).`,
        links: [],
      })
    } catch (error) {
      setPlacesBusy(false)
      setSearchResult({
        id: `places-${Date.now()}`,
        type: 'food',
        city: searchDraft.city,
        status: 'error',
        notes: error.message,
        links: [],
      })
    }
  }

  async function findSmartSuggestions(type = smartSuggestionTypeForTab) {
    const config =
      smartSuggestionTypes.find((item) => item.id === type) || smartSuggestionTypes[0]
    const city = currentMapCity.city || searchDraft.city || 'Madrid'
    setSmartSuggestionType(config.id)
    setSmartSuggestionsPage(1)
    setSmartSuggestionsBusy(true)
    setSmartSuggestions({
      id: `smart-${Date.now()}`,
      city,
      type: config.id,
      status: 'working',
      places: [],
      analysis: {
        summary: `Buscando ${config.label.toLowerCase()} en Google Maps para ${city}.`,
      },
    })

    // Safety: always unblock after 25s regardless of what happens
    const safetyTimer = setTimeout(() => {
      setSmartSuggestionsBusy(false)
      setSmartSuggestions((prev) => prev?.status === 'working'
        ? { ...prev, status: 'error', analysis: { summary: 'La búsqueda tardó demasiado. Intenta de nuevo.' } }
        : prev
      )
    }, 25000)

    try {
      if (canSync) {
        try {
          const isLodging = config.id === 'lodging'
          const result = isLodging
            ? await suggestLodgingPlacesWithAI({
                tripId: activeTripId,
                city,
                dates: datesForOptionCity(city),
                limit: placeSuggestionLimit,
                groupProfile: currentTravelGroup,
                subgroups: normalizedTravelGroups.filter((p) => p.kind === 'subgroup'),
              })
            : await suggestFoodWithAI({
                tripId: activeTripId,
                city,
                dates: searchDraft.dates,
                kind: config.label,
                notes: config.notes,
                limit: placeSuggestionLimit,
                groupProfile: currentTravelGroup,
              })
          setSmartSuggestions({
            ...result,
            type: config.id,
            category: config.category,
            places: (result.places || []).slice(0, placeSuggestionLimit),
          })
          setSmartSuggestionsBusy(false)
          return
        } catch (error) {
          // Cloud Function failed — fall through to browser Maps
          setSmartSuggestions({
            id: `smart-${Date.now()}`,
            city,
            type: config.id,
            status: 'working',
            places: [],
            analysis: {
              summary: `Buscando en Google Maps del navegador para ${city}...`,
            },
          })
        }
      }

      const { libraries } = await loadGoogleMapsLibraries(['places'])
      const Place = libraries.places.Place
      const browserPlaces = await searchBrowserPlacesNew(
        Place,
        smartSuggestionQueries(config.label, config.notes, city),
        placeSuggestionLimit,
        city === 'Madrid' ? { region: 'es' } : {},
      )
      setSmartSuggestionsBusy(false)
      if (!browserPlaces.length) {
        setSmartSuggestions({
          id: `smart-${Date.now()}`,
          city,
          type: config.id,
          status: 'error',
          places: [],
          analysis: { summary: 'Google Places no encontró resultados.' },
        })
        return
      }
      setSmartSuggestions({
        id: `smart-${Date.now()}`,
        city,
        type: config.id,
        category: config.category,
        status: 'ready',
        places: browserPlaces,
        analysis: {
          summary: `Top ${browserPlaces.length} sugerencias de Google Maps para ${city}.`,
        },
      })
    } catch (error) {
      setSmartSuggestionsBusy(false)
      setSmartSuggestions({
        id: `smart-${Date.now()}`,
        city,
        type: config.id,
        status: 'error',
        places: [],
        analysis: { summary: error.message || 'Error al buscar sugerencias.' },
      })
    } finally {
      clearTimeout(safetyTimer)
    }
  }

  function openPlaceOptionModal(
    place,
    category = 'food',
    city = searchDraft.city || primaryTripCity(activeTrip),
    includeBudget = false,
  ) {
    setPlaceDraft({
      place,
      category,
      city,
      includeBudget,
      priceTotal: '',
      pricePerPerson: '',
      duration: '',
      reservationRequired: false,
      notes: '',
    })
  }

  function updatePlaceDraft(field, value) {
    setPlaceDraft((current) => current ? { ...current, [field]: value } : current)
  }

  async function confirmPlaceOption(event) {
    event.preventDefault()
    if (!placeDraft?.place) return
    await addPlaceOption(
      placeDraft.place,
      placeDraft.category,
      placeDraft.city,
      placeDraft.includeBudget,
      placeDraft,
    )
    setPlaceDraft(null)
  }

  async function addPlaceOption(
    place,
    category = 'food',
    cityOverride = searchDraft.city || 'Madrid',
    includeBudget = false,
    extra = {},
  ) {
    const name = getPlaceName(place)
    const placeId = getPlaceId(place)
    const placeSlug = citySlug(placeId).slice(0, 56) || Date.now()
    const address = getPlaceAddress(place)
    const location = getPlaceLocation(place)
    const reviews = getPlaceReviews(place)
    const photo = getPlacePhoto(place)
    const photoCredit = getPlacePhotoCredit(place)
    const priceTotal = Number(extra.priceTotal) || null
    const pricePerPerson = Number(extra.pricePerPerson) || null
    const duration = String(extra.duration || '').trim()
    const notes = String(extra.notes || '').trim()
    const reservationRequired = Boolean(extra.reservationRequired)
    const categoryCount = options.filter((option) => option.category === category).length + 1
    const visualIndex = options.length % 8
    const isFood = category === 'food'
    const option = {
      id: `${category}-${placeSlug}`,
      code: `${isFood ? 'C' : 'P'}${categoryCount}`,
      category,
      title: name,
      source: 'Google Maps',
      city: cityOverride,
      status: activeContributorIsAdult ? 'active' : 'pending',
      url: getPlaceUrl(place),
      image: photo,
      imageCredit: photoCredit,
      priceNight: pricePerPerson,
      priceTotal,
      ...(pricePerPerson && !priceTotal ? { budgetMode: 'perPerson' } : {}),
      rating: place.rating ? `${place.rating}/5` : 'Sin rating',
      reviews: reviews || null,
      capacity: isFood ? 'Por validar reserva para grupo' : 'Plan familiar por validar',
      transit: 'Ruta por calcular',
      targetGroup: 'family',
      aiScore: place.score || Math.min(92, Math.round((place.rating || 4) * 18)),
      map: {
        x: 42 + (visualIndex % 4) * 8,
        y: 44 + Math.floor(visualIndex / 4) * 10,
      },
      coords: location,
      highlights: [
        address || 'Dirección pendiente',
        place.rating ? `${place.rating}/5 en Google Maps · ${reviews || 0} reseñas` : 'Sugerido con Google Maps Places',
        place.why || 'Recomendado por IA para revisar en familia',
        duration ? `Duración/horario: ${duration}` : '',
        notes,
      ].filter(Boolean),
      cautions: [
        reservationRequired
          ? 'Reservar antes de ir y confirmar condiciones del grupo'
          : place.caution ||
            (isFood
              ? 'Verificar reserva, precio y comodidad para niños'
              : 'Verificar horarios, entradas y ritmo para el grupo'),
      ].filter(Boolean),
      reservationRequired,
      duration,
    }

    setOptions((current) => mergeOption(current, option))
    selectCityFilter(cityOverride)
    if (includeBudget) {
      addOptionToBudget(option.id)
      setActiveTab('budget')
    } else {
      setActiveTab(category)
    }

	    if (canSync) {
	      await saveTripOption(option, currentUser, activeTripId)
	    }
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
	      saveOptionVotes(optionId, nextVotes, currentUser, activeTripId).catch((error) => {
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
    if (budgetOptionIds.includes(optionId)) {
      removeOptionFromBudget(optionId)
    }
	    if (canSync) {
	      updateTripOptionStatus(optionId, 'removed', currentUser, activeTripId).catch((error) => {
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
	      updateTripOptionStatus(optionId, 'active', currentUser, activeTripId).catch((error) => {
        setSyncStatus({
          label: 'Cambio local',
          detail: error.message,
          online: false,
        })
      })
    }
  }

  async function generateSmartItinerary() {
    const itinerarySubgroups = normalizedTravelGroups
      .filter(isPlanningGroup)
      .map((profile) => itinerarySubgroupPayload(profile, options, budgetNights, f1Crew.length))

    if (!canSync) {
      const fallbackDays = generateFallbackItinerary(activeTrip, activeTravelCities, normalizedTravelGroups)
      const formattedFallbackDays = fallbackDays.map((day) => ({
        ...day,
        subgroupPlans: itinerarySubgroups
          .filter((group) => {
            if (!group.date) return false
            try {
              const gDate = new Date(`${group.date}T00:00:00Z`)
              return formatItineraryDayLabel(gDate) === day.date
            } catch {
              return false
            }
          })
          .map((group) => ({
            groupId: group.id,
            groupName: group.name,
            timeWindow: [group.startTime, group.endTime].filter(Boolean).join('-'),
            plan: group.focus || 'Plan paralelo por concretar',
            budgetNote: group.budgetOptions.length
              ? `${group.budgetOptions.length} partidas en subpresupuesto`
              : 'Sin subpresupuesto todavía',
          })),
      }))

      const newItinerary = {
        title: 'Itinerario base',
        summary: 'Inicia sesión con Firebase activo para generar itinerarios con IA o edítalo a continuación.',
        subgroups: itinerarySubgroups,
        days: formattedFallbackDays,
        openQuestions: ['Conectar IA para recalcular con opciones actuales'],
      }
      setGeneratedItinerary(newItinerary)
      try {
        window.localStorage.setItem(`custom_itinerary_${activeTripId}`, JSON.stringify(newItinerary))
      } catch (e) {
        console.error('Error saving offline itinerary:', e)
      }
      return
    }

    setItineraryBusy(true)
    try {
      const fullTripDates = tripDatesForSearch(activeTrip)
      // Build city schedule from activeTravelCities so AI can assign each day to the right city
      const citySchedule = activeTravelCities
        .filter((c) => c.status !== 'removed')
        .map((c) => ({
          city: c.city,
          dates: c.dates || '',
          notes: c.notes || '',
          isBase: c.isBase || false,
        }))
      // Fallback city for single-city trips or when no cities are configured
      const primaryCity =
        citySchedule.length === 1
          ? citySchedule[0].city
          : effectiveSelectedCity !== 'Todas'
          ? effectiveSelectedCity
          : 'Madrid'
      const result = await generateItineraryWithAI({
        tripId: activeTripId,
        city: primaryCity,
        dates: fullTripDates || searchDraft.dates,
        tripTotalDates: fullTripDates,
        citySchedule,
        routeMode,
        groupProfile: currentTravelGroup,
        subgroups: itinerarySubgroups,
      })
      setGeneratedItinerary(result)
      try {
        window.localStorage.setItem(`custom_itinerary_${activeTripId}`, JSON.stringify(result))
      } catch (e) {
        console.error('Error saving AI itinerary:', e)
      }
      setActiveTab('itinerary')
    } catch (error) {
      const fallbackDays = generateFallbackItinerary(activeTrip, activeTravelCities, normalizedTravelGroups)
      const formattedFallbackDays = fallbackDays.map((day) => ({
        ...day,
        subgroupPlans: itinerarySubgroups
          .filter((group) => {
            if (!group.date) return false
            try {
              const gDate = new Date(`${group.date}T00:00:00Z`)
              return formatItineraryDayLabel(gDate) === day.date
            } catch {
              return false
            }
          })
          .map((group) => ({
            groupId: group.id,
            groupName: group.name,
            timeWindow: [group.startTime, group.endTime].filter(Boolean).join('-'),
            plan: group.focus || 'Plan paralelo por concretar',
            budgetNote: group.budgetOptions.length
              ? `${group.budgetOptions.length} partidas en subpresupuesto`
              : 'Sin subpresupuesto todavía',
          })),
      }))

      const errorItinerary = {
        title: 'Itinerario pendiente',
        summary: error.message,
        days: formattedFallbackDays,
        openQuestions: ['Reintentar cuando Functions/Vertex AI esté disponible'],
      }
      setGeneratedItinerary(errorItinerary)
      try {
        window.localStorage.setItem(`custom_itinerary_${activeTripId}`, JSON.stringify(errorItinerary))
      } catch (e) {
        console.error('Error saving error itinerary:', e)
      }
    } finally {
      setItineraryBusy(false)
    }
  }

  const handleUpdateItineraryDay = (dayIndex, patch) => {
    if (!activeTripId) return

    const currentDays = generatedItinerary?.days?.length
      ? [...generatedItinerary.days]
      : generateFallbackItinerary(activeTrip, activeTravelCities, normalizedTravelGroups)

    if (dayIndex >= 0 && dayIndex < currentDays.length) {
      currentDays[dayIndex] = {
        ...currentDays[dayIndex],
        ...patch,
      }
    }

    const newItinerary = {
      ...generatedItinerary,
      title: generatedItinerary?.title || `${currentDays.length} días, varios planes en paralelo`,
      days: currentDays,
    }

    setGeneratedItinerary(newItinerary)
    try {
      window.localStorage.setItem(`custom_itinerary_${activeTripId}`, JSON.stringify(newItinerary))
    } catch (e) {
      console.error('Error saving itinerary to localStorage:', e)
    }
  }

  if (!authReady) {
    return (
      <LoadingScreen
        title="Preparando el viaje familiar"
        detail="Estamos conectando Firebase y la app del viaje."
      />
    )
  }

  if (!currentUser && !previewMode) {
    return (
      <LoginScreen
        canLogin={isFirebaseConfigured}
        firebaseStatus={firebaseStatus}
        onSignIn={handleSignIn}
      />
    )
  }

  // Phase 1: while we're loading the user's trips, show a splash
  if (currentUser && tripsLoading) {
    return (
      <LoadingScreen
        title="Cargando tus viajes"
        detail="Un momento mientras sincronizamos tus planes."
      />
    )
  }

  // Phase 1: dashboard when no trip is selected (or when there is a pending join)
  if (currentUser && (!activeTrip || pendingJoinCode)) {
    return (
      <Suspense
        fallback={(
          <LoadingScreen
            title="Cargando tus viajes"
            detail="Preparando el panel de viajes."
          />
        )}
      >
        <TripDashboard
          currentUser={currentUser}
          userTrips={userTrips}
          tripsLoading={tripsLoading}
          onEnterTrip={handleEnterTrip}
          onDeleteTrip={handleDeleteTrip}
          onSignOut={handleSignOut}
        />
        {pendingJoinCode && (
          <JoinTripModal
            joinCode={pendingJoinCode}
            currentUser={currentUser}
            onJoined={handleEnterTrip}
            onDismiss={handleDismissJoinModal}
          />
        )}
      </Suspense>
    )
  }

  // sidebar helpers
  const sidebarTravelers = (Number(currentTravelGroup.adults) || 0) + (currentTravelGroup.childrenAges?.length || 0) || currentTravelGroup.totalTravelers || familyMembers.length
  const sidebarSubgroups = normalizedTravelGroups.filter((g) => g.kind === 'subgroup')
  const sidebarNavItems = [
    { id: 'overview', label: 'Resumen', icon: Home },
    { id: 'lodging', label: 'Hospedajes', icon: Hotel },
    { id: 'food', label: 'Comida', icon: Utensils },
    { id: 'activities', label: 'Planes', icon: Landmark },
    { id: 'transport', label: 'Transporte', icon: TrainFront },
    { id: 'itinerary', label: 'Itinerario', icon: Route },
    { id: 'budget', label: 'Presupuesto', icon: CircleDollarSign },
    { id: 'cities', label: 'Ciudades', icon: MapPinned },
  ]

  return (
    <main className="app-shell">

      {/* ── LEFT SIDEBAR ──────────────────────────────────────────── */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`left-sidebar${sidebarOpen ? ' open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-mark">{activeTrip?.emoji || '✈️'}</div>
          <div className="sidebar-header-text">
            <span className="sidebar-trip-name">{activeTrip ? activeTrip.name : 'Viaje Familia'}</span>
            <span className="sidebar-trip-meta">
              SEPT 2026 · {sidebarTravelers} PERSONAS
            </span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegación principal">
          {sidebarNavItems.map(({ id, label, icon: Icon }) => {
            const count = ['lodging', 'food', 'activities', 'transport'].includes(id)
              ? options.filter((o) => o.category === id && o.status !== 'removed').length
              : 0
            return (
              <button
                key={id}
                className={`sidebar-nav-item ${activeTab === id ? 'active' : ''}`}
                onClick={() => { switchTab(id); setSidebarOpen(false) }}
                type="button"
              >
                <Icon size={16} aria-hidden="true" />
                <span>{label}</span>
                {count > 0 && <span className="sidebar-nav-count">{count}</span>}
              </button>
            )
          })}
          <button
            className="sidebar-nav-item sidebar-ai-item"
            onClick={() => {
              setShowTopbarChat(true)
              setSidebarOpen(false)
            }}
            type="button"
          >
            <Sparkles size={16} aria-hidden="true" />
            <span>IA sugiere</span>
          </button>
        </nav>

        {sidebarSubgroups.length > 0 && (
          <div className="sidebar-subgroups">
            <div className="sidebar-section-head">
              <span>SUBGRUPOS</span>
            </div>
            {sidebarSubgroups.map((g, i) => (
              <button
                key={g.id}
                className={`sidebar-subgroup-item ${activeTravelGroupId === g.id ? 'active' : ''}`}
                onClick={() => setActiveTravelGroupId(g.id)}
                type="button"
              >
                <span
                  className="sidebar-subgroup-dot"
                  style={{ background: GANTT_COLORS[i % GANTT_COLORS.length].border }}
                />
                <span className="sidebar-subgroup-name">{g.name}</span>
                <span className="sidebar-subgroup-count">
                  {g.memberIds?.length || g.totalTravelers || ''}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="sidebar-footer">
          <div
            className={`sidebar-sync-dot ${displayedSyncStatus.online ? 'online' : ''}`}
            title={displayedSyncStatus.label}
          />
          {currentUser && (
            <button className="sidebar-footer-btn" onClick={handleBackToDashboard} type="button">
              <ChevronLeft size={13} />
              Mis viajes
            </button>
          )}
          {currentUser ? (
            <button className="sidebar-footer-btn" onClick={handleSignOut} type="button">
              <LogOut size={13} />
              Salir
            </button>
          ) : (
            <button
              className="sidebar-footer-btn primary"
              disabled={!authReady || !isFirebaseConfigured}
              onClick={handleSignIn}
              type="button"
            >
              {authReady ? <LogIn size={13} /> : <Loader2 size={13} />}
              Entrar
            </button>
          )}
        </div>
      </aside>

      {/* ── APP MAIN ──────────────────────────────────────────────── */}
      <div className="app-main">

        {/* AI BUSY BAR — sticky indicator visible regardless of scroll */}
        {smartSuggestionsBusy && (
          <div className="ai-busy-bar" role="status" aria-live="polite">
            <Loader2 size={13} className="ai-busy-spinner" aria-hidden="true" />
            <span>La IA está buscando sugerencias…</span>
          </div>
        )}

        {/* TOPBAR V2 */}
        <header className="topbar-v2">
          <button
            className="topbar-hamburger"
            onClick={() => setSidebarOpen((v) => !v)}
            type="button"
            aria-label="Abrir menú"
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          {/* Mobile-only: active tab label */}
          <span className="topbar-mobile-tab-label">
            {sidebarNavItems.find((n) => n.id === activeTab)?.label || activeTrip?.name || 'Viaje'}
          </span>
          <div className="topbar-city-tabs">
            {cityFilters.map((city) => {
              const cityCount = city !== 'Todas'
                ? options.filter((o) => (o.city || '').toLowerCase() === city.toLowerCase() && o.status !== 'removed').length
                : 0
              return (
                <button
                  key={city}
                  className={`city-tab-pill ${effectiveSelectedCity === city ? 'active' : ''}`}
                  onClick={() => setSelectedCity(city)}
                  type="button"
                >
                  {city}
                  {cityCount > 0 && <span className="city-tab-count">{cityCount}</span>}
                </button>
              )
            })}
            <button
              className="city-tab-add"
              onClick={() => switchTab('cities')}
              type="button"
              title="Gestionar ciudades"
            >
              <Plus size={11} aria-hidden="true" />
              ciudad
            </button>
          </div>

          <button
            className="topbar-ai-input"
            onClick={() => setShowTopbarChat(true)}
            type="button"
          >
            <Sparkles size={13} aria-hidden="true" />
            <span className="topbar-ai-placeholder">Pregúntale al planificador...</span>
            <kbd>⌘K</kbd>
          </button>

          <div className="topbar-v2-right">
            <div className="topbar-member-avatars">
              {familyMembers.slice(0, 4).map((m) => (
                <button
                  key={m.id}
                  className={`member-avatar-pill ${activeMember === m.id ? 'active' : ''}`}
                  onClick={() => setActiveMember(m.id)}
                  title={m.name}
                  type="button"
                >
                  {m.name.charAt(0)}
                </button>
              ))}
              {familyMembers.length > 4 && (
                <span className="member-avatar-overflow">+{familyMembers.length - 4}</span>
              )}
            </div>
            <label className="topbar-group-select" title={groupSummary(currentTravelGroup)}>
              <Heart size={12} aria-hidden="true" />
              <select
                onChange={(e) => setActiveTravelGroupId(e.target.value)}
                value={currentTravelGroup.id}
              >
                {normalizedTravelGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>
          </div>
        </header>

        {/* TOPBAR AI CHAT OVERLAY */}
        {showTopbarChat && (
          <div
            className="topbar-chat-overlay"
            onClick={(e) => { if (e.target === e.currentTarget) setShowTopbarChat(false) }}
            role="dialog"
            aria-modal="true"
            aria-label="Chat con planificador IA"
          >
            <div className="topbar-chat-panel">
              <div className="topbar-chat-head">
                <Sparkles size={15} />
                <span>Planificador IA</span>
                <button
                  className="topbar-chat-close"
                  onClick={() => setShowTopbarChat(false)}
                  type="button"
                >
                  <X size={15} />
                </button>
              </div>
              <div className="topbar-chat-messages">
                {topbarChatHistory.length === 0 && (
                  <div className="topbar-chat-welcome-container">
                    <p className="topbar-chat-empty">Pregúntame sobre fechas, presupuesto, lugares o cualquier duda del viaje.</p>
                    <div className="chat-quick-suggestions">
                      <button
                        className="chat-suggest-btn"
                        onClick={handleQuickGPSNearby}
                        disabled={topbarChatBusy || gpsLoading}
                        type="button"
                      >
                        {gpsLoading ? <Loader2 size={16} className="spin text-violet" /> : <MapPin size={16} className="text-violet" />}
                        <div className="chat-suggest-text">
                          <span className="chat-suggest-title">Buscar sitios cerca</span>
                          <span className="chat-suggest-desc">Usa tu GPS actual para buscar atracciones o comida</span>
                        </div>
                      </button>
                      
                      <button
                        className="chat-suggest-btn"
                        onClick={handleQuickGPSRoute}
                        disabled={topbarChatBusy || gpsLoading}
                        type="button"
                      >
                        <Navigation size={16} className="text-violet" />
                        <div className="chat-suggest-text">
                          <span className="chat-suggest-title">Ruta a IFEMA / Madrid</span>
                          <span className="chat-suggest-desc">Cómo llegar desde tu ubicación GPS viva</span>
                        </div>
                      </button>
                      
                      <button
                        className="chat-suggest-btn"
                        onClick={handleQuickSuggest50Restaurants}
                        disabled={topbarChatBusy || gpsLoading}
                        type="button"
                      >
                        <Utensils size={16} className="text-emerald" />
                        <div className="chat-suggest-text">
                          <span className="chat-suggest-title">50 Sitios para Comer</span>
                          <span className="chat-suggest-desc">Sugerir al menos 50 excelentes restaurantes por zona</span>
                        </div>
                      </button>
                      
                      <button
                        className="chat-suggest-btn"
                        onClick={handleQuickSuggest50Hotels}
                        disabled={topbarChatBusy || gpsLoading}
                        type="button"
                      >
                        <Hotel size={16} className="text-emerald" />
                        <div className="chat-suggest-text">
                          <span className="chat-suggest-title">50 Hoteles y Villas</span>
                          <span className="chat-suggest-desc">Sugerir al menos 50 hospedajes para toda la familia</span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
                {topbarChatHistory.map((msg, i) => (
                  <div key={i} className={`topbar-chat-msg ${msg.role}`}>
                    <p>{msg.content}</p>
                  </div>
                ))}
                {topbarChatBusy && (
                  <div className="topbar-chat-msg assistant">
                    <Loader2 size={14} className="spin" />
                  </div>
                )}
                <div ref={topbarChatEndRef} />
              </div>
              <form className="topbar-chat-input-row" onSubmit={handleTopbarChat}>
                <input
                  autoFocus
                  disabled={topbarChatBusy || !canSync}
                  onChange={(e) => setTopbarChatInput(e.target.value)}
                  placeholder={canSync ? '¿Qué quieres planificar?' : 'Inicia sesión para chatear'}
                  value={topbarChatInput}
                />
                <button
                  type="submit"
                  disabled={topbarChatBusy || !topbarChatInput.trim() || !canSync}
                >
                  <ChevronRight size={16} />
                </button>
              </form>
            </div>
          </div>
        )}

        {/* WORKSPACE */}
        <div className="workspace-v2">
          <section className="main-panel">
          <div className="trip-status-bar" aria-label="Estado del viaje">
            <div className="trip-countdown">
              <strong>{daysUntilTrip}</strong>
              <p>días para el viaje</p>
            </div>
            <div className="trip-stat-chips">
              {['lodging', 'activities', 'food', 'transport'].map((cat) => {
                const count = options.filter((o) => o.category === cat && o.status !== 'removed').length
                const Icon = tabs.find((t) => t.id === cat)?.icon
                const label = categoryConfig[cat]?.label || cat
                return count > 0 ? (
            <button
                    className={`trip-stat-chip ${activeTab === cat ? 'active' : ''}`}
                    key={cat}
                    onClick={() => switchTab(cat)}
                    type="button"
                  >
                    {Icon ? <Icon size={13} aria-hidden="true" /> : null}
                    {count} {label.toLowerCase()}
                  </button>
                ) : null
              })}
            </div>
            {budgetTotalPerPerson ? (
              <button
                className="trip-budget-chip"
                onClick={() => setActiveTab('budget')}
                title="Ver presupuesto detallado"
                type="button"
              >
                <CircleDollarSign size={13} aria-hidden="true" />
                ~{currency(budgetTotalPerPerson)}/persona estimado
              </button>
            ) : (
              <button
                className="trip-budget-chip empty"
                onClick={() => setActiveTab('budget')}
                title="Agrega opciones al presupuesto"
                type="button"
              >
                <CircleDollarSign size={13} aria-hidden="true" />
                Sin presupuesto estimado
              </button>
            )}
            <span className="trip-contributor-badge">
              {memberName(activeMember)} · {activeContributorIsAdult ? 'agrega directo' : 'requiere revisión'}
            </span>
          </div>

          <FrontendUpdatePanel
            activeMember={activeMember}
            budgetOptionIds={budgetOptionIds}
            currentTravelGroup={currentTravelGroup}
            onAddOption={() => setShowAddModal(true)}
            onOpenDecision={switchTab}
            onPasteLink={pasteExternalLinkFromClipboard}
            onVote={toggleVote}
            options={options}
            votes={votes}
          />

          {activeTab !== 'cities' ? (
            <div className="controls-row">
              <div className="city-filter-row">
                <div className="city-filter" aria-label="Cambiar ciudad activa">
                  {cityFilters.map((city) => (
                    <CityFilterChip
                      active={effectiveSelectedCity === city}
                      city={city}
	                      key={city}
	                      onRemove={removeCityByName}
	                      onSelect={selectCityFilter}
	                      removable={city !== 'Todas' && city !== 'Madrid' && city !== primaryTripCity(activeTrip)}
	                    />
                  ))}
                  <button
                    className="city-add-tab-hint"
                    onClick={() => setActiveTab('cities')}
                    type="button"
                    title="Gestionar ciudades candidatas"
                  >
                    <Plus size={13} aria-hidden="true" />
                    Ciudad
                  </button>
                </div>
              </div>
              <button
                className={`ghost-button icon-only ${showRemoved ? 'active' : ''}`}
                onClick={() => setShowRemoved((value) => !value)}
                title={showRemoved ? 'Ocultar opciones retiradas' : 'Ver opciones retiradas'}
                type="button"
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>
          ) : null}

          {['activities', 'food', 'lodging'].includes(activeTab) ? (
            <SmartSuggestionsBanner
              activeCity={currentMapCity.city}
              availableTypes={[smartConfigForType(smartSuggestionTypeForTab)]}
              busy={smartSuggestionsBusy}
              currentType={smartSuggestionTypeForTab}
              onAddToBudget={(place, category, city) =>
                openPlaceOptionModal(place, category, city, true)
              }
              onAddToMap={(place, category, city) =>
                openPlaceOptionModal(place, category, city, false)
              }
              onChangeType={setSmartSuggestionType}
              onPageChange={setSmartSuggestionsPage}
              onRefresh={findSmartSuggestions}
              page={smartSuggestionsPage}
              result={smartSuggestions}
            />
          ) : null}

          {activeTab === 'overview' ? (
            <TripOverviewPanel
              activeTrip={activeTrip}
              cities={activeTravelCities}
              options={options}
              familyMembers={familyMembers}
              currentTravelGroup={currentTravelGroup}
              budgetNights={budgetNights}
              budgetOptionIds={budgetOptionIds}
              votes={votes}
              onGoTo={switchTab}
            />
          ) : activeTab === 'budget' ? (
            <BudgetPanel
              allOptions={options}
              budgetOptions={budgetOptions}
              currentTravelGroup={currentTravelGroup}
              f1Count={f1Crew.length}
              nights={budgetNights}
              onRemove={toggleBudgetOption}
              onToggleSubgroupBudget={toggleSubgroupBudgetOption}
              subgroupBudgetOptions={subgroupBudgetOptions}
              votes={votes}
              onAdd={addOptionToBudget}
              onRemoveOption={removeOptionFromBudget}
            />
          ) : activeTab === 'itinerary' ? (
            <ItineraryPanel
              activeTrip={activeTrip}
              activeTravelCities={activeTravelCities}
              availableOptions={options}
              busy={itineraryBusy}
              currentTravelGroup={currentTravelGroup}
              f1Count={f1Crew.length}
              nights={budgetNights}
              onCreateSubgroup={createSubgroup}
              onDeleteGroup={deleteTravelGroup}
              onGenerate={generateSmartItinerary}
              onToggleDraftMember={toggleSubgroupDraftMember}
              onUpdateDraft={updateSubgroupDraft}
              onUpdateGroup={updateTravelGroup}
              onUpdateDay={handleUpdateItineraryDay}
              plan={generatedItinerary}
              subgroupDraft={subgroupDraft}
              travelGroups={normalizedTravelGroups}
            />
          ) : activeTab === 'transport' ? (
            <TransportPanel
              activeCategory={activeCategory}
              activeMember={activeMember}
              budgetOptionIds={budgetOptionIds}
              busy={transferBusy}
              onAddToBudget={addTransferOption}
              onRemove={removeOption}
              onRestore={restoreOption}
              onSearch={createTransferSearch}
              onToggleBudget={toggleBudgetOption}
              onUpdateDraft={updateTransferDraft}
              onVote={toggleVote}
              options={visibleOptions}
              result={transferResult}
              transferDraft={transferDraft}
              votes={votes}
            />
          ) : activeTab === 'cities' ? (
            <NextCitiesPanel
              activeCity={effectiveSelectedCity}
              addCity={addCity}
              canSync={canSync}
              cities={activeTravelCities}
              cityDraft={cityDraft}
              citySuggestionNames={citySuggestionNames}
              currentTravelGroup={currentTravelGroup}
              onAutoFill={autoFillCityDates}
              onAddDayTrip={addDayTrip}
              onPrepareLodging={prepareCityLodging}
              onPrepareTransfer={prepareCityTransfer}
              onRemoveCity={removeCity}
              onRemoveDayTrip={removeDayTrip}
              onOpenMap={openCityMap}
              onAssessPlan={assessPlan}
              onChatPlanner={chatPlanner}
              onSuggestDayTrips={suggestDayTrips}
              onToggleBase={toggleCityBase}
              onUpdateCity={updateCity}
              updateCityDraft={updateCityDraft}
            />
          ) : (
	            <OptionGrid
	              activeCategory={activeCategory}
	              activeMember={activeMember}
	              activeTripId={activeTripId}
	              availabilityBusyId={availabilityBusyId}
              canSync={canSync}
              currentTravelGroup={currentTravelGroup}
              onRemove={removeOption}
              onRestore={restoreOption}
              onToggleBudget={toggleBudgetOption}
              onVerifyAvailability={verifyAvailability}
              onVote={toggleVote}
              onUpdateOption={(updated) => setOptions((cur) => mergeOption(cur, updated))}
              options={visibleOptions}
              budgetOptionIds={budgetOptionIds}
              nights={budgetNights}
              subgroups={normalizedTravelGroups.filter((p) => p.kind === 'subgroup')}
              votes={votes}
            />
          )}

          {/* ── MAP (inline, scrollable) ───────────────────────── */}
          {showOptionWorkspace && (
            <section className="decision-map-grid decision-map-inline">
              <Suspense fallback={<div className="map-loading">Cargando mapa...</div>}>
                <MapPanel
                  budgetOptionIds={budgetOptionIds}
                  city={currentMapCity.city}
                  destinationCoords={currentMapCity.coords}
                  onRouteModeChange={setRouteMode}
                  options={mapOptions}
                  routeMode={routeMode}
                  votes={votes}
                />
              </Suspense>
            </section>
          )}
        </section>

        {/* ── RIGHT RAIL ─────────────────────────────────────────── */}
        {showOptionWorkspace && (
          <aside className="right-rail">
            {['lodging', 'activities', 'food'].includes(activeTab) && smartSuggestions?.places?.length > 0 && (
              <div className="rail-section">
                <p className="eyebrow rail-eyebrow">
                  ✦ IA SUGIERE PARA {(effectiveSelectedCity === 'Todas' ? 'MADRID' : effectiveSelectedCity).toUpperCase()}
                </p>
                {smartSuggestions.places.slice(0, 1).map((place) => (
                  <div key={place.id || getPlaceName(place)} className="rail-ai-card">
                    {getPlacePhoto(place) && (
                      <img
                        src={getPlacePhoto(place)}
                        alt={getPlaceName(place)}
                        className="rail-ai-photo"
                        loading="lazy"
                      />
                    )}
                    {place.aiScore != null && <span className="rail-ai-score">AI {typeof place.aiScore === 'number' ? place.aiScore : (place.aiScore?.v ?? '')}</span>}
                    <strong className="rail-ai-name">{getPlaceName(place)}</strong>
                    {place.why && <p className="rail-ai-why">{place.why}</p>}
                    {place.scoreBreakdown && (
                      <div className="rail-score-rows">
                        {(Array.isArray(place.scoreBreakdown)
                          ? place.scoreBreakdown
                          : Object.entries(place.scoreBreakdown).map(([k, val]) => ({
                              label: k.charAt(0).toUpperCase() + k.slice(1),
                              v: typeof val === 'number' ? val : (val?.v ?? 0),
                              max: val?.max ?? 10,
                            }))
                        ).slice(0, 4).map((b) => (
                          <div key={b.label} className="rail-score-row">
                            <span className="rail-score-label">{b.label}</span>
                            <div className="rail-score-bar-track">
                              <div
                                className="rail-score-bar-fill"
                                style={{ width: `${(b.v / (b.max || 10)) * 100}%` }}
                              />
                            </div>
                            <span className="rail-score-val">{b.v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button
                      className="rail-add-btn"
                      onClick={() => openPlaceOptionModal(place, activeCategory, effectiveSelectedCity, true)}
                      type="button"
                    >
                      <Plus size={12} />
                      Añadir a opciones
                    </button>
                  </div>
                ))}
              </div>
            )}

            {['lodging', 'activities', 'food'].includes(activeTab) && (
              <div className="rail-section rail-platforms">
                <p className="rail-section-title">Plataformas</p>
                {[
                  {
                    name: 'Booking',
                    url: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(effectiveSelectedCity === 'Todas' ? 'Madrid' : effectiveSelectedCity)}`,
                  },
                  {
                    name: 'Airbnb',
                    url: `https://www.airbnb.com/s/${encodeURIComponent(effectiveSelectedCity === 'Todas' ? 'Madrid' : effectiveSelectedCity)}`,
                  },
                  {
                    name: 'Google Travel',
                    url: `https://www.google.com/travel/search?q=${encodeURIComponent(effectiveSelectedCity === 'Todas' ? 'Madrid' : effectiveSelectedCity)}`,
                  },
                  {
                    name: 'Tripadvisor',
                    url: `https://www.tripadvisor.com/Search?q=${encodeURIComponent(effectiveSelectedCity === 'Todas' ? 'Madrid' : effectiveSelectedCity)}`,
                  },
                ].map((p) => (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rail-platform-link"
                  >
                    {p.name}
                    <ExternalLink size={11} />
                  </a>
                ))}
              </div>
            )}
          </aside>
        )}
      </div>
      {/* end workspace-v2 */}

      {showOptionWorkspace ? (
        <button
          className="fab-add"
          onClick={() => setShowAddModal(true)}
          type="button"
          aria-label="Agregar nueva sugerencia"
        >
          <Plus size={20} aria-hidden="true" />
          Agregar
        </button>
      ) : null}

      {showAddModal ? (
        <div
          className="add-modal-overlay"
          onClick={(event) => { if (event.target === event.currentTarget) setShowAddModal(false) }}
          role="dialog"
          aria-modal="true"
          aria-label="Nueva sugerencia"
        >
          <section className="add-modal">
            <div className="add-modal-header">
              <div>
                <p className="eyebrow">Nueva sugerencia</p>
                <h2>Agregar opción al viaje</h2>
              </div>
              <button
                className="add-modal-close"
                onClick={() => setShowAddModal(false)}
                type="button"
                aria-label="Cerrar"
              >
                ✕
              </button>
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
                  {cityFilters.filter((city) => city !== 'Todas').map((city) => (
                    <option key={city}>{city}</option>
                  ))}
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
              <label>
                <span>Precio total visto</span>
                <input
                  min="0"
                  onChange={(event) => updateDraft('priceTotal', event.target.value)}
                  placeholder="Ej. 1781"
                  type="number"
                  value={draft.priceTotal}
                />
              </label>
              <label>
                <span>Precio/noche o persona</span>
                <input
                  min="0"
                  onChange={(event) => updateDraft('priceNight', event.target.value)}
                  placeholder="Ej. 445"
                  type="number"
                  value={draft.priceNight}
                />
              </label>
              <label className="wide">
                <span>Notas</span>
                <textarea
                  onChange={(event) => updateDraft('notes', event.target.value)}
                  placeholder="Por qué puede servir, restricciones, precio visto, dudas..."
                  value={draft.notes}
                />
              </label>
              <button className="primary-button" disabled={aiBusy} type="submit">
                {aiBusy ? (
                  <Loader2 size={18} aria-hidden="true" />
                ) : (
                  <Sparkles size={18} aria-hidden="true" />
                )}
                {canSync ? 'Analizar y agregar' : 'Agregar opción'}
              </button>
            </form>

            {aiFeedback ? (
              <div className={`ai-feedback ${aiFeedback.tone}`}>
                <Sparkles size={18} aria-hidden="true" />
                <div>
                  <strong>{aiFeedback.title}</strong>
                  <p>{aiFeedback.detail}</p>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      ) : null}

      {placeDraft ? (
        <Suspense fallback={null}>
          <PlaceSuggestionModal
            categoryLabel={categoryConfig[placeDraft.category]?.shortLabel || 'Opción'}
            draft={placeDraft}
            onClose={() => setPlaceDraft(null)}
            onSubmit={confirmPlaceOption}
            onUpdate={updatePlaceDraft}
            placeName={getPlaceName(placeDraft.place)}
          />
        </Suspense>
      ) : null}

      {aiFeedback && !showAddModal ? (
        <div className={`ai-feedback-toast ${aiFeedback.tone}`} role="status">
          <Sparkles size={16} aria-hidden="true" />
          <div>
            <strong>{aiFeedback.title}</strong>
            <p>{aiFeedback.detail}</p>
          </div>
          <button
            className="toast-close"
            onClick={() => setAiFeedback(null)}
            type="button"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
      ) : null}

      {/* search-panel removed */}

      </div>
      {/* end app-main */}

    </main>
  )
}

function CityFilterChip({ active, city, onRemove, onSelect, removable }) {
  return (
    <span className={`city-chip ${active ? 'active' : ''} ${removable ? '' : 'single'}`}>
      <button onClick={() => onSelect(city)} type="button">
        {city}
      </button>
      {removable ? (
        <button
          aria-label={`Quitar ${city}`}
          className="city-chip-remove"
          onClick={() => onRemove(city)}
          type="button"
        >
          <Trash2 size={14} aria-hidden="true" />
        </button>
      ) : null}
    </span>
  )
}

function AIPlaceCard({ actionLabel, budgetLabel, city, dates, groupProfile, onAddToBudget, onAddToMap, place, resultConfig }) {
  const name = getPlaceName(place)
  // Build photo gallery: prefer photoUris array, fall back to single photoUri/image
  const allPhotos = Array.isArray(place.photoUris) && place.photoUris.length > 0
    ? place.photoUris
    : (place.photoUri || place.image) ? [place.photoUri || place.image] : []
  const [photoIdx, setPhotoIdx] = React.useState(0)
  const photo = allPhotos[photoIdx] || ''
  const hasGallery = allPhotos.length > 1
  const address = getPlaceAddress(place)
  const rating = place.rating ? `${place.rating}` : null
  const reviews = getPlaceReviews(place)
  const why = place.why || null
  const rawScore = place.score || place.aiScore || null
  const score = typeof rawScore === 'number' ? rawScore : (rawScore?.v ?? null)
  const scoreGood = score && score > 30
  const mapsUrl = getPlaceUrl(place)
  // Normalize scoreBreakdown: accept both array [{label,v,max}] and object {key:number}
  const scoreBreakdown = Array.isArray(place.scoreBreakdown)
    ? place.scoreBreakdown
    : place.scoreBreakdown
      ? Object.entries(place.scoreBreakdown).map(([k, val]) => ({
          label: k.charAt(0).toUpperCase() + k.slice(1),
          v: typeof val === 'number' ? val : (val?.v ?? 0),
          max: val?.max ?? 10,
        }))
      : []
  const tags = place.tags || []
  const caution = place.caution || null
  const priceRange = place.estimatedPriceRange || null
  const smartLinks = placeSmartLinks(place, resultConfig?.id, dates, groupProfile)

  const categoryLabel = resultConfig?.id === 'food' ? 'Restaurante'
    : resultConfig?.id === 'lodging' ? 'Hospedaje'
    : resultConfig?.id === 'kids' ? 'Plan niños'
    : 'Plan'

  return (
    <article className="ai-place-card">
      {/* ── Hero foto con galería ─────────────────────────────── */}
      <div className="ai-place-photo">
        {photo
          ? <img alt={`${name} — foto ${photoIdx + 1}`} key={photo} src={displayImage(photo)} />
          : <div className="ai-place-photo-missing"><MapPinned size={28} /></div>
        }
        <div className="ai-place-photo-overlay" />

        {/* Chips de tipo y score */}
        <div className="ai-place-photo-top">
          <span className="ai-place-type-chip">{categoryLabel}</span>
          {scoreGood && (
            <div className="ai-place-score-badge">
              <Sparkles size={10} aria-hidden="true" />
              IA {score}
            </div>
          )}
        </div>

        {/* Nombre y dirección */}
        <div className="ai-place-photo-bottom">
          <h3 className="ai-place-name-overlay">{name}</h3>
          {address && (
            <p className="ai-place-address-overlay">
              <MapPinned size={10} aria-hidden="true" />
              {address}
            </p>
          )}
        </div>

        {/* Controles galería */}
        {hasGallery && (
          <>
            <button
              aria-label="Foto anterior"
              className="ai-photo-nav ai-photo-prev"
              onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => (i - 1 + allPhotos.length) % allPhotos.length) }}
              type="button"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              aria-label="Foto siguiente"
              className="ai-photo-nav ai-photo-next"
              onClick={(e) => { e.stopPropagation(); setPhotoIdx((i) => (i + 1) % allPhotos.length) }}
              type="button"
            >
              <ChevronRight size={14} />
            </button>
            <div className="ai-photo-dots" aria-hidden="true">
              {allPhotos.map((_, i) => (
                <button
                  className={`ai-photo-dot${i === photoIdx ? ' active' : ''}`}
                  key={i}
                  onClick={(e) => { e.stopPropagation(); setPhotoIdx(i) }}
                  type="button"
                />
              ))}
            </div>
          </>
        )}

        {place.photoCredit || place.imageCredit ? (
          <span className="ai-place-credit">{place.photoCredit || place.imageCredit}</span>
        ) : null}
      </div>

      {/* ── Cuerpo ────────────────────────────────────────────── */}
      <div className="ai-place-body">

        {/* Por qué IA — bloque destacado con ícono plum */}
        {why && (
          <div className="ai-place-why">
            <div className="ai-place-why-icon-wrap" aria-hidden="true">
              <Sparkles size={11} />
            </div>
            <span>{why}</span>
          </div>
        )}

        {/* Score breakdown — 2 columnas con barras coral */}
        {scoreBreakdown.length > 0 && (
          <div className="ai-place-breakdown">
            <span className="ai-place-breakdown-label">Por qué IA {score}</span>
            <div className="ai-place-breakdown-grid">
              {scoreBreakdown.map((b) => (
                <div className="ai-place-breakdown-row" key={b.label}>
                  <span className="ai-breakdown-dim">{b.label}</span>
                  <div className="ai-breakdown-bar-track">
                    <div className="ai-breakdown-bar-fill" style={{ width: `${(b.v / (b.max || 10)) * 100}%` }} />
                  </div>
                  <strong className="ai-breakdown-val">{b.v}</strong>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tags chips + precio estimado */}
        {(tags.length > 0 || priceRange) && (
          <div className="ai-place-tags">
            {tags.map((tag) => (
              <span className="ai-place-tag" key={tag}>{tag}</span>
            ))}
            {priceRange && (
              <span className="ai-place-tag ai-place-price-tag" title="Precio estimado por IA, no es el precio real">
                ~{priceRange.label} <span className="ai-price-est-label">est.</span>
              </span>
            )}
          </div>
        )}

        {/* Rating + reseñas + caution */}
        <div className="ai-place-meta-row">
          {(rating || reviews > 0) && (
            <div className="ai-place-meta">
              {rating && <span className="ai-place-rating">⭐ {rating}</span>}
              {reviews > 0 && <span className="ai-place-reviews">{reviews.toLocaleString('es-ES')} reseñas</span>}
            </div>
          )}
          {caution && (
            <p className="ai-place-caution">{caution}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="ai-place-actions-row">
          <div className="ai-place-actions-left">
            <button
              className="smart-add-primary"
              onClick={() => onAddToMap(place, resultConfig.category, city)}
              type="button"
            >
              <Plus size={13} aria-hidden="true" />
              {actionLabel}
            </button>
            <button
              className="smart-add-budget"
              onClick={() => onAddToBudget(place, resultConfig.category, city)}
              type="button"
            >
              <CircleDollarSign size={13} aria-hidden="true" />
              {budgetLabel}
            </button>
          </div>
          <a className="ai-place-maps-btn" href={mapsUrl} rel="noreferrer" target="_blank" aria-label="Ver en Google Maps">
            <MapPinned size={15} aria-hidden="true" />
          </a>
        </div>

        {/* Links inteligentes pre-cargados */}
        {smartLinks.length > 0 && (
          <div className="ai-place-smart-links">
            {smartLinks.map((link) => (
              <a
                className="ai-place-smart-link"
                href={link.url}
                key={link.label}
                rel="noreferrer"
                target="_blank"
              >
                <ExternalLink size={11} aria-hidden="true" />
                {link.label}
              </a>
            ))}
          </div>
        )}
      </div>
    </article>
  )
}

function SmartSuggestionsBanner({
  activeCity,
  availableTypes = smartSuggestionTypes,
  busy,
  currentType,
  onAddToBudget,
  onAddToMap,
  onChangeType,
  onPageChange,
  onRefresh,
  page = 1,
  result,
}) {
  const activeConfig =
    smartSuggestionTypes.find((item) => item.id === currentType) ||
    smartSuggestionTypes[0]
  const ActiveIcon = activeConfig.icon
  const resultConfig =
    smartSuggestionTypes.find((item) => item.id === result?.type) || activeConfig
  const resultMatchesCity = result?.city === activeCity && result?.type === currentType
  const places = resultMatchesCity ? result?.places || [] : []
  const paged = pagedItems(places, page)
  const hasPlaces = places.length > 0

  return (
    <section className="smart-suggestion-banner">
      <div className="smart-suggestion-copy">
        <div className="section-heading">
          <Sparkles size={20} aria-hidden="true" />
          <div>
            <p className="eyebrow">IA + Google Maps</p>
            <h2>Sugerencias para {activeCity}</h2>
          </div>
        </div>
        <p>
          Pide recomendaciones con buena puntuación y suficientes reseñas; luego
          agrégalas al mapa, al análisis o también al presupuesto.
        </p>
      </div>

      <div className="smart-suggestion-actions">
        {availableTypes.length > 1 ? (
          <div className="smart-type-tabs" aria-label="Tipo de sugerencia">
            {availableTypes.map((type) => {
            const Icon = type.icon
            return (
              <button
                className={currentType === type.id ? 'active' : ''}
                key={type.id}
                onClick={() => {
                  onChangeType(type.id)
                  onRefresh(type.id)
                }}
                type="button"
              >
                <Icon size={16} aria-hidden="true" />
                {type.label}
              </button>
            )
            })}
          </div>
        ) : (
          <span className="smart-locked-type">
            {ActiveIcon ? <ActiveIcon size={16} aria-hidden="true" /> : null}
            {activeConfig.label}
          </span>
        )}
        <button
          className="primary-button compact"
          disabled={busy}
          onClick={() => onRefresh(currentType)}
          type="button"
        >
          {busy ? <Loader2 size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
          Sugerir ahora
        </button>
      </div>

      {resultMatchesCity && result?.analysis?.summary ? (
        <p className={`smart-summary ${result.status === 'error' ? 'warning' : ''}`}>
          {result.analysis.summary}
        </p>
      ) : null}

      {resultMatchesCity && result?.links?.length > 0 ? (
        <div className="smart-booking-links">
          <span className="smart-booking-label">Buscar disponibilidad:</span>
          {result.links.map((link) => (
            <a
              className="smart-booking-btn"
              href={link.url}
              key={link.label}
              rel="noreferrer"
              target="_blank"
            >
              <ExternalLink size={13} aria-hidden="true" />
              {link.label}
            </a>
          ))}
        </div>
      ) : null}

      {hasPlaces ? (
        <>
        <div className="smart-place-row">
          {paged.items.map((place) => (
            <AIPlaceCard
              actionLabel={resultConfig.actionLabel}
              budgetLabel={resultConfig.budgetLabel}
              city={result?.city || activeCity}
              dates={result?.dates}
              groupProfile={result?.groupProfile}
              key={getPlaceId(place)}
              onAddToBudget={onAddToBudget}
              onAddToMap={onAddToMap}
              place={place}
              resultConfig={resultConfig}
            />
          ))}
        </div>
        <PaginationControl
          label={`${places.length} sugerencias`}
          onPageChange={onPageChange}
          page={paged.page}
          totalPages={paged.totalPages}
        />
        </>
      ) : null}
    </section>
  )
}

function PaginationControl({ label, onPageChange, page, totalPages }) {
  if (totalPages <= 1) return null

  return (
    <div className="pagination-control">
      <span>{label} · página {page} de {totalPages}</span>
      <div>
        <button
          disabled={page <= 1}
          onClick={() => onPageChange?.(page - 1)}
          type="button"
          aria-label="Página anterior"
        >
          <ChevronLeft size={15} aria-hidden="true" />
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
          <button
            className={pageNumber === page ? 'active' : ''}
            key={pageNumber}
            onClick={() => onPageChange?.(pageNumber)}
            type="button"
          >
            {pageNumber}
          </button>
        ))}
        <button
          disabled={page >= totalPages}
          onClick={() => onPageChange?.(page + 1)}
          type="button"
          aria-label="Página siguiente"
        >
          <ChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}

function LoginScreen({ canLogin, firebaseStatus, onSignIn }) {
  return (
    <main className="login-screen">
      <section className="login-hero">
        <div className="login-copy">
          <p className="eyebrow">Viaje familiar septiembre 2026</p>
          <h1>Entrar para planear juntos.</h1>
          <p>
            La app guarda votos, sugerencias, hospedajes, comidas, ciudades e
            itinerarios. Para que cada cambio quede sincronizado, primero entra
            con Google.
          </p>
          <div className="login-actions">
            <button
              className="login-button"
              disabled={!canLogin}
              onClick={onSignIn}
              type="button"
            >
              <LogIn size={20} aria-hidden="true" />
              Entrar con Google
            </button>
            <span className={firebaseStatus.ready ? 'ready-note' : 'setup-note'}>
              {firebaseStatus.ready ? 'Firebase listo' : 'Firebase pendiente'}
            </span>
          </div>
        </div>

        <div className="login-preview" aria-label="Funciones principales">
          <article>
            <ShieldCheck size={22} aria-hidden="true" />
            <h2>Colaboración privada</h2>
            <p>Solo quienes entren pueden votar, agregar o retirar opciones.</p>
          </article>
          <article>
            <MapPinned size={22} aria-hidden="true" />
            <h2>Mapa por ciudad</h2>
            <p>Madrid usa IFEMA como referencia; París y las demás ciudades usan su centro.</p>
          </article>
          <article>
            <Sparkles size={22} aria-hidden="true" />
            <h2>IA activa</h2>
            <p>Analiza links, comida, rutas e itinerarios desde Cloud Functions.</p>
          </article>
        </div>
      </section>
    </main>
  )
}

function readinessText(value) {
  if (value >= 70) return 'Lista para decidir'
  if (value >= 45) return 'Comparar esta semana'
  if (value >= 30) return 'Idea prometedora'
  return 'Idea inicial'
}

function NextCitiesPanel({
  activeCity,
  addCity,
  canSync = false,
  cities,
  cityDraft,
  citySuggestionNames,
  currentTravelGroup,
  onAutoFill,
  onAddDayTrip,
  onAssessPlan,
  onChatPlanner,
  onPrepareLodging,
  onPrepareTransfer,
  onRemoveCity,
  onRemoveDayTrip,
  onOpenMap,
  onSuggestDayTrips,
  onToggleBase,
  onUpdateCity,
  updateCityDraft,
}) {
  // ── inline edit ──────────────────────────────────────────────────────────
  const [editingId, setEditingId] = useState(null)
  const [editDraft, setEditDraft] = useState({ dates: '', transfer: '', angle: '' })

  // ── day-trips ────────────────────────────────────────────────────────────
  const [dayTripBusyId, setDayTripBusyId] = useState(null)
  const [newTripDraftId, setNewTripDraftId] = useState(null)
  const [newTripDraft, setNewTripDraft] = useState({ route: '', notes: '' })

  // ── analysis panel ───────────────────────────────────────────────────────
  const [assessment, setAssessment] = useState(null)
  const [assessBusy, setAssessBusy] = useState(false)
  const [assessOpen, setAssessOpen] = useState(false)

  // ── chatbox ──────────────────────────────────────────────────────────────
  const [chatOpen, setChatOpen] = useState(false)
  const [chatHistory, setChatHistory] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const chatEndRef = React.useRef(null)

  // scroll al último mensaje
  React.useEffect(() => {
    if (chatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, chatOpen])

  // ── inline edit helpers ──────────────────────────────────────────────────
  function startEdit(city) {
    setEditingId(city.id)
    setEditDraft({ dates: city.dates || '', transfer: city.transfer || '', angle: city.angle || '' })
  }
  function cancelEdit() {
    setEditingId(null)
    setEditDraft({ dates: '', transfer: '', angle: '' })
  }
  function saveEdit(city) {
    onUpdateCity?.({
      ...city,
      dates: editDraft.dates.trim() || city.dates,
      transfer: editDraft.transfer.trim() || city.transfer,
      angle: editDraft.angle.trim() || city.angle,
      readiness: city.isBase ? 100 : Math.min((city.readiness || 18) + 10, 70),
    })
    cancelEdit()
  }

  // ── day-trip helpers ─────────────────────────────────────────────────────
  async function handleSuggestDayTrips(cityId) {
    if (dayTripBusyId) return
    setDayTripBusyId(cityId)
    await onSuggestDayTrips?.(cityId)
    setDayTripBusyId(null)
  }
  function startAddTripManual(cityId) {
    setNewTripDraftId(cityId)
    setNewTripDraft({ route: '', notes: '' })
  }
  function saveManualTrip(cityId) {
    if (!newTripDraft.route.trim()) return
    onAddDayTrip?.(cityId, {
      id: `dt-${Date.now()}`,
      label: newTripDraft.route.split('→')[1]?.trim() || newTripDraft.route,
      route: newTripDraft.route.trim(),
      notes: newTripDraft.notes.trim(),
      durationHours: null,
    })
    setNewTripDraftId(null)
    setNewTripDraft({ route: '', notes: '' })
  }

  // ── analysis helpers ─────────────────────────────────────────────────────
  async function handleAssess() {
    if (assessBusy) return
    setAssessBusy(true)
    setAssessOpen(true)
    const result = await onAssessPlan?.()
    if (result) setAssessment(result)
    setAssessBusy(false)
  }

  // ── chat helpers ─────────────────────────────────────────────────────────
  const QUICK_QUESTIONS = [
    '¿Cuáles ciudades priorizo con el tiempo que tenemos?',
    '¿Es viable visitar todas las ciudades del plan?',
    '¿Cómo distribuyo los días entre ciudades?',
    '¿Qué traslados recomiendas?',
  ]

  async function sendChat(msg) {
    const text = (msg || chatInput).trim()
    if (!text || chatBusy) return
    setChatInput('')
    const userMsg = { role: 'user', content: text }
    const updatedHistory = [...chatHistory, userMsg]
    setChatHistory(updatedHistory)
    setChatBusy(true)
    // Convert history to {role, content} format for the API
    const apiHistory = chatHistory.map((m) => ({ role: m.role, content: m.content }))
    const result = await onChatPlanner?.(text, apiHistory)
    if (result?.reply) {
      setChatHistory((h) => [...h, { role: 'assistant', content: result.reply }])
    } else {
      setChatHistory((h) => [...h, { role: 'assistant', content: 'No pude procesar la consulta. Intenta de nuevo.' }])
    }
    setChatBusy(false)
  }

  // ── derived ──────────────────────────────────────────────────────────────
  const baseCities = cities.filter((c) => c.isBase)
  const normalCities = cities.filter((c) => !c.isBase)
  const topCity = [...normalCities].sort((a, b) => b.readiness - a.readiness)[0]
  const undecidedCount = normalCities.filter((city) => city.readiness < 50).length

  const viabilityIcon = { alta: '✅', media: '🟡', baja: '⚠️', 'no-recomendada': '❌' }

  // ── city card renderer ───────────────────────────────────────────────────
  function renderCityCard(city) {
    const isEditing = editingId === city.id
    const isBase = Boolean(city.isBase)
    const dayTrips = city.dayTrips || []

    return (
      <article
        className={[activeCity === city.city ? 'selected' : '', isBase ? 'base-city' : ''].filter(Boolean).join(' ')}
        key={city.id}
      >
        <div className="next-city-card-head">
          <div>
            <span>
              {city.country}
              {isBase && <span className="base-badge">🏠 Base</span>}
            </span>
            <h3>{city.city}</h3>
          </div>
          {!isBase && <strong>{readinessText(city.readiness)}</strong>}
        </div>

        {isEditing ? (
          <div className="city-inline-edit">
            {!isBase && (
              <>
                <label className="city-edit-field">
                  <span><CalendarDays size={12} aria-hidden="true" /> Fechas</span>
                  <input autoFocus onChange={(e) => setEditDraft((d) => ({ ...d, dates: e.target.value }))} placeholder="14-17 sep 2026" type="text" value={editDraft.dates} />
                </label>
                <label className="city-edit-field">
                  <span><TrainFront size={12} aria-hidden="true" /> Traslado</span>
                  <input onChange={(e) => setEditDraft((d) => ({ ...d, transfer: e.target.value }))} placeholder="AVE desde Madrid" type="text" value={editDraft.transfer} />
                </label>
              </>
            )}
            <label className="city-edit-field wide">
              <span>Idea del plan</span>
              <input autoFocus={isBase} onChange={(e) => setEditDraft((d) => ({ ...d, angle: e.target.value }))} placeholder="Qué tiene esta zona" type="text" value={editDraft.angle} />
            </label>
            <div className="city-edit-actions">
              <button className="primary-button compact" onClick={() => saveEdit(city)} type="button">
                <CheckCircle2 size={14} aria-hidden="true" /> Guardar
              </button>
              <button className="secondary-button compact" onClick={cancelEdit} type="button">Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <p>{city.angle}</p>
            {!isBase && (
              <div className="next-city-facts">
                {city.dates && city.dates !== 'Fechas por definir' ? (
                  <span><CalendarDays size={14} aria-hidden="true" />{city.dates}</span>
                ) : (
                  <button
                    className="city-ai-dates-btn"
                    onClick={() => onChatPlanner?.(`Sugiere fechas concretas para ${city.city} (${city.country || ''}) dentro del itinerario del viaje de septiembre 2026. Ten en cuenta Madrid como base con el GP F1 del 5 al 7 sep, y optimiza el orden y duración de las ciudades candidatas.`, [])}
                    type="button"
                    title="La IA sugerirá fechas basadas en el itinerario general"
                  >
                    <Sparkles size={12} aria-hidden="true" />
                    Ajustar fechas con IA
                  </button>
                )}
                <span><TrainFront size={14} aria-hidden="true" />{city.transfer || 'Traslado por definir'}</span>
              </div>
            )}
          </>
        )}

        {/* Day-trips — solo ciudades base */}
        {isBase && (
          <div className="day-trips-section">
            {dayTrips.length > 0 && (
              <ul className="day-trip-list">
                {dayTrips.map((trip) => (
                  <li className="day-trip-item" key={trip.id}>
                    <div className="day-trip-info">
                      <strong>{trip.label}</strong>
                      <span className="day-trip-route">{trip.route}</span>
                      {trip.notes && <p className="day-trip-notes">{trip.notes}</p>}
                      {trip.durationHours && <span className="day-trip-duration">~{trip.durationHours}h</span>}
                    </div>
                    <button className="danger compact" onClick={() => onRemoveDayTrip?.(city.id, trip.id)} title="Eliminar" type="button">
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {newTripDraftId === city.id ? (
              <div className="new-day-trip-form">
                <input autoFocus className="day-trip-input" onChange={(e) => setNewTripDraft((d) => ({ ...d, route: e.target.value }))} placeholder={`${city.city} → destino → ${city.city}`} type="text" value={newTripDraft.route} />
                <input className="day-trip-input" onChange={(e) => setNewTripDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="Qué hacer, dónde comer..." type="text" value={newTripDraft.notes} />
                <div className="city-edit-actions">
                  <button className="primary-button compact" disabled={!newTripDraft.route.trim()} onClick={() => saveManualTrip(city.id)} type="button">
                    <CheckCircle2 size={14} aria-hidden="true" /> Guardar excursión
                  </button>
                  <button className="secondary-button compact" onClick={() => setNewTripDraftId(null)} type="button">Cancelar</button>
                </div>
              </div>
            ) : (
              <div className="day-trip-actions">
                <button className="secondary-button compact" onClick={() => startAddTripManual(city.id)} type="button">
                  <Plus size={14} aria-hidden="true" /> Agregar excursión
                </button>
                {canSync && (
                  <button className="secondary-button compact ai-btn" disabled={dayTripBusyId === city.id} onClick={() => handleSuggestDayTrips(city.id)} type="button">
                    <Sparkles size={14} aria-hidden="true" />
                    {dayTripBusyId === city.id ? 'Buscando...' : 'Sugerir con IA'}
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {!isBase && <div className="progress"><i style={{ width: `${city.readiness}%` }} /></div>}

        <div className="next-city-actions">
          {!isEditing && (
            <button onClick={() => startEdit(city)} type="button">
              <Route size={15} aria-hidden="true" />
              {isBase ? 'Editar' : 'Editar fechas'}
            </button>
          )}
          <button className={isBase ? 'active-toggle' : ''} onClick={() => onToggleBase?.(city.id)} title={isBase ? 'Quitar como base' : 'Marcar como ciudad base'} type="button">
            <Home size={15} aria-hidden="true" />
            {isBase ? 'Es base' : 'Base'}
          </button>
          <button onClick={() => onOpenMap(city.city)} type="button">
            <MapPinned size={15} aria-hidden="true" />
            Ver mapa
          </button>
          {!isBase && (
            <>
              <button onClick={() => onPrepareLodging(city)} type="button">
                <Hotel size={15} aria-hidden="true" /> Hospedaje
              </button>
              <button onClick={() => onPrepareTransfer(city)} type="button">
                <TrainFront size={15} aria-hidden="true" /> Omio
              </button>
            </>
          )}
          <button className="danger" onClick={() => onRemoveCity(city.id)} type="button">
            <Trash2 size={15} aria-hidden="true" /> Quitar
          </button>
        </div>
      </article>
    )
  }

  // ── main render ──────────────────────────────────────────────────────────
  return (
    <section className="next-cities-panel">
      {/* Hero */}
      <div className="next-city-hero">
        <div>
          <p className="eyebrow">Después de Madrid · 14-24 septiembre</p>
          <h2>Elegir la siguiente base del viaje</h2>
          <p>Agrega ciudades, marca tu base y deja que la IA analice el plan, sugiera prioridades y organice los días.</p>
        </div>
        <div className="next-city-kpis" aria-label="Estado de decisión">
          <article><span>Candidatas</span><strong>{normalCities.length}</strong></article>
          <article><span>Bases</span><strong>{baseCities.length}</strong></article>
          <article><span>Más avanzada</span><strong>{topCity?.city || 'Por definir'}</strong></article>
          <article><span>Por madurar</span><strong>{undecidedCount}</strong></article>
        </div>
        <div className="next-city-hero-actions">
          {cities.length > 0 && onAutoFill ? (
            <button className="secondary-button compact" onClick={onAutoFill} type="button">
              <CalendarDays size={16} aria-hidden="true" /> Autocompletar fechas
            </button>
          ) : null}
          {cities.length > 0 && canSync ? (
            <button className="primary-button compact" disabled={assessBusy} onClick={handleAssess} type="button">
              <Sparkles size={16} aria-hidden="true" />
              {assessBusy ? 'Analizando...' : 'Analizar viaje con IA'}
            </button>
          ) : null}
        </div>
      </div>

      {/* Roadmap */}
      <div className="decision-roadmap">
        <article><span>1</span><strong>Ciudad base</strong><p>Reducir a 1 o 2 candidatas reales.</p></article>
        <article><span>2</span><strong>Traslado</strong><p>Comparar tren, bus y avión en Omio.</p></article>
        <article><span>3</span><strong>Hospedaje</strong><p>Buscar opciones para {groupSummary(currentTravelGroup)}.</p></article>
        <article><span>4</span><strong>Plan familiar</strong><p>Definir 2-3 planes que funcionen con niños.</p></article>
      </div>

      {/* ── Panel de Análisis IA ─────────────────────────────────────────── */}
      {assessOpen && (
        <div className="planner-assessment">
          <div className="planner-assessment-head">
            <h3><Sparkles size={16} aria-hidden="true" /> Análisis del plan</h3>
            <button className="icon-close" onClick={() => setAssessOpen(false)} type="button">✕</button>
          </div>

          {assessBusy ? (
            <p className="assess-loading">La IA está analizando tu plan… puede tardar unos segundos.</p>
          ) : assessment ? (
            <>
              {assessment.overview && <p className="assess-overview">{assessment.overview}</p>}
              {assessment.aiFallbackReason && (
                <p className="assess-error-detail">⚠️ Error técnico: {assessment.aiFallbackReason}</p>
              )}

              {assessment.warnings?.length > 0 && (
                <div className="assess-warnings">
                  {assessment.warnings.map((w, i) => (
                    <p key={i}><span>⚠️</span> {w}</p>
                  ))}
                </div>
              )}

              {assessment.priorities?.length > 0 && (
                <ul className="assess-priorities">
                  {assessment.priorities.map((item) => (
                    <li key={item.city} className={`viability-${item.viability}`}>
                      <div className="assess-city-head">
                        <span className="assess-icon">{viabilityIcon[item.viability] || '🔵'}</span>
                        <strong>{item.city}</strong>
                        {item.suggestedDays > 0 && (
                          <span className="assess-days">{item.suggestedDays} día{item.suggestedDays !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                      <p className="assess-reasoning">{item.reasoning}</p>
                      {item.transfers?.length > 0 && (
                        <p className="assess-transfers">
                          <TrainFront size={12} aria-hidden="true" /> {item.transfers.join(' · ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </div>
      )}

      {/* Ciudades base */}
      {baseCities.length > 0 && (
        <>
          <p className="eyebrow base-section-label"><Home size={14} aria-hidden="true" /> Ciudades base (sin hospedaje)</p>
          <div className="next-city-grid">{baseCities.map(renderCityCard)}</div>
        </>
      )}

      {/* Ciudades normales */}
      {normalCities.length > 0 && (
        <>
          {baseCities.length > 0 && (
            <p className="eyebrow base-section-label" style={{ marginTop: '1.5rem' }}>
              <Hotel size={14} aria-hidden="true" /> Ciudades con hospedaje
            </p>
          )}
          <div className="next-city-grid">{normalCities.map(renderCityCard)}</div>
        </>
      )}

      {/* ── Mini-chatbox ─────────────────────────────────────────────────── */}
      {cities.length > 0 && (
        <div className="planner-chat-wrap">
          <button
            className={`planner-chat-toggle ${chatOpen ? 'open' : ''}`}
            onClick={() => setChatOpen((v) => !v)}
            type="button"
          >
            <MessageCircle size={16} aria-hidden="true" />
            {chatOpen ? 'Cerrar planificador' : 'Consultar al planificador IA'}
            <ChevronDown size={14} aria-hidden="true" className={chatOpen ? 'rotated' : ''} />
          </button>

          {chatOpen && (
            <div className="planner-chat">
              {chatHistory.length === 0 && (
                <div className="chat-intro">
                  <p>Pregúntame sobre tu plan: viabilidad, días, traslados, qué priorizar…</p>
                  <div className="chat-quick-questions">
                    {QUICK_QUESTIONS.map((q) => (
                      <button
                        className="chat-quick-btn"
                        disabled={chatBusy}
                        key={q}
                        onClick={() => sendChat(q)}
                        type="button"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {chatHistory.length > 0 && (
                <div className="chat-messages">
                  {chatHistory.map((msg, i) => (
                    <div className={`chat-msg ${msg.role}`} key={i}>
                      <span className="chat-bubble">{msg.content}</span>
                    </div>
                  ))}
                  {chatBusy && (
                    <div className="chat-msg assistant">
                      <span className="chat-bubble chat-typing">Pensando…</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
              )}

              <form
                className="chat-input-row"
                onSubmit={(e) => { e.preventDefault(); sendChat(); }}
              >
                <input
                  className="chat-input"
                  disabled={chatBusy || !canSync}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder={canSync ? '¿Qué quieres saber sobre el plan?' : 'Necesitas sesión para chatear con la IA'}
                  type="text"
                  value={chatInput}
                />
                <button
                  className="primary-button compact"
                  disabled={chatBusy || !chatInput.trim() || !canSync}
                  type="submit"
                >
                  <Sparkles size={14} aria-hidden="true" />
                </button>
                {chatHistory.length > 0 && (
                  <button
                    className="secondary-button compact"
                    onClick={() => setChatHistory([])}
                    title="Borrar conversación"
                    type="button"
                  >
                    ✕
                  </button>
                )}
              </form>
            </div>
          )}
        </div>
      )}

      {/* Form para agregar ciudad */}
      <div className="next-city-add">
        <div>
          <p className="eyebrow">Nueva ciudad candidata</p>
          <h2>Agregar ciudad con intención</h2>
          <p>
            Si es tu base (casa o alojamiento fijo), activa el toggle —
            la IA sabrá que no necesitas hospedaje y sugerirá excursiones desde ahí.
          </p>
        </div>
        <form className="city-form" onSubmit={addCity}>
          <label>
            <span>Ciudad</span>
            <input list="city-suggestions" onChange={(e) => updateCityDraft('city', e.target.value)} placeholder="Lisboa, Guardo, Bilbao..." required type="text" value={cityDraft.city} />
            <datalist id="city-suggestions">
              {citySuggestionNames.map((name) => <option key={name} value={name} />)}
            </datalist>
          </label>
          <label>
            <span>País</span>
            <input onChange={(e) => updateCityDraft('country', e.target.value)} placeholder="Portugal, España..." type="text" value={cityDraft.country} />
          </label>
          {!cityDraft.isBase && (
            <>
              <label>
                <span>Fechas</span>
                <input onChange={(e) => updateCityDraft('dates', e.target.value)} placeholder="19-24 sep" type="text" value={cityDraft.dates} />
              </label>
              <label>
                <span>Traslado</span>
                <input onChange={(e) => updateCityDraft('transfer', e.target.value)} placeholder="Tren, vuelo, coche..." type="text" value={cityDraft.transfer} />
              </label>
            </>
          )}
          <label className="wide">
            <span>Idea del plan</span>
            <input onChange={(e) => updateCityDraft('angle', e.target.value)} placeholder="Por qué puede funcionar para todos" type="text" value={cityDraft.angle} />
          </label>
          <label className="base-toggle-label">
            <input checked={Boolean(cityDraft.isBase)} onChange={(e) => updateCityDraft('isBase', e.target.checked)} type="checkbox" />
            <span><Home size={14} aria-hidden="true" /> Es mi base / casa (sin hospedaje)</span>
          </label>
          <button className="primary-button compact" type="submit">
            <Plus size={18} aria-hidden="true" /> Agregar ciudad
          </button>
        </form>
      </div>
    </section>
  )
}

function TransportPanel({
  activeCategory,
  activeMember,
  budgetOptionIds,
  busy,
  onAddToBudget,
  onRemove,
  onRestore,
  onSearch,
  onToggleBudget,
  onUpdateDraft,
  onVote,
  options,
  result,
  transferDraft,
  votes,
}) {
  const links = result?.links?.length ? result.links : omioLinks(transferDraft)

  function submitSearch(event) {
    event.preventDefault()
    onSearch()
  }

  return (
    <div className="transport-panel">
      <section className="transport-planner">
        <div className="section-heading">
          <TrainFront size={20} aria-hidden="true" />
          <div>
            <p className="eyebrow">Omio + presupuesto</p>
            <h2>Buscar traslado y sumarlo al viaje</h2>
          </div>
        </div>

        <form className="transport-form" onSubmit={submitSearch}>
          <label>
            <span>Origen</span>
            <input
              onChange={(event) => onUpdateDraft('origin', event.target.value)}
              type="text"
              value={transferDraft.origin}
            />
          </label>
          <label>
            <span>Destino</span>
            <input
              onChange={(event) => onUpdateDraft('destination', event.target.value)}
              type="text"
              value={transferDraft.destination}
            />
          </label>
          <label>
            <span>Fecha</span>
            <input
              onChange={(event) => onUpdateDraft('date', event.target.value)}
              type="text"
              value={transferDraft.date}
            />
          </label>
          <label>
            <span>EUR/persona visto</span>
            <input
              min="0"
              onChange={(event) => onUpdateDraft('pricePerPerson', event.target.value)}
              placeholder="Ej. 84"
              type="number"
              value={transferDraft.pricePerPerson}
            />
          </label>
          <label className="wide">
            <span>Notas</span>
            <input
              onChange={(event) => onUpdateDraft('notes', event.target.value)}
              type="text"
              value={transferDraft.notes}
            />
          </label>
          <button className="primary-button compact" disabled={busy} type="submit">
            {busy ? <Loader2 size={18} aria-hidden="true" /> : <Search size={18} aria-hidden="true" />}
            Buscar en Omio
          </button>
          <button className="secondary-button compact" onClick={onAddToBudget} type="button">
            <CircleDollarSign size={18} aria-hidden="true" />
            Agregar al presupuesto
          </button>
        </form>

        <div className="platform-links">
          {links.map((link) => (
            <a href={link.url} key={link.label} rel="noreferrer" target="_blank">
              {link.label}
            </a>
          ))}
        </div>

        {result ? (
          <div className="search-tips">
            <span>{result.analysis?.summary || result.notes}</span>
            {result.analysis?.comparisonCriteria?.length ? (
              <ul>
                {result.analysis.comparisonCriteria.slice(0, 4).map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
      </section>

      <OptionGrid
        activeCategory={activeCategory}
        activeMember={activeMember}
        budgetOptionIds={budgetOptionIds}
        nights={1}
        onRemove={onRemove}
        onRestore={onRestore}
        onToggleBudget={onToggleBudget}
        onVote={onVote}
        options={options}
        votes={votes}
      />
    </div>
  )
}

// ── TRIP OVERVIEW DASHBOARD ────────────────────────────────────────────
function TripOverviewPanel({
  activeTrip,
  cities = [],
  options = [],
  familyMembers = [],
  currentTravelGroup,
  budgetNights,
  budgetOptionIds = [],
  votes = {},
  onGoTo,
}) {
  const categories = [
    { id: 'lodging', label: 'Hospedajes', icon: Hotel, color: '#2563eb' },
    { id: 'food', label: 'Comida', icon: Utensils, color: '#16a34a' },
    { id: 'activities', label: 'Planes', icon: Landmark, color: '#7c3aed' },
    { id: 'transport', label: 'Transporte', icon: TrainFront, color: '#ea580c' },
  ]

  const totalBudget = budgetOptionIds.reduce((sum, id) => {
    const opt = options.find((o) => o.id === id)
    return sum + (opt?.priceTotal || 0)
  }, 0)

  const totalVotes = Object.values(votes).reduce((sum, v) => sum + (v?.length || 0), 0)

  return (
    <div className="overview-panel">
      {/* Hero header */}
      <div className="overview-hero">
        <div className="overview-hero-emoji">{activeTrip?.emoji || '✈️'}</div>
        <div>
          <h1 className="overview-hero-name">{activeTrip?.name || 'Viaje Familia'}</h1>
          <p className="overview-hero-meta">
            {cities.length > 0
              ? cities.map((c) => c.city || c).join(' → ')
              : 'Ciudades por definir'}
            {' · '}
            {(Number(currentTravelGroup?.adults) || familyMembers.length || 0)} viajeros
            {budgetNights > 0 && ` · ${budgetNights} noches`}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="overview-stats-row">
        <div className="overview-stat">
          <span className="overview-stat-num">{options.filter((o) => o.status !== 'removed').length}</span>
          <span className="overview-stat-label">opciones totales</span>
        </div>
        <div className="overview-stat">
          <span className="overview-stat-num">{budgetOptionIds.length}</span>
          <span className="overview-stat-label">en presupuesto</span>
        </div>
        <div className="overview-stat">
          <span className="overview-stat-num">{totalVotes}</span>
          <span className="overview-stat-label">votos</span>
        </div>
        {totalBudget > 0 && (
          <div className="overview-stat">
            <span className="overview-stat-num">{currency(totalBudget)}</span>
            <span className="overview-stat-label">presup. total</span>
          </div>
        )}
      </div>

      {/* Category cards */}
      <div className="overview-category-grid">
        {categories.map(({ id, label, icon: Icon, color }) => {
          const count = options.filter((o) => o.category === id && o.status !== 'removed').length
          const inBudget = options.filter((o) => o.category === id && budgetOptionIds.includes(o.id)).length
          const topOption = options
            .filter((o) => o.category === id && o.status !== 'removed')
            .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))[0]
          return (
            <button
              key={id}
              className="overview-category-card"
              onClick={() => onGoTo(id)}
              type="button"
              style={{ '--card-accent': color }}
            >
              <div className="overview-card-header">
                <span className="overview-card-icon" style={{ background: `${color}18`, color }}>
                  <Icon size={20} />
                </span>
                <span className="overview-card-count">{count} opción{count !== 1 ? 'es' : ''}</span>
              </div>
              <p className="overview-card-label">{label}</p>
              {topOption && (
                <p className="overview-card-top">
                  ✦ {topOption.title.split(' ').slice(0, 4).join(' ')}
                  {topOption.aiScore ? ` · AI ${topOption.aiScore}` : ''}
                </p>
              )}
              {!topOption && (
                <p className="overview-card-empty">Toca para buscar con IA</p>
              )}
              {inBudget > 0 && (
                <span className="overview-card-budget-tag">{inBudget} en presupuesto</span>
              )}
            </button>
          )
        })}
      </div>

      {/* Cities quick view */}
      {cities.length > 0 && (
        <div className="overview-cities-section">
          <p className="eyebrow">CIUDADES DEL VIAJE</p>
          <div className="overview-cities-list">
            {cities.map((city, i) => (
              <div key={city.id || i} className="overview-city-row">
                <span className="overview-city-dot" />
                <span className="overview-city-name">{city.city || city}</span>
                <span className="overview-city-dates">
                  {city.dates && city.dates !== 'Fechas por definir'
                    ? city.dates
                    : 'Fechas por definir'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="overview-actions">
        <button className="overview-action-btn" onClick={() => onGoTo('itinerary')} type="button">
          <Route size={16} /> Ver itinerario
        </button>
        <button className="overview-action-btn" onClick={() => onGoTo('budget')} type="button">
          <CircleDollarSign size={16} /> Ver presupuesto
        </button>
        <button className="overview-action-btn" onClick={() => onGoTo('cities')} type="button">
          <MapPinned size={16} /> Gestionar ciudades
        </button>
      </div>
    </div>
  )
}

function OptionGrid({
  activeCategory,
  activeMember,
  activeTripId,
  availabilityBusyId = '',
  budgetOptionIds,
  canSync = false,
  currentTravelGroup,
  nights,
  onRemove,
  onRestore,
  onToggleBudget,
  onVerifyAvailability,
  onVote,
  onUpdateOption,
  options,
  subgroups = [],
  votes,
}) {
  const [selectedOption, setSelectedOption] = useState(null)
  const [reanalyzeBusy, setReanalyzeBusy] = useState(false)
  const [expandedReasoning, setExpandedReasoning] = useState({})

  async function handleReanalyze(option) {
    if (!canSync || reanalyzeBusy) return
    setReanalyzeBusy(true)
    try {
	      const result = await reanalyzeOptionWithAI({
	        tripId: activeTripId,
	        optionId: option.id,
        groupProfile: currentTravelGroup,
        subgroups,
      })
      if (result?.patch) {
        const updated = { ...option, ...result.patch }
        setSelectedOption(updated)
        onUpdateOption?.(updated)
      }
    } catch (err) {
      console.error('reanalyze error', err)
    } finally {
      setReanalyzeBusy(false)
    }
  }

  if (!options.length) {
    return (
      <div className="empty-state">
        <Sparkles size={26} aria-hidden="true" />
        <h2>No hay opciones en esta vista</h2>
        <p>Agrega una sugerencia o cambia de ciudad.</p>
      </div>
    )
  }

  const sel = selectedOption
    ? {
        option: selectedOption,
        optionVotes: votes[selectedOption.id] || [],
        hasVote: (votes[selectedOption.id] || []).includes(activeMember),
        inBudget: budgetOptionIds.includes(selectedOption.id),
        price: priceBreakdown(selectedOption, nights),
      }
    : null

  return (
    <>
      <div className="option-grid">
        {options.map((option) => {
          const optionVotes = votes[option.id] || []
          const hasVote = optionVotes.includes(activeMember)
          const inBudget = budgetOptionIds.includes(option.id)
          const price = priceBreakdown(option, nights)
          return (
            <article
              className={`option-card ${option.status}`}
              key={option.id}
              onClick={() => setSelectedOption(option)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && setSelectedOption(option)}
            >
              <div className="option-media">
                <OptionImage option={option} />
                <span
                  className={`score-badge ${!option.aiScore || option.aiScore <= 30 ? 'pending' : ''}`}
                  title={aiScoreTitle(option.aiScore)}
                >
                  {aiScoreLabel(option.aiScore)}
                </span>
                {inBudget ? <span className="budget-badge-overlay">💰</span> : null}
                {options.indexOf(option) < 3 && (
                  <span className="comparator-letter-badge">
                    {String.fromCharCode(65 + options.indexOf(option))}
                  </span>
                )}
              </div>
              <div className="option-body">
                <div className="option-title-row">
                  <span className="code-badge">{option.code}</span>
                  <div>
                    <p>{option.source} · {option.city}</p>
                    <h2>{option.title}</h2>
                  </div>
                </div>
                <div className="metric-row compact-metric">
                  <span>
                    <CircleDollarSign size={14} aria-hidden="true" />
                    <strong>{price.primary}</strong>
                  </span>
                  <span>{option.rating}</span>
                  {option.availability ? (
                    <span className={`avail-dot ${availabilityTone(option.availability.status)}`} title={option.availability.label}>●</span>
                  ) : null}
                </div>
                <div className="card-actions compact-actions" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                  <button
                    className={hasVote ? 'liked' : ''}
                    onClick={() => onVote(option.id)}
                    type="button"
                    title="Votar"
                  >
                    <Heart size={15} aria-hidden="true" />
                    <span>{optionVotes.length}</span>
                  </button>
                  {option.url ? (
                    <a href={option.url} rel="noreferrer" target="_blank" title="Ver link">
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  ) : null}
                  <button className="detail-btn" onClick={() => setSelectedOption(option)} type="button">
                    Ver detalles
                  </button>
                  <button
                    className="card-remove-btn"
                    onClick={() => onRemove(option.id)}
                    type="button"
                    title="Quitar opción"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </div>

                {/* AI Reasoning Accordion */}
                {option.aiThinkingProcess && (
                  <div className="card-ai-reasoning" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      className="ai-reasoning-toggle"
                      onClick={() => setExpandedReasoning(prev => ({ ...prev, [option.id]: !prev[option.id] }))}
                      title="Ver el proceso intelectual de la IA para dar este puntaje y recomendación"
                    >
                      <Sparkles size={12} aria-hidden="true" />
                      <span>{expandedReasoning[option.id] ? 'Ocultar pensamiento' : 'Ver razonamiento de la IA'}</span>
                      <ChevronDown
                        size={12}
                        aria-hidden="true"
                        style={{
                          transform: expandedReasoning[option.id] ? 'rotate(180deg)' : 'none',
                          transition: 'transform 0.2s',
                          marginLeft: 'auto'
                        }}
                      />
                    </button>
                    <div className={`ai-reasoning-container ${expandedReasoning[option.id] ? 'open' : ''}`}>
                      <div className="ai-reasoning-content">
                        {option.aiThinkingProcess.split('\n\n').filter(Boolean).map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>

      {/* ── COMPARADOR LADO A LADO ──────────────────────────────── */}
      {options.length >= 1 && (
        <div className="comparator-section">
          <div className="comparator-header">
            <span className="eyebrow">Comparar lado a lado</span>
            {options.length < 2 && (
              <span className="comparator-hint">Agrega más opciones para comparar</span>
            )}
          </div>
          {options.length >= 2 ? (
            <div className="comparator-table-wrap">
              <table className="comparator-table">
                <thead>
                  <tr>
                    <th className="comparator-row-label"></th>
                    {options.slice(0, 3).map((opt, i) => (
                      <th key={opt.id} className="comparator-col-head">
                        <span className="comparator-col-letter">{String.fromCharCode(65 + i)}</span>
                        <span className="comparator-col-name">
                          {opt.code || opt.title.split(' ').slice(0, 2).join(' ')}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="comparator-row-label">Precio total</td>
                    {options.slice(0, 3).map((opt) => {
                      const p = priceBreakdown(opt, nights)
                      return (
                        <td key={opt.id}>
                          {opt.priceTotal ? currency(opt.priceTotal) : p.secondary || '—'}
                        </td>
                      )
                    })}
                  </tr>
                  <tr>
                    <td className="comparator-row-label">Por persona</td>
                    {options.slice(0, 3).map((opt) => {
                      const p = priceBreakdown(opt, nights)
                      return <td key={opt.id}>{p.primary || '—'}</td>
                    })}
                  </tr>
                  <tr className="comparator-highlighted">
                    <td className="comparator-row-label">AI score</td>
                    {options.slice(0, 3).map((opt) => (
                      <td key={opt.id}><strong>{opt.aiScore || '—'}</strong></td>
                    ))}
                  </tr>
                  <tr>
                    <td className="comparator-row-label">Votos familia</td>
                    {options.slice(0, 3).map((opt) => (
                      <td key={opt.id}>{(votes[opt.id] || []).length}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="comparator-row-label">En presupuesto</td>
                    {options.slice(0, 3).map((opt) => (
                      <td key={opt.id}>
                        {budgetOptionIds.includes(opt.id) ? '✓' : '—'}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <p className="comparator-empty-msg">
              Solo hay 1 opción guardada. Agrega una segunda para activar la comparación.
            </p>
          )}
        </div>
      )}

      {sel ? (
        <OptionDetailModal
          activeCategory={activeCategory}
          availabilityBusyId={availabilityBusyId}
          canSync={canSync}
          hasVote={sel.hasVote}
          inBudget={sel.inBudget}
          onClose={() => setSelectedOption(null)}
          onReanalyze={handleReanalyze}
          onRemove={(id) => { onRemove(id); setSelectedOption(null) }}
          onRestore={(id) => { onRestore(id); setSelectedOption(null) }}
          onToggleBudget={onToggleBudget}
          onVerifyAvailability={onVerifyAvailability}
          onVote={onVote}
          option={sel.option}
          optionVotes={sel.optionVotes}
          price={sel.price}
          reanalyzeBusy={reanalyzeBusy}
        />
      ) : null}
    </>
  )
}

function OptionDetailModal({
  activeCategory,
  availabilityBusyId,
  canSync,
  hasVote,
  inBudget,
  onClose,
  onReanalyze,
  onRemove,
  onRestore,
  onToggleBudget,
  onVerifyAvailability,
  onVote,
  option,
  optionVotes,
  price,
  reanalyzeBusy,
}) {
  // Close on ESC key
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="option-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="option-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="option-modal-header">
          <div className="option-modal-code-row">
            <span className="code-badge">{option.code}</span>
            <div>
              <p className="option-modal-source">{option.source} · {option.city}</p>
              <h2 className="option-modal-title">{option.title}</h2>
            </div>
          </div>
          <button className="option-modal-close" onClick={onClose} type="button" aria-label="Cerrar">
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        {/* Image carousel */}
        <div className="option-modal-image">
          <PhotoCarousel option={option} />
          <span
            className={`score-badge modal-score-badge ${!option.aiScore || option.aiScore <= 30 ? 'pending' : ''}`}
            title={aiScoreTitle(option.aiScore)}
          >
            {aiScoreLabel(option.aiScore)}
          </span>
          {option.imageCredit ? <span className="photo-credit">{option.imageCredit}</span> : null}
        </div>

        {/* Metrics */}
        <div className="option-modal-body">
          <div className="metric-row">
            <span>
              <CircleDollarSign size={16} aria-hidden="true" />
              <span>
                <strong>{price.primary}</strong>
                {price.secondary ? <small>{price.secondary}</small> : null}
              </span>
            </span>
            <span>
              <Users size={16} aria-hidden="true" />
              {option.capacity}
            </span>
            {extractBathrooms(option) ? (
              <span>
                <span aria-hidden="true">🚿</span>
                {extractBathrooms(option)} {extractBathrooms(option) === 1 ? 'baño' : 'baños'}
              </span>
            ) : null}
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

          {/* Availability */}
          {option.category === 'lodging' && option.availability ? (
            <div className={`availability-card ${availabilityTone(option.availability.status)}`}>
              <strong>{option.availability.label || 'Disponibilidad revisada'}</strong>
              <span>
                {formatAvailabilityDate(option.availability.checkedAt)
                  ? `Revisado ${formatAvailabilityDate(option.availability.checkedAt)}`
                  : 'Revisión guardada'}
                {option.availability.confidence ? ` · confianza ${option.availability.confidence}` : ''}
              </span>
              <p>{option.availability.summary}</p>
            </div>
          ) : null}

          {/* Highlights */}
          {option.highlights?.length > 0 ? (
            <ul className="signal-list modal-signal-list">
              {option.highlights.map((h) => <li key={h}>{h}</li>)}
            </ul>
          ) : null}

          {/* AI Analysis */}
          {(option.aiSummary || option.cautions?.length > 0 || option.aiQuestions?.length > 0 || option.aiThinkingProcess) ? (
            <div className="ai-analysis-block ai-analysis-open">
              <div className="ai-analysis-label">
                <span className="ai-chip">IA {option.aiScore || '—'}</span>
                Análisis de IA
              </div>
              <div className="ai-analysis-body">
                {option.aiSummary ? (
                  <p className="ai-analysis-summary">{option.aiSummary}</p>
                ) : null}
                {option.cautions?.length > 0 ? (
                  <div className="ai-analysis-section cautions">
                    <strong>⚠️ Precauciones</strong>
                    <ul>
                      {option.cautions.map((c) => <li key={c}>{c}</li>)}
                    </ul>
                  </div>
                ) : null}
                {option.aiQuestions?.length > 0 ? (
                  <div className="ai-analysis-section questions">
                    <strong>❓ Por verificar</strong>
                    <ul>
                      {option.aiQuestions.map((q) => <li key={q}>{q}</li>)}
                    </ul>
                  </div>
                ) : null}
                {option.aiThinkingProcess ? (
                  <div className="ai-analysis-section reasoning" style={{ marginTop: '14px', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
                    <strong style={{ color: 'var(--violet)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <Sparkles size={13} aria-hidden="true" />
                      Proceso de Razonamiento
                    </strong>
                    <div className="ai-reasoning-content" style={{ marginTop: '6px', fontSize: '0.78rem', background: 'var(--surface-soft)', borderLeft: '2.5px solid var(--violet)', padding: '10px 12px' }}>
                      {option.aiThinkingProcess.split('\n\n').filter(Boolean).map((para, i) => (
                        <p key={i} style={{ margin: '0 0 8px', lineHeight: '1.45' }}>{para}</p>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Actions */}
          <div className="option-modal-actions">
            <button
              className={hasVote ? 'liked' : ''}
              onClick={() => onVote(option.id)}
              type="button"
            >
              <Heart size={16} aria-hidden="true" />
              {hasVote ? 'Guardado' : 'Guardar'} ({optionVotes.length})
            </button>

            {option.url ? (
              <a href={option.url} rel="noreferrer" target="_blank">
                <ExternalLink size={15} aria-hidden="true" />
                Ver link
              </a>
            ) : null}

            <button
              className={inBudget ? 'budgeted' : ''}
              onClick={() => onToggleBudget(option.id)}
              type="button"
            >
              <CircleDollarSign size={16} aria-hidden="true" />
              {inBudget ? 'En presupuesto ✓' : 'Agregar al presupuesto'}
            </button>

            {option.category === 'lodging' && option.url && onVerifyAvailability ? (
              <button
                className="availability-action"
                disabled={availabilityBusyId === option.id}
                onClick={() => onVerifyAvailability(option)}
                type="button"
              >
                {availabilityBusyId === option.id ? (
                  <Loader2 size={16} aria-hidden="true" />
                ) : (
                  <CheckCircle2 size={16} aria-hidden="true" />
                )}
                Verificar disponibilidad
              </button>
            ) : null}

            {option.category === 'lodging' && option.availability?.checkUrl ? (
              <a href={option.availability.checkUrl} rel="noreferrer" target="_blank">
                Confirmar fechas
              </a>
            ) : null}

            {canSync ? (
              <button
                className="reanalyze-btn"
                disabled={reanalyzeBusy}
                onClick={() => onReanalyze(option)}
                type="button"
                title="Re-ejecutar análisis de IA para actualizar baños, fotos, resumen y puntuación"
              >
                {reanalyzeBusy ? <Loader2 size={15} className="spin" aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                {reanalyzeBusy ? 'Analizando...' : 'Actualizar con IA'}
              </button>
            ) : null}

            {option.status === 'removed' ? (
              <button className="restore-btn" onClick={() => onRestore(option.id)} type="button">
                Restaurar opción
              </button>
            ) : (
              <button className="remove-btn" onClick={() => onRemove(option.id)} type="button">
                <Trash2 size={15} aria-hidden="true" />
                Quitar opción
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function OptionImage({ option }) {
  const [imageStatus, setImageStatus] = useState({ optionId: option.id, state: 'primary' })
  const imageState = imageStatus.optionId === option.id ? imageStatus.state : 'primary'
  const hasPrimaryImage = Boolean(option.image)
  const hasAlternateImage = Boolean(option.alternateImage)
  const src =
    imageState === 'primary' && hasPrimaryImage
      ? displayImage(option.image)
      : imageState === 'alternate' && hasAlternateImage
        ? displayImage(option.alternateImage)
        : fallbackImage(option)

  function handleImageError() {
    setImageStatus((current) =>
      current.optionId === option.id && current.state === 'primary' && hasAlternateImage
        ? { optionId: option.id, state: 'alternate' }
        : { optionId: option.id, state: 'fallback' },
    )
  }

  return (
    <img
      alt={option.title}
      onError={handleImageError}
      referrerPolicy="no-referrer"
      src={src}
    />
  )
}

function PhotoCarousel({ option }) {
  // Build photo list: prefer option.photos[] array; fall back to image/alternateImage
  const photos = useMemo(() => {
    if (option.photos?.length > 0) return option.photos
    const list = [option.image, option.alternateImage].filter(Boolean)
    return list.length > 0 ? list : null
  }, [option])

  const [carouselState, setCarouselState] = useState({
    optionId: option.id,
    index: 0,
    imgError: {},
  })
  const currentState =
    carouselState.optionId === option.id
      ? carouselState
      : { optionId: option.id, index: 0, imgError: {} }

  if (!photos) {
    return (
      <div className="missing-photo photo-carousel-missing">
        <span>{fallbackImage(option) ? null : '📷'}</span>
        <img
          alt={option.title}
          src={fallbackImage(option)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </div>
    )
  }

  const validPhotos = photos.filter((_, i) => !currentState.imgError[i])
  const safeIndex = Math.min(currentState.index, Math.max(0, validPhotos.length - 1))
  const currentSrc = validPhotos[safeIndex] ? displayImage(validPhotos[safeIndex]) : fallbackImage(option)

  function prev(e) {
    e.stopPropagation()
    setCarouselState((current) => {
      const base = current.optionId === option.id ? current : currentState
      return {
        ...base,
        index: (base.index - 1 + validPhotos.length) % validPhotos.length,
      }
    })
  }
  function next(e) {
    e.stopPropagation()
    setCarouselState((current) => {
      const base = current.optionId === option.id ? current : currentState
      return {
        ...base,
        index: (base.index + 1) % validPhotos.length,
      }
    })
  }
  function handleError() {
    const actualIdx = photos.indexOf(validPhotos[safeIndex])
    setCarouselState((current) => {
      const base = current.optionId === option.id ? current : currentState
      return {
        ...base,
        imgError: { ...base.imgError, [actualIdx]: true },
      }
    })
  }

  return (
    <div className="photo-carousel">
      <img
        key={currentSrc}
        alt={`${option.title} ${safeIndex + 1}/${validPhotos.length}`}
        className="photo-carousel-img"
        onError={handleError}
        referrerPolicy="no-referrer"
        src={currentSrc}
      />
      {validPhotos.length > 1 && (
        <>
          <button
            aria-label="Foto anterior"
            className="carousel-arrow carousel-prev"
            onClick={prev}
            type="button"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            aria-label="Foto siguiente"
            className="carousel-arrow carousel-next"
            onClick={next}
            type="button"
          >
            <ChevronRight size={18} />
          </button>
          <div className="carousel-dots">
            {validPhotos.map((_, i) => (
              <button
                key={i}
                aria-label={`Foto ${i + 1}`}
                className={`carousel-dot${i === safeIndex ? ' active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setCarouselState((current) => ({
                    ...(current.optionId === option.id ? current : currentState),
                    index: i,
                  }))
                }}
                type="button"
              />
            ))}
          </div>
          <span className="carousel-counter">{safeIndex + 1}/{validPhotos.length}</span>
        </>
      )}
    </div>
  )
}

// ─── Donut Chart SVG ──────────────────────────────────────────────────────────
function DonutChart({ segments, total }) {
  const r = 52
  const cx = 64
  const cy = 64
  const circ = 2 * Math.PI * r
  const totalValue = segments.reduce((s, seg) => s + seg.value, 0)

  // Purely calculate cumulative offsets using previous segments sum to avoid re-assignment during render
  const segmentData = segments.map((seg, index) => {
    const previousSum = segments.slice(0, index).reduce((s, prevSeg) => s + prevSeg.value, 0)
    const pct = totalValue ? seg.value / totalValue : 0
    const dash = pct * circ
    const previousPct = totalValue ? previousSum / totalValue : 0
    const offset = previousPct * circ
    return { seg, dash, offset }
  })

  return (
    <svg viewBox="0 0 128 128" className="donut-svg" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--cream-2)" strokeWidth={18} />
      {segmentData.map(({ seg, dash, offset }) => {
        return (
          <circle
            key={seg.label}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={18}
            strokeDasharray={`${dash} ${circ - dash}`}
            strokeDashoffset={-offset}
            strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '64px 64px' }}
          />
        )
      })}
      <text x="64" y="59" textAnchor="middle" fontSize="9" fill="var(--muted)" fontFamily="Inter,sans-serif">TOTAL</text>
      <text x="64" y="76" textAnchor="middle" fontSize="14" fontWeight="800" fill="var(--ink)" fontFamily="Inter,sans-serif">
        {total ? `€${Math.round(total / 1000 * 10) / 10}k` : '—'}
      </text>
    </svg>
  )
}

// ─── Budget Panel (v2) ────────────────────────────────────────────────────────
const CAT_COLORS = {
  lodging: '#2563eb',
  activities: '#0d9488',
  food: '#ea580c',
  transport: '#7c3aed',
  cities: '#8aa388',
}

function BudgetPanel({
  allOptions,
  budgetOptions,
  currentTravelGroup,
  f1Count,
  nights,
  onRemove,
  onToggleSubgroupBudget,
  subgroupBudgetOptions,
  votes = {},
  onAdd,
  onRemoveOption,
}) {
  const [budgetView, setBudgetView] = useState('categoria')

  // Group all active options of category 'lodging' by city
  const activeLodgings = allOptions.filter(
    (o) => o.category === 'lodging' && o.status !== 'removed'
  )
  const citiesWithLodging = [...new Set(activeLodgings.map((o) => o.city || 'Madrid'))]

  const projections = []

  citiesWithLodging.forEach((city) => {
    const cityOptions = activeLodgings.filter((o) => (o.city || 'Madrid') === city)
    
    // Find the one with highest votes
    let favorite = null
    let maxVotes = 0
    cityOptions.forEach((opt) => {
      const vCount = votes[opt.id]?.length || 0
      if (vCount > maxVotes) {
        maxVotes = vCount
        favorite = opt
      } else if (vCount === maxVotes && vCount > 0) {
        if (!favorite || (opt.aiScore || 0) > (favorite.aiScore || 0)) {
          favorite = opt
        }
      }
    })

    const current = budgetOptions.find(
      (o) => o.category === 'lodging' && (o.city || 'Madrid') === city
    )

    if (favorite && (!current || current.id !== favorite.id)) {
      projections.push({
        city,
        favorite,
        current,
        votesCount: maxVotes,
      })
    }
  })

  const handleApplyFavorite = (proj) => {
    if (proj.current && onRemoveOption) {
      onRemoveOption(proj.current.id)
    }
    if (onAdd) {
      onAdd(proj.favorite.id)
    }
  }
  const [showSettle, setShowSettle] = useState(false)
  // paidBy: { [optionId]: memberId }
  const [paidBy, setPaidBy] = useState({})
  function setPayer(optionId, memberId) {
    setPaidBy((prev) => ({ ...prev, [optionId]: memberId }))
  }

  const rows = budgetOptions.map((option) => ({
    option,
    budget: optionBudget(option, currentTravelGroup, f1Count, nights),
  }))
  const knownRows = rows.filter((r) => !r.budget.missing)
  const total = knownRows.reduce((s, r) => s + (r.budget.total || 0), 0)
  const travelers = currentTravelGroup.totalTravelers ||
    (Number(currentTravelGroup.adults) || 0) + (currentTravelGroup.childrenAges?.length || 0)
  const perPerson = travelers ? total / travelers : 0
  const budgetMeta = currentTravelGroup.budgetMeta || {}
  const budgetGoal = budgetMeta.goal || 5000
  const paidTotal = knownRows.reduce((s, r) => s + (r.option.priceTotal || r.budget.total || 0), 0)
  const paidPct = total ? Math.round((paidTotal / total) * 100) : 0

  // By-category segments for donut
  const catTotals = {}
  knownRows.forEach(({ option, budget }) => {
    const cat = option.category || 'other'
    catTotals[cat] = (catTotals[cat] || 0) + (budget.total || 0)
  })
  const donutSegments = Object.entries(catTotals).map(([cat, value]) => ({
    label: categoryConfig[cat]?.shortLabel || cat,
    value,
    color: CAT_COLORS[cat] || '#94a3b8',
  }))

  // By-day data for bar chart (allocate total across trip days)
  const dayLabels = itineraryDraft.map((d) => d.day.split(' ').slice(0, 2).join(' '))
  const dayBars = dayLabels.map((label, i) => {
    // Distribute: lodging per night, activities on specific days, transport on first/last
    let dayTotal = 0
    knownRows.forEach(({ option, budget }) => {
      const t = budget.total || 0
      if (option.category === 'lodging') dayTotal += nights ? t / nights : 0
      else if (option.category === 'transport') dayTotal += i === 0 || i === dayLabels.length - 1 ? t / 2 : 0
      else dayTotal += t / dayLabels.length
    })
    return { label, value: Math.round(dayTotal) }
  })
  const maxDayBar = Math.max(...dayBars.map((d) => d.value), 1)

  // "Quién pagó qué" — usar paidBy real. Cada miembro sumó lo que pagó
  const paidByTotals = {}
  knownRows.forEach(({ option, budget }) => {
    const payer = paidBy[option.id]
    if (payer) {
      paidByTotals[payer] = (paidByTotals[payer] || 0) + (budget.total || 0)
    }
  })
  const settleMembers = familyMembers.slice(0, 6)
  const settleData = settleMembers.map((member) => {
    const paid = paidByTotals[member.id] || 0
    const share = perPerson
    const balance = paid - share
    return { id: member.id, name: member.name, paid, share, balance }
  })

  const subgroupIds = new Set(currentTravelGroup.budgetOptionIds || [])
  const subgroupCandidates = allOptions
    .filter((o) => o.status !== 'removed' && !subgroupIds.has(o.id))
    .sort((a, b) => (b.aiScore || 0) - (a.aiScore || 0))
    .slice(0, 8)

  if (!budgetOptions.length) {
    return (
      <div className="budget-panel-v2">
        <div className="empty-state budget-empty-inline">
          <CircleDollarSign size={26} aria-hidden="true" />
          <h2>No hay partidas en el presupuesto</h2>
          <p>Agrega hospedajes, planes, comida o traslados desde sus tarjetas.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="budget-panel-v2">
      {/* Header */}
      <div className="budget-v2-header">
        <div>
          <p className="eyebrow">Presupuesto · Todo el viaje</p>
          <h2 className="budget-v2-title">El viaje, en plata.</h2>
        </div>
      </div>

      {/* KPI row */}
      <div className="budget-v2-kpis">
        <article className="budget-kpi">
          <span>Total estimado · {travelers} personas</span>
          <strong>{currency(total)}</strong>
          {total < budgetGoal
            ? <small className="kpi-good">−{currency(budgetGoal - total)} bajo meta</small>
            : <small className="kpi-warn">+{currency(total - budgetGoal)} sobre meta</small>}
          <div className="kpi-bar-track">
            <div className="kpi-bar-fill" style={{ width: `${Math.min((total / budgetGoal) * 100, 100)}%` }} />
          </div>
          <span className="kpi-bar-label">Meta {currency(budgetGoal)}</span>
        </article>
        <article className="budget-kpi">
          <span>Por persona</span>
          <strong>{currency(perPerson)}</strong>
          <small>{travelers} viajeros</small>
        </article>
        <article className="budget-kpi">
          <span>Ya pagado</span>
          <strong className="kpi-paid">{currency(paidTotal)}</strong>
          <small>{paidPct}% del total</small>
        </article>
        <article className="budget-kpi">
          <span>Por pagar</span>
          <strong className="kpi-topay">{currency(Math.max(total - paidTotal, 0))}</strong>
          <small>{100 - paidPct}% por delante</small>
        </article>
      </div>

      {/* Proyecciones de alojamientos favoritos */}
      {projections.map((proj) => {
        const favoriteBudget = optionBudget(proj.favorite, currentTravelGroup, f1Count, nights)
        const currentBudget = proj.current ? optionBudget(proj.current, currentTravelGroup, f1Count, nights) : { total: 0, perPerson: 0 }
        const diffTotal = favoriteBudget.total - currentBudget.total
        const isCheaper = diffTotal <= 0

        return (
          <div key={proj.city} className="budget-projected-card">
            <div className="budget-projected-head">
              <span className="budget-projected-title">
                <Sparkles className="budget-projected-sparkle" size={14} />
                RECOMENDACIÓN INTERACTIVA: ALOJAMIENTO FAVORITO EN {proj.city.toUpperCase()}
              </span>
              <span className="budget-projected-option-votes" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Heart size={12} fill="#ea580c" stroke="none" /> {proj.votesCount} {proj.votesCount === 1 ? 'voto de la familia' : 'votos de la familia'}
              </span>
            </div>
            <div className="budget-projected-details">
              <div className="budget-projected-option-info">
                <span className="budget-projected-option-name">{proj.favorite.title}</span>
                <span className="budget-projected-option-meta" style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>
                  {proj.favorite.capacity} · {proj.favorite.rating} de calificación ({proj.favorite.reviews} reseñas)
                </span>
              </div>
              <div className="budget-projected-math">
                {proj.current && (
                  <div className="budget-projected-amount-col">
                    <span className="budget-projected-amount-label">Presupuestado actual</span>
                    <span className="budget-projected-amount-value" style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                      {currency(currentBudget.total)}
                    </span>
                  </div>
                )}
                <div className="budget-projected-amount-col">
                  <span className="budget-projected-amount-label">Proyectado favorito</span>
                  <span className="budget-projected-amount-value" style={{ color: '#ea580c' }}>
                    {currency(favoriteBudget.total)}
                  </span>
                </div>
                <div className="budget-projected-amount-col">
                  <span className="budget-projected-amount-label">Por persona</span>
                  <span className="budget-projected-amount-value">
                    {currency(favoriteBudget.perPerson)}/p
                  </span>
                </div>
                <span className={`budget-projected-diff ${isCheaper ? 'cheaper' : 'pricier'}`}>
                  {isCheaper ? 'Ahorras ' : '+'}{currency(Math.abs(diffTotal))}
                </span>
              </div>
            </div>
            <button 
              className="budget-projected-apply-btn" 
              onClick={() => handleApplyFavorite(proj)}
              type="button"
            >
              <CheckCircle2 size={14} />
              Aplicar favorito al presupuesto
            </button>
          </div>
        )
      })}

      {/* Charts + Settle row */}
      <div className="budget-v2-charts-row">
        <div className="budget-v2-charts">
          {/* Donut */}
          <div className="budget-donut-wrap">
            <DonutChart segments={donutSegments} total={total} />
            <div className="donut-legend">
              {donutSegments.map((seg) => (
                <div key={seg.label} className="donut-legend-item">
                  <span className="donut-legend-dot" style={{ background: seg.color }} />
                  <span className="donut-legend-label">{seg.label}</span>
                  <span className="donut-legend-pct">{total ? Math.round((seg.value / total) * 100) : 0}%</span>
                  <span className="donut-legend-val">{currency(seg.value)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Day bar chart */}
          <div className="budget-day-chart">
            <p className="eyebrow">Gasto por día</p>
            <div className="day-bars">
              {dayBars.map((d) => (
                <div key={d.label} className="day-bar-col">
                  <div className="day-bar-wrap">
                    <div
                      className="day-bar-fill"
                      style={{ height: `${(d.value / maxDayBar) * 100}%` }}
                      title={currency(d.value)}
                    />
                    {d.value > 0 && (
                      <span className="day-bar-amount">{currency(d.value)}</span>
                    )}
                  </div>
                  <span className="day-bar-label">{d.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quién pagó qué */}
        <div className="budget-settle-panel">
          <div className="settle-head">
            <p className="eyebrow">Balances · Quién pagó qué</p>
            <p className="settle-note">Asigna el pagador en cada partida. El balance se actualiza en tiempo real.</p>
          </div>
          <div className="settle-rows">
            {settleData.filter((s) => s.paid > 0 || s.balance !== 0 - perPerson).map((s) => (
              <div key={s.id} className="settle-row">
                <span className="settle-name">{s.name}</span>
                <span className="settle-paid-total">{currency(s.paid)} pagado</span>
                <span className={`settle-balance ${s.balance >= 0 ? 'positive' : 'negative'}`}>
                  {s.balance >= 0 ? '+' : ''}{currency(s.balance)}
                </span>
              </div>
            ))}
            {Object.keys(paidByTotals).length === 0 && (
              <p className="settle-empty-note">Asigna pagadores en las partidas de abajo →</p>
            )}
          </div>
          <button className="settle-btn" onClick={() => setShowSettle(!showSettle)} type="button">
            {showSettle ? 'Ocultar resumen' : 'Cuadrar cuentas'}
          </button>
          {showSettle && (
            <div className="settle-result">
              {settleData.filter((s) => s.balance < 0).length === 0 ? (
                <p className="settle-ok">✓ Todo cuadrado</p>
              ) : (
                settleData.filter((s) => s.balance < 0).map((s) => {
                  const creditor = settleData.find((x) => x.balance > 0)
                  return creditor ? (
                    <p key={s.id}>
                      <strong>{s.name}</strong> debe <strong>{currency(Math.abs(s.balance))}</strong> a <strong>{creditor.name}</strong>
                    </p>
                  ) : null
                })
              )}
            </div>
          )}
        </div>
      </div>

      {/* View tabs */}
      <div className="budget-view-tabs">
        {['categoria', 'subgrupo', 'dia', 'ciudad'].map((v) => (
          <button
            key={v}
            className={budgetView === v ? 'active' : ''}
            onClick={() => setBudgetView(v)}
            type="button"
          >
            {v === 'categoria' ? 'Categoría' : v === 'subgrupo' ? 'Subgrupo' : v === 'dia' ? 'Por día' : 'Por ciudad'}
          </button>
        ))}
      </div>

      {/* Budget lines table */}
      <div className="budget-lines">
        {rows.map(({ option, budget }) => (
          <article key={option.id} className="budget-line">
            <span className={`budget-cat-badge ${option.category}`}>
              {categoryConfig[option.category]?.shortLabel || 'Opción'}
            </span>
            <div className="budget-line-info">
              <strong>{option.title}</strong>
              <small>{budget.travelers} personas · {groupSummary(currentTravelGroup)}</small>
            </div>
            <div className="budget-line-amounts">
              <strong>{budget.missing ? 'Por estimar' : currency(budget.total)}</strong>
              {!budget.missing && <span>{currency(budget.perPerson)}/p</span>}
            </div>
            <div className="budget-line-payer">
              <label className="payer-select-wrap" title="¿Quién pagó esto?">
                <select
                  value={paidBy[option.id] || ''}
                  onChange={(e) => setPayer(option.id, e.target.value)}
                >
                  <option value="">Pagador...</option>
                  {familyMembers.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="budget-line-paid">
              {option.priceTotal
                ? <span className="paid-badge">Pagado</span>
                : <span className="pending-badge">Sin pagar</span>}
            </div>
            <button className="budget-remove-btn" onClick={() => onRemove(option.id)} type="button" title="Quitar del presupuesto">
              ×
            </button>
          </article>
        ))}
        {(subgroupCandidates.length > 0 || subgroupBudgetOptions?.length > 0) && (
          <div className="budget-add-row">
            <p className="eyebrow">Añadir / quitar línea</p>
            <div className="budget-add-chips">
              {/* Already added via subgroup toggle — show quitar */}
              {(subgroupBudgetOptions || []).map((option) => (
                <button
                  key={option.id}
                  onClick={() => onToggleSubgroupBudget(option.id)}
                  type="button"
                  className="budget-add-chip added"
                  title="Quitar del presupuesto de subgrupo"
                >
                  <X size={12} aria-hidden="true" />
                  {option.code} · {option.title}
                </button>
              ))}
              {/* Candidates to add */}
              {subgroupCandidates.map((option) => (
                <button key={option.id} onClick={() => onToggleSubgroupBudget(option.id)} type="button" className="budget-add-chip">
                  <Plus size={12} aria-hidden="true" />
                  {option.code} · {option.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {rows.some((r) => r.budget.missing) && (
        <p className="budget-note">
          Algunas partidas no tienen precio. Pega el link o escribe el precio para que entren en el cálculo.
        </p>
      )}
    </div>
  )
}

// ── Group color palette for Gantt rows ────────────────────────────────────────
const GANTT_COLORS = [
  { bg: 'rgba(234,88,12,0.13)', border: '#ea580c', text: '#fdba74' },  // coral -> light orange text
  { bg: 'rgba(37,99,235,0.12)', border: '#2563eb', text: '#93c5fd' },  // blue (F1) -> light blue text
  { bg: 'rgba(13,148,136,0.12)', border: '#0d9488', text: '#5eead4' }, // teal (plan suave) -> light teal text
  { bg: 'rgba(124,58,237,0.12)', border: '#7c3aed', text: '#c084fc' }, // violet -> light violet text
  { bg: 'rgba(217,119,6,0.13)', border: '#d97706', text: '#fcd34d' },  // amber -> light amber text
]

function ganttEventForGroupDay(group, dayItem, dayIndex, allGroups) {
  // AI-generated subgroupPlans take priority
  if (dayItem.subgroupPlans?.length) {
    const match = dayItem.subgroupPlans.find(
      (sp) => sp.groupId === group.id || sp.groupName === group.name,
    )
    if (match) return { plan: match.plan, time: match.timeWindow }
  }
  // Static fallback based on known group ids
  const isF1Day = dayIndex === 1 || dayIndex === 3  // Vie 11, Dom 13
  if (!group.kind || group.kind !== 'subgroup') {
    // Main family group — always show family plan
    return { plan: dayItem.familyPlan || dayItem.title, time: null }
  }
  if (group.id === 'subgrupo-f1') {
    return isF1Day || dayItem.f1Plan
      ? { plan: dayItem.f1Plan || 'IFEMA / F1', time: `${group.startTime || '08:00'}–${group.endTime || '19:00'}` }
      : null
  }
  if (group.id === 'subgrupo-plan-suave') {
    return isF1Day
      ? { plan: dayItem.familyPlan || 'Plan suave', time: `${group.startTime || '10:30'}–${group.endTime || '17:30'}` }
      : null
  }
  // Ad-hoc subgroups: match by date if set
  if (group.date) {
    const dayStr = dayItem.date?.toLowerCase() || ''
    const gStr = group.date?.toLowerCase() || ''
    const overlap = dayStr.split(/[\s/]/).some((token) => gStr.includes(token) && token.length > 2)
    if (overlap) {
      return { plan: group.focus || group.name, time: group.startTime && group.endTime ? `${group.startTime}–${group.endTime}` : null }
    }
    return null
  }
  return null
}

function ItineraryPanel({
  activeTrip,
  activeTravelCities,
  availableOptions,
  busy,
  currentTravelGroup,
  f1Count,
  nights,
  onCreateSubgroup,
  onDeleteGroup,
  onGenerate,
  onToggleDraftMember,
  onUpdateDraft,
  onUpdateGroup,
  onUpdateDay,
  plan,
  subgroupDraft,
  travelGroups,
}) {
  const [selectedDay, setSelectedDay] = useState(0)
  const [showSubgroupForm, setShowSubgroupForm] = useState(false)
  const [itineraryView, setItineraryView] = useState('timeline') // 'timeline' or 'gantt'
  const [subgroupFilter, setSubgroupFilter] = useState('all') // 'all' or specific subgroup ID

  const days = plan?.days?.length
    ? plan.days
    : generateFallbackItinerary(activeTrip, activeTravelCities, travelGroups)

  const ganttGroups = travelGroups.filter(isPlanningGroup)
  const selectedDayData = days[selectedDay]

  // Detect conflicts: groups with overlapping times on same day
  const conflicts = []
  if (selectedDayData) {
    const active = ganttGroups
      .map((g) => ({ group: g, event: ganttEventForGroupDay(g, selectedDayData, selectedDay, ganttGroups) }))
      .filter((x) => x.event)
    if (active.length > 2) {
      conflicts.push(`${active.length} subgrupos activos este día — confirmar logística de traslados.`)
    }
    const f1Group = ganttGroups.find((g) => g.id === 'subgrupo-f1')
    if (f1Group && ganttEventForGroupDay(f1Group, selectedDayData, selectedDay, ganttGroups)) {
      conflicts.push('F1 termina ~19:00, Warner cierra 20:00. La cena a las 20:30 será justa.')
    }
  }

  // Stats
  const totalDays = days.length
  const splitDays = days.filter((day, i) => {
    const events = ganttGroups.map((g) => ganttEventForGroupDay(g, day, i, ganttGroups)).filter(Boolean)
    const plans = new Set(events.map((e) => e.plan))
    return plans.size > 1
  }).length

  const reuniones = ganttGroups.filter((g) => !g.kind || g.kind !== 'subgroup').length

  return (
    <div className="itinerary-panel gantt-view">
      {/* Toolbar */}
      <div className="itinerary-toolbar">
        <div>
          <p className="eyebrow">Itinerario · Viaje de la familia</p>
          <h2>{plan?.title || `${totalDays} días, varios planes en paralelo`}</h2>
          {plan?.summary ? <p className="gantt-plan-summary">{plan.summary}</p> : null}
        </div>
        <div className="itinerary-toolbar-btns" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* View switcher */}
          <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', padding: '3px', borderRadius: '20px' }}>
            <button
               className={`timeline-filter-btn ${itineraryView === 'timeline' ? 'active' : ''}`}
               style={{ border: 'none', background: itineraryView === 'timeline' ? 'var(--violet)' : 'transparent', color: itineraryView === 'timeline' ? '#09090b' : 'var(--ink)', padding: '4px 12px', fontSize: '0.7rem', borderRadius: '18px' }}
               onClick={() => setItineraryView('timeline')}
               type="button"
             >
               Línea de Tiempo
             </button>
             <button
               className={`timeline-filter-btn ${itineraryView === 'gantt' ? 'active' : ''}`}
               style={{ border: 'none', background: itineraryView === 'gantt' ? 'var(--violet)' : 'transparent', color: itineraryView === 'gantt' ? '#09090b' : 'var(--ink)', padding: '4px 12px', fontSize: '0.7rem', borderRadius: '18px' }}
               onClick={() => setItineraryView('gantt')}
               type="button"
             >
               Vista Gantt
             </button>
           </div>

          <button
            className="secondary-button compact"
            onClick={() => setShowSubgroupForm((v) => !v)}
            type="button"
          >
            <Layers size={15} aria-hidden="true" />
            Dividir día
          </button>
          <button className="primary-button compact" disabled={busy} onClick={onGenerate} type="button">
            {busy ? <Loader2 size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
            Generar con IA
          </button>
        </div>
      </div>

      {itineraryView === 'timeline' ? (
        <div className="timeline-view-container">
          {/* Subgroup Filter Toolbar */}
          <div className="timeline-nav-filters">
            <div>
              <p className="eyebrow" style={{ margin: 0 }}>Filtros de Subgrupo</p>
            </div>
            <div className="timeline-filter-buttons">
              <button
                className={`timeline-filter-btn ${subgroupFilter === 'all' ? 'active' : ''}`}
                onClick={() => setSubgroupFilter('all')}
                type="button"
              >
                Todos
              </button>
              {travelGroups.filter(isPlanningGroup).map((group) => {
                let extraClass = ''
                if (group.id === 'subgrupo-f1') extraClass = 'subgroup-f1-btn'
                if (group.id === 'subgrupo-plan-suave') extraClass = 'subgroup-plan-suave-btn'
                
                return (
                  <button
                    key={group.id}
                    className={`timeline-filter-btn ${extraClass} ${subgroupFilter === group.id ? 'active' : ''}`}
                    onClick={() => setSubgroupFilter(group.id)}
                    type="button"
                  >
                    {group.name}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Timeline Layout */}
          <div className="timeline-layout">
            {days.map((day, di) => {
              const activePlans = []
              const showFamily = subgroupFilter === 'all' || subgroupFilter === 'familia-sept-2026'
              const showF1 = subgroupFilter === 'all' || subgroupFilter === 'subgrupo-f1'
              const showPlanSuave = subgroupFilter === 'all' || subgroupFilter === 'subgrupo-plan-suave'

              if (showFamily && (day.familyPlan || day.title)) {
                activePlans.push({
                  groupId: 'familia-sept-2026',
                  groupName: 'General / Todo el grupo',
                  planClass: 'family',
                  text: day.familyPlan || day.title,
                  time: null,
                })
              }

              const isF1Day = di === 1 || di === 3 || day.f1Plan
              if (showF1 && isF1Day) {
                activePlans.push({
                  groupId: 'subgrupo-f1',
                  groupName: 'Subgrupo F1',
                  planClass: 'f1',
                  text: day.f1Plan || 'Entrenamientos / GP de F1',
                  time: '08:00–19:00',
                })
              }

              if (showPlanSuave && isF1Day) {
                activePlans.push({
                  groupId: 'subgrupo-plan-suave',
                  groupName: 'Plan suave con niños',
                  planClass: 'plan-suave',
                  text: day.familyPlan || 'Paseo tranquilo, parques y comidas con calma',
                  time: '10:30–17:30',
                })
              }

              if (day.subgroupPlans?.length) {
                day.subgroupPlans.forEach((sp) => {
                  const alreadyAdded = activePlans.some(p => p.groupId === sp.groupId)
                  if (!alreadyAdded) {
                    const group = travelGroups.find(g => g.id === sp.groupId || g.name === sp.groupName)
                    const isVisible = subgroupFilter === 'all' || subgroupFilter === sp.groupId || (group && subgroupFilter === group.id)
                    if (isVisible) {
                      let planClass = 'family'
                      if (sp.groupId === 'subgrupo-f1' || sp.groupName?.toLowerCase().includes('f1')) planClass = 'f1'
                      else if (sp.groupId === 'subgrupo-plan-suave' || sp.groupName?.toLowerCase().includes('suave')) planClass = 'plan-suave'
                      
                      activePlans.push({
                        groupId: sp.groupId,
                        groupName: sp.groupName,
                        planClass: planClass,
                        text: sp.plan,
                        time: sp.timeWindow,
                      })
                    }
                  }
                })
              }

              const rawEnergy = (day.energyLevel || 'Media').toLowerCase()
              let energyClass = 'media'
              let energyLabel = '⚡⚡ Media'
              if (rawEnergy.includes('baja') || rawEnergy === 'baja') {
                energyClass = 'baja'
                energyLabel = '⚡ Baja'
              } else if (rawEnergy.includes('alta') || rawEnergy === 'alta') {
                energyClass = 'alta'
                energyLabel = '⚡⚡⚡ Alta'
              }

              return (
                <div key={day.date} className="timeline-day-node">
                  <div className="timeline-node-marker">
                    <div className="timeline-node-dot" />
                  </div>
                  <div
                    className={`timeline-day-card ${selectedDay === di ? 'selected' : ''}`}
                    onClick={() => setSelectedDay(di)}
                  >
                    <div className="timeline-day-head">
                      <div className="timeline-day-title-area">
                        <span className="timeline-day-date">{day.date}</span>
                        <h4 className="timeline-day-title">{day.title}</h4>
                        <span className="timeline-day-city">📍 {day.city}</span>
                      </div>
                      <div className="timeline-badges">
                        <span className={`energy-badge ${energyClass}`}>
                          {energyLabel}
                        </span>
                      </div>
                    </div>

                    {activePlans.length > 0 ? (
                      <div className="timeline-plans-stack">
                        {activePlans.map((plan, pi) => (
                          <div key={pi} className={`timeline-plan-card ${plan.planClass}`}>
                            <span className={`timeline-plan-group-name ${plan.planClass}`}>
                              {plan.groupName}
                            </span>
                            <p className="timeline-plan-text">{plan.text}</p>
                            {plan.time && (
                              <span className="timeline-plan-time">🕒 {plan.time}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="timeline-plan-text" style={{ fontStyle: 'italic', opacity: 0.6, margin: '10px 0' }}>
                        Sin planes asignados para este filtro.
                      </p>
                    )}

                    {selectedDay === di && (
                      <div className="timeline-details-drawer">
                        <form className="day-inline-editor-form" onSubmit={(e) => e.preventDefault()}>
                          <div className="editor-row">
                            <label style={{ flex: 2 }}>
                              <span>Título del día</span>
                              <input
                                className="timeline-detail-input"
                                type="text"
                                value={day.title || ''}
                                onChange={(e) => onUpdateDay && onUpdateDay(di, { title: e.target.value })}
                                placeholder="Ej. Llegada + Instalación"
                              />
                            </label>
                            <label style={{ flex: 1 }}>
                              <span>Nivel de Energía</span>
                              <select
                                className="timeline-detail-select"
                                value={day.energyLevel || 'Media'}
                                onChange={(e) => onUpdateDay && onUpdateDay(di, { energyLevel: e.target.value })}
                              >
                                <option value="Baja">⚡ Baja</option>
                                <option value="Media">⚡⚡ Media</option>
                                <option value="Alta">⚡⚡⚡ Alta</option>
                              </select>
                            </label>
                          </div>

                          <div className="editor-row">
                            <label>
                              <span>Plan Familiar / General</span>
                              <textarea
                                className="timeline-detail-textarea"
                                value={day.familyPlan || ''}
                                onChange={(e) => onUpdateDay && onUpdateDay(di, { familyPlan: e.target.value })}
                                placeholder="Actividades principales para todo el grupo..."
                              />
                            </label>
                            <label>
                              <span>Plan F1 / Paralelo</span>
                              <textarea
                                className="timeline-detail-textarea"
                                value={day.f1Plan || ''}
                                onChange={(e) => onUpdateDay && onUpdateDay(di, { f1Plan: e.target.value })}
                                placeholder="Planes específicos de subgrupos o F1..."
                              />
                            </label>
                          </div>

                          <div className="editor-row three-cols">
                            <label>
                              <span>🍽️ Ideas de Comida</span>
                              <textarea
                                className="timeline-detail-textarea"
                                value={day.foodIdea || ''}
                                onChange={(e) => onUpdateDay && onUpdateDay(di, { foodIdea: e.target.value })}
                                placeholder="Restaurantes, picnics, reservas..."
                              />
                            </label>
                            <label>
                              <span>🗺️ Ruta y Logística</span>
                              <textarea
                                className="timeline-detail-textarea"
                                value={day.routeNotes || ''}
                                onChange={(e) => onUpdateDay && onUpdateDay(di, { routeNotes: e.target.value })}
                                placeholder="Trayectos, parking, metros, tiempos..."
                              />
                            </label>
                            <label>
                              <span>☂️ Plan de Respaldo</span>
                              <textarea
                                className="timeline-detail-textarea"
                                value={day.backup || ''}
                                onChange={(e) => onUpdateDay && onUpdateDay(di, { backup: e.target.value })}
                                placeholder="Si llueve o hay cansancio..."
                              />
                            </label>
                          </div>
                        </form>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          {/* Gantt Grid */}
          <div className="gantt-grid">
            {/* Corner + Day headers */}
            <div className="gantt-row gantt-header">
              <div className="gantt-group-col" />
              {days.map((day, i) => (
                <button
                  key={day.date}
                  className={`gantt-day-header ${selectedDay === i ? 'active' : ''}`}
                  onClick={() => setSelectedDay(i)}
                  type="button"
                >
                  <span className="gantt-day-name">{day.date}</span>
                  <span className="gantt-day-city">{day.city}</span>
                </button>
              ))}
            </div>

            {/* Group rows */}
            {ganttGroups.map((group, gi) => {
              const colors = GANTT_COLORS[gi % GANTT_COLORS.length]
              return (
                <div key={group.id} className="gantt-row">
                  <div className="gantt-group-col">
                    <span className="gantt-group-dot" style={{ background: colors.border }} />
                    <div>
                      <strong>{group.name}</strong>
                      <small>{groupSummary(group)}</small>
                    </div>
                  </div>
                  {days.map((day, di) => {
                    const event = ganttEventForGroupDay(group, day, di, ganttGroups)
                    return (
                      <div
                        key={`${group.id}-${di}`}
                        className={`gantt-cell ${selectedDay === di ? 'gantt-cell-active' : ''}`}
                        onClick={() => setSelectedDay(di)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === 'Enter' && setSelectedDay(di)}
                      >
                        {event ? (
                          <div
                            className="gantt-event"
                            style={{ background: colors.bg, borderLeft: `3px solid ${colors.border}`, color: colors.text }}
                          >
                            {event.time && <span className="gantt-event-time">{event.time}</span>}
                            <span className="gantt-event-plan">{event.plan}</span>
                          </div>
                        ) : (
                          <div className="gantt-cell-empty" />
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>

          {/* Day detail + Summary sidebar */}
          {selectedDayData && (
            <div className="gantt-detail-row">
              {/* Day detail */}
              <div className="gantt-detail-main">
                <div className="gantt-detail-header">
                  <p className="eyebrow">Detalle del día</p>
                  <h3>{selectedDayData.date} · día {splitDays > 0 ? 'dividido' : 'completo'}</h3>
                </div>
                <div className="gantt-detail-cards">
                  {ganttGroups.map((group, gi) => {
                    const event = ganttEventForGroupDay(group, selectedDayData, selectedDay, ganttGroups)
                    if (!event) return null
                    const colors = GANTT_COLORS[gi % GANTT_COLORS.length]
                    return (
                      <article
                        key={group.id}
                        className="gantt-detail-card"
                        style={{ borderTop: `3px solid ${colors.border}` }}
                      >
                        <div className="gantt-detail-card-head">
                          <strong>{group.name}</strong>
                          <span className="gantt-detail-members">{groupSummary(group)}</span>
                        </div>
                        {event.time && <span className="gantt-detail-time">{event.time}</span>}
                        <p>{event.plan}</p>
                        {selectedDayData.foodIdea && <small>🍽️ {selectedDayData.foodIdea}</small>}
                        {selectedDayData.routeNotes && <small>🗺️ {selectedDayData.routeNotes}</small>}
                      </article>
                    )
                  })}
                </div>
              </div>

              {/* Right sidebar */}
              <aside className="gantt-day-sidebar">
                {conflicts.length > 0 && (
                  <div className="gantt-conflicts">
                    <p className="eyebrow">
                      <AlertTriangle size={12} aria-hidden="true" />
                      Conflictos del día
                    </p>
                    {conflicts.map((c) => (
                      <p key={c} className="gantt-conflict-item">{c}</p>
                    ))}
                  </div>
                )}
                <div className="gantt-summary-box">
                  <p className="eyebrow">Resumen</p>
                  <div className="gantt-summary-rows">
                    <div><span>{totalDays} días</span><strong>Duración</strong></div>
                    <div><span>{splitDays} ({splitDays === 1 ? 'sáb' : 'días'})</span><strong>Días con split</strong></div>
                    <div><span>{reuniones}</span><strong>Reuniones grupo</strong></div>
                  </div>
                </div>
              </aside>
            </div>
          )}
        </>
      )}

      {/* Open questions */}
      {plan?.openQuestions?.length ? (
        <div className="itinerary-questions">
          <strong>Dudas para cerrar</strong>
          <ul>{plan.openQuestions.map((q) => <li key={q}>{q}</li>)}</ul>
        </div>
      ) : null}

      {/* Subgroup form (collapsed by default) */}
      {showSubgroupForm && (
        <SubgroupPlanner
          availableOptions={availableOptions}
          currentTravelGroup={currentTravelGroup}
          f1Count={f1Count}
          groups={travelGroups}
          nights={nights}
          onCreate={onCreateSubgroup}
          onDeleteGroup={onDeleteGroup}
          onToggleDraftMember={onToggleDraftMember}
          onUpdateDraft={onUpdateDraft}
          onUpdateGroup={onUpdateGroup}
          subgroupDraft={subgroupDraft}
        />
      )}
    </div>
  )
}

function SubgroupPlanner({
  availableOptions,
  currentTravelGroup,
  f1Count,
  groups,
  nights,
  onCreate,
  onDeleteGroup,
  onToggleDraftMember,
  onUpdateDraft,
  onUpdateGroup,
  subgroupDraft,
}) {
  const planningGroups = groups.filter(isPlanningGroup)

  return (
    <div className="subgroup-preview">
      <div>
        <p className="eyebrow">Subgrupos</p>
        <h3>Carriles con horario, foco y subpresupuesto propio.</h3>
      </div>
      <form className="subgroup-form" onSubmit={onCreate}>
        <label>
          <span>Nombre</span>
          <input
            onChange={(event) => onUpdateDraft('name', event.target.value)}
            placeholder="Ej. F1 viernes, plan niños..."
            type="text"
            value={subgroupDraft.name}
          />
        </label>
        <label>
          <span>Fecha</span>
          <input
            onChange={(event) => onUpdateDraft('date', event.target.value)}
            type="date"
            value={subgroupDraft.date}
          />
        </label>
        <label>
          <span>Inicio</span>
          <input
            onChange={(event) => onUpdateDraft('startTime', event.target.value)}
            type="time"
            value={subgroupDraft.startTime}
          />
        </label>
        <label>
          <span>Fin</span>
          <input
            onChange={(event) => onUpdateDraft('endTime', event.target.value)}
            type="time"
            value={subgroupDraft.endTime}
          />
        </label>
        <label className="wide">
          <span>Foco</span>
          <input
            onChange={(event) => onUpdateDraft('focus', event.target.value)}
            placeholder="Qué debe cuidar la IA: ritmo, reservas, traslados, presupuesto..."
            type="text"
            value={subgroupDraft.focus}
          />
        </label>
        <div className="member-picker wide" aria-label="Integrantes del subgrupo">
          {familyMembers.map((member) => (
            <button
              className={subgroupDraft.memberIds.includes(member.id) ? 'active' : ''}
              key={member.id}
              onClick={() => onToggleDraftMember(member.id)}
              type="button"
            >
              {member.name}
            </button>
          ))}
        </div>
        <button className="primary-button compact" type="submit">
          <Plus size={18} aria-hidden="true" />
          Crear subgrupo
        </button>
      </form>
      <div className="subgroup-rails">
        {planningGroups.map((group) => {
          const subgroupRows = (group.budgetOptionIds || [])
            .map((optionId) => availableOptions.find((option) => option.id === optionId))
            .filter(Boolean)
            .map((option) => optionBudget(option, group, f1Count, nights))
          const total = subgroupRows.reduce((sum, budget) => sum + (budget.total || 0), 0)
          return (
          <article className={group.id === currentTravelGroup.id ? 'active' : ''} key={group.id}>
            <div className="subgroup-rail-head">
              <input
                className="subgroup-name-input-editable"
                type="text"
                value={group.name}
                onChange={(event) => onUpdateGroup(group.id, { name: event.target.value })}
                placeholder="Nombre del subgrupo"
              />
              <span>{groupSummary(group)}</span>
              {onDeleteGroup && (
                <button
                  aria-label={`Eliminar subgrupo ${group.name}`}
                  className="subgroup-delete-btn"
                  onClick={() => {
                    if (window.confirm(`¿Eliminar el subgrupo "${group.name}"?`)) {
                      onDeleteGroup(group.id)
                    }
                  }}
                  title="Eliminar subgrupo"
                  type="button"
                >
                  <Trash2 size={13} aria-hidden="true" />
                </button>
              )}
            </div>
            <div className="subgroup-avatar-edit-row">
              {familyMembers.map((member) => {
                const isActive = group.memberIds.includes(member.id)
                return (
                  <button
                    key={member.id}
                    className={`mini-avatar-toggle-btn ${isActive ? 'active' : ''}`}
                    type="button"
                    onClick={() => {
                      const newMemberIds = isActive
                        ? group.memberIds.filter((id) => id !== member.id)
                        : [...group.memberIds, member.id]
                      onUpdateGroup(group.id, { memberIds: newMemberIds })
                    }}
                    title={member.name}
                  >
                    <MiniAvatar active={isActive} member={member} />
                  </button>
                )
              })}
            </div>
            <div className="subgroup-schedule">
              <label>
                <span>Fecha</span>
                <input
                  onChange={(event) => onUpdateGroup(group.id, { date: event.target.value })}
                  type="date"
                  value={group.date || ''}
                />
              </label>
              <label>
                <span>Inicio</span>
                <input
                  onChange={(event) => onUpdateGroup(group.id, { startTime: event.target.value })}
                  type="time"
                  value={group.startTime || ''}
                />
              </label>
              <label>
                <span>Fin</span>
                <input
                  onChange={(event) => onUpdateGroup(group.id, { endTime: event.target.value })}
                  type="time"
                  value={group.endTime || ''}
                />
              </label>
            </div>
            <textarea
              onChange={(event) => onUpdateGroup(group.id, { focus: event.target.value, note: event.target.value })}
              placeholder="Foco para el itinerario IA"
              value={group.focus || group.note || ''}
            />
            <p>
              {total ? `Subpresupuesto: ${currency(total)}` : 'Subpresupuesto sin partidas todavía.'}
            </p>
          </article>
          )
        })}
      </div>
    </div>
  )
}

export default App
