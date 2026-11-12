// Interfaz del sistema experto. Aquí no se decide nada: qué preguntar y qué
// recomendar lo responde la API. Este archivo solo agrega iconos y textos
// legibles, que son presentación.

const API_URL = window.API_URL;

const TEXTOS = {
  tipo_experiencia: { pregunta: '¿Qué tipo de experiencia buscas?', corto: 'Experiencia' },
  clima: { pregunta: '¿Qué clima prefieres?', corto: 'Clima' },
  presupuesto: { pregunta: '¿Cuál es tu presupuesto?', corto: 'Presupuesto' },
  esfuerzo_fisico: { pregunta: '¿Cuánto esfuerzo físico quieres hacer?', corto: 'Esfuerzo físico' },
  geografia: { pregunta: '¿Qué paisaje te llama más?', corto: 'Geografía' },
  afluencia: { pregunta: '¿Cuánta gente prefieres encontrar?', corto: 'Afluencia' },
  apto_pareja: { pregunta: '¿Buscas un plan para ir en pareja?', corto: 'Apto para pareja' },
  actividad_rural: { pregunta: '¿Quieres incluir actividades rurales?', corto: 'Actividad rural' },
};

// Trazos SVG propios (24×24, línea redondeada). Son constantes del código, nunca datos externos.
const FIGURAS = {
  brujula: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  hoja: '<path d="M5 19C5 11 10 5 19 5c0 9-6 14-14 14z"/><path d="m5 19 7-7"/>',
  templo: '<path d="M3 10 12 4l9 6z"/><path d="M5 10v9M9.7 10v9M14.3 10v9M19 10v9M3 21h18"/>',
  palmera: '<path d="M12 21c0-5 1-9 3-12"/><path d="M15 9c-2-3-6-3-8-1M15 9c1-3 4-4 7-3M15 9c-3 0-5 2-6 5M15 9c3 0 5 2 5 5"/><path d="M5 21h14"/>',
  copo: '<path d="M12 3v18M4.2 7.5l15.6 9M19.8 7.5 4.2 16.5"/><path d="m9.5 4.5 2.5 2 2.5-2M9.5 19.5l2.5-2 2.5 2"/>',
  nubeSol: '<circle cx="8" cy="8" r="3"/><path d="M8 2.5V3.5M2.5 8h1M4.1 4.1l.7.7M11.9 4.1l-.7.7"/><path d="M8.5 20h8a3.5 3.5 0 0 0 .3-7 5 5 0 0 0-9.4 1.6A2.7 2.7 0 0 0 8.5 20z"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  moneda: '<circle cx="12" cy="12" r="8.5"/><path d="M14.5 9.5c-.4-1-1.4-1.5-2.5-1.5-1.4 0-2.5.8-2.5 2s1.1 1.6 2.5 2 2.5.8 2.5 2-1.1 2-2.5 2c-1.1 0-2.1-.5-2.5-1.5M12 6.5V8M12 16v1.5"/>',
  billetera: '<rect x="3" y="6" width="18" height="13" rx="2.5"/><path d="M3 10h18M16 14.5h2"/>',
  gema: '<path d="M6.5 4h11L21 9l-9 11L3 9z"/><path d="M3 9h18M9.5 4 8 9l4 11 4-11-1.5-5"/>',
  sofa: '<path d="M5 11V8a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v3"/><path d="M3 13a2 2 0 0 1 4 0v1h10v-1a2 2 0 0 1 4 0v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M6 19v2M18 19v2"/>',
  bici: '<circle cx="5.5" cy="17.5" r="3.5"/><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/>',
  rayo: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  olas: '<path d="M2 9c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 14c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2M2 19c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2"/>',
  edificios: '<rect x="4" y="3" width="9" height="18" rx="1"/><path d="M13 9h6a1 1 0 0 1 1 1v11M2 21h20M7.5 7h2M7.5 11h2M7.5 15h2M16 13h1M16 17h1"/>',
  casa: '<path d="m3 11 9-7 9 7"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/>',
  montanaNieve: '<path d="M2 20 9 7l4 7 2.5-4L22 20z"/><path d="m6.6 11.3 2.4-1.3 2.1 1.6"/>',
  arboles: '<path d="M8 21v-4"/><path d="M8 17a4 4 0 0 1-3.4-6.1A4 4 0 0 1 8 4a4 4 0 0 1 3.4 6.9A4 4 0 0 1 8 17z"/><path d="M16.5 21v-3M16.5 5l4 6.5h-2l2.5 4h-9l2.5-4h-2z"/>',
  cactus: '<path d="M10 21V6a2 2 0 0 1 4 0v15"/><path d="M14 13h2a2 2 0 0 0 2-2V9M10 15H8a2 2 0 0 1-2-2v-2M5 21h14"/>',
  gota: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/><path d="M9.5 14.5a2.5 2.5 0 0 0 2.5 2.5"/>',
  multitud: '<circle cx="12" cy="7.5" r="2.6"/><circle cx="5.5" cy="10" r="2.2"/><circle cx="18.5" cy="10" r="2.2"/><path d="M7.5 20a4.5 4.5 0 0 1 9 0M1.8 19a3.8 3.8 0 0 1 5.6-3.3M22.2 19a3.8 3.8 0 0 0-5.6-3.3"/>',
  pareja: '<circle cx="8" cy="9" r="2.8"/><circle cx="16" cy="9" r="2.8"/><path d="M3 20a5 5 0 0 1 10 0M11 20a5 5 0 0 1 10 0"/>',
  luna: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
  corazon: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.4 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
  persona: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20a7 7 0 0 1 14 0"/>',
  brote: '<path d="M12 21V11"/><path d="M12 11c0-4-3-6-7-6 0 4 3 6 7 6zM12 13.5c0-3.5 2.5-5.5 7-5.5 0 4-3 5.5-7 5.5z"/>',
  prohibido: '<circle cx="12" cy="12" r="8.5"/><path d="m6 6 12 12"/>',
  destello: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/>',
  check: '<path d="M5 13l4 4L19 7"/>',
  equis: '<path d="M6 6l12 12M18 6 6 18"/>',
};

