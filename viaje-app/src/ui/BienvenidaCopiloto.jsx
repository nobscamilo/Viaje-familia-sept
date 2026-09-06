import Icon from './Icon.jsx'
import './bienvenida-copiloto.css'

const INSIGHTS = [
  {
    tag: 'Accesibilidad Senior',
    icono: 'activity',
    titulo: 'Alerta de ritmo familiar',
    desc: 'Pausas recomendadas y rutas llanas con descansos adaptados para abuelos y niños.',
    accion: 'Ajustar ritmo',
    prompt: 'Propón un ritmo tranquilo para hoy considerando que viajan abuelos y niños pequeños.',
  },
  {
    tag: 'Logística Monumentos',
    icono: 'calendar',
    titulo: 'Aforo en monumentos',
    desc: 'Revisión de accesos prioritarios, tiempos de espera y reservas del grupo.',
    accion: 'Ver aforos',
    prompt: '¿Qué reservas o entradas tenemos que tener listas y cuáles recomiendas asegurar?',
  },
  {
    tag: 'Previsión Térmica',
    icono: 'sun',
    titulo: 'Clima en destino',
    desc: 'Temperatura esperada y recomendaciones de ropa ligera para las visitas.',
    accion: 'Consultar clima',
    prompt: '¿Qué tiempo hará en las ciudades del viaje y qué ropa nos conviene llevar hoy?',
  },
]

export default function BienvenidaCopiloto({ yo, alElegir, desactivado }) {
  return (
    <div className="cop-inicio">
      <div className="cop-supervision">
        <span className="cop-supervision-dot" aria-hidden="true" />
        <span>Supervisión Activa · 9 Miembros (6 a 74 años)</span>
      </div>

      <div className="cop-hero-head">
        <div>
          <h1 className="cop-titulo">Copiloto IA del Viaje</h1>
          <p className="cop-lede">
            Hola{yo ? `, ${yo.short}` : ''}. Asistente en tiempo real para ritmo familiar, accesibilidad, mapa y reservas.
          </p>
        </div>
      </div>

      <div className="cop-insights">
        {INSIGHTS.map((item, i) => (
          <div key={i} className="cop-insight-card">
            <div className="cop-insight-head">
              <span className="cop-insight-tag">{item.tag}</span>
              <span className="cop-insight-ico"><Icon name={item.icono} size={15} /></span>
            </div>
            <strong className="cop-insight-titulo">{item.titulo}</strong>
            <p className="cop-insight-desc">{item.desc}</p>
            <button
              type="button"
              className="cop-insight-btn"
              disabled={desactivado}
              onClick={() => alElegir(item.prompt)}
            >
              {item.accion} →
            </button>
          </div>
        ))}
      </div>

      <div className="cop-seccion-atajos">
        <span className="cop-atajos-titulo">Consultas Rápidas</span>
        <div className="cop-atajos">
          <button type="button" className="cop-atajo" disabled={desactivado} onClick={() => alElegir('¿Dónde merendar cerca del Retiro con niños y abuelos?')}>
            ¿Dónde merendar cerca del Retiro con niños?
          </button>
          <button type="button" className="cop-atajo" disabled={desactivado} onClick={() => alElegir('¿Cómo llegamos a la próxima actividad de la agenda?')}>
            ¿Cómo llegamos a la próxima actividad?
          </button>
          <button type="button" className="cop-atajo" disabled={desactivado} onClick={() => alElegir('Propón cinco opciones para cenar en la ciudad donde estaremos hoy')}>
            5 opciones para cenar hoy
          </button>
          <button type="button" className="cop-atajo" disabled={desactivado} onClick={() => alElegir('¿Qué nos falta por decidir para el viaje?')}>
            ¿Qué nos falta por decidir?
          </button>
        </div>
      </div>

      <div className="cop-metricas-footer">
        <div className="cop-metrica-pill">
          <Icon name="users" size={14} />
          <span>9/9 Confirmados</span>
        </div>
        <div className="cop-metrica-pill">
          <Icon name="euro" size={14} />
          <span>Bote Común Activo</span>
        </div>
        <div className="cop-metrica-pill">
          <Icon name="check" size={14} />
          <span>Asistencia Familiar 24/7</span>
        </div>
      </div>
    </div>
  )
}
