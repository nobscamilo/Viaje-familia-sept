# viaje-app

App de viaje familiar, reconstruida desde cero en agosto de 2026.

**Antes de tocar nada**, lee en este orden:
1. `docs/reinvencion.md` — qué se está construyendo y por qué.
2. `docs/datos-viaje.md` — los datos reales del viaje.
3. `docs/rescate.md` — qué se trajo del proyecto anterior y qué se descartó.
4. `docs/configuracion.md` — **credenciales de Firebase: cuál es secreta y cuál no.**

## Arrancar

```bash
npm install
npm install --prefix functions
npm run dev
```

Sin `.env.local` arranca en **modo local** con los datos de `src/data/`: funciona recién clonado, sin credenciales. Copia `.env.example` a `.env.local` para conectarlo a Firebase.

## Comprobaciones

```bash
npm run check         # tamaño de archivo + referencias colgando + 220 pruebas
npm test              # solo las pruebas
npm run build         # revisar el tamaño de entrada; ~361 kB a 6 sep
```

`check:dangling` existe porque una constante que se usaba pero no se declaraba
(`placesTextSearchLimit`) hizo que Places devolviera **cero resultados sin dar
ningun error**. Un `undefined` silencioso cuesta mas de encontrar que un fallo.

## Publicar

```bash
npm run publicar      # comprobaciones + datos a Firestore + web
```

**`npm run deploy:web` NO actualiza lo que ve la familia.** En produccion la app
lee la agenda de **Firestore**, no de `src/data/`; `src/data/` solo manda en
modo local, que es como arranca sin credenciales. El 26 de agosto de 2026 se
desplego la web cinco veces con Santander, Guardo y el AV027 en el codigo
mientras Firestore seguia sirviendo un viaje que acababa el 19. Las capturas de
verificacion tampoco lo cazaron, porque se hacian en modo local.

Regla: **si cambia algo de `src/data/`, toca `npm run publicar`.**

```bash
npm run seed          # simulacro: no escribe nada
npm run seed:write    # solo los datos, sin desplegar la web
npm run rules         # reglas e indices
```

`scripts/seed.mjs` es un **espejo**, no un volcado: lo que se quita de
`src/data/` se borra de Firestore. Nunca toca lo que ha creado una persona (un
plan que el copiloto agrego lleva `createdBy` con un uid y `origen` distinto de
`seed`), ni pisa el estado de una decision que la familia ya haya votado. Las
decisiones resueltas no se borran: viven en `DECISIONES_CERRADAS` con el motivo
por el que se cerraron, y salen bajo el filtro *Cerradas*.

Credenciales: vale con `gcloud auth application-default login`. No hace falta
una clave de cuenta de servicio en disco.

Modelo: todo cuelga de `trips/{tripId}`. Los votos son **un documento por persona**, con el uid como id — nadie puede escribir el voto de otro, ni siquiera manipulando el cliente.

## Entrar: solo el código, sin Google

**No hay pantalla de Google.** El código personal **es** la sesión: la Cloud
Function `unirse` comprueba de quién es y devuelve un token de sesión a nombre
de ese viajero, que el navegador canjea con `signInWithCustomToken`.

Antes había que pasar por Google antes de poder hacer nada. Eso era pedirle a
siete personas dos pasos para entrar a mirar un itinerario, y ya sabemos cómo
acabó la app anterior: «entraron una vez y no volvieron».

El uid es **estable y sale del viajero** (`viajero_julian-padre`), no de la
cuenta. Quien mete su código en otro teléfono es la misma persona y hereda sus
votos; un uid anónimo por dispositivo habría dejado votos huérfanos.

**El código manda.** Si el viajero ya estaba enganchado a otro uid — el de
Google de antes, o un móvil viejo — se le mueve y se limpia el anterior. Tener
el código es la prueba de identidad: si no fuera así, cambiar de móvil te
dejaría fuera para siempre.

Google se queda como salida de emergencia, escondida en un enlace pequeño, para
las cuentas que ya estaban enlazadas. **Un cambio de identidad sin puerta
trasera deja a alguien fuera, siempre.**

El precio, dicho claro: **quien tenga el código es esa persona.** No hay segundo
factor. Para nueve familiares es un intercambio razonable; para algo más serio,
no lo sería.

```bash
npm run probar:entrada   # 8 comprobaciones contra la funcion desplegada
```

## Ajustes

Detrás del avatar de la barra de arriba, en `/ajustes`. **No está en la barra
de abajo a propósito**: ahí caben cuatro cosas que se usan todos los días, y
esto se usa dos veces en todo el viaje.

Solo el owner ve la lista: quién ha entrado, el código de cada uno (copiable de
un toque, que es para lo único que sirve la pantalla) y **Soltar**, que
desengancha a alguien de su viajero sin borrarle nada — sus votos y sus planes
siguen ahí. Hasta hoy, si alguien se apuntaba con el nombre equivocado la única
salida era la consola de Firebase o el terminal.

Todo pasa por Cloud Functions (`gente`, `desvincular`) porque los códigos **no
se pueden leer desde el cliente**, ni siendo miembro.

### 🔴 Un agujero que abrió el propio arreglo de la suplantación

Los códigos personales vivían en `travelers/{id}.joinCode`, y esa colección la
puede leer **cualquier miembro del viaje**. O sea: cualquiera podía leer el
código de su padre y, como «el código manda», entrar como él. El arreglo de la
suplantación abrió otro agujero más pequeño en el mismo sitio.

Ahora viven en `codes/{id}` con `allow read, write: if false`: nadie los lee
desde el cliente. `npm run mover:codigos --write` hizo la migración, y hay una
prueba que falla si vuelven a `travelers`.

⚠️ **La migración tiene un orden delicado.** `unirse` busca en las **dos**
colecciones a propósito: sin esa doble búsqueda, entre desplegar la función y
mover los códigos hay unos segundos en los que nadie puede entrar.

## Un código por persona

Cada adulto tiene **su propio código**, guardado en
`trips/{tripId}/travelers/{id}.joinCode`. **Nunca en el repositorio**: este
publica GitHub Pages. Los niños no tienen código, así que nadie puede
suplantarlos.

```bash
npm run codigos          # simulacro: enseña cómo serían
npm run codigos:write    # escribe los que falten y los imprime una vez
node scripts/codigos.mjs --write --rehacer   # cambia TODOS (invalida los viejos)
```

Antes había **un solo código para todos**, así que cualquiera que lo tuviera
podía escoger cualquier nombre libre y votar como el padre de otro.

**Se entra solo con el código: no hay que escoger el nombre.** Lo resuelve la
Cloud Function `unirse`, no el navegador, porque antes de entrar no eres
miembro y un no-miembro **no puede leer la lista de viajeros**: desde el cliente
es imposible saber de quién es un código.

Esa función da además algo que las reglas no podían: **freno a la fuerza bruta**.
Diez intentos por hora y uid, contados en `joinAttempts/{uid}`, una colección
que el cliente no puede ni leer ni escribir. Y no distingue en el mensaje entre
«ese código no existe» y «ese código ya se usó»: decirlo sería confirmarle a un
desconocido cuáles son válidos.

Las reglas se prueban antes de desplegarse, contra el motor de Google:

```bash
npm run probar:reglas    # 6 casos: quién entra y quién no
npm run rules            # los pruebas Y despliega (no despliega si fallan)
```

Ese test no es decorativo. La primera versión de la regla **compilaba y no
dejaba entrar a nadie**: el `get()` del código hay que simularlo en las pruebas,
y sin ese mock todo salía DENY. Sin el test se habría desplegado.

## Diagnosticar el acceso

Si *Entrar con Google* falla con `auth/requests-from-referer-...-are-blocked`:

```bash
python3 scripts/diagnostico-auth.py
```

Dice si el bloqueo viene de la restricción de la clave o de los dominios autorizados. El arreglo está en `docs/configuracion.md` §6.

## Ver cualquier dia del viaje sin esperar

La pantalla **Ahora** cambia segun el momento: antes del viaje es una cuenta
atras, durante el viaje es «que esta pasando y que sigue». A 15 dias de la
salida no hay forma de ver la segunda... salvo simular el reloj:

```
/?hoy=2026-09-11T14:00     # viernes del circuito, a las dos de la tarde
/?hoy=2026-09-10           # se asume mediodia, hora de Madrid
```

Con `?hoy=` el reloj queda **congelado** y sale un aviso amarillo en pantalla
para que nadie confunda la vista previa con la realidad. Lo implementa
`src/hooks/useAhora.js`; toda la logica que depende del reloj recibe `ahora`
como parametro (`src/domain/agenda.js`), nunca lo lee por su cuenta — por eso
se puede probar y previsualizar.

Para verlo con ancho real de movil:

```bash
VITE_FIREBASE_API_KEY='' VITE_FIREBASE_PROJECT_ID='' \
  npx vite build --outDir /tmp/local-dist --base ./
cp scripts/marco-movil.html /tmp/local-dist/_marco.html
cd /tmp/local-dist && python3 -m http.server 4319
# captura http://localhost:4319/_marco.html?r=/?hoy=2026-09-11T14:00
```

`chrome --headless --window-size` **no** fija el viewport: renderiza mas ancho
y recorta, asi que todo parece cortado aunque este bien. El iframe de
`marco-movil.html` si da un viewport real de 430 px.

Todo eso está en `scripts/capturar.sh`:

```bash
rm -rf /tmp/local-dist                       # ← IMPRESCINDIBLE
ALTO=2400 scripts/capturar.sh '/?hoy=2026-09-11T09:00' /tmp/x.png
ALTO=1600 scripts/capturar.sh '/decisiones?demo=1'     /tmp/y.png
```

Dos trampas que costaron una vuelta cada una:

- El script **reutiliza `/tmp/local-dist`**. Sin borrarlo estás mirando la
  compilación de ayer. La barra de acciones «no funcionaba» durante dos
  capturas por esto.
- `python3 -m http.server` devuelve **404 en `/decisiones`**: no es un archivo,
  es una ruta de la SPA, y la captura sale en negro. Por eso hay
  `scripts/servir.py`, que cae a `index.html`.

`?demo=1` en Decisiones añade una decisión de opciones de mentira
(`src/data/demo-opciones.js`) para revisar esa pantalla **sin dejar basura en
el viaje de la familia** — que es exactamente lo que pasó con el «Prueba
automática» del 11 de septiembre que sigue en Firestore.

## Depurar layout

Si algo desborda a lo ancho: copia `scripts/probe-overflow.html` a `public/_probe.html`, abre `/_probe.html` y lista los elementos que se salen con su padre. Medir es más rápido que adivinar. Sácalo de `public/` antes de compilar.

## Las cinco superficies

La app tiene cinco destinos y nada más:

- **Mapa** — dónde queda cada cosa. Pestañas por día, con hoy elegido por
  defecto durante el viaje, y una lista debajo que sigue sirviendo si el mapa
  no carga. Las coordenadas están **precalculadas** en `src/data/coordenadas.js`
  (`node scripts/geocodificar.mjs`): la app no llama a Geocoding en caliente.
- **Ahora** — antes del viaje, cuenta atrás y agenda completa. Durante el
  viaje, se ancla en hoy: tarjeta de «Ahora mismo» y «Lo siguiente» con hora,
  sitio y *Cómo llegar*; los días que ya pasaron se pliegan detrás de un botón;
  la cabecera deja de contar hacia la salida y pasa a «día 2 de 14».
- **Decisiones** — lo que está abierto, con estado y trazabilidad.
- **Cuentas** — quién ha puesto qué y quién le debe a quién. Quinta pestaña
  (por eso «Decidir» y no «Decisiones»: con cinco columnas en un móvil de
  390 px cada una mide 78 px y la palabra larga no cabe).
- **Copiloto** — la conversación, con la IA dentro como participante que ejecuta.

No hay pestañas por categoría de dato. Hospedaje, comida y actividades son *tipos de decisión*.

