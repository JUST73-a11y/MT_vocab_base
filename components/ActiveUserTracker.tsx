'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function ActiveUserTracker() {
    const pathname = usePathname();

    useEffect(() => {
        // Ping immediately on navigation
        const ping = async () => {
            try {
                await fetch('/api/user/ping', { method: 'POST' });
            } catch (e) {
                // Silently fail
            }
        };
        
        ping();

        // Then ping every 3 minutes (180000 ms)
        const interval = setInterval(ping, 180000);

        return () => clearInterval(interval);
    }, [pathname]);

    return null; // Invisible component
}
