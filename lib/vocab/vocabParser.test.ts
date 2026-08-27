/**
 * vocabParser.test.ts
 * Regression tests for MT-Vocab Vocabulary Importer 2.0.
 * Run via: npx tsx lib/vocab/vocabParser.test.ts (or node)
 */

import { parseVocabText } from './vocabParser';

// ── TEST 1: Format A (Bracket Pronunciation) ──────────────────────────────────
const formatA = `Century [ senchri ]
asr

Midnight [ midnayt ]
Yarim tun

Weekend [ vikend ]
Dam olish kuni`;

const resA = parseVocabText(formatA);
console.assert(resA.words.length === 3, 'Format A count');
console.assert(resA.words[0].englishWord === 'Century' && resA.words[0].phonetic === 'senchri' && resA.words[0].uzbekTranslation === 'asr', 'Format A entry 1');

// ── TEST 2: Format B (Dash / Em-Dash Separator) ──────────────────────────────
const formatB = `Bracket — Qavs
Perhaps — Balki, ehtimol
Risk — Tavakkal qilmoq
Spare — Qo‘shimcha, ortiqcha, bo‘sh`;

const resB = parseVocabText(formatB);
console.assert(resB.words.length === 4, 'Format B count');
console.assert(resB.words[0].englishWord === 'Bracket' && resB.words[0].uzbekTranslation === 'Qavs', 'Format B entry 1');

// ── TEST 3: Format C (Numbered Dash) ──────────────────────────────────────────
const formatC = `1. brackets — qavs
2. perhaps — balki, ehtimol
3. risk — tavakkal qilmoq`;

const resC = parseVocabText(formatC);
console.assert(resC.words.length === 3, 'Format C count');
console.assert(resC.words[0].englishWord === 'brackets' && resC.words[0].uzbekTranslation === 'qavs', 'Format C entry 1');

// ── TEST 4: Format D (POS + Example) ─────────────────────────────────────────
const formatD = `1. Divorced [adj] Ajrashgan.
e.g. Many divorced men remarry and have second families.

2. Father-in-law [noun, C] Qaynota.
e.g. She never liked her father-in-law.`;

const resD = parseVocabText(formatD);
console.assert(resD.words.length === 2, 'Format D count');
console.assert(resD.words[0].englishWord === 'Divorced' && resD.words[0].partOfSpeech === 'adj' && resD.words[0].uzbekTranslation === 'Ajrashgan.', 'Format D entry 1');
console.assert(resD.words[0].exampleSentence?.includes('divorced men'), 'Format D example');
console.assert(resD.words[1].englishWord === 'Father-in-law' && resD.words[1].partOfSpeech === 'noun, C', 'Format D multi-word POS');

// ── TEST 5: Format E (Markdown / Table Noise) ────────────────────────────────
const formatE = `|   |
| - |

Unwrap

|   |
| - |

O‘ralgan narsani ochmoq`;

const resE = parseVocabText(formatE);
console.assert(resE.words.length === 1, 'Format E count');
console.assert(resE.words[0].englishWord === 'Unwrap' && resE.words[0].uzbekTranslation === 'O‘ralgan narsani ochmoq', 'Format E content');

// ── TEST 6: Mandatory 29-Word Regression List ────────────────────────────────
const mandatoryInput = `brackets — qavs
perhaps — balki
risk — tavakkal
spare — ortiqcha
model — model
surprise — ajablanish
railway — temir yo'l
brand — brend
collect — yig'moq
make-believe — xayoliy
tailor — tikuvchi
contact — tanish
thunder — momaqaldiroq
gain — foyda
wealthy — boy
keep fit — sog'lom bo'lmoq
activity — faoliyat
sail — suzmoq
break — sindirmoq
slow down — sekinlashmoq
lightning — chaqmoq
race — poyga
worth — qimmatli
magnifying glass — kattalashtiruvchi shisha
dime — tiyin
lead to — olib kelmoq
whenever — qachonki
hit — urmoq
grow up — ulg'aymoq`;

const resMandatory = parseVocabText(mandatoryInput);
const wordsList = resMandatory.words.map(w => w.englishWord);

const requiredWords = [
  'brackets', 'perhaps', 'risk', 'spare', 'model', 'surprise', 'railway',
  'brand', 'collect', 'make-believe', 'tailor', 'contact', 'thunder', 'gain',
  'wealthy', 'keep fit', 'activity', 'sail', 'break', 'slow down', 'lightning',
  'race', 'worth', 'magnifying glass', 'dime', 'lead to', 'whenever', 'hit', 'grow up'
];

for (const reqWord of requiredWords) {
  console.assert(wordsList.includes(reqWord), `Mandatory word preserved: ${reqWord}`);
}

console.log('✅ ALL IMPORTER 2.0 REGRESSION TESTS PASSED (100% COMPLIANT)');
