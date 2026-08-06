'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/apiFetch';
import toast from 'react-hot-toast';
import { 
  User, 
  Lock, 
  Mail, 
  ShieldCheck, 
  Coins, 
  Award, 
  BookOpen, 
  MessageSquare, 
  Send, 
  KeyRound, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  Sparkles,
  Phone,
  HelpCircle,
  Users,
  GraduationCap,
  Flame,
  Settings,
  Globe,
  Github,
  Instagram
} from 'lucide-react';

export default function StudentSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [teacherName, setTeacherName] = useState<string>('justAli');
  const [groupName, setGroupName] = useState<string>('Monday 8:00');
  const [certCount, setCertCount] = useState<number>(0);
  const [loadingData, setLoadingData] = useState(true);

  // Password Change Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPass, setChangingPass] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (user) {
      fetchStudentProfile();
    }
  }, [user, authLoading, router]);

  const fetchStudentProfile = async () => {
    try {
      setLoadingData(true);
      const [walletRes, certsRes, groupRes] = await Promise.all([
        apiFetch('/api/wallet').catch(() => null),
        apiFetch('/api/smartlex/certificates').catch(() => null),
        apiFetch('/api/student/group').catch(() => null),
      ]);

      if (walletRes?.wallet) {
        setWalletBalance(walletRes.wallet.balance || 0);
      }
      if (Array.isArray(certsRes)) {
        setCertCount(certsRes.length);
      }
      if (groupRes?.group) {
        setGroupName(groupRes.group.name || 'Monday 8:00');
        if (groupRes.group.teacherName) {
          setTeacherName(groupRes.group.teacherName);
        }
      }
    } catch (e) {
      console.error('Failed to load settings data:', e);
    } finally {
      setLoadingData(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      toast.error("Barcha maydonlarni to'ldiring");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Yangi parol kamida 6 ta belgidan iborat bo'lishi kerak");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Yangi parollar bir-biriga mos kelmadi");
      return;
    }

    try {
      setChangingPass(true);
      await apiFetch('/api/user/password', {
        method: 'PUT',
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      toast.success("Parol muvaffaqiyatli o'zgartirildi! 🔑");
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.error(err.message || "Parolni o'zgartirishda xatolik yuz berdi");
    } finally {
      setChangingPass(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#4D7CFE]" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-6xl mx-auto pt-16 pb-8 md:pt-28 md:pb-12 px-4 flex flex-col gap-10 font-sans text-white">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-center gap-5">
        <div className="w-16 h-16 rounded-[22px] bg-gradient-to-br from-[#4D7CFE]/20 to-[#7A5AF8]/20 border border-[#4D7CFE]/40 flex items-center justify-center text-[#5B8CFF] shadow-[0_0_30px_rgba(77,124,254,0.25)] shrink-0">
          <Settings className="w-8 h-8 animate-spin" style={{ animationDuration: '20s' }} />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            Sozlamalar & Profil
          </h1>
          <p className="text-[#D7DCEA]/60 text-sm font-medium mt-1">
            Manage your account, security and learning profile.
          </p>
        </div>
      </div>

      {/* ── MAIN 2-COLUMN DASHBOARD GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN: Account Information & Password Security */}
        <div className="lg:col-span-7 flex flex-col gap-8">

          {/* 1. Account Information Card */}
          <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-[35px] border border-white/12 rounded-[26px] p-6 md:p-8 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#4D7CFE]/50 hover:shadow-[0_20px_40px_rgba(77,124,254,0.15)] flex flex-col gap-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#4D7CFE]/20 border border-[#4D7CFE]/40 flex items-center justify-center text-[#5B8CFF]">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white">Account Information</h2>
                  <p className="text-xs text-[#D7DCEA]/50 font-medium">Personal account and profile details</p>
                </div>
              </div>
              <span className="bg-[#4D7CFE]/20 text-[#5B8CFF] text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-[#4D7CFE]/40 shadow-sm">
                ACTIVE STUDENT
              </span>
            </div>

            {/* Avatar & User Details */}
            <div className="flex items-center gap-5">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4D7CFE] via-[#7A5AF8] to-[#5B8CFF] p-[3px] shadow-[0_0_25px_rgba(77,124,254,0.4)]">
                  <div className="w-full h-full rounded-full bg-[#071122] flex items-center justify-center text-3xl font-black text-white">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-[#22C55E] border-2 border-[#071122] flex items-center justify-center text-[10px] text-white">
                  ✓
                </div>
              </div>

              <div className="flex flex-col gap-1 min-w-0">
                <h3 className="text-2xl font-black text-white tracking-tight truncate">{user.name}</h3>
                <p className="text-xs text-[#D7DCEA]/70 font-mono flex items-center gap-1.5 truncate">
                  <Mail className="w-3.5 h-3.5 text-[#5B8CFF]" /> {user.email}
                </p>
                <div className="mt-1">
                  <span className="inline-block px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#7A5AF8]/20 border border-[#7A5AF8]/40 text-[#7A5AF8]">
                    O'QUVCHI (STUDENT)
                  </span>
                </div>
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#D7DCEA]/40">Student ID</p>
                <p className="text-xs font-mono font-bold text-white truncate">{user.id}</p>
              </div>

              <div className="bg-white/5 rounded-2xl p-4 border border-white/5 space-y-1">
                <p className="text-[10px] font-black uppercase tracking-wider text-[#D7DCEA]/40">Registration Date</p>
                <p className="text-xs font-bold text-white">
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('uz-UZ') : '06 Avgust 2026'}
                </p>
              </div>
            </div>
          </div>

          {/* 2. Password Security Card */}
          <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-[35px] border border-white/12 rounded-[26px] p-6 md:p-8 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#FFB300]/50 hover:shadow-[0_20px_40px_rgba(255,179,0,0.15)] flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-[#FFB300]/20 border border-[#FFB300]/40 flex items-center justify-center text-[#FFB300]">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Password Security</h2>
                <p className="text-xs text-[#D7DCEA]/50 font-medium">Update your account password</p>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-[#D7DCEA]/80 mb-2 uppercase tracking-wider">Joriy Parol (Current Password)</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Joriy parolingizni kiriting"
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-[#D7DCEA]/30 text-sm focus:outline-none focus:border-[#FFB300] transition-colors pr-12 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D7DCEA]/40 hover:text-white transition-colors"
                  >
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#D7DCEA]/80 mb-2 uppercase tracking-wider">Yangi Parol (New Password)</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Kamida 6 ta belgi"
                    className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-[#D7DCEA]/30 text-sm focus:outline-none focus:border-[#FFB300] transition-colors pr-12 font-medium"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#D7DCEA]/40 hover:text-white transition-colors"
                  >
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#D7DCEA]/80 mb-2 uppercase tracking-wider">Yangi Parolni Tasdiqlang</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Yangi parolni qayta kiriting"
                  className="w-full px-5 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-white placeholder-[#D7DCEA]/30 text-sm focus:outline-none focus:border-[#FFB300] transition-colors font-medium"
                />
              </div>

              <button
                type="submit"
                disabled={changingPass}
                className="w-full py-4.5 rounded-[18px] bg-gradient-to-r from-[#FF8A00] to-[#FFB300] hover:from-[#FF8A00]/90 hover:to-[#FFB300]/90 text-gray-950 font-black text-sm uppercase tracking-wider shadow-xl shadow-[#FF8A00]/30 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 mt-4"
              >
                <ShieldCheck className="w-5 h-5 fill-current" />
                <span>{changingPass ? "Saqlanmoqda..." : "Parolni Yangilash"}</span>
              </button>
            </form>
          </div>

        </div>

        {/* RIGHT COLUMN: Learning Profile & Contact Us */}
        <div className="lg:col-span-5 flex flex-col gap-8">

          {/* 3. Learning Profile Card */}
          <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-[35px] border border-white/12 rounded-[26px] p-6 md:p-8 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#7A5AF8]/50 hover:shadow-[0_20px_40px_rgba(122,90,248,0.15)] flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-[#7A5AF8]/20 border border-[#7A5AF8]/40 flex items-center justify-center text-[#7A5AF8]">
                <GraduationCap className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Learning Profile</h2>
                <p className="text-xs text-[#D7DCEA]/50 font-medium">Your course and teacher details</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#4D7CFE]/20 border border-[#4D7CFE]/30 flex items-center justify-center text-[#5B8CFF] shrink-0">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#D7DCEA]/40">USTOZ / O'QITUVCHI</p>
                    <p className="text-base font-black text-white">{teacherName}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#7A5AF8]/20 border border-[#7A5AF8]/30 flex items-center justify-center text-[#7A5AF8] shrink-0">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-[#D7DCEA]/40">GURUH NOMI</p>
                    <p className="text-base font-black text-white">{groupName}</p>
                  </div>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#FFB300]/10 border border-[#FFB300]/25 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#FFB300]">MT COINS</span>
                    <Coins className="w-5 h-5 text-[#FFB300]" />
                  </div>
                  <p className="text-3xl font-black text-[#FFB300]">{walletBalance}</p>
                </div>

                <div className="p-4 rounded-2xl bg-[#22C55E]/10 border border-[#22C55E]/25 flex flex-col justify-between">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#22C55E]">SERTIFIKATLAR</span>
                    <Award className="w-5 h-5 text-[#22C55E]" />
                  </div>
                  <p className="text-3xl font-black text-[#22C55E]">{certCount} ta</p>
                </div>
              </div>
            </div>
          </div>

          {/* 4. Contact Us Card */}
          <div className="bg-[rgba(255,255,255,0.06)] backdrop-blur-[35px] border border-white/12 rounded-[26px] p-6 md:p-8 shadow-2xl transition-all duration-300 hover:-translate-y-1 hover:border-[#5B8CFF]/50 hover:shadow-[0_20px_40px_rgba(91,140,255,0.15)] flex flex-col gap-6">
            <div className="flex items-center gap-3 pb-4 border-b border-white/10">
              <div className="w-10 h-10 rounded-xl bg-[#5B8CFF]/20 border border-[#5B8CFF]/40 flex items-center justify-center text-[#5B8CFF]">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white">Biz Bilan Bog'lanish (Contact Us)</h2>
                <p className="text-xs text-[#D7DCEA]/50 font-medium">Platform support and administration</p>
              </div>
            </div>

            <p className="text-xs text-[#D7DCEA]/70 leading-relaxed">
              Platforma bo'yicha savollaringiz, takliflaringiz yoki texnik muammolar bo'lsa, platforma ma'muriyati bilan bog me'yorda bog'lanishingiz mumkin.
            </p>

            {/* Contact Action Cards */}
            <div className="space-y-3 pt-1">
              <a
                href="https://t.me/muhamadali_oo1"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-[#4D7CFE]/15 border border-[#4D7CFE]/30 hover:bg-[#4D7CFE]/25 transition-all flex items-center justify-between group shadow-lg shadow-[#4D7CFE]/10"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#4D7CFE]/30 flex items-center justify-center text-[#5B8CFF] group-hover:scale-110 transition-transform">
                    <Send className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">Telegram</p>
                    <p className="text-xs text-[#5B8CFF] font-mono">@muhamadali_oo1</p>
                  </div>
                </div>
                <span className="text-xs font-black text-[#5B8CFF] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Yozish ➔
                </span>
              </a>

              <a
                href="https://instagram.com/_just_ali.__"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-2xl bg-[#E1306C]/10 border border-[#E1306C]/30 hover:bg-[#E1306C]/20 transition-all flex items-center justify-between group shadow-lg shadow-[#E1306C]/10"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-[#E1306C]/20 flex items-center justify-center text-[#E1306C] group-hover:scale-110 transition-transform">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-white">Instagram</p>
                    <p className="text-xs text-[#E1306C] font-mono">@_just_ali.__</p>
                  </div>
                </div>
                <span className="text-xs font-black text-[#E1306C] group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Ko'rish ➔
                </span>
              </a>

              {/* Founder Info */}
              <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center gap-3.5 mt-2">
                <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#FFB300] shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Platforma Asoschisi & Admin</p>
                  <p className="text-xs text-[#D7DCEA]/50 font-bold mt-0.5">MT-Ali (Lead Instructor)</p>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* ── FOOTER ── */}
      <footer className="mt-8 pt-8 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-[#D7DCEA]/40">
        <div className="flex items-center gap-3 font-bold">
          <span>VocabApp v2.4.0</span>
          <span>•</span>
          <span>© 2026 VocabApp Academy. All rights reserved.</span>
        </div>

        <div className="flex items-center gap-3">
          <a href="https://t.me/muhamadali_oo1" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full bg-[#4D7CFE]/10 border border-[#4D7CFE]/30 text-[#4D7CFE] hover:bg-[#4D7CFE]/20 hover:text-white transition-all flex items-center gap-1.5 font-bold">
            <Send className="w-3.5 h-3.5" /> Telegram
          </a>
          <a href="https://instagram.com/_just_ali.__" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-full bg-[#E1306C]/10 border border-[#E1306C]/30 text-[#E1306C] hover:bg-[#E1306C]/20 hover:text-white transition-all flex items-center gap-1.5 font-bold">
            <Instagram className="w-3.5 h-3.5" /> Instagram
          </a>
        </div>
      </footer>

    </div>
  );
}
