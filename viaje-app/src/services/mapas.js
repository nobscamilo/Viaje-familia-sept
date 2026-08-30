/**
 * Carga de Google Maps, bajo demanda y una sola vez.
 *
 * El SDK pesa lo suyo y se cobra por carga de mapa, asi que NO entra en el
 * paquete de arranque: se pide la primera vez que alguien abre la pantalla
 * del mapa y se reutiliza a partir de ahi. Quien no entre en Mapa, no paga.
 *
 * La clave es de navegador y esta restringida por dominio en la consola de
 * Google. Aun asi, cualquiera puede sacarla del JS de la pagina: lo que de
 * verdad acota el gasto es el tope diario de la API, no la restriccion.
 */
const CLAVE = import.meta.env.VITE_GOOGLE_MAPS_KEY ?? ''

export const mapasListo = Boolean(CLAVE)

let promesa = null

export function cargarMapas() {
  if (!CLAVE) return Promise.reject(new Error('sin-clave'))
  if (promesa) return promesa

  promesa = new Promise((resolve, rechazar) => {
    if (window.google?.maps?.Map) return resolve(window.google.maps)

    const s = document.createElement('script')
    s.src = `https://maps.googleapis.com/maps/api/js?key=${CLAVE}&language=es&region=ES&loading=async&callback=__mapaListo`
    s.async = true
    s.onerror = () => { promesa = null; rechazar(new Error('no-carga')) }
    window.__mapaListo = () => resolve(window.google.maps)
    document.head.appendChild(s)
  })

  return promesa
}
