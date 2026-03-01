import { User, Unit, Word, Settings, Session } from './types';

// Helper for API calls
async function fetchApi<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(`/api${endpoint}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!res.ok) {
        throw new Error(`API call failed: ${res.statusText}`);
    }

    // Handle empty responses
    const text = await res.text();
    return text ? JSON.parse(text) : (null as T);
}

// Users
export const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'totalWordsSeen'>) => {
    // Registration is handled via AuthContext /api/auth/register
    // This might be redundant or used for admin, but for now let's reuse auth api or throw
    throw new Error('Use signUp from AuthContext');
};

export const getUser = async (userId: string): Promise<User | null> => {
    // In MongoDB/NextAuth, we usually get user from session/AuthContext
    // But if we need to fetch fresh:
    // For now, let's assume AuthContext handles this wrapper via /api/auth/me
    // Or we can implement a specific user endpoint if needed.
    // The AuthContext uses /api/auth/me. 
    return null;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
    // This was used in Firebase Auth wrapper. 
    // With custom auth, we don't need this on client side usually.
    return null;
};

export const updateUserWordCount = async (userId: string, count: number) => {
    return fetchApi<User>(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ totalWordsSeen: count }),
    });
};

// Units
export const createUnit = async (title: string, createdBy: string, category: string = 'Uncategorized', customTimer?: number) => {
    const unit = await fetchApi<Unit>('/units', {
        method: 'POST',
        body: JSON.stringify({ title, createdBy, category, customTimer }),
    });
    return unit.id || (unit as any)._id;
};

export const getUnits = async (teacherId?: string): Promise<Unit[]> => {
    const query = teacherId ? `?teacherId=${teacherId}` : '';
    const units = await fetchApi<any[]>('/units' + query);
    // Map _id to id
    return units.map(u => ({ ...u, id: u._id || u.id }));
};

export const getUnit = async (unitId: string): Promise<Unit | null> => {
    const unit = await fetchApi<any>(`/units/${unitId}`);
    if (!unit) return null;
    return { ...unit, id: unit._id || unit.id };
};

export const updateUnit = async (unitId: string, title: string, category?: string, customTimer?: number | null) => {
    await fetchApi(`/units/${unitId}`, {
        method: 'PUT',
        body: JSON.stringify({ title, category, customTimer }),
    });
};

export const deleteUnit = async (unitId: string) => {
    await fetchApi(`/units/${unitId}`, {
        method: 'DELETE',
    });
};

// Words
export const createWord = async (wordData: Omit<Word, 'id'>) => {
    const word = await fetchApi<any>('/words', {
        method: 'POST',
        body: JSON.stringify(wordData),
    });
    return word._id || word.id;
};

export const createWords = async (wordsData: Omit<Word, 'id'>[]) => {
    const words = await fetchApi<any[]>('/words', {
        method: 'POST',
        body: JSON.stringify(wordsData),
    });
    return words.map(w => w._id || w.id);
};

export const getWordsByUnit = async (unitId: string): Promise<Word[]> => {
    const words = await fetchApi<any[]>(`/words?unitId=${unitId}`);
    return words.map(w => ({ ...w, id: w._id || w.id }));
};

export const getWordsByUnits = async (unitIds: string[]): Promise<Word[]> => {
    if (unitIds.length === 0) return [];
    const words = await fetchApi<any[]>(`/words?unitIds=${unitIds.join(',')}`);
    return words.map(w => ({ ...w, id: w._id || w.id }));
};

export const updateWord = async (wordId: string, wordData: Partial<Omit<Word, 'id'>>) => {
    await fetchApi(`/words/${wordId}`, {
        method: 'PUT',
        body: JSON.stringify(wordData),
    });
};

export const deleteWord = async (wordId: string) => {
    await fetchApi(`/words/${wordId}`, {
        method: 'DELETE',
    });
};

// Settings
export const getSettings = async (teacherId: string): Promise<Settings | null> => {
    const settings = await fetchApi<any>(`/settings?teacherId=${teacherId}`);
    if (!settings) return null;
    return { ...settings, id: settings._id || settings.id };
};

// MVP Helper for student mode (gets *any* teacher's settings, or specific if provided)
export const getRandomTeacherSettings = async (userId?: string): Promise<Settings | null> => {
    // If userId is provided, try to get that teacher's settings first
    if (userId) {
        const settings = await getSettings(userId);
        if (settings) return settings;
    }

    // Fallback to random/first settings
    const settings = await fetchApi<any>('/settings');
    if (!settings) return null;
    return { ...settings, id: settings._id || settings.id };
};

export const createSettings = async (teacherId: string) => {
    return fetchApi<any>('/settings', {
        method: 'POST',
        body: JSON.stringify({ teacherId, selectedUnits: [], timerDuration: 30 }),
    });
};

export const updateSettings = async (settingsId: string, data: Partial<Omit<Settings, 'id' | 'teacherId'>>) => {
    // settingsId isn't really used in our API route, we use upsert by teacherId usually
    // But let's pass it if we have it, or we might need to change the signature
    // The API route expects { teacherId, selectedUnits, timerDuration }
    // So we need to ensure those are passed.
    // Wait, the API route I wrote uses upsert by teacherId logic in POST. 
    // GET returns the object. 
    // Let's rely on the POST (upsert) behavior.
    // Actually, client calls `updateSettings` which takes `settingsId` and `data`.
    // `data` has `selectedUnits` and `timerDuration`.
    // I need `teacherId` to call my API properly if I use the current POST implementation.
    // Or I should make the API accept `id` for updates.
    // Let's just create a wrapper that matches the signature.
    // Limitation: I don't have teacherId here easily unless it's in `data`.
    // Let's fetch settings first or assume the caller passes what's needed.
    // Actually, the Settings page component has `user` available.
    // Let's modify the Settings page to pass teacherId or modify this function.
    // Easier: Modify `api/settings` to accept PUT with ID? 
    // But settings are 1:1 with teacher.
    // Let's checking `lib/firestore.ts` usage in `app/teacher/settings/page.tsx`:
    // It calls `await updateSettings(settings.id, { selectedUnits, timerDuration });`
    // It also calls `createSettings(user.id)`.

    // Okay, I need to handle `updateSettings`. 
    // Since I don't have teacherId in the arguments for updateSettings, 
    // I should probably change how update works in API or Client.
    // API `app/api/settings/route.ts` is GET/POST.
    // I'll assume I can just use POST/upsert if I have teacherId.
    // But I don't have teacherId in `updateSettings(id, data)`.
    // Wait, I can't easily implement `updateSettings` without teacherId if my API depends on it.
    // Alternate: Add PUT `/api/settings` that takes ID.
    // Let's fix `app/api/settings/route.ts` to support PUT or check logic.

    // Actually, better: The Settings page has access to `user.id`.
    // I can ignore `settingsId` and use `user.id` if I update the component.
    // Or I can update `updateSettings` signature? No, that breaks compatibility if used elsewhere.
    // Let's make `app/api/settings/route.ts` smarter or create `app/api/settings/[id]/route.ts`.
    // Let's create `app/api/settings/[id]/route.ts` for PUT.

    // WAIT, I haven't created `app/api/settings/[id]/route.ts`. I should do that.

    // For now, let's implement `updateSettings` to throw or hack it?
    // No, let's just make `createSettings` do the upsert call, and `updateSettings` do the same?
    // But `updateSettings` doesn't receive `teacherId`.
    // Let's look at `Settings` type. It has `teacherId`.
    // I can modify the API to accept `id` in PUT.

    if ((data as any).teacherId) {
        await fetchApi('/settings', {
            method: 'POST',
            body: JSON.stringify({ ...data, teacherId: (data as any).teacherId })
        });
    } else {
        // Fallback: If we don't have teacherId, we can't use the POST upsert route easily without fetching first.
        // But wait! `updateSettings` is called with `settings.id`.
        // I can add a route `api/settings/[id]` to update by ID.
        // I'll add that file next.
        await fetchApi(`/settings/${settingsId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }
};


// Sessions
export const createSession = async (studentId: string) => {
    const date = new Date().toISOString().split('T')[0];
    const session = await fetchApi<any>('/sessions', {
        method: 'POST',
        body: JSON.stringify({ studentId, date, wordsSeen: [] }),
    });
    return session._id || session.id;
};

export const getTodaySession = async (studentId: string): Promise<Session | null> => {
    const date = new Date().toISOString().split('T')[0];
    const session = await fetchApi<any>(`/sessions?studentId=${studentId}&date=${date}`);
    if (!session) return null;
    return { ...session, id: session._id || session.id };
};

export const updateSession = async (sessionId: string, wordsSeen: string[], timeSpentSeconds: number = 0) => {
    // We use PUT /sessions for updates roughly
    // My route `app/api/sessions/route.ts` handles PUT with `sessionId` in body.
    await fetchApi('/sessions', {
        method: 'PUT',
        body: JSON.stringify({ sessionId, wordsSeen, timeSpentSeconds }),
    });
};
