import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { getServerSession } from '@/lib/serverAuth';

export async function POST(req: Request) {
    try {
        const session = await getServerSession();
        if (!session) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

        await dbConnect();
        
        // Parse User Agent
        const userAgent = req.headers.get('user-agent') || '';
        let os = 'Noma\'lum';
        let device = 'Kompyuter';
        let browser = 'Noma\'lum';

        // Very basic UA parsing
        if (/android/i.test(userAgent)) {
            os = 'Android';
            device = 'Mobil';
        } else if (/ipad|iphone|ipod/i.test(userAgent)) {
            os = 'iOS';
            device = 'Mobil';
        } else if (/windows/i.test(userAgent)) {
            os = 'Windows';
        } else if (/mac os/i.test(userAgent)) {
            os = 'MacOS';
        } else if (/linux/i.test(userAgent)) {
            os = 'Linux';
        }

        if (/chrome|crios|crmo/i.test(userAgent) && !/edg/i.test(userAgent)) browser = 'Chrome';
        else if (/safari/i.test(userAgent) && !/chrome/i.test(userAgent)) browser = 'Safari';
        else if (/firefox|fxios/i.test(userAgent)) browser = 'Firefox';
        else if (/edg/i.test(userAgent)) browser = 'Edge';
        else if (/opr|opera/i.test(userAgent)) browser = 'Opera';

        await User.findByIdAndUpdate(session.id || (session as any)._id, {
            lastActiveAt: new Date(),
            lastOs: os,
            lastDevice: device,
            lastBrowser: browser
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ message: 'Error updating activity' }, { status: 500 });
    }
}
