# Reinvención de Viaje Familia — plan vigente

**Fecha:** 2026-08-25 · **Decisión del owner (Camilo), actualizada 25 ago:** **empezar desde cero** (proyecto y código nuevos, mismo stack). Calidad por encima de la fecha; explícitamente dijo que el tiempo no es la restricción.
**Sin fecha de corte.** El viaje sale el 10 de septiembre pero NO se publica nada para él: decisión explícita de Camilo el 25 de agosto. Ver §7.
**Datos reales del viaje (viajeros y reservas verificadas):** `docs/datos-viaje.md`.
**Documento navegable:** https://claude.ai/code/artifact/8d485c43-ba29-41d6-aba1-6d5e46aa1794

> ⚠️ Cualquier agente que trabaje en este repo a partir de esta fecha debe leer este archivo ANTES de tocar `src/`.
> La arquitectura anterior (7 pestañas sobre `App.jsx`) está **deprecada por decisión de producto**, no por gusto.

---

## 1. Diagnóstico (evidencia, no opinión)

| Hallazgo | Evidencia |
|---|---|
| No hay arquitectura de frontend | `src/App.jsx` = 8.309 líneas, 92 `useState`, 13 `useEffect` en un componente |
| No hay sistema de diseño | `src/App.css` = 10.556 líneas; las reglas de `AGENTS.md` viven en prosa, no en tokens |
| La IA está escondida | 13 Cloud Functions con Gemini; el chat (`chatWithPlanner`) vive en un popover de la topbar |
| Bug de escritura concurrente | `saveOptionVotes` (tripRepository.js:302) reescribe el mapa `members` completo con `merge:true` → un cliente con estado viejo borra votos ajenos. Mismo patrón en `saveTripBudget` con `optionIds` |
| Los niños no son datos | Edades quemadas dentro de prompts ("niños de 5 y 9 años"); no hay entidad viajero |
| Roles quemados | `firestore.rules` compara contra dos emails literales |
| Adopción | La familia entró una vez y no volvió. No hay analítica que lo mida |

**Corrección documental:** el proyecto usa **Google AI Studio** (`GEMINI_API_KEY` + `@google/genai`), tal como exige `AGENTS.md`. La memoria del proyecto afirmaba erróneamente que usaba Vertex AI. Ya corregido.

---

## 2. Tesis del rediseño

La app está organizada alrededor del **modelo de datos** (7 colecciones = 7 pestañas). Debe organizarse alrededor del **tiempo** y de las **decisiones**.

## 3. Arquitectura de información: 3 superficies

1. **Ahora** — el viaje como línea de tiempo continua (vuelos, trenes, check-ins, planes). Durante el viaje: "ahora / a continuación".
2. **Decisiones** — todo lo abierto con estado explícito `propuesto → en votación → decidido → reservado → pagado`. Hospedaje/comida/actividades/transporte pasan de pestañas a **tipos de decisión** (filtros).
3. **Copiloto** — hilo único donde conviven la familia y la IA. La IA ejecuta acciones vía function calling; **toda escritura de la IA aterriza como propuesta**, nunca como cambio silencioso.

## 4. Modelo de datos: viajeros ≠ usuarios

- `travelers` — toda persona que ocupa cama/asiento/entrada/presupuesto, **incluidos los niños**. Campos: edad, restricciones alimentarias, movilidad, ritmo (siesta, hora de dormir). No inician sesión.
- `members` — subconjunto de viajeros con cuenta.
- `guardianOf[]` — qué viajeros representa cada adulto.
- Roles en `trips/{tripId}.roles`: `owner` | `adult` | `viewer` | `child`. **Los `child` nunca cuentan en el denominador de una votación.**
- Una votación se cierra con los adultos que participan en **esa** decisión, no con todos los miembros.
- El copiloto recibe la composición real del grupo en cada llamada (deja de haber edades en los prompts).

## 5. Capa de IA

De 13 funciones sueltas a un copiloto con herramientas: `proponerOpcion`, `moverBloque`, `abrirVotacion`, `calcularReparto`, `buscarLugares`, `verificarDisponibilidad`.
Agente proactivo diario vía Cloud Scheduler (clima, huecos, conflictos, check-ins, decisiones estancadas) + briefing.

### Notificaciones — RESUELTO (25 ago). Camilo las aceptó.

Estrategia de tres canales + uno descartado:

1. **Calendario compartido de Google — empezar por aquí.** Camilo ya recibe avisos de Calendar de sus vuelos y del tour del Bernabéu: el canal ya funciona en los móviles de la familia sin instalar nada. La app escribe el itinerario en un calendario del viaje. Máximo resultado por unidad de esfuerzo, y el único que funciona igual a los 63 años que a los 18.
2. **Correo — base garantizada.** Resumen (no evento por evento): semanal antes del viaje, diario durante. Firebase Trigger Email o un proveedor tipo Resend desde Cloud Functions.
3. **Push web (FCM) — mejora opcional** para quien instale la PWA. En iOS exige "Añadir a pantalla de inicio"; es fricción real pero deseable, porque queremos el icono ahí.
4. **WhatsApp — DESCARTADO.** La Cloud API oficial exige cuenta de empresa Meta, verificación, plantillas aprobadas y coste por conversación: semanas de trámite para 5 destinatarios. Las librerías no oficiales violan los ToS y acaban con el número bloqueado. Sustituto: botón **«Copiar resumen»** que deja el briefing listo para pegar en el grupo familiar. 90 % del valor, cero infraestructura.

