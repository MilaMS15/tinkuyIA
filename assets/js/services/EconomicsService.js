/**
 * Servicio de Unit Economics y Valor del Propio Tiempo (Feedback Directo Jurado 2)
 * Calcula la rentabilidad real imputando el costo del tiempo de la emprendedora.
 */
export class EconomicsService {
  static calculate({
    monthlySales = 12000,
    cogsPercentage = 50,
    opex = 2800,
    hourlyWage = 25,
    hoursSpentManaging = 35
  }) {
    const cogsAmount = monthlySales * (cogsPercentage / 100);
    const grossProfit = monthlySales - cogsAmount;
    const ownTimeCost = hourlyWage * hoursSpentManaging;
    const realNetProfit = grossProfit - opex - ownTimeCost;

    // Horas ahorradas al mes gracias a la foto en 10 seg de Tinkuy IA vs. 3 hrs diarias manuales
    const hoursSavedMonth = 26;
    const moneySavedTime = hoursSavedMonth * hourlyWage;

    return {
      monthlySales,
      cogsPercentage,
      cogsAmount,
      grossProfit,
      opex,
      hourlyWage,
      hoursSpentManaging,
      ownTimeCost,
      realNetProfit,
      isProfitable: realNetProfit > 0,
      hoursSavedMonth,
      moneySavedTime
    };
  }
}
