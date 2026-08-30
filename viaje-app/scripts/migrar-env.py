"""Lleva la config WEB de Firebase del proyecto viejo a viaje-app/.env.local.

Se ejecuta una vez. No imprime valores.
"""
import io, os, re, sys

raiz = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
origen = os.path.join(raiz, 'firebase-family-app', '.env.local')
destino = os.path.join(raiz, 'viaje-app', '.env.local')

vals = dict(re.findall(r'^([A-Z0-9_]+)=(.*)$', io.open(origen, encoding='utf-8').read(), re.M))

QUIERO = [
    ('VITE_FIREBASE_API_KEY', 'Config web: no es un secreto. Identifica el proyecto,'),
    ('VITE_FIREBASE_AUTH_DOMAIN', None),
    ('VITE_FIREBASE_PROJECT_ID', None),
    ('VITE_FIREBASE_STORAGE_BUCKET', None),
    ('VITE_FIREBASE_MESSAGING_SENDER_ID', None),
    ('VITE_FIREBASE_APP_ID', None),
    ('VITE_GOOGLE_MAPS_BROWSER_KEY', 'Para mapas y rutas mas adelante.'),
    ('VITE_GOOGLE_MAPS_MAP_ID', None),
]

lineas = [
    '# Config WEB de Firebase. No es secreta: no autoriza nada por si misma.',
    '# Lo que protege los datos son las reglas de firestore.rules.',
    '#',
    '# Vive aqui y no en .env.example porque .env.example es la plantilla',
    '# que se sube al repo y tiene que quedarse vacia.',
    '#',
    '# Recuperada del proyecto anterior el 2026-08-26.',
    '',
]

faltan = []
for clave, nota in QUIERO:
    valor = vals.get(clave, '').strip()
    if not valor:
        faltan.append(clave)
        continue
    if nota:
        lineas.append('# ' + nota)
    lineas.append(clave + '=' + valor)

lineas += ['', '# Viaje activo', 'VITE_TRIP_ID=sept-2026', '']

io.open(destino, 'w', encoding='utf-8').write(chr(10).join(lineas))
os.chmod(destino, 0o600)

print('escritas', len(QUIERO) - len(faltan), 'de', len(QUIERO), 'variables')
print('faltan:', ', '.join(faltan) if faltan else 'ninguna')
