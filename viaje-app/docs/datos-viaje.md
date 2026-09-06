# Datos reales del viaje — septiembre 2026

**Verificado el 2026-09-06** contra confirmaciones en Gmail (revisión previa: 2026-08-25). Esta es la fuente de verdad para el seed de la app nueva.
Los datos que hoy están en `src/data/trip.js` son incompletos y en parte incorrectos: reemplazarlos por esto.

---

## 1. Viajeros (9)

7 adultos + 2 niños. **Coincide exactamente con la reserva de Booking en Madrid** ("7 adultos, 2 niños (4 y 9 años)"), lo que valida la lista.

| # | Nombre completo | Edad | Relación | Rol en la app | Vota |
|---|---|---|---|---|---|
| 1 | Juan Camilo Sarmiento Castillo | 37 | — | `owner` | ✅ |
| 2 | Juliana Andrea Bueno Díaz | 32 | pareja de Camilo | `adult` | ✅ |
| 3 | Guillermo Julián Sarmiento Ramírez | 65 | padre | `adult` | ✅ |
| 4 | Cielo del Socorro Castillo Calvache | 63 | madre | `adult` | ✅ |
| 5 | Juliana Isabel Sarmiento Castillo | 44 | hermana | `adult` | ✅ |
| 6 | Fernando Felipe Muñoz Muñoz | 42 | cuñado | `adult` | ✅ |
| 7 | Julián David Salazar Sarmiento | 18 | sobrino | `adult` | ✅ |
| 8 | Juan Felipe Muñoz Sarmiento | 9 | sobrino | `child` | ❌ |
| 9 | Juan Guillermo Muñoz Sarmiento | 4 | sobrino | `child` | ❌ |

**Los nombres de arriba son los que figuran en la reserva de Vueling MLD57T** (verificados el 6 sept 2026): son los del pasaporte y los que hay que usar en cualquier documento que se enseñe en frontera. Los que había antes aquí eran apodos familiares.

**Notas de modelado**
- Julián David (18) es adulto legal: cuenta como votante y como adulto en reservas.
- Juan Felipe (9) y Juan Guillermo (4) son `travelers` sin cuenta: cuentan para capacidad, entradas, comidas y ritmo del día, pero **nunca aparecen en el denominador de una votación**.
- Tutores: Juliana Sarmiento y Fernando Muñoz son `guardianOf` de Juan Felipe y Juan Guillermo.
- ⚠️ El prompt actual de la app dice "niños de 5 y 9 años". **Es incorrecto: son 4 y 9.** Un niño de 4 años cambia el ritmo de un día entero.
- ⚠️ Los ids actuales de `src/data/trip.js` (`juliana-novia`, `juliancho`, `juanfe`, `guillermo`) deben regenerarse a partir de los nombres reales.

---

## 2. Reservas CONFIRMADAS → van a la línea de tiempo

### Vuelo · 10 sep — Bilbao → Madrid
- **Iberia IB0430**, localizador **PH6PQ**
- BIO 09:15 → MAD T4 10:25 (1h 10m), jueves 10 sep 2026
- Pasajeros: **solo Juan Camilo y Juliana Andrea Bueno** (2 adultos) · 135,06 € · Apple Pay
- Equipaje: mano 10 kg incluido; bodega con coste. Cambios 55 € de penalización, sin reembolso.
- **Solo cubre a 2 de los 9 viajeros.** Los otros 7 llegan en el AV182 (abajo).

### Vuelo · 10 sep — Bogotá → Madrid
- **Avianca AV182**, BOG → MAD **T4** — los **7** viajeros restantes.
- **Llegada 11:10 a T4 — VERIFICADO contra la reserva el 26 de agosto de 2026.**
- La hora que manejamos es la de **aterrizaje**, no la de salida: el vuelo sale de Bogotá la tarde del 9.
- ⚠️ **Aviso para quien venga detrás: no confíes en los rastreadores de vuelos para esto.** El 26 de agosto se consultaron cinco y cuatro daban llegada 08:21–09:05 (Barajas, Airportia, Aviability, Trip.com); solo Flightmapper daba 11:10. Además se contradecían entre ellos sobre qué días opera el vuelo. **La reserva le dio la razón a Flightmapper y a la memoria de Camilo.** La confirmación de Avianca no está en el correo de Camilo — la tiene quien hizo la reserva.
- **Camilo y Juliana aterrizan de Bilbao a las 10:25 en la misma terminal: les esperan ~45 minutos en T4.**
- Misma terminal que el IB0430 (T4): los 9 se pueden encontrar ahí.
- En la app este evento va marcado `horaEs: 'llegada'` y se muestra como «llega 11:10», para que nadie lo lea como hora de salida.

