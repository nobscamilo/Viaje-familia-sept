> ## 🧭 DIRECCIÓN VIGENTE (2026-08-25)
> El proyecto activo pasa a ser **`viaje-app/`** (nuevo, desde cero). Lee `viaje-app/README.md` y `viaje-app/docs/rescate.md`.
> El proyecto anterior **ya no está en este repositorio**: se movió el 31 de agosto de 2026 a la carpeta hermana `Viaje sept - archivo/`. Aquí solo vive la app que funciona.
> El plan vive en `viaje-app/docs/reinvencion.md`; los datos del viaje, en `viaje-app/docs/datos-viaje.md`.
> 🔒 Este repositorio publica GitHub Pages: **ningún PIN, teléfono ni enlace de check-in en el código.**

# Memoria y Reglas del Proyecto (Viaje Familia)

Este documento es la **fuente de verdad de configuración e instrucciones** para cualquier agente de Inteligencia Artificial que trabaje en este repositorio. Su objetivo es evitar confusiones y garantizar consistencia técnica y estética.

---

## 🚨 REGLAS CRÍTICAS DE INTEGRACIÓN DE IA

- **Google AI Studio vs Vertex AI**: Para cualquier integración, script de backend, función de Firebase, o cualquier tarea relacionada con Inteligencia Artificial, se debe usar **SIEMPRE Google AI Studio (Gemini Developer API)**.
- **NUNCA, BAJO NINGUNA CIRCUNSTANCIA**, se debe utilizar Vertex AI en este proyecto.

---

## 💻 ARQUITECTURA DEL PROYECTO (EL TABLERO ACTIVO)

- **La aplicación única y activa** es `viaje-app/` (React 19 + Vite + Firebase).
  Lee `viaje-app/README.md` antes de tocar nada: ahí está el porqué de cada
  decisión, incluidos los errores que costaron horas.
- **En este repositorio ya no hay otra app.** El proyecto anterior
  (`firebase-family-app/`) se movió el 31 de agosto de 2026 a la carpeta
  hermana `Viaje sept - archivo/`, junto con el workflow de GitHub Pages que
  lo publicaba y que llevaba días roto. Los dos documentos que seguían
  sirviendo —`reinvencion.md` y `datos-viaje.md`— se copiaron a
  `viaje-app/docs/`, así que la app activa es autocontenida.
  *Hasta el 28 de agosto esta sección decía que la app activa era la vieja, en
  contradicción con el banner de arriba: un agente que leyera solo esto habría
  trabajado horas en el proyecto equivocado. Moverla de sitio es lo que hace
  que esa confusión no pueda repetirse.*
- **Todo cambio de lógica, Firestore, funciones o diseño va en `viaje-app/`.**
- Se despliega con `npm run publicar` desde `viaje-app/`. La web lee **Firestore**,
  no `src/data/`: editar un archivo y desplegar no cambia lo que ve la familia
  hasta que corre la siembra.

---

## 🎨 GUÍA DE DISEÑO (reescrita el 2026-09-01: OSCURO PREMIUM + CRISTAL EDITORIAL)

*Hasta hoy esta sección describía el tema «zinc plano». El 1 de septiembre
Camilo trajo una maqueta de Claude Design (sistema «broadsheet») y decidió un
híbrido: se conserva el fondo zinc y el acento violeta, y se adopta de la
maqueta la tipografía serif, las tarjetas de cristal, los radios blandos y la
estructura (carrusel de días, barra de pestañas de píldoras).*

1. **Los tokens mandan, más que nunca**: en `viaje-app/` ningún componente
   escribe un color, un radio ni una sombra literal. Todo sale de
   `src/styles/tokens.css`. Esta guía, en la app, **es ese archivo**.
2. **Tipografía**: `Source Serif 4` en titulares y cuerpo (`--font-ui`);
   `Geist Mono` solo para etiquetas, horas y localizadores (`--font-mono`).
   Si Google Fonts no carga, cae a Georgia y nada se rompe.