## El mapa

Google Maps JS, cargado **bajo demanda** al entrar en la pantalla: quien no abre
Mapa no lo descarga ni genera carga facturable. Tope de **300 cargas al día**
(`BillableDefaultPerDayPerProject`), que por 31 días queda bajo las 10.000
gratuitas al mes.

Dos decisiones que parecen errores y no lo son:

- **Sin `mapId`.** El estilo oscuro en código (`styles`) solo se aplica a mapas
  sin Map ID. Crear un Map ID hay que hacerlo a mano en la consola de Google.
- **Marcadores clásicos** (`google.maps.Marker`) en vez de `AdvancedMarkerElement`,
  que exige Map ID. Los pines son SVG generados en `src/services/estilo-mapa.js`.

Si algún día se crea un Map ID en la consola, se pueden revertir las dos.

**Los planes que agrega el copiloto también salen en el mapa.** La Cloud
Function resuelve el sitio contra Places (`resolverSitio` en `functions/lib/maps.js`)
y guarda `coords` en el propio evento; `puntos.js` prefiere esas coordenadas
sobre la tabla precalculada, para que una corrección mande sobre la tabla.

Las coordenadas las resuelve **el servidor, no el modelo**: pedirle a Gemini
que repita quince dígitos es pedirle que se equivoque, y un pin mal puesto es
peor que ningún pin. Cuesta una llamada más a Places por plan añadido.

```bash
GOOGLE_MAPS_API_KEY=... npm run probar:sitio "Rosi La Loca, Madrid"
```

**No dibujamos rutas.** El copiloto sigue diciendo «metro 35 min, coche 29» en
texto (`computeRoute` ya resuelve TRANSIT, WALK y DRIVE) y el mapa ofrece un
botón que abre Google Maps con la navegación de verdad. Una polilínea nuestra
sería una foto bonita sin horarios de metro en vivo: enseñar una línea y dejar
a alguien esperando un metro que ya no pasa es peor que no dibujar nada.

`VITE_GOOGLE_MAPS_KEY` es una clave de **navegador**: viaja en el JS y cualquiera
puede sacarla. La restricción por dominio ayuda, pero **lo que acota el gasto es
el tope diario**. Sin esa variable la pantalla enseña la lista y avisa; nada se
rompe.

## La pasada visual (27 de agosto)

El diagnóstico fue de Camilo y es el mejor que ha dado nadie: **«se pierde
espacio, cero visual, mucho texto»**. No era falta de diseño — hay tokens y
consistencia — era que **todo pesaba lo mismo** y todo era prosa.

Lo que cambió:

- **Un color por tipo de cosa**, declarado una sola vez (`--ev-color`). El
  punto del hilo, el lomo de la tarjeta y el `+` de abrir salen todos de ahí:
  un vuelo se distingue de una cama sin leer una palabra.
- **Un color por persona** (`color` en `travelers.js`). Nueve iniciales grises
  eran nueve manchas iguales; ahora la pregunta que más se repite en un viaje
  de nueve — *¿quién va a esto?* — se responde de un vistazo.
- **Tarjetas compactas que se abren al tocarlas.** La del apartamento de Madrid
  ocupaba una pantalla entera de móvil. **Lo que nunca se pliega es el aviso**:
  esconderlo detrás de un toque sería como no ponerlo.
- **El botón de abrir dice lo que hay dentro** («3 por hacer · detalle»), no un
  «ver más» a ciegas.
- **Los dos héroes gigantes pasan a una línea.** Un «14» de dos centímetros
  ocupaba un sexto de la pantalla y no cambiaba ninguna decisión.
- **La urgencia se ve, no se lee**: un punto de color en vez de la palabra
  URGENTE cuatro veces seguidas.
- **«Afecta a…» pasa de párrafo monoespaciado a fichas** con el color del tipo.

Resultado medido en la misma captura: donde antes cabía **un día y medio**
ahora caben **tres días completos**.

### Dos trampas de CSS que costaron una iteración

- **El valor por defecto de una variable va PRIMERO.** `.ev` y `.ev-kind-flight`
  tienen la misma especificidad, así que gana la última declarada: ponerlo
  después dejaba todo gris y el color por tipo no aparecía en ningún sitio.
- **`border:` en forma abreviada borra un `border-left:` anterior.** El lomo de
  color tiene que declararse *después* del borde general.
- Y una tercera, en `<i class="dec-punto">`: un `<i>` es *inline*, y el ancho y
  el alto no le aplican sin `display`. El punto existía en el DOM y no se veía.

### El Copiloto

Lo que más cambia una respuesta es **la foto**. Antes iba en una miniatura de
84 px al lado del texto y no decidía nada; ahora manda: 16/9 a ancho completo,
y **carrusel** cuando hay varios sitios — apilar tres fotos grandes deja la
respuesta a tres pantallas de scroll.

- **Las rutas son fichas con su modo**: antes eran tres filas iguales con el
  mismo icono genérico y no se distinguía el metro del coche sin leer.
- **Lo que el copiloto HIZO no puede parecer una viñeta más.** «En la agenda»
  va en verde y «En Decisiones» en morado: es lo único del hilo que cambia el
  viaje de verdad.
- **Una firma morada** en cada respuesta suya. Fiarlo todo a la alineación
  funciona con dos mensajes y falla con veinte.

Para trabajarlo sin hablar con él en cada iteración:

```bash
GOOGLE_MAPS_API_KEY=... node scripts/demo-copiloto.mjs   # datos reales
# y luego, en modo local:  /copiloto?demo
```

La conversación de ejemplo se genera con **Places y Routes de verdad**: una
foto real tiene proporciones y colores que un rectángulo gris no tiene, y el
diseño se cae justo ahí. Se carga con `import()` diferido, así que no viaja en
el paquete de producción.

⚠️ La vista previa destapó un dato en crudo en pantalla: `2026-09-10 13:00`,
que es como lo guarda Firestore y no como lo lee una persona. Hay una prueba
que falla si vuelve a pintarse sin pasar por `formatDay`.

### Hacer y deshacer desde la tarjeta

`agregarPlan` y `quitarPlan` son dos funciones **deterministas, sin modelo**.
Agregar Rosi La Loca al jueves a la una no necesita que Gemini interprete
nada: gastarle una llamada sería pagar por adivinar algo que ya sabemos. Las
coordenadas y la dirección ya vienen en la tarjeta — no se vuelve a preguntar
a Places por lo mismo.

**Deshacer va pegado a hacer.** Sin poder quitar, nadie se atreve a dejar que
la app le escriba en la agenda del viaje. `quitarPlan` lleva tres candados y
ninguno sobra:

- **Lo puso una persona** (`createdBy`): los momentos de la siembra — vuelos,
  hoteles, el AV027 — no se borran desde ahí ni por accidente.
- **Sigue propuesto**: si alguien ya lo confirmó, deja de ser tuyo.
- **Es tuyo, o eres owner.**

```bash
npm run probar:planes    # 10 comprobaciones contra las funciones desplegadas
```

⚠️ **Una función recién creada puede responder 401** hasta que Cloud Run le
asigna el permiso de invocación pública. Si pasa:
`gcloud run services add-iam-policy-binding <nombre-en-minusculas> --region=europe-west1 --member=allUsers --role=roles/run.invoker`.

⚠️ **`export { x } from './otro.js'` en `index.js` rompe el despliegue** con
«Detected cycle while resolving name». La lógica vive en `planes.js` y el
`onCall` que la envuelve en `index.js`: separar transporte de lógica lo evita
y de paso deja las funciones probables sin levantar nada.

### El marco de captura mentía

La pantalla del Copiloto parecía rota — sin campo de escribir — y no lo estaba:
`marco-movil.html` medía **2400 px de alto**, así que una barra anclada abajo
salía fuera de la foto. Ahora acepta `&h=932` para ver lo que cabe en un móvil
de verdad. **Casi «arreglo» algo que funcionaba**; la herramienta de verificar
también hay que verificarla.

## Que la agenda se pueda tocar (28 de agosto)

> «El plan del Camp Nou del 15 sept está ahí pero no se puede hacer nada.»

Era verdad, y el plan existía: lo dejó el copiloto en Firestore
(`status: 'propuesto'`, `createdBy`), no en `src/data/`. La tentación era poner
**votar / aprobar / descartar** en todas las tarjetas. Habría sido un error: la
agenda de este viaje son sobre todo reservas pagadas, y un botón *Descartar*
encima del Vueling de 431,91 € no es una función, es una trampa.

Lo que se puede hacer con un momento lo decide `src/domain/acciones.js`, que es
puro y está probado:

| Estado del momento | Qué ofrece la tarjeta |
| --- | --- |
| `propuesto` **con** `createdBy` | votar · confirmar (owner) · quitar (autor u owner) · cómo llegar |
| `propuesto` **sin** `createdBy` | votar · cómo llegar — **nunca quitar**: no lo puso nadie desde la app |
| `confirmado` | cómo llegar, y las decisiones abiertas que lo bloqueen |

### El enlace que ya existía y no se veía

`conflicto-bernabeu` declaraba `blocks: ['bernabeu']` desde el primer día. El
dato estaba, la interfaz no lo usaba: por eso el tour del Bernabéu parecía
muerto en la agenda pese a tener una decisión abierta encima. Ahora cada
tarjeta enseña sus decisiones abiertas y salta a ellas (`/decisiones#dec-<id>`,
que además fuerza el filtro «Todas» — enlazar a algo que el filtro esconde es
peor que no enlazar).

Hay un test que recorre `OPEN_DECISIONS` y falla si un `blocks` apunta a un
momento que ya no existe. Sin él, renombrar un evento haría desaparecer el
chip en silencio.

### Decisiones con varias opciones

Hasta hoy una decisión era una pregunta de sí o no. «Dónde comemos el domingo»
con tres restaurantes delante no se resuelve votando «sí»: se resuelve
señalando uno. Una decisión puede traer `options: [{ id, title, detail,
address, priceEur }]`, y entonces el voto **es el id de la opción**. El resto
del modelo no cambia: un documento de voto por persona, mismo electorado, los
niños siguen sin contar, y **el empate no cierra**.

El copiloto tiene la herramienta `proponerOpciones`. Antes buscaba tres sitios
estupendos y ahí se acababa: la familia tenía que salirse de la app para
escoger. Las direcciones se resuelven en el servidor con Places, como en
`agregarAlPlan` y por lo mismo — el modelo puede inventarse una calle, y una
dirección falsa dentro de una opción votada es peor que no poner ninguna.

### Y de paso, un agujero que llevaba semanas abierto

`match /timeline/{eventId}` decía `allow create, update: if isAdult(tripId)`.
Es decir: cualquier adulto del viaje podía reescribir el localizador del
Vueling desde la consola del navegador. Ahora un adulto solo toca lo que tiene
autor —lo que salió de la app—; los vuelos y los hoteles los escribe
`scripts/seed.mjs` con el SDK de administrador, que no pasa por las reglas.
`node scripts/probar-reglas.mjs` lo comprueba: **13 casos contra el motor real
de Google**, no el emulador.

El valor de un voto pasa de `in ['si','no','igual']` a «cadena de 2 a 60». No
se valida contra las opciones reales: haría falta un `get()` de la decisión en
cada voto, y a cambio solo evitaría que alguien se guarde a sí mismo un voto a
una opción inventada, que el recuento ya ignora en silencio.

## Cuentas (28 de agosto)

Un Tricount para nueve personas y **tres bolsillos**. La regla, en palabras de
Camilo: repartir entre los **siete adultos**, saldar entre las **tres
subfamilias**. Si él paga una comida de todos, su hogar cubre 2/7; los papás
deben 2/7 y la familia de la hermana, 3/7.

Los dos niños **no están en ningún hogar**, y no es un olvido: «entre todos
podemos asumir los gastos de ellos». Comen, ocupan cama y pagan entrada, pero
su parte la ponen los siete adultos. Meterlos en el hogar de su madre haría
que esa familia pasara de deber 3/7 a deber 5/9 de cada cuenta. Hay una prueba
que lo vigila (`test/cuentas.test.js`).

