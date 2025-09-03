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

    it('should handle JST midnight transition edge cases', () => {
      const beforeMidnight = new Date('2025-01-01T14:59:59.999Z');
      expect(toServeDateKey(beforeMidnight)).toBe('2025-01-01');
      
      const exactMidnight = new Date('2025-01-01T15:00:00.000Z');
      expect(toServeDateKey(exactMidnight)).toBe('2025-01-02');
      
      const afterMidnight = new Date('2025-01-01T15:00:01.000Z');
      expect(toServeDateKey(afterMidnight)).toBe('2025-01-02');
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

    it('should handle serverTime as string', () => {
      const serverTimeString = '2025-01-01T15:00:00.000Z';
      const result = todayJST(serverTimeString);
      expect(toServeDateKey(result)).toBe('2025-01-02');
    });

    it('should handle serverTime as number', () => {
      const serverTimeNumber = new Date('2025-01-01T15:00:00.000Z').getTime();
      const result = todayJST(serverTimeNumber);
      expect(toServeDateKey(result)).toBe('2025-01-02');
    });
  });

  describe('rangeContains', () => {
    it('should handle inclusive boundaries correctly (start<=d<=end)', () => {
      expect(rangeContains('2025-01-01', '2025-01-05', '2025-01-01')).toBe(true);
      
      expect(rangeContains('2025-01-01', '2025-01-05', '2025-01-05')).toBe(true);
      
      expect(rangeContains('2025-01-01', '2025-01-05', '2025-01-03')).toBe(true);
      
      expect(rangeContains('2025-01-01', '2025-01-05', '2024-12-31')).toBe(false);
      
      expect(rangeContains('2025-01-01', '2025-01-05', '2025-01-06')).toBe(false);
    });

    it('should handle single day range', () => {
      expect(rangeContains('2025-01-01', '2025-01-01', '2025-01-01')).toBe(true);
      expect(rangeContains('2025-01-01', '2025-01-01', '2025-01-02')).toBe(false);
      expect(rangeContains('2025-01-01', '2025-01-01', '2024-12-31')).toBe(false);
    });

    it('should handle YYYY-MM-DD string comparison edge cases', () => {
      expect(rangeContains('2025-01-01', '2025-12-31', '2025-06-15')).toBe(true);
      expect(rangeContains('2025-01-01', '2025-01-31', '2025-02-01')).toBe(false);
      expect(rangeContains('2024-12-01', '2025-01-31', '2025-01-01')).toBe(true);
      
      expect(rangeContains('2024-12-25', '2025-01-05', '2024-12-31')).toBe(true);
      expect(rangeContains('2024-12-25', '2025-01-05', '2025-01-01')).toBe(true);
    });
  });
});