3. **Cristal, no paneles sólidos**: tarjetas y barras usan `--glass-*` +
   `--blur-glass`, con borde `--glass-border` y luz superior (el inset de
   `--shadow-card`). El fondo de la app es `--fondo-app` (zinc con dos brillos
   suaves): **un blur sobre negro plano no difumina nada** — si se quita el
   brillo del fondo, el cristal muere con él.
4. **Un solo elemento «lleno» por pantalla**: el degradado `--accent-grad`
   marca la elección activa (chip del día, pestaña, burbuja mía del copiloto,
   botón primario). Si dos cosas lo llevan a la vez, una sobra.
5. **Prohibido `box-shadow: none` en tarjetas y paneles** (sigue vigente).
6. **Touch targets de 44 px** (`--touch`) en todo lo interactivo (sigue).
7. **Radios**: `--r-md` 14 px para controles, `--r-lg` 20 px para tarjetas.
8. **Mapa**: `gestureHandling: 'cooperative'` (sigue).
9. **Micro-animaciones**: entrada `fadeInUp`/`msgIn` en tarjetas (sigue), y
   `prefers-reduced-motion` las apaga vía tokens de duración.
10. **«Ahora» y «Mapa» navegan por día** con el mismo carrusel
    (`ui/DiasCarrusel.jsx` / chips propios del mapa): un día en pantalla, no
    la lista de catorce. El punto magenta del chip = un evento con `warning`
    ese día, mismo criterio que la banda dentro de la tarjeta.

---

## 🗳️ QUÉ SE PUEDE TOCAR (reescrito el 2026-09-01)

*Hasta hoy esta sección decía lo contrario: que un momento sin `createdBy` «se
mira, no se borra» y que confirmar un plan lo cerraba. Camilo pidió quitar esos
candados. Se quitaron enteros; lo que queda no son permisos, son huellas y una
pregunta.*

**Cualquier adulto puede editar o quitar cualquier momento de la agenda**,
vuelos y hoteles incluidos. Los `viewer` no: es el único límite que queda, y es
sobre *quién* toca, no sobre *qué*.

Eso solo es honesto por lo que se hizo al mismo tiempo:

- **La siembra respeta lo tocado a mano.** `scripts/seed.mjs` hace `set()` SIN
  merge sobre todo `src/data/`. Editar un hotel desde el móvil habría durado
  hasta el siguiente `npm run publicar`, y un vuelo borrado habría vuelto solo.
  Ahora salta lo que lleva `tocadoAMano` y lo que tiene lápida en
  `trips/{id}/borrados/{id}`. **Si alguien toca uno de los dos lados, tiene que
  tocar el otro**, o la función se deshace sola en el siguiente despliegue.
- **La lápida se escribe ANTES del borrado.** Al revés, si falla, el momento
  resucita en la siguiente publicación.
- **Fricción donde está el daño.** Quitar una reserva pide un segundo toque;
  quitar una cena propuesta hace un minuto, no. Quién es «reserva» lo dice
  `esReserva()` en `src/domain/acciones.js` — nunca el JSX.
- **Gestionar se pliega; decidir, no.** «Volver a proponer», «Editar» y
  «Quitar» viven detrás del banner *Editar o quitar*; `Confirmar` se queda a
  la vista, porque es lo que el plan está esperando. Con los tres puestos
  siempre, la agenda parecía un panel de administración. La marca es
  `discreta: true` en `accionesDe`; `Cierre.jsx` filtra por ella y **nunca por
  una lista de ids**, o la próxima sustitución de texto rompe el pliegue en
  silencio. Cerrar el banner cancela también la pregunta de seguridad.
- **Mover el estado es del owner.** Confirmar y «volver a proponer». Devolver a
  propuesto conserva los votos, que es justo lo que se perdía cuando la única
  salida era borrar y recrear.
- **Va por Cloud Function, no por Firestore directo.** Un momento sembrado no
  tiene `createdBy` y las reglas no dejan que un adulto lo escriba desde el
  navegador. Las reglas se quedaron igual de estrechas a propósito.
