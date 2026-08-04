const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '.env.local') });

async function run() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // Create mock user
    const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    const TeacherProfile = mongoose.models.TeacherProfile || mongoose.model('TeacherProfile', new mongoose.Schema({}, { strict: false }));

    const hashed = await bcrypt.hash('testpass123', 10);
    const user = new User({
        name: 'Test Teacher',
        email: 'testteacher@example.com',
        password: hashed,
        role: 'teacher',
        teacherCode: 'T-123456',
        isVerified: true
    });
    await user.save();
    
    await TeacherProfile.create({
        userId: user._id,
        teacherCode: 'T-123456',
        status: 'active'
    });
    
    console.log('Teacher created. Logging in...');

    // Simulate login logic
    let isMatch = await bcrypt.compare('testpass123', user.password);
    console.log('Password match:', isMatch);

    let teacherCode = user.teacherCode;
    const profile = await TeacherProfile.findOne({ userId: user._id });
    if (profile) teacherCode = profile.teacherCode;

    console.log('Teacher code:', teacherCode);

    const { SignJWT } = require('jose');
    const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'default');
    
    try {
        const token = await new SignJWT({
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            teacherId: null,
            teacherCode: teacherCode || null
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setExpirationTime('7d')
            .sign(secret);
        
        console.log('Token created successfully!');
    } catch(e) {
        console.error('Error creating token:', e);
    }
    
    // cleanup
    await User.deleteOne({ _id: user._id });
    await TeacherProfile.deleteOne({ userId: user._id });

    mongoose.disconnect();
}
run();
