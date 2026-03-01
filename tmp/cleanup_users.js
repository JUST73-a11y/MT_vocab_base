const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function cleanup() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error('Missing MONGODB_URI');
        process.exit(1);
    }

    await mongoose.connect(uri);
    console.log('Connected to DB');

    try {
        const adminEmail = process.env.ADMIN_EMAIL_ALLOWLIST || '';

        const filter = {
            $or: [
                { email: 'teacher@gmail.com' },
                { email: 'student@gmail.com' },
                { email: /test/i },
                { role: 'admin', email: { $ne: adminEmail } },
                { email: '123456789' }
            ]
        };

        const db = mongoose.connection.db;

        const usersToDelete = await db.collection('users').find(filter).toArray();
        if (usersToDelete.length === 0) {
            console.log('No test users found to delete. The DB is already clean.');
            process.exit(0);
        }

        const userIds = usersToDelete.map(u => u._id);
        const userEmails = usersToDelete.map(u => u.email);

        console.log(`Found ${userIds.length} test users to delete:\n`, userEmails.join(', '));

        const deletedWallets = await db.collection('wallets').deleteMany({ studentId: { $in: userIds } });
        console.log(`Deleted ${deletedWallets.deletedCount} wallets`);

        const deletedMembers = await db.collection('groupmembers').deleteMany({ studentId: { $in: userIds } });
        console.log(`Deleted ${deletedMembers.deletedCount} group memberships`);

        const deletedStats = await db.collection('dailystudentstats').deleteMany({ studentId: { $in: userIds } });
        console.log(`Deleted ${deletedStats.deletedCount} daily stats`);

        const deletedStudentProfiles = await db.collection('studentprofiles').deleteMany({ userId: { $in: userIds } });
        console.log(`Deleted ${deletedStudentProfiles.deletedCount} student profiles`);

        const deletedTeacherProfiles = await db.collection('teacherprofiles').deleteMany({ userId: { $in: userIds } });
        console.log(`Deleted ${deletedTeacherProfiles.deletedCount} teacher profiles`);

        const result = await db.collection('users').deleteMany(filter);
        console.log(`✅ Successfully deleted ${result.deletedCount} test users from the database.`);

        const remainingAdmins = await db.collection('users').find({ role: 'admin' }).toArray();
        console.log('\nRemaining Admins:', remainingAdmins.map(a => a.email).join(', '));

    } catch (err) {
        console.error('Error during cleanup:', err);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from DB');
        process.exit(0);
    }
}

cleanup();
