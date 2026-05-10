import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CalendarDays,
  Car,
  CheckCircle2,
  CircleDollarSign,
  CloudOff,
  Footprints,
  Heart,
  Home,
  Hotel,
  Landmark,
  Loader2,
  LogIn,
  LogOut,
  MapPinned,
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
} from 'lucide-react'
import './App.css'
import {
  categoryConfig,
  cityIdeas,
  familyMembers,
  familyProfiles,
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
  analyzeOptionWithAI,
  generateItineraryWithAI,
  suggestTransferWithAI,
  suggestFoodWithAI,
  suggestLodgingWithAI,
} from './services/aiFunctions'
import {
  canUseFirestore,
  saveOptionVotes,
  saveSearchRequest,
  saveTripOption,
  saveTravelCity,
  saveTravelGroup,
  saveUserProfile,
  seedInitialTripOptions,
  seedInitialTravelCities,
  seedInitialTravelGroups,
  subscribeTripOptions,
  subscribeTravelCities,
  subscribeTravelGroups,
  subscribeVotes,
  updateTravelCityStatus,
  updateTripOptionStatus,
} from './services/tripRepository'

const tabs = [
  { id: 'lodging', icon: Home },
  { id: 'activities', icon: Landmark },
  { id: 'food', icon: Utensils },
  { id: 'transport', icon: TrainFront },
  { id: 'itinerary', icon: Route },
  { id: 'budget', icon: CircleDollarSign },
]

const targetLabels = {
  family: 'Toda la familia',
  f1: 'Grupo F1',
  'non-f1': 'Planes sin F1',
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
}

const citySuggestionNames = [
  'Madrid',
  'Barcelona',
  'Valencia',
  'Sevilla',
  'París',
  'Lisboa',
  'Bilbao',
  'Granada',
  'Málaga',
]

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

function cityKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

  return {
    id: `${slug || 'ciudad'}-${Date.now()}`,
    city: draft.city.trim(),
    country: draft.country.trim() || 'Por definir',
    dates: draft.dates.trim() || 'Fechas por definir',
    transfer: draft.transfer.trim() || 'Traslado por definir',
    angle: draft.angle.trim() || 'Pendiente de analizar con IA',
    coords: draft.coords || obviousCityDefaults[cityKey(draft.city)]?.coords || null,
    readiness: 18,
    status: 'active',
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

function buildFamilyProfileDraft(draft) {
  const slug = draft.name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

  const childrenAges = draft.childrenAges
    .split(',')
    .map((age) => Number(age.trim()))
    .filter((age) => Number.isFinite(age) && age > 0 && age < 18)

  return {
    id: `${slug || 'grupo'}-${Date.now()}`,
    name: draft.name.trim(),
    adults: Math.max(1, Number(draft.adults) || 1),
    childrenAges,
    note: draft.note.trim() || 'Grupo personalizado',
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

function groupSummary(profile) {
  const children = profile.childrenAges?.length || 0
  const total = (Number(profile.adults) || 0) + children
  return `${total} viajeros · ${profile.adults} adultos · ${children} niños`
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
  return place.name || place.displayName?.text || 'Lugar sugerido'
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

function mergeOption(current, option) {
  return [option, ...current.filter((item) => item.id !== option.id)]
}

function App() {
  const [activeTab, setActiveTab] = useState('lodging')
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
  const [options, setOptions] = useState(initialOptions)
  const [travelCities, setTravelCities] = useState(cityIdeas)
  const [travelGroups, setTravelGroups] = useState(familyProfiles)
  const [activeTravelGroupId, setActiveTravelGroupId] = useState('familia-sept-2026')
  const [votes, setVotes] = useState({
    'lodging-m': ['camilo'],
    'lodging-b': ['juliana-bueno'],
    'activity-retiro': ['cielo'],
  })
  const [draft, setDraft] = useState({
    title: '',
    url: '',
    category: 'lodging',
    city: 'Madrid',
    targetGroup: 'family',
    priceTotal: '',
    priceNight: '',
    notes: '',
  })
  const [cityDraft, setCityDraft] = useState({
    city: '',
    country: '',
    dates: '',
    transfer: '',
    angle: '',
    coords: null,
  })
  const [familyProfileDraft, setFamilyProfileDraft] = useState({
    name: '',
    adults: 2,
    childrenAges: '',
    note: '',
  })
  const [searchDraft, setSearchDraft] = useState({
    city: 'Madrid',
    dates: '10-14 sep 2026',
    type: 'lodging',
    notes: '9 personas, presupuesto 300-600 EUR/noche, buena movilidad familiar',
  })
  const [searchResult, setSearchResult] = useState(null)
  const [places, setPlaces] = useState([])
  const [placesBusy, setPlacesBusy] = useState(false)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiFeedback, setAiFeedback] = useState(null)
  const [itineraryBusy, setItineraryBusy] = useState(false)
  const [generatedItinerary, setGeneratedItinerary] = useState(null)
  const [externalLink, setExternalLink] = useState('')
  const [externalPriceTotal, setExternalPriceTotal] = useState('')
  const [externalPriceNight, setExternalPriceNight] = useState('')
  const [externalBusy, setExternalBusy] = useState(false)
  const [budgetOptionIds, setBudgetOptionIds] = useState(['lodging-m'])
  const [transferDraft, setTransferDraft] = useState({
    origin: 'Madrid',
    destination: 'París',
    date: '14 sep 2026',
    pricePerPerson: '',
    notes: 'Comparar tren, bus y avión para el grupo',
  })
  const [transferResult, setTransferResult] = useState(null)
  const [transferBusy, setTransferBusy] = useState(false)

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
  const activeContributorIsAdult = isAdultMember(activeMember)
  const currentTravelGroup = useMemo(
    () =>
      travelGroups.find((profile) => profile.id === activeTravelGroupId) ||
      travelGroups[0] ||
      familyProfiles[0],
    [activeTravelGroupId, travelGroups],
  )
  const activeTravelCities = useMemo(
    () => travelCities.filter((idea) => idea.status !== 'removed'),
    [travelCities],
  )
  const cityFilters = useMemo(
    () => ['Todas', 'Madrid', ...activeTravelCities.map((idea) => idea.city)]
      .filter((city, index, list) => city && list.indexOf(city) === index),
    [activeTravelCities],
  )
  const effectiveSelectedCity = cityFilters.includes(selectedCity) ? selectedCity : 'Todas'
  const budgetOptions = useMemo(
    () =>
      budgetOptionIds
        .map((optionId) => options.find((option) => option.id === optionId))
        .filter(Boolean),
    [budgetOptionIds, options],
  )
  const budgetNights = estimateNightsFromDates(searchDraft.dates)

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
      .then(() =>
        Promise.all([
          seedInitialTripOptions(currentUser),
          seedInitialTravelCities(currentUser),
          seedInitialTravelGroups(currentUser),
        ]),
      )
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

    const unsubscribeCities = subscribeTravelCities(
      (nextCities) => {
        if (active && nextCities.length) setTravelCities(nextCities)
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
      (nextGroups) => {
        if (!active || !nextGroups.length) return
        setTravelGroups(nextGroups)
        if (!nextGroups.some((profile) => profile.id === activeTravelGroupId)) {
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

    return () => {
      active = false
      unsubscribeOptions()
      unsubscribeVotes()
      unsubscribeCities()
      unsubscribeGroups()
    }
  }, [activeMember, activeTravelGroupId, currentUser])

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
          option.city === (effectiveSelectedCity === 'Todas' ? 'Madrid' : effectiveSelectedCity) &&
          option.map &&
          option.category !== 'itinerary',
      ),
    [effectiveSelectedCity, options],
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

  function updateFamilyProfileDraft(field, value) {
    setFamilyProfileDraft((current) => ({ ...current, [field]: value }))
  }

  function updateTransferDraft(field, value) {
    setTransferDraft((current) => ({ ...current, [field]: value }))
  }

  function toggleBudgetOption(optionId) {
    setBudgetOptionIds((current) =>
      current.includes(optionId)
        ? current.filter((item) => item !== optionId)
        : [...current, optionId],
    )
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
    setTravelCities(cityIdeas)
    setTravelGroups(familyProfiles)
    setActiveTravelGroupId('familia-sept-2026')
    setVotes({
      'lodging-m': ['camilo'],
      'lodging-b': ['juliana-bueno'],
      'activity-retiro': ['cielo'],
    })
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
          ...draft,
          dates: searchDraft.dates,
          isAdultContributor: activeContributorIsAdult,
          selectedMemberId: activeMember,
          groupProfile: currentTravelGroup,
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
      await saveTripOption(option, currentUser)
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

    const city = buildCityDraft(cityDraft)
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
    })

    if (canSync) {
      await saveTravelCity(city, currentUser)
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
      updateTravelCityStatus(cityId, 'removed', currentUser).catch((error) => {
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

  async function addTravelGroup(event) {
    event.preventDefault()
    if (!familyProfileDraft.name.trim()) return

    const profile = buildFamilyProfileDraft(familyProfileDraft)
    setTravelGroups((current) => [profile, ...current])
    setActiveTravelGroupId(profile.id)
    setFamilyProfileDraft({
      name: '',
      adults: 2,
      childrenAges: '',
      note: '',
    })

    if (canSync) {
      await saveTravelGroup(profile, currentUser)
    }
  }

  async function createLodgingSearch(event) {
    event.preventDefault()
    if (searchDraft.type === 'food') {
      await findFoodPlaces()
      return
    }
    if (searchDraft.type === 'transport') {
      await createTransferSearch()
      return
    }

    if (canSync) {
      setPlaces([])
      setSearchResult({
        id: `search-${Date.now()}`,
        type: 'lodging',
        city: searchDraft.city,
        status: 'working',
        notes: 'La IA está preparando búsquedas y criterios de comparación.',
        links: [],
      })

      try {
        const result = await suggestLodgingWithAI({
          ...searchDraft,
          groupProfile: currentTravelGroup,
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
      type: searchDraft.type,
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
      await saveSearchRequest(request, currentUser)
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
    setBudgetOptionIds((current) => [...new Set([...current, option.id])])
    setActiveTab('budget')

    if (canSync) {
      await saveTripOption(option, currentUser)
    }
  }

  async function findFoodPlaces() {
    setPlacesBusy(true)
    setPlaces([])

    if (canSync) {
      try {
        const result = await suggestFoodWithAI({
          ...searchDraft,
          groupProfile: currentTravelGroup,
        })
        setPlaces(result.places || [])
        setSearchResult({
          id: result.id,
          type: 'food',
          city: result.city,
          status: 'ready',
          notes: result.analysis?.summary || 'Sugerencias de comida obtenidas con IA y Google Places.',
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
      const google = await loadGoogleMaps()
      const service = new google.maps.places.PlacesService(document.createElement('div'))
      const query = `restaurantes familiares bien valorados en ${searchDraft.city || 'Madrid'}`

      service.textSearch(
        {
          query,
          region: 'es',
        },
        (results, status) => {
          setPlacesBusy(false)
          if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
            setSearchResult({
              id: `places-${Date.now()}`,
              type: 'food',
              city: searchDraft.city,
              status: 'error',
              notes: `Google Places respondió: ${status}`,
              links: [],
            })
            return
          }

          setPlaces(results.slice(0, 6))
          setSearchResult({
            id: `places-${Date.now()}`,
            type: 'food',
            city: searchDraft.city,
            status: 'ready',
            notes: 'Sugerencias de comida obtenidas con Google Maps Places.',
            links: [],
          })
        },
      )
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

  async function addPlaceOption(place) {
    const name = getPlaceName(place)
    const placeId = getPlaceId(place)
    const address = getPlaceAddress(place)
    const location = getPlaceLocation(place)
    const reviews = getPlaceReviews(place)
    const photo = place.photos?.[0]?.getUrl?.({ maxWidth: 1200, maxHeight: 800 }) || ''
    const option = {
      id: `food-${placeId || Date.now()}`,
      code: 'GM',
      category: 'food',
      title: name,
      source: 'Google Maps',
      city: searchDraft.city || 'Madrid',
      status: activeContributorIsAdult ? 'active' : 'pending',
      url: getPlaceUrl(place),
      image: photo,
      priceNight: null,
      priceTotal: null,
      rating: place.rating ? `${place.rating}/5` : 'Sin rating',
      reviews: reviews || null,
      capacity: 'Por validar reserva para grupo',
      transit: 'Ruta por calcular',
      targetGroup: 'family',
      aiScore: place.score || Math.min(92, Math.round((place.rating || 4) * 18)),
      map: { x: 50, y: 58 },
      coords: location,
      highlights: [address || 'Dirección pendiente', place.why || 'Sugerido con Google Maps Places'],
      cautions: [place.caution || 'Verificar reserva, precio y comodidad para niños'],
    }

    setOptions((current) => mergeOption(current, option))
    setActiveTab('food')

    if (canSync) {
      await saveTripOption(option, currentUser)
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

  async function generateSmartItinerary() {
    if (!canSync) {
      setGeneratedItinerary({
        title: 'Itinerario base',
        summary: 'Inicia sesión con Firebase activo para generar itinerarios con IA.',
        days: itineraryDraft.map((item) => ({
          date: item.day,
          city: item.city,
          title: item.title,
          familyPlan: item.family,
          f1Plan: item.f1,
          foodIdea: 'Por definir',
          routeNotes: 'Por calcular',
          backup: 'Mantener plan flexible',
          energyLevel: 'Media',
        })),
        openQuestions: ['Conectar IA para recalcular con opciones actuales'],
      })
      return
    }

    setItineraryBusy(true)
    try {
      const result = await generateItineraryWithAI({
        city: effectiveSelectedCity === 'Todas' ? 'Madrid' : effectiveSelectedCity,
        dates: searchDraft.dates,
        routeMode,
        groupProfile: currentTravelGroup,
      })
      setGeneratedItinerary(result)
      setActiveTab('itinerary')
    } catch (error) {
      setGeneratedItinerary({
        title: 'Itinerario pendiente',
        summary: error.message,
        days: itineraryDraft.map((item) => ({
          date: item.day,
          city: item.city,
          title: item.title,
          familyPlan: item.family,
          f1Plan: item.f1,
          foodIdea: 'Por definir',
          routeNotes: 'Por calcular',
          backup: 'Mantener plan flexible',
          energyLevel: 'Media',
        })),
        openQuestions: ['Reintentar cuando Functions/Vertex AI esté disponible'],
      })
    } finally {
      setItineraryBusy(false)
    }
  }

  if (!authReady) {
    return (
      <main className="login-screen">
        <div className="login-panel">
          <Loader2 size={28} aria-hidden="true" />
          <h1>Preparando el viaje familiar</h1>
          <p>Estamos conectando Firebase y la app del viaje.</p>
        </div>
      </main>
    )
  }

  if (!currentUser) {
    return (
      <LoginScreen
        canLogin={isFirebaseConfigured}
        firebaseStatus={firebaseStatus}
        onSignIn={handleSignIn}
      />
    )
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
          <strong>
            {memberName(activeMember)} · {activeContributorIsAdult ? 'agrega directo' : 'requiere revisión'}
          </strong>
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

          <div className="panel-block travel-group">
            <h2>Grupo de viaje</h2>
            <label>
              <span>Perfil activo</span>
              <select
                onChange={(event) => setActiveTravelGroupId(event.target.value)}
                value={currentTravelGroup.id}
              >
                {travelGroups.map((profile) => (
                  <option key={profile.id} value={profile.id}>
                    {profile.name}
                  </option>
                ))}
              </select>
            </label>
            <p>{groupSummary(currentTravelGroup)}</p>
            <small>{currentTravelGroup.note}</small>
            <form className="mini-group-form" onSubmit={addTravelGroup}>
              <input
                onChange={(event) => updateFamilyProfileDraft('name', event.target.value)}
                placeholder="Nuevo grupo"
                type="text"
                value={familyProfileDraft.name}
              />
              <input
                min="1"
                onChange={(event) => updateFamilyProfileDraft('adults', event.target.value)}
                type="number"
                value={familyProfileDraft.adults}
              />
              <input
                onChange={(event) => updateFamilyProfileDraft('childrenAges', event.target.value)}
                placeholder="Edades niños: 9, 5"
                type="text"
                value={familyProfileDraft.childrenAges}
              />
              <input
                onChange={(event) => updateFamilyProfileDraft('note', event.target.value)}
                placeholder="Nota"
                type="text"
                value={familyProfileDraft.note}
              />
              <button type="submit">
                <Plus size={15} aria-hidden="true" />
                Guardar
              </button>
            </form>
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
                <CityFilterChip
                  active={effectiveSelectedCity === city}
                  city={city}
                  key={city}
                  onRemove={removeCityByName}
                  onSelect={selectCityFilter}
                  removable={city !== 'Todas' && city !== 'Madrid'}
                />
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

          {activeTab === 'budget' ? (
            <BudgetPanel
              budgetOptions={budgetOptions}
              currentTravelGroup={currentTravelGroup}
              f1Count={f1Crew.length}
              nights={budgetNights}
              onRemove={toggleBudgetOption}
            />
          ) : activeTab === 'itinerary' ? (
            <ItineraryPanel
              busy={itineraryBusy}
              onGenerate={generateSmartItinerary}
              plan={generatedItinerary}
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
          ) : (
            <OptionGrid
              activeCategory={activeCategory}
              activeMember={activeMember}
              onRemove={removeOption}
              onRestore={restoreOption}
              onToggleBudget={toggleBudgetOption}
              onVote={toggleVote}
              options={visibleOptions}
              budgetOptionIds={budgetOptionIds}
              nights={budgetNights}
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
              <h2>{currentMapCity.city}: opciones y planes</h2>
            </div>
          </div>
          <div className="route-mode-control" aria-label="Modo de ruta">
            {Object.entries(routeModes).map(([mode, config]) => {
              const Icon = config.icon
              return (
                <button
                  className={routeMode === mode ? 'active' : ''}
                  key={mode}
                  onClick={() => setRouteMode(mode)}
                  type="button"
                >
                  <Icon size={16} aria-hidden="true" />
                  {config.label}
                </button>
              )
            })}
          </div>
          <div className="map-status">
            <strong>{currentMapCity.city}</strong>
            <span>
              Centro: {currentMapCity.coords
                ? `${currentMapCity.coords.lat.toFixed(3)}, ${currentMapCity.coords.lng.toFixed(3)}`
                : 'por definir'}
            </span>
            <span>{mapOptions.length} opciones visibles</span>
          </div>
          <MadridMap
            city={currentMapCity.city}
            destinationCoords={currentMapCity.coords}
            options={mapOptions}
            routeMode={routeMode}
          />
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

      <section className="search-panel">
        <div className="section-heading">
          <Search size={20} aria-hidden="true" />
          <div>
            <p className="eyebrow">Búsqueda inteligente</p>
            <h2>Hospedajes y comida por ciudad</h2>
          </div>
        </div>
        <form className="search-form" onSubmit={createLodgingSearch}>
          <div className="search-context">
            <span>Grupo usado en búsquedas</span>
            <strong>{currentTravelGroup.name}</strong>
            <p>{groupSummary(currentTravelGroup)}</p>
          </div>
          <label>
            <span>Tipo</span>
            <select
              onChange={(event) => updateSearchDraft('type', event.target.value)}
              value={searchDraft.type}
            >
              <option value="lodging">Hospedajes</option>
              <option value="food">Comida</option>
              <option value="transport">Traslados</option>
            </select>
          </label>
          <label>
            <span>Ciudad</span>
            <select
              onChange={(event) => selectCityFilter(event.target.value)}
              value={searchDraft.city}
            >
              {cityFilters.filter((city) => city !== 'Todas').map((city) => (
                <option key={city}>{city}</option>
              ))}
            </select>
          </label>
          <label>
            <span>Fechas</span>
            <input
              onChange={(event) => updateSearchDraft('dates', event.target.value)}
              type="text"
              value={searchDraft.dates}
            />
          </label>
          <label className="wide">
            <span>Criterios</span>
            <input
              onChange={(event) => updateSearchDraft('notes', event.target.value)}
              type="text"
              value={searchDraft.notes}
            />
          </label>
          <button className="primary-button compact" type="submit">
            {searchDraft.type === 'transport' ? (
              <TrainFront size={18} aria-hidden="true" />
            ) : (
              <Hotel size={18} aria-hidden="true" />
            )}
            {searchDraft.type === 'transport' ? 'Buscar traslado' : 'Preparar búsqueda'}
          </button>
          {searchDraft.type !== 'transport' ? (
            <button
              className="secondary-button compact"
              onClick={findFoodPlaces}
              type="button"
            >
              {placesBusy ? (
                <Loader2 size={18} aria-hidden="true" />
              ) : (
                <Utensils size={18} aria-hidden="true" />
              )}
              Sugerir comida
            </button>
          ) : null}
        </form>

        {searchDraft.type === 'transport' ? (
          <div className="transfer-box">
            <label>
              <span>Origen</span>
              <input
                onChange={(event) => updateTransferDraft('origin', event.target.value)}
                type="text"
                value={transferDraft.origin}
              />
            </label>
            <label>
              <span>Destino</span>
              <input
                onChange={(event) => updateTransferDraft('destination', event.target.value)}
                type="text"
                value={transferDraft.destination}
              />
            </label>
            <label>
              <span>Fecha</span>
              <input
                onChange={(event) => updateTransferDraft('date', event.target.value)}
                type="text"
                value={transferDraft.date}
              />
            </label>
            <label>
              <span>Precio/persona visto</span>
              <input
                min="0"
                onChange={(event) => updateTransferDraft('pricePerPerson', event.target.value)}
                placeholder="Opcional"
                type="number"
                value={transferDraft.pricePerPerson}
              />
            </label>
            <label className="wide">
              <span>Notas</span>
              <input
                onChange={(event) => updateTransferDraft('notes', event.target.value)}
                type="text"
                value={transferDraft.notes}
              />
            </label>
          </div>
        ) : null}

        {searchResult ? (
          <div className="search-result">
            <strong>
              {searchResult.status === 'ready'
                ? 'Sugerencias listas'
                : searchResult.status === 'error'
                  ? 'Revisar búsqueda'
                  : 'Búsqueda solicitada'}
            </strong>
            <p>{searchResult.notes}</p>
            {searchResult.links?.length ? (
              <div className="platform-links">
                {searchResult.links.map((link) => (
                  <a href={link.url} key={link.label} rel="noreferrer" target="_blank">
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
            {searchResult.analysis?.searchQueries?.length ? (
              <div className="search-tips">
                <span>Búsquedas sugeridas</span>
                <ul>
                  {searchResult.analysis.searchQueries.slice(0, 3).map((query) => (
                    <li key={query}>{query}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            {searchResult.analysis?.comparisonCriteria?.length ? (
              <div className="search-tips">
                <span>Criterios de comparación</span>
                <ul>
                  {searchResult.analysis.comparisonCriteria.slice(0, 4).map((criterion) => (
                    <li key={criterion}>{criterion}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {transferResult ? (
          <div className="search-result transfer-result">
            <strong>
              {transferResult.status === 'working'
                ? 'Buscando traslado'
                : `Traslado ${transferDraft.origin} → ${transferDraft.destination}`}
            </strong>
            <p>{transferResult.analysis?.summary || transferResult.notes}</p>
            {transferResult.links?.length ? (
              <div className="platform-links">
                {transferResult.links.map((link) => (
                  <a href={link.url} key={link.label} rel="noreferrer" target="_blank">
                    {link.label}
                  </a>
                ))}
              </div>
            ) : null}
            {transferResult.analysis?.comparisonCriteria?.length ? (
              <div className="search-tips">
                <span>Qué comparar antes de comprar</span>
                <ul>
                  {transferResult.analysis.comparisonCriteria.slice(0, 4).map((criterion) => (
                    <li key={criterion}>{criterion}</li>
                  ))}
                </ul>
              </div>
            ) : null}
            <button
              className="primary-button compact"
              disabled={transferBusy}
              onClick={addTransferOption}
              type="button"
            >
              <Plus size={18} aria-hidden="true" />
              Agregar traslado al presupuesto
            </button>
          </div>
        ) : null}

        <form className="external-import" onSubmit={analyzeExternalLink}>
          <div>
            <strong>Traer una opción externa a la comparación</strong>
            <p>
              Cuando abras Booking, Airbnb o Google Travel, copia el link del hospedaje
              que te guste y lo agrego a Hospedajes con análisis IA.
            </p>
          </div>
          <input
            onChange={(event) => setExternalLink(event.target.value)}
            placeholder="Pega aquí el link del hospedaje"
            type="url"
            value={externalLink}
          />
          <label>
            <span>Total visto</span>
            <input
              min="0"
              onChange={(event) => setExternalPriceTotal(event.target.value)}
              placeholder="Ej. 1781"
              type="number"
              value={externalPriceTotal}
            />
          </label>
          <label>
            <span>EUR/noche visto</span>
            <input
              min="0"
              onChange={(event) => setExternalPriceNight(event.target.value)}
              placeholder="Ej. 445"
              type="number"
              value={externalPriceNight}
            />
          </label>
          <button className="primary-button compact" disabled={externalBusy} type="submit">
            {externalBusy ? <Loader2 size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
            Analizar link
          </button>
        </form>

        {places.length ? (
          <div className="places-grid">
            {places.map((place) => (
              <article key={getPlaceId(place)}>
                <h3>{getPlaceName(place)}</h3>
                <p>{getPlaceAddress(place)}</p>
                <span>
                  {place.rating ? `${place.rating}/5` : 'Sin rating'} · {getPlaceReviews(place)} reseñas
                </span>
                {place.why ? <p className="place-meta">{place.why}</p> : null}
                {place.caution ? <p className="place-meta caution">{place.caution}</p> : null}
                <button onClick={() => addPlaceOption(place)} type="button">
                  <Plus size={16} aria-hidden="true" />
                  Agregar a comida
                </button>
              </article>
            ))}
          </div>
        ) : null}
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
          {activeTravelCities.map((idea) => (
            <article key={idea.id}>
              <span>{idea.country}</span>
              <h3>{idea.city}</h3>
              <p>{idea.angle}</p>
              <p className="transfer-line">{idea.transfer}</p>
              <div className="progress">
                <i style={{ width: `${idea.readiness}%` }} />
              </div>
              <strong>{idea.dates}</strong>
              <button onClick={() => removeCity(idea.id)} type="button">
                <Trash2 size={15} aria-hidden="true" />
                Quitar ciudad
              </button>
            </article>
          ))}
        </div>
        <form className="city-form" onSubmit={addCity}>
          <label>
            <span>Ciudad</span>
            <input
              list="city-suggestions"
              onChange={(event) => updateCityDraft('city', event.target.value)}
              placeholder="Lisboa, Bilbao..."
              required
              type="text"
              value={cityDraft.city}
            />
            <datalist id="city-suggestions">
              {citySuggestionNames.map((name) => (
                <option key={name} value={name} />
              ))}
            </datalist>
          </label>
          <label>
            <span>País</span>
            <input
              onChange={(event) => updateCityDraft('country', event.target.value)}
              placeholder="Portugal, España..."
              type="text"
              value={cityDraft.country}
            />
          </label>
          <label>
            <span>Fechas</span>
            <input
              onChange={(event) => updateCityDraft('dates', event.target.value)}
              placeholder="19-24 sep"
              type="text"
              value={cityDraft.dates}
            />
          </label>
          <label>
            <span>Traslado</span>
            <input
              onChange={(event) => updateCityDraft('transfer', event.target.value)}
              placeholder="Tren, vuelo, coche..."
              type="text"
              value={cityDraft.transfer}
            />
          </label>
          <label className="wide">
            <span>Idea del plan</span>
            <input
              onChange={(event) => updateCityDraft('angle', event.target.value)}
              placeholder="Por qué puede funcionar para todos"
              type="text"
              value={cityDraft.angle}
            />
          </label>
          <button className="primary-button compact" type="submit">
            <Plus size={18} aria-hidden="true" />
            Agregar ciudad
          </button>
        </form>
      </section>
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

function LoginScreen({ canLogin, firebaseStatus, onSignIn }) {
  return (
    <main className="login-screen">
      <section className="login-hero">
        <div className="login-copy">
          <p className="eyebrow">Viaje familiar septiembre 2026</p>
          <h1>Entrar para planear juntos Madrid y las siguientes ciudades</h1>
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
            <h2>Rutas reales</h2>
            <p>Mapa con transporte público, caminando o en coche hacia IFEMA.</p>
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

function MadridMap({ city, destinationCoords, options, routeMode }) {
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

    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapRef.current) return

        const map = new google.maps.Map(mapRef.current, {
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

        const bounds = new google.maps.LatLngBounds()
        const infoWindow = new google.maps.InfoWindow()
        const directionsService = new google.maps.DirectionsService()
        const destinationPosition = new google.maps.LatLng(destinationCoords.lat, destinationCoords.lng)
        const isMadrid = city === 'Madrid'

        const destinationMarker = new google.maps.Marker({
          map,
          position: destinationPosition,
          title: isMadrid ? 'IFEMA / MADRING' : `Centro de ${city}`,
          label: isMadrid ? 'F1' : 'C',
        })
        mapItems.push(destinationMarker)
        bounds.extend(destinationPosition)

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
            const fallbackLine = new google.maps.Polyline({
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
                status: option.id === 'f1-madring' || !isMadrid ? 'Destino de referencia' : 'Calculando...',
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
                  travelMode: google.maps.TravelMode[routeMode],
                },
                (result, status) => {
                  if (status !== google.maps.DirectionsStatus.OK || !result) {
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
                  const renderer = new google.maps.DirectionsRenderer({
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

        map.fitBounds(bounds, 42)
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
      <div className="route-summary-list">
        {options
          .filter((option) => option.coords && option.id !== 'f1-madring')
          .map((option) => {
            const summary = routeSummaries[option.id]
            return (
              <article key={option.id}>
                <strong>{option.code}</strong>
                <span>{option.title}</span>
                <em>{summary?.status || 'Calculando...'}</em>
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
        <Plane size={16} aria-hidden="true" />
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
          title={option.title}
        >
          {option.code}
        </a>
      ))}
      {note ? <span className="map-note">{note}</span> : null}
    </div>
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

function OptionGrid({
  activeCategory,
  activeMember,
  budgetOptionIds,
  nights,
  onRemove,
  onRestore,
  onToggleBudget,
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
        const inBudget = budgetOptionIds.includes(option.id)
        const price = priceBreakdown(option, nights)
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
                  <span>
                    <strong>{price.primary}</strong>
                    {price.secondary ? <small>{price.secondary}</small> : null}
                  </span>
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
                <button
                  className={inBudget ? 'budgeted' : ''}
                  onClick={() => onToggleBudget(option.id)}
                  type="button"
                >
                  <CircleDollarSign size={16} aria-hidden="true" />
                  {inBudget ? 'En presupuesto' : 'Presupuesto'}
                </button>
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

function BudgetPanel({ budgetOptions, currentTravelGroup, f1Count, nights, onRemove }) {
  const rows = budgetOptions.map((option) => ({
    option,
    budget: optionBudget(option, currentTravelGroup, f1Count, nights),
  }))
  const knownRows = rows.filter((row) => !row.budget.missing)
  const total = knownRows.reduce((sum, row) => sum + (row.budget.total || 0), 0)
  const travelers =
    (Number(currentTravelGroup.adults) || 0) + (currentTravelGroup.childrenAges?.length || 0)
  const perPerson = travelers ? total / travelers : 0

  if (!budgetOptions.length) {
    return (
      <div className="empty-state">
        <CircleDollarSign size={26} aria-hidden="true" />
        <h2>No hay partidas en el presupuesto</h2>
        <p>Agrega hospedajes, planes, comida o traslados desde sus tarjetas.</p>
      </div>
    )
  }

  return (
    <div className="budget-panel">
      <div className="budget-summary">
        <article>
          <span>Total estimado</span>
          <strong>{currency(total)}</strong>
        </article>
        <article>
          <span>Por persona</span>
          <strong>{currency(perPerson)}</strong>
        </article>
        <article>
          <span>Grupo</span>
          <strong>{groupSummary(currentTravelGroup)}</strong>
        </article>
      </div>
      <div className="budget-list">
        {rows.map(({ option, budget }) => (
          <article key={option.id}>
            <div>
              <span>{categoryConfig[option.category]?.shortLabel || 'Opción'}</span>
              <h2>{option.title}</h2>
              <p>{budget.travelers} personas consideradas</p>
            </div>
            <div className="budget-money">
              <strong>{budget.missing ? 'Por estimar' : currency(budget.total)}</strong>
              <span>{budget.missing ? 'Falta precio' : `${currency(budget.perPerson)} por persona`}</span>
            </div>
            <button onClick={() => onRemove(option.id)} type="button">
              Quitar
            </button>
          </article>
        ))}
      </div>
      {rows.some((row) => row.budget.missing) ? (
        <p className="budget-note">
          Algunas partidas no tienen precio. Pega el link o escribe el precio visto para que entren en el cálculo.
        </p>
      ) : null}
    </div>
  )
}

function ItineraryPanel({ busy, onGenerate, plan }) {
  const days = plan?.days?.length
    ? plan.days
    : itineraryDraft.map((item) => ({
        date: item.day,
        city: item.city,
        title: item.title,
        familyPlan: item.family,
        f1Plan: item.f1,
        foodIdea: '',
        routeNotes: '',
        backup: '',
        energyLevel: '',
      }))

  return (
    <div className="itinerary-panel">
      <div className="itinerary-toolbar">
        <div>
          <p className="eyebrow">Itinerario IA</p>
          <h2>{plan?.title || 'Plan base familiar'}</h2>
          {plan?.summary ? <p>{plan.summary}</p> : null}
        </div>
        <button className="primary-button compact" disabled={busy} onClick={onGenerate} type="button">
          {busy ? <Loader2 size={18} aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
          Generar con IA
        </button>
      </div>
      {days.map((item) => (
        <article key={`${item.date}-${item.title}`}>
          <div className="date-chip">{item.date}</div>
          <div>
            <p>{item.city}</p>
            <h2>{item.title}</h2>
            <div className="itinerary-columns">
              <span>
                <Users size={16} aria-hidden="true" />
                {item.familyPlan}
              </span>
              <span>
                <Plane size={16} aria-hidden="true" />
                {item.f1Plan}
              </span>
            </div>
            {item.foodIdea || item.routeNotes || item.backup ? (
              <div className="itinerary-notes">
                {item.foodIdea ? <span>Comida: {item.foodIdea}</span> : null}
                {item.routeNotes ? <span>Ruta: {item.routeNotes}</span> : null}
                {item.backup ? <span>Plan B: {item.backup}</span> : null}
                {item.energyLevel ? <span>Energía: {item.energyLevel}</span> : null}
              </div>
            ) : null}
          </div>
        </article>
      ))}
      {plan?.openQuestions?.length ? (
        <div className="itinerary-questions">
          <strong>Dudas para cerrar</strong>
          <ul>
            {plan.openQuestions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default App
