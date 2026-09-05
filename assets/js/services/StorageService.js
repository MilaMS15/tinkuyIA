import { Product } from '../models/Product.js';
import { PurchaseOrder } from '../models/PurchaseOrder.js';
import { SEED_PRODUCTS, SEED_PURCHASE_ORDERS, SEED_SCANNED_RECEIPTS } from '../data/mockData.js';

const STORAGE_KEY = 'tinkuy_ia_store_v2';
const API_KEY_STORAGE = 'tinkuy_gemini_api_key';

export class StorageService {
  static loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return this.initializeDefaults();
      }
      const parsed = JSON.parse(raw);
      return {
        products: (parsed.products || []).map(p => new Product(p)),
        purchaseOrders: (parsed.purchaseOrders || []).map(o => new PurchaseOrder(o)),
        scannedReceipts: (parsed.scannedReceipts && parsed.scannedReceipts.length > 0)
          ? parsed.scannedReceipts
          : SEED_SCANNED_RECEIPTS,
        streakDays: parsed.streakDays || 28,
        bankConsent: parsed.bankConsent !== undefined ? parsed.bankConsent : true,
        economics: parsed.economics || {
          sales: 12000,
          cogs: 50,
          opex: 2800,
          hourlyRate: 25,
          hoursSpent: 35
        }
      };
    } catch (e) {
      console.warn('Error leyendo localStorage, usando defaults:', e);
      return this.initializeDefaults();
    }
  }

  static saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Error guardando en localStorage:', e);
    }
  }

  static getGeminiApiKey() {
    return localStorage.getItem(API_KEY_STORAGE) || '';
  }

  static saveGeminiApiKey(key) {
    if (key) {
      localStorage.setItem(API_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(API_KEY_STORAGE);
    }
  }

  static getGeminiModel() {
    return localStorage.getItem('tinkuy_gemini_model') || 'gemini-2.5-flash';
  }

  static saveGeminiModel(model) {
    if (model) {
      localStorage.setItem('tinkuy_gemini_model', model.trim());
    }
  }

  static initializeDefaults() {
    const defaults = {
      products: SEED_PRODUCTS,
      purchaseOrders: SEED_PURCHASE_ORDERS,
      scannedReceipts: SEED_SCANNED_RECEIPTS,
      streakDays: 28,
      bankConsent: true,
      economics: {
        sales: 12000,
        cogs: 50,
        opex: 2800,
        hourlyRate: 25,
        hoursSpent: 35
      }
    };
    this.saveData(defaults);
    return defaults;
  }
}
