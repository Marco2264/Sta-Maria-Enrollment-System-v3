/**
 * Simple in-memory cache for analytics data with TTL.
 * Avoids heavy redundant reads from Firestore when navigating around the dashboard.
 */
class AnalyticsCache {
  private cache: Record<string, { data: unknown; expiry: number }> = {};
  
  // Default TTL: 5 minutes
  private readonly DEFAULT_TTL = 5 * 60 * 1000;

  get<T>(key: string): T | null {
    const item = this.cache[key];
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      delete this.cache[key];
      return null;
    }
    
    return item.data as T;
  }

  set(key: string, data: unknown, ttl: number = this.DEFAULT_TTL): void {
    this.cache[key] = {
      data,
      expiry: Date.now() + ttl,
    };
  }

  clear(key?: string): void {
    if (key) {
      delete this.cache[key];
    } else {
      this.cache = {};
    }
  }
}

export const analyticsCache = new AnalyticsCache();
