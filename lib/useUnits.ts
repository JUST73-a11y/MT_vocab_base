'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Unit } from './types';

const STALE_TIME_MS = 10_000; // 10 seconds for tighter sync

// adminTeacherId: only pass when admin wants to view a specific teacher's units
export function useUnits(userId?: string | null, adminTeacherId?: string | null) {
    const [units, setUnits] = useState<Unit[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lastFetchedAt = useRef<number>(0);
    const abortRef = useRef<AbortController | null>(null);

    const fetchUnits = useCallback(async (force = false) => {
        if (!userId) { setLoading(false); return; }

        const now = Date.now();
        if (!force && lastFetchedAt.current > 0 && now - lastFetchedAt.current < STALE_TIME_MS) return;

        // Cancel any in-flight request
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        try {
            const url = adminTeacherId ? `/api/units?teacherId=${adminTeacherId}` : '/api/units';
            const res = await fetch(url, { 
                signal: controller.signal, 
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });

            if (controller.signal.aborted) return;

            if (res.status === 401 || res.status === 403) {
                setError('Ruxsat yo\'q');
                setUnits([]);
                return;
            }

            if (!res.ok) {
                setUnits([]);
                return;
            }

            const data = await res.json();
            const mapped: Unit[] = (Array.isArray(data) ? data : []).map((u: any) => ({
                ...u,
                id: u._id || u.id,
            }));
            setUnits(mapped);
            lastFetchedAt.current = Date.now();
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            setError('Ma\'lumotlarni yuklashda xatolik');
            setUnits([]);
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [userId, adminTeacherId]);

    // Initial fetch and cleanup
    useEffect(() => {
        lastFetchedAt.current = 0; // force re-fetch on mount
        fetchUnits(true);

        const handleFocus = () => {
            // Auto re-fetch on window focus to ensure consistency between Dashboard and Units page
            fetchUnits(true);
        };

        window.addEventListener('focus', handleFocus);
        return () => { 
            window.removeEventListener('focus', handleFocus);
            abortRef.current?.abort(); 
        };
    }, [fetchUnits]);

    const refetch = useCallback((force = true) => fetchUnits(force), [fetchUnits]);

    return { units, loading, error, refetch };
}
