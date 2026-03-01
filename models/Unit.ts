import mongoose, { Schema, model, models } from 'mongoose';

const UnitSchema = new Schema({
    title: { type: String, required: true },
    category: { type: String, required: false, default: 'Uncategorized' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: false },
    customTimer: { type: Number, required: false }, // Optional per-unit timer override
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },
});

// Compound index: speeds up GET /api/units?teacherId=X (filters by createdBy, sorts by createdAt)
UnitSchema.index({ createdBy: 1, categoryId: 1, createdAt: -1 });
UnitSchema.index({ categoryId: 1 }); // standalone for category-only lookups

const Unit = models.Unit || model('Unit', UnitSchema);

export default Unit;