## 6. Arquitectura técnica

**Empezar desde cero = proyecto y código nuevos, mismo stack.** React 19 + Vite + Firebase + Gemini (AI Studio) no es lo que falló; lo que falló fue no tener arquitectura encima. Cambiar de tecnología añadiría meses y no resolvería el problema.

**Se rescata del proyecto viejo:** las Cloud Functions de IA y Google Maps (la lógica de análisis, precios y fotos es buena y se porta casi tal cual), el proyecto de Firebase con su dominio y claves, y los datos ya cargados (migrados por script).

**No se rescata nada de:**
- `App.jsx` completo → rutas + vistas + componentes. Límite duro: **ningún archivo > 400 líneas**.
- `App.css` completo → ~40 tokens CSS + primitivos. Las reglas estéticas de `AGENTS.md` pasan a ser tokens.
- El hack `tripId__id` → subcolecciones reales: `trips/{tripId}/decisions|votes|comments|timeline|travelers`.
- Emails quemados en `firestore.rules` → roles en el documento del trip.
- Duplicaciones conocidas: `MADRID_F1_TRIP_ID` y `defaultBudgetOptionIdsForTrip` (en `tripRepository.js` y `tripDefaults.js`); id legacy `juliana-novia` en App.jsx.

**Se añade:** router real con estado en la URL; estado por dominio (`useTimeline`, `useDecisions`, `useTravelers`); escrituras atómicas (**un documento por voto**, `increment`, transacciones); analítica mínima; script de migración de datos.

## 7. Plan — sin fecha de corte

**DECIDIDO (25 ago):** empezar limpio, sin prisa, sin excepción para septiembre.

**REVERTIDO (26 ago): Camilo cambió de idea — «Sí, apuntamos a usarla».** La app nueva sí se usa en el viaje del 10 al 23 de septiembre. Esto no reintroduce fechas de corte en los bloques 2–4, pero sí fija una prioridad: **lo que se usa con la maleta en la mano va primero**. De ahí que «Ahora» se rehiciera antes que Decisiones o Ajustes.

| Bloque | Ritmo | Contenido |
|---|---|---|
| 1 | desde el 26 ago | Proyecto nuevo, tokens y primitivos, router, modelo de viajeros y roles, subcolecciones y reglas, migración de datos |
| 2 | después | Decisiones: estados, votos trazables, comentarios, reparto de gastos, presencia ligera |
| 3 | después | Copiloto: chat como superficie, function calling, propuestas |
| 4 | después | Proactividad (calendario compartido + correo + push) y multi-viaje genérico |

**Sin fechas de corte.** Cada bloque se da por terminado cuando está bien, no cuando llega un día. No hay "orden de sacrificio" porque no hay nada que sacrificar.

**El viaje de septiembre sigue siendo material de investigación**, pero ahora desde dentro: la familia usa la app y lo que falle se ve en vivo. Recoger igual al volver (25 sep) mientras esté fresco: qué preguntaron por WhatsApp en vez de mirar la app, qué se perdió, qué hubo que repetir.

## 7 bis. Tono e idioma de la IA — DECIDIDO (25 ago)

**Español colombiano.** El copiloto habla como la familia: voz y calidez colombianas, tuteo a todos.

⚠️ **Matiz obligatorio en los prompts:** el contenido logístico es español de España y NO se traduce. *Cercanías*, *Renfe*, *AVE*, *IFEMA*, *abono transporte*, *el Metro*, nombres de estaciones, barrios y trámites se dejan tal cual, porque es lo que la familia va a leer en los carteles y en las apps. La regla para el prompt del sistema:

> **Voz colombiana; vocabulario local español para lugares, transporte y trámites.**

Nada de inventar equivalencias regionales para términos que la familia va a ver escritos en España.

## 8. Pendientes

1. ✅ **AV182 cerrado (26 ago): aterriza 11:10 en T4**, verificado contra la reserva. Camilo tenía razón con su ~11:00. ⚠️ **Lección:** cuatro rastreadores de vuelos de cinco daban 09:05 y se equivocaban, y llegué a cambiar el dato de la app basándome en ellos. Frente a una reserva, un agregador no es una fuente.
2. ✅ **Del 20 al 22 duermen en Guardo**, en casa de Camilo (26 ago). Sin coste. Falta confirmar cuántos caben.
3. 🔴 **La noche del 22 en Madrid no está reservada, y es obligatoria.** El AV027 sale a las 09:40 de T4 (verificado en la reserva): hay que estar a las 07:40, y desde Guardo son 3 h 35 min. Es el hueco más urgente que queda.
4. 🔴 **El coche de alquiler tiene que ser de siete plazas.** Van dos coches (el de Camilo, en Bilbao, más uno alquilado). Nueve personas caben en dos turismos; nueve maletas de catorce días, no. Ojo también al recargo por recoger en Bilbao y devolver en Madrid.
5. Choque del **Classic Tour Bernabéu** (10:30) con el viernes de circuito: o el tour es para el grupo sin F1, o hay que moverlo.
6. Las 3,5 horas muertas del 10 de septiembre, entre el aterrizaje y el check-in de las 15:00.
7. Detalle de las entradas de F1 (Fever). ✅ **Barcelona cerrado** (26 ago): OUIGO 06541 el 14 a las 13:42 de Atocha, y el Sweett del 14 al 16 con el check-in ya hecho.
7 bis. 🔴 **Añadir las maletas de cabina al vuelo Barcelona → París (MLD57T).** No están pagadas en ese vuelo, aunque sí en el de Bilbao del 19. Hasta 675 € en la puerta de embarque contra unos 225 € por internet. Es el euro más caro que queda suelto en el viaje.
7 ter. ⚠️ **Traslado al aeropuerto de Orly de madrugada el 19.** El vuelo sale a las 07:10 y el mostrador cierra a las 06:30.
8. ✅ **Techo de gasto puesto** (26 ago). Cuotas diarias duras en Places y Routes, presupuesto de 20 €/mes acotado al proyecto, Vertex AI apagado y dos claves de API sin restricción borradas. Detalle en `viaje-app/docs/configuracion.md`. **Queda sin tope Gemini**: no hay cuota diaria ajustable en el nivel de pago; el freno real sería un límite de mensajes por persona y día dentro de la Cloud Function, y no está hecho.
9. ✅ **Clave de cuenta de servicio revocada** (confirmado por Camilo el 26 ago).
10. Recoger, al volver del viaje (25 sep), qué echó de menos la familia.

