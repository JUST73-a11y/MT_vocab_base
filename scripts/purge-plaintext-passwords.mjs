import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('MONGODB_URI .env.local ichida topilmadi!');
    process.exit(1);
}

async function run() {
    try {
        console.log('Bazaga ulanish...');
        await mongoose.connect(MONGODB_URI);
        console.log('Ulandi ✅');

        const db = mongoose.connection.db;
        
        console.log('plainTextPassword maydonini barcha Userlardan o\'chirish (unset) boshlandi...');
        const result = await db.collection('users').updateMany(
            { plainTextPassword: { $exists: true } },
            { $unset: { plainTextPassword: "" } }
        );

        console.log(`Muvaffaqiyatli! O'zgartirilgan hujjatlar soni: ${result.modifiedCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Xatolik:', error.message);
        process.exit(1);
    }
}

run();
