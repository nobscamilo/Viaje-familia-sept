import { useEffect, useState } from 'react'
import { CATEGORIAS, HOGARES } from '../data/hogares.js'
import { GROUPS, TRIP } from '../data/trip-madrid-2026.js'
import { useTrip } from '../hooks/useTrip.js'
import { aCentimos, euros, pesos, tienePagadores } from '../domain/cuentas.js'
import { diaDelViaje } from '../domain/dates.js'
import { copAEur, eurACop, tasaCop, tasaLegible } from '../services/cambio.js'
import { anotarGasto, borrarGasto, editarGasto } from '../services/cuentas.js'
import './nuevo-gasto.css'

const QUIENES = [
  { id: 'all', label: 'Los nueve' },
  { id: 'f1', label: 'Grupo F1' },
  { id: 'sin-f1', label: 'Sin F1' },
  { id: 'sueltos', label: 'Elegir…' },
]

const hoy = () => {
  const d = diaDelViaje()
  return d < TRIP.startDate ? TRIP.startDate : d > TRIP.endDate ? TRIP.endDate : d
}

/**
 * Anotar un gasto, de pie y con una mano, justo después de pagar.
 *
 * La versión anterior era una hoja de móvil estirada: en un portátil ocupaba
 * 1.900 px de ancho, con campos de un metro y aire muerto en medio. Un
 * formulario de siete campos no mejora por ser más ancho — se vuelve ilegible,
 * porque el ojo tiene que cruzar la pantalla entera entre la etiqueta y el
 * dato. Ahora tiene ancho máximo y en pantalla grande es un diálogo centrado;
 * en el móvil sigue siendo la hoja de abajo, que es donde llega el pulgar.
 *
 * El orden de los campos es el orden en que se piensa: cuánto, qué era, quién
 * lo puso, para quién. Solo el importe y el concepto son obligatorios: si
 * hiciera falta rellenar seis campos para apuntar un café, nadie apuntaría el
 * café y las cuentas serían mentira a los dos días.
 */
