'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Here we could log the error to an external service
        console.error('Global Error Caught:', error);
    }, [error]);

    return (
        <html>
            <body>
                <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white p-4">
                    <div className="max-w-md w-full bg-white/5 border border-white/10 rounded-3xl p-8 text-center shadow-2xl">
                        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-6 text-3xl font-black">
                            !
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2">Tizimda Xatolik</h2>
                        <p className="text-white/50 text-sm mb-8 leading-relaxed">
                            Kutilmagan xatolik yuz berdi. Sahifani qaytadan yuklang yoki asosiy sahifaga qayting.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => reset()}
                                className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all"
                            >
                                Qaytadan urinish
                            </button>
                            <Link
                                href="/"
                                className="w-full py-4 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 font-black text-sm transition-all"
                            >
                                Asosiy sahifaga qaytish
                            </Link>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
