/**
 * Iconos en linea. Sin libreria: son seis, pesan nada y asi no hay
 * una dependencia entera para dibujar un avion.
 * Todos comparten caja de 24 y trazo de 1.6 para que se vean hermanos.
 */
const PATHS = {
  flight: 'M17.8 19.2 16 11l3.5-3.5a2.1 2.1 0 0 0-3-3L13 8 4.8 6.2a.6.6 0 0 0-.6.9l3 4.6-2.4 2.4-2-.6a.5.5 0 0 0-.5.8L4.6 17l2.2 2.3a.5.5 0 0 0 .8-.5l-.6-2 2.4-2.4 4.6 3a.6.6 0 0 0 .9-.6Z',
  lodging: 'M3 18v-5m0 0V8a2 2 0 0 1 2-2h3m-5 7h18m0 0V9a2 2 0 0 0-2-2h-3m5 6v5M8 6v1a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V6',
  f1: 'M3 13h3l2-3h5l2 2h4a2 2 0 0 1 0 4h-1m-15-3v3h2m0 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0m0 0h6m0 0a2 2 0 1 0 4 0m-4 0a2 2 0 1 1 4 0',
  activity: 'M12 21s-7-5.2-7-10a7 7 0 0 1 14 0c0 4.8-7 10-7 10Zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z',
  transport: 'M6 16V6a3 3 0 0 1 3-3h6a3 3 0 0 1 3 3v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2Zm0-6h12M9 21l-2 2m8-2 2 2M9.5 14h.01m4.99 0h.01',
  alert: 'M12 8v5m0 3h.01M10.3 3.9 2.4 17.5A2 2 0 0 0 4.1 20.5h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z',
}

export default function Icon({ name, size = 18, className = '' }) {
  const d = PATHS[name] ?? PATHS.activity
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}
