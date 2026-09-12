import { NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import dbConnect from '@/lib/db';
import Group from '@/models/Group';

/**
 * Normalizes user-entered Telegram Chat ID:
 * - Strips whitespace
 * - Handles @usernames
 * - Auto-prepends -100 for supergroups if user entered e.g. 4481651316, 1004481651316, or -4481651316
 */
function normalizeTelegramChatId(raw: string): string {
    let input = (raw || '').trim().replace(/\s+/g, '');
    if (!input) return '';
    if (input.startsWith('@')) return input;

    // Already valid supergroup ID: -100xxxxxxxxxx
    if (input.startsWith('-100')) return input;

    // User entered 100xxxxxxxxxx (missing minus sign)
    if (input.startsWith('100') && input.length >= 12) {
        return '-' + input;
    }

    // User entered positive group ID e.g. 4481651316
    if (/^\d{9,13}$/.test(input)) {
        return `-100${input}`;
    }

    // User entered negative without 100 e.g. -4481651316
    if (/^-\d{9,13}$/.test(input)) {
        return `-100${input.slice(1)}`;
    }

    return input;
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { groupId, imageBase64, caption, text, sendType = 'both', overrideChatId, botToken: customBotToken } = body;

        await dbConnect();
        
        let group: any = null;
        if (groupId) {
            group = await Group.findById(groupId);
        }

        let rawChatId = (overrideChatId || group?.telegramChatId || '').trim();
        let chatId = normalizeTelegramChatId(rawChatId);

        if (!chatId) {
            return NextResponse.json({ 
                message: 'Telegram guruh ID topilmadi. Guruh sozlamalaridan Telegram Chat ID ni kiriting.' 
            }, { status: 400 });
        }

        // Auto-persist normalized chatId to group if needed
        if (group && chatId !== (group.telegramChatId || '')) {
            group.telegramChatId = chatId;
            await group.save().catch(() => {});
        }

        const rawTokenOrUrl = (
            customBotToken ||
            process.env.TELEGRAM_BOT_TOKEN ||
            process.env.TELEGRAM_BOT_URL ||
            process.env.TELEGRAM_URL_BOT ||
            process.env.TELEGRAM_TOKEN ||
            process.env.TELEGRAM_URL
        )?.trim() || '';

        // If user provided full URL like https://api.telegram.org/bot8859834314:AAEm..., extract token
        let botToken = rawTokenOrUrl;
        const urlMatch = rawTokenOrUrl.match(/bot(\d+:[A-Za-z0-9_-]+)/i);
        if (urlMatch) {
            botToken = urlMatch[1];
        }

        if (!botToken) {
            return NextResponse.json({ 
                message: 'Telegram Bot Token topilmadi. Server sozlamalarida TELEGRAM_BOT_TOKEN yoki TELEGRAM_BOT_URL ni sozlang.' 
            }, { status: 400 });
        }

        const messageContent = text || caption || '';

        // Helper: Check for Telegram supergroup migration and retry
        const checkMigration = async (tgData: any): Promise<string | null> => {
            if (tgData?.parameters?.migrate_to_chat_id) {
                const newChatId = String(tgData.parameters.migrate_to_chat_id);
                chatId = newChatId;
                if (group) {
                    group.telegramChatId = newChatId;
                    await group.save().catch(() => {});
                }
                return newChatId;
            }
            return null;
        };

        // 1. Send Mode: 'text'
        if (sendType === 'text') {
            if (!messageContent) {
                return NextResponse.json({ message: 'Yuborish uchun matn mavjud emas' }, { status: 400 });
            }

            let res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: messageContent,
                    parse_mode: 'HTML',
                }),
            });
            let data = await res.json();

            // Check if group migrated to supergroup
            const migratedId = await checkMigration(data);
            if (migratedId) {
                res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: migratedId,
                        text: messageContent,
                        parse_mode: 'HTML',
                    }),
                });
                data = await res.json();
            }

            if (!res.ok || !data.ok) {
                // If HTML parse fails, retry as plain text
                const retryRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: messageContent,
                    }),
                });
                const retryData = await retryRes.json();
                if (!retryRes.ok || !retryData.ok) {
                    const desc = retryData.description || data.description || 'Noma\'lum xatolik';
                    return NextResponse.json({ 
                        message: `Telegram xatoligi: ${desc}`, 
                        error: desc 
                    }, { status: 400 });
                }
            }

            return NextResponse.json({ success: true, message: 'Matnli hisobot Telegram guruhga yuborildi' });
        }

        // 2. Send Mode: 'image' or 'both'
        if (!imageBase64) {
            return NextResponse.json({ message: 'Rasm tayyorlanmadi yoki mavjud emas' }, { status: 400 });
        }

        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const blob = new Blob([imageBuffer], { type: 'image/png' });

        const photoCaption = sendType === 'both' 
            ? (messageContent.length <= 1024 ? messageContent : messageContent.slice(0, 1020) + '...')
            : (caption ? (caption.length <= 1024 ? caption : caption.slice(0, 1020) + '...') : '');

        const sendPhotoReq = async (targetChatId: string, withHtml: boolean) => {
            const formData = new FormData();
            formData.append('chat_id', targetChatId);
            if (photoCaption) {
                formData.append('caption', photoCaption);
                if (withHtml) formData.append('parse_mode', 'HTML');
            }
            formData.append('photo', blob, 'vocab_report.png');

            const r = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
                method: 'POST',
                body: formData,
            });
            return await r.json();
        };

        let telegramData = await sendPhotoReq(chatId, true);

        // Check if group migrated to supergroup
        const migratedId = await checkMigration(telegramData);
        if (migratedId) {
            telegramData = await sendPhotoReq(migratedId, true);
        }

        if (!telegramData.ok) {
            // Retry photo without HTML parse mode in case caption had problematic tags
            if (photoCaption) {
                const retryData = await sendPhotoReq(chatId, false);
                if (!retryData.ok) {
                    const desc = retryData.description || telegramData.description || 'Noma\'lum xatolik';
                    return NextResponse.json({ 
                        message: `Telegram xatoligi: ${desc}`, 
                        error: desc 
                    }, { status: 400 });
                }
            } else {
                const desc = telegramData.description || 'Noma\'lum xatolik';
                return NextResponse.json({ 
                    message: `Telegram xatoligi: ${desc}`, 
                    error: desc 
                }, { status: 400 });
            }
        }

        // If 'both' and text was longer than caption limit (1024 chars), send remainder as second text message
        if (sendType === 'both' && messageContent.length > 1024) {
            await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: messageContent,
                }),
            }).catch(() => {});
        }

        return NextResponse.json({ 
            success: true, 
            message: sendType === 'both' ? 'Rasm va matn Telegramga muvaffaqiyatli yuborildi' : 'Rasm Telegramga muvaffaqiyatli yuborildi' 
        });

    } catch (error: any) {
        console.error('Telegram send error:', error);
        return NextResponse.json({ message: 'Serverda xatolik yuz berdi' }, { status: 500 });
    }
}
