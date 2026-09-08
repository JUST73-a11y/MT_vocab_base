'use client';

import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Library, Plus, Trash2, BookOpen, Lock, Loader2, AlertCircle,
  Search, Play, ArrowRight, Sparkles, X, Check, Edit, Layers,
  FileText, UploadCloud
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const MAX_UNITS = 10;

const PRESET_CATEGORIES = [
  'IELTS Reading',
  'IELTS Listening',
  'IELTS Speaking',
  'IELTS Writing',
  'General English',
  'Grammar',
  'Academic',
  'Shaxsiy'
];

interface PersonalUnit {
  _id: string;
  id?: string;
  title: string;
  category?: string;
  createdAt: string;
  wordCount: number;
}

export default function MyVocabularyPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [units, setUnits] = useState<PersonalUnit[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState('');

  // Create Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('IELTS Reading');
  const [creating, setCreating] = useState(false);

  // Delete State
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'student')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.role === 'student') {
      fetchUnits();
    }
  }, [user]);

  async function fetchUnits() {
    setFetching(true);
    try {
      const res = await fetch('/api/student/personal-units');
      const data = await res.json();
      if (res.ok) {
        setUnits(data.units ?? []);
      }
    } catch {
      toast.error('Yuklashda xatolik yuz berdi');
    } finally {
      setFetching(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Unit nomini kiriting');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/student/personal-units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newTitle.trim(),
          category: newCategory || 'Shaxsiy'
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Xatolik');
        return;
      }
      toast.success('Yangi unit muvaffaqiyatli yaratildi!');
      setNewTitle('');
      setShowCreateModal(false);
      fetchUnits();

      if (data.unit?._id) {
        router.push(`/student/my-vocabulary/${data.unit._id}`);
      }
    } catch {
      toast.error('Unit yaratishda xatolik');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, title: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm(`"${title}" unitini o'chirasizmi? Ichidagi barcha so'zlar ham o'chiriladi.`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/student/personal-units/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success("Unit o'chirildi");
        setUnits(prev => prev.filter(u => (u._id || u.id) !== id));
      } else {
        const d = await res.json();
        toast.error(d.error || 'O\'chirishda xatolik');
      }
    } catch {
      toast.error('Xatolik');
    } finally {
      setDeletingId(null);
    }
  }

  const filteredUnits = units.filter(u =>
    u.title?.toLowerCase().includes(search.toLowerCase()) ||
    u.category?.toLowerCase().includes(search.toLowerCase())
  );

  const atLimit = units.length >= MAX_UNITS;

  if (loading || fetching) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#09090f] text-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 md:space-y-8 py-2 md:py-4">

        {/* ── Top Header Banner ── */}
        <div className="glass-card p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden border-white/10">
          <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-xl shadow-purple-600/30 shrink-0">
              <Library className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase text-white">Mening Lug'atim</h1>
              <p className="text-xs text-white/50 mt-1 font-medium">
                Shaxsiy unitlaringizni boshqaring, readingdan so'zlar oling va mashq qiling
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            <button
              onClick={() => atLimit ? toast.error(`Maksimal ${MAX_UNITS} ta shaxsiy unit yaratish mumkin`) : setShowCreateModal(true)}
              className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-xl ${
                atLimit
                  ? 'opacity-40 cursor-not-allowed bg-white/10 text-white/60'
                  : 'bg-gradient-to-r from-purple-600 via-indigo-600 to-indigo-500 hover:from-purple-500 hover:to-indigo-400 text-white shadow-purple-600/25'
              }`}
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              Yangi Unit Yaratish
            </button>
          </div>
        </div>

        {/* ── Quota Progress Card ── */}
        <div className="glass-card p-5 rounded-2xl border-white/10 flex flex-col gap-2.5">
          <div className="flex justify-between items-center text-xs font-bold text-white/70">
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              Shaxsiy unitlar kvotasi
            </span>
            <span className={atLimit ? 'text-red-400 font-black' : 'text-purple-400 font-black'}>
              {units.length} / {MAX_UNITS} ta unit
            </span>
          </div>
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                atLimit
                  ? 'bg-red-500'
                  : units.length > 7
                  ? 'bg-amber-500'
                  : 'bg-gradient-to-r from-purple-500 via-indigo-500 to-teal-400'
              }`}
              style={{ width: `${(units.length / MAX_UNITS) * 100}%` }}
            />
          </div>
          {atLimit && (
            <p className="text-[11px] text-red-400 flex items-center gap-1 font-medium mt-0.5">
              <Lock className="w-3.5 h-3.5" /> 10 ta unit limitiga yetdingiz. Yangi unit ochish uchun eskisini o'chiring.
            </p>
          )}
        </div>

        {/* ── Search Bar ── */}
        {units.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                placeholder="Unit nomlari yoki kategoriyalar bo'yicha qidirish..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white/[0.03] border border-white/10 text-sm text-white placeholder:text-white/30 outline-none focus:border-indigo-500 transition-colors shadow-inner"
              />
            </div>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="px-4 py-3.5 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-bold text-white/60"
              >
                Tozalash
              </button>
            )}
          </div>
        )}

        {/* ── Units Grid ── */}
        {units.length === 0 ? (
          <div className="py-20 px-6 text-center rounded-3xl border border-dashed border-white/10 bg-white/[0.02] flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-purple-500/20 to-indigo-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-xl">
              <BookOpen className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black mb-1">Hali shaxsiy unitlaringiz yo'q</h3>
            <p className="text-xs text-white/40 max-w-md mb-8 leading-relaxed">
              IELTS Reading, yangi so'zlar yoki o'zingiz yodlamoqchi bo'lgan mavzular uchun shaxsiy unit oching va so'z qo'shing.
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-xl shadow-purple-600/25"
            >
              <Plus className="w-4 h-4 stroke-[3]" /> Birinchi unitni yaratish
            </button>
          </div>
        ) : filteredUnits.length === 0 ? (
          <div className="py-16 text-center text-white/40 glass-card">
            <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm font-bold">"{search}" bo'yicha unit topilmadi</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredUnits.map(unit => {
              const unitId = unit._id || unit.id || '';
              const isDeleting = deletingId === unitId;

              return (
                <div
                  key={unitId}
                  onClick={() => router.push(`/student/my-vocabulary/${unitId}`)}
                  className="p-6 rounded-3xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-indigo-500/40 transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden shadow-lg hover:-translate-y-1"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500/15 to-indigo-500/15 border border-purple-500/25 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform shadow-inner">
                        <BookOpen className="w-6 h-6" />
                      </div>

                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleDelete(unitId, unit.title, e)}
                          disabled={isDeleting}
                          className="p-2 rounded-xl text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                          title="O'chirish"
                        >
                          {isDeleting ? <Loader2 className="w-4 h-4 animate-spin text-red-400" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <h3 className="text-lg font-black tracking-tight text-white group-hover:text-indigo-200 transition-colors line-clamp-1 mb-1.5 uppercase">
                      {unit.title}
                    </h3>

                    <div className="flex items-center gap-2 mb-5">
                      <span className="px-2.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] font-bold text-white/50 uppercase tracking-wider">
                        {unit.category || 'Shaxsiy'}
                      </span>
                      <span className="text-xs text-indigo-400 font-bold">
                        {unit.wordCount ?? 0} ta so'z
                      </span>
                    </div>
                  </div>

                  {/* Bottom Action Footer */}
                  <div className="pt-4 border-t border-white/5 flex items-center justify-between gap-2" onClick={e => e.stopPropagation()}>
                    <Link
                      href={`/student/my-vocabulary/${unitId}`}
                      className="flex-1 py-2.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-center text-xs font-bold text-white/80 hover:text-white transition-colors uppercase tracking-wider"
                    >
                      So'zlar
                    </Link>
                    {(unit.wordCount ?? 0) > 0 && (
                      <Link
                        href={`/student/games?unitId=${unitId}`}
                        className="py-2.5 px-3.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-bold transition-colors flex items-center gap-1.5 uppercase tracking-wider"
                        title="O'yinlar"
                      >
                        <Play className="w-3.5 h-3.5 fill-emerald-400" />
                        Mashq
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

      {/* ── Create Unit Modal ── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl animate-fade-in">
          <div className="w-full max-w-md p-6 sm:p-8 rounded-3xl bg-[#12131c] border border-white/10 shadow-2xl relative">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-black uppercase tracking-wider text-white">Yangi Unit Yaratish</h3>
                <p className="text-xs text-white/40 mt-0.5">Shaxsiy so'zlar to'plami</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                  Unit Nomi <span className="text-purple-400">*</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="Masalan: Unit 1 - Nature & Environment"
                  required
                  autoFocus
                  className="w-full px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">
                  Kategoriya / Bo'lim
                </label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {PRESET_CATEGORIES.slice(0, 4).map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setNewCategory(cat)}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all text-left truncate ${
                        newCategory === cat
                          ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                          : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value)}
                  placeholder="Yoki o'zingiz yozing..."
                  className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white outline-none focus:border-purple-500 transition-colors"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 py-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-bold uppercase tracking-wider text-white/60"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={creating || !newTitle.trim()}
                  className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black uppercase tracking-wider disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-purple-600/30"
                >
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 stroke-[3]" />}
                  Yaratish
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}