import { addDays, format } from 'date-fns';

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

export function weekStartOf(date: Date): string {
  const startOfWeek = new Date(date);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
  startOfWeek.setDate(diff);
  return format(startOfWeek, 'yyyy-MM-dd');
}
