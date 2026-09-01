/**
 * Conversacion de ejemplo para trabajar el aspecto del copiloto.
 *
 * Generada por `scripts/demo-copiloto.mjs` con datos reales de Places y
 * Routes. Solo se usa en modo local con `?demo`: no viaja a produccion mas
 * que como unos kilobytes de texto, y evita tener que hablar con el copiloto
 * en cada iteracion de diseno.
 *
 * Las fotos de Places caducan. Si salen rotas, se vuelve a lanzar el script.
 */
export const DEMO = [
  {
    "rol": "yo",
    "texto": "Dónde cenamos cerca de Sol con los niños el jueves"
  },
  {
    "rol": "copiloto",
    "texto": "¡De una! Les dejo dos opciones cerquita del apartamento, las dos con buena fama y sitio para los peques.",
    "tarjetas": [
      {
        "placeId": "ChIJgwIBTHkoQg0RD1lm5kc2tWI",
        "name": "Rosi La Loca",
        "formattedAddress": "C. de Cádiz, 4, Centro, 28012 Madrid",
        "rating": 4.7,
        "userRatingCount": 26261,
        "googleMapsUri": "https://maps.google.com/?cid=7112650868937611535&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
        "photoUri": "https://lh3.googleusercontent.com/place-photos/AG9NLjAD-DwqLOqKvZbkVK-5HU4BJeM50X6xTZHFPRKoYvCIRcnW9i3uNaqPRciEkRWLjoGiGSjb50zxp0bE3U3bSw37W6U_jZM5mHaZ1OuxI4SNdnc0gpOYoCNcyCmMJXlzMwJ4ssqzygwBp62odw=s4800-w1024-h768",
        "location": {
          "lat": 40.4158037,
          "lng": -3.7029837000000003
        }
      },
      {
        "placeId": "ChIJk46aUHkoQg0RPK7Gl632y6I",
        "name": "La Excéntrica",
        "formattedAddress": "C. de las Fuentes, 10, bajos, Centro, 28013 Madrid",
        "rating": 3.9,
        "userRatingCount": 972,
        "googleMapsUri": "https://maps.google.com/?cid=11730740879852744252&g_mp=Cidnb29nbGUubWFwcy5wbGFjZXMudjEuUGxhY2VzLlNlYXJjaFRleHQQAhgEIAA",
        "photoUri": "https://lh3.googleusercontent.com/place-photos/AG9NLjAcjOAoO0uRQpla-Z-u9iaonD1wCdcgXQHBeawIg2jmJTuOzpOczPLz9Tmkj9waSHfWAANWSboez6fZ5zJnwXMMT4XsQxzcJAuaw8os0UXAkowNikpW5Ikfgz8XyhipO103LGyMPP23j6P0oA=s4800-w1200-h800",
        "location": {
          "lat": 40.4172886,
          "lng": -3.7085817
        }
      }
    ]
  },
  {
    "rol": "yo",
    "texto": "¿Y cuánto se tarda de ahí a IFEMA?"
  },
  {
    "rol": "copiloto",
    "texto": "Depende de cómo vayan. En metro es más previsible a esa hora; en coche el aparcamiento del circuito se llena.",
    "rutas": [
      {
        "desde": "Rosi La Loca",
        "hasta": "Circuito de IFEMA",
        "modo": "metro",
        "duracion": "41 min",
        "distancia": "12,4 km"
      },
      {
        "desde": "Rosi La Loca",
        "hasta": "Circuito de IFEMA",
        "modo": "coche",
        "duracion": "29 min",
        "distancia": "18,1 km"
      },
      {
        "desde": "Rosi La Loca",
        "hasta": "Circuito de IFEMA",
        "modo": "andando",
        "duracion": "2h 34 min",
        "distancia": "10,9 km"
      }
    ]
  },
  {
    "rol": "yo",
    "texto": "Agrega Rosi La Loca al jueves a la 1 y déjame una decisión para el tour del Bernabéu"
  },
  {
    "rol": "copiloto",
    "texto": "Hecho. La comida queda en la agenda y el choque del Bernabéu lo dejo para que lo voten.",
    "planes": [
      {
        "id": "demo-1",
        "title": "Comida en Rosi La Loca",
        "fecha": "2026-09-10",
        "hora": "13:00"
      }
    ],
    "propuestas": [
      {
        "id": "demo-2",
        "title": "Mover el tour del Bernabéu del viernes"
      }
    ]
  },
  {
    "rol": "yo",
    "texto": "Armanos una ruta por el Gotico el domingo por la mañana"
  },
  {
    "rol": "copiloto",
    "texto": "Ahí va. Cuatro paradas andando, empezando a las 10:00. Ojo con dos cosas que te marco abajo.",
    "itinerarios": [
      {
        "id": "demo-ruta-1",
        "titulo": "Mañana por el Gótico",
        "fecha": "2026-09-13",
        "ciudad": "Barcelona",
        "modo": "WALK",
        "paradas": [
          { "orden": 1, "titulo": "Catedral de Barcelona", "llegada": "10:00", "salida": "11:15", "direccion": "Pla de la Seu, s/n, Ciutat Vella, 08002 Barcelona", "nota": 4.6, "resenas": 32871, "alSiguiente": "6 min" },
          { "orden": 2, "titulo": "Plaça del Rei", "llegada": "11:21", "salida": "12:06", "direccion": "Plaça del Rei, Ciutat Vella, 08002 Barcelona", "nota": 4.5, "resenas": 4210, "alSiguiente": "9 min" },
          { "orden": 3, "titulo": "Mercat de la Boqueria", "llegada": "12:15", "salida": "13:15", "direccion": "La Rambla, 91, Ciutat Vella, 08001 Barcelona", "nota": 4.4, "resenas": 87540, "alSiguiente": "11 min" },
          { "orden": 4, "titulo": "Can Culleretes", "llegada": "13:26", "salida": "14:56", "direccion": "Carrer d'en Quintana, 5, Ciutat Vella, 08002 Barcelona", "nota": 4.3, "resenas": 9120, "alSiguiente": null }
        ],
        "avisos": [
          "«Plaça del Rei» está cerrado a las 11:21 (domingo: Cerrado).",
          "Mercat de la Boqueria (12:15-13:15) pisa «Salida hacia el aeropuerto» a las 12:30."
        ]
      }
    ]
  },
  {
    "rol": "yo",
    "texto": "Y para el sábado, algo tranquilo por Malasaña, que van mis papás"
  },
  {
    "rol": "copiloto",
    "texto": "Te la propongo aquí abajo, todavía sin meterla. Tres paradas cortas andando. Si alguna sobra, la quitas y te rehago las horas; cuando te cuadre, dale a agregar.",
    "borradores": [
      {
        "titulo": "Malasaña sin prisa",
        "fecha": "2026-09-12",
        "ciudad": "Madrid",
        "modo": "WALK",
        "horaInicio": "11:00",
        "grupo": "todos",
        "paradas": [
          { "orden": 1, "titulo": "Mercado de San Ildefonso", "tipo": "food", "minutos": 60, "llegada": "11:00", "salida": "12:00", "direccion": "C. de Fuencarral, 57, Centro, 28004 Madrid", "coords": { "lat": 40.4256, "lng": -3.7016 }, "placeId": "demo-si", "nota": 4.2, "resenas": 18420, "horario": null, "alSiguiente": "7 min" },
          { "orden": 2, "titulo": "Museo de Historia de Madrid", "tipo": "activity", "minutos": 75, "llegada": "12:07", "salida": "13:22", "direccion": "C. de Fuencarral, 78, Centro, 28004 Madrid", "coords": { "lat": 40.4268, "lng": -3.7013 }, "placeId": "demo-mh", "nota": 4.5, "resenas": 5310, "horario": null, "alSiguiente": "5 min" },
          { "orden": 3, "titulo": "Café Comercial", "tipo": "food", "minutos": 90, "llegada": "13:27", "salida": "14:57", "direccion": "Glorieta de Bilbao, 7, Centro, 28004 Madrid", "coords": { "lat": 40.4287, "lng": -3.7011 }, "placeId": "demo-cc", "nota": 4.1, "resenas": 12903, "horario": null, "alSiguiente": null }
        ],
        "avisos": [
          "«Museo de Historia de Madrid» está cerrado a las 12:07 (sábado: Cerrado)."
        ]
      }
    ],
    "borradoresPlan": [
      {
        "titulo": "Café Comercial",
        "fecha": "2026-09-12",
        "hora": "17:30",
        "duracionMinutos": 90,
        "tipo": "food",
        "grupo": "todos",
        "lugar": "Glorieta de Bilbao, 7, Centro, 28004 Madrid",
        "coords": { "lat": 40.4287, "lng": -3.7011 },
        "placeId": "demo-cc",
        "nota": null
      }
    ]
  }
]