### Alojamiento Madrid · 10–14 sep — CONFIRMADO Y NO REEMBOLSABLE
- **Tríplex Lujo 5 Dorm en Sol · Junto Four Seasons** — Apartamento Dúplex
- Carrera de San Jerónimo 14, 1º C, Centro de Madrid, 28012 Madrid
- Entrada jue **10 sep** 15:00–00:00 · Salida lun **14 sep** 10:30–11:00 · 4 noches
- Reservado para **7 adultos + 2 niños (4 y 9)** — cubre a los 9
- Booking conf. **6263542356** · PIN y licencia: fuera del repo (ver §6)
- Anfitrión **Ahmed** — espera en el alojamiento. Teléfono: fuera del repo (ver §6)
- Precio total **3.058,74 €** (apartamento 3.078 € + limpieza 250 € + servicio 30,78 € − 300,04 € que paga Booking)
- 🔴 **Cancelación gratis venció el 19 ago.** Hoy cancelar cuesta 3.078 €.
- Check-in tardío: +30 € de 20:00 a 22:00; +50 € desde las 22:00 → hay que avisar la hora de llegada.
- Contrato de alquiler firmado antes de la llegada; DNI/pasaporte y tarjeta de crédito al entrar.

### Actividad Madrid · 11 sep 10:30
- **Classic Tour Bernabéu** · compra 104867131 · Av. de Concha Espina
- (Hay dos compras más del mismo tour para el 16 ago — esas ya pasaron, no son de este viaje.)

### F1 · MADRING — Gran Premio de España 2026 · VERIFICADO 6 sept 2026
- **Solo DOS entradas**, no nueve. Compra Fever, **ID 101482511**.
- **Alta Velocidad · Abono 3 días · Sección 3 Bronze 2nd Release.**
- Acceso C2 · Puerta C2 · Fan Zone Barrio · **Grada GC02, fila 16, asientos 51 y 52.**
- Primera sesión **11 sep**; el abono cubre los tres días del fin de semana.
- La entrada está atada a **una Fan Zone concreta**: no se puede pasar a las demás.
- No hay que imprimir nada: se enseña el QR y dan una pulsera que hay que llevar los tres días. El QR vive en la app de Fever/MADRING y **solo abre con la cuenta de correo de la compra**.
- El 4 sept se compró además una **recarga de consumo onsite** (correo aparte de Fever).
- ⚠️ **Dos entradas para nueve personas obliga a decidir quién va y qué hacen los otros siete el 11, 12 y 13.** El Bernabéu del 11 a las 10:30 es de la misma mañana.

### Tren · 14 sep — Madrid → Barcelona · CONFIRMADO
- **OUIGO 06541**, localizador **J6FGQQ** (reserva del 18 de mayo de 2026).
- **Madrid Puerta de Atocha – Almudena Grandes 13:42 → Barcelona Sants 16:44** (3 h 02).
- **Los nueve**, coche 6, tarifa **Esencial**, 245 €.
- Embarque: abre 13:12, **cierra 13:37**. OUIGO cierra cinco minutos antes de salir.
- ⚠️ **Equipaje.** Los nueve viajan con mochila y maleta de cabina, sin nada facturado. **OUIGO mide más estrecho que un avión:** el bulto grande gratis es de **55×35×25** (una maleta de cabina de avión es 55×40×20, cinco centímetros más ancha) y el bulto pequeño gratis es de **27×36×15**, bastante menos que la mochila de 40×30×20 que permite Vueling bajo el asiento. **Sobre el papel las mochilas se pasan.** Merece la pena medir una antes de salir: añadir equipaje en `ventas.ouigo.com` sale desde 5 € por bulto y en el andén son 25 €.
- Encaje: check-out del apartamento de Madrid a las 11:00, embarque a las 13:12. Dos horas para nueve personas y las maletas.

