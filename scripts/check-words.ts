
import mongoose from 'mongoose';
import Word from './models/Word.ts';
import Unit from './models/Unit.ts';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function checkWords() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const units = await Unit.find({});
        console.log(`Found ${units.length} units`);

        for (const unit of units) {
            const wordCount = await Word.countDocuments({ unitId: unit._id });
            console.log(`Unit: ${unit.title} (${unit._id}) - Word Count: ${wordCount}`);
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkWords();
