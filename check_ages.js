const mongoose = require('mongoose');
const uri = "mongodb+srv://muhammadalimamazoirov_db_user:6b1gvgJhTPU7SA8x@cluster0.p8um95g.mongodb.net/test";

async function check() {
    try {
        await mongoose.connect(uri);
        const users = await mongoose.connection.db.collection('users').find({}).sort({createdAt: 1}).toArray();
        users.forEach(u => {
            console.log(`Email: ${u.email} | Created: ${u.createdAt} | Pass hashed: ${String(u.password).startsWith('$2')}`);
        });
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
check();
