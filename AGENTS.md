# Instrucciones Para Actualizar El Viaje

Este repositorio publica una página estática de comparación de alojamientos para el viaje familiar a Madrid y al GP de España de F1 2026.

## Flujo Con Nuevos Links

Cuando Camilo envíe un nuevo link de alojamiento:

1. Abrir la opción original y verificar información actual para las fechas del viaje.
2. Extraer nombre, plataforma, precio total, precio por noche, capacidad real, habitaciones/camas/baños, calificación, número de reseñas, ubicación, fotos principales y condiciones relevantes.
3. Estimar o verificar el trayecto a IFEMA / MADRING priorizando metro o cercanías.
4. Comparar contra los criterios actuales:
   - Familia de 9 personas.
   - 10 de septiembre de 2026 al 14 de septiembre de 2026 para la fase Madrid/F1.
   - Presupuesto orientativo de 300 a 600 euros por noche total.
   - Trayecto máximo a IFEMA de 30 a 40 minutos.
   - Prioridad a alojamiento completo, espacios comunes y logística fácil con niños.
5. Asignar la siguiente letra disponible y agregar la opción en `generar_alojamiento.js`.
6. Actualizar `COORDS` y `OPCIONES`; el contador visible y las conclusiones principales se generan automáticamente.
7. Ejecutar `node generar_alojamiento.js`.
8. Validar con `npx --yes html-validate@latest index.html Alojamiento_Madrid_F1_2026.html`.
9. Verificar visualmente la página y probar filtros, ordenamiento y mapa.

## Archivos

- `generar_alojamiento.js` es la fuente de verdad.
- `index.html` es la página principal que debe publicar GitHub Pages y se genera automáticamente.
- `Alojamiento_Madrid_F1_2026.html` es una copia histórica generada automáticamente; debe quedar igual a `index.html`.
- `.github/workflows/pages.yml` despliega el sitio estático a GitHub Pages cuando hay cambios en `main`.
- El `.docx` queda fuera del repositorio por privacidad y para evitar publicar material innecesario.