## 9. Resuelto el 25 de agosto

- ✅ **Empezar desde cero**, sin fecha de corte, sin excepción para septiembre.
- ✅ **Notificaciones aceptadas.** Estrategia de 3 canales + WhatsApp descartado: ver §5.
- ✅ **Tono de la IA:** español colombiano con vocabulario logístico español. Ver §7 bis.
- ✅ **Los 9 viajeros**, con nombres y edades reales: `docs/datos-viaje.md`. Cuadran con la reserva de Booking (7 adultos + 2 niños de 4 y 9).
- ✅ **Reservas rastreadas en Gmail:** 7 confirmadas, 8 huecos abiertos.
- ⚠️ **Corregido:** los niños tienen **4 y 9** años, no "5 y 9" como decía el prompt de la app.

## 10. Resuelto el 26 de agosto

- ✅ **La app SÍ se usa en el viaje de septiembre.** Ver §7.
- ✅ **«Ahora» merece el nombre.** Durante el viaje ya no arranca en el día 10: se ancla en hoy, pliega lo que ya pasó y pone arriba una tarjeta de «Ahora mismo» y otra de «Lo siguiente» con hora, sitio y *Cómo llegar*. La cabecera pasa de contar hacia la salida a «día 2 de 14».
- ✅ **Se puede ver cualquier día del viaje sin esperar:** `?hoy=2026-09-11T14:00` congela el reloj y avisa en pantalla. Toda la lógica que depende de la hora recibe `ahora` como parámetro; ninguna lo lee por su cuenta. Es lo que hace la pantalla probable y previsualizable.
- ⚠️ **Corregido un dato, no solo código:** en el `AV182` la hora que teníamos (11:00) es la de **aterrizaje**, no la de salida — el vuelo sale de Bogotá la noche anterior. En el `IB0430` es la de salida. La agenda mezclaba las dos cosas bajo el mismo campo. Ahora el vuelo con hora de llegada lo dice: «llega 11:00».
- ⚠️ **Corregido:** el botón *Cómo llegar* de un vuelo trazaba ruta a «Madrid», el centro de la ciudad. Ahora apunta al aeropuerto que toca (el de salida antes de volar, la terminal de llegada si la hora que hay es la de aterrizaje) y desaparece si no hay un sitio real al que ir.
- ✅ **Desplegado y verificado en producción**, no solo compilado: `https://viaje-familia-sept-2026.web.app`.
- ✅ **Techo de gasto real, no un aviso.** Ver §8.8 y `viaje-app/docs/configuracion.md`.
- ⚠️ **La clave de Gemini estaba muerta otra vez.** No lo detectó nadie leyendo código: lo cantó la prueba de humo del copiloto al ejecutarla. La que había en Secret Manager ya no existía en ningún proyecto de la cuenta (se barrieron todos comparando huellas). Se creó una nueva restringida a `generativelanguage`, se guardó y se redesplegó. El copiloto vuelve a responder con datos reales de Places.
- ✅ **Hora del AV182 confirmada: 11:10 en T4.** Por el camino la puse en 09:05 haciendo caso a cuatro rastreadores de vuelos, y estaba mal: la reserva dice 11:10. El grupo está completo hacia las 11:30 y quedan ~3,5 horas muertas hasta el check-in de las 15:00. **Los rastreadores no son fuente cuando existe una reserva.**

- ✅ **Cerrado el final del viaje (26 ago):** del 20 al 22 en Guardo, casa de Camilo; noche del 22 en Madrid; AV027 a las 09:40 desde T4. Las distancias no se estimaron a ojo — se midieron con la Routes API del propio proyecto.
- ⚠️ **Lo que aparece al cerrar un hueco son dos huecos nuevos:** la noche del 22 en Madrid sigue sin reservar, y dos turismos no llevan nueve maletas. Un hueco tapado sin mirar lo que arrastra es un hueco que reaparece durante el viaje.
- 🔧 `trip-madrid-2026.js` rozaba las 400 líneas: las decisiones abiertas se movieron a `decisiones-sept-2026.js`, reexportadas desde el módulo antiguo para no tocar a los seis sitios que importan de él.

