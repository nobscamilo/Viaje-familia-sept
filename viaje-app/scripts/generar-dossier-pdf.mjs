import { writeFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { resolve } from 'node:path'

const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Dossier de Viaje Familiar · Septiembre 2026</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

    @page {
      size: A4 portrait;
      margin: 14mm 14mm 16mm 14mm;
      @bottom-right {
        content: counter(page);
        font-family: 'JetBrains Mono', monospace;
        font-size: 8pt;
        color: #888;
      }
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      color: #1e293b;
      background: #ffffff;
      font-size: 9.5pt;
      line-height: 1.45;
    }

    .page-break { page-break-after: always; }
    .avoid-break { page-break-inside: avoid; }

    /* Estilos de Portada */
    .cover {
      height: 255mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 20mm 15mm;
      background: linear-gradient(145deg, #1e3246 0%, #152332 50%, #0d1620 100%);
      color: #ffffff;
      border-radius: 8mm;
      position: relative;
      overflow: hidden;
    }

    .cover::after {
      content: '';
      position: absolute;
      top: -10%;
      right: -10%;
      width: 350px;
      height: 350px;
      background: radial-gradient(circle, rgba(200, 90, 50, 0.35) 0%, transparent 70%);
      border-radius: 50%;
      pointer-events: none;
    }

    .badge-gold {
      display: inline-block;
      align-self: flex-start;
      background: rgba(212, 163, 89, 0.18);
      border: 1px solid rgba(212, 163, 89, 0.4);
      color: #e5b869;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      font-weight: 600;
      letter-spacing: 2px;
      text-transform: uppercase;
      padding: 6px 14px;
      border-radius: 20px;
    }

    .cover-title {
      font-family: 'Cinzel', serif;
      font-size: 34pt;
      line-height: 1.1;
      font-weight: 700;
      color: #f8fafc;
      letter-spacing: 1px;
      margin-top: 15px;
    }

    .cover-sub {
      font-size: 13pt;
      color: #cbd5e1;
      margin-top: 12px;
      font-weight: 400;
      max-width: 520px;
    }

    .cities-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 20px;
    }

    .city-pill {
      background: rgba(255, 255, 255, 0.1);
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #ffffff;
      font-size: 9pt;
      font-weight: 500;
      padding: 4px 12px;
      border-radius: 12px;
    }

    .cover-footer {
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      padding-top: 18px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }

    .cover-stat-label {
      font-size: 7.5pt;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #94a3b8;
      font-family: 'JetBrains Mono', monospace;
    }

    .cover-stat-value {
      font-size: 12pt;
      font-weight: 700;
      color: #f1f5f9;
      margin-top: 3px;
    }

    /* Encabezados interiores */
    .section-header {
      border-bottom: 2px solid #c85a32;
      padding-bottom: 6px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .section-title {
      font-family: 'Cinzel', serif;
      font-size: 16pt;
      font-weight: 700;
      color: #1e3246;
    }

    .section-tag {
      font-family: 'JetBrains Mono', monospace;
      font-size: 8pt;
      color: #c85a32;
      font-weight: 600;
    }

    /* Tablas elegantes */
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 8.5pt;
    }

    th {
      background: #f1f5f9;
      color: #334155;
      font-weight: 700;
      text-align: left;
      padding: 7px 10px;
      border: 1px solid #e2e8f0;
      font-size: 8pt;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    td {
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }

    tr:nth-child(even) td {
      background: #f8fafc;
    }

    .tag-status {
      display: inline-block;
      font-size: 7pt;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 6px;
      text-transform: uppercase;
      font-family: 'JetBrains Mono', monospace;
    }

    .tag-conf { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
    .tag-prop { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }

    /* Cajas de alerta y consejos */
    .callout {
      background: #fff8f5;
      border-left: 3.5px solid #c85a32;
      padding: 10px 14px;
      border-radius: 0 8px 8px 0;
      margin: 12px 0 16px 0;
      font-size: 8.8pt;
    }

    .callout-title {
      font-weight: 700;
      color: #9f3c16;
      margin-bottom: 3px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Tarjetas de día a día */
    .day-card {
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 14px;
      margin-bottom: 12px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }

    .day-header {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1px solid #f1f5f9;
      padding-bottom: 5px;
      margin-bottom: 8px;
    }

    .day-badge {
      background: #1e3246;
      color: #ffffff;
      font-weight: 700;
      font-size: 8pt;
      padding: 2px 8px;
      border-radius: 4px;
      font-family: 'JetBrains Mono', monospace;
    }

    .day-city {
      font-weight: 700;
      color: #c85a32;
      font-size: 10pt;
    }

    .day-desc {
      font-weight: 600;
      color: #0f172a;
      font-size: 9.5pt;
      margin-bottom: 6px;
    }

    .event-line {
      display: flex;
      gap: 8px;
      margin-bottom: 5px;
      font-size: 8.5pt;
      line-height: 1.35;
    }

    .event-time {
      font-family: 'JetBrains Mono', monospace;
      font-weight: 600;
      color: #64748b;
      min-width: 50px;
    }

    .event-title {
      font-weight: 600;
      color: #1e293b;
    }

    .event-detail {
      color: #475569;
      font-size: 8pt;
    }

    .travelers-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
      margin-bottom: 16px;
    }

    .traveler-box {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 8px 10px;
      border-radius: 6px;
    }

    .traveler-name {
      font-weight: 700;
      color: #1e293b;
      font-size: 8.8pt;
    }

    .traveler-role {
      font-size: 7.5pt;
      color: #64748b;
      font-family: 'JetBrains Mono', monospace;
    }
  </style>
</head>
<body>

  <!-- PORTADA -->
  <div class="cover">
    <div>
      <div class="badge-gold">Dossier Familiar Oficial · Edición 2026</div>
      <h1 class="cover-title">Viaje a Europa en Familia</h1>
      <p class="cover-sub">Itinerario completo, reservas, logística y guía paso a paso para los 9 viajeros.</p>
      
      <div class="cities-pills">
        <span class="city-pill">📍 Madrid</span>
        <span class="city-pill">📍 Barcelona</span>
        <span class="city-pill">📍 París & Eurodisney</span>
        <span class="city-pill">📍 Bilbao</span>
        <span class="city-pill">📍 Santander</span>
        <span class="city-pill">📍 Montaña Palentina</span>
        <span class="city-pill">📍 Segovia</span>
      </div>
    </div>

    <div>
      <div class="callout" style="background: rgba(255,255,255,0.08); border-color: #d4a359; color: #e2e8f0; margin-bottom: 24px;">
        <div class="callout-title" style="color: #e5b869;">✨ Un viaje pensado para todos</div>
        Diseñado con ritmo equilibrado: descanso y accesibilidad para los abuelos (63 y 65 años) y magia, naturaleza y espacios abiertos para los niños (4 y 9 años).
      </div>

      <div class="cover-footer">
        <div>
          <div class="cover-stat-label">Fechas del viaje</div>
          <div class="cover-stat-value">10 – 23 Sep 2026</div>
        </div>
        <div>
          <div class="cover-stat-label">Viajeros</div>
          <div class="cover-stat-value">9 Personas (7 adultos + 2 niños)</div>
        </div>
        <div>
          <div class="cover-stat-label">Equipaje por persona</div>
          <div class="cover-stat-value">10 kg Cabina + Mochila</div>
        </div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- PÁGINA 2: LOS VIAJEROS Y ALOJAMIENTOS -->
  <div class="section-header">
    <h2 class="section-title">1. El Grupo y los Alojamientos</h2>
    <span class="section-tag">Logística Base</span>
  </div>

  <h3 style="font-size: 10pt; font-weight: 700; color: #1e3246; margin-bottom: 8px;">Nuestros 9 Viajeros</h3>
  <div class="travelers-grid">
    <div class="traveler-box">
      <div class="traveler-name">Juan Camilo Sarmiento</div>
      <div class="traveler-role">37 años · Coordinador</div>
    </div>
    <div class="traveler-box">
      <div class="traveler-name">Juliana Andrea Bueno</div>
      <div class="traveler-role">32 años · Adulto</div>
    </div>
    <div class="traveler-box">
      <div class="traveler-name">Guillermo Julián Sarmiento</div>
      <div class="traveler-role">65 años · Papá / Abuelo</div>
    </div>
    <div class="traveler-box">
      <div class="traveler-name">Cielo del Socorro Castillo</div>
      <div class="traveler-role">63 años · Mamá / Abuela</div>
    </div>
    <div class="traveler-box">
      <div class="traveler-name">Juliana Isabel Sarmiento</div>
      <div class="traveler-role">44 años · Hermana / Mamá</div>
    </div>
    <div class="traveler-box">
      <div class="traveler-name">Fernando Felipe Muñoz</div>
      <div class="traveler-role">42 años · Cuñado / Papá</div>
    </div>
    <div class="traveler-box">
      <div class="traveler-name">Julián David Salazar</div>
      <div class="traveler-role">18 años · Adulto</div>
    </div>
    <div class="traveler-box">
      <div class="traveler-name">Juan Felipe Muñoz</div>
      <div class="traveler-role">9 años · Niño viajero</div>
    </div>
    <div class="traveler-box">
      <div class="traveler-name">Juan Guillermo Muñoz</div>
      <div class="traveler-role">4 años · Niño viajero</div>
    </div>
  </div>

  <h3 style="font-size: 10pt; font-weight: 700; color: #1e3246; margin-bottom: 8px;">Alojamientos Confirmados</h3>
  <table>
    <thead>
      <tr>
        <th>Fechas</th>
        <th>Ciudad / Destino</th>
        <th>Alojamiento y Dirección</th>
        <th>Detalles Clave</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>10–14 sep</strong><br>(4 noches)</td>
        <td><strong>Madrid</strong></td>
        <td><strong>Tríplex Lujo 5 Dorm · Sol</strong><br>Carrera de San Jerónimo 14, 1º C</td>
        <td>A 100m de Puerta del Sol. Dúplex con 5 dormitorios para los 9. Check-in 15:00.</td>
        <td><span class="tag-status tag-conf">Confirmado</span></td>
      </tr>
      <tr>
        <td><strong>14–16 sep</strong><br>(2 noches)</td>
        <td><strong>Barcelona</strong></td>
        <td><strong>Sweett · Carrer Sepúlveda</strong><br>Carrer de Sepúlveda 125, Eixample</td>
        <td>Piso de 5 dormitorios, 2 baños. Check-in online hecho. A 15 min de Sants.</td>
        <td><span class="tag-status tag-conf">Confirmado</span></td>
      </tr>
      <tr>
        <td><strong>16–19 sep</strong><br>(3 noches)</td>
        <td><strong>París</strong></td>
        <td><strong>ibis budget Saint-Maurice</strong><br>252 Rue du Maréchal Leclerc</td>
        <td>3 habitaciones de 3 personas. Metro línea 8 y RER A cerca hacia Disney.</td>
        <td><span class="tag-status tag-conf">Confirmado</span></td>
      </tr>
      <tr>
        <td><strong>19–20 sep</strong><br>(1 noche)</td>
        <td><strong>Santander</strong></td>
        <td><strong>ibis Styles Santander</strong><br>Av. de Parayas 2A</td>
        <td>Entrada aprobada entre 19:00 y 20:00. Cómodo para descansar tras Bilbao.</td>
        <td><span class="tag-status tag-conf">Confirmado</span></td>
      </tr>
      <tr>
        <td><strong>20–22 sep</strong><br>(2 noches)</td>
        <td><strong>Montaña Palentina</strong></td>
        <td><strong>Casa Rural Del Valle Estrecho</strong><br>San Martín de los Herreros / Cervera</td>
        <td>Casa rural completa en pleno Parque Natural. Aire puro, chimenea y relax familiar.</td>
        <td><span class="tag-status tag-prop">Propuesto</span></td>
      </tr>
      <tr>
        <td><strong>22–23 sep</strong><br>(1 noche)</td>
        <td><strong>Madrid</strong></td>
        <td><strong>Apartment Almudena</strong><br>Calle de San Emilio 62, Ciudad Lineal</td>
        <td>3 dormitorios para los 9. Salida rápida hacia Barajas T4 la mañana del 23.</td>
        <td><span class="tag-status tag-conf">Confirmado</span></td>
      </tr>
    </tbody>
  </table>

  <div class="callout">
    <div class="callout-title">💡 Estrategia de Ropa y Lavandería</div>
    Los apartamentos de Madrid (10–14 sep), Barcelona (14–16 sep) y la casa en Montaña Palentina cuentan con lavadora. La regla de oro para no sobrecargar las maletas de 10 kg es <strong>empacar para 6–7 días</strong> y lavar a mitad de viaje.
  </div>

  <div class="page-break"></div>

  <!-- PÁGINA 3: TRANSPORTE Y EQUIPAJE -->
  <div class="section-header">
    <h2 class="section-title">2. Vuelos, Trenes y Equipaje</h2>
    <span class="section-tag">Normativa y Horarios</span>
  </div>

  <h3 style="font-size: 10pt; font-weight: 700; color: #1e3246; margin-bottom: 8px;">Tabla de Conexiones Principales</h3>
  <table>
    <thead>
      <tr>
        <th>Fecha y Hora</th>
        <th>Ruta</th>
        <th>Operador y Vuelo / Tren</th>
        <th>Notas de Embarque</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>10 sep · 09:15 → 10:25</strong></td>
        <td>Bilbao → Madrid (T4)</td>
        <td>Iberia IB0430 (Loc: PH6PQ)</td>
        <td>Viajan Camilo y Juliana Bueno. Esperan al resto en T4.</td>
      </tr>
      <tr>
        <td><strong>10 sep · 11:10</strong></td>
        <td>Bogotá → Madrid (T4)</td>
        <td>Avianca AV182</td>
        <td>Llegada de los 7 viajeros restantes. ¡Punto de encuentro en T4!</td>
      </tr>
      <tr>
        <td><strong>14 sep · 13:42 → 16:44</strong></td>
        <td>Madrid Atocha → Barcelona Sants</td>
        <td>Tren OUIGO 06541 (Loc: J6FGQQ)</td>
        <td>Coche 6, los nueve juntos. <strong>El embarque cierra 13:37 (no espera).</strong></td>
      </tr>
      <tr>
        <td><strong>16 sep · 15:40 → 17:30</strong></td>
        <td>Barcelona → París Orly</td>
        <td>Vueling VY8002 (Loc: MLD57T)</td>
        <td>9 maletas de cabina pagadas. Estar en El Prat a las 13:30.</td>
      </tr>
      <tr>
        <td><strong>19 sep · 07:10 → 08:50</strong></td>
        <td>París Orly → Bilbao</td>
        <td>Vueling VY1463 (Loc: SNF23N)</td>
        <td><strong>Madrugón:</strong> salir del hotel a las 05:00 AM. Mostrador cierra 06:30.</td>
      </tr>
      <tr>
        <td><strong>19–22 sep</strong></td>
        <td>Bilbao → Santander → Palencia → Madrid</td>
        <td>Coches de alquiler (Recogida Bilbao / Entrega Madrid)</td>
        <td>Vehículos cómodos para los 9 y las maletas. Devolución el 22 en Madrid.</td>
      </tr>
      <tr>
        <td><strong>23 sep · 09:40</strong></td>
        <td>Madrid (T4) → Bogotá</td>
        <td>Avianca AV027</td>
        <td>Regreso de los 7 viajeros a Colombia. Estar en T4 a las 07:40.</td>
      </tr>
    </tbody>
  </table>

  <div class="callout" style="border-color: #d97706; background: #fffbeb;">
    <div class="callout-title" style="color: #b45309;">⚠️ Atención Crítica: Medidas de Equipaje</div>
    <ul style="margin-left: 15px; margin-top: 4px; font-size: 8.5pt;">
      <li><strong>En aviones (Vueling / Iberia / Avianca):</strong> 1 maleta de cabina (máx. 10 kg, 55×40×20 cm) + 1 bulto personal bajo el asiento (mochila o bolso 40×30×20 cm).</li>
      <li><strong>En el tren OUIGO (14 sep):</strong> El bulto grande gratuito mide <strong>55×35×25 cm</strong> (5 cm más estrecho de ancho que una maleta de avión). <em>Consejo: no lleves la maleta abombada a reventar para que entre sin forcejeos.</em></li>
      <li><strong>Baterías portátiles (Powerbanks):</strong> Deben viajar OBLIGATORIAMENTE en la mochila de mano, nunca facturadas.</li>
    </ul>
  </div>

  <div class="page-break"></div>

  <!-- PÁGINA 4: ITINERARIO DÍA A DÍA (MADRID & BARCELONA) -->
  <div class="section-header">
    <h2 class="section-title">3. Itinerario: Madrid y Barcelona</h2>
    <span class="section-tag">Días 1 a 7</span>
  </div>

  <div class="day-card">
    <div class="day-header">
      <span class="day-badge">Día 1 · Jue 10 Sep</span>
      <span class="day-city">Madrid</span>
    </div>
    <div class="day-desc">Encuentro familiar en Barajas T4 e instalación en el centro</div>
    <div class="event-line">
      <span class="event-time">11:10</span>
      <div>
        <span class="event-title">Aterrizaje en Madrid-Barajas T4</span>
        <div class="event-detail">Encuentro de los 9 en la terminal. Traslado en taxi o transporte al apartamento de Sol.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">15:00</span>
      <div>
        <span class="event-title">Check-in Tríplex en Sol</span>
        <div class="event-detail">Desempacar, descansar del vuelo y primer paseo suave por la Puerta del Sol y Plaza Mayor.</div>
      </div>
    </div>
  </div>

  <div class="day-card">
    <div class="day-header">
      <span class="day-badge">Día 2 · Vie 11 Sep</span>
      <span class="day-city">Madrid</span>
    </div>
    <div class="day-desc">F1 en IFEMA y Tour Bernabéu</div>
    <div class="event-line">
      <span class="event-time">09:55</span>
      <div>
        <span class="event-title">MADRING F1 (Camilo, Juliana B., Fernando)</span>
        <div class="event-detail">Entrenamientos libres en el Circuito de IFEMA.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">10:30</span>
      <div>
        <span class="event-title">Classic Tour Bernabéu (Familia sin F1)</span>
        <div class="event-detail">Visita al estadio del Real Madrid, trofeos y museo interactivo (ideal para niños).</div>
      </div>
    </div>
  </div>

  <div class="day-card">
    <div class="day-header">
      <span class="day-badge">Día 3 · Sáb 12 Sep</span>
      <span class="day-city">Madrid</span>
    </div>
    <div class="day-desc">Madrid Monumental y Clasificación F1</div>
    <div class="event-line">
      <span class="event-time">10:00</span>
      <div>
        <span class="event-title">Paseo Centro Histórico: Palacio Real y Plaza de Oriente</span>
        <div class="event-detail">Jardines de Sabatini y atardecer en el Templo de Debod para toda la familia.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">16:00</span>
      <div>
        <span class="event-title">MADRING F1 · Clasificación Oficial</span>
        <div class="event-detail">Sesión de clasificación en IFEMA. Noche libre para cenar todos juntos.</div>
      </div>
    </div>
  </div>

  <div class="day-card">
    <div class="day-header">
      <span class="day-badge">Día 4 · Dom 13 Sep</span>
      <span class="day-city">Madrid</span>
    </div>
    <div class="day-desc">Parque del Retiro y Gran Premio de España F1</div>
    <div class="event-line">
      <span class="event-time">10:30</span>
      <div>
        <span class="event-title">Paseo y barquitas en el Parque del Retiro</span>
        <div class="event-detail">Palacio de Cristal, sombra y diversión tranquila para los abuelos y los niños.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">15:00</span>
      <div>
        <span class="event-title">MADRING F1 · ¡LA CARRERA!</span>
        <div class="event-detail">Gran Premio de Fórmula 1 en IFEMA (asientos en Grada GC02).</div>
      </div>
    </div>
  </div>

  <div class="day-card">
    <div class="day-header">
      <span class="day-badge">Día 5 · Lun 14 Sep</span>
      <span class="day-city">Madrid → Barcelona</span>
    </div>
    <div class="day-desc">Tren de alta velocidad y atardecer en Montjuïc</div>
    <div class="event-line">
      <span class="event-time">13:42</span>
      <div>
        <span class="event-title">OUIGO 06541: Atocha → Barcelona Sants</span>
        <div class="event-detail">Llegada a las 16:44. Check-in en el piso de Carrer de Sepúlveda (Eixample).</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">18:30</span>
      <div>
        <span class="event-title">Mirador de Las Arenas y Tapas en Sant Antoni</span>
        <div class="event-detail">Vistas 360° de Barcelona desde la azotea y tapeo temprano en terrazas familiares.</div>
      </div>
    </div>
  </div>

  <div class="day-card">
    <div class="day-header">
      <span class="day-badge">Día 6 · Mar 15 Sep</span>
      <span class="day-city">Barcelona</span>
    </div>
    <div class="day-desc">Gaudí, Parque de la Ciutadella y Brisa del Mediterráneo</div>
    <div class="event-line">
      <span class="event-time">10:00</span>
      <div>
        <span class="event-title">Sagrada Familia y Paseo de Gràcia</span>
        <div class="event-detail">Maravilla arquitectónica de Gaudí y fachadas de Casa Batlló y La Pedrera.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">16:00</span>
      <div>
        <span class="event-title">Parque de la Ciutadella, Mamut gigante y Barrio Gótico</span>
        <div class="event-detail">Espacio verde para correr los niños, seguido de paseo por la Catedral gótica.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">19:30</span>
      <div>
        <span class="event-title">Paseo Marítimo de la Barceloneta</span>
        <div class="event-detail">Cena familiar frente al mar Mediterráneo con paella o marisco.</div>
      </div>
    </div>
  </div>

  <div class="page-break"></div>

  <!-- PÁGINA 5: ITINERARIO DÍA A DÍA (PARÍS, DISNEY Y EL NORTE) -->
  <div class="section-header">
    <h2 class="section-title">4. Itinerario: París, Disney y el Norte</h2>
    <span class="section-tag">Días 7 a 14</span>
  </div>

  <div class="day-card">
    <div class="day-header">
      <span class="day-badge">Día 7 · Mié 16 Sep</span>
      <span class="day-city">Barcelona → París</span>
    </div>
    <div class="day-desc">Vuelo a París Orly e instalación en Saint-Maurice</div>
    <div class="event-line">
      <span class="event-time">15:40</span>
      <div>
        <span class="event-title">Vueling VY8002: BCN → Orly (17:30)</span>
        <div class="event-detail">Llegada a París, traslado al hotel ibis Saint-Maurice, cena ligera y descanso para Disney.</div>
      </div>
    </div>
  </div>

  <div class="day-card" style="border: 1.5px solid #d4a359; background: #fffcf8;">
    <div class="day-header">
      <span class="day-badge" style="background: #c85a32;">Día 8 · Jue 17 Sep</span>
      <span class="day-city" style="color: #9f3c16;">¡DISNEYLAND PARIS! 🏰</span>
    </div>
    <div class="day-desc">Día Mágico Completo en el Reino de Disney</div>
    <div class="event-line">
      <span class="event-time">09:00</span>
      <div>
        <span class="event-title">RER A directo a Marne-la-Vallée / Chessy</span>
        <div class="event-detail">Llegada a las puertas del parque en ~35 minutos desde Saint-Maurice.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">10:00</span>
      <div>
        <span class="event-title">Fantasyland y Discoveryland</span>
        <div class="event-detail">Castillo de la Bella Durmiente, Peter Pan, It's a Small World (ideal para 4 años) y Buzz Lightyear (para 9 años).</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">17:30</span>
      <div>
        <span class="event-title">Desfile de las Estrellas Disney y Show de Luces Nocturno</span>
        <div class="event-detail">Carrozas musicales y espectáculo de fuegos artificiales y proyecciones en el castillo.</div>
      </div>
    </div>
  </div>

  <div class="day-card">
    <div class="day-header">
      <span class="day-badge">Día 9 · Vie 18 Sep</span>
      <span class="day-city">París</span>
    </div>
    <div class="day-desc">Torre Eiffel, Crucero por el Sena y Notre-Dame</div>
    <div class="event-line">
      <span class="event-time">10:00</span>
      <div>
        <span class="event-title">Torre Eiffel y Campo de Marte</span>
        <div class="event-detail">Fotos desde Trocadero y jardines a los pies del ícono parisino.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">12:30</span>
      <div>
        <span class="event-title">Crucero en barco por el Sena (Bateaux Parisiens)</span>
        <div class="event-detail">1 hora descansando las piernas mientras ven los puentes y el Museo de Orsay desde el agua.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">16:30</span>
      <div>
        <span class="event-title">Notre-Dame, Isla de la Cité y Jardín de las Tullerías</span>
        <div class="event-detail">Fachada de la catedral gótica y barquitos de madera en las fuentes de Tullerías.</div>
      </div>
    </div>
  </div>

  <div class="day-card">
    <div class="day-header">
      <span class="day-badge">Día 10 · Sáb 19 Sep</span>
      <span class="day-city">París → Bilbao → Santander</span>
    </div>
    <div class="day-desc">El Guggenheim, Puppy, Pintxos y Bahía de Santander</div>
    <div class="event-line">
      <span class="event-time">08:50</span>
      <div>
        <span class="event-title">Llegada a Bilbao (VY1463) y recogida de coches</span>
        <div class="event-detail">Aterrizaje en Loiu y entrada directa a Bilbao centro en 15 minutos.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">10:30</span>
      <div>
        <span class="event-title">Museo Guggenheim exterior, Puppy y Paseo de la Ría</span>
        <div class="event-detail">Fotos con el perro gigante de flores naturales Puppy y la araña Mamá.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">13:00</span>
      <div>
        <span class="event-title">Pintxos en Plaza Nueva (Casco Viejo de Bilbao)</span>
        <div class="event-detail">Almuerzo en terrazas peatonales típicas vascas antes de viajar a Santander (1 h en autovía).</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">17:00</span>
      <div>
        <span class="event-title">Península de la Magdalena y El Sardinero</span>
        <div class="event-detail">Trencito, parque marino con pingüinos, helado en Regma y check-in en ibis Styles.</div>
      </div>
    </div>
  </div>

  <div class="day-card">
    <div class="day-header">
      <span class="day-badge">Días 11 y 12 · Dom 20 y Lun 21 Sep</span>
      <span class="day-city">Montaña Palentina</span>
    </div>
    <div class="day-desc">Casa Rural Del Valle Estrecho y Naturaleza</div>
    <div class="event-line">
      <span class="event-time">Dom 20</span>
      <div>
        <span class="event-title">Llegada al Valle Estrecho (135 km desde Santander)</span>
        <div class="event-detail">Instalación en la casa rural, comida campestre, lavadora y descanso familiar.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">Lun 21</span>
      <div>
        <span class="event-title">Ruta de los Pantanos y Embalse de Ruesga</span>
        <div class="event-detail">Paisajes de las cumbres de Curavacas, aire puro de montaña y asado castellano tradicional.</div>
      </div>
    </div>
  </div>

  <div class="day-card">
    <div class="day-header">
      <span class="day-badge">Días 13 y 14 · Mar 22 y Mié 23 Sep</span>
      <span class="day-city">Segovia → Madrid → Bogotá</span>
    </div>
    <div class="day-desc">Acueducto Romano de Segovia y Vuelo de Retorno</div>
    <div class="event-line">
      <span class="event-time">Mar 22 · 12:30</span>
      <div>
        <span class="event-title">Parada en Segovia: Acueducto Romano y Almuerzo</span>
        <div class="event-detail">Monumento bimilenario imponente, comida tradicional segoviana (cochinillo) y vistas al Alcázar.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">Mar 22 · 17:00</span>
      <div>
        <span class="event-title">Llegada a Madrid (Ciudad Lineal) y Entrega de Coches</span>
        <div class="event-detail">Check-in en Apartment Almudena y devolución de coches de alquiler antes del vuelo.</div>
      </div>
    </div>
    <div class="event-line">
      <span class="event-time">Mié 23 · 09:40</span>
      <div>
        <span class="event-title">Vuelo Avianca AV027: Madrid T4 → Bogotá</span>
        <div class="event-detail">En T4 a las 07:40 AM. ¡Fin de un viaje inolvidable!</div>
      </div>
    </div>
  </div>

</body>
</html>`

const htmlPath = resolve('/tmp/dossier_viaje_2026.html')
const pdfPath = resolve('/Users/camilosar/Documents/Claude/Projects/Viaje sept/Dossier-Viaje-Familia-Septiembre-2026.pdf')
const publicPdfPath = resolve('/Users/camilosar/Documents/Claude/Projects/Viaje sept/viaje-app/public/Dossier-Viaje-Familia-Septiembre-2026.pdf')

writeFileSync(htmlPath, html, 'utf8')
console.log('HTML del dossier generado en:', htmlPath)

const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

try {
  const cmd = `"${chromePath}" --headless --disable-gpu --no-pdf-header-footer --print-to-pdf="${pdfPath}" "${htmlPath}"`
  console.log('Compilando PDF con Chrome headless...')
  execSync(cmd, { stdio: 'pipe' })
  console.log('✅ PDF generado con éxito en:', pdfPath)

  // Copia a public para descarga en la web
  execSync(`cp "${pdfPath}" "${publicPdfPath}"`)
  console.log('✅ PDF copiado a public para web en:', publicPdfPath)
} catch (err) {
  console.error('Error generando PDF:', err)
  process.exit(1)
}
