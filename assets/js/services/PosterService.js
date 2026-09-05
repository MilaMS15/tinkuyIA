/**
 * Servicio del Botón de Rescate y Generador de Afiches (Pitch Deck Pág 4 y 6)
 * Genera combos estancado + estrella con protección de costos y afiches para WhatsApp.
 */
export class PosterService {
  // Encuentra la mejor pareja de rescate
  static suggestCombo(frozenItems, starItems) {
    const stagnant = frozenItems[0] || {
      name: 'Blusa Seda Satín Manga Larga',
      costUnit: 25.0,
      priceSale: 45.0,
      variants: 'M, L / Palo Rosa'
    };

    const star = starItems[0] || {
      name: 'Polo Oversize Algodón 24/1',
      costUnit: 18.0,
      priceSale: 38.0,
      variants: 'S, M, L / Blanco'
    };

    const totalOriginalPrice = stagnant.priceSale + star.priceSale;
    const totalCost = stagnant.costUnit + star.costUnit;

    // Precio sugerido: cubre el 100% de los costos + 35% de margen sobre el costo
    const suggestedComboPrice = Math.round((totalCost * 1.38) * 10) / 10;
    const profit = Math.round((suggestedComboPrice - totalCost) * 100) / 100;

    return {
      stagnant,
      star,
      totalOriginalPrice,
      totalCost,
      suggestedComboPrice,
      profit
    };
  }

  // Renderiza el afiche en alta definición sobre el Canvas
  static renderToCanvas(canvas, comboData, headlineText = '¡OFERTA RELÁMPAGO DE HOY! 🔥') {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Fondo degradado elegante: terracota suave, crema y blush
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#fbe9e7');
    grad.addColorStop(0.4, '#fffcf7');
    grad.addColorStop(1, '#ffeedd');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Marco exterior de marca Tinkuy
    ctx.strokeStyle = '#e76f51';
    ctx.lineWidth = 6;
    ctx.strokeRect(18, 18, w - 36, h - 36);

    ctx.strokeStyle = '#e9c46a';
    ctx.lineWidth = 2;
    ctx.strokeRect(26, 26, w - 52, h - 52);

    // Badge superior "Tinkuy IA · Combo Rescate"
    ctx.fillStyle = '#144e45';
    ctx.beginPath();
    ctx.roundRect(w / 2 - 160, 36, 320, 42, 12);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('✨ TINKUY IA · COMBO RESCATE ✨', w / 2, 63);

    // Titular principal
    ctx.fillStyle = '#e76f51';
    ctx.font = 'bold 23px "Playfair Display", Georgia, serif';
    ctx.fillText(headlineText, w / 2, 125);

    // Tarjeta 1: Producto Estancado
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(20, 78, 69, 0.08)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(45, 155, 230, 200, 16);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Contenido Tarjeta 1
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('PRENDA EXCLUSIVA', 160, 190);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px sans-serif';
    this.wrapText(ctx, comboData.stagnant.name, 160, 220, 200, 20);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText(comboData.stagnant.variants || 'Tallas seleccionadas', 160, 280);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`Antes: S/ ${comboData.stagnant.priceSale.toFixed(2)}`, 160, 315);

    // Signo MÁS central
    ctx.fillStyle = '#e76f51';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('+', w / 2, 265);

    // Tarjeta 2: Producto Estrella
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(20, 78, 69, 0.08)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.roundRect(325, 155, 230, 200, 16);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Contenido Tarjeta 2
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('⭐ MÁS VENDIDO', 440, 190);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px sans-serif';
    this.wrapText(ctx, comboData.star.name, 440, 220, 200, 20);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText(comboData.star.variants || 'Algodón peruano', 440, 280);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`Antes: S/ ${comboData.star.priceSale.toFixed(2)}`, 440, 315);

    // Gran Banner del Precio de Oferta
    ctx.fillStyle = '#144e45';
    ctx.beginPath();
    ctx.roundRect(75, 380, 450, 115, 22);
    ctx.fill();

    ctx.fillStyle = '#e9c46a';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('LLÉVATE AMBOS POR SOLO:', w / 2, 415);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 46px sans-serif';
    ctx.fillText(`S/ ${comboData.suggestedComboPrice.toFixed(2)}`, w / 2, 468);

    // Pie de página comercial
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('📲 ¡Escríbeme al WhatsApp para separar el tuyo!', w / 2, 535);

    ctx.fillStyle = '#64748b';
    ctx.font = '12px sans-serif';
    ctx.fillText('Pagos con Yape · Plin · Efectivo en tienda', w / 2, 558);
  }

  // Genera texto persuasivo para WhatsApp
  static generateWhatsAppCopy(comboData) {
    return (
      `¡Hola caserita linda! 💖 Por liquidación especial de temporada armamos este Combo Exclusivo:\n\n` +
      `✨ 1 ${comboData.star.name} (¡Nuestra prenda más vendida!)\n` +
      `✨ 1 ${comboData.stagnant.name}\n\n` +
      `Precio regular: S/ ${comboData.totalOriginalPrice.toFixed(2)}\n` +
      `🔥 *HOY EN COMBO POR SOLO: S/ ${comboData.suggestedComboPrice.toFixed(2)}*\n\n` +
      `¡Solo tengo 3 combos listos para entrega inmediata! Escríbeme para apartarlo por Yape o Plin. ¿Te guardo uno?`
    );
  }

  // Helper para salto de línea en Canvas
  static wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' ';
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line.trim(), x, currentY);
        line = words[n] + ' ';
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line.trim(), x, currentY);
  }
}
