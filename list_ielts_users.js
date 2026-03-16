const mongoose = require('mongoose');
const uri = "mongodb+srv://muhammadalimamazoirov_db_user:6b1gvgJhTPU7SA8x@cluster0.p8um95g.mongodb.net/ielts_platform";

async function check() {
    try {
        await mongoose.connect(uri);
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log(`Users in ielts_platform:`);
        users.forEach(u => console.log(`- ${u.email} : ${u.password}`));
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
check();
