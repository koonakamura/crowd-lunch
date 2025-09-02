import { addDays, format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';

export function generateWeekdayDates(startDate: Date, count: number): Array<{ date: Date; formatted: string; dayName: string }> {
  const dates: Array<{ date: Date; formatted: string; dayName: string }> = [];
  let currentDate = new Date(startDate);
  
  while (dates.length < count) {
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    dates.push({
      date: new Date(currentDate),
      formatted: format(currentDate, 'M/d'),
      dayName: dayNamesEn[currentDate.getDay()]
    });
    
    currentDate = addDays(currentDate, 1);
  }
  
  return dates;
}

export function formatDateForApi(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function getTodayFormatted(): string {
  return format(new Date(), 'yyyy年M月d日');
}

export function toServeDateKey(date?: Date): string {
  const targetDate = date || new Date();
  const tokyoTime = toZonedTime(targetDate, 'Asia/Tokyo');
  return format(tokyoTime, 'yyyy-MM-dd');
}

export const createMenuQueryKey = (serveDateKey: string) => ['menus', serveDateKey] as const;

export const createPublicMenuQueryKey = (serveDateKey: string) => ['publicMenus', serveDateKey] as const;

export const createOrdersQueryKey = (serveDateKey: string) => ['orders', serveDateKey] as const;