- **Un `TOCADO` o un `QUITADO` en la consola de la siembra significa que
  `src/data/` y lo que ve la familia ya no dicen lo mismo.** Se arregla en el
  archivo, no dejándolo vivir en Firestore.

Una **ruta** siguen siendo hasta seis momentos con un `rutaId` común, y se
quitan de una vez: una función que cuesta seis toques deshacer no la prueba
nadie.

**Las NOTAS de un momento** (desde el 1 de septiembre) son comentarios
colgando de `timeline/{id}/comments`, la misma forma que los de una decisión:
`commentsRef`, `suscribirComentarios`, `comentar` y `useComentarios` llevan
todos una `rama`, igual que los votos. **Dos ramas, una sola forma** — si
alguien arregla un fallo en una y no en la otra, hay pruebas que lo cazan.
Se ponen en cualquier momento, vuelos incluidos, y **no chocan con la siembra
porque viven en una subcolección**: `set()` no alcanza a los hijos, así que
una nota no marca el momento `tocadoAMano`. Y **gestionar se pliega, avisar
no**: las notas escritas se leen sin tocar nada; lo que se esconde tras un
«+ Nota» es el campo de escribir, y tras tocar la propia nota, «Editar» y
«Quitar».

Quién puede tocar una nota lo dice **`src/domain/notas.js`, que espeja
`firestore.rules`** — nunca el JSX. La asimetría es deliberada: **edita solo
su autor; borra su autor o quien organiza**. Y **`editarComentario` NO manda
`authorUid`**: la regla lleva `unchanged('authorUid')` y rechaza la escritura
si el campo viaja, aunque lleve el mismo valor.

Y la regla que gobierna las votaciones sigue intacta: los niños son viajeros,
no usuarios. Nunca votan y nunca entran en el denominador. Votar sigue siendo
solo de lo `propuesto`: ponerle marcas de voto a un billete emitido sería
fingir que la familia decide sobre él.

---

## 🤖 EL COPILOTO PROPONE, NO ESCRIBE (desde 2026-09-01)

`agregarAlPlan` y `armarRuta` **ya no tocan Firestore**. Devuelven un borrador
que se pinta en el chat con sus botones; la escritura la dispara una persona.

    armarRuta      -> calcula y devuelve borrador   (no escribe)
    recalcularRuta -> rehace horas y avisos          (no escribe)
    guardarRuta    -> escribe las paradas, propuestas

- **`recalcular` y `guardar` vuelven a calcular las horas en el servidor.** Si
  el cliente las mandara, quitar la parada del medio dejaría la ruta en la
  agenda con los horarios de la versión anterior: plausibles y falsos.
  `limpiarParadas()` tira cualquier `llegada`, `salida` o `trasladoMin` que
  llegue de fuera, y hay una prueba que lo vigila.
- **Las coordenadas SÍ se aceptan del cliente.** Ya se resolvieron contra
  Places al proponer, y un adulto podía escribirlas creando un plan a mano:
  aceptarlas ahí no abre nada nuevo, y volver a preguntarle a Google es pagar
  dos veces por lo mismo.
- **Se recalcula al soltar el campo, no al teclear.** Cada recálculo es una
  llamada a Routes por tramo; teclear «11:30» dispararía cuatro.
- **Cambiar la herramienta sin cambiar las instrucciones produce un copiloto
  mentiroso.** Si el prompt sigue diciendo «entra como PROPUESTO en la agenda»,
  el modelo promete algo que no ha pasado. Y al revés con el guardia
  anti-mentiras: una propuesta válida no debe provocar un falso aviso, pero
  **un borrador no acredita una escritura**. Si afirma haberlo agregado, se
  corrige el texto; solo el recibo de guardado acredita que está en la agenda.

---

## 💬 LA CONVERSACIÓN DEL COPILOTO CADUCA (desde 2026-09-01)

- **Un hilo que no termina nunca envenena las respuestas.** Cada pregunta
  viaja al modelo con las últimas doce intervenciones: si son de anteayer y de
  otra ciudad, contesta con una seguridad que no le corresponde. Misma familia
  de error que la ruta calculada «para ahora».
