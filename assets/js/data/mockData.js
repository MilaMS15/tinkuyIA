import { Product } from '../models/Product.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';

/**
 * Datos semilla iniciales basados en hallazgos reales de campo en Gamarra y comercio minorista
 */
export const SEED_PRODUCTS = [
  new Product({
    id: 'p_polo_basico',
    name: 'Polo básico',
    category: 'textil',
    variants: 'Modelo Tienda (Agilizado)',
    storeId: 'guisado',
    stock: 15,
    costUnit: 5.0,
    priceSale: 8.0,
    daysStagnant: 2,
    status: 'star',
    dataQualityScore: 98
  }),
  new Product({
    id: 'p_short_pinza',
    name: 'Short pinza',
    category: 'textil',
    variants: 'Modelo Tienda (Agilizado)',
    storeId: 'guisado',
    stock: 12,
    costUnit: 15.0,
    priceSale: 25.0,
    daysStagnant: 4,
    status: 'normal',
    dataQualityScore: 97
  }),
  new Product({
    id: 'p_blusa_boton',
    name: 'Blusa botón',
    category: 'textil',
    variants: 'Modelo Tienda (Agilizado)',
    storeId: 'guisado',
    stock: 10,
    costUnit: 14.0,
    priceSale: 25.0,
    daysStagnant: 3,
    status: 'normal',
    dataQualityScore: 98
  }),
  new Product({
    id: 'p_tatiana_almacen',
    name: 'Polo Tatiana',
    category: 'textil',
    variants: 'Talla M / Color Negro',
    storeId: 'almacen',
    stock: 40,
    costUnit: 18.0,
    priceSale: 35.0,
    daysStagnant: 1,
    status: 'normal',
    dataQualityScore: 99
  }),
  new Product({
    id: 'p_lola_almacen',
    name: 'Short Lola',
    category: 'textil',
    variants: 'Talla L / Color Rojo',
    storeId: 'almacen',
    stock: 20,
    costUnit: 15.0,
    priceSale: 30.0,
    daysStagnant: 1,
    status: 'normal',
    dataQualityScore: 99
  }),
  new Product({
    id: 'p_maria_almacen',
    name: 'Polo Maria',
    category: 'textil',
    variants: 'Talla L / Color Azul',
    storeId: 'almacen',
    stock: 20,
    costUnit: 18.0,
    priceSale: 35.0,
    daysStagnant: 2,
    status: 'normal',
    dataQualityScore: 99
  }),
  new Product({
    id: 'p_falda_linda',
    name: 'Falda Linda',
    category: 'textil',
    variants: 'Talla M / Color Rosa',
    storeId: 'almacen',
    stock: 15,
    costUnit: 16.0,
    priceSale: 32.0,
    daysStagnant: 2,
    status: 'normal',
    dataQualityScore: 98
  }),
  new Product({
    id: 'p1',
    name: 'Blusa Seda Satín Manga Larga',
    category: 'textil',
    variants: 'Talla M, L / Palo Rosa & Perla',
    storeId: 'guisado',
    stock: 12,
    costUnit: 25.0,
    priceSale: 45.0,
    daysStagnant: 58,
    status: 'frozen',
    dataQualityScore: 98
  }),
  new Product({
    id: 'p2',
    name: 'Pantalón Flare Drill Verde Militar',
    category: 'textil',
    variants: 'Talla 28, 30 / Verde Olivo',
    storeId: 'el_rey',
    stock: 6,
    costUnit: 30.0,
    priceSale: 60.0,
    daysStagnant: 49,
    status: 'frozen',
    dataQualityScore: 96
  }),
  new Product({
    id: 'p3',
    name: 'Polo Oversize Algodón Jersey 24/1',
    category: 'textil',
    variants: 'S, M, L / Blanco & Negro',
    storeId: 'guisado',
    stock: 4, // Alerta: por agotarse
    costUnit: 18.0,
    priceSale: 38.0,
    daysStagnant: 3,
    status: 'star',
    dataQualityScore: 99
  }),
  new Product({
    id: 'p4',
    name: 'Top Rib Básico Spun Colores',
    category: 'textil',
    variants: 'Estándar / Varios colores',
    storeId: 'el_rey',
    stock: 6,
    costUnit: 12.0,
    priceSale: 25.0,
    daysStagnant: 5,
    status: 'star',
    dataQualityScore: 95
  }),
  new Product({
    id: 'p5',
    name: 'Casaca Jean Crop Desflecada',
    category: 'textil',
    variants: 'Talla M / Celeste Vintage',
    storeId: 'guisado',
    stock: 8,
    costUnit: 38.0,
    priceSale: 68.0,
    daysStagnant: 22,
    status: 'normal',
    dataQualityScore: 94
  }),
  new Product({
    id: 'p6',
    name: 'Vestido Lino Verano Midi con Botones',
    category: 'textil',
    variants: 'S, M / Beige Natural',
    storeId: 'el_rey',
    stock: 14,
    costUnit: 28.0,
    priceSale: 52.0,
    daysStagnant: 18,
    status: 'normal',
    dataQualityScore: 97
  }),
  new Product({
    id: 'p7',
    name: 'Set Ganchos & Accesorios Cabello',
    category: 'bazar',
    variants: 'Pack x 12 unid / Surtido',
    storeId: 'guisado',
    stock: 25,
    costUnit: 4.5,
    priceSale: 12.0,
    daysStagnant: 14,
    status: 'normal',
    dataQualityScore: 92
  }),
  new Product({
    id: 'p8',
    name: 'Quinua Blanca Lavada x Kilo',
    category: 'abarrotes',
    variants: 'Bolsa 1 kg granel',
    storeId: 'almacen',
    stock: 40,
    costUnit: 7.0,
    priceSale: 11.5,
    daysStagnant: 8,
    status: 'star',
    dataQualityScore: 94
  })
];

