// Error de entrada del usuario: la API lo traduce a 400 con sus detalles.
export class EntradaInvalida extends Error {
  constructor(detalles) {
    super('Entrada inválida');
    this.detalles = detalles;
  }
}
