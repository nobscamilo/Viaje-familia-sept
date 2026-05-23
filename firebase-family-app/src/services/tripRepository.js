import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'
import { firestoreDb, isFirebaseConfigured } from './firebaseClient'
import { initialOptions, cityIdeas, familyProfiles } from '../data/trip'
import { MADRID_F1_TRIP_ID, defaultBudgetOptionIdsForTrip } from '../utils/tripDefaults'

// Re-export so existing callers (App.jsx) don't need to change their import path
export { MADRID_F1_TRIP_ID }

const optionsCollection = 'tripOptions'
const votesCollection = 'votes'
const membersCollection = 'familyMembers'
const citiesCollection = 'travelCities'
const searchesCollection = 'searchRequests'
const groupsCollection = 'travelGroups'
const itinerariesCollection = 'itineraries'
const budgetsCollection = 'tripBudgets'
const sharedBudgetId = 'main'

// defaultBudgetOptionIdsForTrip is imported from '../utils/tripDefaults' above.

const defaultVotes = [
  { id: 'lodging-m', optionId: 'lodging-m', members: ['camilo'] },
  { id: 'lodging-b', optionId: 'lodging-b', members: ['juliana-bueno'] },
  { id: 'activity-retiro', optionId: 'activity-retiro', members: ['cielo'] },
]

export function canUseFirestore() {
  return Boolean(isFirebaseConfigured && firestoreDb)
}

function scopedDocId(tripId, id) {
  return `${tripId}__${id}`.replaceAll('/', '-')
}

function logicalId(data, fallback) {
  return data.id || data.optionId || fallback
}

function withTripMetadata(data, tripId, user, includeCreated = true) {
  return {
    ...data,
    tripId,
    createdBy: includeCreated ? user.uid : data.createdBy,
    createdByName: includeCreated
      ? user.displayName || user.email || 'Familiar'
      : data.createdByName,
    updatedAt: serverTimestamp(),
    ...(includeCreated ? { createdAt: serverTimestamp() } : {}),
  }
}

function mapTripSnapshot(snapshot) {
  return snapshot.docs.map((item) => {
    const data = item.data()
    return {
      firestoreId: item.id,
      ...data,
      id: logicalId(data, item.id),
    }
  })
}

