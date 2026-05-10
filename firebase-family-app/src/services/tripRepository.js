import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore'
import { firestoreDb, isFirebaseConfigured } from './firebaseClient'
import { initialOptions } from '../data/trip'
import { cityIdeas } from '../data/trip'
import { familyProfiles } from '../data/trip'

const optionsCollection = 'tripOptions'
const votesCollection = 'votes'
const membersCollection = 'familyMembers'
const citiesCollection = 'travelCities'
const searchesCollection = 'searchRequests'
const groupsCollection = 'travelGroups'

export function canUseFirestore() {
  return Boolean(isFirebaseConfigured && firestoreDb)
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

export async function seedInitialTripOptions(user) {
  if (!canUseFirestore() || !user) return

  const snapshot = await getDocs(collection(firestoreDb, optionsCollection))
  if (!snapshot.empty) return

  await Promise.all(
    initialOptions.map((option) =>
      setDoc(doc(firestoreDb, optionsCollection, option.id), {
        ...option,
        createdBy: user.uid,
        createdByName: user.displayName || user.email || 'Camilo',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  )
}

export async function seedInitialTravelCities(user) {
  if (!canUseFirestore() || !user) return

  const snapshot = await getDocs(collection(firestoreDb, citiesCollection))
  if (!snapshot.empty) return

  await Promise.all(
    cityIdeas.map((city) =>
      setDoc(doc(firestoreDb, citiesCollection, city.id), {
        ...city,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  )
}

export async function seedInitialTravelGroups(user) {
  if (!canUseFirestore() || !user) return

  const snapshot = await getDocs(collection(firestoreDb, groupsCollection))
  if (!snapshot.empty) return

  await Promise.all(
    familyProfiles.map((profile) =>
      setDoc(doc(firestoreDb, groupsCollection, profile.id), {
        ...profile,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }),
    ),
  )
}

export function subscribeTripOptions(onData, onError) {
  if (!canUseFirestore()) return () => {}

  return onSnapshot(
    query(collection(firestoreDb, optionsCollection)),
    (snapshot) => {
      const options = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      onData(options)
    },
    onError,
  )
}

export function subscribeVotes(onData, onError) {
  if (!canUseFirestore()) return () => {}

  return onSnapshot(
    query(collection(firestoreDb, votesCollection)),
    (snapshot) => {
      const votes = snapshot.docs.reduce((acc, item) => {
        acc[item.id] = item.data().members || []
        return acc
      }, {})
      onData(votes)
    },
    onError,
  )
}

export function subscribeTravelCities(onData, onError) {
  if (!canUseFirestore()) return () => {}

  return onSnapshot(
    query(collection(firestoreDb, citiesCollection)),
    (snapshot) => {
      const cities = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      onData(cities)
    },
    onError,
  )
}

export function subscribeTravelGroups(onData, onError) {
  if (!canUseFirestore()) return () => {}

  return onSnapshot(
    query(collection(firestoreDb, groupsCollection)),
    (snapshot) => {
      const profiles = snapshot.docs.map((item) => ({
        id: item.id,
        ...item.data(),
      }))
      onData(profiles)
    },
    onError,
  )
}

export async function saveTripOption(option, user) {
  if (!canUseFirestore() || !user) return

  await setDoc(doc(firestoreDb, optionsCollection, option.id), {
    ...option,
    createdBy: user.uid,
    createdByName: user.displayName || user.email || 'Familiar',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function saveTravelCity(city, user) {
  if (!canUseFirestore() || !user) return

  await setDoc(doc(firestoreDb, citiesCollection, city.id), {
    ...city,
    createdBy: user.uid,
    createdByName: user.displayName || user.email || 'Familiar',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function saveTravelGroup(profile, user) {
  if (!canUseFirestore() || !user) return

  await setDoc(doc(firestoreDb, groupsCollection, profile.id), {
    ...profile,
    createdBy: user.uid,
    createdByName: user.displayName || user.email || 'Familiar',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function saveSearchRequest(request, user) {
  if (!canUseFirestore() || !user) return

  await setDoc(doc(firestoreDb, searchesCollection, request.id), {
    ...request,
    createdBy: user.uid,
    createdByName: user.displayName || user.email || 'Familiar',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export async function updateTripOptionStatus(optionId, status, user) {
  if (!canUseFirestore() || !user) return

  await updateDoc(doc(firestoreDb, optionsCollection, optionId), {
    status,
    updatedBy: user.uid,
    updatedAt: serverTimestamp(),
  })
}

export async function saveOptionVotes(optionId, members, user) {
  if (!canUseFirestore() || !user) return

  await setDoc(
    doc(firestoreDb, votesCollection, optionId),
    {
      optionId,
      members,
      updatedBy: user.uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  )
}
