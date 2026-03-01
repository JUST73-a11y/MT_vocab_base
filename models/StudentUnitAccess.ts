import mongoose, { Schema, model, models } from 'mongoose';

const StudentUnitAccessSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    grantedByTeacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    grantedAt: { type: Date, default: Date.now },
});

// Enforce unique pair of student and unit
StudentUnitAccessSchema.index({ studentId: 1, unitId: 1 }, { unique: true });

const StudentUnitAccess = models.StudentUnitAccess || model('StudentUnitAccess', StudentUnitAccessSchema);

export default StudentUnitAccess;