export default function NuevoGasto({ alCerrar, gasto = null }) {
  const { tripId, travelers, yo, user, rol, modoLocal } = useTrip()
  const editando = Boolean(gasto)

  const [moneda, setMoneda] = useState(gasto?.copCent ? 'COP' : 'EUR')
  const [importe, setImporte] = useState(() => (
    gasto ? (gasto.copCent ? pesos(gasto.copCent) : euros(gasto.importeCent, false)) : ''
  ))
  const [concepto, setConcepto] = useState(gasto?.concepto ?? '')
  const [quien, setQuien] = useState(gasto?.pagadoPor ?? yo?.id ?? 'camilo')
  // `participantes` es un grupo ('all', 'f1', 'sin-f1') o una LISTA de
  // viajeros. El motor ya repartía entre una lista desde el primer día —el
  // vuelo de Bilbao son solo Camilo y Juliana— pero la pantalla solo sabía
  // ofrecer los tres grupos.
  const listaInicial = Array.isArray(gasto?.participantes) ? gasto.participantes : null
  const [participantes, setParticipantes] = useState(
    listaInicial ?? (typeof gasto?.participantes === 'string' ? gasto.participantes : 'all'),
  )
  const [elegidos, setElegidos] = useState(() => listaInicial ?? [yo?.id].filter(Boolean))
  const sueltos = Array.isArray(participantes)

  const alternar = (id) => {
    const nueva = elegidos.includes(id) ? elegidos.filter((x) => x !== id) : [...elegidos, id]
    setElegidos(nueva)
    setParticipantes(nueva)
  }
  const [categoria, setCategoria] = useState(gasto?.categoria ?? 'comida')
  const [fecha, setFecha] = useState(() => gasto?.fecha ?? hoy())
  const [tasa, setTasa] = useState(undefined)   // undefined = aún no se sabe
  const [estado, setEstado] = useState(null)
  const [confirmando, setConfirmando] = useState(false)

  /**
   * Quién puede tocar este gasto. Espeja las reglas de Firestore a propósito:
   * si la app enseña un botón que el servidor va a rechazar, la persona se
   * queda mirando un error que no entiende.
   *
   * Lo sembrado no se edita NI SIENDO OWNER: la siembra es un espejo, y el
   * siguiente `npm run publicar` devolvería el valor del código y la
   * corrección desaparecería en silencio.
   */
  const esSembrado = gasto?.origen === 'seed'
  // Un campo que se deja escribir y luego no se puede guardar es una promesa
  // rota. Si no se va a poder guardar, no se deja teclear.
  const soloLectura = editando && (esSembrado || (!modoLocal && !(
    rol === 'owner' || !gasto.createdBy || gasto.createdBy === user?.uid
  )))
  const puedoTocarlo = editando && !esSembrado && !modoLocal &&
    (rol === 'owner' || !gasto.createdBy || gasto.createdBy === user?.uid)

  // La tasa se pide una vez al abrir, no en cada tecla.
  useEffect(() => { tasaCop().then((t) => setTasa(t)) }, [])
  useEffect(() => {
    const cerrar = (e) => e.key === 'Escape' && alCerrar()
    window.addEventListener('keydown', cerrar)
    return () => window.removeEventListener('keydown', cerrar)
  }, [alCerrar])

  const tecleado = aCentimos(importe)
  const enPesos = moneda === 'COP'
  // `cent` son SIEMPRE euros: es lo único que se guarda y lo único que cuenta.
  const cent = enPesos
    ? (tecleado !== null && tasa ? copAEur(tecleado, tasa.copPorEur) : null)
    : tecleado
  // Y el equivalente en pesos, para verlo sin tener que cambiar de moneda.
  const copCent = enPesos ? tecleado : (tecleado !== null && tasa ? eurACop(tecleado, tasa.copPorEur) : null)

  /**
   * Cambiar de moneda CONVIERTE lo que ya está escrito.
   *
   * Antes solo cambiaba la etiqueta: escribías 1.000 €, pulsabas COP y seguías
   * viendo 1.000, ahora leídos como mil pesos. El número no significaba lo
   * mismo y nada lo avisaba. Ahora 1.000 € pasan a 3.676.590 y al revés.
   *
   * Sin tasa no se cambia de moneda: el botón está desactivado.
   */
  const cambiarMoneda = (m) => {
    if (m === moneda) return
    if (tecleado !== null && tasa) {
      const convertido = m === 'COP' ? eurACop(tecleado, tasa.copPorEur) : copAEur(tecleado, tasa.copPorEur)
      // En pesos no se escriben céntimos: nadie paga 3.676.590,00.
      setImporte(convertido === null ? '' : m === 'COP' ? pesos(convertido) : euros(convertido, false))
    }
    setMoneda(m)
  }

  // Sin ningún adulto entre los participantes no hay quien lo pague, y los
  // saldos dejarían de sumar cero. No se deja guardar.
  const hayQuienPague = tienePagadores(participantes, travelers, GROUPS)
  const listo = cent !== null && cent > 0 && concepto.trim().length > 0 && !modoLocal &&
    hayQuienPague && (!editando || puedoTocarlo)
  const adultos = travelers.filter((t) => HOGARES.some((h) => h.miembros.includes(t.id)))

  const guardar = async () => {
    if (!listo) return
    setEstado('guardando')
    const datos = {
      concepto: concepto.trim().slice(0, 140),
      importeCent: cent,
      moneda: 'EUR',
      // La tasa viaja CON el gasto. Sin esto, la cena del día 12 valdría
      // distinto cada vez que alguien abriera la app.
      ...(enPesos
        ? { copCent: tecleado, tasaCopPorEur: tasa.copPorEur, tasaFecha: tasa.fecha ?? null }
        // Al pasar un gasto de pesos a euros hay que BORRAR los pesos viejos,
        // o la lista seguiría enseñando una cifra en COP que ya no cuadra.
        : { copCent: null, tasaCopPorEur: null, tasaFecha: null }),
      pagadoPor: quien,
      participantes,
      categoria,
      fecha,
    }
    try {
      if (editando) await editarGasto(tripId, gasto.id, datos)
      else await anotarGasto(tripId, datos, user?.uid)
      alCerrar()
    } catch {
      setEstado('No se pudo guardar. Inténtalo otra vez.')
    }
  }

  const quitar = async () => {
    setEstado('guardando')
    try {
      await borrarGasto(tripId, gasto.id)
      alCerrar()
    } catch {
      setEstado('No se pudo quitar. Puede que lo anotara otra persona.')
    }
  }

  return (
    <div className="ng-fondo" role="dialog" aria-modal="true"
      aria-label={editando ? 'Editar el gasto' : 'Anotar un gasto'} onClick={alCerrar}>
      <div className="ng" onClick={(e) => e.stopPropagation()}>
        <header className="ng-head">
          <h2>{editando ? 'Editar el gasto' : 'Anotar un gasto'}</h2>
          <button type="button" className="ng-x" onClick={alCerrar} aria-label="Cerrar">×</button>
        </header>

        {/* El selector, horizontal y encima del número.
            Vertical y a la izquierda se leía como una etiqueta, no como un
            interruptor: se podía teclear una cifra en pesos creyendo estar en
            euros. Segmentado y del ancho del campo, no hay duda de en qué
            moneda estás escribiendo. */}
        <div className="ng-monedas" role="group" aria-label="Moneda del importe">
          {[['EUR', 'Euros'], ['COP', 'Pesos colombianos']].map(([m, largo]) => (
            <button
              key={m} type="button"
              className={`ng-moneda ${moneda === m ? 'is-on' : ''}`}
              onClick={() => cambiarMoneda(m)}
              disabled={soloLectura || (m === 'COP' && tasa === null)}
              aria-pressed={moneda === m}
              title={m === 'COP' && tasa === null ? 'Sin conexión para consultar el cambio' : largo}
            >{largo}</button>
          ))}
        </div>

        <div className="ng-dinero">
          <input
            className="ng-cifra"
            type="text" inputMode="decimal" autoFocus
            value={importe} onChange={(e) => setImporte(e.target.value)}
            readOnly={soloLectura}
            placeholder={enPesos ? '0' : '0,00'}
            aria-label={enPesos ? 'Importe en pesos colombianos' : 'Importe en euros'}
          />
          {/* La unidad, pegada al número. Un importe sin moneda al lado es
              justo lo que hizo falta aclarar. */}
          <span className="ng-unidad" aria-hidden="true">{enPesos ? 'COP' : '€'}</span>
        </div>

        {/* El equivalente SIEMPRE a la vista, en las dos direcciones: así no
            hace falta cambiar de moneda para saber cuánto es. */}
        <p className="ng-cambio">
          {importe && tecleado === null && <span className="ng-mal">Eso no es un importe.</span>}
          {tasa === undefined && 'Consultando el cambio…'}
          {tasa === null && 'Sin cambio disponible: apunta el importe en euros.'}
          {tasa && tecleado !== null && (
            <>
              {enPesos
                ? <>Son <strong>{euros(cent)}</strong></>
                : <>Son <strong>{pesos(copCent)} COP</strong></>}
              {' · '}{tasaLegible(tasa.copPorEur)}{tasa.fecha && <> ({tasa.fecha})</>}
              {' · '}referencia de mercado: tu banco cobrará algo más
            </>
          )}
          {tasa && tecleado === null && !importe && (
            <>Puedes escribirlo en euros o en pesos · {tasaLegible(tasa.copPorEur)}</>
          )}
        </p>

        <label className="ng-campo">
          <span className="ng-label">Qué era</span>
          <input
            type="text" value={concepto} maxLength={140} readOnly={soloLectura}
            onChange={(e) => setConcepto(e.target.value)}
            placeholder="Comida en Rosi La Loca"
          />
        </label>

        <div className="ng-fila">
          <div className="ng-campo">
            <span className="ng-label">Quién lo puso</span>
            <select value={quien} disabled={soloLectura} onChange={(e) => setQuien(e.target.value)}>
              {adultos.map((t) => <option key={t.id} value={t.id}>{t.short}</option>)}
            </select>
          </div>
          <div className="ng-campo">
            <span className="ng-label">Día</span>
            <input type="date" value={fecha} min={TRIP.startDate} max={TRIP.endDate}
              readOnly={soloLectura} onChange={(e) => setFecha(e.target.value)} />
          </div>
        </div>

        <div className="ng-campo">
          <span className="ng-label">Para quién</span>
          <div className="ng-chips">
            {QUIENES.map((q) => (
              <button
                key={q.id} type="button"
                className={`ng-chip ${(q.id === 'sueltos' ? sueltos : participantes === q.id) ? 'is-on' : ''}`}
                disabled={soloLectura}
                onClick={() => setParticipantes(q.id === 'sueltos' ? elegidos : q.id)}
              >{q.label}</button>
            ))}
          </div>

          {sueltos && (
            <>
              {/* Solo los siete adultos: son los que reparten. Los niños que
                  vayan a esa comida siguen comiendo — su parte la ponen los
                  adultos presentes, igual que en todo lo demás. */}
              <div className="ng-gente">
                {/* El punto de color va SIEMPRE, elegido o no. En esta lista
                    hay una «Juliana Bueno» y una «Juliana» —la hermana— una al
                    lado de la otra, y un «Julián» y un «Julián David». En gris
                    son cuatro nombres que se parecen; con su color son cuatro
                    personas. Para eso están los colores en travelers.js. */}
                {adultos.map((t) => (
                  <button
                    key={t.id} type="button"
                    className={`ng-quien ${elegidos.includes(t.id) ? 'is-on' : ''}`}
                    style={elegidos.includes(t.id) && t.color
                      ? { borderColor: t.color, color: t.color } : undefined}
                    disabled={soloLectura}
                    aria-pressed={elegidos.includes(t.id)}
                    onClick={() => alternar(t.id)}
                  >
                    <i className="ng-punto" style={{ background: t.color }} aria-hidden="true" />
                    {t.short}
                  </button>
                ))}
              </div>
              {!hayQuienPague && <p className="ng-mal">Elige al menos a una persona.</p>}
            </>
          )}
        </div>

        <div className="ng-campo">
          <span className="ng-label">Categoría</span>
          <div className="ng-chips ng-chips-cat">
            {CATEGORIAS.map((c) => (
              <button
                key={c.id} type="button"
                className={`ng-chip ${categoria === c.id ? 'is-on' : ''}`}
                disabled={soloLectura}
                onClick={() => setCategoria(c.id)}
              >{c.label}</button>
            ))}
          </div>
        </div>

        <p className="ng-pista">Se divide entre los adultos que van. Los niños no pagan.</p>

        {modoLocal && <p className="ng-mal">Modo local: no hay servidor al que escribir.</p>}
        {esSembrado && (
          <p className="ng-aviso">
            Esta es una reserva verificada contra su correo. No se edita desde aquí:
            el importe vive en <code>src/data/gastos-iniciales.js</code>, donde al lado
            queda escrito de dónde sale. Si lo cambiaras aquí, la próxima siembra lo
            devolvería a su sitio sin avisar.
          </p>
        )}
        {editando && !esSembrado && !puedoTocarlo && !modoLocal && (
          <p className="ng-aviso">Lo anotó otra persona: solo puede cambiarlo quien lo puso o quien organiza.</p>
        )}
        {typeof estado === 'string' && estado !== 'guardando' && <p className="ng-mal">{estado}</p>}

        {!soloLectura && (
        <button type="button" className="ng-ok" onClick={guardar} disabled={!listo || estado === 'guardando'}>
          {estado === 'guardando' ? 'Guardando…'
            : listo ? `${editando ? 'Guardar' : 'Anotar'} ${euros(cent)}`
              : editando ? 'Guardar' : 'Anotar'}
        </button>
        )}

        {/* Quitar, con un paso de confirmación. Un botón de borrar sin
            confirmar, en una lista donde cada fila es dinero de alguien, es
            un accidente esperando a pasar. */}
        {puedoTocarlo && (
          confirmando ? (
            <div className="ng-confirmar">
              <span>¿Quitar «{gasto.concepto}»?</span>
              <button type="button" className="ng-no" onClick={() => setConfirmando(false)}>No</button>
              <button type="button" className="ng-si" onClick={quitar} disabled={estado === 'guardando'}>
                Sí, quitarlo
              </button>
            </div>
          ) : (
            <button type="button" className="ng-quitar" onClick={() => setConfirmando(true)}>
              Quitar este gasto
            </button>
          )
        )}
      </div>
    </div>
  )
}
