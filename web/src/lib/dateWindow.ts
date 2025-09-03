import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { startOfDay, addDays, eachDayOfInterval } from 'date-fns';

const ZONE = 'Asia/Tokyo';

export const toServeDateKey = (d: Date | number) => formatInTimeZone(d, ZONE, 'yyyy-MM-dd');

export const todayJST = () => startOfDay(toZonedTime(new Date(), ZONE));

export const makeWindowStartingAt = (start: Date, len = 10) =>
  eachDayOfInterval({ start, end: addDays(start, len - 1) });

export const rangeContains = (startKey: string, endKey: string, dateKey: string): boolean => {
  return dateKey >= startKey && dateKey <= endKey;
};
