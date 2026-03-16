const mongoose = require('mongoose');

async function check() {
    try {
        await mongoose.connect('mongodb://localhost:27017/MT_vocab');
        console.log('Connected to DB');
        
        const UserSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.models.User || mongoose.model('User', UserSchema);
        
        const users = await User.find({ isVerified: true }).lean();
        console.log(`Total verified users: ${users.length}`);
        
        users.forEach(u => {
            console.log(`Name: ${u.name}, Email: ${u.email}, visiblePassword: ${u.visiblePassword ? 'YES' : 'NO'}`);
        });
        
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
