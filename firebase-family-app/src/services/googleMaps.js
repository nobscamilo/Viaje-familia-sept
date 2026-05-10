let loadingPromise

export function hasMapsKey() {
  return Boolean(import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY)
}

export function loadGoogleMaps() {
  if (window.google?.maps) return Promise.resolve(window.google)
  if (loadingPromise) return loadingPromise

  const key = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY

  if (!key) {
    return Promise.reject(new Error('Missing Google Maps browser key'))
  }

  loadingPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly`
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('Google Maps could not load'))
    document.head.appendChild(script)
  })

  return loadingPromise
}
