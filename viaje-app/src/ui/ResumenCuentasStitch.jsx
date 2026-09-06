import { HOGARES, etiquetaHogar } from '../data/hogares.js'
import { euros, plural } from '../domain/cuentas.js'
import Icon from './Icon.jsx'
import './resumen-cuentas.css'

const ESTIMADO_TOTAL_CENT = 18_450_00 // 18.450 € estimado total pre-viaje

export default function ResumenCuentasStitch({ totalCent, gastosCount, cuenta, miHogar, onAnotar, puedeAnotar }) {
  const porcentaje = Math.min(100, Math.max(8, Math.round((totalCent / ESTIMADO_TOTAL_CENT) * 100)))

  return (
    <div className="ctas-grid-stitch">
      {/* Card 1: Ejecución Global / Presupuesto Maestro */}
      <div className="ctas-card-stitch ctas-card-presupuesto">
        <div className="ctas-card-head">
          <div>
            <span className="ctas-card-eyebrow">Ejecución Global</span>
            <h3 className="ctas-card-titulo">Presupuesto Maestro</h3>
          </div>
          <span className="ctas-badge-tag">{porcentaje}% Consolidado</span>
        </div>

        <div className="ctas-card-cuerpo">
          <div className="ctas-monto-grande">
            <strong>{euros(totalCent)}</strong>
            <span className="ctas-monto-sub">de ~18.450 € est.</span>
          </div>

          <div className="ctas-progreso-wrap" role="progressbar" aria-valuenow={porcentaje} aria-valuemin="0" aria-valuemax="100">
            <div className="ctas-progreso-barra" style={{ width: `${porcentaje}%` }} />
          </div>

          <div className="ctas-card-meta-row">
            <span>{plural(gastosCount, 'gasto registrado', 'gastos registrados')}</span>
            <span>14 Días de Expedición</span>
          </div>
        </div>

        <div className="ctas-card-pie">
          <Icon name="check" size={14} />
          <span>Pagos y reservas del viaje liquidados al 100%</span>
        </div>
      </div>

      {/* Card 2: Fondo de Bolsillo / Bote Común */}
      <div className="ctas-card-stitch ctas-card-bote">
        <div className="ctas-card-head">
          <div>
            <span className="ctas-card-eyebrow">Fondo de Bolsillo</span>
            <h3 className="ctas-card-titulo">Gastos Compartidos</h3>
          </div>
          <div className="ctas-live-dot" title="Activo" />
        </div>

        <div className="ctas-card-cuerpo">
          <div className="ctas-monto-grande">
            <strong>{euros(totalCent)}</strong>
            <span className="ctas-monto-sub">Fondo total acumulado</span>
          </div>
          <p className="ctas-bote-desc">
            Uso sugerido: <strong>Tapas, Metros & Guías</strong>
          </p>
        </div>

        <button
          type="button"
          className="ctas-btn-bote"
          onClick={onAnotar}
          disabled={!puedeAnotar}
          title={puedeAnotar ? 'Anotar un nuevo gasto' : 'Inicia sesión para anotar'}
        >
          <Icon name="euro" size={15} />
          <span>+ Anotar un gasto</span>
        </button>
      </div>

      {/* Card 3: Núcleos Familiares (9 Pax, 3 Hogares) */}
      <div className="ctas-card-stitch ctas-card-nucleos">
        <div className="ctas-card-head">
          <div>
            <span className="ctas-card-eyebrow">3 Familias</span>
            <h3 className="ctas-card-titulo">Núcleos (9 Pax)</h3>
          </div>
          <Icon name="users" size={17} />
        </div>

        <ul className="ctas-nucleos-lista">
          {HOGARES.map((h) => {
            const c = cuenta[h.id] ?? { pagado: 0, debe: 0, saldo: 0 }
            const esMio = h.id === miHogar
            return (
              <li key={h.id} className={`ctas-nucleo-item ${esMio ? 'es-propio' : ''}`}>
                <div className="ctas-nucleo-left">
                  <span className="ctas-nucleo-dot" style={{ background: h.color }} />
                  <div>
                    <span className="ctas-nucleo-nombre">{etiquetaHogar(h.id, miHogar)}</span>
                    <span className="ctas-nucleo-detalle">{h.adultos.length} ad. · puso {euros(c.pagado)}</span>
                  </div>
                </div>
                <span className={`ctas-nucleo-badge ${c.saldo > 0 ? 'es-a-favor' : c.saldo < 0 ? 'es-en-contra' : 'es-paz'}`}>
                  {c.saldo === 0 ? 'Al día' : `${c.saldo > 0 ? '+' : '−'}${euros(Math.abs(c.saldo))}`}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