- ✅ **Barcelona no estaba abierto: estaba sin buscar.** El 26 de agosto la documentación seguía diciendo «fechas exactas sin verificar» cuando el correo tenía la reserva desde el 30 de julio y el tren desde el 18 de mayo. **Un dato marcado como pendiente no es lo mismo que un dato que falta**, y arrastrarlo sin comprobarlo es peor que no anotarlo: da la sensación de que ya se miró. Lo corrigió Camilo, no una revisión propia.
- ✅ **OUIGO 06541 · Atocha 13:42 → Sants 16:44**, localizador J6FGQQ, los nueve, coche 6.
- ⚠️ **Lo caro estaba en la letra pequeña, no en el hueco:** la tarifa Esencial del OUIGO no cubre maletas facturadas, y el piso de Barcelona pide 146,30 € de impuesto y 300 € de depósito con tarjeta de crédito a la llegada. Nada de eso aparecía en la agenda, y todo llega el mismo día.

- ⚠️ **Los nueve van con mochila y maleta de cabina, nada facturado (Camilo, 26 ago).** Eso invalidó el aviso que yo había puesto sobre maletas de 23 kg en el OUIGO — pero al ir a leer las confirmaciones de Vueling apareció algo peor: **la maleta de cabina está pagada en el vuelo del 19 a Bilbao y NO en el del 16 a París.** La misma familia, el mismo viaje, dos reservas hechas el mismo día con equipaje distinto.
- **La lección se repite:** los datos estaban en el correo desde mayo. Nadie los había leído. Marcar «quién viaja» como pendiente durante semanas, cuando las tres confirmaciones llevan los nueve nombres escritos, es el mismo error que con las fechas de Barcelona.
- ⚠️ **VY1463 sale de Orly a las 07:10 el 19.** Salir del ibis de Saint-Maurice sobre las 05:00 con nueve personas. No estaba en ninguna parte.

- 🔴 **El fallo mas grave del dia, y lo vio Camilo, no yo: la web se desplego cinco veces sin que la familia viera un solo cambio.** En produccion la app lee la agenda de **Firestore**; `src/data/` solo manda en modo local. Firestore seguia sirviendo un viaje que acababa el 19 de septiembre, sin Santander, sin Guardo y sin el AV027.
- **Y mis capturas de verificacion tampoco lo cazaron, porque se hacian en modo local** (`VITE_FIREBASE_API_KEY=''`), que lee `src/data/`. Verificaba justo la mitad que yo mismo acababa de cambiar. Una comprobacion que solo mira tu propia fuente no es una comprobacion.
- ✅ **Arreglado:** `npm run publicar` hace comprobaciones + datos a Firestore + web, y el README dice en la primera linea de la seccion que `deploy:web` por si solo no actualiza nada de lo que ve la familia.
- ✅ **`scripts/seed.mjs` pasa de volcado a espejo:** lo que se quita de `src/data/` se borra de Firestore. Nunca toca lo que creo una persona — un plan agregado por el copiloto lleva el uid de quien lo pidio — ni pisa el estado de una decision ya votada.
- ⚠️ **Las decisiones resueltas no se borran, se cierran.** «Trazabilidad» era un requisito: una decision que desaparece de la pantalla no deja rastro de por que se tomo. Las tres cerradas hoy (check-in de Barcelona, hora del AV182, como se va a Barcelona) viven en `DECISIONES_CERRADAS` con el motivo, bajo el filtro *Cerradas*.
- 🔎 **Trampa que costo encontrarlo:** el arranque del cliente firmaba las decisiones de siembra con el uid de quien entrara primero, indistinguible de una decision abierta por una persona. Ahora ademas marca `origen: 'seed'`.

## 11. El mapa (27 de agosto de 2026)

Camilo lo pidio **antes** del rediseño visual, y tenia razon: un mapa cambia la
maqueta de las tarjetas, y rehacer el visual dos veces es tiempo tirado.

- ✅ **Cuarta superficie: Mapa.** La regla era «tres y nada mas», contra la app
  vieja de siete pestañas. Esta se gano el sitio porque responde una pregunta
  que ninguna de las otras tres respondia: *¿donde queda esto?* La quinta tendra
  que justificarse igual de bien.
- ✅ **Google Maps interactivo**, cargado bajo demanda, con tope de 300 cargas
  al dia para no salir del nivel gratuito.
- ✅ **Coordenadas precalculadas** (`scripts/geocodificar.mjs` → `src/data/coordenadas.js`).
  La app no paga geocoding en caliente por un dato que no cambia.
- ⚠️ **Dos geocodificaciones salieron mal y las cazaron las pruebas, no la vista:**
  «Estacion de Madrid Puerta de Atocha» devolvia **Estacion del Arte**, a 500 m —
  con un tren que cierra puertas cinco minutos antes de salir, 500 m son el tren
  perdido — y el hotel de Paris caia en Charenton en vez de Saint-Maurice. Hay
  una prueba que fija Atocha con tolerancia de 400 m.
- ⚠️ **Bug propio que solo se vio mirando el DOM, no la captura:** el efecto que
  pinta los marcadores corria antes de que el mapa existiera (se crea dentro de
  un `.then()`) y no volvia a correr. El mapa salia perfecto y vacio. La captura
  no lo delataba; el DOM si.
