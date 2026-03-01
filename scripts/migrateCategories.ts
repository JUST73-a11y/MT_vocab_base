import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Simple schemas to avoid full app imports
const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, required: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, default: null },
    path: { type: String, default: '' },
}, { timestamps: true });

const UnitSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: false, default: 'Uncategorized' },
    categoryId: { type: mongoose.Schema.Types.ObjectId, required: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    createdAt: { type: Date, default: Date.now },
});

const Category = mongoose.models.Category || mongoose.model('Category', CategorySchema);
const Unit = mongoose.models.Unit || mongoose.model('Unit', UnitSchema);

async function run() {
    try {
        await mongoose.connect(process.env.MONGODB_URI as string);
        console.log('Connected to DB');

        const units = await Unit.find({ categoryId: { $exists: false } });
        console.log(`Found ${units.length} units to migrate`);

        let migrated = 0;
        for (const unit of units) {
            const teacherId = unit.createdBy;
            let catName = unit.category ? unit.category.trim() : 'Uncategorized';
            if (!catName) catName = 'Uncategorized';

            let category = await Category.findOne({ name: catName, teacherId, parentId: null });

            if (!category) {
                category = await Category.create({
                    name: catName,
                    teacherId,
                    parentId: null,
                    path: catName
                });
                console.log(`Created category: ${catName}`);
            }

            unit.categoryId = category._id;
            // Also ensure category string is synced just in case
            unit.category = category.name;
            await unit.save();
            migrated++;
        }

        console.log(`Successfully migrated ${migrated} units.`);

        // Also fix any units that have categoryId but it's invalid
        const allUnits = await Unit.find({ categoryId: { $ne: null } });
        let fixed = 0;
        for (const unit of allUnits) {
            const catObj = await Category.findById(unit.categoryId);
            if (!catObj) {
                console.log(`Unit ${unit._id} has invalid categoryId ${unit.categoryId}, fixing...`);
                let catName = unit.category ? unit.category.trim() : 'Uncategorized';
                if (!catName) catName = 'Uncategorized';
                let newCat = await Category.findOne({ name: catName, teacherId: unit.createdBy, parentId: null });
                if (!newCat) {
                    newCat = await Category.create({
                        name: catName,
                        teacherId: unit.createdBy,
                        parentId: null,
                        path: catName
                    });
                }
                unit.categoryId = newCat._id;
                await unit.save();
                fixed++;
            }
        }
        console.log(`Fixed ${fixed} units with invalid category references.`);

    } catch (e) {
        console.error(e);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

run();
