import mongoose, { Schema, model, models } from 'mongoose';

/**
 * VocabGameSession — live classroom vocabulary session.
 * Tracks participants, live state, questions, and late joiners.
 */
const ParticipantSchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    customStudentId: { type: String, default: '' },
    studentNameSnapshot: { type: String, required: true },
    joinedAt: { type: Date, default: Date.now },
    isLate: { type: Boolean, default: false },
    status: { type: String, enum: ['present', 'absent', 'completed'], default: 'present' },
    currentQuestionIndex: { type: Number, default: 0 },
    questionsAsked: { type: Number, default: 0 },
    correctAnswers: { type: Number, default: 0 },
    wrongAnswers: { type: Number, default: 0 },
    accuracy: { type: Number, default: 0 },
}, { _id: false });

const VocabGameSessionSchema = new Schema({
    teacherId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId:          { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    unitId:           { type: Schema.Types.ObjectId, ref: 'Unit' },
    unitIds:          [{ type: Schema.Types.ObjectId, ref: 'Unit' }],
    questionsPerStudent: { type: Number, default: 6 },
    timerDuration:    { type: Number, default: 10 },
    noSave:           { type: Boolean, default: false },
    status:           { type: String, enum: ['ACTIVE', 'PAUSED', 'ENDED'], default: 'ACTIVE' },
    participants:     [ParticipantSchema],
    studentOrder:     [{ type: Schema.Types.ObjectId, ref: 'User' }], // ordered roster list
    currentStudentIndex: { type: Number, default: 0 },
    usedWordIds:         [{ type: Schema.Types.ObjectId, ref: 'Word' }], // tracks word IDs already used
    notes:            { type: String, default: '' },
    createdAt:        { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 }, // 90 days retention
    endedAt:          { type: Date },
}, { versionKey: false });

VocabGameSessionSchema.index({ teacherId: 1, createdAt: -1 });
VocabGameSessionSchema.index({ groupId: 1, status: 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.VocabGameSession) {
    delete (mongoose.models as any).VocabGameSession;
}

const VocabGameSession = models.VocabGameSession || model('VocabGameSession', VocabGameSessionSchema);
export default VocabGameSession;
