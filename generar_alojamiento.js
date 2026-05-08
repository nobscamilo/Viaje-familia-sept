const fs = require("fs");

const repoUrl = "https://github.com/nobscamilo/Viaje-familia-sept";
const outputFiles = ["index.html", "Alojamiento_Madrid_F1_2026.html"];

const opciones = [
  { id: "M", nombre: "ALFALFA A Apartments", plataforma: "Booking", url: "https://www.booking.com/hotel/es/alfalfa-a-apartments.es.html", total: 1781, noche: 445, rating: 7.7, ubicacion: "Centro Madrid", ifema: "~30 min en metro", capacidad: "9 personas en 2 apartamentos", habitaciones: "2 apartamentos", presupuesto: true, lat: 40.4180, lng: -3.7045, nota: "Finalista por precio: es la mas barata que cumple capacidad y presupuesto. Verificar reseñas recientes antes de reservar." },
  { id: "B", nombre: "Estilo y amplitud San Vicente Ferrer", plataforma: "Booking", url: "https://www.booking.com/hotel/es/new-cool-apt-en-el-centro-de-madrid-para-9pax.es.html", total: 2041, noche: 510, rating: 6.2, ubicacion: "Malasaña / Chueca", ifema: "~30 min en metro", capacidad: "9 personas en apartamento entero", habitaciones: "Apartamento entero", presupuesto: true, lat: 40.4252, lng: -3.7028, nota: "Finalista por valor: entra en presupuesto, pero la calificacion es la mas baja del grupo." },
  { id: "K", nombre: "ALFALFA B Apartments", plataforma: "Booking", url: "https://www.booking.com/hotel/es/alfalfa-b-apartments.es.html", total: 2603, noche: 651, rating: 7.9, ubicacion: "Centro Madrid", ifema: "~30 min en metro", capacidad: "9 personas en 2 apartamentos", habitaciones: "2 apartamentos", presupuesto: false, lat: 40.4185, lng: -3.7050, nota: "Asequible entre apartamentos de centro; compite con B y M si las reseñas recientes son mejores." },
  { id: "D", nombre: "Apartamento Central Madrid - Sol", plataforma: "Booking", url: "https://www.booking.com/hotel/es/apartamento-central-en-madrid-sol.es.html", total: 2613, noche: 653, rating: 8.2, ubicacion: "Sol, centro Madrid", ifema: "~30-35 min en metro", capacidad: "9 personas, multi-unidad", habitaciones: "Apartamento entero", presupuesto: false, lat: 40.4170, lng: -3.7038, nota: "Buena ubicacion turistica; algo mas cara que las finalistas y con menos historial de reseñas." },
  { id: "H", nombre: "Apartamentos Recoletos", plataforma: "Booking", url: "https://www.booking.com/hotel/es/apartamentos-recoletos.es.html", total: 2771, noche: 692, rating: 7.9, ubicacion: "Recoletos / Retiro", ifema: "~30 min en metro", capacidad: "9 personas en 2 apartamentos", habitaciones: "2 apartamentos", presupuesto: false, lat: 40.4240, lng: -3.6920, nota: "Zona mas tranquila que Gran Via; buena alternativa familiar si se acepta separar el grupo en 2 apartamentos." },
  { id: "A", nombre: "Chic12 Gran Via Madrid", plataforma: "Airbnb", url: "https://es-l.airbnb.com/rooms/756567161759468410?check_in=2026-09-10&check_out=2026-09-14&guests=9&adults=7&children=2", total: 2774, noche: 693, rating: 8.86, ubicacion: "Gran Via", ifema: "30-35 min en metro", capacidad: "12 huespedes en loft entero", habitaciones: "3 habitaciones, 7 camas, 2 baños", presupuesto: false, lat: 40.4205, lng: -3.7058, nota: "Recomendacion por ubicacion y grupo junto. Confirmar distribucion real de camas y baños para 9." },
  { id: "N", nombre: "Paseo Suites Hotel", plataforma: "Booking", url: "https://www.booking.com/hotel/es/paseo-suites-boutique.es.html", total: 2894, noche: 724, rating: 8.4, ubicacion: "Paseo, centro Madrid", ifema: "~30 min en metro", capacidad: "9 personas en 2 suites", habitaciones: "2 suites", presupuesto: false, lat: 40.4205, lng: -3.7005, nota: "Opcion media-alta tipo hotel-suite: menos cara que hostales boutique premium, mas cara que apartamentos finalistas." },
  { id: "J", nombre: "Limehome Madrid San Lorenzo", plataforma: "Booking", url: "https://www.booking.com/hotel/es/limehome-madrid-san-lorenzo.es.html", total: 3202, noche: 800, rating: 8.4, ubicacion: "San Lorenzo, Malasaña-Chueca", ifema: "~30 min en metro", capacidad: "9 personas en 2 apartamentos", habitaciones: "2 apartamentos", presupuesto: false, lat: 40.4255, lng: -3.7045, nota: "Diseño moderno y estandarizado; precio alto y posible operacion sin recepcion presencial." },
  { id: "F", nombre: "Hispano Boutique Gran Via", plataforma: "Booking", url: "https://www.booking.com/hotel/es/hostal-hispano.es.html", total: 3350, noche: 837, rating: 8.3, ubicacion: "Gran Via", ifema: "~30-35 min en metro", capacidad: "9 personas en 4 habitaciones", habitaciones: "4 habitaciones", presupuesto: false, lat: 40.4208, lng: -3.7050, nota: "Mejor relacion calidad/precio entre hostales boutique del centro, pero sin espacio comun familiar." },
  { id: "G", nombre: "CH La Bañezana", plataforma: "Booking", url: "https://www.booking.com/hotel/es/la-banezana.es.html", total: 3433, noche: 858, rating: 7.5, ubicacion: "Centro Madrid", ifema: "~30-35 min en metro", capacidad: "9 personas en 4 habitaciones", habitaciones: "4 habitaciones", presupuesto: false, lat: 40.4172, lng: -3.7050, nota: "Hostal de centro con precio alto; verificar si aporta algo frente a Hispano o Veracruz." },
  { id: "E", nombre: "Veracruz Boutique Puerta del Sol", plataforma: "Booking", url: "https://www.booking.com/hotel/es/hostal-veracruz.es.html", total: 3618, noche: 904, rating: 8.0, ubicacion: "Puerta del Sol", ifema: "~30-35 min en metro", capacidad: "9 personas en 4 habitaciones", habitaciones: "4 habitaciones boutique", presupuesto: false, lat: 40.4178, lng: -3.7032, nota: "Ubicacion premium, pero el sobrecoste es fuerte y no hay espacio comun familiar." },
  { id: "I", nombre: "Slow Suites Luchana", plataforma: "Booking", url: "https://www.booking.com/hotel/es/luchana-suites.es.html", total: 3695, noche: 924, rating: 8.6, ubicacion: "Luchana / Chamberi", ifema: "~25-30 min en metro", capacidad: "9 personas en 2 suites", habitaciones: "2 suites", presupuesto: false, lat: 40.4365, lng: -3.7045, nota: "Calidad alta y buen barrio; dificil justificar por precio si el foco es optimizar gasto." },
  { id: "L", nombre: "Tu Casa Bonita en Carolinas", plataforma: "Booking", url: "https://www.booking.com/hotel/es/tu-casa-bonita-en-carolinas.es.html", total: 3825, noche: 956, rating: 9.0, ubicacion: "Las Carolinas, norte", ifema: "verificar, aprox. 25-30 min", capacidad: "9 personas en 2 unidades", habitaciones: "2 unidades", presupuesto: false, lat: 40.4540, lng: -3.7045, nota: "Muy bien calificada, pero cara y lejos del centro turistico. Solo considerarla si el trayecto a IFEMA pesa mas que el turismo." }
];