- 🔧 **Sin `mapId` y con marcadores clasicos**, a proposito: `styles` (el tema
  oscuro) solo funciona sin Map ID, y los marcadores nuevos lo exigen. Decision
  documentada en el README para que nadie lo «arregle» sin saberlo.

## 12. Seguridad — hallazgo del 27 de agosto

🔴 **El numero de reserva del hotel de Paris es el codigo del portal.** Booking
lo dice literal: *«Access code at the front door is your booking number without
dots»*. Ese numero estaba escrito en `src/data/trip-madrid-2026.js` y en
`docs/datos-viaje.md`, dentro de un repositorio con remoto publico que publica
GitHub Pages.

**No llego a filtrarse:** `git log -S` confirma que el numero nunca entro en el
historial, y tanto `viaje-app/` como `firebase-family-app/docs/` siguen sin
seguimiento. Estaba a un `git add` de ser publico.

- ✅ Retirado de ambos sitios. Vive solo en Firestore y en el correo.
- ✅ Prueba nueva en `test/secretos.test.js` que falla si vuelve a aparecer.
- ⚠️ **Queda una decision para Camilo:** los demas numeros de reserva (Madrid,
  Barcelona, Santander) siguen en el codigo. Solos valen mucho menos que este
  — no abren ninguna puerta — pero cuando `viaje-app/` se suba al repo, se
  publican. Moverlos todos a un archivo ignorado que el seed vuelque a Firestore
  es media hora de trabajo.

## 13. El copiloto y el mapa (27 de agosto)

- ✅ **Un plan que agrega el copiloto sale ahora en el mapa.** `buscarLugares`
  ya pedia `places.location` a Google, o sea que las coordenadas estaban en la
  mano y se tiraban. Ahora la Cloud Function resuelve el sitio contra Places y
  guarda `coords` en el evento.
- 🔧 **Las resuelve el servidor, no el modelo.** Reaprovechar las coordenadas
  de la busqueda anterior era mas barato, pero obliga al modelo a copiar quince
  digitos y ahi se equivoca. Un pin mal puesto es peor que ningun pin.
- ✅ **Comprobado con `functions/probar-sitio.mjs`:** Rosi La Loca resuelve a
  40.4158, -3.7030; un sitio inventado devuelve null sin romper nada. Agregar
  un plan nunca puede fallar porque el mapa no supiera geocodificar.
- ❌ **Rutas dibujadas en el mapa: DESCARTADO, y es una decision de producto,
  no de esfuerzo.** `computeRoute` ya resuelve TRANSIT, WALK y DRIVE desde hace
  semanas. Dibujar la polilinea es facil; el problema es que seria una foto sin
  horarios de metro en vivo. En la calle nadie mira nuestra linea pudiendo
  abrir Google Maps. El copiloto sigue contestando en texto y el mapa ofrece el
  salto a Maps, que es donde esta el valor de verdad.
- ⚠️ **Observado en la prueba de humo:** ante «sugiere un restaurante y agregalo»,
  el copiloto sugiere y pide confirmacion en vez de ejecutar. Ante una orden
  directa, ejecuta. Es prudente, no roto, pero si la familia se queja de que
  «no hace nada», el prompt es donde hay que mirar.

## 14. Entrar: el cuelgue y la suplantacion (27 de agosto)

Los dos los encontro Camilo usando la app, no una revision.

### El cuelgue al escoger tu nombre

🔎 **Causa:** Firestore **no reintenta** un `onSnapshot` que muere por
`permission-denied`; cierra el listener y no vuelve. Antes de apuntarte no eres
miembro, asi que el del documento del viaje moria nada mas abrir la app. Al
apuntarte, la escritura funcionaba... y no quedaba nadie escuchando. Por eso
recargar lo arreglaba: creaba un listener nuevo, ya como miembro.

✅ **Arreglo:** `apuntarme()` vive ahora en el proveedor: escribe y **rehace las
suscripciones**, en ese orden. No podia vivir en la pantalla de entrada, porque
quien tiene que resuscribirse es el proveedor.

⚠️ **Sin verificar de punta a punta.** Reproducirlo necesita una cuenta de Google
que no este vinculada, y no la tengo. El diagnostico es firme (comportamiento
documentado de Firestore) pero la prueba real es que se apunte alguien.

### Cualquiera podia escoger cualquier nombre

**DECIDIDO (27 ago): un codigo distinto por persona.** Antes habia uno solo para
todo el viaje. No permitia hacerse owner, pero si votar como el padre de otro.

- ✅ El codigo vive en `travelers/{id}.joinCode`, **nunca en el repositorio**.
  Los ninos no tienen: no se les puede suplantar.
- ✅ `scripts/codigos.mjs` los genera y los imprime una sola vez. Alfabeto sin
  I, O, 0 ni 1, que se confunden al dictarlos por telefono.
- ✅ La regla comprueba que el codigo sea **el del viajero que dices ser**.

### Lo que mas valor tuvo: probar las reglas

Se construyo `scripts/probar-reglas.mjs`, que evalua las reglas contra el motor
de Google (`firebaserules.projects.test`), no contra el emulador.

