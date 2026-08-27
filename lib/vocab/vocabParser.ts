/**
 * vocabParser.ts
 * Pure deterministic vocabulary text parser.
 *
 * RULES:
 *   - Teacher's word is SOURCE OF TRUTH. Never replace, never synonym-correct.
 *   - Every parsed word is traceable to its original input span.
 *   - Support formats: A (bracket pronunciation), B (dash/separator), C (numbered dash),
 *     D (inline POS + example), E (markdown/table), F (mixed).
 *   - Malformed bracket cleanup (e.g., [ pripea ] ] -> pripea).
 */

export interface ParsedWord {
    englishWord: string;
    uzbekTranslation: string;
    phonetic?: string;
    partOfSpeech?: string;
    exampleSentence?: string;
}

export interface ParseResult {
    words: ParsedWord[];
    warnings: string[];
}

function isNumberedBoundary(line: string): boolean {
    return /^\d+[\.\-\)]\s/.test(line);
}

function isInlineSeparator(line: string): boolean {
    return /\s[—–]\s/.test(line) || /\s-\s/.test(line);
}

const POS_REGEX = /^\[\s*(verb|noun|adj|adjective|adverb|phrase|idiom|prep|preposition|conj|conjunction|det|determiner|pron|pronoun)(,\s*[A-Z&]+)?\s*\]$/i;

function isPOSTag(line: string): boolean {
    return POS_REGEX.test(line.trim());
}

function cleanBrackets(str: string): string {
    // Strip leading [ or / and trailing ] or / plus extra trailing brackets from malformed input
    return str.replace(/^[\[\/]+\s*/, '').replace(/\s*[\]\/]+$/, '').trim();
}

function isPhonetic(line: string): boolean {
    const t = line.trim();
    if (isPOSTag(t)) return false;
    return (t.startsWith('[') || t.startsWith('/')) && (t.endsWith(']') || t.endsWith('/'));
}

function isExample(line: string): boolean {
    return /^e\.g\.\s*/i.test(line.trim()) || /^example:\s*/i.test(line.trim());
}

function splitBySeparator(line: string): [string, string] | null {
    const emDash = line.indexOf(' — ');
    if (emDash !== -1) return [line.slice(0, emDash).trim(), line.slice(emDash + 3).trim()];
    const enDash = line.indexOf(' – ');
    if (enDash !== -1) return [line.slice(0, enDash).trim(), line.slice(enDash + 3).trim()];
    // Spaced hyphen: only split on " - " (with spaces) to protect hyphenated words like "father-in-law"
    const spacedHyphen = line.indexOf(' - ');
    if (spacedHyphen !== -1) return [line.slice(0, spacedHyphen).trim(), line.slice(spacedHyphen + 3).trim()];
    return null;
}

