/**
 * tripsRepository.js
 * Firestore operations for the top-level `trips` collection.
 * Phase 2: trip metadata, members, join codes and scoped trip data.
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { cloudFunctions, firestoreDb } from './firebaseClient'
import { canUseFirestore } from './tripRepository'

// ─── Constants ────────────────────────────────────────────────────────────────

export const TRIPS_COLLECTION = 'trips'
export const MADRID_F1_TRIP_ID = 'madrid-f1-sept-2026'
export const MADRID_F1_JOIN_CODE = 'MADRIDF1'

/**
 * Emails that are allowed to create new trips and to seed Madrid F1.
 * Must be lowercase here — comparison normalizes the user's email.
 */
export const TRIP_ADMIN_EMAILS = [
  'juancamilo.sarmiento@gmail.com',
  'julianabueno042017@gmail.com',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * True when the signed-in user is allowed to create trips.
 * Used in UI (to hide the "Crear nuevo viaje" button) and in createTrip.
 * Firestore rules enforce the same check server-side.
 */
export function isTripAdmin(user) {
  if (!user?.email) return false
  return TRIP_ADMIN_EMAILS.includes(user.email.trim().toLowerCase())
}

/**
 * Generate a random 6-character join code (no ambiguous chars like 0/O, 1/I/L).
 */
function generateJoinCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)],
  ).join('')
}

function memberEntry(user, role = 'member') {
  return {
    displayName: user.displayName || 'Familiar',
    photoURL: user.photoURL || null,
    email: user.email || null,
    role,
    joinedAt: new Date().toISOString(),
  }
}

function callable(name) {
  if (!cloudFunctions) {
    throw new Error('Firebase Functions no está configurado.')
  }

  return httpsCallable(cloudFunctions, name)
}

// ─── Seed Madrid F1 ───────────────────────────────────────────────────────────

/**
 * Creates the canonical Madrid F1 trip in Firestore IF it does not exist yet
 * AND the caller is an admin. Does NOT auto-add new users as members — joining
 * Madrid F1 now requires the explicit `?join=MADRIDF1` flow like any other trip.
 *
 * Safe to call on every login: existing-trip case returns silently; non-admin
 * case returns silently (no error — Firestore rules also block creation).
 */
export async function seedMadridF1Trip(user) {
  if (!canUseFirestore() || !user) return
  if (!isTripAdmin(user)) return

  const tripRef = doc(firestoreDb, TRIPS_COLLECTION, MADRID_F1_TRIP_ID)
  const snapshot = await getDoc(tripRef)
  if (snapshot.exists()) {
    const existing = snapshot.data()
    const memberIds = existing.memberIds?.length
      ? existing.memberIds
      : Object.keys(existing.members || { [user.uid]: true })

    await setDoc(
      tripRef,
      {
        memberIds: [...new Set([...memberIds, user.uid])],
        members: { [user.uid]: memberEntry(user, 'admin') },
        // Always ensure joinCode is present — may be missing from older documents
        ...(existing.joinCode ? {} : { joinCode: MADRID_F1_JOIN_CODE }),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    return
  }

  await setDoc(tripRef, {
    id: MADRID_F1_TRIP_ID,
    name: 'Madrid F1 · Familia Septiembre 2026',
    description:
      'Viaje familiar a Madrid para el Gran Premio de España F1 y ciudades europeas post-carrera.',
    destination: 'Madrid, España',
    startDate: '2026-09-10',
    endDate: '2026-09-24',
    emoji: '🏎️',
    joinCode: MADRID_F1_JOIN_CODE,
    isLocked: false,
    createdBy: user.uid,
    createdByName: user.displayName || user.email || 'Camilo',
    members: { [user.uid]: memberEntry(user, 'admin') },
    memberIds: [user.uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

/**
 * Create a brand-new trip. Returns the full trip object (including generated id
 * and joinCode) so the UI can display the share link immediately.
 */
export async function createTrip(tripData, user) {
  if (!canUseFirestore() || !user)
    throw new Error('No hay conexión a Firebase o no hay sesión activa.')
  if (!isTripAdmin(user))
    throw new Error('Solo Camilo y Juliana Bueno pueden crear viajes nuevos. Pide a alguno de ellos que cree el viaje y te comparta el enlace.')

  const joinCode = generateJoinCode()
  const tripRef = doc(collection(firestoreDb, TRIPS_COLLECTION))

  const trip = {
    id: tripRef.id,
    name: tripData.name?.trim() || 'Nuevo viaje',
    description: tripData.description?.trim() || '',
    destination: tripData.destination?.trim() || '',
    startDate: tripData.startDate || '',
    endDate: tripData.endDate || '',
    returnDate: tripData.returnDate || '',
    baseCity: tripData.baseCity?.trim() || '',
    adults: Number(tripData.adults) || 2,
    childrenAges: Array.isArray(tripData.childrenAges) ? tripData.childrenAges : [],
    emoji: tripData.emoji || '✈️',
    joinCode,
    isLocked: false,
    createdBy: user.uid,
    createdByName: user.displayName || user.email || 'Viajero',
    members: { [user.uid]: memberEntry(user, 'admin') },
    memberIds: [user.uid],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }

  await setDoc(tripRef, trip)
  return trip
}

/**
 * Delete a trip. Only the trip creator / admin should call this.
 * NOTE: This removes the trip document only. Sub-collections (options, groups,
 * cities) are orphaned — a Cloud Function cleanup can be added later.
 */
export async function deleteTrip(tripId, user) {
  if (!canUseFirestore() || !user)
    throw new Error('No hay conexión a Firebase o no hay sesión activa.')
  if (!isTripAdmin(user))
    throw new Error('Solo los administradores pueden borrar viajes.')
  if (tripId === MADRID_F1_TRIP_ID)
    throw new Error('El viaje Madrid F1 no puede borrarse.')

  await deleteDoc(doc(firestoreDb, TRIPS_COLLECTION, tripId))
}

/**
 * Look up a trip by its join code (case-insensitive).
 * Returns the trip object or null if not found.
 */
export async function getTripByJoinCode(joinCode) {
  if (!joinCode) return null

  const run = callable('resolveTripInvite')
  const result = await run({ joinCode })
  return result.data?.trip || null
}

/**
 * Add the current user as a member of the trip identified by joinCode.
 * Returns the trip object. Throws if the code is invalid.
 */
export async function joinTripByCode(joinCode, user) {
  if (!user)
    throw new Error('No hay conexión a Firebase o no hay sesión activa.')

  const run = callable('joinTripByCode')
  const result = await run({ joinCode })
  return result.data?.trip || null
}

// ─── Real-time subscription ───────────────────────────────────────────────────

/**
 * Subscribe to trips where the current user is a member.
 */
export function subscribeUserTrips(uid, onData, onError) {
  if (!canUseFirestore() || !uid) return () => {}

  return onSnapshot(
    query(
      collection(firestoreDb, TRIPS_COLLECTION),
      where('memberIds', 'array-contains', uid),
    ),
    (snapshot) => {
      const trips = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          // Madrid F1 pinned first, then by startDate descending
          if (a.id === MADRID_F1_TRIP_ID) return -1
          if (b.id === MADRID_F1_TRIP_ID) return 1
          return (b.startDate || '').localeCompare(a.startDate || '')
        })
      onData(trips)
    },
    onError,
  )
}
