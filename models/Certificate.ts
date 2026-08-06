import mongoose, { Schema, model, models } from 'mongoose';

function genCertId(): string {
    const num = Math.floor(100000 + Math.random() * 900000);
    const year = new Date().getFullYear();
    return `MTV-${year}-${num}`;
}

const CertificateSchema = new Schema({
    certId: { type: String, unique: true, default: genCertId },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    unitId: { type: Schema.Types.ObjectId, ref: 'Unit', required: true },
    studentName: { type: String, required: true },
    groupName: { type: String, default: 'General' },
    teacherName: { type: String, default: 'Ustoz' },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User' },
    unitTitle: { type: String, required: true },
    completionDate: { type: String, default: '' },
    completionTime: { type: String, default: '' },
    activeLearningTimeSeconds: { type: Number, default: 0 },
    formattedLearningTime: { type: String, default: '0 Daqiqa' },
    totalWords: { type: Number, default: 0 },
    activitiesCompleted: { type: Number, default: 8 },
    coinsAwarded: { type: Number, default: 100 },
    status: { type: String, default: 'VERIFIED' },
    earnedAt: { type: Date, default: Date.now },
}, { timestamps: true });

CertificateSchema.index({ studentId: 1, unitId: 1 }, { unique: true });

const Certificate = models.Certificate || model('Certificate', CertificateSchema);
export default Certificate;

