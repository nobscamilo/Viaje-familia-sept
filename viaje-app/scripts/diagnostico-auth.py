"""Averigua por que Google Auth rechaza localhost. No imprime la clave."""
import io, json, os, re, urllib.request, urllib.error

raiz = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env = io.open(os.path.join(raiz, '.env.local'), encoding='utf-8').read()
vals = dict(re.findall(r'^([A-Z0-9_]+)=(.*)$', env, re.M))
key = vals.get('VITE_FIREBASE_API_KEY', '').strip()
dominio = vals.get('VITE_FIREBASE_AUTH_DOMAIN', '').strip()

print('clave:', key[:10] + '...' if key else '(vacia)')
print('authDomain:', dominio)
print()

url = 'https://identitytoolkit.googleapis.com/v1/projects?key=' + key

def probar(referer):
    req = urllib.request.Request(url)
    if referer:
        req.add_header('Referer', referer)
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        cuerpo = e.read().decode()
        try:
            msg = json.loads(cuerpo)['error']['message']
        except Exception:
            msg = cuerpo[:200]
        return e.code, msg

casos = [
    ('sin referer', None),
    ('localhost', 'http://localhost/'),
    ('localhost:4317', 'http://localhost:4317/'),
    ('127.0.0.1:4317', 'http://127.0.0.1:4317/'),
    ('firebaseapp.com', 'https://' + dominio + '/'),
    ('web.app', 'https://' + dominio.replace('.firebaseapp.com', '.web.app') + '/'),
    ('canal previo', 'https://' + dominio.replace('.firebaseapp.com', '--prueba.web.app') + '/'),
]

for nombre, ref in casos:
    codigo, cuerpo = probar(ref)
    if codigo == 200:
        dominios = cuerpo.get('authorizedDomains', [])
        print(f'  {nombre:16s} 200 OK   dominios autorizados: {dominios}')
    else:
        print(f'  {nombre:16s} {codigo}      {cuerpo}')