### Alojamiento Barcelona · 14–16 sep — CONFIRMADO Y NO REEMBOLSABLE
- **Sweett — Carrer Sepúlveda** · Booking conf. **5789138276** · ref. Sweett #836499
- **Carrer de Sepúlveda 125, Eixample, 08015 Barcelona**
- **Entrada lunes 14 (16:00–23:00) · Salida miércoles 16 (antes de las 11:00)** · 2 noches
- Reservado para **7 adultos y 2 niños**. Apartamento de 5 dormitorios, 2 baños, 6 camas. Capacidad máxima 9 adultos. Sin parking.
- **756,68 € ya pagados.** No reembolsable, y las fechas no se pueden cambiar.
- ⚠️ **Lo que se paga allí y NO está en esos 756,68 €:** impuesto municipal **146,30 €** (10,45 € por adulto y noche; los dos niños están exentos) y un **depósito por daños de 300 €** con **tarjeta de crédito** a la llegada, devuelto a los 14 días. Hay que llevar tarjeta de crédito, no solo débito.
- ✅ Check-in online **ya hecho** (Camilo, 26 ago).
- Modificada el 26 de agosto: se añadieron los nombres de Julián Sarmiento Ramírez y Juliana Sarmiento Castillo como huéspedes.
- El tren llega a Sants a las 16:44 y la entrada abre a las 16:00: encaja.

### Vuelo · 16 sep — Barcelona → París · CONFIRMADO
- **Vueling VY8002**, localizador **MLD57T** · BCN **15:40** → ORY **17:30**, los **nueve**. 431,91 €.
- ✅ **LA MALETA DE CABINA YA ESTÁ PAGADA** (corregido el 6 sept 2026). El 28 de agosto se añadieron **9 piezas de compartimento superior** (10 kg, 55×40×20) por **405,00 € pagados con PayPal**. Total del vuelo: **836,91 €** (431,91 € el 18 may + 405,00 € el 28 ago).
- Cada pasajero lleva ahora: 1 pieza bajo el asiento 40×30×20 **y** 1 pieza de compartimento superior. Los nueve van nominados uno a uno en la confirmación.
- ⚠️ **Al modificarse la reserva el 28 de agosto hay que rehacer el check-in.** Igual que en el SNF23N.
- ⚠️ Esta entrada estuvo **más de una semana en rojo diciendo lo contrario**. La lección: una reserva modificada genera un correo nuevo que sustituye al anterior; buscar por el localizador, no por la fecha de compra.
- Encaje: salida del piso de Barcelona antes de las 11:00, vuelo a las 15:40. Margen de sobra.

### Alojamiento París · 16–19 sep
- **ibis budget Saint-Maurice** · **252 Rue du Maréchal Leclerc, 94410 Saint-Maurice** · 16 sep → 19 sep
- ℹ️ La reserva vigente es la **segunda**: la primera (5004230210, del 20 may) se canceló gratis el 31 jul y se rehízo el 30 jul/31 jul. La que vale es la de **julio**, modificada el 26 ago.
- 🔴 **EL NÚMERO DE RESERVA DE ESTE HOTEL NO SE ESCRIBE AQUÍ NI EN EL CÓDIGO.** El propio Booking dice: *«Access code at the front door is your booking number without dots»*. **El código del portal ES el número de reserva.** Publicarlo en este repositorio, que es público y publica GitHub Pages, es publicar la llave de la calle. Vive solo en Firestore, detrás de las reglas de pertenencia al viaje, y en el correo.
- Tres noches, **tres habitaciones de tres personas: nueve plazas justas** para los nueve. Entrada desde las 12:00, salida hasta las 12:00. Sin parking.
- **836,31 € pagados.** No reembolsable. Impuesto municipal **54,60 €** aparte (2,60 € por persona y noche), a pagar allí.
- Desayuno 10,90 € por persona y noche; menores de 12, 4,95 €.
- ⚠️ Las literas **no vienen hechas**: dan la ropa de cama y cada uno hace la suya.
- Modificada el 26 de agosto: se añadieron los nombres de los huéspedes de dos habitaciones.
- (Sustituye a dos reservas canceladas el 31 jul.)