// Icono y tono pastel de cada valor. Una etiqueta nueva en la base cae en el destello.
const ICONOS = {
  tipo_experiencia: {
    Aventura: ['brujula', 'durazno'],
    'Naturalista/Ecoturismo': ['hoja', 'menta'],
    Cultura: ['templo', 'lavanda'],
    'Playa/Relax': ['palmera', 'cielo'],
  },
  clima: {
    Frío: ['copo', 'cielo'],
    Templado: ['nubeSol', 'lavanda'],
    Cálido: ['sol', 'mantequilla'],
  },
  presupuesto: {
    Económico: ['moneda', 'menta'],
    Medio: ['billetera', 'durazno'],
    Alto: ['gema', 'rosa'],
  },
  esfuerzo_fisico: {
    Bajo: ['sofa', 'lavanda'],
    Medio: ['bici', 'menta'],
    Alto: ['rayo', 'durazno'],
  },
  geografia: {
    Playa: ['olas', 'cielo'],
    Urbano: ['edificios', 'lavanda'],
    Rural: ['casa', 'mantequilla'],
    Montaña: ['montanaNieve', 'rosa'],
    Selva: ['arboles', 'menta'],
    Desierto: ['cactus', 'durazno'],
    Lago: ['gota', 'cielo'],
  },
  afluencia: {
    Masiva: ['multitud', 'durazno'],
    Moderada: ['pareja', 'lavanda'],
    Tranquila: ['luna', 'cielo'],
  },
  apto_pareja: {
    Sí: ['corazon', 'rosa'],
    No: ['persona', 'lavanda'],
  },
  actividad_rural: {
    Sí: ['brote', 'menta'],
    No: ['prohibido', 'rosa'],
  },
};

const textoDe = (variable) => TEXTOS[variable] ?? { pregunta: variable, corto: variable };

const formatoPeso = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const formatoPuntaje = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 });

const $ = (id) => document.getElementById(id);
const VISTAS = ['inicio', 'cuestionario', 'cargando', 'error', 'resultados'];

