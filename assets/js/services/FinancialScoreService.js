/**
 * Servicio de Inclusión Financiera & Tinkuy Score B2B (Pitch Deck Pág 9 y 11)
 * Evalúa el riesgo crediticio real basado en la salud del inventario y el hábito de registro diario.
 */
export class FinancialScoreService {
  static calculateScore({ streakDays = 28, inventoryHealth = 85, averageMargin = 45 }) {
    // Ponderación del Score (0 a 1000 puntos):
    // 1. Constancia de Cierre Diario (Hábito): 350 pts
    const streakScore = Math.min(350, (streakDays / 30) * 350);

    // 2. Salud y Rotación de Inventario (menor % estancado): 400 pts
    const healthScore = (inventoryHealth / 100) * 400;

    // 3. Margen Operativo Sano: 250 pts
    const marginScore = Math.min(250, (averageMargin / 50) * 250);

    const totalScore = Math.round(streakScore + healthScore + marginScore);

    let classification = 'Bueno';
    let badgeColor = 'emerald';
    if (totalScore >= 750) {
      classification = 'Excelente (Elegible Microcrédito Preferencial)';
      badgeColor = 'emerald';
    } else if (totalScore >= 600) {
      classification = 'Saludable (Califica para Capital de Trabajo)';
      badgeColor = 'amber';
    } else {
      classification = 'En Construcción (Requiere 15 días más de fotos)';
      badgeColor = 'red';
    }

    return {
      totalScore,
      classification,
      badgeColor,
      streakScore: Math.round(streakScore),
      healthScore: Math.round(healthScore),
      marginScore: Math.round(marginScore)
    };
  }

  static getBankOffers(score) {
    if (score < 600) {
      return [];
    }

    return [
      {
        bank: 'Caja Arequipa',
        logoText: 'CA',
        logoBg: 'bg-red-600',
        amount: 5000,
        rate: '1.8% mensual Mype (vs 6% informal)',
        term: '12 a 18 meses',
        status: 'Preaprobado'
      },
      {
        bank: 'Caja Huancayo',
        logoText: 'CH',
        logoBg: 'bg-amber-600',
        amount: 3500,
        rate: '1.9% mensual Mype',
        term: '12 meses',
        status: 'Preaprobado'
      },
      {
        bank: 'Mibanco',
        logoText: 'MB',
        logoBg: 'bg-emerald-700',
        amount: 6000,
        rate: '2.1% mensual Mype',
        term: '18 meses',
        status: 'En Calificación'
      }
    ];
  }
}