🔴 **La primera version de la regla compilaba y NO DEJABA ENTRAR A NADIE.** Los
cuatro casos de «este no debe pasar» salian bien y el unico de «este si debe
pasar» fallaba. Causa: el `get()` del codigo hay que simularlo con
`functionMocks`, y sin el mock todo sale DENY.

**Sin ese test se habria desplegado una app en la que nadie puede entrar, y lo
habriamos descubierto por un mensaje de la familia.** `npm run rules` ya no
despliega si los casos fallan.

### Suelto

- ⚠️ `npm run lint` esta roto: no hay `eslint.config.js` (ESLint 9 ya no lee
  `.eslintrc`). Nadie lo habia lanzado.

## 15. Entrar solo con el codigo (27 de agosto)

**Camilo:** «¿podemos dar la opcion de solo ingresar con codigo?». Si, y ademas
tapa un agujero.

- ✅ **Una sola casilla.** Escoger el nombre sobraba: el codigo ya dice quien
  eres. Pedir las dos cosas invitaba al error de escoger el nombre de otro y no
  entender por que no entras.
- 🔧 **Lo resuelve una Cloud Function (`unirse`), no el navegador.** No es una
  preferencia: antes de entrar no eres miembro, y un no-miembro no puede leer
  la lista de viajeros. Desde el cliente es literalmente imposible saber de
  quien es un codigo.
- ✅ **Freno a la fuerza bruta, que las reglas no podian dar.** Diez intentos
  por hora y uid en `joinAttempts/{uid}`, coleccion que el cliente no puede ni
  leer ni escribir. Contra las reglas se podia probar codigo tras codigo sin
  coste ni rastro.
- ✅ **El mensaje de error no distingue** entre «ese codigo no existe» y «ese
  codigo ya se uso». Decirlo seria confirmarle a un desconocido cuales valen.
- ✅ **Volver a entrar con tu propio codigo no rompe nada:** devuelve `yaEstabas`
  en vez de un error. Alguien reinstalando el navegador no deberia ver un fallo.

### Lo que faltaba probar, y como se probo

«Se apunta alguien nuevo» era el unico camino de la app sin verificar: pedia una
cuenta de Google sin vincular. `scripts/probar-entrada.mjs` lo resuelve emitiendo
un token propio con credenciales de administrador, canjeandolo por uno de sesion
y llamando a la funcion como lo haria una persona. **Escribe en el viaje de
verdad y lo deshace al terminar**, pase lo que pase (el `finally` limpia rol,
enlace, intentos y usuario).

⚠️ **Requiere permiso de firma:** las credenciales de usuario de gcloud no
firman tokens. Se delega en IAM (`iamcredentials.googleapis.com` +
`roles/iam.serviceAccountTokenCreator` sobre la cuenta de App Engine) para no
tener que guardar una clave de cuenta de servicio en el portatil — que es
exactamente el problema que ya tuvimos una vez. El permiso tarda varios minutos
en propagar.

### 🔴 El fallo peor del dia, y lo destapo una prueba de dos lineas

`scripts/probar-entrada.mjs` buscaba «un viajero con codigo que nadie haya
cogido» y **escogio a Camilo**. Eso solo puede pasar si Camilo no esta enlazado
a su propio viaje. Y no lo estaba: `roles` y `uidToTraveler` estaban **vacios**.

**Causa: mi propio `seed.mjs`.** Escribia `roles: {}` y `uidToTraveler: {}`
«para dejar el hueco». Con `merge: true` eso no es inofensivo: **cada
`npm run publicar` desvinculaba a toda la familia.** Se ejecuto varias veces
el 26 y el 27 de agosto.

**Por que nadie lo noto:** quien despliega ya tiene la sesion abierta y no
vuelve a pasar por la puerta. El sintoma solo aparece al recargar, y el que
recarga es otro.

- ✅ La siembra ya no escribe esos dos mapas. **Lo que genera la gente al usar
  la app no se toca nunca desde `src/data/`.**
- ✅ `scripts/reparar-enlace.mjs <correo> <travelerId> [rol]` reengancha a
  alguien a partir de su correo. Sirve tambien el dia que alguien se apunte
  con el nombre equivocado.
- ✅ Prueba nueva en `secretos.test.js` que falla si `seed.mjs` vuelve a
  mencionar `roles` o `uidToTraveler`.
- ✅ Camilo restaurado como owner y verificado que sobrevive a un `publicar`.

**La leccion no es «revisa el seed».** Es que un script que escribe en la base
de datos de produccion tiene que declarar de que es dueño. Todo lo que no salga
de `src/data/` es de las personas, y la siembra no lo toca.

### La prueba de entrada, ya completa

Ocho comprobaciones contra la funcion desplegada, con un usuario emitido para
la ocasion y borrado al terminar:

```
ok  sin sesion no se entra
ok  un codigo inventado se rechaza
ok  un codigo corto se rechaza
ok  el codigo de alguien que ya entro se rechaza
ok  con el codigo de Cielo SI se entra
ok  volver a entrar con el mismo codigo no rompe
ok  quedo enganchado al viajero correcto
ok  y con rol de adulto, no de owner
```

## 16. Fuera Google: se entra con el codigo (27 de agosto)

**Camilo:** «inicio sesion con Google y entra a la app, pero la idea es evitar
esto». El objetivo no era arreglar el login: era **quitarlo**.

