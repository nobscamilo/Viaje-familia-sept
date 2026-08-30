import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// El puerto 4317 no es capricho: la clave web de Firebase está restringida por
// referente y solo admite `http://localhost:4317` (además de los dominios de
// producción). En 5173, el puerto por defecto de Vite, el acceso con Google da
// 403. `strictPort` evita que Vite se cambie de puerto en silencio si está
// ocupado, que sería el mismo fallo con otra cara.
const PUERTO = 4317

export default defineConfig({
  plugins: [react()],
  server: { port: PUERTO, strictPort: true },
  preview: { port: PUERTO, strictPort: true },
  build: { target: 'es2022', sourcemap: true },
})
