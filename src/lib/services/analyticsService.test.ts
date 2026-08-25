import { describe, it, expect, beforeEach } from 'vitest';
import { AnalyticsService } from './analyticsService';
import { analyticsCache } from './analyticsCache';

describe('AnalyticsService', () => {
  beforeEach(() => {
    analyticsCache.clear();
  });

  describe('getEnrollmentTrends', () => {
    it('returns an array of 6 months of data', async () => {
      const trends = await AnalyticsService.getEnrollmentTrends();
      expect(Array.isArray(trends)).toBe(true);
      expect(trends).toHaveLength(6);
      expect(trends[0]).toHaveProperty('month');
      expect(trends[0]).toHaveProperty('currentYear');
      expect(trends[0]).toHaveProperty('previousYear');
    });
  });

  describe('getAttendanceStats', () => {
    it('returns an array of 3 statuses', async () => {
      const stats = await AnalyticsService.getAttendanceStats();
      expect(Array.isArray(stats)).toBe(true);
      expect(stats).toHaveLength(3);
      expect(stats[0]).toHaveProperty('status');
      expect(stats[0]).toHaveProperty('count');
      
      const statuses = stats.map(s => s.status);
      expect(statuses).toContain('Present');
      expect(statuses).toContain('Absent');
      expect(statuses).toContain('Late');
    });
  });
});
