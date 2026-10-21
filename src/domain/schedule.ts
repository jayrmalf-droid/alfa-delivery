import { calendarDate, shiftCalendarDate, daysInCalendarMonth } from './businessDates';

export type SchedulePeriod = 'today' | 'tomorrow' | 'week' | 'month';

export function scheduleDateRange(today: string, period: SchedulePeriod): { start: string; end: string } {
  if (!calendarDate(today)) return { start: '', end: '' };
  if (period === 'tomorrow') {
    const tomorrow = shiftCalendarDate(today, 1);
    return { start: tomorrow, end: tomorrow };
  }
  if (period === 'week') {
    const weekday = new Date(today + 'T12:00:00Z').getUTCDay();
    const start = shiftCalendarDate(today, -((weekday + 6) % 7));
    return { start, end: shiftCalendarDate(start, 6) };
  }
  if (period === 'month') {
    const month = today.slice(0, 7);
    return { start: month + '-01', end: `${month}-${daysInCalendarMonth(month)}` };
  }
  return { start: today, end: today };
}