Un gasto se divide entre **los adultos que participan en él**, no siempre
entre siete: el vuelo Bilbao–Madrid lo cogen dos y se parte en dos; un plan de
F1 se parte en tres; uno «sin F1» se parte en cuatro aunque vayan seis
personas, porque dos son niños.

### Todo en céntimos enteros

`0.1 + 0.2` da `0.30000000000000004`, y 100 € entre 7 sumados en coma flotante
no vuelven a dar 100 €. Ese céntimo aparece como un saldo fantasma que nadie
sabe de dónde sale, y la gente deja de fiarse del número. Aquí:

- Los importes se guardan en céntimos y las **reglas de Firestore exigen un
  `int`**: un `12.5` en euros se rechaza en el servidor.
- `repartir()` da lo que sobra de uno en uno **por orden alfabético de id**, y
  siempre suma exactamente lo que se pagó. Probado con 1, 2, 7, 99, 12.345 y
  999.999 céntimos entre 1, 2, 3, 4 y 7 personas.
- El comentario decía «por orden alfabético» y el código no ordenaba: los
  mismos tres adultos en distinto orden daban repartos distintos. Lo cazó la
  prueba de estabilidad, no la lectura.

### De dónde salen los 6.710,44 € ya pagados

`src/data/gastos-iniciales.js`, verificado **contra los correos**, no contra la
memoria de nadie. Lo que se verificó de verdad:

| Gasto | Importe | Pagó | Fuente |
| --- | --- | --- | --- |
| Vueling VY8002 BCN→ORY, billetes | 431,91 € | el padre | MLD57T, Mastercard ...7527, 18/05 |
| Las nueve maletas de cabina, BCN→ORY | 405,00 € | **Camilo** | MLD57T, pago 2 del 28/08, PayPal |
| Vueling VY1463 ORY→BIO, billetes | 456,44 € | el padre | SNF23N, pago 1 del 18/05 |
| Las nueve maletas de cabina, ORY→BIO | 225,00 € | **Camilo** | SNF23N, pago 2 del 15/08, Visa |
| Barcelona: impuesto y seguro | 160,30 € | **Camilo** | Recibo Sweett #1301973 |

Los correos de Vueling confirman que **las dos reservas se pagaron en dos
veces**, exactamente como lo contó Camilo: los billetes en mayo con la tarjeta
del padre, las maletas después con las suyas. El resto de reservas van a
nombre del padre por lo que él dijo, sin correo que lo pruebe.

**Las maletas de Barcelona costaron 405 €, no 225.** La decisión abierta
estimaba «del orden de 225 €» por analogía con el vuelo de Bilbao, y se
equivocó en 180 €. Una estimación por parecido no es un precio; el número solo
apareció al pagarlo. Aun así se ahorraron hasta 270 €: en puerta habrían sido
hasta 675 €.

**Un aviso que deja de ser cierto es peor que no tenerlo.** Ese vuelo gritaba
«NO ESTÁ PAGADA LA MALETA DE CABINA» y el alojamiento de Barcelona decía que
el impuesto municipal de 146,30 € se paga allí. Las dos cosas ya están
pagadas. Un aviso que pide pagar algo ya pagado se acaba ignorando, y con él
se ignoran los que sí importan: los dos se quitaron y hay pruebas que impiden
que vuelvan.

**Lo que NO entra, a propósito:**

- **La F1.** «ya están los tiquetes comprados y pagados, no lo sumes.»
- **Los vuelos de Bogotá.** Son de los papás y de la familia de la hermana;
  Camilo no va en ellos. Sus confirmaciones no están en su correo, así que no
  se sabe el importe: **inventarlo sería peor que no ponerlo.**
- El Bernabéu, Guardo y el coche: aún no hay importe cerrado.
- El depósito de 300 € de Barcelona **no es un gasto**: es una retención con
  tarjeta de crédito que devuelven a los 14 días.

### La pantalla la miran nueve personas, no una

Los hogares se llamaban **«Nosotros», «Papás» y «Hermana»**. Escrito desde la
silla de Camilo, en una app a la que cada uno entra con su propio código.
Fernando abría Cuentas y leía «Papás» para sus suegros, «Hermana» para su
propia casa y «Nosotros» para la de su cuñado: **las tres mal**.

El número grande de arriba («Debéis 1.088,39 €») sí era correcto para cada
uno, porque sale de `hogarDe(yo.id)`. Los nombres no: eran cadenas fijas. Es
el error más fácil de cometer y el más difícil de ver, porque quien escribe la
app siempre la mira desde su propia cuenta.

Ahora los nombres son de personas —«Camilo y Juliana», «Julián y Cielo»,
«Juliana y Fernando»— y lo único que se personaliza es el tuyo, que pasa a ser
**«Vosotros»**. Encaja con el resto de la pantalla, que ya te habla de tú.
`etiquetaHogar(hogarId, miHogarId)` es puro, y hay pruebas que recorren **los
siete adultos** y comprueban que nadie lee «Vosotros» sobre la casa de otro, y
que ningún nombre de hogar contiene palabras que solo son ciertas desde una
silla (`papás`, `hermana`, `mamá`, `suegros`).

### Probar solo con el ancho cómodo es no probar

Los nombres nuevos son más largos y a 430 px cabían de sobra. A **375 px** (un
iPhone SE) la fila de transferencia se partía y el botón «Ya está» caía solo a
la línea de abajo, huérfano. Ahora el importe y el botón son un bloque: o caben
los dos arriba, o bajan los dos juntos.

`scripts/capturar.sh` acepta `ANCHO=375`. Úsalo antes de dar por buena
cualquier fila con importes.

### Dos trampas que costaron una vuelta cada una

- `allow delete: if resource.data.origen != 'seed'` **denegaba siempre**. Un
  gasto normal no tiene ese campo, y en las reglas leer un campo inexistente
  hace fallar la expresión entera. Nadie habría podido borrar un gasto suyo, y
  no se habría notado hasta el viaje. Se arregla con
  `resource.data.get('origen', '')`. Lo cazó `scripts/probar-reglas.mjs`, que
  ya lleva **22 casos contra el motor real de Google**.
- El servidor de `scripts/capturar.sh` seguía sirviendo un `/tmp/local-dist`
  **ya borrado**: `pgrep` decía que vivía y las capturas salían de la
  compilación de media hora antes. Ahora el script lo mata siempre al empezar.
- Y la copia de `marco-movil.html` estaba **dentro del `if` de compilar**, así
  que una mejora del propio marco (el parámetro `ANCHO`) no llegaba nunca si no
  tocaba recompilar: la captura salía con el ancho de antes y parecía un fallo
  de la app. Tres veces en un día la herramienta de verificar mintió; **la
  herramienta de verificar también hay que verificarla.**

## Pesos a euros, y el copiloto en las cuentas (29 de agosto)

### La tasa se guarda con el gasto

Se pide a dos fuentes, en este orden y por una razón: la de jsDelivr da la
tasa con ocho decimales y `open.er-api.com` con seis. Para el peso eso es
demasiado poco — 0,000275 y 0,00027199 se parecen, pero el primero dice 3.636
COP por euro y el segundo 3.677, un **1,1 % de diferencia**: once euros en mil.
La segunda vale como respaldo, no como primera opción.

**La tasa se escribe en el documento del gasto.** Si se recalculara al vuelo,
la cena del día 12 valdría distinto cada vez que alguien abriera la app y los
saldos bailarían solos. Y se dice en pantalla que es una referencia de
mercado: el banco añade su diferencial. Sirve para repartir una cuenta entre
hermanos, no para cuadrar un extracto al céntimo.

Sin red no se inventa una tasa aproximada: el botón COP se desactiva y se
teclean los euros. Comprobado que las dos fuentes envían
`access-control-allow-origin: *`.

### Cambiar de moneda CONVIERTE

La primera versión solo cambiaba la etiqueta: escribías 1.000 €, pulsabas COP
y seguías viendo 1.000, ahora leídos como mil pesos. El número dejaba de
significar lo mismo y nada lo avisaba. Ahora 1.000 € pasan a 3.676.590 y al
revés, y el equivalente está siempre a la vista en las dos direcciones: no
hace falta cambiar de moneda para saber cuánto es.

Detrás había un segundo fallo que el primero tapaba: **`aCentimos('3.676.590')`
devolvía `null`**. El punto es ambiguo en español y hay que desambiguarlo con
la forma, no con una suposición:

| Se escribe | Se lee como | Por qué |
| --- | --- | --- |
| `1.234,56` | 1234,56 | hay coma → la coma decide, los puntos son de miles |
| `3.676.590` | 3676590 | grupos de tres → todos los puntos son de miles |
| `1.000` | 1000 | un grupo de tres → miles. Nadie escribe «1.000» por un euro |
| `12.50` | 12,50 | dos decimales, no tres → punto decimal, a la inglesa |

Sin ese caso, al pasar 1.000 € a pesos el campo quedaba con un número que la
propia app no sabía leer. Hay una prueba de ida y vuelta: lo que la app pinta
al cambiar de moneda tiene que poder reintroducirse en el mismo campo.

### El selector de moneda se leía como una etiqueta

Iba en vertical a la izquierda del número. Escribiendo `250000` pensando en
pesos, con «€» activo, al pulsar COP salían **919 millones**: la conversión
era correcta, lo que fallaba era no ver en qué moneda estabas escribiendo.
Ahora es un interruptor segmentado del ancho del campo —«Euros | Pesos
colombianos», con las palabras enteras— y la unidad va pegada al número.

Lo encontró una prueba automática de interacción, no una captura: escribir,
pulsar, leer lo que quedó. **Es el bucle que faltaba en este proyecto**: hasta
ahora todo se verificaba mirando una imagen, y una imagen no teclea.

### La mitad invisible de una función es una función que no está

Los gastos se podían anotar y no se podían corregir ni quitar. El borrado
existía desde el primer día: `borrarGasto()` en el servicio, `allow delete` en
las reglas, seis casos verdes contra el motor de Google, `quitarGasto` en el
copiloto. **Todo menos un botón que lo llamara.** La lista era papel pintado:
un cero de más y no había forma de arreglarlo desde la app.

Ahora la fila entera abre el gasto —en un móvil, apuntar a un icono de 20 px
con el pulgar falla; apuntar a una fila de 340 px, no— y desde ahí se edita o
se quita, con confirmación: cada línea de esa lista es dinero de alguien.

Las cerraduras de la interfaz **espejan las de Firestore** a propósito. Si la
app enseña un botón que el servidor va a rechazar, la persona se queda mirando
un error que no entiende:

| Gasto | Se puede |
| --- | --- |
| Lo anotaste tú | editar y quitar |
| Lo anotó otro, y organizas | editar y quitar |
| Lo anotó otro, y no organizas | solo mirar |
| Reserva sembrada | **solo mirar, ni siendo owner** |

Lo sembrado no se edita ni con permisos de owner, y la razón no es de
permisos: **la siembra es un espejo con `set()` sin merge**. El siguiente
`npm run publicar` devolvería el valor de `src/data/` y la corrección
desaparecería sin que nadie se enterara. Esos importes se corrigen en el
código, donde al lado queda escrito de qué correo salieron. La app lo explica
en vez de fallar en silencio, y los campos se ven bloqueados: **un campo que
se deja escribir y luego no se puede guardar es una promesa rota.**

### Otra vez el servidor sin el botón

Las transferencias «Ya está» quedaban grabadas **para siempre**: `allow delete`
en las reglas desde el primer día y ningún sitio donde pulsarlo. Un toque sin
querer y el saldo quedaba mal sin rastro de por qué. Es el mismo error que la
lista de gastos, cometido dos veces en dos días — por eso ahora hay una prueba
que lee `Saldado.jsx` y falla si el botón desaparece.

