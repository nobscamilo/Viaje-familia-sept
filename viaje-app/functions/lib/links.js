// Rescatado de functions/index.js del proyecto anterior (2026-08-25).
// Enlaces de busqueda a plataformas externas (Booking, Airbnb, Omio...).
import { cleanText } from './text.js'
import { parseTripDates } from './dates.js'

export function platformLinks(search, groupProfile) {
  const city = encodeURIComponent(search.city || 'Madrid')
  const dates = parseTripDates(search.dates)
  const adults = groupProfile.adults
  const children = groupProfile.childrenAges.length
  const total = groupProfile.totalTravelers
  const query = encodeURIComponent(
    `${search.city || 'Madrid'} alojamiento ${total} personas ${search.dates || ''}`,
  )
  const bookingDates = dates.checkin && dates.checkout
    ? `&checkin=${dates.checkin}&checkout=${dates.checkout}`
    : ''
  const airbnbDates = dates.checkin && dates.checkout
    ? `&checkin=${dates.checkin}&checkout=${dates.checkout}`
    : ''
  const bookingAges = groupProfile.childrenAges.map((age) => `&age=${age}`).join('')
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
      url: `https://www.airbnb.com/s/${city}/homes?adults=${adults}&children=${children}${airbnbDates}`,
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

export function omioSlug(value) {
  return cleanText(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function omioLinks(transfer) {
  const origin = omioSlug(transfer.origin || 'Madrid')
  const destination = omioSlug(transfer.destination || 'Paris')

  return [
    { label: 'Omio comparar', url: `https://www.omio.es/viajes/${origin}/${destination}` },
    { label: 'Tren', url: `https://www.omio.es/trenes/${origin}/${destination}` },
    { label: 'Bus', url: `https://www.omio.es/autobuses/${origin}/${destination}` },
    { label: 'Avión', url: `https://www.omio.es/vuelos/${origin}/${destination}` },
  ]
}
