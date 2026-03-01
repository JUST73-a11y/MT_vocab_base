interface RateLimitRecord {
    count: number;
    lockUntil: number | null;
}

const rateStore = new Map<string, RateLimitRecord>();

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
    const record = rateStore.get(key);
    const now = Date.now();

    if (!record) {
        return { allowed: true };
    }

    if (record.lockUntil && now < record.lockUntil) {
        return { allowed: false, retryAfter: Math.ceil((record.lockUntil - now) / 1000) };
    }

    if (record.lockUntil && now >= record.lockUntil) {
        // Lock expired
        rateStore.delete(key);
        return { allowed: true };
    }

    return { allowed: true };
}

export function incrementFailedAttempt(key: string): boolean {
    const now = Date.now();
    const record = rateStore.get(key) || { count: 0, lockUntil: null };

    record.count += 1;

    let isLockedNow = false;
    if (record.count >= MAX_FAILED_ATTEMPTS) {
        record.lockUntil = now + LOCKOUT_MS;
        isLockedNow = true;
    }

    rateStore.set(key, record);
    return isLockedNow; // Return true if this increment caused a lock
}

export function resetRateLimit(key: string) {
    rateStore.delete(key);
}
