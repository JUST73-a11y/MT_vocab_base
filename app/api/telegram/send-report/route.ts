import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Group from '@/models/Group';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { groupId, imageBase64, caption } = body;

        if (!groupId || !imageBase64) {
            return NextResponse.json({ message: 'Missing parameters' }, { status: 400 });
        }

        await dbConnect();
        
        const group = await Group.findById(groupId);
        if (!group) {
            return NextResponse.json({ message: 'Group not found' }, { status: 404 });
        }

        const chatId = group.telegramChatId;
        if (!chatId) {
            return NextResponse.json({ message: 'No Telegram Chat ID configured for this group' }, { status: 400 });
        }

        const botToken = process.env.TELEGRAM_BOT_TOKEN;
        if (!botToken) {
            return NextResponse.json({ message: 'Telegram Bot Token not configured on server' }, { status: 500 });
        }

        // Convert base64 back to buffer
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Prepare FormData for Telegram API
        const formData = new FormData();
        formData.append('chat_id', chatId);
        formData.append('caption', caption || '');
        formData.append('parse_mode', 'HTML');
        
        // Append the image as a Blob
        const blob = new Blob([imageBuffer], { type: 'image/png' });
        formData.append('photo', blob, 'report.png');

        const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
            method: 'POST',
            body: formData,
        });

        const telegramData = await telegramResponse.json();

        if (!telegramResponse.ok || !telegramData.ok) {
            console.error('Telegram API Error:', telegramData);
            return NextResponse.json({ 
                message: 'Failed to send to Telegram', 
                error: telegramData.description 
            }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: 'Report sent to Telegram successfully' });

    } catch (error: any) {
        console.error('Telegram send error:', error);
        return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
    }
}