Ahora lo ya saldado se lista bajo el saldo y cada línea se abre: se corrige el
importe —un Bizum de 200 que en realidad fueron 180— o se deshace. **Lo que no
se puede cambiar es la dirección**: quién le paga a quién lo decide el saldo,
no una persona. Si la dirección está mal, lo que está mal son los gastos.

### Un gasto puede ir dirigido a personas sueltas

El motor repartía entre una lista de viajeros desde el primer día —el vuelo de
Bilbao son solo Camilo y Juliana— pero la pantalla solo sabía ofrecer «Los
nueve», «Grupo F1» y «Sin F1». No se podía decir «esta cena fue de mi papá,
Fernando y yo».

El selector ofrece **solo a los siete adultos**: son los que reparten. Los
niños que vayan a esa comida siguen comiendo; su parte la ponen los adultos
presentes, igual que en todo lo demás.

Y lleva el punto de color de cada uno **siempre**, elegido o no. En esa lista
hay una «Juliana Bueno» y una «Juliana» —la hermana— una al lado de la otra, y
un «Julián» y un «Julián David». En gris son cuatro nombres que se parecen;
con su color son cuatro personas. Para eso están los colores en
`travelers.js`.

### La invariante que casi se rompe

Poder elegir personas abre un caso que antes no existía: **un gasto sin ningún
adulto** entre los participantes. Alguien ha puesto el dinero y nadie lo debe,
así que los saldos dejarían de sumar cero y aparecería un crédito de la nada.
No lo habría cazado ninguna prueba: la de «los saldos suman cero» solo miraba
los gastos sembrados.

Tres cierres, porque un documento puede llegar de otra versión de la app:

1. La pantalla no deja guardar (`tienePagadores`).
2. El copiloto rechaza una lista sin adultos.
3. `saldos()` tiene su propia red: si llega igualmente, **lo asume quien lo
   pagó**. Es lo único que no inventa deuda.

Y una prueba nueva que lanza gastos deliberadamente rotos —participantes solo
niños, lista vacía— y exige que los tres hogares sigan sumando cero.

### El modo local también tiene que decir la verdad

Al probar esto, el aviso de «reserva verificada» no salía. No era un fallo del
aviso: en modo local los gastos de siembra **no llevaban la marca
`origen: 'seed'`** que sí llevan en Firestore, así que parecían editables. El
modo local enseñaba una app distinta de la real — exactamente la trampa que ya
me costó una tarde en agosto. La marca se pone también en el respaldo local.

### Cuatro verbos para el copiloto

`anotarGasto`, `listarGastos` (con orden por fecha, importe, concepto, pagador
o categoría), `quitarGasto` y `sugerirGastos`. Los tres candados de siempre
para borrar, y uno nuevo: **lo sembrado no se toca desde el copiloto**, porque
cada uno de esos importes está verificado contra su correo.

`sugerirGastos` **no escribe nada**. Cruza la agenda con las cuentas y dice qué
falta: una reserva con precio que nadie ha apuntado es dinero pagado que no
está en el reparto — y eso, no los cafés, es lo que descuadra un Tricount. Hay
una prueba que lee el cuerpo de esa función y falla si algún día contiene un
`.add(`, `.set(`, `.update(` o `.delete(`.

### Una medida vale más que dos capturas

La hoja de «Anotar un gasto» se salía de la pantalla en móvil y en escritorio.
Dos capturas seguidas dijeron QUE estaba mal; ninguna dijo por qué. Medida con
`npm run medir`, la respuesta salió en un segundo:

```
DESBORDA 390 px
    div.ng-head    534 px dentro de un padre de 460 · de -156 a 378
```

Los hijos medían **534 px dentro de una hoja de 460**. Causa: una pista `auto`
de CSS Grid se dimensiona al **max-content** del hijo más ancho —la fila de
cinco categorías— y desborda el contenedor aunque este tenga ancho fijo. Se
arregla con `grid-template-columns: minmax(0, 1fr)`: el `minmax(0, …)` es lo
que permite que los hijos encojan.

Antes había otro, del mismo día: `flex: 1` en los chips es `flex-basis: 0`, y
con base 0 el navegador cree que caben todos en una línea, reparte, y luego el
`min-width` del contenido los empuja fuera **en vez de envolverlos**.
`flex: 0 1 auto` calcula el ajuste con el ancho real y sí envuelve.

**`npm run medir` es ahora parte del trabajo**, no un último recurso. Una
captura dice que algo está mal; una medida dice cuánto y dónde.

## El abuelo cubre a Julián David (30 de agosto)

Julián David pasó del hogar de su madre al de sus abuelos. **Quién va en cada
casa no es quién vive con quién, sino de qué bolsillo sale el dinero**: su
parte de cada cuenta se la cargan ahora los abuelos, y la casa de la hermana
pasó de tres adultos a dos.

Sobre lo ya reservado, eso movió **939,34 €** de una casa a la otra:

| Subfamilia | Le tocaba | Le toca | Saldo |
| --- | ---: | ---: | ---: |
| Julián, Cielo y Julián David | 1.878,70 € | 2.818,04 € | **+2.967,04 €** |
| Juliana y Fernando | 2.817,99 € | 1.878,65 € | −1.878,65 € |
| Camilo y Juliana | 2.013,75 € | 2.013,75 € | −1.088,39 € |

La casa de Camilo no se movió un céntimo, que es la comprobación de que el
cambio hace lo que dice: reparte distinto entre dos casas y no toca al resto.

Se eligió mover el hogar en vez de añadir un campo «cubierto por». La
diferencia solo aparece si Julián David paga algo de su bolsillo: ese dinero
contaría como puesto por los abuelos. Se aceptó a sabiendas, para no meter un
concepto más en el modelo.

### Tres pruebas se cayeron, y hicieron bien

Llevaban escrito **«3/7»** en vez de la regla. Ahora dicen «cada casa debe lo
que tiene de adultos», leyendo `HOGARES`: si alguien vuelve a cambiar de casa,
siguen siendo ciertas. **Un número mágico en una prueba caduca; la regla, no.**

Una cuarta comparaba contra `Math.round(8100 * n / 7)` y fallaba por **un
céntimo**: 8.100 entre 7 no es exacto y el que sobra se lo lleva alguien.
Replicar ahí el reparto del resto sería copiar el algoritmo dentro de su
propia prueba —ya está probado aparte, con importes feos—, así que ahora
comprueba que es proporcional con un céntimo de margen.

Y hay una prueba nueva que fija el acuerdo: si alguien devuelve a Julián David
a la casa de su madre sin querer, salta.

## El copiloto mentía sin saberlo (30 de agosto)

Una conversación real destapó seis fallos. Los dos peores no se veían en
pantalla: las respuestas parecían perfectas y eran falsas.

### 1. Calculaba rutas desde el sitio equivocado

Las búsquedas de Places no tenían **ningún sesgo geográfico**. Medido:

| Le pides | Google devolvía | Ahora, con la ciudad del día |
| --- | --- | --- |
| `Sol` | Bar el Sol, Velilla del Río Carrión — **282 km** | Sol, Centro, Madrid |
| `circuito` | Karting El Pinar, León — 286 km | Circuito del Jarama |
| `el hotel` | Hotel El Tremazal, **Guardo** — 279 km | un hotel de Madrid |

Los tres caían cerca de Guardo: sin sesgo, Places resuelve hacia donde parece
venir la petición. El copiloto trazaba rutas desde un pueblo de Palencia y las
daba por buenas. De ahí salió el «15 horas y 7 minutos» para ir de Sol a
IFEMA — no se pudo reproducir exactamente, pero es la única explicación que
encaja.

Y `regionCode` estaba fijo en `'ES'` para las cuatro ciudades, tres días de
las cuales son en **París**.

### 2. Calculaba para AHORA, no para el día del viaje

La Routes API, sin `departureTime`, responde para este instante. En transporte
público eso no es un matiz. Medido, Sol → IFEMA:

- **1 h 15 min** a medianoche de hoy
- **39 minutos** el domingo de carrera a las 09:55

La app daba un número **31 minutos peor** justo en lo único que sirve para
planificar un día que aún no ha llegado. Ahora el modelo rellena `cuando` con
el día de la agenda y el servidor deduce la hora del primer plan de ese día.
En coche hace falta además `TRAFFIC_AWARE`: con `departureTime` sobre el modo
por defecto, la API responde *«Timestamp cannot be set for TRAFFIC_UNAWARE
routing mode»*.

### 3. La tarjeta perdía el modo

El servidor devolvía `mode` (inglés) y la interfaz leía `modo`. Por eso las
tres rutas salían con el mismo icono de tren y la palabra «RUTA»: en coche, en
bici y en metro, idénticas.

### 4. Un modo desconocido caía en silencio a transporte público

Era `MODOS[modo] || 'TRANSIT'`. Si el modelo mandaba «carro» o «DRIVE», la
función devolvía un tiempo de metro y él lo contaba como si fuera en coche.
**Una caída silenciosa que da un número plausible es peor que un error**:
nadie la ve. Ahora es un error explícito.

### 5. El markdown se pintaba en crudo

`*   **En transporte público:**` con los asteriscos a la vista. Un modelo
escribe listas y negritas se le pida o no; es más barato pintarlas que
pelearse con él. Cincuenta líneas propias en vez de 40 kB de librería, y el
análisis está en `src/domain/marcado.js` para poder probarlo **con el texto
exacto que salió mal**, no con una captura.

### 6. El guardia anti-mentiras tenía un falso positivo

`proponerOpciones` devuelve `eleccion`, no `propuesta`, así que cuando el
copiloto dejaba la elección en Decisiones **de verdad**, la app le desmentía
debajo. Y cuando mentía de verdad, se le desmentía y ahí acababa. Ahora se le
devuelve el aviso y se le da **una** oportunidad de llamar a la herramienta;
si insiste, entonces sí se desmiente.

### Lo que sabe ahora sin preguntar

El contexto incluye **las cuentas**: cuánto se lleva gastado y qué debe cada
subfamilia. Eso obliga a duplicar los hogares en `functions/lib/hogares.js`,
porque `firebase deploy` solo sube esa carpeta. Duplicar datos es aceptable
solo si algo vigila la copia: hay una prueba que compara los dos archivos
**y** exige que los dos cálculos den el mismo saldo. De paso murió una lista
de adultos que ya estaba duplicada en `gastos.js` sin nadie mirándola.

### El hilo ya no se pierde al recargar

`trips/{id}/hilos/{travelerId}/mensajes`, uno por persona. **Ni siquiera un
owner puede leer el de otro**: mandar en el viaje no es mandar en las
conversaciones ajenas. Se guarda solo el texto; las fotos y las rutas se
vuelven a pedir si hacen falta.

### Y el detector de referencias colgando tenía un punto ciego

Solo reconocía un parámetro desestructurado si era **el último**: `f({a,b})`
sí y `f({a,b}, c)` no. Añadir un segundo parámetro a `comoLlegar` hizo saltar
la prueba con tres falsos positivos. **La herramienta de verificar también hay
que verificarla** — van cuatro veces en este proyecto.

## Rutas de turismo, la nota que manda y el mapa (30 de agosto)

Camilo pidió tres cosas: que el copiloto sepa armar rutas de turismo conociendo
el itinerario y la gente, que la puntuación pese de verdad al sugerir sitios, y
que todo eso se vea en el mapa. Estaban en tres estados muy distintos.

### El mapa ya hacía la mitad, y la otra mitad no la hacía nadie

`agregarAlPlan` resolvía el sitio contra Places y guardaba `coords`;
`puntos.js` las lee **antes** que la tabla precalculada. Un plan del copiloto
con `lugar` ya salía en el mapa. Lo que no salía: los sitios que solo se
sugieren, las opciones de una votación, y un plan al que el modelo no le puso
`lugar`.

