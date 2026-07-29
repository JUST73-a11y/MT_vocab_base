const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function fixUser() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const result = await mongoose.connection.collection('users').updateMany(
        { isVerified: false },
        { $set: { isVerified: true }, $unset: { otp: 1, otpExpiry: 1 } }
    );

    console.log(`✅ Fixed ${result.modifiedCount} unverified user(s). They can now log in!`);
    process.exit(0);
}

fixUser().catch(err => {
    console.error(err);
    process.exit(1);
});