- `sesionActual()` en `src/domain/hilo.js` corta por **cuatro horas de
  silencio** o por **cambio de día**. Puro, con `ahora` como parámetro.
- **Lo viejo no se borra**, solo deja de pintarse y de mandarse. Y un mensaje
  sin `en` (el `serverTimestamp` aún no ha vuelto) cuenta como de ahora: nunca
  se corta lo que se acaba de escribir.
- **«Empezar de cero» existe y tiene botón.** `olvidar()` vivió desde el 30 de
  agosto sin ninguno — la misma mitad invisible que el borrado de gastos. Si
  se construye la función, se construye el camino.
- **El cristal no vale sobre texto en movimiento.** La barra de sesión empezó
  pegajosa dentro del hilo y el texto de debajo se leía encima. El blur
  difumina; lo que tapa es la capa. Fuera del scroll, en su propia fila.
- **El mínimo de nota no puede dejar la lista corta.** `quitarLosFlojos()`
  filtra y `completarHasta()` rellena con lo mejor de lo descartado: cinco
  tarjetas siempre, salvo que Google no dé para más. El suelo de cinco está en
  el CÓDIGO (`Math.max(cuantos || 5, 5)`), no en el prompt — una regla, no una
  súplica al modelo.
- ⚠️ **`medir.mjs` en `/copiloto?demo` da falsos negativos**: el hilo de
  ejemplo entra por `import()` diferido. Si sale 0 desbordes, sube la espera y
  comprueba que `.cop-lugar` está en el DOM antes de creértelo.

---

## 🗺️ SITIOS, RUTAS Y MAPAS (desde 2026-08-30)

- **Ninguna llamada a Places sin ciudad.** Ni `buscarLugares`, ni
  `resolverSitio`, ni la que venga. Sin sesgo geográfico, «Sol» devuelve un bar
  de Velilla del Río Carrión (282 km) y «el hotel» uno de Guardo. Se arregló en
  la búsqueda y se quedó sin arreglar en la llamada que ESCRIBE el pin: revisar
  las dos.
- **Ninguna ruta sin `departureTime`** del día del viaje. Calcular para «ahora»
  un día que aún no ha llegado da un número plausible y equivocado: Sol → IFEMA
  son 1 h 15 de madrugada y 39 minutos el domingo de carrera.
- **La nota NUNCA ordena sola.** Se pondera por número de reseñas y se ordena
  por el extremo inferior del intervalo (`functions/lib/ranking.js`). Un 4,9 con
  siete opiniones no es mejor que un 4,5 con tres mil, y encoger hacia la media
  tampoco basta: hay que penalizar la incertidumbre. Medido contra la API real.
- **Un filtro que devuelve la lista vacía ha roto la búsqueda.** El mínimo de
  nota es una preferencia, no una condición.
- **«No sé» no es «cerrado».** `abiertoEl` devuelve `true`, `false` o `null`.
  Mucho sitio no publica horario en Google; tratarlo como cerrado deja fuera
  media ciudad.
- **El modelo pone nombres y orden; el servidor pone las horas.** Ni una hora de
  llegada ni un tiempo de trayecto salen del modelo. Y los avisos —sitio
  cerrado, choque con lo reservado— viajan DENTRO del resultado, porque al
  redactar tiende a suavizarlos.
- **Solo se avisa de lo que se puede afirmar.** Un evento sin hora no choca con
  nada; a uno sin final no se le inventa una duración.
- **Un mapa por respuesta se come la cuota.** Maps JS son 300 cargas al día: el
  mini mapa de sugerencias se monta solo en el último mensaje que trajo sitios.

---

## 💶 EL DINERO (desde 2026-08-28)

- **Todo en céntimos enteros.** Nunca un euro con decimales: ni en el cliente,
  ni en Firestore, ni en las reglas, que exigen `int`. Un reparto en coma
  flotante deja saldos fantasma y la familia deja de fiarse del número.
- **Tres subfamilias, siete pagadores.** Un gasto se divide entre los ADULTOS
  que participan; la deuda se salda entre hogares (`src/data/hogares.js`).
