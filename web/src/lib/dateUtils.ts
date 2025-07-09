import { addDays, format, isWeekend } from 'date-fns';

export function generateWeekdayDates(startDate: Date, count: number): Array<{ date: Date; formatted: string; dayName: string }> {
  const dates: Array<{ date: Date; formatted: string; dayName: string }> = [];
  let currentDate = new Date(startDate);
  
  while (dates.length < count) {
    if (!isWeekend(currentDate)) {
      const dayNamesJa = ['日', '月', '火', '水', '木', '金', '土'];
      
      dates.push({
        date: new Date(currentDate),
        formatted: format(currentDate, 'M/d'),
        dayName: dayNamesJa[currentDate.getDay()]
      });
    }
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
