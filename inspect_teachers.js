const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to DB');

    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const TeacherProfile = mongoose.models.TeacherProfile || mongoose.model('TeacherProfile', new mongoose.Schema({}, { strict: false }));

    const teachers = await User.find({ role: 'teacher' }).sort({ createdAt: -1 }).limit(3);
    console.log(`Found ${teachers.length} teachers`);

    for (const t of teachers) {
        console.log(`\nTeacher: ${t.email}`);
        console.log(`Password hash: ${t.password}`);
        console.log(`Visible password: ${t.visiblePassword}`);
        console.log(`isVerified: ${t.isVerified}`);
        
        if (t.visiblePassword) {
            const match = await bcrypt.compare(t.visiblePassword, t.password);
            console.log(`Bcrypt test (visible vs hash): ${match}`);
        }

        const profile = await TeacherProfile.findOne({ userId: t._id });
        console.log(`Has TeacherProfile: ${!!profile}`);
        if (profile) {
            console.log(`Profile teacherCode: ${profile.teacherCode}`);
        }
    }

    mongoose.disconnect();
}
run().catch(console.error);
