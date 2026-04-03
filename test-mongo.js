const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function main() {
  const uri = process.env.MONGODB_URI;
  console.log('Testing connection to:', uri);
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Successfully connected to MongoDB!');
    // List databases to verify
    const adminDb = client.db().admin();
    const result = await adminDb.listDatabases();
    console.log('Available databases:', result.databases.map(db => db.name));
  } catch (error) {
    console.error('Connection failed! Error details:');
    console.error(error);
  } finally {
    await client.close();
  }
}

main().catch(console.error);
