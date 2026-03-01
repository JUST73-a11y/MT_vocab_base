import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Category from '@/models/Category';
import { getServerSession } from '@/lib/serverAuth';

// GET /api/teacher/categories
export async function GET(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'teacher') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        await dbConnect();
        const categories = await Category.find({ teacherId: session.id }).lean();
        return NextResponse.json(categories);
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
    }
}

// POST /api/teacher/categories
export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session || session.role !== 'teacher') {
            return NextResponse.json({ message: 'Unauthorized' }, { status: 403 });
        }

        const { name, parentId } = await req.json();

        if (!name || !name.trim()) {
            return NextResponse.json({ message: 'Category adı kiritilishi shart' }, { status: 400 });
        }

        await dbConnect();

        let path = name.trim();
        if (parentId) {
            const parent = await Category.findById(parentId);
            if (!parent) {
                return NextResponse.json({ message: 'Ota kategoriya topilmadi' }, { status: 404 });
            }
            if (parent.teacherId.toString() !== session.id) {
                return NextResponse.json({ message: 'Format error' }, { status: 403 });
            }
            path = `${parent.path} / ${name.trim()}`;
        }

        // Check if exists
        const exists = await Category.findOne({
            name: name.trim(),
            teacherId: session.id,
            parentId: parentId || null
        });

        if (exists) {
            return NextResponse.json({ message: 'Bu kategoriya allaqachon mavjud' }, { status: 400 });
        }

        const newCategory = await Category.create({
            name: name.trim(),
            teacherId: session.id,
            parentId: parentId || null,
            path
        });

        return NextResponse.json(newCategory, { status: 201 });
    } catch (error: any) {
        console.error('Error creating category:', error);
        return NextResponse.json({ message: error.message || 'Server error' }, { status: 500 });
    }
}
