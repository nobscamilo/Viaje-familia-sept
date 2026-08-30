# Configuración de Firebase

Hay **dos credenciales distintas** y se usan para cosas distintas. Confundirlas es el error caro.

| | Config **web** | Clave de **cuenta de servicio** |
|---|---|---|
| Qué es | `apiKey`, `projectId`, `appId`… | Un `.json` con `private_key` |
| Para qué | Que la app hable con Firebase desde el navegador | Scripts de administración (`npm run seed:write`) |
| Poder | El del usuario que ha entrado. **Las reglas de Firestore la limitan** | **Administrador total. Se salta todas las reglas** |
| ¿Secreta? | No. Va en el JavaScript que descarga cualquiera | **Sí. Es la llave maestra del proyecto** |
| Dónde vive | `.env.local` (fuera de git) | `~/.config/viaje-app/` (**fuera del repo**) |

La `apiKey` web no es un secreto aunque lo parezca: identifica el proyecto, no autoriza nada. Lo que protege los datos son las reglas de `firestore.rules`. Por eso es correcto que viaje dentro del bundle.

La clave de cuenta de servicio es lo contrario: **con ella se lee, se escribe y se borra todo, sin pasar por ninguna regla.**

---

## 1. Config web → `.env.local`

Consola de Firebase → ⚙️ **Configuración del proyecto** → pestaña **General** → abajo, **Tus aplicaciones** → app web → **Configuración del SDK** → *Config*.

```bash
cp .env.example .env.local
# y rellenar con los valores de esa pantalla
```

Si no existe todavía una app web, se crea ahí mismo con **Agregar app → Web**. No hace falta hosting para crearla.

Sin `.env.local` la app arranca igual, en modo local con los datos de `src/data/`.

## 2. Clave de administrador → fuera del repo

```bash
mkdir -p ~/.config/viaje-app
mv ~/Downloads/viaje-familia-*-adminsdk-*.json ~/.config/viaje-app/admin.json
chmod 600 ~/.config/viaje-app/admin.json
```

Y para usarla:

```bash
export GOOGLE_APPLICATION_CREDENTIALS=~/.config/viaje-app/admin.json
npm run seed          # simulacro
npm run seed:write    # escribe de verdad
```

> ⚠️ **Nunca** dentro de `viaje-app/` ni de `Viaje sept/`. El repositorio tiene remoto en GitHub y publica Pages. Hay una prueba (`test/secretos.test.js`) que falla si aparece una dentro, y `.gitignore` cubre los nombres típicos — pero la primera línea de defensa es no meterla.

## 3. Si una clave se expone

Borrarla del disco **no basta**: hay que revocarla, porque sigue siendo válida.

