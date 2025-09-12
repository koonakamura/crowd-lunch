/**
 * JST (Asia/Tokyo) datetime formatting utilities for Admin displays
 * Ensures consistent JST display regardless of server/client timezone
 */

/**
 * Normalize various date inputs to Date object
 * Handles epoch seconds, milliseconds, ISO strings, and Date objects
 */
function toDate(x: string | number | Date): Date {
  if (x instanceof Date) return x;
  if (typeof x === 'number') {
    return new Date(x < 1e12 ? x * 1000 : x);
  }
  return new Date(x); // ISO string or other formats
}

/**
 * JST formatter for datetime display (YYYY/MM/DD HH:mm format)
 * Uses Intl.DateTimeFormat to ensure consistent JST display
 */
const jstFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  calendar: 'gregory',
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/**
 * JST formatter for date-only display (YYYY/MM/DD format)
 */
const jstDateFormatter = new Intl.DateTimeFormat('ja-JP', {
  timeZone: 'Asia/Tokyo',
  calendar: 'gregory',
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Format datetime in JST timezone (YYYY/MM/DD HH:mm)
 * @param value - Date string, number (epoch), or Date object
 * @returns Formatted JST datetime string
 */
export function formatJst(value: string | number | Date | null | undefined): string {
  if (!value) return '';
  
  try {
    const date = toDate(value);
    if (isNaN(date.getTime())) return '';
    
    return jstFormatter.format(date);
  } catch (error) {
    console.warn('formatJst: Invalid date value:', value, error);
    return '';
  }
}

/**
 * Format date-only in JST timezone (YYYY/MM/DD)
 * @param value - Date string, number (epoch), or Date object
 * @returns Formatted JST date string
 */
export function formatJstDate(value: string | number | Date | null | undefined): string {
  if (!value) return '';
  
  try {
    const date = toDate(value);
    if (isNaN(date.getTime())) return '';
    
    return jstDateFormatter.format(date);
  } catch (error) {
    console.warn('formatJstDate: Invalid date value:', value, error);
    return '';
  }
}
