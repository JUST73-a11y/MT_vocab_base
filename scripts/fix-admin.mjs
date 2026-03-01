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

        const userSchema = new mongoose.Schema({
            name: String,
            email: String,
            role: String,
            plainTextPassword: String,
        }, { strict: false });

        const User = mongoose.models.User || mongoose.model('User', userSchema);

        console.log('\n--- ADMINLAR RO\'YXATI ---');
        const admins = await User.find({ role: 'admin' });

        if (admins.length === 0) {
            console.log('Hozircha tizimda ADMIN yo\'q.');

            // If user provided email/pass in command line, create it
            const args = process.argv.slice(2);
            if (args.length >= 2) {
                const [email, pass] = args;
                console.log(`\nNew admin yaratilmoqda: ${email}...`);

                const bcrypt = (await import('bcryptjs')).default;
                const hashed = await bcrypt.hash(pass, 10);

                await User.create({
                    name: 'Admin',
                    email: email,
                    password: hashed,
                    plainTextPassword: pass,
                    role: 'admin',
                    status: 'active',
                    isVerified: true
                });
                console.log('Admin muvaffaqiyatli yaratildi! ✅');
            } else {
                console.log('\nAdmin yaratish uchun quyidagicha ishlating:');
                console.log('node scripts/fix-admin.mjs <email> <password>');
            }
        } else {
            admins.forEach(admin => {
                console.log(`Ism: ${admin.name}`);
                console.log(`Email: ${admin.email}`);
                console.log(`Parol (plain): ${admin.plainTextPassword || 'Noma\'lum (encrypted)'}`);
                console.log('-------------------------');
            });

            // check if user wants to promote someone
            const args = process.argv.slice(2);
            if (args.length >= 1 && args[0] === 'promote') {
                const email = args[1];
                if (email) {
                    const result = await User.findOneAndUpdate({ email }, { role: 'admin' });
                    if (result) console.log(`${email} muvaffaqiyatli ADMIN qilindi! ✅`);
                    else console.log(`Foydalanuvchi topilmadi: ${email}`);
                }
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('Xatolik:', error.message);
        process.exit(1);
    }
}

run();
