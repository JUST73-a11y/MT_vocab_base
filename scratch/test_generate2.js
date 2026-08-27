const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
const apiKey = envConfig.GEMINI_API_KEY;

const client = new GoogleGenerativeAI(apiKey);

async function testGeneration() {
  const modelsToTry = [
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-2.5-flash-lite',
  ];

  for (const modelName of modelsToTry) {
    try {
      console.log(`Testing model: "${modelName}"...`);
      const model = client.getGenerativeModel({ model: modelName });
      const result = await model.generateContent('Say "OK" in JSON: {"status": "OK"}');
      console.log(`SUCCESS with "${modelName}":`, result.response.text().trim());
      return modelName;
    } catch (err) {
      console.error(`FAILED "${modelName}":`, err.message);
    }
  }
}

testGeneration();
