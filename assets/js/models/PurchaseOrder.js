/**
 * Entidad Orden de Compra (IA Operativa - Feedback Jurado 2)
 * Pasa de una IA pasiva/consultiva a un software que ejecuta órdenes de abastecimiento.
 */
export class PurchaseOrder {
  constructor({
    id,
    code,
    supplierName,
    supplierPhone,
    date = new Date().toLocaleDateString('es-PE'),
    items = [],
    status = 'pending_approval' // 'pending_approval', 'sent', 'received'
  }) {
    this.id = id || 'oc_' + Date.now();
    this.code = code || `OC-2026-${Math.floor(100 + Math.random() * 900)}`;
    this.supplierName = supplierName || 'Confecciones y Telas Don Carlos (Gamarra)';
    this.supplierPhone = supplierPhone || '51999888777';
    this.date = date;
    this.items = items; // [{ productName, variants, quantity, unitCost }]
    this.status = status;
  }

  get totalAmount() {
    return this.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);
  }

  // Genera el texto formal listo para enviar a WhatsApp del proveedor
  toWhatsAppMessage(businessName = 'Taller y Confecciones Sofía') {
    let msg = `*ORDEN DE COMPRA FORMAL - TINKUY IA*\n`;
    msg += `*Folio:* ${this.code}\n`;
    msg += `*Emisor:* ${businessName}\n`;
    msg += `*Proveedor:* ${this.supplierName}\n`;
    msg += `*Fecha:* ${this.date}\n\n`;
    msg += `Estimado proveedor, solicitamos despachar los siguientes pedidos con stock bajo:\n\n`;

    this.items.forEach((item, index) => {
      const subtotal = (item.quantity * item.unitCost).toFixed(2);
      msg += `${index + 1}. *${item.productName}*\n`;
      msg += `   • Variantes: ${item.variants}\n`;
      msg += `   • Cantidad: ${item.quantity} unidades\n`;
      msg += `   • Costo Unit: S/ ${item.unitCost.toFixed(2)} | Subtotal: S/ ${subtotal}\n\n`;
    });

    msg += `*TOTAL A PAGAR: S/ ${this.totalAmount.toFixed(2)}*\n`;
    msg += `Forma de entrega: Enviar a tienda Galería Guisado #104. Confirmar despacho por este medio.`;

    return encodeURIComponent(msg);
  }
}
