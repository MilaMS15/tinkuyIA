/**
 * Modelo de Tienda / Sucursal (Respuesta al Jurado 2)
 * Permite gestionar múltiples puestos en galerías de Gamarra o ver el consolidado general.
 */
export class Store {
  constructor(id, name, address, sellerName = 'Encargada') {
    this.id = id;
    this.name = name;
    this.address = address;
    this.sellerName = sellerName;
  }
}

export const INITIAL_STORES = [
  new Store('consolidated', '🌟 Consolidado General (2 Galerías + Almacén)', 'Vista total del negocio', 'Sofía (Dueña)'),
  new Store('guisado', '🏬 Galería Guisado (Puesto #104)', 'Jr. Gamarra 750, La Victoria', 'Karina (Vendedora)'),
  new Store('el_rey', '🏬 Galería El Rey (Puesto #215)', 'Jr. Antonio Bazo 920, La Victoria', 'Maritza (Vendedora)'),
  new Store('almacen', '📦 Almacén Central / Taller de Corte', 'Jr. Humboldt 420, La Victoria', 'Rosa (Encargada de Taller)')
];