Y había una fuga que llevaba ahí desde el arreglo del 30 por la mañana:
**`resolverSitio` llamaba a `searchPlaces` SIN ciudad**. Se arregló el sesgo
geográfico de la búsqueda del copiloto y se dejó sin sesgo justo la llamada que
*escribe el pin en la agenda*. La puerta por la que seguía entrando Guardo.

Ahora hay dos cosas nuevas en el mapa:

- **El recorrido, dibujado.** Las paradas que comparten `rutaId` se unen en
  orden con una línea punteada por debajo de los pines (`recorridos()` en
  `puntos.js`, `Polyline` en `Mapa.jsx`). Seis pines sueltos no dicen en qué
  orden se visitan.
- **Las sugerencias, antes de agregarlas** (`MiniMapa.jsx`). Escoger mirando
  dónde caen era medio criterio y se estaba perdiendo entero. Se monta **solo
  en el último mensaje con sitios**: cada mapa cuenta contra el tope diario de
  Maps JS (300 cargas) y un hilo de planificación con un mapa por respuesta se
  lo come en una tarde.

### La puntuación no ordenaba nada, y ordenar por nota es peor que no ordenar

Places devolvía `rating` y `userRatingCount` y los dos llegaban al modelo y a
la tarjeta, pero no había ni filtro, ni orden, ni una línea en el prompt que
dijera que la nota importa. La lista salía en el orden de relevancia de Google.

La trampa de «ordenar por nota» es que **un 4,9 con 7 reseñas gana a un 4,5 con
3.000**. Así que se pondera hacia la media del propio lote… y eso tampoco basta,
cosa que descubrió una prueba y no una lectura: con esos dos sitios la media
sale 4,5, el 4,9 encoge hasta 4,53 y **sigue ganando por dos centésimas**.
Encoger acerca a la media pero nunca cruza por debajo de ella.

Se ordena por el **extremo inferior** del intervalo, no por la media: no
«cuánto vale, más o menos», sino «cuánto vale como poco».

```
posterior = (v/(v+m))·nota + (m/(v+m))·media      m = 100 reseñas
nota      = posterior − z·√(varianza/(v+m))       z = 1, varianza = 1
```

`varianza = 1` y `z = 1` son supuestos declarados, no medidas. La media sí es
un dato: la de las notas que Google acaba de devolver para esa consulta.

Medido contra la API real el 30 de agosto, «restaurantes para cenar en familia
cerca de Sol»:

| # | Orden de Google (relevancia) | Orden nuevo |
|---|---|---|
| 1 | Rosi La Loca 4,7 (26.281) | **Galipán 4,9 (5.911)** |
| 2 | El Fontán 4,1 (3.120) | Rosi La Loca 4,7 (26.281) |
| 3 | Barbara Ann 4,6 (1.005) | Barbara Ann 4,6 (1.005) |
| 4 | **Galipán 4,9 (5.911)** | Venta El Buscón 4,4 (3.797) |
| 8 | **la loperana 4,7 (11)** | *fuera del top 5* |

«la loperana» es el caso entero en una línea: 4,7 con **once** reseñas. Un
orden por nota a secas la pone segunda; este la deja fuera.

También se pide ya `regularOpeningHours` en el `fieldMask` (verificado contra
la API: los tramos vienen con `day` 0 = domingo y `weekdayDescriptions` empieza
en lunes, en español). Un 4,8 cerrado el domingo es un 0, y la Boqueria cierra
los domingos.

**`abiertoEl` devuelve tres respuestas, no dos**: sí, no, y **null cuando no se
sabe**. Mucho sitio no publica horario, y tratar el desconocido como cerrado
dejaría fuera media ciudad.

### `armarRuta`: el modelo pone los nombres, el servidor pone el reloj

Hasta ahora el copiloto sabía meter UN plan. «Armame una ruta por el Gótico el
domingo» acababa en un párrafo bonito que no dejaba nada en la agenda, o en
cinco llamadas con horas inventadas.

El modelo manda nombres y orden. `functions/rutas.js` hace el resto:

1. Resuelve cada parada contra Places **con la ciudad de ese día** y se queda
   con la mejor por nota ponderada — pide 8 y devuelve 1, porque Places cobra
   por petición y no por resultado.
2. **Dos pasadas.** El tiempo de traslado depende de la hora de salida y la
   hora de salida depende de los traslados anteriores. Se encadena primero sin
   traslados para tener una hora aproximada, se piden las rutas *para esas
   horas*, y se vuelve a encadenar. Preguntar «cuánto se tarda ahora» un día
   que aún no ha llegado fue el fallo de 1 h 15 contra 39 minutos.
3. Comprueba si cada parada abre a la hora a la que se llega.
4. Avisa de lo que **pisa algo ya reservado**, y solo de lo que puede afirmar:
   un evento sin hora no choca con nada y a uno sin final no se le inventa una
   duración. Estirar los eventos a una duración supuesta llenaría esto de
   falsos avisos y nadie los leería.
5. Escribe las paradas como **propuestas**, con un `rutaId` común.

Los avisos viajan **dentro** de `ruta`, no al lado: un modelo que redacta tiende
a suavizarlos justo cuando más hacen falta, y así la interfaz los pinta él
quiera o no.

**Un `rutaId` y un botón.** Sin él, deshacer una ruta de seis paradas son seis
toques, y una función que cuesta seis toques deshacer no la prueba nadie.
`quitarRuta` respeta los mismos candados uno por uno: solo lo que puso una
persona, solo mientras siga propuesto, y dice cuántas dejó por confirmadas.

> ⚠️ **Superado el 1 de septiembre de 2026.** `armarRuta` ya NO escribe: ahora
> devuelve un borrador que se enseña en el chat y se guarda con un botón. Los
> cinco pasos de arriba siguen siendo exactos; lo que cambió es el paso 5.
> Lee «El copiloto propone y espera» más abajo.

Coste por ruta: hasta 6 peticiones a Places + 5 a Routes. Con el tope de 150
Places/día son unas 16 rutas diarias. No es gratis y conviene saberlo.

### Editar y quitar desde «Ahora»

Quitar ya estaba; **editar no**. Cambiar la hora de algo que puso el copiloto
era quitarlo y volver a crearlo, y eso se lleva por delante los votos que ya
tenía — y quien no es owner ni siquiera podía volver a crearlo, así que en la
práctica no lo corregía nadie.

`EditarPlan.jsx` cambia título, día, hora, sitio y tipo. El sitio se manda como
**texto** y lo resuelve el servidor con la ciudad de ese día: si esta pantalla
pudiera escribir un pin, un dedo torpe podría mover el Camp Nou. Si Places no
encuentra el sitio nuevo, se queda el texto y **se quita el pin viejo** — dejarlo
sería enseñar en el mapa la dirección anterior con el nombre nuevo, que es la
peor de las tres opciones.

Un plan que se mueve de hora arrastra su final; si no, un momento de 10:00 a
11:30 movido a las 18:00 acabaría antes de empezar.

> ⚠️ **Superado el 1 de septiembre de 2026.** Los tres candados que se
> describen aquí —tener autor, seguir propuesto, ser tuyo— ya no existen.
> Cualquier adulto edita o quita cualquier momento, y esos botones viven
> plegados detrás de un banner. Lee «Se acabaron los candados de la agenda» y
> «La gestión, detrás de un banner» más abajo.

### Cuatro cosas que solo salieron al medir o al probar

1. **`groups.sin-f1` es `undefined`.** La clave del mapa es `sinF1` y el id es
   `sin-f1`. `trip.get('groups.sin-f1.travelerIds')` no devuelve nada nunca, así
   que el aviso de «van los dos niños» se habría apagado justo en el único grupo
   en el que van. Ahora se busca por `id`, con prueba.
2. **`4210 reseñas`**, sin separador de miles, encima de `32.871 reseñas`. Es la
   tercera vez que aparece este fallo en este proyecto: el español no separa los
   miles hasta cinco cifras. Ahora hay `miles()` en `cuentas.js` al lado de
   `euros()`, y las dos pantallas la usan.
3. **`.acc-cierre` no tenía `flex-wrap`.** Medido: los cuatro botones sumaban
   exactamente el ancho del contenedor, así que «Quitar la ruta entera» no
   bajaba a su línea — se encogía y quedaba pegado al botón que quita solo esa
   parada. Dos acciones muy distintas, del mismo tamaño y una al lado de la otra.
4. **Un banco de pruebas aparte mide otra cosa.** El primer intento de medir
   `EditarPlan` fue una página suelta con el mismo marcado y la misma hoja de
   estilos: dio 86 px de ancho donde la app da 343. Sin los padres reales no hay
   medida. Lo que sí vale es **inyectar el marcado dentro de una tarjeta real**
   de `/ahora` y medir ahí (`scripts/`, y el detector ignora lo que cuelga de un
   contenedor con `overflow-x`, o el carrusel de sitios sale como desborde).

### La ventana del viaje, por fin en un solo sitio

`VIAJE_DESDE` y `VIAJE_HASTA` estaban escritas a mano en `planes.js`,
`gastos.js` e `index.js`. Ahora viven en `functions/lib/ventana.js`, con una
prueba que falla si vuelve a aparecer una fecha suelta en `functions/*.js`. Era
la primera de las tres trampas del segundo viaje, y la más barata de quitar.

Y `herramientas.js` se pasaba de 400 líneas con la llegada de `armarRuta`: lo
que ve el modelo vive ahora en `functions/lib/declaraciones.js`. Son dos cosas
con dos ritmos distintos — texto dirigido a Gemini y código que se ejecuta.

## La noche del 22, reservada (30 de agosto)

Camilo reservó *Aparment Almudena* (Calle de San Emilio 62, Ciudad Lineal). El
momento `aloj-madrid-22` deja de ser un hueco con aviso y pasa a `confirmado`,
con sus 261,50 €, su ventana de entrada y sus coordenadas reales — el pin
estaba puesto en Sol como marcador provisional y ahora cae donde de verdad se
duerme.

**No entra en `gastos-iniciales.js`.** El correo dice «Total pagado: 0 €»:
Booking carga la tarjeta automáticamente y no se sabe cuál. Es exactamente la
distinción que ya costó una vez —quién reservó no es quién pagó— y un pagador
equivocado mueve dinero real entre hermanos. Lleva `pagado: false` y un `todo`
para acordarse.

Los dos números de la ficha están **medidos, no estimados**:

| Trayecto | Medido el 30 de agosto |
|---|---|
| Guardo → Ciudad Lineal, saliendo a las 15:00 del 22 | 373 km, **3 h 56 min** con tráfico |
| Ciudad Lineal → T4, a las 06:30 del 23, en coche | 17,9 km, **20 min** |
| Ciudad Lineal → T4, a las 06:30 del 23, en transporte público | **1 h 2 min** |

De ahí salen las dos advertencias que lleva la tarjeta. La primera: no dejan
entrar después de medianoche y desde las 22:00 hay recargo, así que salir de
Guardo a las 15:00 y no a las 18:00. La segunda, que no era obvia: el
apartamento resuelve la salida del AV027 **solo si hay coche**. En metro y
autobús son 1 h 2 min, y para estar en T4 a las 07:40 habría que salir a las
06:30 con siete personas y las maletas de catorce días.

El PIN de la reserva y el teléfono del anfitrión no están aquí: este
repositorio es público. Tampoco están todavía en Firestore — hay que meterlos a
mano, como se hizo con los del Tríplex, y por eso queda como `todo` en la ficha
en vez de darlo por hecho.

## La siembra no arrancaba: una dependencia que nadie declaró (31 de agosto)

`npm run seed:write` reventó con «Cannot find package 'firebase-admin'». No era
un fallo de la siembra: **seis scripts** —`seed`, `codigos`, `mover-codigos`,
`reparar-enlace`, `probar-entrada`, `probar-planes`— importan `firebase-admin`
y no estaba en `package.json` de `viaje-app`. Solo vivía en
`functions/node_modules`, para las Cloud Functions.

