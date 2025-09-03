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

/**
 * Check if a date falls within a range (inclusive)
 * @param startKey - Start date in YYYY-MM-DD format
 * @param endKey - End date in YYYY-MM-DD format  
 * @param dateKey - Date to check in YYYY-MM-DD format
 * @returns true if dateKey is within [startKey, endKey]
 */
export const rangeContains = (startKey: string, endKey: string, dateKey: string): boolean => {
  return startKey <= dateKey && dateKey <= endKey;
};

/**
 * Create common invalidation handler for coordinating daily and weekly cache invalidation
 */
export const createCommonInvalidateHandler = (queryClient: unknown, dateKey: string) => ({
  invalidateWeeklyMenus: () => {
    (queryClient as { invalidateQueries: (options: { predicate: (q: unknown) => boolean }) => void }).invalidateQueries({
      predicate: (q: unknown) =>
        Array.isArray((q as { queryKey: unknown[] }).queryKey) &&
        (q as { queryKey: unknown[] }).queryKey[0] === 'weeklyMenus' &&
        rangeContains((q as { queryKey: string[] }).queryKey[1], (q as { queryKey: string[] }).queryKey[2], dateKey)
    });
  }
});

/**
 * Create weekly menu query key with date range
 */
export const createWeeklyMenuQueryKey = (startKey: string, endKey: string) => 
  ['weeklyMenus', startKey, endKey] as const;