let respuestas = {};
let reintento = null;
let turno = 0; // Descarta respuestas de una petición que ya quedó obsoleta.

function mostrar(vista) {
  for (const id of VISTAS) $(id).hidden = id !== vista;
}

function elemento(etiqueta, clase, texto) {
  const nodo = document.createElement(etiqueta);
  if (clase) nodo.className = clase;
  if (texto !== undefined) nodo.textContent = texto;
  return nodo;
}

function icono(figura, tono, tamano = '') {
  const contenedor = elemento('span', `icono tono-${tono} ${tamano}`.trim());
  contenedor.setAttribute('aria-hidden', 'true');
  contenedor.innerHTML =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    `stroke-linecap="round" stroke-linejoin="round">${FIGURAS[figura] ?? FIGURAS.destello}</svg>`;
  return contenedor;
}

function iconoDe(variable, valor, tamano) {
  const [figura, tono] = ICONOS[variable]?.[valor] ?? ['destello', 'rosa'];
  return icono(figura, tono, tamano);
}

async function pedir(ruta, opciones) {
  const respuesta = await fetch(`${API_URL}${ruta}`, opciones);
  if (!respuesta.ok) {
    const cuerpo = await respuesta.json().catch(() => ({}));
    throw new Error(cuerpo.detalles?.join(' ') ?? 'El servicio respondió con un error.');
  }
  return respuesta.json();
}

function fallar(error, accion) {
  console.error(error);
  $('error-texto').textContent =
    error instanceof TypeError ? 'No se pudo conectar con el servicio.' : error.message;
  reintento = accion;
  mostrar('error');
}

function dibujarPortada() {
  $('ruta-portada').replaceChildren(
    ...Object.keys(ICONOS.tipo_experiencia).map((valor) => {
      const parada = elemento('li');
      parada.append(iconoDe('tipo_experiencia', valor, 'grande'));
      return parada;
    }),
  );
}

function dibujarRuta() {
  $('ruta').replaceChildren(
    ...Object.entries(respuestas).map(([variable, valor]) => {
      const parada = elemento('li');
      parada.title = textoDe(variable).corto;
      parada.append(iconoDe(variable, valor, 'chico'), elemento('span', '', valor));
      return parada;
    }),
  );
}

function dibujarPregunta({ variable, valores }) {
  const numero = Object.keys(respuestas).length + 1;
  $('parada').textContent = `Parada ${numero}`;
  $('pregunta').textContent = textoDe(variable).pregunta;
  $('opciones').replaceChildren(
    ...valores.map((valor) => {
      const opcion = elemento('button', 'opcion');
      opcion.type = 'button';
      opcion.append(iconoDe(variable, valor), elemento('span', '', valor));
      opcion.addEventListener('click', () => responder(variable, valor));
      return opcion;
    }),
  );
  $('atras').hidden = numero === 1;
  dibujarRuta();
  mostrar('cuestionario');
  $('pregunta').focus();
}

async function avanzar() {
  const miTurno = ++turno;
  $('cargando-texto').textContent = 'Buscando la siguiente parada…';
  mostrar('cargando');
  try {
    const parametros = new URLSearchParams(respuestas);
    const { fin, siguiente } = await pedir(`/preguntas?${parametros}`);
    if (miTurno !== turno) return;
    if (fin) await recomendar(miTurno);
    else dibujarPregunta(siguiente);
  } catch (error) {
    if (miTurno === turno) fallar(error, avanzar);
  }
}

function responder(variable, valor) {
  respuestas = { ...respuestas, [variable]: valor };
  avanzar();
}

function deshacer() {
  const claves = Object.keys(respuestas);
  respuestas = Object.fromEntries(
    claves.slice(0, -1).map((clave) => [clave, respuestas[clave]]),
  );
  avanzar();
}

async function recomendar(miTurno = ++turno) {
  $('cargando-texto').textContent = 'Evaluando las reglas del sistema experto…';
  mostrar('cargando');
  try {
    const resultado = await pedir('/recomendar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(respuestas),
    });
    if (miTurno === turno) dibujarResultados(resultado);
  } catch (error) {
    if (miTurno === turno) fallar(error, () => recomendar());
  }
}

