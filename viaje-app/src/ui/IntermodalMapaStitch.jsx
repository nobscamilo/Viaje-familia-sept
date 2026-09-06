import Icon from './Icon.jsx'
import './intermodal-mapa.css'

export default function IntermodalMapaStitch() {
  return (
    <div className="mapa-intermodal-wrap">
      {/* Tarjeta de Conexión Estratégica Interurbana */}
      <div className="mapa-intermodal-card">
        <div className="mapa-intermodal-head">
          <div className="mapa-intermodal-titulo-box">
            <span className="mapa-intermodal-eyebrow">Conexión Estratégica Interurbana</span>
            <h3 className="mapa-intermodal-titulo">Tramo Completo: De Castilla a orillas del Sena</h3>
          </div>
          <span className="mapa-intermodal-badge">14 Días · 3 Ciudades</span>
        </div>

        <div className="mapa-intermodal-tramos">
          <div className="mapa-tramo-item">
            <div className="mapa-tramo-ico-row">
              <span className="mapa-tramo-tag">Flota en Ciudad</span>
              <Icon name="transport" size={16} />
            </div>
            <strong className="mapa-tramo-nombre">Van Mercedes 9 pax</strong>
            <p className="mapa-tramo-desc">Traslados puerta a puerta para abuelos y equipaje en Madrid y París.</p>
            <span className="mapa-tramo-check">
              <Icon name="check" size={13} /> Conductor Asignado
            </span>
          </div>

          <div className="mapa-tramo-item">
            <div className="mapa-tramo-ico-row">
              <span className="mapa-tramo-tag">Tramo Terrestre 1</span>
              <Icon name="transport" size={16} />
            </div>
            <strong className="mapa-tramo-nombre">AVE Preferente 100</strong>
            <p className="mapa-tramo-desc">Atocha → Sants en 2h 30m. Vagón silencioso y servicio de cafetería.</p>
            <span className="mapa-tramo-check">
              <Icon name="check" size={13} /> 9 Billetes Emitidos
            </span>
          </div>

          <div className="mapa-tramo-item">
            <div className="mapa-tramo-ico-row">
              <span className="mapa-tramo-tag">Tramo Terrestre 2</span>
              <Icon name="flight" size={16} />
            </div>
            <strong className="mapa-tramo-nombre">TGV Inoui Transfronterizo</strong>
            <p className="mapa-tramo-desc">Barcelona → Gare de Lyon en 6h 20m con vista al Mediterráneo francés.</p>
            <span className="mapa-tramo-check">
              <Icon name="check" size={13} /> Asientos Contiguos
            </span>
          </div>
        </div>

        <div className="mapa-intermodal-aviso">
          <div className="mapa-intermodal-aviso-left">
            <Icon name="users" size={16} />
            <span>Asistencia en estaciones para personas mayores y maletas voluminosas.</span>
          </div>
          <span className="mapa-intermodal-pill-tag">Asistencia Activa</span>
        </div>
      </div>

      {/* Tarjeta de Coordinación de Pases */}
      <div className="mapa-pases-card">
        <div className="mapa-pases-head">
          <h3 className="mapa-pases-titulo">Coordinación de Pases</h3>
          <span className="mapa-pases-contador">3 / 3</span>
        </div>

        <ul className="mapa-pases-lista">
          <li className="mapa-pase-item">
            <span className="mapa-pase-ico-ok"><Icon name="check" size={14} /></span>
            <div className="mapa-pase-txt">
              <strong>Pase Turístico Madrid 5 Días</strong>
              <em>9 pases validados</em>
            </div>
          </li>
          <li className="mapa-pase-item">
            <span className="mapa-pase-ico-ok"><Icon name="check" size={14} /></span>
            <div className="mapa-pase-txt">
              <strong>Entrada Sagrada Família</strong>
              <em>Torre Pasión · Acceso prioritario</em>
            </div>
          </li>
          <li className="mapa-pase-item">
            <span className="mapa-pase-ico-ok"><Icon name="check" size={14} /></span>
            <div className="mapa-pase-txt">
              <strong>Bateau Mouche Privé</strong>
              <em>París · Día 12 Crepúsculo</em>
            </div>
          </li>
        </ul>
      </div>
    </div>
  )
}
