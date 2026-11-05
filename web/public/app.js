// Interfaz del sistema experto. Aquí no se decide nada: qué preguntar y qué
// recomendar lo responde la API. Este archivo solo traduce nombres de variables
// a texto legible y dibuja lo que recibe.

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

const textoDe = (variable) => TEXTOS[variable] ?? { pregunta: variable, corto: variable };

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

function icono(cumplida) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '3');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  const trazo = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  trazo.setAttribute('d', cumplida ? 'M5 13l4 4L19 7' : 'M6 6l12 12M18 6L6 18');
  svg.append(trazo);
  return svg;
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

function dibujarRuta() {
  const lista = $('ruta');
  lista.replaceChildren(
    ...Object.entries(respuestas).map(([variable, valor]) => {
      const parada = elemento('li', '', valor);
      parada.title = textoDe(variable).corto;
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
      const opcion = elemento('button', 'opcion', valor);
      opcion.type = 'button';
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
    elemento('span', '', `Aporta ${aporte}`),
  );

  const lista = elemento('ul', 'condiciones');
  for (const { variable, valor, cumplida } of condiciones) {
    const fila = elemento('li', cumplida ? 'si' : 'no');
    fila.append(
      icono(cumplida),
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

function dibujarDestino(destino) {
  const tarjeta = elemento('li', destino.posicion === 1 ? 'destino primero' : 'destino');
  tarjeta.append(
    elemento('span', 'numero', destino.posicion),
    elemento('h3', '', destino.destino),
    elemento('p', 'region', destino.region),
  );

  const metricas = elemento('dl', 'metricas');
  metricas.append(
    dato('Puntaje', destino.puntaje),
    dato('Reglas exactas', destino.reglas_exactas),
  );

  const detalle = elemento('details');
  detalle.open = destino.posicion === 1;
  const reglas = elemento('ul', 'reglas');
  reglas.append(...destino.explicacion.map(dibujarRegla));
  detalle.append(elemento('summary', '', '¿Por qué este destino?'), reglas);

  const cuerpo = elemento('div', 'cuerpo');
  cuerpo.append(elemento('p', 'descripcion', destino.descripcion), metricas, detalle);
  tarjeta.append(cuerpo);
  return tarjeta;
}

function dibujarResultados({ consulta_id, recomendaciones, mensaje }) {
  const total = recomendaciones.length;
  $('resultados-titulo').textContent =
    total === 3 ? 'Tus tres destinos' : total === 0 ? 'Sin recomendación' : 'Tus destinos';
  $('resultados-mensaje').hidden = !mensaje;
  $('resultados-mensaje').textContent = mensaje ?? '';
  $('lista-destinos').replaceChildren(...recomendaciones.map(dibujarDestino));
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

$('comenzar').addEventListener('click', avanzar);
$('atras').addEventListener('click', deshacer);
$('reintentar').addEventListener('click', () => reintento?.());
$('otra-vez').addEventListener('click', reiniciar);
$('marca').addEventListener('click', reiniciar);
