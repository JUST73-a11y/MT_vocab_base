const mongoose = require('mongoose');
const uri = "mongodb+srv://muhammadalimamazoirov_db_user:6b1gvgJhTPU7SA8x@cluster0.p8um95g.mongodb.net/test";

async function check() {
    try {
        await mongoose.connect(uri);
        const users = await mongoose.connection.db.collection('users').find({}).toArray();
        console.log(`Total users in test: ${users.length}`);
        
        const allKeys = new Set();
        users.forEach(u => Object.keys(u).forEach(k => allKeys.add(k)));
        console.log('All unique fields across all users:', Array.from(allKeys));
        
        users.forEach(u => {
            console.log(`User: ${u.email}`);
            Object.keys(u).forEach(k => {
                if (k !== 'password' && k !== '_id' && typeof u[k] === 'string' && u[k].length > 0 && u[k].length < 50) {
                    console.log(`  ${k}: ${u[k]}`);
                }
            });
        });

        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
check();
