/**
 * Un ejemplo de decision con opciones, para ver la pantalla sin escribir en
 * el viaje de verdad.
 *
 * Mismo truco que `demo-copiloto.js`: se pinta solo con `?demo` en la
 * direccion. Sirve para revisar el diseño y para enseñar de que va la cosa
 * sin gastar una llamada a Gemini ni dejar basura en Firestore — que es
 * exactamente lo que paso con el «Prueba automatica» del 11 de septiembre.
 *
 * Los tres sitios son reales y estan en Barcelona; los votos son inventados.
 */
export const DECISION_DEMO = {
  id: 'demo-comida-bcn',
  urgency: 'media',
  groupId: 'todos',
  status: 'propuesto',
  title: 'Dónde comemos el martes 15 en Barcelona',
  why: 'Nueve personas, dos niños y ningún sitio reservado. Los tres aceptan grupos grandes y están a menos de veinte minutos del piso de Sepúlveda.',
  demo: true,
  options: [
    {
      id: 'op1',
      title: 'Bar Cañete',
      detail: 'Tapa clásica, barra larga. Hay que reservar con días.',
      address: "Carrer de la Unió 17, Barcelona",
      priceEur: 45,
    },
    {
      id: 'op2',
      title: 'La Paradeta Sant Antoni',
      detail: 'Marisco al peso, se pide en el mostrador. Ruidoso y rápido: va bien con niños.',
      address: 'Comte Borrell 129, Barcelona',
      priceEur: 30,
    },
    {
      id: 'op3',
      title: 'Els Pescadors',
      detail: 'Arroces en el Poblenou. El más caro y el más lejos.',
      address: 'Plaça de Prim 1, Barcelona',
      priceEur: 60,
    },
  ],
}