1. [Google Cloud Console → IAM → Cuentas de servicio](https://console.cloud.google.com/iam-admin/serviceaccounts?project=viaje-familia-sept-2026)
2. Entrar en `firebase-adminsdk-fbsvc@viaje-familia-sept-2026.iam.gserviceaccount.com`
3. Pestaña **Claves** → borrar la clave expuesta por su id
4. **Agregar clave → Crear clave nueva** si todavía hace falta

Mientras la clave vieja exista, cualquiera que la tenga entra. Borrar el archivo no cierra nada.

## 4. Desplegar reglas

```bash
npm run rules   # firebase deploy --only firestore:rules,firestore:indexes
```

Necesita `firebase login` una vez.

## 5. Enganchar cada persona con su viajero

Al entrar por primera vez con Google, cada uno genera un `uid`. Hay que mapearlo en el documento del viaje:

```
trips/sept-2026
  roles:          { "<uid>": "owner" | "adult" | "viewer" }
  uidToTraveler:  { "<uid>": "camilo" }
```

Sin ese enganche los votos no tienen dueño. Los niños **no** aparecen aquí: no tienen cuenta, y por eso las reglas les impiden votar aunque alguien lo intentara.

---

## 6. Error `auth/requests-from-referer-...-are-blocked`

Síntoma: al pulsar *Entrar con Google* en `localhost`, la consola da un **403** de `identitytoolkit` y el error `auth/requests-from-referer-http://localhost:PUERTO/-are-blocked`.

**No es un problema de la app ni de los dominios autorizados de Firebase Auth.** Lo comprobamos con `scripts/diagnostico-auth.py`:

```
sin referer      403   Requests from referer <empty> are blocked.
localhost:4317   403   Requests from referer http://localhost:4317/ are blocked.
localhost:5173   403   Requests from referer http://localhost:5173/ are blocked.
produccion       200   dominios autorizados: [localhost, ...firebaseapp.com, ...web.app]
```

`localhost` **sí** está entre los dominios autorizados de Firebase Auth. Lo que bloquea es otra cosa: la **clave de API tiene restricción por referente HTTP** en Google Cloud, y solo admite los dominios de producción.

### Arreglo

[Google Cloud → APIs y servicios → Credenciales](https://console.cloud.google.com/apis/credentials?project=viaje-familia-sept-2026) → la clave de navegador → **Restricciones de aplicación → Sitios web** → añadir:

```
localhost
localhost/*
http://localhost:*/*
```

### Lo que conviene saber sobre esa restricción

**La restricción por referente no es una medida de seguridad seria.** El diagnóstico de arriba lo demuestra sin querer: el script de Python mandó `Referer: https://viaje-familia-sept-2026.firebaseapp.com/` y recibió un **200**. Cualquiera puede escribir esa cabecera; solo el navegador se autolimita.

O sea: bloquea tu desarrollo y no frena a nadie que quiera saltársela.

Lo que de verdad protege el proyecto:

1. **Las reglas de `firestore.rules`** — deciden quién lee y escribe qué. Es la defensa real.
2. **App Check**, si algún día hace falta impedir que clientes no legítimos usen la clave.

Por eso añadir `localhost` no debilita nada que estuviera fuerte.

### Alternativa más limpia

Crear una **segunda clave solo para desarrollo**, restringida a `localhost`, y dejar la de producción intacta:

Credenciales → **Crear credenciales → Clave de API** → restringir a `localhost/*` y a la API *Identity Toolkit* → ponerla en `.env.local`. `.env.local` no se sube, así que la de producción nunca se toca.

### Comprobar

```bash
python3 scripts/diagnostico-auth.py
```

Tiene que dar `200 OK` en la línea de `localhost`.

### Estado actual (26 ago 2026)

La clave admite **`http://localhost:4317`** exactamente, más los dos dominios de producción. Siguen bloqueados `localhost` sin puerto, `127.0.0.1` y los canales de vista previa `--x.web.app`.

Por eso `vite.config.js` fija el puerto **4317** con `strictPort` tanto en `dev` como en `preview`. Si algún día hace falta otro puerto, hay que añadirlo también a las restricciones de la clave — o poner `http://localhost:*/*` de una vez.

---

## 7. La clave de Gemini

El copiloto usa **Google AI Studio**, no Vertex AI (regla de `AGENTS.md`). La clave vive en **Secret Manager**, no en el repositorio ni en `.env.local`: la usa la Cloud Function, no el navegador.

### Comprobar si sirve

```bash
sh scripts/probar-claves.sh
```

Prueba las dos claves del servidor contra sus APIs reales y no imprime ninguna.

### Renovarla

```bash
sh scripts/renovar-clave-gemini.sh
```

Pide la clave sin eco, **la valida contra Google antes de guardarla**, crea una versión nueva del secreto y redespliega la función. La clave no pasa por el chat, no queda en el historial del terminal y no toca ningún archivo.

Se saca de <https://aistudio.google.com/apikey>.

### Estado 26 ago 2026

La clave guardada (creada el 24 de mayo) **está muerta**: `API key not valid`. No es un problema de restricciones — la clave ya no existe. Hasta renovarla, el copiloto responde con un error.

La de Maps sí funciona: verificada con una búsqueda real cerca de Sol.

---

## Techo de gasto — puesto el 26 de agosto de 2026

**Un presupuesto de Google Cloud NO frena nada: solo manda un correo.** El tope
de verdad son las cuotas por día, que hacen que la llamada 151 falle en vez de
facturarse. Están puestas así:

| API | Cuota | Tope/día | Máximo al mes | Nivel gratuito |
|---|---|---|---|---|
| Places (New) Text Search | `SearchTextRequestPerDayPerProject` | 150 | 4.650 | 5.000/mes (Pro) |
| Routes Compute Routes | `ComputeRoutesRequestsPerDay` | 300 | 9.300 | 10.000/mes |

Los números no son arbitrarios: **31 × tope < nivel gratuito**. Aunque alguien
sacara la clave del navegador y la reventara todos los días del mes, el gasto en
Maps no puede salir del tramo gratuito. Text Search Pro cuesta 32 $/1.000 fuera
de él, así que sin tope una fuga costaba dinero de verdad.

Verlas o cambiarlas:

```bash
gcloud alpha quotas info describe SearchTextRequestPerDayPerProject \
  --service=places.googleapis.com --project=viaje-familia-sept-2026
gcloud alpha quotas preferences create --service=places.googleapis.com \
  --project=viaje-familia-sept-2026 --quota-id=SearchTextRequestPerDayPerProject \
  --preferred-value=NUEVO --allow-high-percentage-quota-decrease
```

Además:

- **Presupuesto de 20 €/mes** acotado a este proyecto, con avisos al 50/90/100 %.
  Hay otro de 50 €/mes para toda la cuenta. Ambos son avisos, no frenos.
- **Vertex AI apagado** (`aiplatform.googleapis.com`). `AGENTS.md` lo prohíbe y
  la app no lo usa: estaba activado y con una clave apuntándole.
- **Dos claves de API de mayo de 2026 borradas**: la de Vertex y la que Firebase
  creó sola para Gemini. Ninguna tenía restricción de aplicación (cualquiera con
  la cadena podía gastar) y ninguna la usaba la app — se comprobó comparando su
  huella con la del secreto `GEMINI_API_KEY`.
- El copiloto sigue con `maxInstances: 3`.

### Lo que sigue sin tope

**Gemini no tiene cuota diaria ajustable en el nivel de pago** — solo por minuto.
Lo que acota el gasto ahí es la Cloud Function: exige pertenecer al viaje y tiene
`maxInstances: 3`. Si nueve personas empiezan a usar el copiloto en serio, el
tope de verdad sería **un límite de mensajes por persona y día dentro de la
función**. No está hecho.

### La clave del navegador

`Viaje Familia Web Maps Browser Key` permite siete APIs y la app usa dos, y entre
sus referentes hay un `http://localhost:4317,` con una coma pegada y un
`localhost` suelto. Las restricciones por referente se falsifican desde un
servidor en dos líneas, así que **la que protege de verdad es la cuota diaria**.
Recortar la clave sigue pendiente.
