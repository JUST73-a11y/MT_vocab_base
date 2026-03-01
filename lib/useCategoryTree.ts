'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

export interface CategoryNode {
    _id: string;
    name: string;
    path: string;
    unitCount?: number;
    children: CategoryNode[];
}

const STALE_TIME_MS = 30_000;

export function useCategoryTree(userId?: string | null, includeCounts = false) {
    const [tree, setTree] = useState<CategoryNode[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const lastFetchedAt = useRef<number>(0);
    const abortRef = useRef<AbortController | null>(null);

    const fetchTree = useCallback(async (force = false) => {
        if (!userId) { setLoading(false); return; }

        const now = Date.now();
        if (!force && now - lastFetchedAt.current < STALE_TIME_MS) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        try {
            const url = `/api/teacher/categories/tree${includeCounts ? '?includeCounts=true' : ''}`;
            const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });

            if (controller.signal.aborted) return;
            if (!res.ok) { setTree([]); return; }

            const data = await res.json();
            setTree(Array.isArray(data) ? data : []);
            lastFetchedAt.current = Date.now();
        } catch (e: any) {
            if (e?.name === 'AbortError') return;
            setError('Kategoriyalarni yuklashda xatolik');
            setTree([]);
        } finally {
            if (!controller.signal.aborted) setLoading(false);
        }
    }, [userId, includeCounts]);

    useEffect(() => {
        lastFetchedAt.current = 0;
        fetchTree(true);
        return () => { abortRef.current?.abort(); };
    }, [fetchTree]);

    const refetch = useCallback(() => fetchTree(true), [fetchTree]);

    return { tree, loading, error, refetch };
}
