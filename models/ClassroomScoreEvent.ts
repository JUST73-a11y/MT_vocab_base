import mongoose, { Schema, model, models } from 'mongoose';

export interface IClassroomScoreEvent {
    _id?: mongoose.Types.ObjectId | string;
    studentId: mongoose.Types.ObjectId | string;
    groupId: mongoose.Types.ObjectId | string;
    teacherId: mongoose.Types.ObjectId | string;
    points: number;
    category: 'homework' | 'vocab' | 'grammar' | 'participation' | 'game' | 'quiz' | 'bonus' | 'penalty' | 'other';
    reason: string;
    source: string;
    isReversal: boolean;
    reversalOf?: mongoose.Types.ObjectId | string | null;
    createdAt: Date;
}

const ClassroomScoreEventSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    points: { type: Number, required: true },
    category: { 
        type: String, 
        enum: ['homework', 'vocab', 'grammar', 'participation', 'game', 'quiz', 'bonus', 'penalty', 'other'],
        default: 'other' 
    },
    reason: { type: String, default: '' },
    source: { type: String, default: 'live_score' },
    isReversal: { type: Boolean, default: false },
    reversalOf: { type: Schema.Types.ObjectId, ref: 'ClassroomScoreEvent', default: null },
    createdAt: { type: Date, default: Date.now },
});

// Performance indexing for fast group leaderboards and student score queries
ClassroomScoreEventSchema.index({ groupId: 1, createdAt: -1 });
ClassroomScoreEventSchema.index({ studentId: 1, createdAt: -1 });
ClassroomScoreEventSchema.index({ teacherId: 1, createdAt: -1 });
ClassroomScoreEventSchema.index({ groupId: 1, studentId: 1, isReversal: 1 });

const ClassroomScoreEvent = models.ClassroomScoreEvent || model('ClassroomScoreEvent', ClassroomScoreEventSchema);

export default ClassroomScoreEvent;