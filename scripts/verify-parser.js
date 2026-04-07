
const parseLine = (text) => {
    const cleanText = text.replace(/^\d+[\.\-\)]\s*/, '').trim();
    const bracketMatch = cleanText.match(/^(.*?)\s*(\[[^\]]+\]|\/[^\/]+\/)\s*(.*)$/);
    if (bracketMatch) {
        return {
            english: bracketMatch[1].trim(),
            pho: bracketMatch[2].replace(/[\[\]\/]/g, '').trim(),
            trans: bracketMatch[3].trim()
        };
    }
    
    // The NEW regex
    const separators = /\t|\s{2,}|(?<=\s)[-—–→](?=\s)|[|→]|[=:]+/;
    const parts = cleanText.split(separators).map(p => p.trim()).filter(Boolean);
    
    if (parts.length >= 2) {
        const english = parts[0];
        const translation = parts[parts.length - 1];
        const middleParts = parts.slice(1, -1);
        
        let phonetic = undefined;
        if (middleParts.length > 0) {
            const candidate = middleParts[0];
            if (candidate.toLowerCase() !== english.toLowerCase()) {
                phonetic = candidate;
            }
        }

        return {
            english: english,
            pho: phonetic,
            trans: translation
        };
    }
    return { english: cleanText, pho: undefined, trans: '' };
};

const testCases = [
    { input: "ocean - ocean - okean", expected: { english: 'ocean', pho: undefined, trans: 'okean' } },
    { input: "surface - surface - yuza", expected: { english: 'surface', pho: undefined, trans: 'yuza' } },
    { input: "blue-eyed - ko'k ko'zli", expected: { english: 'blue-eyed', pho: undefined, trans: "ko'k ko'zli" } },
    { input: "accessible - accessible - kirish mumkin bo'lgan", expected: { english: 'accessible', pho: undefined, trans: "kirish mumkin bo'lgan" } },
    { input: "word [word] translation", expected: { english: 'word', pho: 'word', trans: 'translation' } },
    { input: "word\ttranslation", expected: { english: 'word', pho: undefined, trans: 'translation' } }
];

testCases.forEach(({ input, expected }, i) => {
    const result = parseLine(input);
    const success = JSON.stringify(result) === JSON.stringify(expected);
    console.log(`Test ${i + 1}: ${success ? 'PASSED' : 'FAILED'}`);
    if (!success) {
        console.log(`  Input: ${input}`);
        console.log(`  Expected: ${JSON.stringify(expected)}`);
        console.log(`  Got:      ${JSON.stringify(result)}`);
    }
});
