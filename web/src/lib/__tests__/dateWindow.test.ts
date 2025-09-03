import { describe, it, expect } from 'vitest';
import { toServeDateKey, todayJST, rangeContains } from '../dateWindow';

describe('dateWindow', () => {
  describe('toServeDateKey', () => {
    it('should handle JST 00:00 boundary correctly', () => {
      const jstMidnight = new Date('2025-01-01T15:00:00.000Z'); // JST 00:00 on 2025-01-02
      const result = toServeDateKey(jstMidnight);
      expect(result).toBe('2025-01-02');
    });

    it('should handle JST 23:59 boundary correctly', () => {
      const jstEndOfDay = new Date('2025-01-01T14:59:59.999Z'); // JST 23:59 on 2025-01-01
      const result = toServeDateKey(jstEndOfDay);
      expect(result).toBe('2025-01-01');
    });
  });

  describe('todayJST', () => {
    it('should use serverTime when provided', () => {
      const serverTime = new Date('2025-01-01T15:00:00.000Z'); // JST 00:00 on 2025-01-02
      const result = todayJST(serverTime);
      expect(toServeDateKey(result)).toBe('2025-01-02');
      expect(result.getHours()).toBe(0); // Should be start of day
    });

    it('should fallback to current time when serverTime not provided', () => {
      const result = todayJST();
      expect(result).toBeInstanceOf(Date);
    });
  });

  describe('rangeContains', () => {
    it('should handle inclusive boundaries correctly', () => {
      expect(rangeContains('2025-01-01', '2025-01-05', '2025-01-01')).toBe(true);
      
      expect(rangeContains('2025-01-01', '2025-01-05', '2025-01-05')).toBe(true);
      
      expect(rangeContains('2025-01-01', '2025-01-05', '2025-01-03')).toBe(true);
      
      expect(rangeContains('2025-01-01', '2025-01-05', '2024-12-31')).toBe(false);
      
      expect(rangeContains('2025-01-01', '2025-01-05', '2025-01-06')).toBe(false);
    });

    it('should handle single day range', () => {
      expect(rangeContains('2025-01-01', '2025-01-01', '2025-01-01')).toBe(true);
      expect(rangeContains('2025-01-01', '2025-01-01', '2025-01-02')).toBe(false);
    });
  });
});
