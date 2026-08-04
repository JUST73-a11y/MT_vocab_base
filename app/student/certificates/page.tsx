'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { apiFetch } from '@/lib/apiFetch';
import { Award, CheckCircle, Calendar, User, Users, Printer, QrCode, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface Certificate {
  _id: string;
  certId: string;
  studentName: string;
  groupName: string;
  teacherName: string;
  unitTitle: string;
  earnedAt: string;
  status: string;
  coinsAwarded: number;
}

export default function StudentCertificatesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loadingCerts, setLoadingCerts] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);

  useEffect(() => {
    if (!loading && (!user || user.role !== 'student')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) loadCertificates();
  }, [user]);

  const loadCertificates = async () => {
    setLoadingCerts(true);
    try {
      const res = await apiFetch('/api/smartlex/certificates');
      setCertificates(res || []);
    } catch {
      toast.error("Sertifikatlarni yuklab bo'lmadi");
    } finally {
      setLoadingCerts(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500" />
      </div>
    );
  }

  return (
    <div className="w-full min-h-[calc(100vh-80px)] py-8 px-4 max-w-5xl mx-auto flex flex-col gap-8">

      {/* Header */}
      <div className="flex items-center gap-4 border-b border-white/10 pb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/25">
          <Award className="w-6 h-6 text-gray-950" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">Mening Sertifikatlarim</h1>
          <p className="text-white/40 text-sm">SmartLex o&apos;yinida to&apos;liq o&apos;zlashtirilgan bo&apos;limlar</p>
        </div>
        <div className="ml-auto">
          <Link href="/student/games"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/60 text-sm font-bold hover:bg-white/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
            <span>O&apos;yinlarga qaytish</span>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      {!loadingCerts && certificates.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-amber-400">{certificates.length}</p>
            <p className="text-[10px] uppercase font-bold text-white/40 mt-0.5">Sertifikat</p>
          </div>
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/5 border border-indigo-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-indigo-400">{certificates.length * 10}</p>
            <p className="text-[10px] uppercase font-bold text-white/40 mt-0.5">Stage Tugatildi</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/5 border border-emerald-500/20 rounded-2xl p-4 text-center">
            <p className="text-2xl font-black text-emerald-400">{certificates.length * 100}</p>
            <p className="text-[10px] uppercase font-bold text-white/40 mt-0.5">MT Coin Topildi</p>
          </div>
        </div>
      )}

      {/* Certificates */}
      {loadingCerts ? (
        <div className="py-20 text-center text-white/30">Yuklanmoqda...</div>
      ) : certificates.length === 0 ? (
        <div className="py-20 text-center flex flex-col items-center gap-5 bg-white/3 rounded-3xl border border-white/8 border-dashed">
          <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-4xl">🏆</div>
          <div>
            <p className="text-lg font-black text-white/50">Hali sertifikatlaringiz yo&apos;q</p>
            <p className="text-sm text-white/25 mt-1 max-w-sm mx-auto">SmartLex o&apos;yinida 10 ta bosqichni to&apos;liq o&apos;tib, barcha so&apos;zlarni o&apos;zlashtiring!</p>
          </div>
          <Link href="/student/games"
            className="px-6 py-2.5 rounded-xl bg-amber-500 text-gray-950 font-black text-sm">
            O&apos;yinni Boshlash
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {certificates.map(cert => (
            <div
              key={cert._id}
              className="group rounded-3xl bg-gradient-to-br from-gray-900 via-gray-900 to-gray-950 border border-amber-500/20 hover:border-amber-500/50 p-6 flex flex-col gap-4 shadow-lg hover:shadow-amber-500/10 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400">MT-Vocab Certificate</p>
                  <h3 className="text-xl font-black text-white mt-1">{cert.unitTitle}</h3>
                </div>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-black">
                  <CheckCircle className="w-3 h-3" /> VERIFIED
                </span>
              </div>

              <div className="space-y-1.5 text-xs text-white/50">
                <div className="flex items-center gap-2"><User className="w-3.5 h-3.5" /><span>{cert.studentName}</span></div>
                <div className="flex items-center gap-2"><Users className="w-3.5 h-3.5" /><span>{cert.groupName} | Ustoz: {cert.teacherName}</span></div>
                <div className="flex items-center gap-2"><Calendar className="w-3.5 h-3.5" /><span>{new Date(cert.earnedAt).toLocaleDateString('uz-UZ')}</span></div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <span className="text-[9px] font-mono text-white/25">{cert.certId}</span>
                <button
                  onClick={() => setSelectedCert(cert)}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-xs transition-all"
                >
                  Ko&apos;rish & Chop Etish
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Certificate View/Print Modal */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 overflow-y-auto">
          <div className="w-full max-w-xl my-auto">
            {/* Certificate Card */}
            <div
              id="certificateFrame"
              className="bg-[#FFFDF5] rounded-3xl overflow-hidden shadow-2xl"
              style={{ border: '10px solid #FFB100', fontFamily: 'Georgia, serif' }}
            >
              {/* Top gold band */}
              <div className="bg-gradient-to-r from-amber-500 to-orange-500 px-8 py-4 flex items-center justify-between">
                <span className="text-white font-black text-lg tracking-tight">🎈 MT-Vocab Platform</span>
                <span className="bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> VERIFIED
                </span>
              </div>

              <div className="px-10 py-10 text-center text-gray-900">
                <div className="text-6xl mb-4">🏆</div>
                <h2 className="text-3xl font-black text-amber-700 tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                  CERTIFICATE OF ACHIEVEMENT
                </h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mt-1 mb-8">
                  SmartLex Vocabulary Mastery
                </p>

                <p className="text-sm text-gray-500">Ushbu sertifikat takdim etiladi:</p>
                <h3 className="text-4xl font-black text-gray-950 mt-2 mb-1">{selectedCert.studentName}</h3>
                <p className="text-sm text-gray-500 mb-8">{selectedCert.groupName} guruhi o&apos;quvchisi</p>

                <p className="text-sm text-gray-500">Muvaffaqiyatli o&apos;zlashtirilgan bo&apos;lim:</p>
                <h4 className="text-2xl font-black text-indigo-900 mt-1 mb-1">{selectedCert.unitTitle}</h4>
                <p className="text-xs text-gray-500 mb-8">Mas&apos;ul ustoz: <strong>{selectedCert.teacherName}</strong></p>

                <div className="border-t border-gray-200 pt-5 flex items-center justify-between text-left">
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>Sertifikat ID: <strong className="font-mono text-gray-700 text-[10px]">{selectedCert.certId}</strong></p>
                    <p>Sana: <strong>{new Date(selectedCert.earnedAt).toLocaleDateString('uz-UZ')}</strong></p>
                  </div>
                  <QrCode className="w-14 h-14 text-gray-300" />
                </div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-sm flex items-center justify-center gap-2 transition-all border border-white/10"
              >
                <Printer className="w-4 h-4" />
                Chop etish (Print)
              </button>
              <button
                onClick={() => setSelectedCert(null)}
                className="flex-1 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-gray-950 font-black text-sm transition-all"
              >
                Yopish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
