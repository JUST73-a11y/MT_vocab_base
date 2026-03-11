import mongoose, { Schema, model, models } from 'mongoose';

// Energy system: each student gets MAX_ENERGY per day
// Resets every 12 hours (or configurable)
export const MAX_ENERGY = 10;
export const ENERGY_REFILL_HOURS = 12;

const StudentEnergySchema = new Schema({
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    energy: { type: Number, default: MAX_ENERGY },          // Current energy remaining
    lastRefilledAt: { type: Date, default: Date.now },      // Timestamp of last refill
    totalUsed: { type: Number, default: 0 },                // All-time energy used
}, { timestamps: true });

const StudentEnergy = models.StudentEnergy || model('StudentEnergy', StudentEnergySchema);
export default StudentEnergy;
