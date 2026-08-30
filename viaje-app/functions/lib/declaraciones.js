/**
 * Lo que Gemini ve del copiloto: nombres, parametros y para que sirve cada uno.
 *
 * Vive aparte de `herramientas.js` porque son dos cosas distintas con dos
 * ritmos distintos: esto es texto dirigido al modelo —se reescribe cada vez
 * que se le entiende mal algo— y aquello es codigo que se ejecuta. Juntos
 * pasaban de las 400 lineas del proyecto el dia que entraron las rutas.
 *
 * Las descripciones son parte del comportamiento, no documentacion. La frase
 * «pon SIEMPRE la ciudad» de `buscarLugares` es lo que evita que «Sol» sea un
 * bar de Velilla del Rio Carrion.
 */
export const DECLARACIONES = [
  {
    name: 'buscarLugares',
    description:
      'Busca sitios reales en Google Maps: restaurantes, museos, parques, tiendas, lo que sea. ' +
      'Devuelve nombre, direccion, valoracion, numero de resenas y horario. Usala SIEMPRE que ' +
      'te pidan recomendaciones de sitios: nunca te inventes un restaurante ni una direccion. ' +
      'LOS RESULTADOS YA VIENEN ORDENADOS de mejor a peor por nota ponderada por numero de ' +
      'resenas: respeta ese orden y no lo rehagas. Si mencionas la nota, di tambien cuantas ' +
      'resenas la sostienen: un 4,9 con 7 opiniones no es mejor que un 4,5 con 3.000.',
    parameters: {
      type: 'object',
      properties: {
        consulta: {
          type: 'string',
          description:
            'Que buscar. Ej: "restaurantes con menu infantil cerca de Sol".',
        },
        ciudad: {
          type: 'string',
          enum: ['Madrid', 'Barcelona', 'Paris', 'Bilbao'],
          description:
            'EN QUE CIUDAD del viaje. Ponla SIEMPRE, mirando la agenda: sin ella, ' +
            '"el hotel" devuelve un hotel de Guardo y "circuito" un karting de Leon.',
        },
        cuantos: { type: 'integer', description: 'Cuantos resultados, de 1 a 8. Por defecto 5.' },
      },
      required: ['consulta'],
    },
  },
  {
    name: 'comoLlegar',
    description:
      'Calcula cuanto se tarda entre dos sitios y por que medio. Usala cuando pregunten por ' +
      'distancias, tiempos o si da tiempo a ir de un sitio a otro.',
    parameters: {
      type: 'object',
      properties: {
        desde: { type: 'string', description: 'Sitio de salida, en texto. Ej: "Puerta del Sol".' },
        hasta: { type: 'string', description: 'Sitio de llegada. Si se omite, el circuito de IFEMA.' },
        modo: {
          type: 'string',
          enum: ['andando', 'coche', 'transporte', 'bici'],
          description: 'Como se mueven. Por defecto, transporte publico.',
        },
        cuando: {
          type: 'string',
          description:
            'QUE DIA del viaje, en AAAA-MM-DD, mirando la agenda. Ponlo SIEMPRE. En ' +
            'transporte publico cambia el resultado por completo: la misma ruta da ' +
            '1 h 15 min de madrugada y 39 minutos el domingo por la manana. Sin dia, ' +
            'se calcula para ahora mismo, que casi nunca es lo que preguntan.',
        },
        hora: {
          type: 'string',
          description:
            'A que hora salen, HH:MM. Si no la sabes, no la pongas: se usa la del ' +
            'primer plan de ese dia.',
        },
      },
      required: ['desde'],
    },
  },
  {
    name: 'agregarAlPlan',
    description:
      'Mete un plan en la agenda del viaje: una comida, una visita, un traslado. ' +
      'Entra como PROPUESTO, nunca como confirmado: aparece en la linea de tiempo ' +
      'marcado como sin cerrar hasta que quien organiza lo confirme. ' +
      'Usala cuando te pidan "agrega esto al plan" o "metelo el viernes por la tarde".',
    parameters: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Como se llama el plan. Ej: "Comida en Rosi La Loca".' },
        fecha: { type: 'string', description: 'Dia en formato AAAA-MM-DD. Tiene que caer dentro del viaje.' },
        hora: { type: 'string', description: 'Hora de inicio HH:MM, si la hay.' },
        duracionMinutos: { type: 'integer', description: 'Cuanto dura, si se sabe.' },
        tipo: {
          type: 'string',
          enum: ['activity', 'food', 'transport', 'lodging'],
          description: 'Que clase de plan es.',
        },
        lugar: {
          type: 'string',
          description:
            'Direccion o nombre del sitio. Ponlo SIEMPRE que lo sepas: con el, ' +
            'el plan aparece tambien en el mapa del viaje. Sin el, solo en la agenda.',
        },
        grupo: { type: 'string', enum: ['todos', 'f1', 'sin-f1'], description: 'Quien va.' },
        nota: { type: 'string', description: 'Cualquier detalle util.' },
      },
      required: ['titulo', 'fecha'],
    },
  },
  {
    name: 'armarRuta',
    description:
      'Arma una RUTA DE TURISMO de varias paradas en un mismo dia y la deja en la agenda ' +
      'como propuesta, con la hora de cada parada ya calculada. Usala cuando pidan ' +
      '"armanos una ruta", "que hacemos el domingo en Barcelona", "un plan para la manana". ' +
      'Tu pones los NOMBRES y el ORDEN; el servidor busca cada sitio, mira si abre a esa ' +
      'hora, calcula cuanto se tarda de uno a otro EN ESE DIA y encadena el reloj. ' +
      'NO inventes horas de llegada ni tiempos de trayecto: los devuelve la herramienta. ' +
      'Para una sola parada usa agregarAlPlan; esto es para dos o mas.',
    parameters: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Como se llama la ruta. Ej: "Manana por el Gotico".' },
        fecha: { type: 'string', description: 'Dia AAAA-MM-DD, dentro del viaje.' },
        horaInicio: { type: 'string', description: 'A que hora se empieza, HH:MM. Por defecto 10:00.' },
        modo: {
          type: 'string',
          enum: ['WALK', 'TRANSIT', 'DRIVE'],
          description: 'Como se va de una parada a otra. En centro urbano, WALK.',
        },
        grupo: {
          type: 'string',
          enum: ['todos', 'f1', 'sin-f1'],
          description:
            'Quien va. Importa: en "todos" y en "sin-f1" van los dos ninos de 4 y 9 anos, ' +
            'y con ellos cuatro paradas ya son un dia largo.',
        },
        paradas: {
          type: 'array',
          description:
            'Entre 2 y 6 paradas, EN EL ORDEN EN QUE SE VAN A VISITAR. Ponlas cerca unas ' +
            'de otras: la herramienta calcula el trayecto real y te avisara si no cuadra.',
          items: {
            type: 'object',
            properties: {
              nombre: {
                type: 'string',
                description:
                  'El nombre del sitio, lo mas concreto que puedas. "Catedral de Barcelona" ' +
                  'encuentra; "una iglesia bonita" no.',
              },
              tipo: { type: 'string', enum: ['activity', 'food', 'transport', 'lodging'] },
              minutos: { type: 'integer', description: 'Cuanto se queda alli. Sin esto, 75 min una visita y 90 una comida.' },
              ciudad: { type: 'string', description: 'Solo si esta parada cae en otra ciudad distinta a la del dia.' },
            },
            required: ['nombre'],
          },
        },
      },
      required: ['titulo', 'fecha', 'paradas'],
    },
  },
  {
    name: 'proponer',
    description:
      'Deja una propuesta en la pantalla de Decisiones para que la familia la vote. ' +
      'Usala cuando el usuario quiera convertir una idea en algo que se decida. ' +
      'No decide nada por su cuenta: solo lo propone.',
    parameters: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Que hay que decidir, en una frase.' },
        porque: { type: 'string', description: 'Por que, para que la gente vote con criterio.' },
        urgencia: { type: 'string', enum: ['alta', 'media', 'baja'] },
        grupo: {
          type: 'string',
          enum: ['todos', 'f1', 'sin-f1'],
          description: 'A quien le toca decidirlo.',
        },
      },
      required: ['titulo'],
    },
  },
  {
    name: 'proponerOpciones',
    description:
      'Deja en Decisiones una eleccion con VARIAS alternativas para que la familia vote cual ' +
      'prefiere. Usala en cuanto haya mas de un candidato: tres restaurantes, dos horarios, ' +
      'dos formas de llegar. Es mejor que proponer, porque con `proponer` la familia solo puede ' +
      'decir si o no a una idea suelta. Busca antes los sitios con buscarLugares y pon aqui los ' +
      'de verdad, con su direccion: no te inventes ninguno.',
    parameters: {
      type: 'object',
      properties: {
        titulo: { type: 'string', description: 'Que hay que escoger. Ej: "Donde comemos el domingo en Barcelona".' },
        porque: { type: 'string', description: 'El contexto que necesitan para escoger bien.' },
        opciones: {
          type: 'array',
          description: 'Entre 2 y 5 alternativas. Ni una sola (eso es proponer), ni diez (nadie vota diez).',
          items: {
            type: 'object',
            properties: {
              titulo: { type: 'string', description: 'Nombre corto de la opcion.' },
              detalle: { type: 'string', description: 'Una linea: por que esta, que la distingue.' },
              lugar: { type: 'string', description: 'Direccion o nombre del sitio, si lo hay.' },
              precioEur: { type: 'number', description: 'Lo que costaria, en euros, si se sabe.' },
            },
            required: ['titulo'],
          },
        },
        urgencia: { type: 'string', enum: ['alta', 'media', 'baja'] },
        grupo: { type: 'string', enum: ['todos', 'f1', 'sin-f1'], description: 'A quien le toca escoger.' },
      },
      required: ['titulo', 'opciones'],
    },
  },
  {
    name: 'anotarGasto',
    description:
      'Apunta un gasto en las cuentas del viaje: una comida, un taxi, unas entradas. ' +
      'El importe SIEMPRE en euros: si te lo dan en pesos colombianos, conviertelo tu ' +
      'y di a que cambio lo has hecho. Se reparte entre los ADULTOS que participan; ' +
      'los dos niños no pagan nunca. Usala cuando digan "apunta", "anota", "pagué" o "gasté".',
    parameters: {
      type: 'object',
      properties: {
        concepto: { type: 'string', description: 'Que era. Ej: "Comida en Rosi La Loca".' },
        importeEur: { type: 'number', description: 'Cuanto, en EUROS. Ej: 42.5' },
        fecha: { type: 'string', description: 'Dia AAAA-MM-DD, dentro del viaje.' },
        pagadoPor: {
          type: 'string',
          description:
            'Id del viajero que puso el dinero: camilo, juliana-bueno, julian-padre, cielo, ' +
            'juliana-hermana, fernando o julian-david. Si no te lo dicen, es quien te habla.',
        },
        participantes: {
          type: 'string',
          description:
            'Entre quienes se reparte: "todos", "f1", "sin-f1", o una lista de ids de ' +
            'viajeros separados por comas si la cuenta fue de unos pocos. Ej: ' +
            '"camilo,julian-padre,fernando". Los dos ninos nunca reparten.',
        },
        categoria: {
          type: 'string',
          enum: ['alojamiento', 'transporte', 'comida', 'entradas', 'otros'],
        },
      },
      required: ['concepto', 'importeEur', 'fecha'],
    },
  },
  {
    name: 'listarGastos',
    description:
      'Lee los gastos ya apuntados, ordenados como te pidan. Usala para responder ' +
      '"cuanto llevamos", "en que se nos va el dinero", "que pago mi padre" o ' +
      '"ordename los gastos por importe". No cambia nada.',
    parameters: {
      type: 'object',
      properties: {
        ordenarPor: {
          type: 'string',
          enum: ['fecha', 'importe', 'concepto', 'pagador', 'categoria'],
          description: 'Por defecto, por fecha y de lo mas reciente a lo mas antiguo.',
        },
        ascendente: { type: 'boolean', description: 'Del mas pequeño al mas grande, o del mas antiguo al mas nuevo.' },
        categoria: { type: 'string', enum: ['alojamiento', 'transporte', 'comida', 'entradas', 'otros'] },
        pagadoPor: { type: 'string', description: 'Id del viajero, para ver solo lo que puso uno.' },
      },
    },
  },
  {
    name: 'quitarGasto',
    description:
      'Borra un gasto apuntado desde la app. Pide antes listarGastos para saber el id. ' +
      'NO se pueden borrar las reservas verificadas (vienen marcadas deLaSiembra), ni ' +
      'lo que anoto otra persona si no eres quien organiza.',
    parameters: {
      type: 'object',
      properties: { id: { type: 'string', description: 'El id que devolvio listarGastos.' } },
      required: ['id'],
    },
  },
  {
    name: 'sugerirGastos',
    description:
      'Revisa que gastos FALTAN por apuntar: cruza la agenda con las cuentas y encuentra ' +
      'reservas con precio que nadie ha metido, y momentos sin precio conocido. ' +
      'NO apunta nada: solo avisa. Usala cuando pregunten si falta algo o si las cuentas cuadran.',
    parameters: { type: 'object', properties: {} },
  },
]

