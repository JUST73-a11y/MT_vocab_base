import mongoose, { Schema, model, models } from 'mongoose';

/**
 * VocabGameSession — teacher-led live vocabulary game.
 * Teacher selects a group + unit, then tests students one by one (randomly).
 */
const VocabGameSessionSchema = new Schema({
    teacherId:        { type: Schema.Types.ObjectId, ref: 'User', required: true },
    groupId:          { type: Schema.Types.ObjectId, ref: 'Group', required: true },
    unitId:           { type: Schema.Types.ObjectId, ref: 'Unit' },
    unitIds:          [{ type: Schema.Types.ObjectId, ref: 'Unit' }],
    questionsPerStudent: { type: Number, default: 6 },
    timerDuration:    { type: Number, default: 10 },
    noSave:           { type: Boolean, default: false },
    status:           { type: String, enum: ['ACTIVE', 'ENDED'], default: 'ACTIVE' },
    studentOrder:     [{ type: Schema.Types.ObjectId, ref: 'User' }], // randomized list
    currentStudentIndex: { type: Number, default: 0 },
    usedWordIds:         [{ type: Schema.Types.ObjectId, ref: 'Word' }], // tracks word IDs already used in current session to prevent repetition
    notes:            { type: String, default: '' },
    createdAt:        { type: Date, default: Date.now, expires: 60 * 60 * 24 * 90 }, // Auto-delete after 90 days (3 months)
    endedAt:          { type: Date },
});

VocabGameSessionSchema.index({ teacherId: 1, createdAt: -1 });
VocabGameSessionSchema.index({ groupId: 1, status: 1 });

const VocabGameSession = models.VocabGameSession || model('VocabGameSession', VocabGameSessionSchema);
export default VocabGameSession;
