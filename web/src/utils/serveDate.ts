import { formatInTimeZone, toZonedTime } from 'date-fns-tz';

const ZONE = 'Asia/Tokyo';
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** 任意の入力を JST の 'yyyy-MM-dd' に正規化 */
export function toServeDateKey(d: Date | string | number): string {
  if (typeof d === 'string' && DATE_ONLY.test(d)) return d;

  const base = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;

  const zoned = toZonedTime(base, ZONE);
  return formatInTimeZone(zoned, ZONE, 'yyyy-MM-dd');
}