### Vuelo · 19 sep — París → Bilbao · CONFIRMADO
- **Vueling VY1463**, localizador **SNF23N** · ORY **07:10** → BIO **08:50**, los **nueve**. 681,44 € (dos pagos: 456,44 € el 18 may y 225,00 € el 15 ago).
- ✅ **Aquí sí está pagada la maleta de cabina**: 9 piezas de compartimento superior (máx 10 kg, 55×40×20) por 225 €, más la pieza bajo el asiento de 40×30×20. Seguro xcover contratado.
- ⚠️ **La madrugada más dura del viaje.** Mostradores cierran a las **06:30**, embarque a las **06:50**. Desde el ibis de Saint-Maurice hay que salir sobre las **05:00** con nueve personas y dos niños. El traslado a Orly a esa hora hay que dejarlo cerrado, no improvisado.
- ⚠️ Reserva modificada el 15 de agosto: **hay que rehacer el check-in**.

### Alojamiento Bilbao/Derio · 9–10 sep — CONFIRMADO (nuevo, 31 ago) · SOLO CAMILO Y JULIANA
- **Hotel The Park Derio** · Booking conf. **5379605297** · Habitación Doble, **2 adultos**, 1 noche
- **Polígono Parque Tecnológico, Edificio 806, 48160 Derio** · Tel. +34 946469022
- Entrada mié 9 sep (15:00–00:00) · Salida jue 10 sep (07:30–12:00) · **100,80 €**
- 🔴 **Cancelación gratis solo hasta el 7 sept 23:59.** A partir del 8 se paga entero.
- Encaja con el IB0430 de las 09:15 desde Bilbao: se duerme al lado del aeropuerto en vez de madrugar desde Guardo.
- **No forma parte del dosier de migración**: los dos viajeros ya residen en España.

### Alojamiento Santander · 19–20 sep — CONFIRMADO (nuevo, 26 ago)
- **ibis Styles Santander** · **Av. de Parayas 2A, 39011 Santander** · Booking conf. **5931295674** · 1 noche
- **Entrada aprobada por el hotel entre las 19:00 y las 20:00.**
- Desde Guardo: 164 km, 1 h 53 min.

### Del 20 al 22 sep — Guardo (Palencia) · casa de Camilo
- **Casa propia, sin coste de alojamiento.** Camilo lo propuso el 26 de agosto; falta confirmar cuántos caben a dormir.
- Santander → Guardo: **164 km, 1 h 53 min** en coche (medido con la Routes API el 26 ago).
- Guardo → Madrid-Barajas T4: **364 km, 3 h 35 min**. Guardo → estación de Palencia: 94 km, 1 h 10 min.

### Alojamiento Madrid · 22–23 sep — CONFIRMADO (nuevo, 30 ago; modificado 5 sept)
- **Aparment Almudena** · Apartamento de 3 dormitorios · Booking conf. **6520187782**
- **Calle de San Emilio 62, Ciudad Lineal, 28017 Madrid**
- **Entrada mar 22 sep (15:00–22:00) · Salida mié 23 sep (05:00–11:30)** · 1 noche
- Reservado para **7 adultos + 2 niños (4 y 9)** — cubre a los nueve
- **261,50 €** (146,82 € + IVA 14,68 € + limpieza 100 €). **Cancelación gratis hasta el 19 sep 23:59**; a partir del 20 se paga entero.
- Teléfono del alojamiento: +34 615313958. Licencia B87814935.
- ⚠️ **No admiten llegadas después de las 00:00.** Recargo de 30 € (22:00–23:00) y 50 € (23:00–00:00).
- ⚠️ Posible cargo de hasta 450 € por daños después del check-out.
- ✅ **Esto cierra el que era el hueco más urgente del viaje.** La salida desde las 05:00 encaja con estar en T4 a las 07:40 para el AV027 de las 09:40.
- El 5 de septiembre llegó un correo de reserva modificada y otro de pago realizado: **queda por verificar qué cambió exactamente.**

### Coches — RESERVA ENCONTRADA EL 6 SEPT 2026 EN BOOKING
Esta reserva **no estaba en ningún documento del proyecto**. Apareció al abrir «Mis viajes» en Booking: el viaje tiene **7 reservas**, no 6.

