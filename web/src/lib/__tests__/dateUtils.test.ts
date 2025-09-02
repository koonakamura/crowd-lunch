import { describe, it, expect } from 'vitest';
import { toServeDateKey } from '../dateUtils';

describe('toServeDateKey', () => {
  it('should handle JST midnight boundary correctly', () => {
    // JST is UTC+9, so 15:00 UTC = 00:00 JST next day
    const jstMidnight = new Date('2025-09-02T15:00:00.000Z'); // 00:00 JST on 2025-09-03
    const jstBeforeMidnight = new Date('2025-09-02T14:59:59.999Z'); // 23:59:59 JST on 2025-09-02
    
    expect(toServeDateKey(jstMidnight)).toBe('2025-09-03');
    expect(toServeDateKey(jstBeforeMidnight)).toBe('2025-09-02');
  });

  it('should handle UTC to JST conversion correctly', () => {
    const utcDate = new Date('2025-09-01T16:00:00.000Z'); // 01:00 JST next day
    expect(toServeDateKey(utcDate)).toBe('2025-09-02');
  });

  it('should use current date when no date provided', () => {
    const result = toServeDateKey();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('should handle daylight saving transitions', () => {
    const winterDate = new Date('2025-01-01T15:00:00.000Z'); // 00:00 JST
    const summerDate = new Date('2025-07-01T15:00:00.000Z'); // 00:00 JST
    
    expect(toServeDateKey(winterDate)).toBe('2025-01-02');
    expect(toServeDateKey(summerDate)).toBe('2025-07-02');
  });
});
