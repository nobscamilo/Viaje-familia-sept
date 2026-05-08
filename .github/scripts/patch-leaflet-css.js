const fs = require("fs");

const files = ["index.html", "Alojamiento_Madrid_F1_2026.html"];
const repoUrl = "https://github.com/nobscamilo/Viaje-familia-sept";
const wrongLeafletCssIntegrity = "sha256-p4NxAoJBhIINfQhDYGHP9CyQfQwMREWCYxfvERjvBMc=";
const correctLeafletCssIntegrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
const marker = "/* Leaflet critical layout fallback */";
const budgetMax = 600;

const photos = {
  A: [
    "https://a0.muscache.com/im/pictures/hosting/Hosting-756567161759468410/original/073a1980-2004-4597-9dab-d966a90cddb2.jpeg?im_w=720",
    "https://a0.muscache.com/im/pictures/hosting/Hosting-756567161759468410/original/dbaabb46-e3a0-41b3-9a7e-44b06cec7d97.jpeg?im_w=720"
  ],
  B: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/714647177.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/714647154.jpg"
  ],
  D: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/768544224.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/768544198.jpg"
  ],
  E: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/833087671.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/399300647.jpg"
  ],
  F: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/782950816.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/782950820.jpg"
  ],
  G: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/143563156.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/143563854.jpg"
  ],
  H: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/178969113.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/178997800.jpg"
  ],
  I: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/347938715.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/60334658.jpg"
  ],
  J: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/405515654.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/749302912.jpg"
  ],
  K: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/492740812.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/492740873.jpg"
  ],
  L: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/833058848.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/833058666.jpg"
  ],
  M: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/492740789.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/492740967.jpg"
  ],
  N: [
    "https://cf.bstatic.com/xdata/images/hotel/max1024x768/443029536.jpg",
    "https://cf.bstatic.com/xdata/images/hotel/max500/442666355.jpg"
  ]
};

const criticalLeafletCss = `${marker}
.leaflet-container{overflow:hidden;position:relative;touch-action:pan-x pan-y;}
.leaflet-pane,.leaflet-tile,.leaflet-marker-icon,.leaflet-marker-shadow,.leaflet-tile-container,.leaflet-pane>svg,.leaflet-pane>canvas,.leaflet-zoom-box,.leaflet-image-layer,.leaflet-layer{position:absolute;left:0;top:0;}
.leaflet-container img.leaflet-tile{max-width:none!important;max-height:none!important;}
.leaflet-tile{width:256px;height:256px;user-select:none;visibility:hidden;border:0;}
.leaflet-tile-loaded{visibility:inherit;}
.leaflet-marker-icon,.leaflet-marker-shadow{display:block;}
.leaflet-control{position:relative;z-index:800;pointer-events:auto;}
.leaflet-top,.leaflet-bottom{position:absolute;z-index:1000;pointer-events:none;}
.leaflet-top{top:0;}.leaflet-right{right:0;}.leaflet-bottom{bottom:0;}.leaflet-left{left:0;}
.leaflet-control-container .leaflet-control{clear:both;}
`;

const enhancedCss = `
.analysis-panel{background:#fff;border:1px solid var(--line);border-radius:10px;padding:18px;margin:0 0 18px}
.analysis-panel h2{margin:4px 0 8px;font-size:22px}
.analysis-kicker{color:var(--blue);font-size:11px;font-weight:800;letter-spacing:.5px;text-transform:uppercase}
.ranking-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
.rank-card{background:#f8fafc;border:1px solid var(--line);border-radius:9px;padding:14px}
.rank-card b{display:inline-grid;place-items:center;background:var(--blue);color:#fff;border-radius:999px;min-width:30px;height:24px;margin-bottom:8px;font-size:12px}
.rank-card h3{margin:0 0 6px;font-size:16px;line-height:1.25}
.rank-card p{font-size:13px;color:var(--muted)}
.analysis-notes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:12px}
.analysis-notes p{background:#f0f7fc;border-radius:8px;padding:10px;color:#263241;font-size:13px}
.photo-strip{display:grid;grid-template-columns:1.4fr .8fr;gap:4px;background:#eef2f6;border-radius:9px;overflow:hidden}
.photo-strip a{min-height:145px;background:#d9e1ea}
.photo-strip a:first-child{min-height:210px}
.photo-strip img{display:block;width:100%;height:100%;object-fit:cover}
.score-chip{background:#e9eef7!important;color:var(--blue);font-weight:800}
.actions a.danger,.buttons a.danger{background:#fff2f0;color:#9f1d1d;border:1px solid #f0c9c5}
.map-sync-note{margin-top:8px!important;color:#667085!important;font-size:12.5px!important}
@media(max-width:760px){.ranking-grid,.analysis-notes,.photo-strip{grid-template-columns:1fr}.photo-strip a,.photo-strip a:first-child{min-height:190px}}
`;