function esc(value) {
  return String(value ?? "").replace(/[&<>\"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" }[char]));
}

function money(value) {
  return new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function issueUrl(title, body) {
  return `${repoUrl}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

function optionBody(option) {
  return [
    `Voto por: ${option.id} - ${option.nombre}`,
    "",
    "Por que te gusta:",
    "",
    "Dudas antes de reservar:",
    "",
    `Link: ${option.url}`
  ].join("\n");
}

function card(option) {
  const over = option.presupuesto ? "En presupuesto" : `${Math.round(((option.noche - 600) / 600) * 100)}% sobre presupuesto`;
  return `<article class="card" data-id="${esc(option.id)}" data-price="${option.noche}" data-rating="${option.rating}" data-budget="${option.presupuesto ? 1 : 0}">
    <div class="card-head">
      <span class="badge">${esc(option.id)}</span>
      <div><h3>${esc(option.nombre)}</h3><p>${esc(option.plataforma)} · ${esc(option.ubicacion)}</p></div>
    </div>
    <div class="score-row">
      <strong>${money(option.noche)}/noche</strong><span>${money(option.total)} total</span><span>${option.rating}/10</span>
    </div>
    <dl>
      <dt>IFEMA</dt><dd>${esc(option.ifema)}</dd>
      <dt>Capacidad</dt><dd>${esc(option.capacidad)}</dd>
      <dt>Distribucion</dt><dd>${esc(option.habitaciones)}</dd>
      <dt>Presupuesto</dt><dd class="${option.presupuesto ? "ok" : "warn"}">${esc(over)}</dd>
    </dl>
    <p class="note">${esc(option.nota)}</p>
    <div class="actions">
      <a href="${esc(option.url)}" target="_blank" rel="noopener noreferrer">Ver listado</a>
      <a class="secondary" href="${esc(issueUrl(`Voto favorito: opcion ${option.id}`, optionBody(option)))}" target="_blank" rel="noopener noreferrer">Votar favorito</a>
    </div>
  </article>`;
}

const addHousing = issueUrl("Nuevo hospedaje para comparar", "Pega aqui el link:\n\nFechas vistas:\n\nPersonas/habitaciones:\n\nPrecio total y por noche si aparece:\n\nPor que lo propones:");
const addFood = issueUrl("Sugerencia de comida", "Nombre del sitio:\n\nLink:\n\nZona:\n\nTipo de comida:\n\nIdeal para:");
const addPlace = issueUrl("Sitio para conocer", "Nombre del sitio:\n\nLink:\n\nZona:\n\nPor que vale la pena:\n\nMejor dia/hora:");
const addIdea = issueUrl("Idea familiar para el viaje", "Idea:\n\nQuien la propone:\n\nDetalles:");

function html() {
  const bestPrice = opciones.slice().sort((a, b) => a.noche - b.noche)[0];
  const bestRating = opciones.slice().sort((a, b) => b.rating - a.rating)[0];
  const budgetCount = opciones.filter(o => o.presupuesto).length;
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Viaje familiar Madrid septiembre 2026</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIINfQhDYGHP9CyQfQwMREWCYxfvERjvBMc=" crossorigin="">
<style>
:root{color-scheme:light;--ink:#152033;--muted:#5b6678;--line:#dfe5ee;--blue:#2364aa;--green:#247245;--amber:#9b5c00;--bg:#f6f8fb;--card:#fff}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;line-height:1.45}.wrap{max-width:1180px;margin:0 auto;padding:28px 18px 44px}header{padding:12px 0 20px}h1{margin:0 0 8px;font-size:34px;line-height:1.12;letter-spacing:0}p{margin:0}.sub{color:var(--muted);font-size:15px}.tabs{display:flex;gap:8px;overflow:auto;padding:4px 0 18px}.tabs a{white-space:nowrap;text-decoration:none;color:var(--ink);border:1px solid var(--line);background:#fff;padding:9px 12px;border-radius:8px;font-weight:650}.tabs a.active{background:var(--blue);border-color:var(--blue);color:white}.summary{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:8px 0 18px}.metric,.panel,.mapbox{background:var(--card);border:1px solid var(--line);border-radius:10px;padding:16px}.metric b{display:block;font-size:22px}.metric span{color:var(--muted);font-size:13px}.collab{display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;margin:0 0 18px}.collab h2,.panel h2,.mapbox h2{margin:0 0 6px;font-size:20px}.collab p,.panel p,.mapbox p{color:var(--muted);font-size:14px}.buttons{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}.buttons a,.actions a{display:inline-block;text-decoration:none;background:var(--blue);color:#fff;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:700}.buttons a.secondary,.actions a.secondary{background:#eef4fb;color:var(--blue);border:1px solid #cfe0f4}.filters{display:flex;flex-wrap:wrap;align-items:center;gap:8px;background:#fff;border:1px solid var(--line);border-radius:10px;padding:12px;margin:0 0 16px}.filters span{font-size:12px;text-transform:uppercase;color:var(--muted);font-weight:800}.filters button{border:1px solid var(--line);background:#f9fafc;border-radius:8px;padding:8px 10px;cursor:pointer;font-weight:650;color:var(--ink)}.filters button.active{background:var(--blue);color:#fff;border-color:var(--blue)}#map{height:430px;border:1px solid var(--line);border-radius:10px;margin-top:12px}.section-title{margin:22px 0 12px;font-size:24px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.card{background:#fff;border:1px solid var(--line);border-radius:10px;padding:16px;display:flex;flex-direction:column;gap:12px}.card.hidden{display:none}.card-head{display:grid;grid-template-columns:44px 1fr;gap:12px;align-items:start}.badge{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:var(--blue);color:#fff;font-weight:800}.card h3{margin:0 0 3px;font-size:19px}.card-head p{color:var(--muted);font-size:13px}.score-row{display:grid;grid-template-columns:1.2fr 1fr .7fr;gap:8px}.score-row>*{background:#f3f6fa;border-radius:8px;padding:8px;font-size:13px}.score-row strong{font-size:15px}dl{display:grid;grid-template-columns:92px 1fr;gap:7px 10px;margin:0;font-size:14px}dt{font-weight:800;color:#4b5563}dd{margin:0}.ok{color:var(--green);font-weight:800}.warn{color:var(--amber);font-weight:800}.note{border-left:4px solid var(--blue);background:#f4f8fd;padding:10px 12px;border-radius:8px;font-size:14px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:auto}.marker{display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:#f0a21c;color:white;border:3px solid white;box-shadow:0 2px 7px #0005;font-weight:800;font-size:12px}.marker.ok{background:#27804c}.marker.ifema{background:#d23b3b;font-size:11px}.category-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;margin-top:14px}footer{margin-top:28px;padding-top:18px;border-top:1px solid var(--line);color:var(--muted);font-size:12px;text-align:center}@media(max-width:760px){.wrap{padding:20px 14px 34px}h1{font-size:27px}.summary,.grid,.category-grid{grid-template-columns:1fr}.collab{align-items:stretch;flex-direction:column}.buttons{justify-content:stretch}.buttons a,.actions a{text-align:center;flex:1 1 auto}.score-row{grid-template-columns:1fr}#map{height:350px}dl{grid-template-columns:86px 1fr}}
</style>
</head>
<body>
<div class="wrap">
<header><h1>Viaje familiar Madrid septiembre 2026</h1><p class="sub">Madrid inicial · hospedaje 10 al 14 de septiembre · 9 personas · F1 en IFEMA / MADRING del 11 al 13 de septiembre</p></header>
<nav class="tabs" aria-label="Categorias del viaje"><a class="active" href="#hospedaje">Hospedaje</a><a href="#comida">Comida</a><a href="#sitios">Sitios a conocer</a><a href="#ideas">Ideas familiares</a></nav>
<section class="summary" aria-label="Resumen"><div class="metric"><b>${opciones.length}</b><span>opciones comparadas</span></div><div class="metric"><b>${budgetCount}</b><span>entran en presupuesto</span></div><div class="metric"><b>${esc(bestPrice.id)} · ${money(bestPrice.noche)}</b><span>mejor precio por noche</span></div><div class="metric"><b>${esc(bestRating.id)} · ${bestRating.rating}/10</b><span>mejor calificacion</span></div></section>
<section class="collab"><div><h2>Colaboracion familiar</h2><p>Todos pueden proponer hospedajes, votar favoritos o dejar ideas. Cada aporte queda como issue en GitHub para revisarlo y sumarlo a la pagina.</p></div><div class="buttons"><a href="${esc(addHousing)}" target="_blank" rel="noopener noreferrer">Agregar hospedaje</a><a class="secondary" href="${esc(repoUrl + "/issues")}" target="_blank" rel="noopener noreferrer">Ver sugerencias</a></div></section>
<section id="hospedaje"><div class="mapbox"><h2>Mapa de hospedajes</h2><p>Marcadores verdes: opciones dentro del presupuesto orientativo de 600 EUR/noche. Marcador rojo: IFEMA / MADRING.</p><div id="map"></div></div><h2 class="section-title">Opciones de hospedaje (<span id="count">${opciones.length}</span>)</h2><div class="filters"><span>Ordenar</span><button data-sort="price-asc">Precio menor</button><button data-sort="price-desc">Precio mayor</button><button data-sort="rating-desc">Mejor rating</button><span>Filtrar</span><button data-filter="budget">Solo presupuesto</button><button data-filter="all">Mostrar todas</button></div><main class="grid" id="cards">${opciones.map(card).join("\n")}</main></section>
<section class="category-grid"><div class="panel" id="comida"><h2>Comida</h2><p>Lista abierta para restaurantes, mercados y lugares practicos con niños.</p><div class="buttons"><a href="${esc(addFood)}" target="_blank" rel="noopener noreferrer">Proponer comida</a></div></div><div class="panel" id="sitios"><h2>Sitios a conocer</h2><p>Planes turisticos, parques, museos y actividades por zonas.</p><div class="buttons"><a href="${esc(addPlace)}" target="_blank" rel="noopener noreferrer">Proponer sitio</a></div></div><div class="panel" id="ideas"><h2>Ideas familiares</h2><p>Espacio para dudas, favoritos, planes por dia y decisiones pendientes.</p><div class="buttons"><a href="${esc(addIdea)}" target="_blank" rel="noopener noreferrer">Dejar idea</a></div></div></section>
<footer>Pagina generada desde generar_alojamiento.js. Para actualizarla: editar datos, ejecutar node generar_alojamiento.js y publicar en main.</footer>
</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>
<script>
const options=${JSON.stringify(opciones)};
const order=options.map(o=>o.id);const grid=document.getElementById('cards');const count=document.getElementById('count');const buttons=document.querySelectorAll('.filters button');let onlyBudget=false;
function apply(){let visible=0;document.querySelectorAll('.card').forEach(card=>{const show=!onlyBudget||card.dataset.budget==='1';card.classList.toggle('hidden',!show);if(show)visible++;});count.textContent=visible===options.length?String(visible):visible+' de '+options.length;}
function sortCards(key,dir){const cards=[...document.querySelectorAll('.card')];cards.sort((a,b)=>{const va=Number(a.dataset[key]);const vb=Number(b.dataset[key]);return dir==='asc'?va-vb:vb-va;}).forEach(c=>grid.appendChild(c));}
buttons.forEach(btn=>btn.addEventListener('click',()=>{buttons.forEach(b=>b.classList.remove('active'));if(btn.dataset.sort==='price-asc'){btn.classList.add('active');sortCards('price','asc')}if(btn.dataset.sort==='price-desc'){btn.classList.add('active');sortCards('price','desc')}if(btn.dataset.sort==='rating-desc'){btn.classList.add('active');sortCards('rating','desc')}if(btn.dataset.filter==='budget'){onlyBudget=!onlyBudget;btn.classList.toggle('active',onlyBudget);apply()}if(btn.dataset.filter==='all'){onlyBudget=false;buttons.forEach(b=>b.classList.remove('active'));order.forEach(id=>{const c=grid.querySelector('[data-id="'+id+'"]');if(c)grid.appendChild(c)});apply()}}));
const map=L.map('map').setView([40.435,-3.68],12);L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(map);function icon(cls,label){return L.divIcon({className:'',html:'<div class="marker '+cls+'">'+label+'</div>',iconSize:[30,30],iconAnchor:[15,15],popupAnchor:[0,-16]})}const bounds=[[40.4625,-3.6155]];L.marker([40.4625,-3.6155],{icon:icon('ifema','F1')}).addTo(map).bindPopup('<b>IFEMA / MADRING</b><br>GP de España F1 2026');options.forEach(o=>{bounds.push([o.lat,o.lng]);L.marker([o.lat,o.lng],{icon:icon(o.presupuesto?'ok':'',o.id)}).addTo(map).bindPopup('<b>'+o.id+' - '+o.nombre+'</b><br>'+o.ubicacion+'<br>'+new Intl.NumberFormat('es-ES',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(o.noche)+'/noche<br><a href="'+o.url+'" target="_blank" rel="noopener noreferrer">Ver listado</a>')});map.fitBounds(bounds,{padding:[38,38]});
</script>
</body>
</html>`;
}

const content = html() + "\n";
for (const file of outputFiles) fs.writeFileSync(file, content);
console.log(`OK: ${outputFiles.join(", ")} (${content.length} bytes)`);