- **Los dos niños no están en ningún hogar.** Su parte la ponen los siete
  adultos. No es un olvido y hay una prueba que lo vigila.
- **Ningún texto escrito desde una sola silla.** Nueve personas entran con su
  propio código. «Nosotros», «Papás», «Hermana» eran ciertos solo para Camilo;
  Fernando leía las tres mal. Los nombres son de personas y lo único que se
  personaliza es el propio («Vosotros»), vía `etiquetaHogar(id, miHogar)`.
  Quien escribe la app siempre la mira desde su cuenta: hay que probar desde
  las otras.
- **Quién pagó ≠ quién reservó.** Camilo hizo casi todas las reservas con la
  tarjeta de su padre: el dinero salió de la cuenta del padre y `pagadoPor` es
  él. Confundirlo le daría a Camilo un saldo a favor de casi 5.000 € que no ha
  puesto.
- **La tasa de cambio se guarda con el gasto**, nunca se recalcula: si no, un
  gasto pasado cambia de valor solo y los saldos bailan.
- **`npm run medir` antes de dar por bueno un diálogo o una tabla**, a 1280,
  430, 390 y 375 px. Mirar una captura dice QUE algo está mal; medir dice
  cuánto y dónde. Dos trampas ya cazadas así: una pista `auto` de CSS Grid se
  dimensiona al max-content y desborda (usar `minmax(0, 1fr)`), y `flex: 1` en
  chips impide que una fila envuelva (usar `flex: 0 1 auto`). Una tercera el 30
  de agosto: sin `flex-wrap`, un botón con `flex-basis: 100%` no baja de línea,
  se encoge y queda pegado al de al lado.
- **Medir DENTRO de la app, no en una página de pruebas.** Una página suelta con
  el mismo marcado y la misma hoja de estilos dio 86 px donde la app da 343: sin
  los padres reales no hay medida. Si algo no se puede alcanzar navegando, se
  inyecta el marcado en una tarjeta real y se mide ahí.
- **Ningún paquete sin declarar en `package.json`.** Si un script o una prueba
  importa algo externo, va declarado aunque «ya esté instalado» en la máquina de
  turno. `firebase-admin` lo usaban seis scripts y no estaba: la siembra del
  viaje reventó el 31 de agosto. Hay una prueba que lo vigila, con `playwright`
  como única excepción documentada.
- **Separador de miles siempre**, con `miles()` de `cuentas.js`. El español no
  separa hasta cinco cifras, así que «4210 reseñas» debajo de «32.871 reseñas»
  parece un error. Escrito a mano tres veces ya.
- **Las casas de `hogares.js` son BOLSILLOS, no domicilios.** Julián David
  vive con sus padres y está en el hogar de sus abuelos, porque su abuelo
  cubre sus gastos (30 de agosto de 2026). No es un error de tecleo.
- **Ningún número mágico en una prueba.** «El hogar de la hermana debe 3/7»
  caducó el día que Julián David cambió de casa. Se escribe la regla —«cada
  casa debe lo que tiene de adultos», leyendo `HOGARES`— y sobrevive.
- **La invariante del dinero: los saldos de los tres hogares SIEMPRE suman
  cero.** Cualquier camino nuevo (elegir personas sueltas, el copiloto, una
  importación) tiene que cerrarse por arriba —la pantalla no deja guardarlo— y
  por abajo —`saldos()` lo absorbe—. Un gasto que nadie debe es un crédito de
  la nada.
- **Nada de mitades invisibles.** El borrado de gastos vivió un día entero con
  servicio, reglas, seis pruebas verdes y herramienta del copiloto… y ningún
  botón. Una función a la que no se puede llegar desde la pantalla es una
  función que no está: si se construye el servidor, se construye el camino.
- **Las cerraduras de la interfaz espejan las de Firestore.** Un botón que el
  servidor va a rechazar deja a la persona mirando un error que no entiende.
- **Lo sembrado no se edita desde la app**, ni siendo owner: la siembra es un
  espejo con `set()` sin merge y la próxima publicación borraría el cambio en
  silencio. Se corrige en `src/data/`, donde está la fuente de cada importe.
