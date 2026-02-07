/**
 * Calculate ACOS (Advertising Cost of Sales)
 * ACOS = (Ad Spend / Ad Revenue) * 100
 */
export function calculateAcos(cost: number, sales: number): number {
  if (sales === 0) return 0;
  return (cost / sales) * 100;
}

/**
 * Calculate ROAS (Return on Ad Spend)
 * ROAS = Ad Revenue / Ad Spend
 */
export function calculateRoas(sales: number, cost: number): number {
  if (cost === 0) return 0;
  return sales / cost;
}

/**
 * Calculate CTR (Click-Through Rate)
 * CTR = (Clicks / Impressions) * 100
 */
export function calculateCtr(clicks: number, impressions: number): number {
  if (impressions === 0) return 0;
  return (clicks / impressions) * 100;
}

/**
 * Calculate CPC (Cost Per Click)
 * CPC = Ad Spend / Clicks
 */
export function calculateCpc(cost: number, clicks: number): number {
  if (clicks === 0) return 0;
  return cost / clicks;
}

/**
 * Calculate Conversion Rate
 * Conversion Rate = (Orders / Clicks) * 100
 */
export function calculateConversionRate(orders: number, clicks: number): number {
  if (clicks === 0) return 0;
  return (orders / clicks) * 100;
}

/**
 * Calculate Average Order Value
 * AOV = Sales / Orders
 */
export function calculateAov(sales: number, orders: number): number {
  if (orders === 0) return 0;
  return sales / orders;
}

/**
 * Calculate Budget Pacing Percentage
 * Pacing = (Spent / Budget) * 100
 */
export function calculateBudgetPacing(spent: number, budget: number): number {
  if (budget === 0) return 0;
  return (spent / budget) * 100;
}

/**
 * Calculate projected monthly spend based on current pace
 */
export function calculateProjectedMonthlySpend(
  dailySpend: number,
  daysInMonth: number = 30
): number {
  return dailySpend * daysInMonth;
}

/**
 * Determine budget pacing status
 */
export function getBudgetPacingStatus(
  pacePercentage: number,
  hourOfDay: number
): 'on-track' | 'over-pacing' | 'under-pacing' {
  const expectedPace = (hourOfDay / 24) * 100;
  const threshold = 15; // 15% tolerance

  if (pacePercentage > expectedPace + threshold) {
    return 'over-pacing';
  } else if (pacePercentage < expectedPace - threshold) {
    return 'under-pacing';
  }
  return 'on-track';
}

/**
 * Calculate percentage change between two values
 */
export function calculatePercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}
