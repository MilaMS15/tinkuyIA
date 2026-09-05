/**
 * Servicio del Semáforo del Dinero y Modelo ABC (Pitch Deck Pág 4 y 6)
 * Traduce números en decisiones inmediatas sin jerga contable compleja.
 */
export class TrafficLightService {
  static analyzeInventory(products) {
    let frozenItems = [];
    let normalItems = [];
    let starItems = [];

    let totalFrozenCapital = 0;
    let totalNormalValue = 0;
    let totalStarCostToReorder = 0;

    products.forEach(prod => {
      prod.evaluateTrafficLight();

      if (prod.status === 'frozen') {
        frozenItems.push(prod);
        totalFrozenCapital += prod.frozenCapital;
      } else if (prod.status === 'star') {
        starItems.push(prod);
        totalStarCostToReorder += (prod.costUnit * 24); // reposición sugerida 2 docenas
      } else {
        normalItems.push(prod);
        totalNormalValue += prod.retailValue;
      }
    });

    // Ordenar estancados por días parados (mayor a menor)
    frozenItems.sort((a, b) => b.daysStagnant - a.daysStagnant);
    // Ordenar estrellas por stock disponible (menor a mayor riesgo de agotarse)
    starItems.sort((a, b) => a.stock - b.stock);

    return {
      frozenItems,
      normalItems,
      starItems,
      totalFrozenCapital,
      totalNormalValue,
      totalStarCostToReorder,
      abcDistribution: [
        Math.round(totalFrozenCapital),
        Math.round(totalNormalValue),
        Math.round(totalStarCostToReorder)
      ]
    };
  }

  // Genera recomendación en lenguaje natural y sin jerga
  static generateNarrativeInsight(analysis, userName = 'Sofía') {
    if (analysis.frozenItems.length === 0) {
      return `¡Excelente gestión, ${userName}! Tu inventario está rotando con fluidez y no tienes dinero congelado.`;
    }

    const worstItem = analysis.frozenItems[0];
    const topStar = analysis.starItems[0];

    let text = `${userName}, tienes **S/ ${analysis.totalFrozenCapital.toFixed(2)} congelados** en mercadería que no se mueve, especialmente en *${worstItem.name}* (parada hace ${worstItem.daysStagnant} días). `;

    if (topStar) {
      text += `Por otro lado, tu producto estrella *${topStar.name}* tiene solo **${topStar.stock} unidades** y corre riesgo de agotarse. ¡Usa el Botón de Rescate para combinarlos y liberar liquidez hoy mismo!`;
    } else {
      text += `Activa una promoción de rescate para recuperar tu costo antes de que pase más tiempo.`;
    }

    return text;
  }
}