export const SEED_PURCHASE_ORDERS = [
  new PurchaseOrder({
    id: 'oc_1',
    code: 'OC-2026-089',
    supplierName: 'Confecciones y Telas Don Carlos (Gamarra)',
    supplierPhone: '51999888777',
    date: '05/09/2026',
    status: 'pending_approval',
    items: [
      { productName: 'Polo Oversize Algodón Jersey 24/1', variants: '12 Blanco, 12 Negro, 12 Beige', quantity: 36, unitCost: 18.0 },
      { productName: 'Top Rib Básico Colores', variants: '8 Blanco, 8 Rosa Palo, 8 Negro', quantity: 24, unitCost: 12.0 }
    ]
  })
];

export const SEED_SCANNED_RECEIPTS = [
  {
    id: 'rec_001',
    documentNumber: 'B001-0004928',
    title: 'Boleta de Compra N° B001-0004928',
    provider: 'Textilera San Jacinto S.A.C.',
    date: '05/09/2026, 08:30',
    type: 'boleta',
    storeId: 'guisado',
    totalAmount: 936.00,
    itemsCount: 2,
    source: 'Gemini 2.5 Flash',
    items: [
      { name: 'Polo Oversize Algodón Jersey 24/1', qty: 36, costUnit: 18.00, priceSale: 38.00, total: 648.00 },
      { name: 'Top Rib Básico Spun Colores', qty: 24, costUnit: 12.00, priceSale: 25.00, total: 288.00 }
    ]
  },
  {
    id: 'rec_002',
    documentNumber: 'Cierre Diario #104',
    title: 'Cuaderno de Ventas Diarias',
    provider: 'Galería Guisado Puesto 104',
    date: '04/09/2026, 20:15',
    type: 'cuaderno',
    storeId: 'guisado',
    totalAmount: 269.00,
    itemsCount: 3,
    source: 'Motor Local Offline',
    items: [
      { name: 'Polo Oversize Blanco (M, L)', qty: 3, costUnit: 18.00, priceSale: 38.00, total: 114.00 },
      { name: 'Blusa Seda Satín Palo Rosa', qty: 1, costUnit: 25.00, priceSale: 45.00, total: 45.00 },
      { name: 'Top Rib Básico Negro/Rosa', qty: 2, costUnit: 12.00, priceSale: 25.00, total: 50.00 }
    ]
  }
];

