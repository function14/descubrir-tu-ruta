// Datos de quien hace la consulta: validación y normalización.
// La interfaz repite estas reglas para avisar antes de terminar el cuestionario,
// pero las que valen son las de aquí.
import { EntradaInvalida } from './errores.mjs';

const LARGO_MAXIMO = 60;
// Letras de cualquier idioma, con espacios, apóstrofos, guiones y puntos entre ellas.
const PATRON_NOMBRE = /^\p{L}[\p{L}\p{M}' .-]*$/u;

const esObjeto = (valor) => valor !== null && typeof valor === 'object' && !Array.isArray(valor);

function limpiarNombre(texto) {
  return typeof texto === 'string' ? texto.normalize('NFC').trim().replace(/\s+/g, ' ') : '';
}

function revisarNombre(texto, campo, errores) {
  const limpio = limpiarNombre(texto);
  if (limpio.length < 2) errores.push(`Escribe tus ${campo}.`);
  else if (limpio.length > LARGO_MAXIMO) errores.push(`Tus ${campo} pueden tener hasta ${LARGO_MAXIMO} caracteres.`);
  else if (!PATRON_NOMBRE.test(limpio)) errores.push(`Tus ${campo} solo pueden tener letras, espacios, guiones o apóstrofos.`);
  return limpio;
}

// Teléfonos de Colombia: celular de 10 dígitos que empieza por 3, o fijo que empieza
// por 60. Acepta espacios, guiones, paréntesis y el indicativo +57.
export function normalizarTelefono(texto) {
  if (typeof texto !== 'string') return null;
  let digitos = texto.replace(/[\s().-]/g, '');
  if (digitos.startsWith('+57')) digitos = digitos.slice(3);
  else if (/^57\d{10}$/.test(digitos)) digitos = digitos.slice(2);
  return /^(3\d{9}|60\d{8})$/.test(digitos) ? digitos : null;
}

function revisarTelefono(texto, errores) {
  const telefono = normalizarTelefono(texto);
  if (!telefono) {
    errores.push('El teléfono debe ser un número de Colombia de 10 dígitos (celular o fijo).');
  }
  return telefono;
}

// Datos que acompañan a una consulta nueva.
export function validarViajero(viajero) {
  if (!esObjeto(viajero)) {
    throw new EntradaInvalida(['Faltan los datos del viajero: nombres, apellidos y teléfono.']);
  }
  const errores = [];
  const datos = {
    nombres: revisarNombre(viajero.nombres, 'nombres', errores),
    apellidos: revisarNombre(viajero.apellidos, 'apellidos', errores),
    telefono: revisarTelefono(viajero.telefono, errores),
  };
  if (viajero.autoriza_datos !== true) {
    errores.push('Se necesita tu autorización para guardar tus datos con la consulta.');
  }
  if (errores.length) throw new EntradaInvalida(errores);
  return datos;
}

// Datos con los que alguien recupera sus consultas.
export function validarBusqueda(busqueda) {
  if (!esObjeto(busqueda)) {
    throw new EntradaInvalida(['Indica tu teléfono y tus apellidos.']);
  }
  const errores = [];
  const datos = {
    telefono: revisarTelefono(busqueda.telefono, errores),
    apellidos: revisarNombre(busqueda.apellidos, 'apellidos', errores),
  };
  if (errores.length) throw new EntradaInvalida(errores);
  return datos;
}

// Compara apellidos sin importar mayúsculas ni tildes, y acepta solo el primer
// apellido: "Vargas" encuentra lo guardado como "Vargas Castro", pero "Castro" no.
const palabras = (texto) =>
  texto
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[\s-]+/)
    .filter(Boolean);

export function coincidenApellidos(guardados, buscados) {
  const deLaConsulta = palabras(guardados ?? '');
  const escritos = palabras(buscados);
  return escritos.length > 0 && escritos.every((palabra, i) => deLaConsulta[i] === palabra);
}
