import { httpsCallable } from 'firebase/functions'
import { cloudFunctions } from './firebaseClient'

function callable(name) {
  if (!cloudFunctions) {
    throw new Error('Firebase Functions no está configurado.')
  }

  return httpsCallable(cloudFunctions, name)
}

export async function analyzeOptionWithAI(payload) {
  const run = callable('analyzeTripOption')
  const result = await run(payload)
  return result.data
}

export async function verifyAvailabilityWithAI(payload) {
  const run = callable('verifyTripOptionAvailability')
  const result = await run(payload)
  return result.data
}

export async function suggestLodgingWithAI(payload) {
  const run = callable('suggestLodgingSearch')
  const result = await run(payload)
  return result.data
}

export async function suggestFoodWithAI(payload) {
  const run = callable('suggestFoodPlaces')
  const result = await run(payload)
  return result.data
}

export async function suggestTransferWithAI(payload) {
  const run = callable('suggestTransferSearch')
  const result = await run(payload)
  return result.data
}

export async function generateItineraryWithAI(payload) {
  const run = callable('generateItinerary')
  const result = await run(payload)
  return result.data
}