function esc(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function issueUrl(title, body) {
  return `${repoUrl}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
}

function money(value) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0
  }).format(value);
}

function proxied(url) {
  if (url.includes("cf.bstatic.com") || url.includes("q-xx.bstatic.com")) {
    return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=720`;
  }
  return url;
}

function extractOptions(html) {
  const match = html.match(/const options=(\[[\s\S]*?\]);\s*const order=/);
  if (!match) return [];
  return JSON.parse(match[1]);
}

function minutesToIfema(value = "") {
  const matches = String(value).match(/\d+/g);
  if (!matches || matches.length === 0) return 35;
  const nums = matches.map(Number);
  return nums.length === 1 ? nums[0] : (nums[0] + nums[1]) / 2;
}

function pctOverBudget(price) {
  return Math.round(((price - budgetMax) / budgetMax) * 100);
}

function scoreOptions(options) {
  const prices = options.map(option => option.noche);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;
  return options.map(option => {
    const priceScore = ((maxPrice - option.noche) / range) * 28;
    const ratingScore = (option.rating / 10) * 24;
    const distanceScore = Math.min(1, Math.max(0, (45 - minutesToIfema(option.ifema)) / 25)) * 16;
    const budgetScore = option.presupuesto ? 18 : Math.max(0, 12 - pctOverBudget(option.noche) * 0.45);
    const text = `${option.capacidad} ${option.habitaciones}`.toLowerCase();
    const groupScore = /apartamento entero|loft entero|casa entera/.test(text) && !/2 apartamentos|2 unidades|2 suites/.test(text)
      ? 14
      : 9;
    const photoScore = photos[option.id] ? 5 : 0;
    const reasons = [
      option.presupuesto ? "entra en presupuesto" : `excede ${pctOverBudget(option.noche)}% el presupuesto`,
      option.rating >= 8.5 ? "muy buena calificacion" : option.rating < 7 ? "calificacion floja" : "calificacion correcta",
      minutesToIfema(option.ifema) <= 30 ? "trayecto favorable a IFEMA" : "trayecto dentro del rango"
    ];
    return {
      ...option,
      score: Math.round(priceScore + ratingScore + distanceScore + budgetScore + groupScore + photoScore),
      reasons: reasons.join(", ")
    };
  }).sort((a, b) => b.score - a.score || a.noche - b.noche);
}

function galleryFor(option) {
  const optionPhotos = photos[option.id] || [];
  if (optionPhotos.length === 0) return "";
  return `<div class="photo-strip">${optionPhotos.map(url =>
    `<a href="${esc(option.url)}" target="_blank" rel="noopener noreferrer"><img src="${esc(proxied(url))}" alt="${esc(option.nombre)}" loading="lazy" referrerpolicy="no-referrer"></a>`
  ).join("")}</div>`;
}

function removeLink(option) {
  return issueUrl(
    `Quitar hospedaje: opcion ${option.id}`,
    [`Propongo quitar: ${option.id} - ${option.nombre}`, "", "Motivo:", "", "Tu nombre:"].join("\n")
  );
}

function analysisLink() {
  return issueUrl(
    "Pedir analisis IA de hospedajes",
    ["Que quieres que compare o revise la IA:", "", "Opciones involucradas:", "", "Restricciones nuevas:", "", "Tu nombre:"].join("\n")
  );
}

