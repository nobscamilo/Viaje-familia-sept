const fs = require("fs");

const files = ["index.html", "Alojamiento_Madrid_F1_2026.html"];
const wrongLeafletCssIntegrity = "sha256-p4NxAoJBhIINfQhDYGHP9CyQfQwMREWCYxfvERjvBMc=";
const correctLeafletCssIntegrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
const marker = "/* Leaflet critical layout fallback */";
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

for (const file of files) {
  let html = fs.readFileSync(file, "utf8");
  html = html.replaceAll(wrongLeafletCssIntegrity, correctLeafletCssIntegrity);

  if (!html.includes(marker)) {
    html = html.replace("</style>", `${criticalLeafletCss}\n</style>`);
  }

  fs.writeFileSync(file, html);
  console.log(`Patched Leaflet CSS in ${file}`);
}
