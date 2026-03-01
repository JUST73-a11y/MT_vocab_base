import nodemailer from 'nodemailer';

const lastSentStore = new Map<string, number>();
const ALERT_THROTTLE_MS = 10 * 60 * 1000; // 10 minutes

export async function sendSecurityAlert(subject: string, htmlBody: string, throttleKey?: string) {
    const adminEmail = process.env.ADMIN_EMAIL_ALLOWLIST;
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (!adminEmail || !gmailUser || !gmailPass) {
        console.warn('Security Alert triggered, but email config missing. Check ENV vars.');
        return;
    }

    // Throttle checks
    if (throttleKey) {
        const lastSent = lastSentStore.get(throttleKey);
        const now = Date.now();
        if (lastSent && (now - lastSent < ALERT_THROTTLE_MS)) {
            // Throttled, skip sending email
            return;
        }
        lastSentStore.set(throttleKey, now);
    }

    try {
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: gmailUser,
                pass: gmailPass,
            },
        });

        await transporter.sendMail({
            from: `"VocabApp Security" <${gmailUser}>`,
            to: adminEmail,
            subject: `🚨 [SECURITY ALERT] ${subject}`,
            html: htmlBody,
        });

        console.log(`Security alert sent to ${adminEmail}`);
    } catch (error) {
        console.error('Failed to send security alert:', error);
    }
}