Funcionaba mientras alguien lo tuviera instalado a mano. Un `npm ci` en limpio,
un ordenador nuevo o un `npm install` que podara el árbol, y la siembra del
viaje deja de funcionar **el día que hace falta usarla**. Es el mismo tipo de
fallo que el `./lib/admin.js` mal importado: no rompe al escribirlo, rompe al
ejecutarlo, y para entonces ya nadie se acuerda.

Ahora está declarado como `devDependency` (`^13.9.0`, la misma línea que usan
las funciones) y hay una prueba que recorre `scripts/` y `test/`, saca todos
los paquetes externos que importan y exige que estén en `package.json`.
Comprobada quitando `firebase-admin`: falla y nombra los seis archivos.

**La única excepción es `playwright`**, que usa `scripts/medir.mjs`. Declararlo
se trae ~150 MB de navegadores en cada `npm install` para una herramienta que
se usa unas pocas veces al mes. Está en una lista de opcionales dentro de la
propia prueba, y a cambio `medir.mjs` tiene que decir en voz alta cómo
instalarse en lugar de reventar con un stack — eso también lo comprueba la
prueba.

## ¿Un segundo viaje? (30 de agosto — evaluado, NO implementado)

Camilo preguntó si se puede levantar una página igual para otro viaje con otra
gente, y si convendría otro host. Se revisó el código y **no se tocó nada**:
decidió esperar a tener el viaje. Esto queda escrito para que el próximo agente
no vuelva a derivarlo desde cero.

**Se puede, y media arquitectura ya lo permite.** Todo cuelga de
`trips/{tripId}`, las reglas son por viaje, los códigos de entrada son por
viaje y personales, y `src/services/firebase.js` ya lee `VITE_TRIP_ID`
(`|| 'sept-2026'`). Eso no hay que inventarlo.

**Lo específico del viaje son ~1.000 líneas de `src/data/`**: `trip-madrid-2026.js`
(330), `travelers.js` (148), `gastos-iniciales.js` (149),
`decisiones-sept-2026.js` (122), `hogares.js` (85), `coordenadas.js` (29).

**Tres trampas que romperían un segundo viaje en silencio:**

1. **Las fechas del viaje están a mano en tres sitios del servidor**:
   `functions/planes.js:22`, `functions/gastos.js:21` y `functions/index.js:67`
   tienen `VIAJE_DESDE = '2026-09-10'` / `VIAJE_HASTA = '2026-09-23'`. Con otras
   fechas, el copiloto rechazaría *todos* los planes y gastos con «cae fuera del
   viaje». Es el fallo más caro porque parece un fallo del modelo, no de datos.
2. **`src/domain/cuentas.js` importa `hogares.js` directamente**, y hay una copia
   servidor en `functions/lib/hogares.js`. Gente distinta = hogares distintos:
   ese acoplamiento hay que romperlo, y toca el motor del dinero.
3. **`scripts/seed.mjs` es un espejo que borra.** Siembra un solo viaje y
   elimina de Firestore lo que no esté en `src/data/`. Con dos viajes hay que
   pasarle cuál, o el segundo se lleva por delante al primero.

**Sobre cambiar de host: no.** El hosting no es la restricción. Firebase Hosting
es gratis a esta escala; el gasto son Places, Routes y Gemini, que no cambian de
proveedor. Auth, Firestore, las reglas y las Functions **son** el backend: mudarse
significa reescribirlo entero, coste alto y beneficio cero. Si algún día lo que
se busca es separar la factura, la respuesta es un segundo proyecto Firebase, no
otro host.

**Los tres caminos, si se retoma:**

- **B (el recomendado).** Mismo proyecto, segundo `tripId`: quitar las fechas
  duras, desacoplar hogares, parametrizar la siembra. Sin infraestructura nueva,
  pero comparte cuota de Places/Routes/Gemini y el mismo aviso de 20 €/mes — con
  dos viajes activos ese techo se queda corto.
- **C.** App multiviaje de verdad, con selector y hogares/fechas/grupos desde
  Firestore. Más trabajo, pero el tercer viaje ya no cuesta nada. Su trabajo
  base es exactamente el de B, así que hacer B no tira nada.
- **A.** Segundo proyecto Firebase. Parece la más limpia y envejece peor: dos
  copias del código que divergen, cada arreglo hecho dos veces, OAuth y claves
  de Maps nuevas.

**Dato que dejó dicho:** el segundo viaje tendría **algo de gente repetida**. Eso
obliga a decidir algo que hoy no está decidido: si un viajero es global (una
persona, varios viajes) o por viaje (una ficha por viaje). Lo segundo duplica
nombres pero mantiene los hogares limpios; lo primero es más bonito y complica
las reglas de pertenencia. No hay que resolverlo hasta que haya viaje.

## Se acabaron los candados de la agenda (1 de septiembre)

Camilo lo pidió en dos frases: poder quitar o modificar planes ya autorizados,
y que el copiloto enseñe la ruta antes de meterla. Las dos tocan la misma
costura —quién decide qué acaba en «Ahora»— y las dos estaban mal por el mismo
motivo: la app confundía *proteger* con *bloquear*.

### Confirmar un plan lo congelaba para siempre

Un momento `propuesto` con autor se votaba, se editaba y se quitaba. En cuanto
alguien pulsaba **Confirmar**, desaparecían todos los botones. Dos causas, y
había que arreglar las dos:

- En el servidor, `planes.js` tenía tres candados —tener `createdBy`, seguir
  `propuesto`, ser tuyo o ser owner— y el segundo cerraba la puerta por dentro.
- En la interfaz, los botones de cierre vivían **dentro** de `VotoDelPlan`. Al
  confirmar desaparece la votación, y con ella se llevaba los botones. Ahora
  `Cierre.jsx` es un componente aparte que no sabe nada de votos.

Lo que queda en su lugar no es otro permiso, es una **pregunta**. Las acciones
marcadas `peligroso` piden un segundo toque, y quién es peligroso lo decide
`esReserva()` en `acciones.js`, que es puro y está probado: quitar el Vueling
de 431,91 € pregunta; quitar una cena que propuso el copiloto hace un minuto,
no. `Cierre.jsx` no razona sobre reservas, solo lee el descriptor.

Mover el **estado** —confirmar, devolver a propuesto— sigue siendo del owner.
No es un candado de vuelta: decir «esto va a pasar» es de quien organiza, y
corregir una hora, de quien la ve mal. Y **devolver a propuesto** es la pieza
que faltaba: hasta ahora, corregir algo confirmado era borrarlo y recrearlo, y
eso se lleva por delante los votos.

### La mitad silenciosa: la siembra lo revertía todo

Aquí estaba el fallo de verdad, y no se ve leyendo la interfaz. `scripts/seed.mjs`
hace `lote.set(doc, { ...e, origen: 'seed' })` sobre **todos** los momentos de
`src/data/`, sin merge y sin condición. Con los candados quitados y la siembra
intacta, editar el hotel desde el móvil habría durado hasta el siguiente
`npm run publicar`, y un vuelo borrado habría vuelto solo al día siguiente. Sin
un solo mensaje. Un botón que deshace su propio efecto en el siguiente
despliegue es peor que no tener botón.

Dos huellas lo arreglan, y las pone el servidor, no el cliente:

- Editar algo sembrado le pone **`tocadoAMano: true`**. La siembra lo salta.
- Quitar algo sembrado deja **lápida en `trips/{id}/borrados/{id}`**, con quién
  y cuándo. La siembra no lo vuelve a crear. La lápida se escribe **antes** del
  borrado: al revés, si falla, el momento resucita.

Las dos se avisan en consola con su propio rótulo (`TOCADO`, `QUITADO`) porque
significan que `src/data/` y lo que ve la familia **ya no dicen lo mismo**, y
eso se arregla en el archivo, no dejándolo vivir en Firestore.

Y el cambio de estado subió al servidor (`moverEstadoDeUnPlan`): un momento
sembrado no tiene `createdBy` y las reglas de Firestore no dejan que un adulto
lo escriba desde el navegador. Un botón que las reglas van a rechazar deja a la
persona mirando un error que no entiende.

### El copiloto propone y espera

`armarRuta` calculaba las paradas y las escribía en la agenda en el mismo
gesto. Quedaban propuestas y se podían quitar de una vez, sí — pero la primera
vez que la familia veía el recorrido era encontrándoselo ya metido, y cambiarle
algo era quitarlo entero y volver a pedírselo con otras palabras.

Ahora son tres pasos y **solo el último escribe**:

| | escribe | qué hace |
|---|---|---|
| `armarRuta` (herramienta) | no | resuelve las paradas contra Places, encadena las horas y devuelve un borrador |
| `recalcularRuta` (callable) | no | rehace traslados y avisos cuando alguien quita una parada o mueve el arranque |
| `guardarRuta` (callable) | **sí** | vuelve a calcular y escribe las paradas, propuestas, con su `rutaId` |

`recalcular` y `guardar` **vuelven a pasar por `calcularTramos`**, y eso no es
desconfianza del navegador por gusto: si el cliente mandara las horas, una ruta
a la que se le quita la parada del medio llegaría a la agenda con los horarios
de la versión anterior. Plausibles y falsos, que es la peor clase de error y el
que nadie ve hasta estar allí. `limpiarParadas()` tira al suelo cualquier
`llegada`, `salida` o `trasladoMin` que llegue de fuera; hay una prueba que lo
vigila. Lo que sí se acepta del cliente son las **coordenadas**, porque ya se
resolvieron contra Places al proponer y porque un adulto ya podía escribirlas
creando un plan a mano: aceptarlas ahí no abre nada nuevo.

En la tarjeta se puede quitar una parada, decir cuánto se quiere estar en cada
sitio y mover la hora de arranque. Se recalcula al **soltar** el campo y no en
cada tecla: cada recálculo es una llamada a Routes por tramo y teclear «11:30»
dispararía cuatro.

`agregarAlPlan` hace lo mismo en pequeño: devuelve un borrador con el día y la
hora a mano, y la escritura la hace `agregarPlan` —la misma función que usa el
botón «Agregar al plan» de una tarjeta de sitio— cuando alguien la pulsa.

**Y hubo que cambiar las instrucciones del modelo, no solo la herramienta.**
Dejarlas diciendo «entra como PROPUESTO en la agenda» habría producido un
copiloto que promete algo que todavía no ha pasado — exactamente la mentira que
el guardia intenta cazar. Ahora se le dice que no escribe y que hable de
proponer. Al guardia, en cambio, hubo que decirle lo contrario: un borrador
**cuenta** como haber llamado a la herramienta, porque «te dejo propuesto el
plan» ya casa con el patrón de «lo agendé» y el aviso saltaría en cada ruta
bien hecha.

### Lo que salió al probar contra el servicio real, no al leer

`scripts/probar-planes.mjs` afirmaba «un momento de la siembra NO se puede
quitar» sobre `vuelo-av182` — una reserva de verdad. Cambiar el `esperado` a
`OK` habría **borrado el billete** para comprobar que el botón funciona. Se
prueba sobre un doble: un documento con `origen: 'seed'` y sin `createdBy`,
creado y limpiado por la propia prueba. Son 26 comprobaciones contra las
funciones desplegadas, y cubren el borrador entero: que `recalcularRuta` no
escriba nada, que las horas las ponga Google y no el reloj, y que `guardarRuta`
deje dos paradas propuestas que `quitarRuta` se lleva de una vez.

Medido a 1280, 430, 390 y 375 px con el hilo de `?demo`, al que se le añadieron
un borrador de ruta y uno de plan: las dos tarjetas caben (343 px dentro de 375)
sin desbordar la página. Dos arreglos salieron de ahí: el campo de minutos
medía 32 px y subió a 44, y las pastillas de día se alinearon al mismo carril
deslizante que ya usan `AgregarPlan` y `EditarPlan` — tres formas distintas de
elegir un día en tres pantallas sería una app distinta cada vez.

### Lo que NO se tocó, y por qué

