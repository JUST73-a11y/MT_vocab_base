import mongoose, { Schema, model, models } from 'mongoose';

/**
 * Counter model for atomic sequential ID generation.
 * Handles student IDs (M00001, M00002, etc.) and other sequences.
 */
const CounterSchema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 },
});

const Counter = models.Counter || model('Counter', CounterSchema);

/**
 * Atomically generates the next formatted Student ID (e.g. M00001, M00002).
 * Immune to race conditions and concurrent requests.
 */
export async function getNextStudentId(): Promise<string> {
    const counter = await Counter.findOneAndUpdate(
        { _id: 'studentId' },
        { $inc: { seq: 1 } },
        { new: true, upsert: true }
    );
    const seqNum = counter.seq;
    const formattedNum = String(seqNum).padStart(5, '0');
    return `M${formattedNum}`;
}

export default Counter;