- ✅ **El codigo ES la sesion.** `unirse` comprueba de quien es el codigo y
  devuelve un token a nombre de ese viajero; el navegador lo canjea con
  `signInWithCustomToken`. Cero pantallas de Google.
- 🔧 **La funcion va SIN autenticar**, a proposito: quien llega con un codigo
  todavia no tiene sesion, y el objetivo es que no tenga que sacarse una. El
  freno a la fuerza bruta pasa a contarse **por IP** en vez de por uid.
- 🔧 **uid estable derivado del viajero** (`viajero_julian-padre`), no de la
  cuenta ni del dispositivo. Con uids anonimos, cambiar de movil habria dejado
  los votos huerfanos y al viajero «ocupado» por un uid muerto.
- 🔧 **El codigo manda sobre cualquier enlace anterior.** Se mueve el viajero al
  uid nuevo y se limpian los viejos. Sin eso, cambiar de telefono te dejaba
  fuera para siempre.
- ✅ **Google sigue ahi, escondido**, para las cuentas ya enlazadas. Un cambio
  de identidad sin puerta trasera deja a alguien fuera, siempre.
- ⚠️ **El precio, dicho claro:** quien tenga el codigo es esa persona. No hay
  segundo factor. Para nueve familiares compensa; para algo mas serio, no.

### Lo que destapo mirar Firebase Auth

Buscando por que Camilo veia la pantalla de Google aparecio que **cinco personas
ya habian entrado**: el, su papa, su hermana, Fernando y una cuenta a nombre de
Juan Felipe. **A los cinco les habia borrado el enlace el mismo bug del seed.**
No era «Camilo desvinculado»: era la familia entera, y llevaba horas asi.

Restaurados los cuatro adultos confirmados por Camilo. La quinta cuenta
(`juanfelipemunozsarmiento@gmail.com`) la usa un adulto, pero falta saber cual:
queda sin enganchar antes que enganchada a ojo.

### La prueba de entrada, rehecha

```
ok  un codigo inventado se rechaza
ok  un codigo corto se rechaza
ok  con el codigo de Cielo se entra SIN Google
ok  y devuelve el viajero correcto
ok  el token sirve de verdad como sesion
ok  queda enganchado con un uid estable
ok  entrar dos veces no duplica identidades
ok  y ese viajero sigue teniendo un solo uid
```

Las dos ultimas son las que importan: son las que verifican que no se acumulen
identidades fantasma, que era el riesgo real del cambio.

## 17. La pasada visual (27 de agosto)

**Alcance elegido: pulir lo que hay.** Sin cambiar estructura ni identidad, y
manteniendo el oscuro. Diagnostico de Camilo: «se pierde espacio, cero visual,
mucho texto» — mas util que mi propia lista de siete puntos.

- ✅ **Color por tipo de cosa y color por persona.** Es lo que convierte una
  pared de texto en algo que se lee de un vistazo.
- ✅ **Tarjetas compactas que se abren al tocar.** El aviso nunca se pliega.
- ✅ **Los dos heroes gigantes pasan a una linea**, en Ahora y en Decisiones.
- ✅ **La urgencia se ve, no se lee.**
- 📏 **Medido, no opinado:** en la misma captura, de un dia y medio visible a
  tres dias completos.

⚠️ **Tres bugs de CSS propios en una sola pasada**, los tres del mismo tipo —
reglas que se pisan sin dar error: el orden de una variable con la misma
especificidad, un `border:` abreviado borrando un `border-left:`, y un `<i>`
inline al que no le aplican ancho ni alto. **El CSS no falla, simplemente no
hace nada**, y por eso hay que mirar la captura despues de cada cambio.

⚠️ **El marco de captura mentia.** El Copiloto parecia no tener campo de
escribir; el problema era que `marco-movil.html` medía 2400 px de alto y la
barra anclada abajo salia fuera de la foto. Estuve a punto de «arreglar» algo
que funcionaba. **La herramienta de verificar tambien hay que verificarla.**

### Lo que NO se toco, a proposito

Estructura, paleta base y tipografia. Camilo eligio pulir, no redisenar, y
mezclar las dos cosas habria hecho imposible saber que mejoro por que.

## 18. La pasada visual del copiloto (27 de agosto)

- ✅ **La foto manda.** De miniatura de 84 px a 16/9 a ancho completo, con
  carrusel cuando hay varios sitios. Un sitio para cenar se escoge por la
  pinta que tiene; el resto es texto de apoyo.
- ✅ **Rutas como fichas con su modo** (metro, coche, andando), cada una con
  su color. Antes eran tres filas identicas con el mismo icono generico.
- ✅ **Lo que el copiloto HIZO se ve como un recibo**, verde para la agenda y
  morado para Decisiones. Era una viñeta gris mas, y es lo unico del hilo que
  cambia el viaje.
- 🔧 **Vista previa con datos reales** (`scripts/demo-copiloto.mjs` + `?demo`
  en modo local). El estado vacio no dice nada del diseno; lo que hay que ver
  son fotos, rutas y avisos. Y tenian que ser reales: un rectangulo gris no
  tiene las proporciones ni los colores donde el diseno se cae.
- ⚠️ **La vista previa destapo un dato en crudo en pantalla:** `2026-09-10 13:00`.
  Llevaba ahi desde que existe la herramienta de agregar planes y **ninguna
  prueba miraba el texto de la interfaz**. Ahora hay una que falla si vuelve a
  pintarse sin formatear.
