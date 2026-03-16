const mongoose = require('mongoose');
const uri = "mongodb+srv://muhammadalimamazoirov_db_user:6b1gvgJhTPU7SA8x@cluster0.p8um95g.mongodb.net/MT_vocab"; // Added DB name

async function check() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to Atlas');
        
        const count = await mongoose.connection.db.collection('users').countDocuments({ visiblePassword: { $exists: true } });
        console.log(`Users with visiblePassword field: ${count}`);
        
        const allCount = await mongoose.connection.db.collection('users').countDocuments();
        console.log(`Total users in DB: ${allCount}`);
        
        const users = await mongoose.connection.db.collection('users').find({ visiblePassword: { $exists: true } }).toArray();
        users.forEach(u => {
            console.log(`Email: ${u.email}, PW: ${u.visiblePassword}`);
        });

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
