const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = dotenv.parse(fs.readFileSync(envPath));
process.env.GEMINI_API_KEY = envConfig.GEMINI_API_KEY;

async function runTest() {
  const { resolveSmartEmojis } = require('../lib/vocab/geminiClient');
  
  const testItems = [
    { englishWord: 'Reptile', uzbekTranslation: 'Sudraluvchilar' },
    { englishWord: 'Presenter', uzbekTranslation: "Ko'rsatuv boshlovchisi" },
    { englishWord: 'Keeper', uzbekTranslation: "Qo'riqchi" },
    { englishWord: 'Enclosure', uzbekTranslation: "Atrofi o'rab olingan yer" },
    { englishWord: 'Aviary', uzbekTranslation: 'Qafas' },
    { englishWord: 'Aquarium', uzbekTranslation: 'Akvarium' },
    { englishWord: 'Lizard', uzbekTranslation: 'Kaltakesak' },
    { englishWord: 'Adopt', uzbekTranslation: 'Asrab olmoq' },
    { englishWord: 'Canoeing', uzbekTranslation: 'Baydarkada sayohat qilmoq' },
    { englishWord: 'Treasured possession', uzbekTranslation: 'Qadrli buyum' },
    { englishWord: 'Brief', uzbekTranslation: 'Qisqa' },
    { englishWord: 'Description', uzbekTranslation: 'Tasvir' },
    { englishWord: 'Certain', uzbekTranslation: "Ma'lum bir" },
    { englishWord: 'Sentimental value', uzbekTranslation: 'Xis tuygu valari' },
    { englishWord: 'Personal stereo', uzbekTranslation: 'Mp3 player' },
    { englishWord: 'Equipped', uzbekTranslation: 'Jixozlangan' },
    { englishWord: 'Enable', uzbekTranslation: 'Imkoniyat berish' },
    { englishWord: 'Simply', uzbekTranslation: 'Shunchaki' },
    { englishWord: 'Disturb', uzbekTranslation: 'Xalaqit berish' },
    { englishWord: 'Constant', uzbekTranslation: 'Doimiy' },
    { englishWord: 'Companionship', uzbekTranslation: 'Hamrohlik' },
  ];

  console.log('Resolving emojis for screenshot items...\n');
  const result = await resolveSmartEmojis(testItems);
  
  console.log('RESULTS:');
  for (const item of testItems) {
    console.log(`${item.englishWord.padEnd(22)} (${item.uzbekTranslation.padEnd(24)}) -> ${result[item.englishWord] || '❌ NONE'}`);
  }
}

runTest().catch(console.error);
