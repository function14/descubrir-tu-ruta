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
  reloj: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6L3.5 8.5"/><path d="M3.5 4v4.5H8M12 7.5V12l3 2"/>',
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
const formatoFecha = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short' });

const $ = (id) => document.getElementById(id);
const VISTAS = ['inicio', 'datos', 'cuestionario', 'cargando', 'error', 'resultados', 'historial'];

let respuestas = {};
let reintento = null;
let turno = 0; // Descarta respuestas de una petición que ya quedó obsoleta.
// Datos personales solo en memoria: no se guardan en el navegador, que puede ser compartido.
let viajero = null; // Quien hace la consulta en curso.
let busqueda = null; // Teléfono y apellido de la última búsqueda en "Mis consultas".

// ---------- Validación de datos (la API repite estas reglas y es la que decide) ----------
const PATRON_NOMBRE = /^\p{L}[\p{L}\p{M}' .-]*$/u;
const limpiar = (texto) => texto.normalize('NFC').trim().replace(/\s+/g, ' ');

function normalizarTelefono(texto) {
  let digitos = texto.replace(/[\s().-]/g, '');
  if (digitos.startsWith('+57')) digitos = digitos.slice(3);
  else if (/^57\d{10}$/.test(digitos)) digitos = digitos.slice(2);
  return /^(3\d{9}|60\d{8})$/.test(digitos) ? digitos : null;
}

function errorNombre(texto, campo) {
  if (texto.length < 2) return `Escribe tus ${campo}.`;
  if (!PATRON_NOMBRE.test(texto)) return 'Usa solo letras, espacios, guiones o apóstrofos.';
  return '';
}

const errorTelefono = (texto) =>
  normalizarTelefono(texto) ? '' : 'Escribe un número de Colombia de 10 dígitos, por ejemplo 300 123 4567.';

// Marca cada campo con su error (o lo limpia) y lleva el foco al primero que falle.
function validarCampos(revisiones) {
  let primero = null;
  for (const [id, mensaje] of revisiones) {
    $(`${id}-error`).textContent = mensaje;
    $(id).setAttribute('aria-invalid', String(Boolean(mensaje)));
    if (mensaje && !primero) primero = id;
  }
  if (primero) $(primero).focus();
  return !primero;
}

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

async function pedir(ruta, cuerpo) {
  const opciones = cuerpo && {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(cuerpo),
  };
  const respuesta = await fetch(`${API_URL}${ruta}`, opciones);
  if (!respuesta.ok) {
    const error = await respuesta.json().catch(() => ({}));
    throw new Error(error.detalles?.join(' ') ?? 'El servicio respondió con un error.');
  }
  return respuesta.json();
}

const mensajeDeError = (error) =>
  error instanceof TypeError ? 'No se pudo conectar con el servicio.' : error.message;

function fallar(error, accion) {
  console.error(error);
  $('error-texto').textContent = mensajeDeError(error);
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

function paradasDe(respuestasDadas) {
  return Object.entries(respuestasDadas).map(([variable, valor]) => {
    const parada = elemento('li');
    parada.title = textoDe(variable).corto;
    parada.append(iconoDe(variable, valor, 'chico'), elemento('span', '', valor));
    return parada;
  });
}

function dibujarRuta() {
  $('ruta').replaceChildren(...paradasDe(respuestas));
}

// ---------- Datos del viajero ----------
function mostrarDatos() {
  turno++;
  if (viajero) {
    $('nombres').value = viajero.nombres;
    $('apellidos').value = viajero.apellidos;
    $('telefono').value = viajero.telefono;
    $('autoriza').checked = true;
  }
  mostrar('datos');
  $('datos-titulo').focus();
}

function guardarDatos(evento) {
  evento.preventDefault();
  const nombres = limpiar($('nombres').value);
  const apellidos = limpiar($('apellidos').value);
  const telefono = $('telefono').value;
  const validos = validarCampos([
    ['nombres', errorNombre(nombres, 'nombres')],
    ['apellidos', errorNombre(apellidos, 'apellidos')],
    ['telefono', errorTelefono(telefono)],
    ['autoriza', $('autoriza').checked ? '' : 'Necesitamos tu autorización para guardar la consulta a tu nombre.'],
  ]);
  if (!validos) return;
  viajero = { nombres, apellidos, telefono: normalizarTelefono(telefono), autoriza_datos: true };
  respuestas = {};
  avanzar();
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
  $('atras').hidden = false;
  $('atras').textContent = numero === 1 ? 'Volver a tus datos' : 'Volver a la pregunta anterior';
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
  if (claves.length === 0) {
    mostrarDatos();
    return;
  }
  respuestas = Object.fromEntries(
    claves.slice(0, -1).map((clave) => [clave, respuestas[clave]]),
  );
  avanzar();
}

async function recomendar(miTurno = ++turno) {
  $('cargando-texto').textContent = 'Evaluando las reglas del sistema experto…';
  mostrar('cargando');
  try {
    const resultado = await pedir('/recomendar', { viajero, respuestas });
    if (miTurno !== turno) return;
    dibujarResultados({
      ...resultado,
      respuestas,
      nombres: viajero.nombres,
      apellidos: viajero.apellidos,
    });
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

// Sirve para una consulta recién hecha y para una recuperada de "Mis consultas"
// (esta trae su fecha).
function dibujarResultados(consulta, { desdeHistorial = false } = {}) {
  const { consulta_id, recomendaciones, mensaje, nombres, apellidos, fecha } = consulta;
  const total = recomendaciones.length;
  const pesoMaximo = recomendaciones[0]?.peso_relativo;
  const nombre = `${nombres} ${apellidos}`;

  let titulo = 'Tus destinos';
  if (total === 0) titulo = 'Sin recomendación';
  else if (desdeHistorial) titulo = `Ruta de ${nombre}`;
  $('resultados-titulo').textContent = titulo;
  $('resultados-mensaje').textContent = mensaje ?? resumen(total);
  $('resultados-ruta').replaceChildren(...paradasDe(consulta.respuestas));
  $('lista-destinos').replaceChildren(
    ...recomendaciones.map((destino) => dibujarDestino(destino, pesoMaximo)),
  );
  $('traza').textContent = fecha
    ? `Consulta n.º ${consulta_id} de ${nombre}, del ${formatoFecha.format(new Date(fecha))}`
    : `Consulta n.º ${consulta_id} guardada a nombre de ${nombre}`;
  $('volver-historial').hidden = !desdeHistorial;
  mostrar('resultados');
  $('resultados-titulo').focus();
  window.scrollTo({ top: 0 });
}

// ---------- Mis consultas ----------
function mostrarHistorial({ buscarAhora }) {
  turno++;
  const conocidos = busqueda ?? viajero;
  if (buscarAhora && conocidos) {
    $('buscar-telefono').value = conocidos.telefono;
    $('buscar-apellidos').value = conocidos.apellidos.split(' ')[0];
  }
  mostrar('historial');
  $('historial-titulo').focus();
  if (buscarAhora && conocidos) buscar();
}

async function buscar(evento) {
  evento?.preventDefault();
  const telefono = $('buscar-telefono').value;
  const apellidos = limpiar($('buscar-apellidos').value);
  const validos = validarCampos([
    ['buscar-telefono', errorTelefono(telefono)],
    ['buscar-apellidos', errorNombre(apellidos, 'apellidos')],
  ]);
  if (!validos) return;

  const miTurno = ++turno;
  const datos = { telefono: normalizarTelefono(telefono), apellidos };
  $('buscar-boton').disabled = true;
  $('historial-estado').textContent = 'Buscando tus consultas…';
  $('lista-consultas').replaceChildren();
  try {
    const { consultas } = await pedir('/consultas/buscar', datos);
    if (miTurno !== turno) return;
    busqueda = datos;
    dibujarConsultas(consultas);
  } catch (error) {
    console.error(error);
    if (miTurno === turno) $('historial-estado').textContent = mensajeDeError(error);
  } finally {
    $('buscar-boton').disabled = false;
  }
}

function dibujarConsultas(consultas) {
  const total = consultas.length;
  let estado = `Encontramos ${total} consultas, de la más reciente a la más antigua.`;
  if (total === 0) estado = 'No encontramos consultas con esos datos. Revisa el teléfono y escribe tu primer apellido como lo registraste.';
  else if (total === 1) estado = 'Encontramos 1 consulta.';
  $('historial-estado').textContent = estado;
  $('lista-consultas').replaceChildren(...consultas.map(dibujarConsulta));
}

function dibujarConsulta(consulta) {
  const tarjeta = elemento('li', 'consulta');
  const ruta = elemento('ul', 'ruta');
  ruta.setAttribute('aria-label', 'Respuestas');
  ruta.append(...paradasDe(consulta.respuestas));

  const destino = elemento('p', 'consulta-destino');
  if (consulta.destino_principal) {
    const compatibles = consulta.total_destinos === 1
      ? '1 destino compatible'
      : `${consulta.total_destinos} destinos compatibles`;
    destino.append(
      'Primer destino: ',
      elemento('strong', '', consulta.destino_principal),
      ` (${formatoPeso.format(consulta.peso_principal)} %) · ${compatibles}`,
    );
  } else {
    destino.textContent = 'Sin recomendación';
  }

  const ver = elemento('button', 'boton secundario', 'Ver resultados');
  ver.type = 'button';
  ver.setAttribute('aria-label', `Ver resultados de la consulta n.º ${consulta.consulta_id}`);
  ver.addEventListener('click', () => abrirConsulta(consulta.consulta_id));

  tarjeta.append(
    elemento('h3', '', `Ruta de ${consulta.nombres} ${consulta.apellidos}`),
    elemento('p', 'consulta-fecha', `${formatoFecha.format(new Date(consulta.fecha))} · Consulta n.º ${consulta.consulta_id}`),
    ruta,
    destino,
    ver,
  );
  return tarjeta;
}

async function abrirConsulta(id) {
  const miTurno = ++turno;
  $('cargando-texto').textContent = 'Recuperando la consulta…';
  mostrar('cargando');
  try {
    const detalle = await pedir('/consultas/detalle', { ...busqueda, consulta_id: id });
    if (miTurno === turno) dibujarResultados(detalle, { desdeHistorial: true });
  } catch (error) {
    if (miTurno === turno) fallar(error, () => abrirConsulta(id));
  }
}

function reiniciar() {
  turno++;
  respuestas = {};
  mostrar('inicio');
}

dibujarPortada();
$('ir-historial').prepend(icono('reloj', 'lavanda', 'chico'));
$('comenzar').addEventListener('click', mostrarDatos);
$('form-datos').addEventListener('submit', guardarDatos);
$('atras').addEventListener('click', deshacer);
$('reintentar').addEventListener('click', () => reintento?.());
$('otra-vez').addEventListener('click', reiniciar);
$('marca').addEventListener('click', reiniciar);
$('ir-historial').addEventListener('click', () => mostrarHistorial({ buscarAhora: true }));
$('ver-consultas').addEventListener('click', () => mostrarHistorial({ buscarAhora: true }));
$('volver-historial').addEventListener('click', () => mostrarHistorial({ buscarAhora: false }));
$('form-buscar').addEventListener('submit', buscar);
