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
            const names = collections.map(c => c.name);
            
            if (names.includes('users')) {
                const count = await db.db.collection('users').countDocuments();
                console.log(`DB: ${dbName} | Users: ${count}`);
                if (count > 0) {
                    const sample = await db.db.collection('users').find({}).limit(1).toArray();
                    console.log(`  Sample: ${sample[0].email} | Pass starts with: ${String(sample[0].password).substring(0, 10)}`);
                    // Check for plain text
                    const plainCount = await db.db.collection('users').countDocuments({
                        password: { $not: /^\$2a\$/ }
                    });
                    console.log(`  Plain text passwords (guess): ${plainCount}`);
                }
            }
        }
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
check();
