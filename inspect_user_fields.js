const mongoose = require('mongoose');
const uri = "mongodb+srv://muhammadalimamazoirov_db_user:6b1gvgJhTPU7SA8x@cluster0.p8um95g.mongodb.net/test";

async function check() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to Atlas (test)');
        
        const user = await mongoose.connection.db.collection('users').findOne({});
        if (user) {
            console.log('Fields in a sample user document:');
            console.log(Object.keys(user));
            // Check for potential password-like fields
            ['password', 'pass', 'visiblePassword', 'plain', 'code'].forEach(f => {
                if (user[f]) console.log(`Field "${f}": ${user[f]}`);
            });
        } else {
            console.log('No users found in "test" database.');
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
