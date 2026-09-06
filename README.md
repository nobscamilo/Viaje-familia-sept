# Viaje Septiembre 2026

Nueve personas, del 10 al 23 de septiembre de 2026: Madrid (con el fin de
semana de F1 en IFEMA), Barcelona, París y el norte de España.

## Dónde está el proyecto

**`viaje-app/`** — la aplicación. React 19 + Vite + Firebase, desplegada en
<https://viaje-familia-sept-2026.web.app>. Todo lo que haya que hacer se hace
ahí; empieza por `viaje-app/README.md`.

**En esta carpeta ya no hay nada más.** El proyecto anterior
(`firebase-family-app/`) se movió el 31 de agosto de 2026 a la carpeta hermana
**`Viaje sept - archivo/`**, con todo lo que arrastraba: el workflow de GitHub
Pages —que llevaba días roto, porque ejecutaba archivos borrados—, el script de
Leaflet, `.nojekyll` y el `.docx` de alojamiento. Los dos documentos que seguían
sirviendo, `reinvencion.md` y `datos-viaje.md`, están ahora en
`viaje-app/docs/`.

*Este archivo describía hasta el 28 de agosto de 2026 un generador estático
(`generar_alojamiento.js`) y una página en GitHub Pages que ya no existen.*

## Las cuentas

La app lleva las cuentas del viaje (pestaña **Cuentas**): reparto entre los
siete adultos, saldo por subfamilia y quién le debe a quién. A 28 de agosto
hay **6.710,44 € ya pagados** (todos los pagadores verificados contra su correo), y el saldo es:

| Subfamilia | Ha puesto | Le toca | Saldo |
| --- | ---: | ---: | ---: |
| Julián, Cielo y Julián David | 5.785,08 € | 2.818,04 € | **+2.967,04 €** |
| Camilo y Juliana | 925,36 € | 2.013,75 € | −1.088,39 € |
| Juliana y Fernando | 0,00 € | 1.878,65 € | −1.878,65 € |

Julián David está en la casa de sus abuelos desde el 30 de agosto: su abuelo
cubre sus gastos. Las casas son bolsillos, no domicilios.

Faltan por meter los vuelos de Bogotá (de los papás y de la familia de la
hermana) porque no se conoce el importe. La F1 está fuera a propósito.

## Qué sabe hacer el copiloto (al 30 de agosto)

Busca sitios reales en Google Maps **ordenados por nota ponderada por número de
reseñas** —no por la nota a secas, que premia al de siete opiniones—, calcula
trayectos para el día y la hora del viaje, apunta y ordena gastos, deja
decisiones y elecciones para votar, y **arma rutas de turismo**: le dices las
paradas y él busca cada sitio, mira si abre a esa hora, calcula lo que se tarda
de una a otra y deja el día montado en la agenda como propuesta, avisando de lo
que está cerrado o de lo que pisa algo ya reservado. Todo entra **propuesto**:
la IA nunca confirma nada.

En el mapa se ve el recorrido de cada ruta unido en orden, y los sitios que
sugiere aparecen en un mini mapa antes de agregarlos. Desde «Ahora» se puede
**editar** (título, día, hora, sitio) y quitar cualquier plan que haya puesto
una persona y siga sin confirmar; una ruta se quita entera de un toque.

## Lo urgente del viaje, no de la app

- ✅ Las nueve piezas de cabina del MLD57T (Barcelona → París) se pagaron el
  28 de agosto: **405 €** por PayPal. En puerta habrían sido hasta 675 €.
  **Hay que rehacer el check-in**, porque modificar la reserva invalida las
  tarjetas de embarque.
- ✅ **La noche del 22 en Madrid está reservada** (30 de agosto): *Aparment
  Almudena*, Calle de San Emilio 62, Ciudad Lineal. Una noche, 3 dormitorios
  para los nueve, **261,50 €** — de los que 100 € son limpieza. Entrada de
  15:00 a 22:00, salida de 05:00 a 11:30. **Aún no está cobrado**: Booking
  carga la tarjeta automáticamente, así que no está en Cuentas hasta que se
  sepa de qué tarjeta sale.
  - **No dejan entrar después de medianoche** y desde las 22:00 hay recargo
    (30 € hasta las 23:00, 50 € después). Desde Guardo son **3 h 56 min**
    medidos con tráfico: salir a las 15:00.
  - De Ciudad Lineal a T4 son **20 min en coche** pero **1 h 2 min en
    transporte público**. Hay que saber si el coche de alquiler sigue
    disponible la mañana del 23, o el margen para estar a las 07:40 se come
    la diferencia.
  - Cancelación gratis solo hasta el **19 de septiembre**; desde el 20 cuesta
    161,50 €.
- 🔴 **El coche de alquiler tiene que ser de siete plazas.** Nueve personas y
  nueve maletas de cabina no caben en dos turismos. Ojo al recargo por
  recogerlo en Bilbao y devolverlo en Madrid.
- Rehacer el check-in de **MLD57T a partir del 9 de septiembre** y de
  **SNF23N a partir del 12**: se abre 7 días antes de cada vuelo, y las dos
  reservas se modificaron al añadir maletas.
- Cerrar el traslado a Orly de madrugada el 19 (salida sobre las 05:00).
- El tour del Bernabéu del 11 choca con el viernes de F1.


### Revisión del 6 de septiembre de 2026

Se revisó el copiloto sin modificar código, datos del viaje ni configuración.
Hallazgos y validación en [viaje-app/README.md](viaje-app/README.md), sección «Revisión del copiloto —
6 de septiembre de 2026». Las mejoras allí enumeradas siguen pendientes;
esta revisión no acredita el servicio autenticado ni un nuevo despliegue.
