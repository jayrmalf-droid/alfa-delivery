import { localDate } from './rules';

export const BUSINESS_TIME_ZONE = 'America/Bahia';
const dayPattern = /^\d{4}-\d{2}-\d{2}$/;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

/** A calendar date (due date/closing day) is not an instant: never shift it. */
export function calendarDate(value: unknown): string {
  if (typeof value !== 'string' || !dayPattern.test(value)) return '';
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? value : '';
}

function instant(value: unknown): Date | null {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  // Stored instants carry an offset. Reject ambiguous or missing timestamps.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T.+(?:Z|[+-]\d{2}:\d{2})$/i.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function businessDate(value?: unknown): string {
  if (arguments.length === 0) value = new Date();
  const day = calendarDate(value);
  if (day) return day;
  const date = instant(value);
  return date ? localDate(date) : '';
}
export function businessMonth(value?: unknown): string {
  return (arguments.length === 0 ? businessDate() : businessDate(value)).slice(0, 7);
}

export function inBusinessDateRange(value: unknown, start: string, end: string): boolean {
  const day = businessDate(value);
  return !!day && !!calendarDate(start) && !!calendarDate(end) && start <= end && day >= start && day <= end;
}
export function shiftCalendarDate(day: string, days: number): string {
  if (!calendarDate(day) || !Number.isInteger(days)) return '';
  const date = new Date(day + 'T12:00:00Z');
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
export function shiftCalendarMonth(month: string, months: number): string {
  if (!monthPattern.test(month) || !Number.isInteger(months)) return '';
  const date = new Date(month + '-01T12:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + months);
  return date.toISOString().slice(0, 7);
}
export function daysInCalendarMonth(month: string): number {
  if (!monthPattern.test(month)) return 0;
  const date = new Date(month + '-01T12:00:00Z');
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.getUTCDate();
}
export function businessHour(value: unknown): number | null {
  const date = instant(value);
  return date ? Number(new Intl.DateTimeFormat('en-US', { timeZone: BUSINESS_TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(date)) : null;
}
export function formatBusinessDate(value: unknown): string {
  const day = businessDate(value);
  return day ? day.split('-').reverse().join('/') : '—';
}
export function formatBusinessDateTime(value: unknown): string {
  if (calendarDate(value)) return formatBusinessDate(value);
  const date = instant(value);
  return date ? date.toLocaleString('pt-BR', { timeZone: BUSINESS_TIME_ZONE }) : '—';
}
