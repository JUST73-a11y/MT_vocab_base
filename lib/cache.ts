/**
 * Simple in-memory cache with TTL.
 * Works per-process (dev server / a single serverless instance).
 * For multi-instance (Vercel), benefits come from DB indexes.
 */

interface CacheEntry {
    value: any;
    expiresAt: number;
}

const store = new Map<string, CacheEntry>();

export const cache = {
    get<T>(key: string): T | null {
        const entry = store.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) {
            store.delete(key);
            return null;
        }
        return entry.value as T;
    },

    set(key: string, value: any, ttlMs = 30_000): void {
        store.set(key, { value, expiresAt: Date.now() + ttlMs });
    },

    del(key: string): void {
        store.delete(key);
    },

    /** Delete all keys that start with a given prefix */
    delByPrefix(prefix: string): void {
        for (const key of store.keys()) {
            if (key.startsWith(prefix)) store.delete(key);
        }
    },

    size(): number {
        return store.size;
    },
};