function dibujarRegla({ regla, tipo, aporte, condiciones }) {
  const nodo = elemento('li', `regla ${tipo}`);
  const cabecera = elemento('p', 'regla-cabecera');
  cabecera.append(
    elemento('strong', '', regla),
    elemento('span', '', tipo === 'exacta' ? 'Regla exacta' : 'Regla parcial'),
    elemento('span', '', `Aporta ${formatoPuntaje.format(aporte)}`),
  );

  const lista = elemento('ul', 'condiciones');
  for (const { variable, valor, cumplida } of condiciones) {
    const fila = elemento('li', cumplida ? 'si' : 'no');
    fila.append(
      icono(cumplida ? 'check' : 'equis', cumplida ? 'menta' : 'rosa', 'chico'),
      elemento('span', 'oculto', cumplida ? 'Coincide:' : 'No coincide:'),
      elemento('span', '', `${textoDe(variable).corto}: ${valor}`),
    );
    lista.append(fila);
  }
  nodo.append(cabecera, lista);
  return nodo;
}

function dato(termino, valor) {
  const par = elemento('div');
  par.append(elemento('dt', '', termino), elemento('dd', '', String(valor)));
  return par;
}

function dibujarDestino(destino, pesoMaximo) {
  const tarjeta = elemento('li', destino.posicion === 1 ? 'destino primero' : 'destino');

  const nombre = elemento('div');
  nombre.append(elemento('h3', '', destino.destino), elemento('p', 'region', destino.region));

  const cabecera = elemento('div', 'destino-cabecera');
  cabecera.append(
    elemento('span', 'numero', destino.posicion),
    nombre,
    elemento('p', 'peso', `${formatoPeso.format(destino.peso_relativo)} %`),
  );

  // La barra se escala contra el mayor peso para que las diferencias se distingan.
  const barra = elemento('div', 'barra');
  barra.setAttribute('aria-hidden', 'true');
  const relleno = elemento('span');
  relleno.style.width = `${(destino.peso_relativo / pesoMaximo) * 100}%`;
  barra.append(relleno);

  const metricas = elemento('dl', 'metricas');
  metricas.append(
    dato('Puntaje', formatoPuntaje.format(destino.puntaje)),
    dato('Reglas exactas', destino.reglas_exactas),
  );

  const detalle = elemento('details');
  detalle.open = destino.posicion === 1;
  const reglas = elemento('ul', 'reglas');
  reglas.append(...destino.explicacion.map(dibujarRegla));
  detalle.append(
    elemento('summary', '', '¿Por qué este destino?'),
    elemento('p', 'descripcion', destino.descripcion),
    metricas,
    reglas,
  );

  tarjeta.append(cabecera, barra, detalle);
  return tarjeta;
}

function resumen(total) {
  const destinos = total === 1 ? '1 destino compatible' : `${total} destinos compatibles`;
  return `${destinos}, de mayor a menor peso. El peso es la compatibilidad relativa de cada destino; entre todos suman 100 %.`;
}

function dibujarResultados({ consulta_id, recomendaciones, mensaje }) {
  const total = recomendaciones.length;
  const pesoMaximo = recomendaciones[0]?.peso_relativo;
  $('resultados-titulo').textContent = total === 0 ? 'Sin recomendación' : 'Tus destinos';
  $('resultados-mensaje').textContent = mensaje ?? resumen(total);
  $('lista-destinos').replaceChildren(
    ...recomendaciones.map((destino) => dibujarDestino(destino, pesoMaximo)),
  );
  $('traza').textContent = `Consulta n.º ${consulta_id} registrada`;
  mostrar('resultados');
  $('resultados-titulo').focus();
  window.scrollTo({ top: 0 });
}

function reiniciar() {
  turno++;
  respuestas = {};
  mostrar('inicio');
}

dibujarPortada();
$('comenzar').addEventListener('click', avanzar);
$('atras').addEventListener('click', deshacer);
$('reintentar').addEventListener('click', () => reintento?.());
$('otra-vez').addEventListener('click', reiniciar);
$('marca').addEventListener('click', reiniciar);
