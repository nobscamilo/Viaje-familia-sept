> ## 🧭 DIRECCIÓN VIGENTE (2026-08-25)
> El proyecto activo pasa a ser **`viaje-app/`** (nuevo, desde cero). Lee `viaje-app/README.md` y `viaje-app/docs/rescate.md`.
> `firebase-family-app/` queda **congelado**: solo se consulta como archivo histórico y como origen del rescate.
> El plan vive en `firebase-family-app/docs/reinvencion.md`; los datos del viaje, en `firebase-family-app/docs/datos-viaje.md`.
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
- `firebase-family-app/` está **congelado**. Se consulta como archivo histórico
  (`docs/datos-viaje.md`, `docs/reinvencion.md`) y no se despliega.
  *Esta sección decía lo contrario hasta el 28 de agosto de 2026: apuntaba a
  `firebase-family-app` como «la app única y activa», en contradicción con el
  banner de arriba. Un agente que leyera solo esta sección habría trabajado
  durante horas en el proyecto equivocado.*
- **Todo cambio de lógica, Firestore, funciones o diseño va en `viaje-app/`.**
- Se despliega con `npm run publicar` desde `viaje-app/`. La web lee **Firestore**,
  no `src/data/`: editar un archivo y desplegar no cambia lo que ve la familia
  hasta que corre la siembra.

---

## 🎨 GUÍA DE DISEÑO ESTÉTICO Y RESPONSIVO (TEMA OSCURO PREMIUM)

Para mantener la estética premium de grado desarrollador de la aplicación, se deben seguir estrictamente estas pautas en el tema oscuro:

1. **Definición de Bordes**: 
   - No utilizar bordes opacos oscuros como `#27272a`.
   - Utilizar siempre `--border: #3f3f46` (Zinc-700) para garantizar que los contenedores no se pierdan sobre el fondo oscuro en pantallas móviles.
2. **Elevación y Profundidad (`box-shadow`)**:
   - Está estrictamente prohibido utilizar `box-shadow: none !important` en paneles o tarjetas.
   - Toda tarjeta (`.option-card`, `.trip-card`, `.ai-place-card`) y panel primario (`.segment-card`, `.side-panel`, `.main-panel`) debe llevar `--shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.45), 0 2px 8px -1px rgba(0, 0, 0, 0.25)` para generar profundidad táctil.
2b. **Los tokens mandan**: en `viaje-app/` ningún componente escribe un color,
   un radio ni una sombra literal. Todo sale de `src/styles/tokens.css`. Esta
   guía de estilo, en la app nueva, **es ese archivo**.
3. **Optimización Móvil y Accesibilidad (Touch Targets)**:
   - Todo botón interactivo, campo de formulario, o pestaña de navegación en vista móvil debe tener un área de contacto mínima de **`44px` de altura/ancho** para garantizar una ergonomía óptima para los dedos.
   - En pantallas pequeñas, el encabezado superior (`.topbar-v2`) debe comprimirse verticalmente (`height: 48px`, `padding: 6px 14px`) para maximizar el área de lectura útil.
4. **Interacción con Mapas (Google Maps)**:
   - El mapa interactivo debe tener siempre habilitado `gestureHandling: 'cooperative'` para prevenir trampas de scroll táctil en pantallas móviles (requiere gestos con dos dedos para navegar por el mapa, dejando libre el desplazamiento de la página con un solo dedo).
5. **Micro-animaciones**:
   - Todo cambio de filtrado o renderizado de tarjetas de viaje debe ejecutarse a través de la animación fluida de entrada de opacidad y desplazamiento vertical `fadeInUp`.

---

## 🗳️ QUÉ SE PUEDE TOCAR Y QUÉ NO (desde 2026-08-28)

La agenda del viaje son sobre todo **reservas pagadas**. Ninguna pantalla puede
ofrecer una acción destructiva sobre algo que no creó la propia app:

- Un momento **sin `createdBy`** salió de `scripts/seed.mjs`: se mira, no se
  borra ni se descarta desde el móvil. No hay botón, y las reglas de Firestore
  lo impiden aunque lo hubiera.
- Un momento **`propuesto` con `createdBy`** (lo puso el copiloto o el botón
  «Agregar») sí se vota, se confirma, **se edita** y se quita. Editar va con
  quitar, no con confirmar: quien puede borrar puede corregir, y obligar a
  borrar y recrear para cambiar una hora se lleva por delante los votos.
- Una **ruta** son hasta seis momentos con un `rutaId` común. Se quitan de una
  vez o no se quitan: una función que cuesta seis toques deshacer no la prueba
  nadie. Los candados se aplican parada por parada, y se dice cuántas quedaron
  por estar ya confirmadas.
- Lo decide `viaje-app/src/domain/acciones.js`, que es puro y está probado.
  **No se toma esa decisión en el JSX.**

Y la regla que gobierna las votaciones sigue intacta: los niños son viajeros,
no usuarios. Nunca votan y nunca entran en el denominador.

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
