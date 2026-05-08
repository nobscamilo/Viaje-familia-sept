# Viaje Septiembre 2026

Sitio estático para compartir con la familia las opciones del viaje.

## Flujo normal

Camilo puede enviar un link nuevo de Airbnb, Booking u otra plataforma. La actualización esperada es revisar la opción, compararla contra las opciones existentes, agregarla a la página y publicar el cambio.

La familia puede abrir sugerencias desde la página usando los botones de colaboración. Esas sugerencias quedan como GitHub Issues para revisarlas y convertirlas en nuevas opciones comparadas.

## Actualizar la página

1. Edita `generar_alojamiento.js`.
2. Ejecuta el generador:

```bash
node generar_alojamiento.js
```

3. Revisa la página localmente abriendo `index.html` en el navegador.
4. Valida el HTML:

```bash
npx --yes html-validate@latest index.html Alojamiento_Madrid_F1_2026.html
```

5. Publica los cambios con Git:

```bash
git add generar_alojamiento.js index.html Alojamiento_Madrid_F1_2026.html README.md AGENTS.md
git commit -m "Actualiza opciones del viaje"
git push
```

GitHub Pages publicará automáticamente la versión nueva desde la rama `main`.