function stripMarkdownNoise(text: string): string {
    return text
        .split('\n')
        .filter(line => {
            const t = line.trim();
            if (/^\|[\s\-|]+\|$/.test(t)) return false;
            if (/^\|\s*(ENGLISH|UZBEK|WORD|TRANSLATION|TARJIMA|SO'Z)\s*\|/i.test(t)) return false;
            return true;
        })
        .map(line => {
            const t = line.trim();
            if (t.startsWith('|') && t.endsWith('|')) {
                const cells = t.slice(1, -1).split('|').map((c: string) => c.trim()).filter(Boolean);
                if (cells.length >= 2) return cells.join('\t');
                if (cells.length === 1) return cells[0];
            }
            return line;
        })
        .join('\n');
}

export function parseVocabText(rawText: string): ParseResult {
    const words: ParsedWord[] = [];
    const warnings: string[] = [];

    const cleaned = stripMarkdownNoise(rawText);

    const lines = cleaned
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .map((l: string) => l.trim())
        .filter((l: string) =>
            l.length > 0 &&
            !/^(ENGLISH|TRANSCRIPT|UZBEK|TARJIMA)$/i.test(l) &&
            !/^\d+[\-\s]*(LESSON|UNIT)/i.test(l)
        );

    let i = 0;

    while (i < lines.length) {
        const raw = lines[i];
        const line = raw.replace(/^\d+[\.\-\)]\s*/, '').trim();

        let english = '';
        let translation = '';
        let phonetic = '';
        let pos = '';
        let example = '';

        // CASE A: Inline separator on this line ("word — tarjima")
        const separated = splitBySeparator(line);
        if (separated) {
            [english, translation] = separated;
            if (translation.toLowerCase().includes('e.g.')) {
                const eg = translation.match(/^(.*?)\s+e\.g\.\s+(.*)$/i);
                if (eg) { translation = eg[1].trim(); example = eg[2].trim(); }
            }
            if (i + 1 < lines.length && isExample(lines[i + 1])) {
                example = example || lines[i + 1].replace(/^e\.g\.\s*/i, '').replace(/^example:\s*/i, '').trim();
                i++;
            }
        }

        // CASE B: Format D style — "Divorced [adj] Ajrashgan." or "Father-in-law [noun, C] Qaynota."
        else if (/^(.*?)\s+(\[[^\]]+\])\s+(.+)$/.test(line)) {
            const match = line.match(/^(.*?)\s+(\[[^\]]+\])\s+(.+)$/)!;
            const tag = match[2];
            english = match[1].trim();

            if (isPOSTag(tag)) {
                pos = cleanBrackets(tag);
                translation = match[3].trim();
            } else {
                phonetic = cleanBrackets(tag);
                translation = match[3].trim();
            }

            if (i + 1 < lines.length && isExample(lines[i + 1])) {
                example = lines[i + 1].replace(/^e\.g\.\s*/i, '').replace(/^example:\s*/i, '').trim();
                i++;
            }
        }

        // CASE C: Column-based (tab, 2+ spaces, pipe)
        else if (/\t|\s{2,}|\|/.test(line)) {
            const parts = line.split(/\t|\s{2,}|\|/).map((p: string) => p.trim()).filter(Boolean);
            if (parts.length >= 3) {
                english = parts[0];
                if (isPhonetic(parts[1])) {
                    phonetic = cleanBrackets(parts[1]);
                    translation = parts.slice(2).join(' ');
                } else if (isPOSTag(parts[1])) {
                    pos = cleanBrackets(parts[1]);
                    translation = parts.slice(2).join(' ');
                } else {
                    translation = parts[1];
                    example = parts.slice(2).join(' ');
                }
            } else if (parts.length === 2) {
                english = parts[0];
                translation = parts[1];
            } else if (parts.length === 1) {
                english = parts[0];
            }
        }

        // CASE D: Plain word or word with phonetic on same line ("Century [ senchri ]")
        else {
            const bracketMatch = line.match(/^(.*?)\s+(\[[^\]]+\]|\/[^\/]+\/)$/);
            if (bracketMatch) {
                english = bracketMatch[1].trim();
                const tag = bracketMatch[2];
                if (isPOSTag(tag)) {
                    pos = cleanBrackets(tag);
                } else {
                    phonetic = cleanBrackets(tag);
                }
            } else {
                english = line;
            }
        }

        // RESOLVE TRANSLATION FROM SUBSEQUENT LINES IF NOT FOUND YET
        if (english && !translation) {
            // Optional POS tag on next line
            if (i + 1 < lines.length && isPOSTag(lines[i + 1])) {
                pos = cleanBrackets(lines[i + 1]);
                i++;
            }

            // Optional Phonetic on next line
            if (i + 1 < lines.length && isPhonetic(lines[i + 1])) {
                phonetic = cleanBrackets(lines[i + 1]);
                i++;
            }

            // Consume translation line — GUARD: don't consume next word boundary
            if (i + 1 < lines.length) {
                const nextLine = lines[i + 1];
                const nextClean = nextLine.replace(/^\d+[\.\-\)]\s*/, '').trim();
                const nextIsBoundary =
                    isNumberedBoundary(nextLine) ||
                    isInlineSeparator(nextClean) ||
                    isPhonetic(nextLine) ||
                    isPOSTag(nextLine) ||
                    isExample(nextLine);

                if (!nextIsBoundary) {
                    translation = nextLine.trim();
                    i++;

                    // Optional example on subsequent line
                    if (i + 1 < lines.length && isExample(lines[i + 1])) {
                        example = lines[i + 1].replace(/^e\.g\.\s*/i, '').replace(/^example:\s*/i, '').trim();
                        i++;
                    }
                    if (translation.toLowerCase().includes('e.g.')) {
                        const eg = translation.match(/^(.*?)\s+e\.g\.\s+(.*)$/i);
                        if (eg) { translation = eg[1].trim(); example = example || eg[2].trim(); }
                    }
                } else {
                    warnings.push(`"${english}" — tarjima topilmadi, o'tkazib yuborildi`);
                    i++;
                    continue;
                }
            } else {
                warnings.push(`"${english}" — tarjima yo'q (so'nggi qator), o'tkazib yuborildi`);
                i++;
                continue;
            }
        }

        if (english && translation) {
            words.push({
                englishWord: english,
                uzbekTranslation: translation,
                ...(phonetic ? { phonetic } : {}),
                ...(pos ? { partOfSpeech: pos } : {}),
                ...(example ? { exampleSentence: example } : {}),
            });
        } else if (english && !translation) {
            warnings.push(`"${english}" — tarjima yo'q, o'tkazib yuborildi`);
        }

        i++;
    }

    return { words, warnings };
}
