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

export const formatJSTTime = (utcDateString: string): string => {
  const date = new Date(utcDateString);
  
  try {
    return date.toLocaleString('ja-JP', { 
      timeZone: 'Asia/Tokyo', 
      month: '2-digit', 
      day: '2-digit', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  } catch {
    const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
    const month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(jstDate.getUTCDate()).padStart(2, '0');
    const hour = String(jstDate.getUTCHours()).padStart(2, '0');
    const minute = String(jstDate.getUTCMinutes()).padStart(2, '0');
    return `${month}/${day} ${hour}:${minute}`;
  }
};
