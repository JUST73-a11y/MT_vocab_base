import mongoose, { Schema, model, models } from 'mongoose';

const UnitSchema = new Schema({
    title: { type: String, required: true },
    category: { type: String, required: false, default: 'Uncategorized' },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: false },
    customTimer: { type: Number, required: false }, // Optional per-unit timer override
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    createdAt: { type: Date, default: Date.now },

    // ── Ownership & Type ────────────────────────────────────────────────────
    // All optional. Existing teacher units default to ownerType:'TEACHER'.
    // This is the SINGLE source of truth for unit ownership.

    /** Who owns this unit. TEACHER = official content; STUDENT = personal unit. */
    ownerType: {
        type: String,
        enum: ['SYSTEM', 'TEACHER', 'STUDENT'],
        default: 'TEACHER',
    },

    /** The User._id of the owner. For TEACHER units === createdBy. For STUDENT units = student._id. */
    ownerId: { type: Schema.Types.ObjectId, ref: 'User' },

    /** Unit classification. Personal student units are isolated from official content. */
    unitType: {
        type: String,
        enum: ['official', 'personal'],
        default: 'official',
    },

    /** Visibility scope. Student personal units default to PRIVATE. */
    visibility: {
        type: String,
        enum: ['PRIVATE', 'GROUP', 'PUBLIC'],
        default: 'GROUP',  // existing teacher units effectively visible to their groups
    },
});

// Compound index: speeds up GET /api/units?teacherId=X (filters by createdBy, sorts by createdAt)
UnitSchema.index({ createdBy: 1, categoryId: 1, createdAt: -1 });
UnitSchema.index({ categoryId: 1 }); // standalone for category-only lookups
UnitSchema.index({ createdBy: 1, category: 1 }); // for dashboard name-based lookups

const Unit = models.Unit || model('Unit', UnitSchema);

export default Unit;