- **El modo local tiene que enseñar la misma app que la real.** Si Firestore
  marca un documento con `origen: 'seed'`, el respaldo local también.
- **Ningún importe sin fuente.** `src/data/gastos-iniciales.js` lleva al lado
  de cada número de qué correo salió. Si no se puede verificar, no se siembra:
  se deja fuera y se dice que falta. Las entradas de la F1 y los vuelos de
  Bogotá están fuera a propósito.


### Revisión del 6 de septiembre de 2026

Se revisó el copiloto sin modificar código, datos del viaje ni configuración.
Hallazgos y validación en [viaje-app/README.md](viaje-app/README.md), sección «Revisión del copiloto —
6 de septiembre de 2026». Las mejoras allí enumeradas siguen pendientes;
esta revisión no acredita el servicio autenticado ni un nuevo despliegue.


### Implementación del copiloto — 6 de septiembre de 2026

Implementados más sitios de cinco en cinco, conservación privada de borradores,
corrección de caducidad y formulario, y contexto con identidad y notas. Pasan
220 pruebas y 47 casos de reglas.


### Actualización técnica, linting y optimización — 6 de septiembre de 2026

- **Modelo**: Actualizado a `gemini-3.8-flash` en `functions/lib/secrets.js`
  (Google AI Studio, `@google/genai`). Clarificadas las descripciones de
  `agregarAlPlan` y `armarRuta` en `declaraciones.js` para indicar que devuelven
  borradores interactivos en chat sin tocar Firestore directo.
- **Linting**: Migrado a ESLint 10 flat config (`eslint.config.js`) con soporte
  JSX y React Hooks v7 (`rules-of-hooks: error`, `exhaustive-deps: warn`).
  0 errores y 0 avisos en todo el proyecto.
- **Sincronización de relojes y fechas**:
  - `Hero.jsx` en `Ahora` recibe `ahora` de `useAhora()` y calcula `daysUntil`
    con él, quedando 100% coordinado con la cabecera al simular `?hoy=`.
  - `Copiloto.jsx` y `useHilo.js` usan `ahora`, evitando transacciones
    redundantes en montaje inicial.
  - `NuevoGasto.jsx` y `Saldo.jsx` usan `diaDelViaje()` en lugar de
    `toISOString().slice(0, 10)` para evitar el desfase por UTC con Madrid.
- **Code Splitting**: `App.jsx` carga con `React.lazy()` y `<Suspense>` las
  superficies `Decisiones`, `Mapa`, `Cuentas`, `Copiloto` y `Ajustes`. Redujo el
  CSS inicial de 73.6 kB a 27.6 kB (-62%) y el bundle JS principal en más de 100 kB.
- **Gestos de Mapa**: `gestureHandling: 'cooperative'` en `Mapa.jsx`.
- **Validación completa**: 220 tests unitarios/dominio, 47 reglas de Firestore,
  medición en 4 resoluciones (1280, 430, 390, 375 px) y build de producción limpios.


### Corrección de estabilidad y reloj en copiloto — 6 de septiembre de 2026

- **Desacople del reloj en `useHilo.js`**: Se desvinculó el efecto de lectura inicial de Firestore de la instancia de `ahora` generada cada 30 s por `useAhora()`, usando `ahoraRef`.
- **Eliminación del parpadeo y pérdida de opciones**: Previene que cada 30 segundos se limpie el estado (`setMensajes([])`), se fuerce el scroll al fondo y se sustituyan las tarjetas en memoria (con sus fotos) por la instantánea de Firestore (sin `photoUri`).
- **Prueba añadida**: Cobertura en `test/hilo.test.js` asegurando que las dependencias del efecto de carga sean estrictamente `[tripId, yo?.id]`.


### Rediseño Visual Stitch: Liquid Glass y Thinking Glow (Organización por Días) — 6 de septiembre de 2026

