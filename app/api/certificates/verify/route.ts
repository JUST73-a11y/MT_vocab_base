import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Certificate from '@/models/Certificate';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const certId = searchParams.get('id');

        if (!certId) {
            return NextResponse.json({ message: 'Certificate ID required' }, { status: 400 });
        }

        await dbConnect();

        const cert = await Certificate.findOne({
            $or: [
                { certId: certId.trim().toUpperCase() },
                { certId: certId.trim() }
            ]
        }).lean();

        if (!cert) {
            return NextResponse.json({ isValid: false, message: 'Sertifikat topilmadi' }, { status: 404 });
        }

        return NextResponse.json({
            isValid: true,
            certificate: cert
        });
    } catch (e: any) {
        return NextResponse.json({ message: 'Error verifying certificate', error: e.message }, { status: 500 });
    }
}
