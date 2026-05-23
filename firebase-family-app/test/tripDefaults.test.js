import assert from 'node:assert/strict'
import test from 'node:test'
import {
  defaultBudgetOptionIdsForTrip,
  defaultSearchDraftForTrip,
  defaultTransferDraftForTrip,
  groupSummary,
  primaryTripCity,
  tripDatesForSearch,
} from '../src/utils/tripDefaults.js'

const madridF1 = {
  id: 'madrid-f1-sept-2026',
  name: 'Madrid F1 septiembre',
  destination: 'Madrid, España',
  startDate: '2026-09-10',
  endDate: '2026-09-14',
}

const segovia = {
  id: 'segovia-madrid',
  name: 'Segovia Madrid',
  destination: 'Segovia, Madrid',
  startDate: '2026-05-15',
  endDate: '2026-05-17',
}

const couple = {
  name: 'Pareja',
  adults: 2,
  childrenAges: [],
}

test('keeps Madrid F1 defaults for the canonical trip', () => {
  assert.equal(primaryTripCity(madridF1), 'Madrid')
  assert.deepEqual(defaultBudgetOptionIdsForTrip(madridF1.id), ['lodging-m'])
  assert.deepEqual(defaultSearchDraftForTrip(madridF1, couple), {
    city: 'Madrid',
    dates: '10-14 sep 2026',
    type: 'lodging',
    notes: '9 personas, presupuesto 300-600 EUR/noche, buena movilidad familiar',
  })
})

test('starts a new trip from its own destination and dates', () => {
  assert.equal(primaryTripCity(segovia), 'Segovia')
  assert.equal(tripDatesForSearch(segovia), '15-17 may 2026')
  assert.deepEqual(defaultBudgetOptionIdsForTrip(segovia.id), [])
  assert.deepEqual(defaultTransferDraftForTrip(segovia, couple), {
    origin: 'Segovia',
    destination: '',
    date: '15-17 may 2026',
    pricePerPerson: '',
    notes: `Comparar tren, bus y avión para ${groupSummary(couple)}`,
  })
})