- **Las reglas de Firestore siguen igual de estrechas.** Editar y quitar pasan
  por Cloud Functions, que usan el SDK de administrador: relajar las reglas
  habría abierto el navegador sin necesidad. Lo único nuevo es
  `borrados/{id}`, de lectura para los miembros y sin escritura desde el cliente.
- **Votar sigue siendo solo de lo propuesto.** Votar algo ya pagado no cambia
  nada, y ponerle marcas de voto al Vueling sería fingir que la familia decide
  sobre un billete emitido.
- **Un `viewer` sigue sin tocar nada.** Es el único límite que queda, y es
  sobre *quién* toca, no sobre *qué*.
- **`npm run lint` sigue roto** y ya lo estaba: no hay `eslint.config.js` en el
  repositorio y ESLint 10 no lee `.eslintrc`. No se arregló aquí para no
  mezclarlo con este cambio, pero conviene arreglarlo o quitar el script.

## El rediseño: cristal editorial sobre el zinc (1 de septiembre, segunda sesión)

Camilo trajo una maqueta de Claude Design (`UX review and suggestions`,
sistema «broadsheet»: papel claro, serif, cian/magenta, tarjetas de vidrio) y
eligió un **híbrido** explícito: quedarse con el oscuro zinc + violeta y
adoptar de la maqueta la serif, el cristal, los radios y la estructura.

Lo que cambió, por capas:

- **Tokens** (`tokens.css`): `--font-ui` pasa a Source Serif 4 (la mono se
  queda para horas y localizadores); familia `--glass-*` + `--blur-glass`;
  radios 14/20; `--accent-grad`; y `--fondo-app`, un zinc con dos brillos —
  porque un blur sobre negro plano no difumina nada.
- **Armazón**: cabecera y barra inferior son láminas de cristal; las pestañas
  son píldoras y la activa lleva `--nav-pill`.
- **«Ahora» es día a día**: `ui/DiasCarrusel.jsx` (chips con punto de aviso
  magenta), flechas, y **anclada en hoy durante el viaje** — el pendiente
  apuntado desde agosto. `eventosDelDia()` en `domain/agenda.js` decide qué
  sale: lo que empieza ese día MÁS el alojamiento en curso («Sigues aquí»),
  porque un día sin su alojamiento parece un día sin dormir. Con prueba.
- **Copiloto**: mis burbujas llevan el degradado del acento y las suyas son
  vidrio; atajos, tarjetas de sitio, borradores y recibos, restilizados.
- **Decidir/Cuentas/Mapa/Ajustes/Entrar**: mismas piezas, piel de cristal.
  Los filtros de Decidir ya existían — la maqueta los había copiado de la app.

Lo que NO se adoptó de la maqueta, y por qué:

- **El tema claro y el botón claro/oscuro**: Camilo eligió seguir oscuro.
- **«Cómo llegar» en toda tarjeta**: sigue siendo solo en lo de hoy
  (`accionesDe` + `pasaHoy`), regla medida que la maqueta ignoraba.
- **La imagen estática del mapa**: el mapa real interactivo se queda.
- **El botón de tema, el «Me da igual» como texto de voto y los datos de
  ejemplo** de la maqueta (viajeros con otros colores, un `buildReply`
  simulado): eran atrezzo del prototipo, no producto.

Una captura del hilo del copiloto cazó un fallo que llevaba días en
producción: «18.420 18420 reseñas». `plural()` ya incluye el número y tres
call sites le anteponían `miles()`. El arreglo fue meter el separador de
miles DENTRO de `plural()` y una prueba que vigila que nadie lo duplique.

Verificado: `npm run medir` en las cinco rutas a 1280/430/390/375 px — cero
desbordes — y capturas revisadas una a una (agenda antes y durante el viaje,
copiloto con borradores, decidir, cuentas, escritorio).

## La gestión, detrás de un banner (1 de septiembre, tercera pasada)

Quitar los candados tuvo un efecto que solo se ve mirando la pantalla, no el
código: **cada tarjeta de la agenda acabó con «Volver a proponer · Editar ·
Quitar» siempre puestos**. Diecisiete momentos × tres botones = una agenda que
parecía un panel de administración, justo lo contrario de lo que la superficie
«Ahora» tiene que ser — algo que se lee de un vistazo con el teléfono en la
mano y una maleta en la otra.

Camilo lo pidió directo: que aparezcan solo al tocar algo. Ahora hay una fila
discreta, **«Editar o quitar ›»**, y los tres botones salen debajo con un
«Ocultar» al lado.

Lo que importa de cómo está hecho:

- **La marca vive en el dominio.** `accionesDe` etiqueta cada acción con
  `discreta: true`; `Cierre.jsx` filtra por esa marca y no por una lista propia
  de ids. Si se decidiera en el JSX, la próxima sustitución de texto rompería
  el pliegue en silencio — y hay una prueba que lo vigila.
- **`Confirmar` NO es discreta.** Es la acción que un plan propuesto está
  esperando: esconderla detrás de un toque convertiría el flujo normal en el
  camino largo. La regla es «gestionar se pliega, decidir no».
- **Cerrar el banner suelta también la pregunta de seguridad.** Un «¿Seguro
  que quieres quitar el Vueling?» colgando de un panel que ya no se ve es
  exactamente la clase de trampa que el segundo toque existía para evitar.
- El banner es vidrio neutro con chevron: pariente visual de los enlaces a
  decisiones, pero sin su color de urgencia. **Gestionar no es un aviso.**

Medido a 375 px con el panel abierto y cerrado: tres banners y cero botones
sueltos plegado; al tocar, los tres botones más «Ocultar», sin desbordes.

## La conversación se acaba sola (1 de septiembre, cuarta pasada)

Camilo, probándola: *«mantener las conversaciones en el hilo no es buena»*. El
síntoma exacto que dio fue **no poder empezar de cero**, y la causa era una
vieja conocida del proyecto: `olvidar()` estaba escrita en `useHilo.js` desde
el 30 de agosto, borraba el hilo entero… y **no tenía ni un botón**. La misma
mitad invisible que el borrado de gastos en agosto, repetida.

Pero el botón solo era la mitad del arreglo. El problema de fondo es que un
hilo que no termina nunca hace que **cada pregunta viaje al modelo con las
doce intervenciones anteriores**, que pueden ser de anteayer y de otra ciudad.
Eso produce respuestas seguras y equivocadas: la misma familia de error que
calcular una ruta «para ahora» un día que aún no ha llegado.

Así que una conversación ahora se acaba sola. `src/domain/hilo.js`,
`sesionActual()`, puro y con `ahora` como parámetro. Dos cortes:

- **Un silencio de cuatro horas.** Lo de la mañana y lo de la noche no son la
  misma conversación. Se mide contra el último mensaje, no contra el primero:
  una charla larga no caduca por haber empezado temprano.
- **Un cambio de día.** El 14 se duerme en Barcelona y el 13 en Madrid;
  arrastrar el contexto de ayer es arrastrar la ciudad de ayer.

Lo anterior **no se borra**: sigue en Firestore, simplemente no se pinta ni se
manda. Y un mensaje recién escrito, cuyo `serverTimestamp()` todavía no ha
vuelto, cuenta como de ahora — o la app borraría de la pantalla lo que la
persona acaba de teclear.

Encima del hilo hay ahora una fila con **«Empezar de cero»**, lejos del botón
de enviar. No pide confirmación a propósito: lo que se pierde es contexto, no
datos — los planes están en la agenda, los gastos en las cuentas y las
decisiones en Decisiones.

### La barra pegajosa que la captura desmontó

Empezó dentro del hilo, `position: sticky`, con el mismo cristal que las
tarjetas. En la captura se vio el fallo: **el mensaje de debajo pasaba por
detrás y se leía encima de «Empezar de cero»**, y quedaba una franja de 16 px
—el `padding` del hilo— por la que se colaba el texto. Con las tarjetas el
cristal funciona porque flotan sobre el fondo; sobre texto en movimiento, no:
el blur difumina, pero lo que tapa es la capa.

Se sacó a **fila propia del grid**, fuera del scroll. Sin sticky, sin bleed, y
colapsa a cero cuando no hay conversación. Medido: `barra.bottom == hilo.top`,
solapamiento cero.

## Cinco sitios, no dos

La segunda petición era «que sugiera al menos 5 opciones». El tope **ya era 5**
—lo es desde que existe `buscarLugares`— y ese no era el problema:

- `quitarLosFlojos()` solo devuelve el lote entero cuando **nadie** pasa el 3,8.
  Si pasaban dos, salían dos tarjetas, sin decir por qué. El mínimo de nota es
  una *preferencia, no una condición* — regla escrita del proyecto desde
  agosto — y esto es la otra mitad que faltaba: `completarHasta()` rellena con
  lo mejor de lo descartado, sin desordenar lo bueno.
- El suelo pasó a estar **en el código**, no en el prompt:
  `Math.max(cuantos || 5, 5)`. «Enséñale cinco» en las instrucciones es una
  intención; un suelo en el servidor es una regla. El proyecto aprendió esa
  diferencia con las mentiras del copiloto en agosto.

Sale gratis pedir de más: Places cobra por petición, no por resultado.

### Y una medida que mentía

`node scripts/medir.mjs '/copiloto?demo'` dio **0 desbordes** una vez y **4**
la siguiente sin cambiar nada relevante: el hilo de ejemplo entra por
`import()` diferido y a veces no había llegado dentro de la espera del script.
Comprobado a mano: la página **no scrollea a lo ancho** en ninguno de los
cuatro anchos, y los 20 elementos que asoman viven **todos** dentro de un
carril con `overflow-x: auto` — los carruseles de sitios y de días haciendo su
trabajo. Si `medir.mjs` da 0 en `?demo`, desconfía: sube la espera.

## Notas en las tarjetas de «Ahora» (1 de septiembre, quinta pasada)

Camilo, probándola: *«poder dejar comentarios o notas, por ejemplo recordar
reservar»*. **No era una función nueva**: es el hilo de comentarios de una
decisión colgando de la otra rama. Los votos habían hecho ese mismo camino en
agosto, cuando los planes propuestos empezaron a votarse, y `paths.js` ya
tenía el `RAMAS = ['decisions', 'timeline']` esperando.

Así que el cambio es sobre todo **no duplicar**: `commentsRef`,
`suscribirComentarios`, `comentar` y `useComentarios` pasan a llevar una
`rama` con `'decisions'` por defecto — la llamada de Decisiones no se toca —
y `Notas.jsx` reusa el mismo hook con `'timeline'`. Las reglas de Firestore
se copian bajo `timeline/{eventId}`, porque **sin regla propia Firestore
deniega por defecto** y la nota fallaría al guardarse con un error que nadie
entiende.

Dos decisiones que parecen una sola:

- **Las notas escritas se ven sin tocar nada.** «Recordar reservar» tiene que
  saltarte al ojo cuando miras el día; una nota detrás de un toque no recuerda
  nada. Es exactamente lo contrario de los botones de gestión, que se
  plegaron esa misma tarde. **Gestionar se pliega, avisar no.**
- **Escribir sí está plegado**, tras un «+ Nota». Un formulario en cada
  tarjeta del día convertiría la agenda en un cuaderno.

Son **de todos y van firmadas**: nueve personas apuntando cada una por su lado
«hay que reservar» es el problema del que sale esta app, no la solución. Las
edita y borra su autor (o quien organiza), igual que en Decisiones.

**Van en cualquier momento, vuelos y hoteles incluidos, y eso no choca con la
siembra**: viven en una subcolección, y `seed.mjs` hace `set()` sobre el
documento del momento — no alcanza a los hijos. Ponerle una nota al Vueling no
lo marca `tocadoAMano` ni lo saca del espejo. Hay una prueba que vigila que la
siembra no aprenda nunca lo que es un comentario.

El coste de suscripción resultó barato **gracias al rediseño**: «Ahora» enseña
un día, así que son dos o tres escuchas de Firestore, no diecisiete.