- **Avis · Renault Austral o similar · ref. 786766762 · 186,00 €** (alquiler 145,78 € + extras)
- Categoría *Intermediate Elite SUV*: automática, 4 puertas, aire acondicionado, kilometraje ilimitado.
- **Recogida sáb 19 sep 08:30 en Bilbao Aeropuerto** (mostrador en terminal) · **devolución mié 23 sep 06:00 en Madrid Aeropuerto.** 4 días. El recargo por devolución en otra provincia ya va incluido.
- **Conductor principal: Guillermo Julián Sarmiento Ramírez** (el padre, 65 años). Teléfono de contacto +34 634254325.
- Cobertura Premium de Booking incluida.
- El otro coche es el de Camilo, en el Parking Bajo Coste de Aena Bilbao desde el 10 de septiembre.

🟢 **Resuelto el 6 sept, según Camilo.** Los dos coches son **Renault Austral**: el de alquiler y el suyo propio. Diez plazas para nueve personas.

🟢 **El equipaje no es el problema que este documento decía.** Los siete viajan con **maleta de cabina de 10 kg y mochila**, no con maletas de catorce días. Nueve trolleys de cabina y nueve mochilas reparten bien en dos maleteros de Austral. La advertencia anterior partía de un supuesto equivocado.

🟠 **El conductor: hay plan B, pero faltan dos conductores, no uno.** Si el permiso colombiano del padre no le vale a Avis, **Camilo alquila el coche a su nombre** (tiene permiso español). Pero entonces **alguien tiene que conducir el otro Austral**: dos coches necesitan dos conductores legales. Si Camilo se pone al volante del alquilado, el suyo se queda parado salvo que otra persona del grupo pueda conducir en España.
- **Acción concreta antes del 19:** cambiar el conductor principal en la reserva **desde la web de Booking**, no en el mostrador. Añadir o sustituir conductor sobre la marcha suele llevar recargo y no siempre se puede.
- El vale sigue con la lista de comprobación en **0 de 4**: merece la pena repasarla antes de viajar.

🟠 **Sigue sin constar silla infantil.** Juan Guillermo tiene 4 años y en España el sistema de retención es obligatorio **en los dos coches**, no solo en el alquilado.

### Vuelo · 23 sep — vuelta a Bogotá
- **Avianca AV027**, Madrid **T4 → Bogotá**, salida **09:40** — verificado contra la reserva el 26 de agosto de 2026.
- Los **7** viajeros que llegaron en el AV182. Camilo y Juliana se quedan.
- En T4 a las **07:40**: vuelo internacional y siete personas con maletas.

### Titulares de las reservas de alojamiento (verificado 6 sept 2026)
Las reservas de Booking están **todas a nombre de Juan Camilo Sarmiento Castillo**, salvo dos que se cambiaron a propósito para que en frontera figure un viajero de los siete:
- **Madrid Sol (6263542356)**, cambiada el 26 ago: huéspedes *Juan Camilo Sarmiento castillo, Julián Sarmiento Ramírez, Juliana Sarmiento Castillo*.
- **Aparment Almudena (6520187782)**, cambiada el 5 sept: titular *Guillermo Julián Sarmiento, Juliana Isabel Sarmiento Castillo*; huéspedes 8 → 9.

Las otras cuatro (Sweett, ibis Saint-Maurice, ibis Styles Santander, The Park Derio) siguen solo a nombre de Camilo.

### Modificaciones del 26 de agosto
Tres reservas se actualizaron esa madrugada (Madrid, Barcelona, París). La de Madrid, verificada: **solo se añadieron nombres de huéspedes** (Julián Sarmiento Ramírez y Juliana Sarmiento Castillo). **Las fechas y el precio no cambiaron.** Las otras dos, sin verificar en detalle.

### Parking
- **Aena Bilbao — Parking Bajo Coste**, reserva del 15 ago (para dejar el coche en la salida del 10 sep).
- Hay además una reserva Aena Madrid-Barajas T1 P1 modificada el 12 ago → **verificar si es de este viaje o del anterior.**

---

## 3. Reserva cancelada (no confundir)
- **Duke 5torres Apartments**, Madrid, conf. 6293875179 — **cancelada el 11 ago** por tarjeta inválida. Fue sustituida por el Tríplex de Sol.

---

## 4. Huecos abiertos → van a Decisiones

**Revisado el 6 de septiembre de 2026. Cerrados desde el 25 de agosto:** el detalle de las entradas de F1 (son 2, abono 3 días), quién viaja en el tramo post-Madrid (los nueve, nominados en MLD57T y SNF23N), las fechas de Barcelona, el tren del 14, el check-in de Sweett y la noche del 22 en Madrid.

