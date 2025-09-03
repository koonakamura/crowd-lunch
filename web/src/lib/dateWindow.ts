import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import { startOfDay, addDays, eachDayOfInterval } from 'date-fns';

const ZONE = 'Asia/Tokyo';

export const toServeDateKey = (d: Date | number) => formatInTimeZone(d, ZONE, 'yyyy-MM-dd');

/** serverTime(ISO/Date) があれば優先。なければ new Date() */
export const todayJST = (serverTime?: Date | string | number) => {
  const baseTime = serverTime ? new Date(serverTime) : new Date();
  return startOfDay(toZonedTime(baseTime, ZONE));
};

/** 左端=本日の 7 日窓（昇順） */
export const makeTodayWindow = (serverTime?: Date | string | number, len = 7) => {
  const t = todayJST(serverTime);
  return eachDayOfInterval({ start: t, end: addDays(t, len - 1) });
};

export const makeWindowStartingAt = (start: Date, len = 10) =>
  eachDayOfInterval({ start, end: addDays(start, len - 1) });

/**
 * Check if a date falls within a range (inclusive)
 * @param startKey - Start date in YYYY-MM-DD format
 * @param endKey - End date in YYYY-MM-DD format  
 * @param dateKey - Date to check in YYYY-MM-DD format
 * @returns true if dateKey is within [startKey, endKey] (YYYY-MM-DD string comparison)
 */
export const rangeContains = (startKey: string, endKey: string, dateKey: string): boolean => {
  return startKey <= dateKey && dateKey <= endKey; // YYYY-MM-DD 文字列比較
};
