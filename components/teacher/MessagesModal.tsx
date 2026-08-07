'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Trash2, Mail } from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherTheme } from '@/lib/teacherTheme';

export default function MessagesModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { config } = useTeacherTheme();
    const [teachers, setTeachers] = useState<any[]>([]);
    const [sentMessages, setSentMessages] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    
    const [receiverId, setReceiverId] = useState('');
    const [messageText, setMessageText] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchTeachers();
            fetchSentMessages();
        }
    }, [isOpen]);

    const fetchTeachers = async () => {
        try {
            const res = await fetch('/api/teacher/list');
            if (res.ok) setTeachers(await res.json());
        } catch (e) {}
    };

    const fetchSentMessages = async () => {
        try {
            const res = await fetch('/api/teacher/messages?type=sent');
            if (res.ok) setSentMessages(await res.json());
        } catch (e) {}
    };

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!receiverId || !messageText.trim()) return;

        setLoading(true);
        try {
            const res = await fetch('/api/teacher/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ receiverId, message: messageText })
            });

            if (res.ok) {
                toast.success('Xabar yuborildi!');
                setMessageText('');
                setReceiverId('');
                fetchSentMessages();
            } else {
                toast.error('Xatolik yuz berdi');
            }
        } catch (e) {
            toast.error('Xatolik yuz berdi');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Ushbu xabarni o\'chirmoqchimisiz?')) return;
        
        try {
            const res = await fetch(`/api/teacher/messages?id=${id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Xabar o\'chirildi');
                fetchSentMessages();
            }
        } catch (e) {
            toast.error('Xatolik yuz berdi');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="w-full max-w-2xl bg-[#0f0d1e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/20 flex items-center justify-center">
                            <Mail className="w-5 h-5 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white">Xabarlar</h2>
                            <p className="text-[10px] text-white/40 uppercase tracking-widest">O'qituvchilar bilan yozishish</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
                    
                    {/* Yangi Xabar Yozish */}
                    <div className="glass-card p-6 rounded-2xl bg-white/[0.02] border border-white/5">
                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-5 flex items-center gap-2">
                            <Send className="w-3.5 h-3.5" /> Yangi Xabar Yuborish
                        </h3>
                        <form onSubmit={handleSend} className="space-y-4">
                            <div className="relative">
                                <select 
                                    value={receiverId}
                                    onChange={(e) => setReceiverId(e.target.value)}
                                    className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-5 py-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 hover:bg-black/60 transition-all appearance-none font-bold shadow-inner"
                                    required
                                >
                                    <option value="" className="bg-gray-900 text-white/50">O'qituvchini tanlang...</option>
                                    {teachers.map(t => (
                                        <option key={t._id} value={t._id} className="bg-gray-900 text-white">{t.name} ({t.email})</option>
                                    ))}
                                </select>
                            </div>

                            <textarea 
                                value={messageText}
                                onChange={(e) => setMessageText(e.target.value)}
                                placeholder="Xabar matnini kiriting..."
                                className="w-full bg-black/40 border-2 border-white/10 rounded-xl px-5 py-4 text-sm text-white min-h-[120px] resize-none focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 hover:bg-black/60 transition-all font-medium leading-relaxed custom-scrollbar shadow-inner"
                                required
                            />

                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-black uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2 hover:from-indigo-400 hover:to-purple-400 transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] active:scale-[0.98]"
                            >
                                <Send className="w-4 h-4" />
                                {loading ? 'Yuborilmoqda...' : 'Yuborish'}
                            </button>
                        </form>
                    </div>

                    {/* Yuborilgan Xabarlar */}
                    <div>
                        <h3 className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-4">Mening Yuborgan Xabarlarim (48 soat)</h3>
                        <div className="space-y-3">
                            {sentMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-10 bg-white/[0.01] rounded-2xl border border-white/5 border-dashed">
                                    <Mail className="w-10 h-10 text-white/10 mb-3" />
                                    <p className="text-[10px] font-black text-white/30 uppercase tracking-widest">Hali hech qanday xabar yubormagansiz</p>
                                </div>
                            ) : (
                                sentMessages.map(msg => (
                                    <div key={msg._id} className="p-5 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col gap-3 relative group hover:bg-white/[0.04] hover:border-white/10 transition-all shadow-sm">
                                        <div className="flex justify-between items-start pr-8">
                                            <p className="text-[11px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2">
                                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                                                KIMGA: {msg.receiverId?.name || 'O\'qituvchi'}
                                            </p>
                                            <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">
                                                {new Date(msg.createdAt).toLocaleString()}
                                            </p>
                                        </div>
                                        <p className="text-[13px] text-white/70 leading-relaxed font-medium">{msg.message}</p>
                                        
                                        <button 
                                            onClick={() => handleDelete(msg._id)}
                                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 p-2 bg-red-500/10 text-red-400 rounded-xl hover:bg-red-500 hover:text-white transition-all border border-red-500/20 shadow-lg"
                                            title="Xabarni qaytarib olish"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                </div>
            </motion.div>
        </div>
    );
}
