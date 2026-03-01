import mongoose, { Schema, model, models } from 'mongoose';

const CategorySchema = new Schema({
    name: { type: String, required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    parentId: { type: Schema.Types.ObjectId, ref: 'Category', default: null },
    path: { type: String, default: '' },
}, { timestamps: true });

// Compound index to ensure category names are unique per teacher and parent
CategorySchema.index({ name: 1, teacherId: 1, parentId: 1 }, { unique: true });

const Category = models.Category || model('Category', CategorySchema);

export default Category;
