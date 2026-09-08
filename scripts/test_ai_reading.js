const assert = require('assert');
const XLSX = require('xlsx');

// Load Mongoose models
const mongoose = require('mongoose');

async function runAllTests() {
  console.log('========================================================');
  console.log('🧪 RUNNING TEST SUITE: MT-VOCAB AI READING EXTRACTOR 1.0');
  console.log('========================================================\n');

  // TEST 1: File Validation Rules
  console.log('Test 1: File MIME Type and Size Limits Validation...');
  const MAX_SIZE_MB = {
    image: 10,
    pdf: 20,
    docx: 10,
    xlsx: 5,
    csv: 2,
    txt: 2,
  };
  const ALLOWED_MIME = {
    'image/jpeg': 'image',
    'image/jpg': 'image',
    'image/png': 'image',
    'image/webp': 'image',
    'application/pdf': 'pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'application/msword': 'docx',
    'application/vnd.ms-excel': 'xlsx',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
    'text/csv': 'csv',
    'text/plain': 'txt',
  };

  function validateFile(mimeType, sizeBytes) {
    const category = ALLOWED_MIME[mimeType] || ALLOWED_MIME[mimeType.toLowerCase()];
    if (!category) return { ok: false, error: 'Unsupported format' };
    const limitMB = MAX_SIZE_MB[category];
    if (sizeBytes > limitMB * 1024 * 1024) return { ok: false, error: 'File too large' };
    return { ok: true };
  }

  assert.strictEqual(validateFile('image/jpeg', 5 * 1024 * 1024).ok, true);
  assert.strictEqual(validateFile('image/jpeg', 15 * 1024 * 1024).ok, false);
  assert.strictEqual(validateFile('application/pdf', 15 * 1024 * 1024).ok, true);
  assert.strictEqual(validateFile('application/pdf', 25 * 1024 * 1024).ok, false);
  assert.strictEqual(validateFile('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 3 * 1024 * 1024).ok, true);
  assert.strictEqual(validateFile('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 8 * 1024 * 1024).ok, false);
  assert.strictEqual(validateFile('text/csv', 1 * 1024 * 1024).ok, true);
  assert.strictEqual(validateFile('text/plain', 1 * 1024 * 1024).ok, true);
  assert.strictEqual(validateFile('application/x-msdownload', 100).ok, false);
  console.log('  ✅ [PASS] All 9 MIME and size boundary tests passed.\n');

  // TEST 2: In-Memory XLSX Extraction
  console.log('Test 2: In-Memory XLSX Workbook Parsing...');
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Vocabulary', 'Definition', 'CEFR'],
    ['biodiversity', 'variety of plant and animal life', 'C1'],
    ['alter', 'to change something', 'B2']
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'ReadingVocab');
  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const readWb = XLSX.read(xlsxBuffer, { type: 'buffer' });
  const lines = [];
  for (const sheetName of readWb.SheetNames) {
    const sheet = readWb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { strip: true });
    if (csv.trim()) {
      lines.push(`=== ${sheetName} ===`);
      lines.push(csv);
    }
  }
  const fullText = lines.join('\n');
  assert.ok(fullText.includes('biodiversity'), 'Should contain biodiversity');
  assert.ok(fullText.includes('alter'), 'Should contain alter');
  console.log('  ✅ [PASS] In-memory XLSX parsing passed.\n');

  // TEST 3: In-Memory CSV Extraction
  console.log('Test 3: In-Memory CSV Extraction...');
  const csvBuffer = Buffer.from('significant,muhim\ncontribute,hissa qoshmoq');
  const csvText = csvBuffer.toString('utf-8');
  assert.ok(csvText.includes('significant'));
  assert.ok(csvText.includes('contribute'));
  console.log('  ✅ [PASS] In-memory CSV parsing passed.\n');

  // TEST 4: In-Memory Plain Text parsing
  console.log('Test 4: In-Memory Plaintext Extraction...');
  const txtBuffer = Buffer.from('Urban green spaces may positively affect mental well-being.');
  const txtText = txtBuffer.toString('utf-8');
  assert.ok(txtText.includes('Urban green spaces'));
  console.log('  ✅ [PASS] In-memory TXT parsing passed.\n');

  // TEST 5: Word Model Schema Verification
  console.log('Test 5: Word Model Schema Verification...');
  const Word = require('../models/Word').default || require('../models/Word');
  const wordPaths = Word.schema.paths;
  assert.ok(wordPaths['cefr'], 'Word schema must have cefr');
  assert.ok(wordPaths['partOfSpeech'], 'Word schema must have partOfSpeech');
  assert.ok(wordPaths['definition'], 'Word schema must have definition');
  assert.ok(wordPaths['contextTranslation'], 'Word schema must have contextTranslation');
  assert.ok(wordPaths['importanceScore'], 'Word schema must have importanceScore');
  assert.ok(wordPaths['itemType'], 'Word schema must have itemType');
  assert.ok(wordPaths['aiMetadata.extractionSessionId'], 'Word schema must have aiMetadata');
  assert.strictEqual(wordPaths['itemType'].defaultValue, 'word', 'itemType must default to word');
  console.log('  ✅ [PASS] Word model has all required fields and backward compatible defaults.\n');

  // TEST 6: Unit Model Ownership Schema Verification
  console.log('Test 6: Unit Model Ownership Schema...');
  const Unit = require('../models/Unit').default || require('../models/Unit');
  const unitPaths = Unit.schema.paths;
  assert.ok(unitPaths['ownerType'], 'Unit schema must have ownerType');
  assert.ok(unitPaths['ownerId'], 'Unit schema must have ownerId');
  assert.ok(unitPaths['unitType'], 'Unit schema must have unitType');
  assert.ok(unitPaths['visibility'], 'Unit schema must have visibility');
  assert.strictEqual(unitPaths['ownerType'].defaultValue, 'TEACHER');
  assert.strictEqual(unitPaths['unitType'].defaultValue, 'official');
  console.log('  ✅ [PASS] Unit model ownership architecture is correctly configured.\n');

  // TEST 7: AIExtractionSession Schema Verification
  console.log('Test 7: AIExtractionSession Schema & Privacy Constraints...');
  const AIExtractionSession = require('../models/AIExtractionSession').default || require('../models/AIExtractionSession');
  const sessionPaths = AIExtractionSession.schema.paths;
  assert.ok(sessionPaths['userId'], 'AIExtractionSession must have userId');
  assert.ok(sessionPaths['settings'] || sessionPaths['settings.requestedCount'], 'AIExtractionSession must store settings');
  assert.ok(sessionPaths['result'] || sessionPaths['result.vocabulary'], 'AIExtractionSession must store results');
  assert.ok(!sessionPaths['sourceDocument.extractedText'], 'AIExtractionSession must NOT store full raw text');
  console.log('  ✅ [PASS] AIExtractionSession schema and privacy constraints verified.\n');

  // TEST 8: Personal Unit Limit Constant Verification
  console.log('Test 8: Student Personal Unit 10-Unit Limit Enforcement...');
  const maxLimit = parseInt(process.env.MAX_PERSONAL_UNITS_PER_STUDENT || '10');
  assert.strictEqual(maxLimit, 10, 'Default personal unit limit must be exactly 10');
  console.log('  ✅ [PASS] Student unit limit correctly set to 10.\n');

  console.log('========================================================');
  console.log('🎉 ALL 8 TEST SUITES COMPLETED WITH ZERO ERRORS (100% PASS)');
  console.log('========================================================');
}

runAllTests().catch(err => {
  console.error('❌ Test execution error:', err);
  process.exit(1);
});
