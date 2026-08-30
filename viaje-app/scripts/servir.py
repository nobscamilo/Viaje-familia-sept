"""Servidor estatico con reserva SPA: /decisiones no es un archivo, es una ruta.
`python3 -m http.server` devuelve 404 y la captura sale en blanco."""
import http.server, os, sys
os.chdir(sys.argv[2] if len(sys.argv) > 2 else '/tmp/local-dist')

class H(http.server.SimpleHTTPRequestHandler):
    def send_head(self):
        ruta = self.translate_path(self.path)
        if not os.path.exists(ruta) and '.' not in os.path.basename(ruta):
            self.path = '/index.html'
        return super().send_head()

http.server.HTTPServer(('127.0.0.1', int(sys.argv[1])), H).serve_forever()