- **Diseño Liquid Glass & Thinking Glow**: Se integraron las directrices visuales de Stitch (`Website UI/UX Redesign`) en las tres superficies clave, preservando la organización temporal **estrictamente por días** (sin agrupaciones ni filtros por ciudades):
  - **Copiloto IA (`Copiloto.jsx`, `BienvenidaCopiloto.jsx`)**: Bienvenida con badge de supervisión activa, 3 tarjetas de contexto operativo (Ritmo Senior, Aforo Monumentos, Clima), accesos directos y métricas de latencia/versión. Efecto "Thinking Glow" con degradado cónico animado durante el razonamiento. Barra de entrada modernizada con pill container y botón de acción.
  - **Cuentas y Finanzas (`Cuentas.jsx`, `ResumenCuentasStitch.jsx`)**: Panel superior con 3 tarjetas de cristal líquido: Presupuesto Maestro con barra de progreso y ratio de ejecución, Fondo de Bolsillo / Bote Común, y desglose de los 3 Núcleos Familiares con balance neto y estado. Gastos ordenados cronológicamente por día/fecha con visualización directa.
  - **Mapa de Ruta (`Mapa.jsx`)**: Cabecera HUD con cartografía estratégica, métricas del itinerario (14 Días, 9 Viajeros) y navegación focalizada exclusivamente en el selector de días (`Todo` y días específicos 10–23 sept).
- **Tokens y modularidad**: Nuevos tokens de sombra líquida y resplandores (`--shadow-liquid`, `--shadow-glow`, `--glow-thinking`, etc.) en `tokens.css`. Componentes y estilos extraídos en módulos dedicados para cumplir estrictamente con el límite de 400 líneas por archivo (`check:size`).
- **Validación y despliegue**: 221 pruebas unitarias pasando, 47 reglas de Firestore validadas, 0 errores/warnings de ESLint, 4 anchos responsivos sin desborde (1280, 430, 390, 375 px) y desplegado con éxito en Firebase Hosting (`https://viaje-familia-sept-2026.web.app`).


### Rediseño Stitch: Portal de Acceso y Dashboard Diario (Ahora) con Paleta Terracota y Liquid Glass — 6 de septiembre de 2026

- **Solución al refresco y caché en Hosting**: Cabecera `Cache-Control: no-cache, no-store, must-revalidate` en `firebase.json` para evitar que `index.html` sea servido desde caché local antigua.
- **Paleta Stitch**: Integrada la paleta Stitch en `tokens.css` con Terracotta Sun (`#c85a32`), Gilded Amber (`#d4a359`), Mediterranean Night (`#1e3246`) y degradados de acento.
- **Portal de Acceso (`Entrar.jsx`, `entrar.css`)**: Implementada la maqueta *Portal de Acceso - Liquid Glass* con badge pulsante, título editorial, cápsula de cuenta atrás calculada dinámicamente, input de PIN centrado con acabado de cristal líquido, botón primario terracota con brillo especular y enlace de asistencia.
- **Dashboard Diario (`Ahora.jsx`, `ahora.css`)**: Retirado el texto introductorio innecesario y restaurada la cabecera limpia de una línea (`Hero.jsx`) para priorizar la visibilidad de los eventos del día. Se implementó el **Copiloto IA Flotante (`copiloto-fab`)**, un botón de acción flotante (FAB) en la esquina inferior derecha con aura animada Thinking Glow que no obstruye el itinerario. Todas las direcciones en las tarjetas de eventos (`ev-addr-link`) abren directamente la ubicación o ruta en Google Maps con un toque (`enlaceDeMapa(event)`).
- **Cuentas y Finanzas (`Cuentas.jsx`)**: Corregido el fallo de ejecución en web y móvil al retirar dependencias y tarjetas con datos inventados; restablecida la funcionalidad completa de saldos por hogar, transferencias Bizum (`Saldo.jsx`, `Saldado.jsx`) y listado cronológico de gastos.
- **Validación total**: 221 pruebas unitarias pasando, 47 reglas de Firestore, 0 errores ESLint y medición limpia en 4 anchos (1280, 430, 390, 375 px). Desplegado en Firebase Hosting (`https://viaje-familia-sept-2026.web.app`).




