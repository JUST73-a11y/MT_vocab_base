const mongoose = require('mongoose');
const uri = "mongodb+srv://muhammadalimamazoirov_db_user:6b1gvgJhTPU7SA8x@cluster0.p8um95g.mongodb.net/";

async function check() {
    try {
        await mongoose.connect(uri);
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        
        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'local', 'config'].includes(dbName)) continue;
            
            const db = mongoose.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();
            
            const usersColl = collections.find(c => c.name === 'users');
            if (usersColl) {
                const total = await db.db.collection('users').countDocuments();
                const withPass = await db.db.collection('users').countDocuments({ visiblePassword: { $exists: true } });
                console.log(`DB: ${dbName} | Total Users: ${total} | With visiblePassword: ${withPass}`);
            }
        }
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
check();
