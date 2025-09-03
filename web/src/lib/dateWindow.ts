import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { startOfDay, addDays, eachDayOfInterval } from 'date-fns';

const ZONE = 'Asia/Tokyo';

export const toServeDateKey = (d: Date | number) => formatInTimeZone(d, ZONE, 'yyyy-MM-dd');

export const todayJST = (serverTime?: Date) => {
  const baseTime = serverTime || new Date();
  return startOfDay(toZonedTime(baseTime, ZONE));
};

export const makeWindowStartingAt = (start: Date, len = 10) =>
  eachDayOfInterval({ start, end: addDays(start, len - 1) });

export const rangeContains = (startKey: string, endKey: string, dateKey: string): boolean => {
  return startKey <= dateKey && dateKey <= endKey;
};
