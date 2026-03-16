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
                console.log(`Checking DB: ${dbName}`);
                const sampleUsers = await db.db.collection('users').find({}).limit(10).toArray();
                sampleUsers.forEach(u => {
                    const keys = Object.keys(u);
                    console.log(`  User: ${u.email}`);
                    keys.forEach(k => {
                        if (typeof u[k] === 'string' && u[k].length > 0 && u[k].length < 30 && !u[k].startsWith('$2')) {
                            // Potentially plain text?
                            console.log(`    Possible plain field "${k}": ${u[k]}`);
                        }
                    });
                });
            }
        }
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}
check();
