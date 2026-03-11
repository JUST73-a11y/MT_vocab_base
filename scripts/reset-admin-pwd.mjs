import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL_ALLOWLIST;
const ADMIN_PASSWORD = process.env.ADMIN_INITIAL_PASSWORD;

async function run() {
    try {
        await mongoose.connect(MONGODB_URI);
        const db = mongoose.connection.db;
        
        const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
        
        const result = await db.collection('users').updateOne(
            { email: ADMIN_EMAIL },
            { $set: { password: hashed, role: 'admin' } }
        );

        console.log(`Parol yangilandi: ${result.modifiedCount} ta foydalanuvchi.`);

        process.exit(0);
    } catch (error) {
        console.error('Xatolik:', error.message);
        process.exit(1);
    }
}

run();
