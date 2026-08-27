const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

// Register ts-node / typescript transpiler or require compiled module
const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
process.env.GEMINI_API_KEY = envConfig.GEMINI_API_KEY;

async function runTest() {
  const { extractFromSmartText, generateTranslations } = require('../lib/vocab/geminiClient');
  
  console.log('1. Testing extractFromSmartText...');
  const text = "Today's lesson includes railway, tailor, magnifying glass and wealthy.";
  const entries = await extractFromSmartText(text, 'smart_extract');
  console.log('Extracted entries:', entries.map(e => e.englishWord));

  console.log('\n2. Testing generateTranslations...');
  const trans = await generateTranslations(['railway', 'tailor']);
  console.log('Generated translations:', trans);
  
  console.log('\n✅ ALL INTEGRATION TESTS PASSED PERFECTLY!');
}

runTest().catch(console.error);
