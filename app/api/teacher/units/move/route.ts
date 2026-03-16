import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import Unit from '@/models/Unit';
import Category from '@/models/Category';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

export async function POST(req: Request) {
    try {
        await dbConnect();

        // 1. Verify Teacher Session
        const cookieStore = await cookies();
        const token = cookieStore.get('token');
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'fallback_secret');
        const { payload } = await jwtVerify(token.value, secret);

        if (payload.role !== 'teacher' && payload.role !== 'admin') {
            return NextResponse.json({ error: 'Faqat o\'qituvchilar uchun' }, { status: 403 });
        }

        const teacherId = payload.id;

        // 2. Parse Request Body
        const body = await req.json();
        const { unitIds, targetCategoryId } = body;

        if (!Array.isArray(unitIds) || unitIds.length === 0) {
            return NextResponse.json({ error: 'Unitlar tanlanmagan' }, { status: 400 });
        }

        // 3. Determine Target Category Name
        let targetCategoryName = 'Asosiy';
        if (targetCategoryId) {
            const category = await Category.findById(targetCategoryId);
            if (!category) {
                return NextResponse.json({ error: 'Kategoriya topilmadi' }, { status: 404 });
            }
            targetCategoryName = category.name;
        }

        // 4. Perform Update
        const result = await Unit.updateMany(
            { _id: { $in: unitIds }, createdBy: teacherId },
            { 
                $set: { 
                    categoryId: targetCategoryId || null, 
                    category: targetCategoryName 
                } 
            }
        );

        if (result.modifiedCount === 0) {
            return NextResponse.json({ error: 'Hech qanday unit o\'zgartirilmadi. Sizga tegishliligiga ishonch hosil qiling.' }, { status: 404 });
        }

        return NextResponse.json({ 
            message: 'Unitlar muvaffaqiyatli ko\'chirildi',
            modifiedCount: result.modifiedCount 
        });

    } catch (error: any) {
        
        return NextResponse.json({ error: 'Ichki server xatosi' }, { status: 500 });
    }
}
