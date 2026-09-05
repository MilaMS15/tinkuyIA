import { Product } from '../models/Product.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';

/**
 * Datos semilla iniciales basados en hallazgos reales de campo en Gamarra y comercio minorista
 */
export const SEED_PRODUCTS = [
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
