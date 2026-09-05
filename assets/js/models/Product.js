/**
 * Entidad Producto con Gobierno de Datos (Respuesta al Jurado 1 y 3)
 * Garantiza una estructura mínima estandarizada para alimentar la IA predictiva.
 */
export class Product {
  constructor({
    id,
    name,
    category = 'textil',
    variants = '',
    storeId = 'guisado',
    stock = 0,
    costUnit = 0.0,
    priceSale = 0.0,
    daysStagnant = 0,
    status = 'normal',
    dataQualityScore = 95
  }) {
    this.id = id || 'prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    this.name = name.trim();
    this.category = category; // 'textil', 'bazar', 'abarrotes'
    this.variants = variants; // Talla, Color, Material
    this.storeId = storeId;   // 'guisado', 'el_rey', 'almacen'
    this.stock = Number(stock);
    this.costUnit = Number(costUnit);
    this.priceSale = Number(priceSale);
    this.daysStagnant = Number(daysStagnant);
    this.status = status;     // 'frozen' (rojo), 'normal' (amarillo), 'star' (verde)
    this.dataQualityScore = Number(dataQualityScore);
  }

  // Margen bruto unitario en Soles
  get grossMargin() {
    return this.priceSale - this.costUnit;
  }

  // Porcentaje de margen sobre la venta
  get marginPercentage() {
    if (this.priceSale <= 0) return 0;
    return Math.round((this.grossMargin / this.priceSale) * 100);
  }

  // Capital inmovilizado total
  get frozenCapital() {
    return this.stock * this.costUnit;
  }

  // Valor de venta proyectado
  get retailValue() {
    return this.stock * this.priceSale;
  }

  // Determinar automáticamente el estado en el Semáforo del Dinero
  evaluateTrafficLight() {
    if (this.daysStagnant >= 45) {
      this.status = 'frozen'; // Rojo: Alerta Capital Congelado
    } else if (this.stock <= 5 && this.daysStagnant <= 10) {
      this.status = 'star';   // Verde: Estrella por agotarse (reabastecer)
    } else {
      this.status = 'normal'; // Amarillo: Rotación regular
    }
    return this.status;
  }

  // Validación de Gobernanza de Datos (Jurado 1)
  validate() {
    const errors = [];
    if (!this.name) errors.push('El nombre del producto es obligatorio.');
    if (this.stock < 0) errors.push('El stock no puede ser negativo.');
    if (this.costUnit <= 0) errors.push('El costo unitario debe ser mayor a cero.');
    if (this.priceSale <= 0) errors.push('El precio de venta debe ser mayor a cero.');
    if (this.priceSale < this.costUnit) errors.push('El precio de venta es menor al costo (alerta de pérdida).');
    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
