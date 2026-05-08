// =============================================================
// GENERADOR DE COMPARATIVA VISUAL — MADRID F1 SEPT 2026
// Genera index.html y Alojamiento_Madrid_F1_2026.html.
// Para añadir una opción nueva: agrega un objeto al array OPCIONES y sus coords.
// =============================================================

const fs = require("fs");
const path = require("path");

const OUTPUT_FILES = ["index.html", "Alojamiento_Madrid_F1_2026.html"];
const PRESUPUESTO_MAX_NOCHE = 600;
const FECHA_GENERACION = new Date().toLocaleDateString("es-ES");
const REPO = {
  owner: "nobscamilo",
  name: "Viaje-familia-sept",
  url: "https://github.com/nobscamilo/Viaje-familia-sept"
};

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(value = "") {
  return escapeHtml(value);
}

function jsonForScript(value) {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function pctOverBudget(price) {
  return Math.round(((price - PRESUPUESTO_MAX_NOCHE) / PRESUPUESTO_MAX_NOCHE) * 100);
}

function formatOptionShort(option) {
  return `${option.id} (${option.nombre} — ${option.precioNoche}/noche)`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function minutesToIfema(value = "") {
  const matches = String(value).match(/\d+/g);
  if (!matches || matches.length === 0) return 35;
  const nums = matches.map(Number);
  if (nums.length === 1) return nums[0];
  return (nums[0] + nums[1]) / 2;
}

function issueUrl(title, body) {
  return `${REPO.url}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

// =================== COORDENADAS (lat, lng) ===================
// IFEMA / Circuito Madring + zona aproximada de cada opción.
// Para opciones donde no tengo dirección exacta uso el centro del barrio mencionado.
const COORDS = {
  IFEMA: [40.4625, -3.6155],
  A: [40.4205, -3.7058],   // Gran Vía
  B: [40.4252, -3.7028],   // Vicente Ferrer 52, Malasaña
  D: [40.4170, -3.7038],   // Sol
  E: [40.4178, -3.7032],   // Puerta del Sol
  F: [40.4208, -3.7050],   // Gran Vía
  G: [40.4172, -3.7050],   // Centro Madrid
  H: [40.4240, -3.6920],   // Recoletos / Retiro
  I: [40.4365, -3.7045],   // Luchana / Chamberí
  J: [40.4255, -3.7045],   // San Lorenzo, Malasaña
  K: [40.4185, -3.7050],   // Centro Madrid
  L: [40.4540, -3.7045],   // Las Carolinas (norte)
  M: [40.4180, -3.7045],   // Centro Madrid
  N: [40.4205, -3.7005],   // Paseo (centro-este)
};

// =================== DATOS DE LA FAMILIA / VIAJE ==============
const VIAJE = {
  fechaInicio: "10 de septiembre de 2026",
  fechaFin: "14 de septiembre de 2026",
  noches: 4,
  grupo: [
    "Camilo y Juliana",
    "Padres de Camilo (2 personas)",
    "Hermana, su esposo y 3 hijos (18, 8 y 4 años)"
  ],
  totalPersonas: 9,
  contexto: "El alojamiento corresponde al fin de semana del Gran Premio de España de Fórmula 1 en el circuito MADRING (IFEMA), del 11 al 13 de septiembre 2026, con la carrera el domingo 13.",
  criterios: [
    "Trayecto máximo a IFEMA: 30 a 40 minutos",
    "Sin desplazamientos en coche por la ciudad: prioridad metro o cercanías",
    "Capacidad real para 9 personas, idealmente con espacios comunes",
    "Presupuesto orientativo inicial: 300–600 €/noche total"
  ]
};

// =================== DATOS DE OPCIONES ========================
const OPCIONES = [
  // ---------- OPCIÓN A — Airbnb Chic12 Gran Vía ----------
  {
    id: "A",
    nombre: "Chic12 Gran Vía Madrid (Airbnb)",
    plataforma: "Airbnb",
    enlace: "https://es-l.airbnb.com/rooms/756567161759468410?unique_share_id=9f7c9e92-3ecc-42b9-b894-7fd4fe3ce89c&viralityEntryPoint=1&s=76&source_impression_id=p3_1778186636_P3gwOP7DfT3KA_i2&check_in=2026-09-10&guests=9&adults=7&check_out=2026-09-14&children=2",
    precioTotal: "2.774 €",
    precioNoche: "693 €",
    enPresupuesto: false,
    ubicacion: "Gran Vía, Madrid centro",
    distanciaIfema: "30-35 min en metro (Línea 1 + Línea 8)",
    capacidad: "12 huéspedes (loft entero)",
    habitaciones: "3 hab. · 7 camas · 2 baños",
    calificacion: "4,43/5 (7 reseñas)",
    calificacionNum: 8.86, // 4.43/5 escalado a /10
    precioNocheNum: 693,
    fotos: [
      "https://a0.muscache.com/im/pictures/hosting/Hosting-756567161759468410/original/073a1980-2004-4597-9dab-d966a90cddb2.jpeg?im_w=720",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-756567161759468410/original/dbaabb46-e3a0-41b3-9a7e-44b06cec7d97.jpeg?im_w=720",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-756567161759468410/original/10cddeb3-bf7a-4d77-b891-1810c24cd18f.jpeg?im_w=720",
      "https://a0.muscache.com/im/pictures/hosting/Hosting-756567161759468410/original/4d761599-e9ca-493d-bacd-f9244ad425af.jpeg?im_w=720",
      "https://a0.muscache.com/im/pictures/fbdcf2c0-beee-449f-a8b8-ba477ec83288.jpg?im_w=720"
    ],
    pros: [
      "Ubicación inmejorable en Gran Vía (turismo, restaurantes, metro a pasos)",
      "Loft entero — toda la familia junta",
      "Anfitrión con 10 años en Airbnb",
      "Cumple criterio de tiempo a IFEMA"
    ],
    contras: [
      "693 €/noche supera presupuesto (+15%)",
      "Solo 7 camas para 9 personas: alguien comparte",
      "Solo 2 baños para 9: turnos en mañanas",
      "Solo 7 reseñas: muestra pequeña"
    ],
    notaCritica: "Recomendación principal por ubicación y comodidad familiar. Verifica antes de pagar la distribución exacta de las 7 camas para 9 personas."
  },
  // ---------- OPCIÓN B — Estilo y amplitud San Vicente Ferrer ----------
  {
    id: "B",
    nombre: "Estilo y amplitud para 9 en San Vicente Ferrer E2",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/new-cool-apt-en-el-centro-de-madrid-para-9pax.es.html",
    precioTotal: "2.041 €",
    precioNoche: "510 €",
    enPresupuesto: true,
    ubicacion: "Centro Madrid (Malasaña-Chueca)",
    distanciaIfema: "~30 min en metro hasta Feria de Madrid",
    capacidad: "9 personas (apartamento entero)",
    habitaciones: "Apartamento entero · 3★ Genius",
    calificacion: "6,2/10 Agradable (134 comentarios) · Ubicación 8,5/10",
    calificacionNum: 6.2,
    precioNocheNum: 510,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/714647177.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/714647154.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/714647171.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/714647201.jpg"
    ],
    pros: [
      "La opción más barata que cumple criterios",
      "Apartamento entero — toda la familia junta",
      "134 reseñas (más histórico que el Airbnb)",
      "Cancelación flexible disponible en Booking"
    ],
    contras: [
      "Calificación 6,2/10 — la más baja del comparativo",
      "Apartamento 3★ suele ser check-in remoto sin servicios",
      "Calle Vicente Ferrer (Malasaña) puede ser ruidosa fines de semana"
    ],
    notaCritica: "Mejor relación precio/idoneidad si la prioridad es contener gasto. Lee las reseñas más recientes antes de reservar."
  },
  // ---------- OPCIÓN D — Apartamento Central Madrid Sol ----------
  {
    id: "D",
    nombre: "Apartamento Central Madrid - Sol",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/apartamento-central-en-madrid-sol.es.html",
    precioTotal: "2.613 €",
    precioNoche: "653 €",
    enPresupuesto: false,
    ubicacion: "Centro Madrid, zona Sol",
    distanciaIfema: "~30-35 min en metro hasta Feria de Madrid",
    capacidad: "9 personas (apartamento entero, multi-unidad)",
    habitaciones: "Apartamento entero",
    calificacion: "8,2/10 Muy bien (29 comentarios)",
    calificacionNum: 8.2,
    precioNocheNum: 653,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/768544224.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/768544198.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/768543961.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/768544078.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/768544105.jpg"
    ],
    pros: [
      "Ubicación premium en Sol, corazón turístico",
      "Apartamento entero con capacidad para 9",
      "Servicios de Booking (cancelación, soporte)"
    ],
    contras: [
      "653 €/noche supera el presupuesto",
      "Calificación pendiente de verificar",
      "Multi-unidad: habitaciones pueden estar repartidas"
    ],
    notaCritica: "Alternativa similar al Airbnb (Sol/Gran Vía) pero algo más cara y con menos reseñas históricas."
  },
  // ===================== NUEVAS OPCIONES =====================
  // ---------- OPCIÓN E — Veracruz Boutique Puerta del Sol ----------
  {
    id: "E",
    nombre: "Veracruz Boutique Puerta del Sol",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/hostal-veracruz.es.html",
    precioTotal: "3.618 €",
    precioNoche: "904 €",
    enPresupuesto: false,
    ubicacion: "Puerta del Sol, centro Madrid",
    distanciaIfema: "~30-35 min en metro hasta Feria de Madrid",
    capacidad: "9 personas en 4 habitaciones (3 hab × parejas + niños)",
    habitaciones: "4 habitaciones boutique",
    calificacion: "8,0/10 Muy bien (1.448 comentarios)",
    calificacionNum: 8.0,
    precioNocheNum: 904,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/833087671.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/399300647.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/833087644.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/399300330.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/833087716.jpg"
    ],
    pros: [
      "Ubicación premium en Puerta del Sol",
      "Hotel boutique (vs apartamento)",
      "Habitaciones individuales por subgrupo familiar"
    ],
    contras: [
      "904 €/noche — supera presupuesto >50%",
      "Sin espacio común familiar (cada uno en su habitación)"
    ],
    notaCritica: "Cerca del corazón turístico pero precio elevado. Mejor opción si prefieren hotel sobre apartamento y aceptan el sobrecoste."
  },
  // ---------- OPCIÓN F — Hispano Boutique Gran Vía ----------
  {
    id: "F",
    nombre: "Hispano Boutique Gran Vía",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/hostal-hispano.es.html",
    precioTotal: "3.350 €",
    precioNoche: "837 €",
    enPresupuesto: false,
    ubicacion: "Gran Vía, centro Madrid",
    distanciaIfema: "~30-35 min en metro hasta Feria de Madrid",
    capacidad: "9 personas en 4 habitaciones",
    habitaciones: "4 habitaciones hostal-boutique",
    calificacion: "8,3/10 Muy bien (1.442 comentarios)",
    calificacionNum: 8.3,
    precioNocheNum: 837,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/782950816.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/782950820.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/782950811.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/13716624.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/782950827.jpg"
    ],
    pros: [
      "Gran Vía: ubicación inmejorable",
      "Hostal-boutique con habitaciones renovadas",
      "Mismo formato familiar que Veracruz pero ~70€/noche menos"
    ],
    contras: [
      "837 €/noche — supera presupuesto +40%",
      "Como hostal boutique, servicios limitados vs hotel completo",
      "Sin espacio común familiar"
    ],
    notaCritica: "Mejor relación calidad/precio entre los hostales boutique de centro. Mismo formato que Veracruz pero un escalón más barato."
  },
  // ---------- OPCIÓN G — CH La Bañezana ----------
  {
    id: "G",
    nombre: "CH La Bañezana",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/la-banezana.es.html",
    precioTotal: "3.433 €",
    precioNoche: "858 €",
    enPresupuesto: false,
    ubicacion: "Centro Madrid",
    distanciaIfema: "~30-35 min en metro",
    capacidad: "9 personas en 4 habitaciones",
    habitaciones: "4 habitaciones",
    calificacion: "7,5/10 Bien (1.028 comentarios)",
    calificacionNum: 7.5,
    precioNocheNum: 858,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/143563156.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/143563854.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/143563891.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/143563794.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/143563789.jpg"
    ],
    pros: [
      "Ubicación céntrica",
      "4 habitaciones permite distribución privada"
    ],
    contras: [
      "858 €/noche — supera presupuesto +40%",
      "Sin información clara de calificación"
    ],
    notaCritica: "Otra opción de hostal boutique en centro. Verifica reseñas antes de decidir — el precio no la diferencia claramente de Veracruz/Hispano."
  },
  // ---------- OPCIÓN H — Apartamentos Recoletos ----------
  {
    id: "H",
    nombre: "Apartamentos Recoletos",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/apartamentos-recoletos.es.html",
    precioTotal: "2.771 €",
    precioNoche: "692 €",
    enPresupuesto: false,
    ubicacion: "Recoletos, centro Madrid (cerca del Retiro)",
    distanciaIfema: "~30 min en metro",
    capacidad: "9 personas (2 apartamentos)",
    habitaciones: "2 apartamentos enteros",
    calificacion: "7,9/10 Bien (6.887 comentarios)",
    calificacionNum: 7.9,
    precioNocheNum: 692,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/178969113.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/178997800.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/110252176.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/644611848.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/178969075.jpg"
    ],
    pros: [
      "Zona Recoletos / Retiro: tranquila y elegante",
      "Apartamentos enteros con cocina",
      "Comparable en precio al Airbnb pero con servicios Booking",
      "Cerca del parque del Retiro (excelente con niños)"
    ],
    contras: [
      "692 €/noche supera presupuesto",
      "2 unidades separan al grupo en dos apartamentos"
    ],
    notaCritica: "Buena alternativa al Airbnb si prefieres Booking. Recoletos es zona más tranquila que Gran Vía, mejor para familia con niños pequeños."
  },
  // ---------- OPCIÓN I — Slow Suites Luchana ----------
  {
    id: "I",
    nombre: "Slow Suites Luchana",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/luchana-suites.es.html",
    precioTotal: "3.695 €",
    precioNoche: "924 €",
    enPresupuesto: false,
    ubicacion: "Luchana / Chamberí, Madrid",
    distanciaIfema: "~25-30 min en metro (favorable)",
    capacidad: "9 personas (2 suites)",
    habitaciones: "2 suites",
    calificacion: "8,6/10 Fabuloso (1.972 comentarios)",
    calificacionNum: 8.6,
    precioNocheNum: 924,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/347938715.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/60334658.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/60334670.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/61752415.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/60334597.jpg"
    ],
    pros: [
      "Chamberí: zona elegante, residencial, segura",
      "Más cerca de IFEMA que las otras opciones de centro",
      "Suites con servicios de hotel"
    ],
    contras: [
      "924 €/noche — la más cara del comparativo (+50% sobre presupuesto)",
      "Solo 2 unidades para 9 personas"
    ],
    notaCritica: "La opción más cara. Solo justificable si valoras mucho el barrio (Chamberí) y los servicios de hotel-boutique."
  },
  // ---------- OPCIÓN J — Limehome Madrid San Lorenzo ----------
  {
    id: "J",
    nombre: "Limehome Madrid San Lorenzo",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/limehome-madrid-san-lorenzo.es.html",
    precioTotal: "3.202 €",
    precioNoche: "800 €",
    enPresupuesto: false,
    ubicacion: "Calle San Lorenzo, Malasaña-Chueca centro",
    distanciaIfema: "~30 min en metro",
    capacidad: "9 personas (2 apartamentos)",
    habitaciones: "2 apartamentos",
    calificacion: "8,4/10 Muy bien (885 comentarios)",
    calificacionNum: 8.4,
    precioNocheNum: 800,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/405515654.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/749302912.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/405514458.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/405513966.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/405513968.jpg"
    ],
    pros: [
      "Marca Limehome: estandarización y diseño consistentes",
      "Centro de Madrid, zona Malasaña vibrante",
      "Apartamentos modernos con cocina"
    ],
    contras: [
      "800 €/noche — supera presupuesto +33%",
      "Limehome usa check-in 100% remoto (sin recepción humana)",
      "Malasaña ruidosa los fines de semana"
    ],
    notaCritica: "Diseño moderno y estandarizado pero precio alto y sin recepción presencial. Útil si valoras decoración consistente."
  },
  // ---------- OPCIÓN K — ALFALFA B Apartments ----------
  {
    id: "K",
    nombre: "ALFALFA B Apartments",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/alfalfa-b-apartments.es.html",
    precioTotal: "2.603 €",
    precioNoche: "651 €",
    enPresupuesto: false,
    ubicacion: "Centro Madrid",
    distanciaIfema: "~30 min en metro",
    capacidad: "9 personas (2 apartamentos)",
    habitaciones: "2 apartamentos",
    calificacion: "7,9/10 Bien (276 comentarios)",
    calificacionNum: 7.9,
    precioNocheNum: 651,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/492740812.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/492740873.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/492740826.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/492740818.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/492740814.jpg"
    ],
    pros: [
      "651 €/noche — apenas supera presupuesto (+8%)",
      "Apartamentos enteros con cocina",
      "Buen precio relativo entre las opciones de centro"
    ],
    contras: [
      "Ligeramente sobre presupuesto",
      "Calificación pendiente de verificar"
    ],
    notaCritica: "Una de las opciones más asequibles entre los apartamentos de centro. Verificar reseñas y servicios antes de descartar B (que es 140€/noche más barato)."
  },
  // ---------- OPCIÓN L — Tu Casa Bonita en Carolinas ----------
  {
    id: "L",
    nombre: "Tu Casa Bonita en Carolinas",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/tu-casa-bonita-en-carolinas.es.html",
    precioTotal: "3.825 €",
    precioNoche: "956 €",
    enPresupuesto: false,
    ubicacion: "Las Carolinas, Madrid (norte)",
    distanciaIfema: "Verificar — probablemente ~25-30 min en metro",
    capacidad: "9 personas (2 unidades)",
    habitaciones: "2 unidades",
    calificacion: "9,0/10 Fantástico (26 comentarios)",
    calificacionNum: 9.0,
    precioNocheNum: 956,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/833058848.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/833058666.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/833058878.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/833058405.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/833058841.jpg"
    ],
    pros: [
      "Las Carolinas: zona residencial cerca de IFEMA",
      "Probablemente el trayecto al circuito sea corto"
    ],
    contras: [
      "956 €/noche — la segunda más cara del comparativo",
      "Las Carolinas es zona residencial sin atractivo turístico"
    ],
    notaCritica: "Solo justificable si confirmas trayecto muy corto a IFEMA. Para turismo en Madrid centro, queda lejos. No la recomiendo a este precio."
  },
  // ---------- OPCIÓN M — ALFALFA A Apartments ----------
  {
    id: "M",
    nombre: "ALFALFA A Apartments",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/alfalfa-a-apartments.es.html",
    precioTotal: "1.781 €",
    precioNoche: "445 €",
    enPresupuesto: true,
    ubicacion: "Centro Madrid",
    distanciaIfema: "~30 min en metro",
    capacidad: "9 personas (2 apartamentos)",
    habitaciones: "2 apartamentos",
    calificacion: "7,7/10 Bien (234 comentarios)",
    calificacionNum: 7.7,
    precioNocheNum: 445,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/492740789.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/492740967.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/653275596.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/492740807.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/492740951.jpg"
    ],
    pros: [
      "445 €/noche — DENTRO de presupuesto y la más barata del comparativo nuevo",
      "Apartamentos enteros con cocina",
      "Misma marca que K (Alfalfa B) — calidad consistente"
    ],
    contras: [
      "Calificación pendiente de verificar",
      "2 unidades separan al grupo"
    ],
    notaCritica: "🏆 La OPCIÓN MÁS BARATA que cumple criterios y entra en presupuesto. Junto con B (Estilo y amplitud), las dos finalistas en relación precio/idoneidad. Verificar reseñas urgente."
  },
  // ---------- OPCIÓN N — Paseo Suites Hotel ----------
  {
    id: "N",
    nombre: "Paseo Suites Hotel",
    plataforma: "Booking",
    enlace: "https://www.booking.com/hotel/es/paseo-suites-boutique.es.html",
    precioTotal: "2.894 €",
    precioNoche: "724 €",
    enPresupuesto: false,
    ubicacion: "Paseo (centro Madrid)",
    distanciaIfema: "~30 min en metro",
    capacidad: "9 personas (2 suites)",
    habitaciones: "2 suites",
    calificacion: "8,4/10 Muy bien (975 comentarios)",
    calificacionNum: 8.4,
    precioNocheNum: 724,
    fotos: [
      "https://cf.bstatic.com/xdata/images/hotel/max1024x768/443029536.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/442666355.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max500/442666362.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/442651022.jpg",
      "https://cf.bstatic.com/xdata/images/hotel/max300/442682307.jpg"
    ],
    pros: [
      "Hotel boutique (vs apartamento) — recepción, servicios",
      "2 suites con espacio amplio"
    ],
    contras: [
      "724 €/noche — supera presupuesto +20%",
      "Solo 2 unidades para 9 personas"
    ],
    notaCritica: "Hotel-suite opción media-alta. Si prefieres servicios de hotel completos sobre apartamento, es menos caro que Veracruz/Hispano pero más caro que B/M."
  }
];

// ================ CONCLUSIONES Y RECOMENDACIÓN ================
const CONCLUSIONES = {
  recomendacionPrincipal: "M — ALFALFA A Apartments (más barata) o B — San Vicente Ferrer E2 (apartamento entero)",
  razonRecomendacion: "Tras revisar 13 opciones, las dos únicas dentro del presupuesto inicial son la M (Alfalfa A — 445 €/noche) y la B (San Vicente Ferrer E2 — 510 €/noche). El resto excede entre 8% y 60% el techo de 600 €/noche. Si la prioridad es contención de gasto, M es la finalista clara; si la prioridad es tener la familia en un apartamento entero único (no dos), B mantiene esa ventaja.",
  alternativaPremium: "Si aceptas pagar más por ubicación premium (Gran Vía, Sol), la opción A (Airbnb Chic12) sigue siendo la más equilibrada en experiencia/comodidad para 9 personas a 693 €/noche. H (Apartamentos Recoletos) a 692 €/noche también es competitiva con la ventaja de la zona Retiro tranquila.",
  riesgo: "Las opciones que más han subido de precio son las hoteleras de centro (Veracruz, Hispano, Bañezana, Slow Suites). Esto es típico del fin de semana del GP. Las cancelaciones gratuitas y las tarifas más bajas son siempre las primeras en agotarse — decidir en los próximos 7-10 días."
};

const COLABORACION = {
  nuevaOpcionHospedaje: issueUrl(
    "Nueva opción de hospedaje",
    [
      "Link del alojamiento:",
      "",
      "Precio total / precio por noche:",
      "",
      "Capacidad, habitaciones, camas y baños:",
      "",
      "Ubicación o barrio:",
      "",
      "Por qué la sugieres:",
      "",
      "Tu nombre:"
    ].join("\n")
  ),
  ideasComida: issueUrl(
    "Sugerencia de comida",
    [
      "Nombre del sitio:",
      "",
      "Link:",
      "",
      "Zona:",
      "",
      "Por qué vale la pena:",
      "",
      "Tu nombre:"
    ].join("\n")
  ),
  ideasSitios: issueUrl(
    "Sitio a conocer",
    [
      "Nombre del sitio:",
      "",
      "Link o ubicación:",
      "",
      "Ideal para:",
      "",
      "Tiempo aproximado:",
      "",
      "Tu nombre:"
    ].join("\n")
  ),
  ideasGenerales: issueUrl(
    "Idea para el viaje",
    [
      "Idea:",
      "",
      "Categoría:",
      "",
      "Por qué te gusta:",
      "",
      "Tu nombre:"
    ].join("\n")
  ),
  analisisIa: issueUrl(
    "Pedir análisis IA de hospedajes",
    [
      "Qué quieres que compare o revise la IA:",
      "",
      "Opciones involucradas (si aplica):",
      "",
      "Restricciones nuevas de la familia:",
      "",
      "Tu nombre:"
    ].join("\n")
  ),
  quitarOpcionHospedaje: issueUrl(
    "Quitar opción de hospedaje",
    [
      "Opción a quitar:",
      "",
      "Motivo:",
      "",
      "Tu nombre:"
    ].join("\n")
  )
};

function validateOptions() {
  const requiredFields = [
    "id", "nombre", "plataforma", "enlace", "precioTotal", "precioNoche",
    "ubicacion", "distanciaIfema", "capacidad", "habitaciones",
    "calificacion", "calificacionNum", "precioNocheNum", "pros", "contras",
    "notaCritica"
  ];
  const errors = [];
  const ids = new Set();

  OPCIONES.forEach((option, index) => {
    requiredFields.forEach(field => {
      const value = option[field];
      if (value === undefined || value === null || value === "") {
        errors.push(`Opción ${option.id || index + 1}: falta ${field}`);
      }
    });
    if (ids.has(option.id)) {
      errors.push(`Opción ${option.id}: id duplicado`);
    }
    ids.add(option.id);
    if (!Array.isArray(option.pros) || option.pros.length === 0) {
      errors.push(`Opción ${option.id}: agrega al menos un pro`);
    }
    if (!Array.isArray(option.contras) || option.contras.length === 0) {
      errors.push(`Opción ${option.id}: agrega al menos un contra`);
    }
    if (!COORDS[option.id]) {
      errors.push(`Opción ${option.id}: faltan coordenadas en COORDS`);
    }
    if (typeof option.precioNocheNum !== "number" || Number.isNaN(option.precioNocheNum)) {
      errors.push(`Opción ${option.id}: precioNocheNum debe ser numérico`);
    }
    if (typeof option.calificacionNum !== "number" || Number.isNaN(option.calificacionNum)) {
      errors.push(`Opción ${option.id}: calificacionNum debe ser numérico`);
    }
    if (Boolean(option.enPresupuesto) !== (option.precioNocheNum <= PRESUPUESTO_MAX_NOCHE)) {
      errors.push(`Opción ${option.id}: enPresupuesto no coincide con ${PRESUPUESTO_MAX_NOCHE} €/noche`);
    }
  });

  Object.keys(COORDS)
    .filter(id => id !== "IFEMA" && !ids.has(id))
    .forEach(id => errors.push(`COORDS tiene ${id}, pero no existe esa opción`));

  if (errors.length) {
    throw new Error("Datos inválidos:\n- " + errors.join("\n- "));
  }
}

function buildConclusions() {
  const inBudget = OPCIONES
    .filter(option => option.enPresupuesto)
    .sort((a, b) => a.precioNocheNum - b.precioNocheNum);
  const overBudget = OPCIONES
    .filter(option => !option.enPresupuesto)
    .sort((a, b) => a.precioNocheNum - b.precioNocheNum);
  const cheapest = inBudget[0];
  const wholePlace = inBudget.find(option =>
    /apartamento entero|loft entero|casa entera/i.test(`${option.capacidad} ${option.habitaciones}`) &&
    !/2 apartamentos|2 unidades|2 suites/i.test(`${option.capacidad} ${option.habitaciones}`)
  );
  const budgetNames = inBudget.map(formatOptionShort).join(", ");
  const overPct = overBudget.map(option => pctOverBudget(option.precioNocheNum));
  const minOver = overPct.length ? Math.min(...overPct) : 0;
  const maxOver = overPct.length ? Math.max(...overPct) : 0;

  let recomendacionPrincipal = CONCLUSIONES.recomendacionPrincipal;
  if (cheapest && wholePlace && cheapest.id !== wholePlace.id) {
    recomendacionPrincipal = `${cheapest.id} — ${cheapest.nombre} (más barata) o ${wholePlace.id} — ${wholePlace.nombre} (alojamiento entero)`;
  } else if (cheapest) {
    recomendacionPrincipal = `${cheapest.id} — ${cheapest.nombre}`;
  }

  let razonRecomendacion = `Tras revisar ${OPCIONES.length} opciones, `;
  if (inBudget.length === 0) {
    razonRecomendacion += `ninguna queda dentro del presupuesto inicial de ${PRESUPUESTO_MAX_NOCHE} €/noche. Conviene subir presupuesto o ampliar zonas antes de reservar.`;
  } else if (inBudget.length === 1) {
    razonRecomendacion += `la única dentro del presupuesto inicial es ${budgetNames}. `;
  } else {
    razonRecomendacion += `las ${inBudget.length} dentro del presupuesto inicial son ${budgetNames}. `;
  }
  if (overBudget.length) {
    razonRecomendacion += `El resto excede aproximadamente entre ${minOver}% y ${maxOver}% el techo de ${PRESUPUESTO_MAX_NOCHE} €/noche. `;
  }
  if (cheapest && wholePlace && cheapest.id !== wholePlace.id) {
    razonRecomendacion += `Si la prioridad es contención de gasto, ${cheapest.id} es la finalista clara; si la prioridad es tener la familia en un alojamiento entero único, ${wholePlace.id} mantiene esa ventaja.`;
  } else if (cheapest) {
    razonRecomendacion += `Por precio y encaje general, ${cheapest.id} queda como primera finalista.`;
  }

  return {
    recomendacionPrincipal,
    razonRecomendacion,
    alternativaPremium: CONCLUSIONES.alternativaPremium,
    riesgo: CONCLUSIONES.riesgo
  };
}

function scoreOption(option, context) {
  const priceRange = context.maxPrice - context.minPrice || 1;
  const priceScore = ((context.maxPrice - option.precioNocheNum) / priceRange) * 28;
  const ratingScore = (option.calificacionNum / 10) * 24;
  const minutes = minutesToIfema(option.distanciaIfema);
  const distanceScore = clamp((45 - minutes) / 25, 0, 1) * 16;
  const budgetScore = option.enPresupuesto ? 18 : clamp(12 - pctOverBudget(option.precioNocheNum) * 0.45, 0, 12);
  const text = `${option.capacidad} ${option.habitaciones}`.toLowerCase();
  let groupScore = 8;
  if (/apartamento entero|loft entero|casa entera/.test(text) && !/2 apartamentos|2 unidades|2 suites/.test(text)) {
    groupScore = 14;
  } else if (/2 apartamentos|2 unidades|2 suites|4 habitaciones/.test(text)) {
    groupScore = 9;
  }
  const photoScore = Array.isArray(option.fotos) && option.fotos.length >= 4 ? 5 : 2;
  const total = Math.round(priceScore + ratingScore + distanceScore + budgetScore + groupScore + photoScore);

  const reasons = [];
  if (option.enPresupuesto) reasons.push("entra en presupuesto");
  else reasons.push(`excede ${pctOverBudget(option.precioNocheNum)}% el presupuesto`);
  if (option.calificacionNum >= 8.5) reasons.push("muy buena calificación");
  else if (option.calificacionNum < 7) reasons.push("calificación floja");
  if (minutes <= 30) reasons.push("trayecto favorable a IFEMA");
  if (/apartamento entero|loft entero|casa entera/.test(text) && !/2 apartamentos|2 unidades|2 suites/.test(text)) {
    reasons.push("mantiene al grupo en un solo alojamiento");
  } else if (/2 apartamentos|2 unidades|2 suites|4 habitaciones/.test(text)) {
    reasons.push("divide al grupo en unidades o habitaciones");
  }

  return {
    option,
    total: clamp(total, 0, 100),
    minutes,
    reasons: reasons.slice(0, 3).join(", ")
  };
}

function buildOptionScores() {
  const prices = OPCIONES.map(option => option.precioNocheNum);
  const context = {
    minPrice: Math.min(...prices),
    maxPrice: Math.max(...prices)
  };
  return OPCIONES
    .map(option => scoreOption(option, context))
    .sort((a, b) => b.total - a.total || a.option.precioNocheNum - b.option.precioNocheNum);
}

// ===================== GENERAR HTML ===============================
function buildHtml() {
  const conclusiones = buildConclusions();
  const optionScores = buildOptionScores();
  const scoreById = new Map(optionScores.map(score => [score.option.id, score]));
  const cheapest = OPCIONES.slice().sort((a, b) => a.precioNocheNum - b.precioNocheNum)[0];
  const premium = optionScores.find(score =>
    !score.option.enPresupuesto &&
    score.option.calificacionNum >= 8.2 &&
    score.option.precioNocheNum <= 750
  ) || optionScores.find(score => !score.option.enPresupuesto);
  const introHtml = `
  <section class="intro">
    <h2>Resumen del viaje</h2>
    <div class="intro-grid">
      <div>
        <h3>Fechas</h3>
        <p><strong>${escapeHtml(VIAJE.fechaInicio)}</strong> al <strong>${escapeHtml(VIAJE.fechaFin)}</strong> · ${escapeHtml(VIAJE.noches)} noches</p>
      </div>
      <div>
        <h3>Grupo (${escapeHtml(VIAJE.totalPersonas)} personas)</h3>
        <ul>${VIAJE.grupo.map(g => `<li>${escapeHtml(g)}</li>`).join('')}</ul>
      </div>
      <div class="full">
        <h3>Contexto</h3>
        <p>${escapeHtml(VIAJE.contexto)}</p>
      </div>
      <div class="full">
        <h3>Criterios de selección</h3>
        <ul class="criteria">${VIAJE.criterios.map(c => `<li>${escapeHtml(c)}</li>`).join('')}</ul>
      </div>
    </div>
  </section>`;

  // Helper: si la URL es de Booking (cf.bstatic.com), pásala por wsrv.nl proxy
  // que strip-ea el referer y bypassea hotlink protection
  const proxiedImg = (url) => {
    if (url.includes('cf.bstatic.com') || url.includes('q-xx.bstatic.com')) {
      return 'https://wsrv.nl/?url=' + encodeURIComponent(url) + '&w=720';
    }
    return url; // Airbnb (muscache.com) carga directamente
  };

  const cardHtml = OPCIONES.map(o => {
    const aiScore = scoreById.get(o.id);
    const favoriteLink = issueUrl(
      `Favorito hospedaje: opción ${o.id}`,
      [
        `Mi opción favorita es: ${o.id} — ${o.nombre}`,
        "",
        "Por qué la prefiero:",
        "",
        "Dudas o condiciones antes de reservar:",
        "",
        "Tu nombre:"
      ].join("\n")
    );
    const removeLink = issueUrl(
      `Quitar hospedaje: opción ${o.id}`,
      [
        `Propongo quitar: ${o.id} — ${o.nombre}`,
        "",
        "Motivo:",
        "",
        "Tu nombre:"
      ].join("\n")
    );
    let galleryHtml;
    if (o.fotos && o.fotos.length > 0) {
      const principal = `<a href="${escapeAttr(o.enlace)}" target="_blank" rel="noopener noreferrer" class="photo-main"><img src="${escapeAttr(proxiedImg(o.fotos[0]))}" alt="${escapeAttr(o.nombre)}" loading="lazy" referrerpolicy="no-referrer"></a>`;
      const thumbs = o.fotos.slice(1, 5).map(f =>
        `<a href="${escapeAttr(o.enlace)}" target="_blank" rel="noopener noreferrer" class="photo-thumb"><img src="${escapeAttr(proxiedImg(f))}" alt="${escapeAttr(o.nombre)}" loading="lazy" referrerpolicy="no-referrer"></a>`
      ).join('');
      galleryHtml = `<div class="gallery">${principal}<div class="thumbs">${thumbs}</div></div>`;
    } else {
      galleryHtml = `<div class="gallery"><div class="no-photo">Sin fotos disponibles</div></div>`;
    }
    const presupuestoBadge = o.enPresupuesto
      ? `<span class="badge ok">En presupuesto</span>`
      : `<span class="badge warn">Excede presupuesto</span>`;
    return `
    <article class="card" data-id="${escapeAttr(o.id)}" data-price="${escapeAttr(o.precioNocheNum || 0)}" data-rating="${escapeAttr(o.calificacionNum || 0)}" data-score="${escapeAttr(aiScore ? aiScore.total : 0)}" data-budget="${o.enPresupuesto ? '1' : '0'}">
      <header class="card-header">
        <span class="card-id">Opción ${escapeHtml(o.id)}</span>
        <h2>${escapeHtml(o.nombre)}</h2>
        <div class="meta">
          <span class="price">${escapeHtml(o.precioTotal)} <small>(${escapeHtml(o.precioNoche)}/noche)</small></span>
          <span class="score-chip">IA ${escapeHtml(aiScore ? aiScore.total : 0)}/100</span>
          ${presupuestoBadge}
        </div>
      </header>
      ${galleryHtml}
      <dl class="data">
        <dt>Ubicación</dt><dd>${escapeHtml(o.ubicacion)}</dd>
        <dt>A IFEMA</dt><dd>${escapeHtml(o.distanciaIfema)}</dd>
        <dt>Capacidad</dt><dd>${escapeHtml(o.capacidad)}</dd>
        <dt>Habitaciones</dt><dd>${escapeHtml(o.habitaciones)}</dd>
        <dt>Calificación</dt><dd>${escapeHtml(o.calificacion)}</dd>
      </dl>
      <div class="proscons">
        <div class="pros">
          <h3>Pros</h3>
          <ul>${o.pros.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
        </div>
        <div class="cons">
          <h3>Contras</h3>
          <ul>${o.contras.map(t => `<li>${escapeHtml(t)}</li>`).join('')}</ul>
        </div>
      </div>
      <p class="critica"><strong>Crítica honesta:</strong> ${escapeHtml(o.notaCritica)}</p>
      <div class="card-actions">
        <a class="btn" href="${escapeAttr(o.enlace)}" target="_blank" rel="noopener noreferrer">Ver listado original (${escapeHtml(o.plataforma)}) →</a>
        <a class="btn secondary" href="${escapeAttr(favoriteLink)}" target="_blank" rel="noopener noreferrer">Votar favorito</a>
        <a class="btn danger" href="${escapeAttr(removeLink)}" target="_blank" rel="noopener noreferrer">Quitar opción</a>
      </div>
    </article>`;
  }).join('\n');

  const topThree = optionScores.slice(0, 3);
  const rankingCardsHtml = topThree.map((score, index) => `
      <article class="rank-card">
        <span class="rank-number">#${index + 1}</span>
        <h3>${escapeHtml(score.option.id)} — ${escapeHtml(score.option.nombre)}</h3>
        <p><strong>${escapeHtml(score.total)}/100</strong> · ${escapeHtml(score.reasons)}</p>
      </article>`).join('');
  const aiAnalysisHtml = `
  <section class="analysis-panel" aria-labelledby="analysis-title">
    <div class="analysis-copy">
      <span class="panel-kicker">Análisis IA</span>
      <h2 id="analysis-title">Mejores opciones por equilibrio familiar</h2>
      <p>Este ranking se recalcula cada vez que se actualiza la página: combina precio, presupuesto, calificación, tiempo a IFEMA, formato para 9 personas y disponibilidad de fotos.</p>
    </div>
    <div class="ranking-grid">
${rankingCardsHtml}
    </div>
    <div class="analysis-notes">
      <p><strong>Más barata:</strong> ${escapeHtml(cheapest.id)} — ${escapeHtml(cheapest.nombre)} (${escapeHtml(cheapest.precioNoche)}/noche).</p>
      <p><strong>Premium razonable:</strong> ${premium ? `${escapeHtml(premium.option.id)} — ${escapeHtml(premium.option.nombre)} (${escapeHtml(premium.option.precioNoche)}/noche)` : "No hay una alternativa premium clara con los criterios actuales"}.</p>
      <p><strong>Flujo:</strong> cuando alguien agrega o pide quitar una opción, queda como sugerencia en GitHub; luego se revisa, se completa con fotos/coordenadas y se publica una nueva versión con el análisis recalculado.</p>
    </div>
    <div class="analysis-actions">
      <a class="suggestion-link" href="${escapeAttr(COLABORACION.analisisIa)}" target="_blank" rel="noopener noreferrer">Pedir análisis IA</a>
      <a class="suggestion-link secondary" href="${escapeAttr(COLABORACION.quitarOpcionHospedaje)}" target="_blank" rel="noopener noreferrer">Quitar una opción</a>
    </div>
  </section>`;

  const conclusionesHtml = `
  <section class="conclusiones">
    <h2>Conclusiones y recomendación</h2>
    <div class="recomendacion-principal">
      <span class="tag">Recomendación principal</span>
      <h3>${escapeHtml(conclusiones.recomendacionPrincipal)}</h3>
      <p>${escapeHtml(conclusiones.razonRecomendacion)}</p>
    </div>
    <div class="bloque-alt">
      <h3>Alternativa premium</h3>
      <p>${escapeHtml(conclusiones.alternativaPremium)}</p>
    </div>
    <div class="bloque-riesgo">
      <h3>⚠ Riesgo de inacción</h3>
      <p>${escapeHtml(conclusiones.riesgo)}</p>
    </div>
  </section>`;

  const proximasCategoriasHtml = `
  <section class="category-panel upcoming" id="comida">
    <div>
      <span class="panel-kicker">Próxima categoría</span>
      <h2>Sitios de comida</h2>
      <p>Restaurantes, mercados, desayunos cerca del alojamiento y lugares fáciles con niños.</p>
    </div>
    <a class="suggestion-link" href="${escapeAttr(COLABORACION.ideasComida)}" target="_blank" rel="noopener noreferrer">Proponer comida</a>
  </section>

  <section class="category-panel upcoming" id="sitios">
    <div>
      <span class="panel-kicker">Próxima categoría</span>
      <h2>Sitios a conocer</h2>
      <p>Planes turísticos, parques, museos, zonas para caminar y visitas que encajen con los tiempos del GP.</p>
    </div>
    <a class="suggestion-link" href="${escapeAttr(COLABORACION.ideasSitios)}" target="_blank" rel="noopener noreferrer">Proponer sitio</a>
  </section>

  <section class="category-panel upcoming" id="ideas">
    <div>
      <span class="panel-kicker">Buzón familiar</span>
      <h2>Ideas y preferencias</h2>
      <p>Espacio para preferencias, restricciones, dudas, horarios y cualquier idea que ayude a ordenar el viaje.</p>
    </div>
    <a class="suggestion-link" href="${escapeAttr(COLABORACION.ideasGenerales)}" target="_blank" rel="noopener noreferrer">Dejar idea</a>
  </section>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="referrer" content="no-referrer">
<meta name="description" content="Comparativa familiar de alojamientos en Madrid para el viaje al Gran Premio de España de F1 2026.">
<title>Alojamiento Madrid F1 2026 — Comparativa</title>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin>
<style>
  * { box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
         margin: 0; padding: 0; background: #f5f5f7; color: #1d1d1f; line-height: 1.5; }
  .container { max-width: 1500px; margin: 0 auto; padding: 32px 24px; }
  header.top { text-align: center; margin-bottom: 32px; padding: 24px 0;
               border-bottom: 2px solid #e0e0e5; }
  header.top h1 { color: #1F3864; margin: 0 0 6px; font-size: 30px; font-weight: 700; }
  header.top .subtitle { color: #555; margin: 0; font-size: 15px; }
  section.intro { background: white; border-radius: 14px; padding: 28px;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 32px; }
  section.intro h2 { color: #1F3864; margin: 0 0 20px; font-size: 22px; }
  .intro-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px 32px; }
  .intro-grid .full { grid-column: 1 / -1; }
  .intro-grid h3 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.6px;
                   color: #2E75B6; margin: 0 0 6px; }
  .intro-grid p, .intro-grid ul { margin: 0; font-size: 14px; }
  .intro-grid ul { padding-left: 20px; }
  .intro-grid ul.criteria li { margin-bottom: 4px; }
  h2.section-title { color: #1F3864; font-size: 22px; margin: 32px 0 16px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(440px, 1fr)); gap: 22px; }
  .card { background: white; border-radius: 14px; overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08); display: flex; flex-direction: column; }
  .card-header { padding: 18px 22px 14px; border-bottom: 1px solid #eee; }
  .card-id { display: inline-block; background: #1F3864; color: white; font-size: 11.5px;
             padding: 3px 11px; border-radius: 12px; font-weight: 600; margin-bottom: 10px;
             letter-spacing: 0.3px; }
  .card-header h2 { margin: 0 0 10px; font-size: 19px; line-height: 1.3; color: #1d1d1f; }
  .meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .price { font-size: 21px; font-weight: 700; color: #1d1d1f; }
  .price small { font-weight: 400; color: #666; font-size: 13px; }
  .badge { font-size: 11px; padding: 3px 10px; border-radius: 10px; font-weight: 600;
           letter-spacing: 0.3px; }
  .badge.ok { background: #d4edda; color: #155724; }
  .badge.warn { background: #fff3cd; color: #856404; }
  .score-chip { font-size: 11px; padding: 3px 10px; border-radius: 10px;
                background: #e9eef7; color: #1F3864; font-weight: 700; }
  .gallery { background: #f0f0f3; }
  .gallery .photo-main { display: block; width: 100%; height: 280px; overflow: hidden; }
  .gallery .photo-main img { width: 100%; height: 100%; object-fit: cover; display: block;
                              transition: transform 0.3s; }
  .gallery .photo-main:hover img { transform: scale(1.03); }
  .gallery .thumbs { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2px;
                     padding: 2px; background: #e8e8ed; }
  .gallery .photo-thumb { display: block; aspect-ratio: 1.4 / 1; overflow: hidden;
                          background: #ddd; }
  .gallery .photo-thumb img { width: 100%; height: 100%; object-fit: cover; display: block;
                               transition: transform 0.2s; }
  .gallery .photo-thumb:hover img { transform: scale(1.08); }
  .gallery .no-photo { display: flex; align-items: center; justify-content: center;
                       height: 240px; color: #888; font-style: italic;
                       text-align: center; padding: 20px; }
  dl.data { padding: 16px 22px; margin: 0;
            display: grid; grid-template-columns: 110px 1fr; row-gap: 6px; column-gap: 10px;
            font-size: 13.5px; border-bottom: 1px solid #eee; }
  dl.data dt { font-weight: 600; color: #555; }
  dl.data dd { margin: 0; color: #1d1d1f; }
  .proscons { padding: 16px 22px; display: grid; grid-template-columns: 1fr 1fr; gap: 14px;
              border-bottom: 1px solid #eee; }
  .proscons h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.6px; }
  .pros h3 { color: #155724; }
  .cons h3 { color: #721c24; }
  .proscons ul { margin: 0; padding-left: 18px; font-size: 12.5px; line-height: 1.5; }
  .proscons li { margin-bottom: 4px; }
  .critica { padding: 16px 22px; font-size: 13px; line-height: 1.55;
             background: #fff8e6; border-bottom: 1px solid #eee; margin: 0; }
  .btn { display: block; padding: 14px 22px; text-align: center; background: #2E75B6;
         color: white; text-decoration: none; font-weight: 600; font-size: 13.5px;
         transition: background 0.2s; }
  .btn:hover { background: #1F3864; }
  .btn.secondary { background: #eef4fb; color: #1F3864; border-top: 1px solid #d8e6f5; }
  .btn.secondary:hover { background: #dceaf8; }
  .btn.danger { background: #fff2f0; color: #9f1d1d; border-top: 1px solid #f0c9c5; }
  .btn.danger:hover { background: #f8ded9; }
  .card-actions { display: grid; grid-template-columns: 1fr 0.55fr 0.55fr; margin-top: auto; }
  .trip-tabs { position: sticky; top: 0; z-index: 5; display: flex; gap: 8px;
               align-items: center; overflow-x: auto; padding: 10px 0 18px;
               background: #f5f5f7; }
  .trip-tabs a { flex: 0 0 auto; color: #1F3864; background: white; border: 1px solid #d8e0eb;
                 padding: 9px 13px; border-radius: 8px; font-size: 13px; font-weight: 650;
                 text-decoration: none; }
  .trip-tabs a.active { color: white; background: #1F3864; border-color: #1F3864; }
  .collab-bar { background: #ffffff; border: 1px solid #d8e0eb; border-radius: 12px;
                padding: 16px 18px; margin-bottom: 24px; display: flex; gap: 14px;
                align-items: center; justify-content: space-between; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
  .collab-bar h2 { margin: 0 0 4px; color: #1F3864; font-size: 18px; }
  .collab-bar p { margin: 0; color: #555; font-size: 13.5px; }
  .collab-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
  .suggestion-link { display: inline-block; color: white; background: #2E75B6;
                     padding: 10px 14px; border-radius: 8px; text-decoration: none;
                     font-size: 13px; font-weight: 650; white-space: nowrap; }
  .suggestion-link.secondary { color: #1F3864; background: #eef4fb; border: 1px solid #d8e6f5; }
  .category-panel { background: white; border: 1px solid #e1e5eb; border-radius: 12px;
                    padding: 22px; margin-top: 22px; display: flex; gap: 16px;
                    align-items: center; justify-content: space-between; }
  .category-panel h2 { margin: 4px 0 6px; color: #1F3864; font-size: 20px; }
  .category-panel p { margin: 0; color: #555; font-size: 14px; }
  .panel-kicker { color: #2E75B6; font-size: 11px; font-weight: 750;
                  letter-spacing: 0.5px; text-transform: uppercase; }
  .analysis-panel { background: #ffffff; border: 1px solid #d8e0eb; border-radius: 14px;
                    padding: 24px; margin: 0 0 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
  .analysis-copy { max-width: 900px; margin-bottom: 18px; }
  .analysis-copy h2 { color: #1F3864; margin: 4px 0 8px; font-size: 22px; }
  .analysis-copy p { margin: 0; color: #555; font-size: 14px; line-height: 1.6; }
  .ranking-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
  .rank-card { border: 1px solid #e1e5eb; border-radius: 10px; padding: 16px;
               background: #f8fafc; }
  .rank-number { display: inline-block; color: white; background: #1F3864;
                 border-radius: 999px; padding: 3px 9px; font-size: 11px; font-weight: 750; }
  .rank-card h3 { margin: 10px 0 8px; font-size: 16px; color: #1d1d1f; line-height: 1.3; }
  .rank-card p { margin: 0; color: #555; font-size: 13px; line-height: 1.45; }
  .analysis-notes { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr));
                    gap: 12px; margin-top: 16px; }
  .analysis-notes p { margin: 0; padding: 12px; border-radius: 8px; background: #f0f7fc;
                      color: #263241; font-size: 13px; line-height: 1.45; }
  .analysis-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 16px; }
  section.conclusiones { background: white; border-radius: 14px; padding: 28px;
                          box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-top: 32px; }
  section.conclusiones h2 { color: #1F3864; margin: 0 0 20px; font-size: 22px; }
  .recomendacion-principal { background: linear-gradient(135deg, #d4edda, #e8f5ee);
                              padding: 20px; border-radius: 10px; margin-bottom: 18px;
                              border-left: 4px solid #155724; }
  .recomendacion-principal .tag { font-size: 11px; color: #155724; font-weight: 700;
                                   text-transform: uppercase; letter-spacing: 0.6px; }
  .recomendacion-principal h3 { margin: 6px 0 10px; font-size: 19px; color: #155724; }
  .recomendacion-principal p { margin: 0; font-size: 14px; line-height: 1.6; }
  .bloque-alt { padding: 18px 20px; border-radius: 10px; background: #f0f7fc;
                margin-bottom: 14px; border-left: 4px solid #2E75B6; }
  .bloque-alt h3 { margin: 0 0 8px; font-size: 16px; color: #1F3864; }
  .bloque-alt p { margin: 0; font-size: 14px; line-height: 1.6; }
  .bloque-riesgo { padding: 18px 20px; border-radius: 10px; background: #fff3cd;
                   border-left: 4px solid #856404; }
  .bloque-riesgo h3 { margin: 0 0 8px; font-size: 16px; color: #856404; }
  .bloque-riesgo p { margin: 0; font-size: 14px; line-height: 1.6; }
  footer { text-align: center; color: #888; font-size: 12px; margin-top: 32px;
           padding: 20px 0; border-top: 1px solid #e0e0e5; }
  /* ========== FILTROS ========== */
  .filters { background: white; border-radius: 14px; padding: 16px 20px;
             box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 22px;
             display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
  .filter-label { font-size: 12px; font-weight: 700; color: #555;
                  text-transform: uppercase; letter-spacing: 0.6px; }
  .filter-label.spaced { margin-left: 16px; }
  .filters button { background: #f0f0f3; border: 1px solid #d0d0d5; color: #1d1d1f;
                    padding: 8px 14px; border-radius: 8px; font-size: 13px; cursor: pointer;
                    font-weight: 500; transition: all 0.15s; }
  .filters button:hover { background: #e0e0e5; border-color: #b0b0b5; }
  .filters button.active { background: #2E75B6; color: white; border-color: #1F3864; }
  .filters .filter-budget.active { background: #2e7d32; border-color: #155724; }
  .filters .filter-reset { background: #fff; }
  .card.hidden { display: none; }

  /* ========== MAPA ========== */
  section.map-section { background: white; border-radius: 14px; padding: 28px;
                         box-shadow: 0 2px 8px rgba(0,0,0,0.06); margin-bottom: 32px; }
  section.map-section h2 { color: #1F3864; margin: 0 0 12px; font-size: 22px; }
  .map-legend { margin: 0 0 16px; font-size: 13px; color: #555; }
  .map-sync-note { margin: -6px 0 16px; color: #667085; font-size: 12.5px; }
  /* Leaflet critical layout fallback: keeps tiles clipped even if CDN CSS is delayed. */
  .leaflet-container { overflow: hidden; position: relative; touch-action: pan-x pan-y; }
  .leaflet-pane,
  .leaflet-tile,
  .leaflet-marker-icon,
  .leaflet-marker-shadow,
  .leaflet-tile-container,
  .leaflet-pane > svg,
  .leaflet-pane > canvas,
  .leaflet-zoom-box,
  .leaflet-image-layer,
  .leaflet-layer { position: absolute; left: 0; top: 0; }
  .leaflet-container img.leaflet-tile { max-width: none !important; max-height: none !important; }
  .leaflet-tile { width: 256px; height: 256px; user-select: none; visibility: hidden; border: 0; }
  .leaflet-tile-loaded { visibility: inherit; }
  .leaflet-marker-icon,
  .leaflet-marker-shadow { display: block; }
  .leaflet-control { position: relative; z-index: 800; pointer-events: auto; }
  .leaflet-top,
  .leaflet-bottom { position: absolute; z-index: 1000; pointer-events: none; }
  .leaflet-top { top: 0; }
  .leaflet-right { right: 0; }
  .leaflet-bottom { bottom: 0; }
  .leaflet-left { left: 0; }
  .leg-dot { display: inline-block; width: 12px; height: 12px; border-radius: 50%;
             vertical-align: middle; margin-right: 4px; border: 2px solid white;
             box-shadow: 0 0 0 1px #888; }
  .leg-dot.ifema { background: #d32f2f; }
  .leg-dot.ok { background: #2e7d32; }
  .leg-dot.warn { background: #f9a825; }
  #map { height: 480px; border-radius: 10px; border: 1px solid #ddd; z-index: 1; }
  .map-marker { width: 30px; height: 30px; border-radius: 50%; border: 3px solid white;
                box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center;
                justify-content: center; color: white; font-weight: 700; font-size: 12px; }
  .map-marker.ifema { background: #d32f2f; font-size: 11px; }
  .map-marker.ok { background: #2e7d32; }
  .map-marker.warn { background: #f9a825; }
  .map-popup { font-size: 13px; min-width: 200px; }
  .map-popup b { display: block; margin-bottom: 4px; font-size: 14px; color: #1F3864; }
  .map-popup .pop-price { font-weight: 700; font-size: 14px; }
  .map-popup .pop-muted { font-size: 12px; color: #666; }
  .map-popup .pop-muted.first { margin-top: 4px; }
  .map-popup .pop-link { display: block; margin-top: 6px; color: #2E75B6; text-decoration: none; }
  .map-popup .pop-link:hover { text-decoration: underline; }

  @media print {
    body { background: white; }
    .card { break-inside: avoid; box-shadow: none; border: 1px solid #ccc; }
    .btn { display: none; }
    section.map-section { display: none; }
  }

  @media (max-width: 700px) {
    .container { padding: 20px 14px; }
    header.top { margin-bottom: 22px; padding: 18px 0; }
    header.top h1 { font-size: 24px; line-height: 1.25; }
    header.top .subtitle { font-size: 13.5px; }
    section.intro,
    section.map-section,
    .analysis-panel,
    section.conclusiones { padding: 20px; border-radius: 10px; }
    .intro-grid,
    .proscons,
    .ranking-grid,
    .analysis-notes { grid-template-columns: 1fr; }
    .grid { grid-template-columns: minmax(0, 1fr); gap: 18px; }
    .card { border-radius: 10px; }
    .card-header h2 { font-size: 17px; overflow-wrap: anywhere; }
    .gallery .photo-main { height: 220px; }
    dl.data { grid-template-columns: 92px minmax(0, 1fr); padding: 14px 18px; }
    .proscons,
    .critica { padding: 14px 18px; }
    .filters { align-items: stretch; padding: 14px; }
    .trip-tabs { padding-bottom: 12px; }
    .collab-bar,
    .category-panel { align-items: stretch; flex-direction: column; border-radius: 10px; }
    .collab-actions { justify-content: stretch; }
    .suggestion-link { text-align: center; white-space: normal; }
    .card-actions { grid-template-columns: 1fr; }
    .filter-label { flex: 1 0 100%; }
    .filter-label.spaced { margin-left: 0; }
    .filters button { flex: 1 1 100%; text-align: left; }
    #map { height: 360px; }
  }
</style>
</head>
<body>
<div class="container">
  <header class="top">
    <h1>Alojamiento Madrid — F1 Spanish Grand Prix 2026</h1>
    <p class="subtitle">Comparativa visual · Familia ${escapeHtml(VIAJE.totalPersonas)} personas · ${escapeHtml(VIAJE.fechaInicio)} al ${escapeHtml(VIAJE.fechaFin)} · Documento generado el ${escapeHtml(FECHA_GENERACION)}</p>
  </header>

  <nav class="trip-tabs" aria-label="Categorías del viaje">
    <a class="active" href="#hospedaje">Hospedaje</a>
    <a href="#comida">Comida</a>
    <a href="#sitios">Sitios a conocer</a>
    <a href="#ideas">Ideas familiares</a>
  </nav>

${introHtml}

  <section class="collab-bar" aria-labelledby="colaborar-title">
    <div>
      <h2 id="colaborar-title">Colaboración familiar</h2>
      <p>Las sugerencias y votos se guardan como entradas en GitHub para revisarlas y sumarlas al tablero.</p>
    </div>
    <div class="collab-actions">
      <a class="suggestion-link" href="${escapeAttr(COLABORACION.nuevaOpcionHospedaje)}" target="_blank" rel="noopener noreferrer">Agregar hospedaje</a>
      <a class="suggestion-link secondary" href="${escapeAttr(COLABORACION.quitarOpcionHospedaje)}" target="_blank" rel="noopener noreferrer">Quitar hospedaje</a>
      <a class="suggestion-link secondary" href="${escapeAttr(COLABORACION.analisisIa)}" target="_blank" rel="noopener noreferrer">Pedir análisis IA</a>
      <a class="suggestion-link secondary" href="${escapeAttr(REPO.url + '/issues')}" target="_blank" rel="noopener noreferrer">Ver sugerencias</a>
    </div>
  </section>

${aiAnalysisHtml}

  <section id="hospedaje">
  <section class="map-section">
    <h2>📍 Mapa de ubicaciones</h2>
    <p class="map-legend">
      <span class="leg-dot ifema"></span> IFEMA / Circuito MADRING ·
      <span class="leg-dot ok"></span> En presupuesto ·
      <span class="leg-dot warn"></span> Excede presupuesto
    </p>
    <p class="map-sync-note">El mapa se genera desde las opciones publicadas: si una opción nueva queda aprobada y tiene coordenadas, aparece automáticamente en la siguiente actualización.</p>
    <div id="map"></div>
  </section>

  <h2 class="section-title">Opciones de alojamiento (<span id="card-count">${OPCIONES.length}</span>)</h2>

  <div class="filters">
    <span class="filter-label">Ordenar:</span>
    <button type="button" data-action="sort-price-asc">💰 Precio ↑ (más barato)</button>
    <button type="button" data-action="sort-price-desc">💰 Precio ↓ (más caro)</button>
    <button type="button" data-action="sort-rating">⭐ Calificación (mejor)</button>
    <button type="button" data-action="sort-score">IA (mejor encaje)</button>
    <span class="filter-label spaced">Filtrar:</span>
    <button type="button" data-action="budget" class="filter-budget">✓ Solo en presupuesto</button>
    <button type="button" data-action="reset" class="filter-reset">↻ Mostrar todas</button>
  </div>

  <main class="grid" id="cards-grid">
${cardHtml}
  </main>
  </section>

${conclusionesHtml}

${proximasCategoriasHtml}

  <footer>
    Las fotos provienen directamente de los CDN de Airbnb y Booking.<br>
    Si no cargan, abre la página original con el botón "Ver listado original".<br>
    Para imprimir o guardar como PDF: Cmd/Ctrl + P → Guardar como PDF.
  </footer>
</div>

<script>
// ========== FILTROS Y ORDEN DINÁMICO ==========
(function(){
  const grid = document.getElementById('cards-grid');
  const countEl = document.getElementById('card-count');
  const buttons = document.querySelectorAll('.filters button');
  const allCards = Array.from(grid.querySelectorAll('.card'));
  const totalCards = allCards.length;
  let onlyBudget = false;

  function applyFilter() {
    let visible = 0;
    allCards.forEach(c => {
      const inBudget = c.dataset.budget === '1';
      const show = !onlyBudget || inBudget;
      c.classList.toggle('hidden', !show);
      if (show) visible++;
    });
    countEl.textContent = visible + (visible !== totalCards ? ' de ' + totalCards : '');
  }

  function sortBy(key, dir) {
    const sorted = allCards.slice().sort((a, b) => {
      const va = parseFloat(a.dataset[key]) || 0;
      const vb = parseFloat(b.dataset[key]) || 0;
      return dir === 'asc' ? va - vb : vb - va;
    });
    sorted.forEach(c => grid.appendChild(c));
  }

  function clearActive() {
    buttons.forEach(b => b.classList.remove('active'));
  }

  buttons.forEach(btn => btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (action === 'sort-price-asc') { clearActive(); btn.classList.add('active'); sortBy('price','asc'); }
    else if (action === 'sort-price-desc') { clearActive(); btn.classList.add('active'); sortBy('price','desc'); }
    else if (action === 'sort-rating') { clearActive(); btn.classList.add('active'); sortBy('rating','desc'); }
    else if (action === 'sort-score') { clearActive(); btn.classList.add('active'); sortBy('score','desc'); }
    else if (action === 'budget') {
      onlyBudget = !onlyBudget;
      btn.classList.toggle('active', onlyBudget);
      applyFilter();
    }
    else if (action === 'reset') {
      onlyBudget = false;
      clearActive();
      // restaurar orden original
      OPCIONES_ORDER.forEach(id => {
        const c = grid.querySelector('[data-id="' + id + '"]');
        if (c) grid.appendChild(c);
      });
      applyFilter();
    }
  }));

  // Guardar orden original
  const OPCIONES_ORDER = allCards.map(c => c.dataset.id);
})();
</script>

<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin></script>
<script>
(function(){
  const COORDS = ${jsonForScript(COORDS)};
  const OPCIONES = ${jsonForScript(OPCIONES.map(o => ({
    id: o.id, nombre: o.nombre, precioTotal: o.precioTotal, precioNoche: o.precioNoche,
    enPresupuesto: o.enPresupuesto, enlace: o.enlace, ubicacion: o.ubicacion,
    distanciaIfema: o.distanciaIfema, plataforma: o.plataforma,
    scoreIa: scoreById.get(o.id) ? scoreById.get(o.id).total : 0
  })))};

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  const map = L.map('map').setView([40.4350, -3.6800], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© <a href="https://openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  function makeIcon(cls, label) {
    return L.divIcon({
      className: '',
      html: '<div class="map-marker ' + escapeAttr(cls) + '">' + escapeHtml(label) + '</div>',
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      popupAnchor: [0, -16]
    });
  }

  // Marcador IFEMA
  L.marker(COORDS.IFEMA, { icon: makeIcon('ifema', 'F1') })
    .addTo(map)
    .bindPopup('<div class="map-popup"><b>🏁 IFEMA / Circuito MADRING</b>Sede del GP de España F1 · 11-13 sept 2026</div>');

  // Marcadores de cada opción
  const bounds = [COORDS.IFEMA];
  OPCIONES.forEach(function(o){
    const c = COORDS[o.id];
    if (!c) return;
    bounds.push(c);
    const cls = o.enPresupuesto ? 'ok' : 'warn';
    const popupHtml = '<div class="map-popup">' +
      '<b>' + escapeHtml(o.id + ' — ' + o.nombre) + '</b>' +
      '<span class="pop-price">' + escapeHtml(o.precioTotal + ' (' + o.precioNoche + '/noche)') + '</span>' +
      '<div class="pop-muted first">IA: ' + escapeHtml(o.scoreIa + '/100') + '</div>' +
      '<div class="pop-muted first">' + escapeHtml(o.ubicacion) + '</div>' +
      '<div class="pop-muted">A IFEMA: ' + escapeHtml(o.distanciaIfema) + '</div>' +
      '<a class="pop-link" href="' + escapeAttr(o.enlace) + '" target="_blank" rel="noopener noreferrer">Ver en ' + escapeHtml(o.plataforma) + ' →</a>' +
      '</div>';
    L.marker(c, { icon: makeIcon(cls, o.id) })
      .addTo(map)
      .bindPopup(popupHtml);
  });

  // Ajustar vista para que entren todos los marcadores
  map.fitBounds(bounds, { padding: [40, 40] });
})();
</script>
</body>
</html>`;
}

// ===================== ESCRIBIR ARCHIVO ==========================
const baseFolder = __dirname;
validateOptions();
const html = buildHtml() + "\n";
const htmlPaths = OUTPUT_FILES.map(fileName => path.join(baseFolder, fileName));
htmlPaths.forEach(htmlPath => fs.writeFileSync(htmlPath, html));
console.log("OK HTML: " + htmlPaths.join(", ") + " (" + html.length + " bytes)");
console.log("Opciones incluidas: " + OPCIONES.length);
console.log("Opciones con fotos: " + OPCIONES.filter(o => o.fotos && o.fotos.length > 0).length);
console.log("Opciones en presupuesto: " + OPCIONES.filter(o => o.enPresupuesto).length);