Verificado con `node scripts/probar-reglas.mjs` —el motor real de Google, no
el emulador— en siete casos: quién puede escribir, quién no puede firmar por
otro, quién borra y que nadie reasigne el autor de una nota ajena.

### Corregir y quitar (la media función que faltaba)

Las notas nacieron sin papelera ni lápiz: las reglas ya lo permitían y no
había camino desde la pantalla. Es el fallo recurrente de este proyecto —el
borrado de gastos, `olvidar()`— así que se cerró el mismo día.

**Tocas tu nota y aparecen «Editar» y «Quitar».** Coherente con lo demás:
gestionar se pliega. Una nota ajena no reacciona al toque, salvo que
organices. Y quitar no pide confirmación: lo que se pierde es una línea que
escribiste tú, dentro de un panel que abriste a propósito — acostumbrarse a
confirmar lo trivial es lo que hace que la confirmación deje de significar
algo cuando de verdad importa.

Dos detalles que no son detalles:

- **`domain/notas.js` espeja las reglas de Firestore**, y la asimetría es
  deliberada: edita solo su autor, borra su autor **o quien organiza**.
  Alguien tiene que poder limpiar una nota que sobra cuando su autor no
  mira; nadie debería poder reescribir lo que dijo otro. Hay una prueba que
  compara el dominio con `firestore.rules` línea a línea.
- **`editarComentario` no manda `authorUid`.** La regla lleva
  `unchanged('authorUid')`, que rechaza la escritura si el campo viaja
  *aunque lleve el mismo valor*. Mandarlo sería pedirle a Firestore que diga
  que no. Hay una prueba que lo vigila.

Los botones van a **44 px y separados**, no a los 32 px de los botones inline
de esta app (`.acc-editar`, `.ev-mas`): ninguno de esos destruye nada, y aquí
el hueco entre «Editar» y «Quitar» es lo único que separa una corrección de
una pérdida.

## Reglas innegociables

- Ningún archivo por encima de **400 líneas**.
- Ningún color, radio o sombra literal fuera de `src/styles/tokens.css`.
- Ningún secreto en el repositorio: **este repo publica GitHub Pages**.
- Los niños son viajeros, no usuarios: cuentan para capacidad y presupuesto, y **nunca votan**.
- IA vía **Google AI Studio**, nunca Vertex AI.
- Nada que dependa del reloj lo lee por su cuenta: recibe `ahora`. Si no, no se
  puede probar ni previsualizar.
- Un botón *Cómo llegar* solo se pinta si el destino es un sitio al que de
  verdad se puede ir. Trazar ruta a «Madrid» es peor que no poner el botón.
- **Nada que la app deje tocar puede deshacerlo la siembra en silencio.**
  Cualquier adulto edita o quita cualquier momento, vuelos y hoteles incluidos
  (1 de septiembre). Eso solo es honesto porque `seed.mjs` respeta la marca
  `tocadoAMano` y las lápidas de `borrados/`. Si se toca uno de los dos lados,
  se tocan los dos.
- **Fricción donde está el daño, no en todas partes.** Quitar una reserva pide
  un segundo toque; quitar una cena propuesta hace un minuto, no. Quién es
  «reserva» lo decide `esReserva()` en el dominio, nunca el JSX.
- **Gestionar se pliega; decidir, no.** Editar, quitar y devolver a propuesto
  viven detrás del banner «Editar o quitar»; `Confirmar` se queda a la vista.
  La marca es `discreta` en `accionesDe`, nunca una lista de ids en el JSX.
- **El copiloto propone, no escribe.** `agregarAlPlan` y `armarRuta` devuelven
  un borrador; la escritura la dispara una persona con un botón.
- Lo que se puede hacer con una tarjeta se decide en el dominio (`acciones.js`),
  nunca en el JSX. El JSX pinta descriptores; así se puede probar sin navegador.
- **El dinero, en céntimos enteros.** Nunca un euro con decimales, ni en el
  cliente, ni en Firestore, ni en las reglas.
- **Ningún importe inventado.** Si no hay correo que lo respalde, el gasto no
  se siembra: se deja fuera y se dice que falta.
- Nada de plurales a mano: `plural(n, 'gasto', 'gastos')`. «Ver los 1 días que
  ya pasaron» se escribió dos veces en dos semanas.
- **Antes de dar por bueno un diálogo o una tabla, `npm run medir`.** A 1280,
  430, 390 y 375 px. Mirar una captura no es medir.
- La tasa de cambio se guarda con el gasto, nunca se recalcula.
- **Ninguna llamada a Places sin ciudad.** Vale para `buscarLugares`, para
  `resolverSitio` y para cualquiera que venga: sin sesgo, «Sol» es un bar de
  Velilla del Río Carrión.
- **Ninguna ruta sin `departureTime`.** Calcular para «ahora» un día que aún no
  ha llegado da un número plausible y equivocado, que es el peor.
- **La nota nunca ordena sola.** Se pondera por número de reseñas y se ordena
  por el extremo inferior. Un 4,9 con siete opiniones no es el mejor sitio.
- **Nada que escriba varias cosas a la vez sin poder deshacerlas de una vez.**
  Una ruta son seis momentos y un solo `rutaId`.
- **Medir dentro de la app, nunca en una página de pruebas aparte.** Sin los
  padres reales la medida vale 86 donde la app da 343.


## Revisión del copiloto — 6 de septiembre de 2026

Auditoría del código en `cd3143d` y de una compilación local nueva. No se
modificó la aplicación ni se desplegaron cambios. La web pública llega al
acceso por código; no se evaluaron respuestas nuevas de Gemini autenticadas.

Hallazgos de aquella revisión. La implementación posterior se detalla en
«Mejoras del copiloto — 6 de septiembre de 2026» al final de este archivo:

- La cuadrícula de `copiloto.css` declara tres filas, pero sin conversación
  el JSX solo monta dos hijos. La barra de escribir ocupa la fila flexible:
  el botón Enviar se estira en la bienvenida. Asignar filas explícitas o
  adaptar la plantilla al estado vacío.
- La caducidad se aplica al recuperar Firestore en `useHilo`, no antes de cada
  envío. Una pestaña abierta puede seguir mandando mensajes de ayer. Fechar
  los mensajes en memoria y recortar la sesión antes de preguntar.
- Solo se persiste texto: los borradores y tarjetas desaparecen al recargar.
  Guardar el estado mínimo del trabajo pendiente, separado del historial que
  recibe Gemini; las fotos no son necesarias para conservar un borrador.
- `queMintio` acepta una afirmación de escritura si hay un borrador. Probado
  con «Ya te lo agregué a la agenda»: devuelve null sin ningún plan guardado.
  Distinguir propuesta de escritura real en el estado y en el texto mostrado.
- El contexto del modelo no incluye la identidad del interlocutor ni las
  nuevas notas de agenda. Los atajos siguen anclados a Sol, IFEMA y «mis
  papás». Propuesta: contexto visible de día, ciudad y grupo, identidad
  explícita y notas relevantes identificadas como comentarios familiares.
- Sustituir la promesa «no me invento nada» por una descripción verificable
  de las fuentes y sus límites. Cinco opciones pueden mantenerse, pero
  conviene destacar una con un motivo concreto y facilitar comparar el resto.

Validación: `npm run check` pasa con 213 pruebas; compilación correcta con
aviso de chunk superior a 500 kB. Playwright en 1280, 430, 390 y 375 px:
ningún desbordamiento horizontal de documento ni excepción JavaScript en el
recorrido local; «Empezar de cero» devuelve la bienvenida. Browser plugin no
está disponible y se utilizó Playwright instalado. El ejemplo local contiene
solo dos sitios antiguos: no demuestra la búsqueda actual de cinco opciones,
la vigencia de las fotos ni el servicio autenticado de Maps/Gemini.


## Mejoras del copiloto — 6 de septiembre de 2026

**Implementado y probado en local; pendiente de publicación.** El modelo no
se cambió: el código usa `gemini-2.5-flash` y la función desplegada no tiene
un valor alternativo de `GEMINI_MODEL` (consulta de configuración, sin secretos).

- Cinco sitios iniciales y **«Ver 5 opciones más»**. La callable `masLugares`
  exige pertenecer al viaje y consulta Places directamente, sin Gemini. Conserva
  consulta, ciudad e IDs vistos; no duplica sitios y avisa al agotar el lote.
  Cada consulta examina hasta 20 candidatos. No es una búsqueda infinita ni
  garantiza veinte sitios: depende de lo que devuelva Google. Si el usuario
  pide una cantidad concreta, `buscarLugares` acepta de 5 a 20. Solo se pide
  una foto por sitio mostrado, en vez de hasta cinco fotos que nadie veía.
- El formulario ocupa su fila explícita, también sin cabecera de sesión.
  El botón Enviar mide 44 px en las pruebas a 1280, 430, 390 y 375 px.
- Se fecha cada mensaje nuevo y se recorta el contexto antes de enviarlo.
  Los borradores pendientes sobreviven al cambio de día y a «Empezar de cero»,
  pero no se incluyen como conversación vieja del modelo. Se descartan en su
  propia tarjeta. La ampliación de sitios ya no fuerza el scroll al final del chat.
- `hilos/{travelerId}/estado/actual` conserva conversación y borradores con sus
  cambios, descartes y recibos. Es privado incluso frente al owner. Las
  transacciones comprueban una revisión para impedir sobrescrituras desde
  otra pestaña desactualizada; los conflictos se muestran al usuario. Las
  URLs efímeras de fotos no se guardan. Los mensajes de texto siguen en el
  historial inmutable y sirven de respaldo para migrar conversaciones antiguas.
- El guardia distingue un borrador de una escritura real: una afirmación falsa
  de «ya está en la agenda» se sustituye por un estado verdadero. Las tarjetas
  mantienen sus avisos. Se retiró la promesa «no me invento nada».
- El contexto incluye quién pregunta, fecha en Europe/Madrid y las tres últimas
  notas de cada uno de los diez próximos eventos. Las notas se identifican como
  datos familiares, no instrucciones. Los atajos ya no están fijados a Sol,
  IFEMA ni «mis papás». Un selector manual de día/ciudad y una recomendación
  destacada entre las opciones siguen siendo propuestas, no funciones añadidas.

**Validación:** 220 pruebas pasan; 47 casos contra el motor de reglas de Google
pasan, incluidos lectura propia y denegación a terceros. Build correcto, con
el aviso conocido del chunk de Firebase superior a 500 kB. Playwright prueba
la app y sus componentes reales con transporte Firebase/Gemini simulado:
5 → 10 sitios, fallo y reintento, final de resultados, recarga con hora editada,
reinicio con borrador pendiente y guardado sin reaparición del borrador. Sin
excepciones JavaScript ni desbordamiento horizontal en los cuatro anchos.
Places real devuelve dos lotes de cinco, diez IDs distintos y fotos en el
primer lote. No se escribieron pruebas en el viaje de la familia.

**Modelo:** la API del proyecto también lista `gemini-3.8-flash`. Es candidato
para una evaluación con preguntas reales del viaje, no un cambio automático.
[Catálogo oficial](https://ai.google.dev/gemini-api/docs/models) y
[precios oficiales](https://ai.google.dev/gemini-api/docs/pricing), consultados
el 6 de septiembre: 2.5 Flash cuesta $0,30/$2,50 por millón de tokens de
entrada/salida de texto; 3.8 Flash figura a $0,75/$3,75 hasta el 31 de diciembre
de 2026. No se ha realizado un benchmark comparativo del copiloto. Revisar
compatibilidad de configuración y herramientas antes de cambiar la variable.

**Publicación:** desplegar primero las reglas de la instantánea y las funciones
`copiloto` y `masLugares`; después, hosting. `npm run publicar` solo despliega
hosting y siembra datos: no publica estas funciones. Esta mejora no cambia
`src/data/` y no requiere siembra. No publicar solo la web con reglas antiguas.