**Lo que sigue abierto:**

1. 🟠 **Noches del 20 y 21 de septiembre: Guardo, casa de Camilo.** Siguen siendo las dos únicas noches de las trece sin reserva comercial, pero **ya no van desnudas**: el 6 de septiembre se añadió al dosier el **volante de empadronamiento individual del Ayuntamiento de Guardo** (expedido el 8 jun 2026, hoja padronal 936), que acredita el domicilio de Camilo ante el padrón municipal. Está en `docs-privados/anexo-01-empadronamiento-Guardo.pdf` y el dosier lo cita.
   **Lo que sigue sin haber es la carta de invitación** ante la Policía Nacional, que es el instrumento que la normativa prevé específicamente para alojamiento en vivienda particular y tarda semanas. El empadronamiento acredita *dónde vive el anfitrión*, no una invitación formalizada. El dosier lo dice con esas palabras: no conviene venderlo como algo que no es.
   ⚠️ El volante lleva fecha de **8 de junio**: tres meses. Si algún trámite lo quiere reciente, se saca uno nuevo en la sede electrónica del Ayuntamiento antes del día 10.
2. 🟢 **Avianca: resuelto.** La confirmación del AV182 y del AV027 **la tienen los propios viajeros** (confirmado por Camilo el 6 sept). No está en el correo de Camilo y no hace falta que esté. Que cada uno la lleve encima, impresa o en el móvil.
3. **Segundo conductor para el segundo Austral.** Ver la sección de Coches: dos coches, dos conductores legales.
4. **Quién de los nueve usa las dos entradas de F1** y qué hacen los otros siete el 11, 12 y 13.
5. **Hora de llegada al apartamento de Sol** — el check-in tardío cuesta 30–50 €.
6. **Contrato de alquiler de Sol firmado** antes del 10 sep.
7. Comidas, actividades y reparto de gastos: sin decidir.

---

## 5 bis. 🔒 Política de secretos — IMPORTANTE

**Este repositorio tiene remoto en `github.com/nobscamilo/Viaje-familia-sept` y publica GitHub Pages desde él.** Trátalo como público.

**Añadido el 6 sept 2026:** existe `../docs-privados/` en la raíz del proyecto (fuera de `viaje-app/`), **ya en `.gitignore`**. Contiene el dosier de migración, los siete justificantes en PDF (`reserva-01` a `reserva-07`), el `anexo-01` con el empadronamiento y `fuentes-html/` con los originales de los que salieron.

🔴 **El dosier lleva ahora el NIE, el teléfono y el domicilio de Camilo**, porque el agente de fronteras los va a pedir al ser el anfitrión de las dos noches en Guardo. **Nada de eso se escribe en este repositorio**, que es público: vive solo en `docs-privados/`, que está en `.gitignore`. Ahí vive `Dosier-reservas-migracion-sept-2026.pdf`: nombres completos de los nueve, direcciones de los seis alojamientos, y el número de reserva del ibis Saint-Maurice, **que es el código del portal**. Ese PDF no se sube nunca. Si se añade cualquier otro documento familiar, va ahí.

Por eso, de este documento se han quitado deliberadamente:
- Los **PIN de Booking** (sirven para modificar o cancelar una reserva: son credenciales, no datos).
- El **teléfono personal del anfitrión** Ahmed.
- El **enlace personal de check-in** de Sweett (es un token de acceso disfrazado de URL).
- El **localizador del parking**.

Los localizadores de vuelo y los números de confirmación se quedan porque, sin apellido y sin PIN, no abren nada. Aun así, la regla del proyecto es:

> **Ningún dato que sirva para modificar una reserva va en el repositorio.** Vive en Firestore, protegido por reglas de pertenencia al viaje, o en el gestor de contraseñas de Camilo.

⚠️ **Pendiente de revisar por Camilo:** si alguna versión anterior de estos archivos ya se subió a GitHub con los PIN dentro, borrarlos del archivo no basta — quedan en el historial de git. Revisar antes del próximo `push`.

## 5. Canales de notificación disponibles (confirmado por el correo)
Camilo ya usa **Google Calendar** para eventos de viaje (recibe avisos de vuelos y del tour del Bernabéu). Un calendario compartido del viaje da notificaciones nativas y fiables en todos los móviles sin construir nada. Ver la sección de notificaciones en `reinvencion.md`.


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
