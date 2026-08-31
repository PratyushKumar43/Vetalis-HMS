/**
 * Caching Helper Compatibility Module
 * 
 * Note: Session & auth state are managed natively by Supabase (@supabase/ssr).
 * Redis is no longer required.
 */

export function getRedisClient() {
  return null;
}

export async function getCache<T>(key: string): Promise<T | null> {
  return null;
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number = 3600
): Promise<boolean> {
  return true;
}

export async function deleteCache(key: string): Promise<boolean> {
  return true;
}

export async function existsCache(key: string): Promise<boolean> {
  return false;
}

export async function invalidateCachePattern(pattern: string): Promise<boolean> {
  return true;
}
