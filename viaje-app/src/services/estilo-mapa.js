/**
 * Estilo oscuro del mapa.
 *
 * `styles` solo funciona en mapas SIN `mapId`. Los mapas con Map ID se
 * estilizan en la consola de Google, y crear uno alli no se puede automatizar,
 * asi que aqui va el estilo en codigo. Ese mismo motivo obliga a usar los
 * marcadores clasicos en vez de los nuevos AdvancedMarkerElement, que exigen
 * Map ID: es una eleccion consciente, no un descuido.
 *
 * La app entera es oscura (regla de tokens.css). Un mapa blanco en medio
 * deslumbra de noche, que es justo cuando alguien lo abre en la calle.
 */
const g = (color) => [{ color }]

export const ESTILO_OSCURO = [
  { elementType: 'geometry', stylers: g('#16161a') },
  { elementType: 'labels.text.stroke', stylers: g('#16161a') },
  { elementType: 'labels.text.fill', stylers: g('#a1a1aa') },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: g('#d4d4d8') },
  { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: g('#1b2a20') },
  { featureType: 'road', elementType: 'geometry', stylers: g('#26262b') },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: g('#8b8b93') },
  { featureType: 'road.highway', elementType: 'geometry', stylers: g('#3f3f46') },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: g('#c4c4cc') },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: g('#0d1b2a') },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: g('#4a6a8a') },
]

/** El pin, dibujado a mano: un circulo con el numero dentro. */
export function pinNumerado(color, numero) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
    <path d="M17 41C17 41 32 25.5 32 16A15 15 0 1 0 2 16C2 25.5 17 41 17 41Z"
          fill="${color}" stroke="#09090b" stroke-width="2"/>
    <text x="17" y="21" text-anchor="middle" font-family="system-ui,sans-serif"
          font-size="15" font-weight="700" fill="#09090b">${numero}</text>
  </svg>`
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