async function seedTripCollection(collectionName, tripId, user, defaults = []) {
  if (!canUseFirestore() || !user || tripId !== MADRID_F1_TRIP_ID) return

  const tripSnapshot = await getDocs(
    query(collection(firestoreDb, collectionName), where('tripId', '==', tripId)),
  )
  if (!tripSnapshot.empty) return

  const legacySnapshot = await getDocs(collection(firestoreDb, collectionName))
  const legacyItems = legacySnapshot.docs
    .map((item) => ({ firestoreId: item.id, ...item.data() }))
    .filter((item) => !item.tripId)

  const sourceItems = legacyItems.length ? legacyItems : defaults
  if (!sourceItems.length) return

  await Promise.all(
    sourceItems.map((item) => {
      const { firestoreId, ...data } = item
      const id = logicalId(data, firestoreId)
      return setDoc(
        doc(firestoreDb, collectionName, scopedDocId(tripId, id)),
        {
          ...data,
          id,
          ...(data.optionId ? { optionId: data.optionId } : {}),
          tripId,
          migratedFrom: firestoreId || null,
          migratedAt: serverTimestamp(),
          createdBy: data.createdBy || user.uid,
          createdByName: data.createdByName || user.displayName || user.email || 'Camilo',
          createdAt: data.createdAt || serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      )
    }),
  )
}

export async function seedMadridF1Data(user) {
  await Promise.all([
    seedInitialTripOptions(user, MADRID_F1_TRIP_ID),
    seedInitialTravelCities(user, MADRID_F1_TRIP_ID),
    seedInitialTravelGroups(user, MADRID_F1_TRIP_ID),
    seedTripCollection(votesCollection, MADRID_F1_TRIP_ID, user, defaultVotes),
    seedTripCollection(searchesCollection, MADRID_F1_TRIP_ID, user),
    seedTripCollection(itinerariesCollection, MADRID_F1_TRIP_ID, user),
  ])
}

export async function saveUserProfile(user, selectedMemberId) {
  if (!canUseFirestore() || !user) return

  await setDoc(
    doc(firestoreDb, membersCollection, user.uid),
    {
      uid: user.uid,
      email: user.email || null,
      displayName: user.displayName || 'Familiar',
      photoURL: user.photoURL || null,
      selectedMemberId,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function seedInitialTripOptions(user, tripId = MADRID_F1_TRIP_ID) {
  if (!canUseFirestore() || !user) return
  await seedTripCollection(optionsCollection, tripId, user, initialOptions)
}

export async function seedInitialTravelCities(user, tripId = MADRID_F1_TRIP_ID) {
  if (!canUseFirestore() || !user) return
  await seedTripCollection(citiesCollection, tripId, user, cityIdeas)
}

export async function seedInitialTravelGroups(user, tripId = MADRID_F1_TRIP_ID) {
  if (!canUseFirestore() || !user) return
  await seedTripCollection(groupsCollection, tripId, user, familyProfiles)
  if (tripId !== MADRID_F1_TRIP_ID) return

  const snapshot = await getDocs(
    query(collection(firestoreDb, groupsCollection), where('tripId', '==', tripId)),
  )
  const existingIds = new Set(snapshot.docs.map((item) => logicalId(item.data(), item.id)))
  const missingProfiles = familyProfiles.filter((profile) => !existingIds.has(profile.id))
  await Promise.all(
    missingProfiles.map((profile) =>
      setDoc(
        doc(firestoreDb, groupsCollection, scopedDocId(tripId, profile.id)),
        withTripMetadata({ ...profile, tripId }, tripId, user),
        { merge: true },
      ),
    ),
  )
}

export function subscribeTripOptions(tripId, onData, onError) {
  if (!canUseFirestore() || !tripId) return () => {}

  return onSnapshot(
    query(collection(firestoreDb, optionsCollection), where('tripId', '==', tripId)),
    (snapshot) => {
      onData(mapTripSnapshot(snapshot))
    },
    onError,
  )
}

export function subscribeVotes(tripId, onData, onError) {
  if (!canUseFirestore() || !tripId) return () => {}

  return onSnapshot(
    query(collection(firestoreDb, votesCollection), where('tripId', '==', tripId)),
    (snapshot) => {
      const votes = snapshot.docs.reduce((acc, item) => {
        const data = item.data()
        acc[data.optionId || data.id || item.id] = data.members || []
        return acc
      }, {})
      onData(votes)
    },
    onError,
  )
}

export function subscribeTravelCities(tripId, onData, onError) {
  if (!canUseFirestore() || !tripId) return () => {}

  return onSnapshot(
    query(collection(firestoreDb, citiesCollection), where('tripId', '==', tripId)),
    (snapshot) => {
      onData(mapTripSnapshot(snapshot))
    },
    onError,
  )
}

export function subscribeTravelGroups(tripId, onData, onError) {
  if (!canUseFirestore() || !tripId) return () => {}

  return onSnapshot(
    query(collection(firestoreDb, groupsCollection), where('tripId', '==', tripId)),
    (snapshot) => {
      onData(mapTripSnapshot(snapshot))
    },
    onError,
  )
}

export function subscribeTripBudget(tripId, onData, onError) {
  if (!canUseFirestore() || !tripId) return () => {}

  return onSnapshot(
    query(collection(firestoreDb, budgetsCollection), where('tripId', '==', tripId)),
    (snapshot) => {
      if (snapshot.empty) {
        onData(defaultBudgetOptionIdsForTrip(tripId))
        return
      }
      const data = snapshot.docs[0].data()
      onData(Array.isArray(data.optionIds) ? data.optionIds : [])
    },
    onError,
  )
}

export async function saveTripOption(option, user, tripId) {
  if (!canUseFirestore() || !user || !tripId) return

  await setDoc(
    doc(firestoreDb, optionsCollection, scopedDocId(tripId, option.id)),
    withTripMetadata({ ...option, tripId }, tripId, user),
    { merge: true },
  )
}

export async function saveTravelCity(city, user, tripId) {
  if (!canUseFirestore() || !user || !tripId) return

  await setDoc(
    doc(firestoreDb, citiesCollection, scopedDocId(tripId, city.id)),
    withTripMetadata({ ...city, tripId }, tripId, user),
    { merge: true },
  )
}

export async function updateTravelCityStatus(cityId, status, user, tripId) {
  if (!canUseFirestore() || !user || !tripId) return

  await updateDoc(doc(firestoreDb, citiesCollection, scopedDocId(tripId, cityId)), {
    status,
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  })
}

export async function saveTravelGroup(profile, user, tripId) {
  if (!canUseFirestore() || !user || !tripId) return

  await setDoc(
    doc(firestoreDb, groupsCollection, scopedDocId(tripId, profile.id)),
    withTripMetadata({ ...profile, tripId }, tripId, user),
    { merge: true },
  )
}

export async function saveSearchRequest(request, user, tripId) {
  if (!canUseFirestore() || !user || !tripId) return

  await setDoc(
    doc(firestoreDb, searchesCollection, scopedDocId(tripId, request.id)),
    withTripMetadata({ ...request, tripId }, tripId, user),
    { merge: true },
  )
}

export async function updateTripOptionStatus(optionId, status, user, tripId) {
  if (!canUseFirestore() || !user || !tripId) return

  await updateDoc(doc(firestoreDb, optionsCollection, scopedDocId(tripId, optionId)), {
    status,
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  })
}

export async function saveOptionVotes(optionId, members, user, tripId) {
  if (!canUseFirestore() || !user || !tripId) return

  await setDoc(
    doc(firestoreDb, votesCollection, scopedDocId(tripId, optionId)),
    {
      id: optionId,
      optionId,
      tripId,
      members,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}

export async function saveTripBudget(optionIds, user, tripId) {
  if (!canUseFirestore() || !user || !tripId) return

  await setDoc(
    doc(firestoreDb, budgetsCollection, scopedDocId(tripId, sharedBudgetId)),
    {
      id: sharedBudgetId,
      tripId,
      optionIds: Array.isArray(optionIds) ? optionIds : [],
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
