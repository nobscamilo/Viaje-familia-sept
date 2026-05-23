const defaultLibraries = ['core', 'maps', 'marker', 'routes', 'geocoding']
let loadingPromise
let libraryImportPromise = Promise.resolve()
const loadedLibraries = new Set()
const libraryResults = new globalThis.Map()

export function hasMapsKey() {
  return Boolean(import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY)
}

function normalizeLibraries(libraries = defaultLibraries) {
  return Array.from(new Set(libraries.filter(Boolean)))
}

function importGoogleMapsLibraries(google, libraries) {
  if (!google?.maps?.importLibrary) return Promise.resolve(google)

  const pendingLibraries = normalizeLibraries(libraries).filter(
    (library) => !loadedLibraries.has(library),
  )
  if (!pendingLibraries.length) return libraryImportPromise.then(() => google)

  libraryImportPromise = libraryImportPromise.then(async () => {
    for (const library of pendingLibraries) {
      if (loadedLibraries.has(library)) continue
      const libraryResult = await google.maps.importLibrary(library)
      libraryResults.set(library, libraryResult)
      loadedLibraries.add(library)
    }
  })

  return libraryImportPromise.then(() => google)
}

function fallbackLibrary(google, library) {
  if (library === 'places') return google.maps.places || google.maps
  return google.maps
}

export function loadGoogleMaps(libraries = defaultLibraries) {
  const requiredLibraries = normalizeLibraries(libraries)

  if (window.google?.maps) {
    return importGoogleMapsLibraries(window.google, requiredLibraries)
  }
  if (loadingPromise) {
    return loadingPromise.then((google) => importGoogleMapsLibraries(google, requiredLibraries))
  }

  const key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY

  if (!key) {
    return Promise.reject(new Error('Missing Google Maps browser key'))
  }

  loadingPromise = new Promise((resolve, reject) => {
    const previousAuthFailure = window.gm_authFailure
    const callbackName = `__googleMapsReady_${Date.now().toString(36)}`
    let settled = false
    let timeoutId

    function cleanupCallback() {
      delete window[callbackName]
    }

    function restoreAuthFailure() {
      if (previousAuthFailure) {
        window.gm_authFailure = previousAuthFailure
      } else {
        delete window.gm_authFailure
      }
    }

    function fail(message) {
      if (settled) return
      settled = true
      window.clearTimeout(timeoutId)
      loadingPromise = undefined
      libraryImportPromise = Promise.resolve()
      loadedLibraries.clear()
      cleanupCallback()
      restoreAuthFailure()
      reject(new Error(message))
    }

    async function succeed() {
      if (settled) return
      if (!window.google?.maps) {
        fail('Google Maps loaded without the Maps library')
        return
      }
      settled = true
      window.clearTimeout(timeoutId)
      try {
        await importGoogleMapsLibraries(window.google, requiredLibraries)
        cleanupCallback()
        restoreAuthFailure()
        resolve(window.google)
      } catch (error) {
        loadingPromise = undefined
        libraryImportPromise = Promise.resolve()
        loadedLibraries.clear()
        cleanupCallback()
        restoreAuthFailure()
        reject(error)
      }
    }

    const preloadedLibraries = normalizeLibraries(defaultLibraries).join(',')
    const script = document.createElement('script')
    window[callbackName] = succeed
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&loading=async&libraries=${preloadedLibraries}&callback=${callbackName}`
    script.async = true
    script.defer = true
    script.onerror = () => fail('Google Maps could not load')
    window.gm_authFailure = () => {
      if (typeof previousAuthFailure === 'function') previousAuthFailure()
      fail('Google Maps key is not authorized for this domain')
    }
    timeoutId = window.setTimeout(() => fail('Google Maps took too long to load'), 12000)
    document.head.appendChild(script)
  })

  return loadingPromise
}

export async function loadGoogleMapsLibraries(libraries = defaultLibraries) {
  const requiredLibraries = normalizeLibraries(libraries)
  const google = await loadGoogleMaps(requiredLibraries)

  return {
    google,
    libraries: Object.fromEntries(
      requiredLibraries.map((library) => [
        library,
        libraryResults.get(library) || fallbackLibrary(google, library),
      ]),
    ),
  }
}
