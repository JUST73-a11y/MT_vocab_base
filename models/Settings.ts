import mongoose, { Schema, model, models } from 'mongoose';

const SettingsSchema = new Schema({
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    selectedUnits: [{ type: String }], // Store string IDs for simplicity in MVP, or ObjectId if strict ref needed
    timerDuration: { type: Number, default: 30 },
    updatedAt: { type: Date, default: Date.now },
});

const Settings = models.Settings || model('Settings', SettingsSchema);

export default Settings;
