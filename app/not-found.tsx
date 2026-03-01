import Link from 'next/link';
import { Home, ServerCrash } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f] text-white p-4 font-sans">
            <div className="max-w-md w-full text-center relative z-10">
                <div className="w-24 h-24 mx-auto bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20 mb-6 relative">
                    <ServerCrash className="w-10 h-10 text-indigo-400" />
                    <div className="absolute -top-1 -right-1 bg-red-500 text-[10px] font-black px-2 py-0.5 rounded-full border border-[#0a0a0f]">
                        404
                    </div>
                </div>

                <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tighter">
                    Sahifa topilmadi
                </h1>

                <p className="text-white/40 mb-8 max-w-[280px] mx-auto text-sm">
                    Siz qidirayotgan sahifa mavjud emas yoki nomi o'zgargan bo'lishi mumkin.
                </p>

                <div className="flex gap-4 justify-center">
                    <Link
                        href="/"
                        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm transition-all shadow-lg shadow-indigo-500/20 group"
                    >
                        <Home className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                        Bosh sahifa
                    </Link>
                </div>
            </div>

            {/* Background elements */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[20%] left-[20%] w-[30vw] h-[30vw] min-w-[300px] bg-indigo-600/10 blur-[100px] rounded-full mx-auto" />
                <div className="absolute bottom-[20%] right-[20%] w-[25vw] h-[25vw] min-w-[250px] bg-purple-600/10 blur-[100px] rounded-full mx-auto" />
            </div>
        </div>
    );
}
