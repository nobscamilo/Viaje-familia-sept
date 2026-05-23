export const MADRID_F1_TRIP_ID = 'madrid-f1-sept-2026'

export const citySuggestionNames = [
  'Madrid',
  'Barcelona',
  'Valencia',
  'Sevilla',
  'París',
  'Lisboa',
  'Bilbao',
  'León',
  'Valladolid',
  'Santander',
  'Zaragoza',
  'Córdoba',
  'Granada',
  'Málaga',
  'Segovia',
]

const searchMonthNames = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
]

export function cityKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function groupSummary(profile = {}) {
  const adults = Number(profile.adults) || 0
  const children = profile.childrenAges?.length || 0
  const total = Number(profile.totalTravelers) || adults + children
  return `${total} viajeros · ${adults} adultos · ${children} niños`
}

export function formatTripDateForSearch(value) {
  if (!value) return ''
  const date = new Date(`${value}T12:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  return {
    day: date.getUTCDate(),
    month: searchMonthNames[date.getUTCMonth()],
    year: date.getUTCFullYear(),
  }
}

export function tripDatesForSearch(trip) {
  const start = formatTripDateForSearch(trip?.startDate)
  const end = formatTripDateForSearch(trip?.endDate)
  if (!start && !end) return ''
  if (start && end && start.month === end.month && start.year === end.year) {
    return `${start.day}-${end.day} ${start.month} ${start.year}`
  }
  if (start && end) {
    return `${start.day} ${start.month} ${start.year} - ${end.day} ${end.month} ${end.year}`
  }
  const single = start || end
  return `${single.day} ${single.month} ${single.year}`
}

export function primaryTripCity(trip) {
  if (trip?.id === MADRID_F1_TRIP_ID) return 'Madrid'

  const destination = String(trip?.destination || '').trim()
  if (destination) {
    return destination.split(',')[0].split('·')[0].trim() || 'Madrid'
  }

  const normalizedName = cityKey(trip?.name || '')
  const knownCity = citySuggestionNames.find((city) => normalizedName.includes(cityKey(city)))
  return knownCity || 'Madrid'
}

export function defaultDraftForTrip(trip) {
  return {
    title: '',
    url: '',
    category: 'lodging',
    city: primaryTripCity(trip),
    targetGroup: 'family',
    priceTotal: '',
    priceNight: '',
    notes: '',
  }
}

export function defaultSearchDraftForTrip(trip, profile) {
  if (!trip || trip.id === MADRID_F1_TRIP_ID) {
    return {
      city: 'Madrid',
      dates: '10-14 sep 2026',
      type: 'lodging',
      notes: '9 personas, presupuesto 300-600 EUR/noche, buena movilidad familiar',
    }
  }

  return {
    city: primaryTripCity(trip),
    dates: tripDatesForSearch(trip),
    type: 'lodging',
    notes: `${groupSummary(profile)}, hospedaje cómodo y bien conectado`,
  }
}

export function defaultTransferDraftForTrip(trip, profile) {
  if (!trip || trip.id === MADRID_F1_TRIP_ID) {
    return {
      origin: 'Madrid',
      destination: 'París',
      date: '14 sep 2026',
      pricePerPerson: '',
      notes: 'Comparar tren, bus y avión para el grupo',
    }
  }

  return {
    origin: primaryTripCity(trip),
    destination: '',
    date: tripDatesForSearch(trip),
    pricePerPerson: '',
    notes: `Comparar tren, bus y avión para ${groupSummary(profile)}`,
  }
}

export function defaultBudgetOptionIdsForTrip(tripId) {
  return tripId === MADRID_F1_TRIP_ID ? ['lodging-m'] : []
}
