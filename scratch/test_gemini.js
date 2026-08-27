const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const apiKey = envConfig.GEMINI_API_KEY;

console.log('Testing API key starting with:', apiKey ? apiKey.slice(0, 8) : 'NONE');

async function testModels() {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    
    if (!res.ok) {
      console.error('API Error Response:', JSON.stringify(data, null, 2));
      return;
    }
    
    console.log('\nAvailable Models for this key:');
    const generateModels = (data.models || []).filter(m => m.supportedGenerationMethods?.includes('generateContent'));
    for (const m of generateModels) {
      console.log(` - ${m.name} (${m.displayName})`);
    }
    
  } catch (err) {
    console.error('Fetch error:', err);
  }
}

testModels();