function enhanceHtml(html) {
  html = html.replaceAll(wrongLeafletCssIntegrity, correctLeafletCssIntegrity);
  if (!html.includes(marker)) {
    html = html.replace("</style>", `${criticalLeafletCss}\n</style>`);
  }
  if (html.includes("analysis-panel")) return html;

  const options = extractOptions(html);
  if (options.length === 0) return html;

  const scored = scoreOptions(options);
  const scoreById = new Map(scored.map(option => [option.id, option]));
  const cheapest = options.slice().sort((a, b) => a.noche - b.noche)[0];
  const premium = scored.find(option => !option.presupuesto && option.rating >= 8.2 && option.noche <= 750) || scored.find(option => !option.presupuesto);
  const rankCards = scored.slice(0, 3).map((option, index) => `
  <article class="rank-card"><b>#${index + 1}</b><h3>${esc(option.id)} - ${esc(option.nombre)}</h3><p><strong>${option.score}/100</strong> · ${esc(option.reasons)}</p></article>`).join("");
  const analysis = `<section class="analysis-panel" aria-labelledby="analysis-title">
  <span class="analysis-kicker">Analisis IA</span>
  <h2 id="analysis-title">Mejores opciones por equilibrio familiar</h2>
  <p>Este ranking se recalcula en cada publicacion: combina precio, presupuesto, calificacion, tiempo a IFEMA, formato para 9 personas y disponibilidad de fotos.</p>
  <div class="ranking-grid">${rankCards}</div>
  <div class="analysis-notes">
    <p><strong>Mas barata:</strong> ${esc(cheapest.id)} - ${esc(cheapest.nombre)} (${money(cheapest.noche)}/noche).</p>
    <p><strong>Premium razonable:</strong> ${premium ? `${esc(premium.id)} - ${esc(premium.nombre)} (${money(premium.noche)}/noche)` : "Sin alternativa premium clara"}.</p>
    <p><strong>Flujo:</strong> cada propuesta queda en GitHub; luego se revisa con IA, se completa con fotos/coordenadas y se publica una nueva version.</p>
  </div>
</section>`;

  html = html.replace("</style>", `${enhancedCss}\n</style>`);
  html = html.replace(
    ">Agregar hospedaje</a><a class=\"secondary\"",
    `>Agregar hospedaje</a><a class="secondary" href="${esc(analysisLink())}" target="_blank" rel="noopener noreferrer">Pedir analisis IA</a><a class="danger" href="${esc(issueUrl("Quitar opcion de hospedaje", "Opcion a quitar:\\n\\nMotivo:\\n\\nTu nombre:"))}" target="_blank" rel="noopener noreferrer">Quitar hospedaje</a><a class="secondary"`
  );
  html = html.replace("</section>\n<section id=\"hospedaje\">", `</section>\n${analysis}\n<section id="hospedaje">`);
  html = html.replace(
    "<p>Marcadores verdes: opciones dentro del presupuesto orientativo de 600 EUR/noche. Marcador rojo: IFEMA / MADRING.</p><div id=\"map\">",
    "<p>Marcadores verdes: opciones dentro del presupuesto orientativo de 600 EUR/noche. Marcador rojo: IFEMA / MADRING.</p><p class=\"map-sync-note\">El mapa se genera desde las opciones publicadas: si una opcion nueva queda aprobada y tiene coordenadas, aparece automaticamente en la siguiente actualizacion.</p><div id=\"map\">"
  );
  html = html.replace(
    "<button data-sort=\"rating-desc\">Mejor rating</button>",
    "<button data-sort=\"rating-desc\">Mejor rating</button><button data-sort=\"score-desc\">Mejor IA</button>"
  );
  html = html.replace(
    "if(btn.dataset.sort==='rating-desc'){btn.classList.add('active');sortCards('rating','desc')}",
    "if(btn.dataset.sort==='rating-desc'){btn.classList.add('active');sortCards('rating','desc')}if(btn.dataset.sort==='score-desc'){btn.classList.add('active');sortCards('score','desc')}"
  );

  html = html.replace(/<article class="card" data-id="([^"]+)"([^>]*)>([\s\S]*?)<\/article>/g, (block, id, attrs, inner) => {
    const option = scoreById.get(id);
    if (!option) return block;
    let updated = `<article class="card" data-id="${id}" data-score="${option.score}"${attrs}>${inner}</article>`;
    updated = updated.replace("<div class=\"score-row\">", `${galleryFor(option)}\n    <div class="score-row">`);
    updated = updated.replace(/(<div class="score-row">[\s\S]*?)(<\/div>\s*<dl>)/, `$1<span class="score-chip">IA ${option.score}/100</span>$2`);
    updated = updated.replace(/(<div class="actions">[\s\S]*?)(<\/div>\s*<\/article>)/, `$1<a class="danger" href="${esc(removeLink(option))}" target="_blank" rel="noopener noreferrer">Quitar opcion</a>$2`);
    return updated;
  });

  return html;
}

for (const file of files) {
  const html = enhanceHtml(fs.readFileSync(file, "utf8"));
  fs.writeFileSync(file, html);
  console.log(`Patched and enhanced ${file}`);
}