- 🔧 La conversacion de ejemplo se carga con `import()` diferido: es una
  herramienta de diseno, no debe viajar en el paquete que descarga la familia.

## 19. Lo funcional del copiloto (27 de agosto)

**Elegido: hacer y deshacer.** Camilo descarto guardar la conversacion por
ahora (aunque dejo dicho que, si se guarda, cada uno vea la suya).

- ✅ **Boton «Agregar al plan» en la tarjeta del sitio.** Antes habia que
  volver a escribirle al copiloto con la tarjeta delante.
- ✅ **`quitarPlan` con tres candados**: solo lo que puso una persona, solo si
  sigue propuesto, y solo si es tuyo o eres owner.
- 🔧 **Sin modelo.** Son dos escrituras deterministas; las coordenadas ya
  vienen de la tarjeta. Pasar esto por Gemini seria pagar por adivinar algo
  que ya sabemos, y ademas fallaria de vez en cuando.
- ✅ **10 comprobaciones contra las funciones desplegadas**
  (`npm run probar:planes`), con usuario de mentira que se borra al terminar.

### Cuatro fallos en una sola tanda, y lo que ensenan

1. 🔴 **Un `write_text` mio escribio contenido de `index.js` dentro de
   `planes.js`.** El archivo quedo siendo una copia vieja del punto de
   entrada, incluido un `export { agregarPlan } from './planes.js'` que se
   reexportaba **a si mismo**. De ahi el «Detected cycle».
2. 🔴 **Mi arnes de pruebas leia un 404 como «OK».** `r.json()` fallaba, el
   `catch` devolvia `{}`, no habia `.error`... y daba verde. **Estuvo dando
   verde sobre funciones que ni siquiera existian.** Ahora comprueba `r.ok` y
   que venga `result`.
3. ⚠️ **Una sustitucion de texto que no encaja no da error**: se queda igual y
   en silencio. `Lugar` seguia sin recibir `tripId`, el boton no salia, el
   codigo compilaba y las pruebas pasaban. Lo delato la captura.
4. ⚠️ **Una funcion recien creada puede responder 401** hasta que Cloud Run le
   da el permiso de invocacion publica.

**El patron de los cuatro es el mismo: nada dio error.** El despliegue si lo
dio; los otros tres pasaron en silencio y solo aparecieron al mirar el
resultado — la captura, o una prueba que mira el HTTP y no solo el JSON.

## 20. Ajustes (28 de agosto)

- ✅ **Quien ha entrado, con su codigo, y como arreglarlo.** Detras del avatar,
  no en la barra de abajo: ahi caben cuatro cosas de uso diario y esto se usa
  dos veces en el viaje.
- ✅ **El codigo se copia de un toque.** El caso de uso es «mandarle a cada uno
  el suyo»: si hay que seleccionar ocho caracteres a mano en un movil, la
  pantalla no sirve para lo unico que tiene que servir.
- ✅ **«Soltar» no borra nada.** Desengancha a alguien de su viajero; sus votos
  y sus planes siguen ahi. Es el caso real: alguien se apunto con el nombre
  equivocado.
- ✅ **Un owner no se puede desvincular a si mismo.** Quedarse fuera del propio
  viaje por un toque en falso no puede ser posible.

### 🔴 El arreglo de la suplantacion abrio otro agujero

Los codigos personales los guarde en `travelers/{id}`, que **cualquier miembro
puede leer**. Cualquiera podia leer el codigo de su padre y, como «el codigo
manda», entrar como el. Lo vi al preguntarme como iba a enseñar los codigos en
Ajustes — no lo vio ninguna prueba ni ninguna revision.

- ✅ Movidos a `codes/{id}` con `allow read, write: if false`.
- ✅ Prueba nueva que falla si vuelven a `travelers`.
- 🔧 `unirse` busca en las dos colecciones durante la transicion: sin eso, entre
  desplegar y migrar hay unos segundos sin poder entrar.

**La leccion:** el sitio donde guardas un secreto importa tanto como quien lo
comprueba. Puse un candado nuevo en la puerta y deje la llave en el felpudo.

### Lo que costo la migracion

Tres scripts de prueba leian los codigos de `travelers` y se quedaron ciegos a
la vez: `probar-reglas` (el mock del `get()`), `probar-entrada` y
`probar-planes`. **Mover un dato de sitio rompe todo lo que sabia donde
estaba**, y las pruebas son lo primero que se olvida.


### Revisión del 6 de septiembre de 2026

Se revisó el copiloto sin modificar código, datos del viaje ni configuración.
Hallazgos y validación en [../README.md](../README.md), sección «Revisión del copiloto —
6 de septiembre de 2026». Las mejoras allí enumeradas siguen pendientes;
esta revisión no acredita el servicio autenticado ni un nuevo despliegue.


### Implementación del copiloto — 6 de septiembre de 2026

Implementados más sitios de cinco en cinco, conservación privada de borradores,
corrección de caducidad y formulario, y contexto con identidad y notas. Gemini
2.5 Flash se mantiene. Pasan 220 pruebas y 47 casos de reglas; pendiente de
publicar reglas, funciones y web, sin siembra. Detalles, límites y evaluación
de modelos en [../README.md](../README.md), sección «Mejoras del copiloto».
