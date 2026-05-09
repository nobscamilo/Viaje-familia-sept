# Viaje Septiembre 2026

Sitio estático para compartir con la familia las opciones iniciales de hospedaje en Madrid para septiembre de 2026.

## Flujo normal

Camilo puede enviar un link nuevo de Airbnb, Booking u otra plataforma. La actualización esperada es revisar la opción, compararla contra las opciones existentes, agregarla a `generar_alojamiento.js` y publicar el cambio.

La familia puede abrir sugerencias desde la página usando los botones de colaboración. Esas sugerencias quedan como GitHub Issues para revisarlas y convertirlas en nuevas opciones comparadas.

## Actualizar la página

1. Edita `generar_alojamiento.js`.
2. Ejecuta el generador:

```bash
node generar_alojamiento.js
```

3. Revisa `index.html` localmente.
4. Publica los cambios en `main`.

El workflow `Publish GitHub Pages` genera el HTML y publica la rama `gh-pages` automáticamente.

## Activar GitHub Pages

El workflow ya deja lista la rama `gh-pages`, pero la primera activación de Pages debe hacerse desde la configuración del repositorio:

1. En GitHub, abre `Settings` → `Pages`.
2. En `Build and deployment`, elige `Deploy from a branch`.
3. Selecciona `gh-pages` y carpeta `/ (root)`.
4. Guarda.

Después de eso, el sitio quedará en:

https://nobscamilo.github.io/Viaje-familia-sept/

Cada push futuro a `main` regenerará y publicará la página en `gh-pages`.
