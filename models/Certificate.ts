import mongoose, { Schema, model, models } from 'mongoose';

function genCertId(): string {
    const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
    const year = new Date().getFullYear();
    return `MTVC-${year}-${rand}`;
}

const CertificateSchema = new Schema({
    certId: { type: String, unique: true, default: genCertId },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    studentName: { type: String, required: true },
    groupName: { type: String, default: '' },
    teacherName: { type: String, default: '' },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User' },
    unitTitle: { type: String, required: true },
    totalWords: { type: Number, default: 0 },
    activitiesCompleted: { type: Number, default: 10 },
    coinsAwarded: { type: Number, default: 100 },
    status: { type: String, default: 'verified' },
    earnedAt: { type: Date, default: Date.now },
}, { timestamps: true });

const Certificate = models.Certificate || model('Certificate', CertificateSchema);
export default Certificate;
