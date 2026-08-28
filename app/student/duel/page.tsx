'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import { Swords, Loader2, Trophy, Users, ArrowRight, ShieldAlert, Sparkles, Play } from 'lucide-react';
import Link from 'next/link';

export default function StudentDuelIndexPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeDuels, setActiveDuels] = useState<any[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && (!user || user.role !== 'student')) {
            router.push('/login');
            return;
        }

        if (user) {
            fetchActiveDuels();
        }
    }, [user, loading]);

    const fetchActiveDuels = async () => {
        try {
            const res = await apiFetch('/api/student/duel/active');
            if (res.openDuels && res.openDuels.length > 0) {
                // Redirect automatically to the first active duel if available
                router.push(`/student/duel/${res.openDuels[0]._id}`);
                return;
            }
            setActiveDuels(res.openDuels || []);
        } catch {
            // ignore
        } finally {
            setLoadingData(false);
        }
    };

    if (loading || loadingData) {
        return (
            <div className="flex-1 flex items-center justify-center min-h-[60vh]">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
            </div>
        );
    }

    return (
        <div className="w-full max-w-4xl mx-auto py-10 px-4 animate-fade-in flex flex-col items-center justify-center min-h-[70vh] text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-red-500 to-indigo-600 flex items-center justify-center mb-6 shadow-2xl shadow-red-500/20">
                <Swords className="w-12 h-12 text-white animate-pulse" />
            </div>

            <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight mb-3">
                Real-Time Battle & Duellar
            </h1>

            <p className="text-sm sm:text-base text-gray-400 max-w-md leading-relaxed mb-8">
                Guruhdoshlaringiz bilan real-vaqt rejimida so'zlar bo'yicha kuch sinashing va MT Coin mukofotlariga ega bo'ling!
            </p>

            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm justify-center">
                <Link
                    href="/student/group"
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-500 to-indigo-600 hover:from-red-600 hover:to-indigo-700 text-white font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 shadow-xl shadow-red-500/25 transition-all active:scale-95"
                >
                    <Users className="w-5 h-5" /> Raqib Tanlash (Guruh)
                </Link>
            </div>
        </div>
    );
}
