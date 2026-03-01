import { Word } from './types';

/**
 * Gets a random word from the pool that hasn't been seen in this session
 * @param words - Array of words to choose from
 * @param seenWordIds - Array of word IDs already seen in this session to exclude
 * @param lastUnitId - Optional ID of the unit the last word belonged to (to avoid immediate repeat)
 * @returns A random word or null if all words have been seen
 */
export const getRandomWord = (words: Word[], seenWordIds: string[], lastUnitId?: string): Word | null => {
    // 1. Filter out seen words
    let candidates = words.filter(word => !seenWordIds.includes(word.id));

    if (candidates.length === 0) {
        return null; // All words blocked
    }

    // 2. Optimization: Try to pick a word from a DIFFERENT unit if possible
    if (lastUnitId) {
        const differentUnitWords = candidates.filter(w => w.unitId !== lastUnitId);
        // Only prioritize if there are actually words from other units available
        if (differentUnitWords.length > 0) {
            candidates = differentUnitWords;
        }
    }

    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex];
};

/**
 * Shuffles an array using Fisher-Yates algorithm
 * @param array - Array to shuffle
 * @returns Shuffled array
 */
export const shuffleArray = <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

/**
 * Calculates which words should be excluded to ensure balanced practice 
 * while avoiding immediate repetition (buffer).
 * 
 * Strategy:
 * 1. Count frequency of each available word in the history.
 * 2. Identify the minimum frequency (words seen least often).
 * 3. Exclude any word that has been seen MORE than the minimum frequency (forcing catch-up).
 * 4. ALWAYS exclude the last N words to prevent immediate back-to-back repetition.
 * 
 * @param allWords - The pool of available words
 * @param historyIds - List of word IDs seen so far (in order)
 * @param bufferSize - Number of recent words to always block (default 2)
 */
export const getBalancedExclusions = (allWords: Word[], historyIds: string[], bufferSize: number = 2): string[] => {
    if (allWords.length === 0) return [];

    // 1. Calculate frequencies
    const freqMap: Record<string, number> = {};
    allWords.forEach(w => freqMap[w.id] = 0);

    // Only count frequencies for words that are currently in the pool
    // (History might contain words not in current selection, ignore them)
    historyIds.forEach(id => {
        if (freqMap[id] !== undefined) {
            freqMap[id]++;
        }
    });

    const freqs = Object.values(freqMap);
    const minFreq = Math.min(...freqs);

    // 2. Identify words to exclude based on balance (freq > minFreq)
    const balancedExclusions = allWords
        .filter(w => freqMap[w.id] > minFreq)
        .map(w => w.id);

    // 3. Identify buffer exclusions (last N words)
    // We only care about words that are actually in our pool
    const recentHistory = historyIds
        .filter(id => freqMap[id] !== undefined)
        .slice(-bufferSize);

    // 4. Combine exclusions
    const combined = new Set([...balancedExclusions, ...recentHistory]);

    // SAFETY CHECK: If we exclude everything, relax the rules
    // (Precedence: Buffer > Balance)
    // If excluding everything, drop the "Balance" constraint and ONLY use "Buffer".
    if (combined.size >= allWords.length) {
        // If buffer alone excludes everything (e.g. pool size < buffer), 
        // then we must allow even the buffer (or reduce buffer).
        if (recentHistory.length >= allWords.length) {
            // Pool is tiny (e.g. 1 word). We must repeat it.
            return [];
        }
        return recentHistory;
    }

    return Array.from(combined);
};
