import { formatInTimeZone } from 'date-fns-tz';

const ZONE = 'Asia/Tokyo';

export function toServeDateKey(d: Date | string | number): string {
  const dt = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  return formatInTimeZone(dt, ZONE, 'yyyy-MM-dd');
}
