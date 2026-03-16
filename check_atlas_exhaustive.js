const mongoose = require('mongoose');
const uri = "mongodb+srv://muhammadalimamazoirov_db_user:6b1gvgJhTPU7SA8x@cluster0.p8um95g.mongodb.net/";

async function check() {
    try {
        await mongoose.connect(uri);
        console.log('Connected to Atlas');
        
        const admin = mongoose.connection.db.admin();
        const dbs = await admin.listDatabases();
        console.log('Databases:', dbs.databases.map(d => d.name));
        
        for (const dbInfo of dbs.databases) {
            const dbName = dbInfo.name;
            if (['admin', 'local', 'config'].includes(dbName)) continue;
            
            const db = mongoose.connection.useDb(dbName);
            const collections = await db.db.listCollections().toArray();
            console.log(`DB: ${dbName}, Collections: ${collections.map(c => c.name)}`);
            
            if (collections.some(c => c.name === 'users')) {
                const count = await db.db.collection('users').countDocuments({ visiblePassword: { $exists: true } });
                console.log(`  -> users with visiblePassword in ${dbName}: ${count}`);
                
                const sample = await db.db.collection('users').findOne({ visiblePassword: { $exists: true } });
                if (sample) console.log(`  -> Sample: ${sample.email} : ${sample.visiblePassword}`);
            }
        }

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

check();
