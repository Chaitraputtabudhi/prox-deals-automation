export function getCurrentWeekRange(): { start: string; end: string } {
  const today = new Date();
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);

  return {
    start: today.toISOString().split('T')[0],
    end: nextWeek.toISOString().split('T')[0],
  };
}

export function updateDealDates<T extends { start: string; end: string }>(deals: T[]): T[] {
  const { start, end } = getCurrentWeekRange();
  return deals.map(deal => ({ ...deal, start, end }));
}