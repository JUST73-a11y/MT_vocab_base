const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
    console.error('No MONGODB_URI found');
    process.exit(1);
}

const wordList = [
  { en: "climb", uz: "tirmashib chiqmoq" },
  { en: "jug", uz: "ko`za" },
  { en: "ceiling", uz: "shift" },
  { en: "teapot", uz: "choynak" },
  { en: "drive", uz: "mashina xaydamoq" },
  { en: "serving dish", uz: "taom suziladigan idish" },
  { en: "catch", uz: "tutmoq" },
  { en: "ladle", uz: "cho`mich" },
  { en: "marathon", uz: "marafon" },
  { en: "utensil", uz: "idish tovoq" },
  { en: "athletic", uz: "atletik" },
  { en: "tray", uz: "patnis" },
  { en: "omelette", uz: "quymoq" },
  { en: "to wash up", uz: "idish yuvmoq" },
  { en: "float", uz: "suv yuzasida turmoq" },
  { en: "to peel", uz: "archmoq" },
  { en: "rock", uz: "tosh" },
  { en: "to whisk", uz: "ko`pirtirmoq" },
  { en: "trumpet", uz: "truba (cholg'u asbobi)" },
  { en: "to fry", uz: "qovurmoq" },
  { en: "guitar", uz: "gitara" },
  { en: "to fly", uz: "uchmoq" },
  { en: "chef", uz: "bosh oshpaz" },
  { en: "jump", uz: "sakramoq" },
  { en: "wash", uz: "yuvmoq" },
  { en: "unhappy", uz: "hafa" },
  { en: "dirty", uz: "kir" },
  { en: "in order", uz: "tartib bilan" },
  { en: "playground", uz: "o`yin maydonchasi" },
  { en: "space", uz: "bo`sh joy" },
  { en: "cooker", uz: "gaz plitasi" },
  { en: "appropriate", uz: "mos" },
  { en: "toaster", uz: "non isitgich" },
  { en: "worm", uz: "chuvalchang" },
  { en: "dishwasher", uz: "idish yuvadigan mashina" },
  { en: "costume", uz: "kiyim-kechak" },
  { en: "tureen", uz: "qopqoqli lagan" },
  { en: "create", uz: "yaratmoq" },
  { en: "napkin", uz: "salfetka" },
  { en: "borrow", uz: "qarzga olmoq" },
  { en: "table cloth", uz: "dasturxon" },
  { en: "mistake", uz: "xato" },
  { en: "bread basket", uz: "non savatcha" },
  { en: "blind", uz: "ko'r" },
  { en: "teaspoon", uz: "choy qoshiq" },
  { en: "can", uz: "qila olmoq" },
  { en: "suger bowl", uz: "shakar idish" },
  { en: "ability", uz: "qobilyat" },
  { en: "microwave oven", uz: "mikroto'lqinli pech" },
  { en: "possibility", uz: "extimollik" },
  { en: "park", uz: "mashina qo`ymoq" },
  { en: "successful", uz: "muvaffaqiyatli" },
  { en: "polite", uz: "muloyim, odobli" },
  { en: "permission", uz: "ruxsat" },
  { en: "fast", uz: "tez" },
  { en: "request", uz: "iltimos" },
  { en: "language", uz: "til" },
  { en: "magazine", uz: "jurnal" },
  { en: "best", uz: "eng yaxshi" },
  { en: "talk", uz: "gapirmoq" },
  { en: "pull", uz: "tortmoq" },
  { en: "busy", uz: "band" },
  { en: "in a nutshell", uz: "xullosa qilib aytganda" },
  { en: "truck", uz: "yuk mashinasi" },
  { en: "adult", uz: "voyaga yetgan" },
  { en: "underline", uz: "tagiga chizmoq" }
];

async function run() {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to DB');

    const Category = mongoose.models.Category || mongoose.model('Category', new mongoose.Schema({
        name: String,
        teacherId: mongoose.Schema.Types.ObjectId,
        parentId: mongoose.Schema.Types.ObjectId,
    }));

    const Unit = mongoose.models.Unit || mongoose.model('Unit', new mongoose.Schema({
        title: String,
        categoryId: mongoose.Schema.Types.ObjectId,
        category: String,
        createdBy: mongoose.Schema.Types.ObjectId,
    }));

    const Word = mongoose.models.Word || mongoose.model('Word', new mongoose.Schema({
        unitId: mongoose.Schema.Types.ObjectId,
        englishWord: String,
        uzbekTranslation: String,
    }));

    // Find parent category "Teenager"
    let teenagerCat = await Category.findOne({ name: /teenager/i });
    if (!teenagerCat) {
        console.log('Could not find category "Teenager"');
        process.exit(1);
    }

    // Find child category "Month 3"
    let month3Cat = await Category.findOne({ name: /month\s*3/i, parentId: teenagerCat._id });
    if (!month3Cat) {
        console.log('Could not find child category "Month 3" under Teenager');
        // Let's create it if it doesn't exist? Wait, let's just list categories to be sure.
        console.log('Listing all categories under Teenager:');
        const children = await Category.find({ parentId: teenagerCat._id });
        for (const c of children) {
            console.log(`- ${c.name} (${c._id})`);
            if (c.name.toLowerCase().includes('3')) {
                month3Cat = c;
            }
        }
        if (!month3Cat) {
            console.error('Month 3 category not found.');
            process.exit(1);
        }
    }

    console.log(`Found category: ${teenagerCat.name} > ${month3Cat.name}`);

    let unit = await Unit.findOne({ categoryId: month3Cat._id, title: /lesson\s*15/i });
    if (!unit) {
        unit = new Unit({
            title: 'Lesson 15',
            categoryId: month3Cat._id,
            category: month3Cat.name,
            createdBy: month3Cat.teacherId, // assuming teacherId exists on category
        });
        await unit.save();
        console.log(`Created new Unit: Lesson 15 (${unit._id})`);
    } else {
        console.log(`Found existing Unit: Lesson 15 (${unit._id})`);
        await Word.deleteMany({ unitId: unit._id });
        console.log(`Deleted existing words in Lesson 15 to recreate them.`);
    }

    const wordsToInsert = wordList.map(w => ({
        unitId: unit._id,
        englishWord: w.en,
        uzbekTranslation: w.uz,
    }));

    await Word.insertMany(wordsToInsert);
    console.log(`Successfully added ${wordsToInsert.length} words!`);

    mongoose.disconnect();
}

run().catch(console.error);
