import { formatInTimeZone } from 'date-fns-tz';

const ZONE = 'Asia/Tokyo';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** 任意の入力を JST の 'yyyy-MM-dd' に正規化 */
export function toServeDateKey(d: Date | string | number): string {
  if (typeof d === 'string' && DATE_ONLY.test(d)) return d;

  let date: Date;
  
  if (typeof d === 'number') {
    const timestamp = d < 10000000000 ? d * 1000 : d;
    date = new Date(timestamp);
  } else if (typeof d === 'string') {
    date = new Date(d);
  } else {
    date = d;
  }

  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date input: ${d}`);
  }

  return formatInTimeZone(date, ZONE, 'yyyy-MM-dd');
}
