import React, { forwardRef } from 'react';

interface StudentResult {
    name: string;
    correctCount: number;
    wrongCount: number;
    accuracy: number;
    wrongWords: string[]; // List of words they got wrong
}

interface ReportInfographicProps {
    groupName: string;
    date: string;
    totalStudents: number;
    passCount: number;
    failCount: number;
    avgScore: number;
    highestScore: number;
    lowestScore: number;
    completionPercent: number;
    top3: StudentResult[];
    smartCard: StudentResult[];
    needsPractice: StudentResult[];
    notCompleted: StudentResult[];
    studentResults: StudentResult[];
    difficultWords: { word: string; count: number }[];
}

const ReportInfographic = forwardRef<HTMLDivElement, ReportInfographicProps>(({
    groupName,
    date,
    totalStudents,
    passCount,
    failCount,
    avgScore,
    highestScore,
    lowestScore,
    completionPercent,
    top3,
    smartCard,
    needsPractice,
    notCompleted,
    studentResults,
    difficultWords,
}, ref) => {
    return (
        <div 
            ref={ref} 
            className="w-[1080px] bg-slate-950 text-white font-sans flex flex-col p-12 relative overflow-hidden"
            style={{ 
                minHeight: '1920px', 
                background: 'linear-gradient(180deg, #020617 0%, #0f172a 100%)',
                // Pre-render font handling for html2canvas compatibility
                fontFamily: 'system-ui, -apple-system, sans-serif'
            }}
        >
            {/* Background Effects */}
            <div className="absolute top-0 inset-x-0 h-[600px] bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-transparent blur-3xl pointer-events-none" />
            <div className="absolute inset-0 bg-[url('/img/grid.svg')] opacity-10 pointer-events-none" />

            {/* Header */}
            <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-8 mb-12">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20">
                        <span className="text-4xl font-black text-white uppercase tracking-tighter">MT</span>
                    </div>
                    <div>
                        <h1 className="text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400">
                            Vocabulary Report
                        </h1>
                        <p className="text-xl text-indigo-400 font-bold mt-2 uppercase tracking-widest">
                            MT-VOCAB PLATFORM
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 mb-3 inline-block">
                        <p className="text-sm font-bold text-white/50 uppercase tracking-widest mb-1">Date</p>
                        <p className="text-2xl font-black text-white">{date}</p>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-white/50 uppercase tracking-widest mb-1">Group</p>
                        <p className="text-2xl font-black text-indigo-300">{groupName}</p>
                    </div>
                </div>
            </div>

            {/* Top Statistics */}
            <div className="relative z-10 grid grid-cols-5 gap-4 mb-16">
                {[
                    { label: 'Total Students', value: totalStudents },
                    { label: 'Completed', value: `${completionPercent}%` },
                    { label: 'Avg Score', value: `${avgScore}%` },
                    { label: 'Highest', value: `${highestScore}%` },
                    { label: 'Lowest', value: `${lowestScore}%` },
                ].map((stat, i) => (
                    <div key={i} className="bg-slate-900/80 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center shadow-2xl">
                        <p className="text-xs font-black text-white/40 uppercase tracking-widest mb-2">{stat.label}</p>
                        <p className="text-3xl font-black text-white">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Top 3 Podium */}
            {top3.length > 0 && (
                <div className="relative z-10 mb-20 bg-slate-900/50 backdrop-blur-md rounded-3xl border border-white/5 p-12">
                    <h2 className="text-2xl font-black uppercase tracking-widest text-white/80 text-center mb-16">Top 3 Students</h2>
                    <div className="flex items-end justify-center gap-8 h-64">
                        {/* 2nd Place */}
                        {top3[1] && (
                            <div className="flex flex-col items-center">
                                <div className="mb-4 text-center">
                                    <div className="w-20 h-20 bg-slate-200 rounded-full border-4 border-slate-300 flex items-center justify-center text-3xl mx-auto mb-3 shadow-[0_0_30px_rgba(203,213,225,0.3)]">🥈</div>
                                    <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                                        <p className="text-white font-black">{top3[1].name}</p>
                                        <p className="text-emerald-400 font-bold text-sm">{top3[1].accuracy}%</p>
                                    </div>
                                </div>
                                <div className="w-32 h-40 bg-gradient-to-t from-slate-800 to-slate-400/20 rounded-t-2xl border-x border-t border-slate-400/30 flex items-start justify-center pt-6">
                                    <span className="text-6xl font-black text-slate-300/40">2</span>
                                </div>
                            </div>
                        )}
                        {/* 1st Place */}
                        {top3[0] && (
                            <div className="flex flex-col items-center relative -mt-12">
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-5xl">👑</div>
                                <div className="mb-4 text-center">
                                    <div className="w-28 h-28 bg-amber-200 rounded-full border-4 border-amber-400 flex items-center justify-center text-5xl mx-auto mb-3 shadow-[0_0_40px_rgba(251,191,36,0.5)]">🥇</div>
                                    <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                                        <p className="text-white font-black text-lg">{top3[0].name}</p>
                                        <p className="text-emerald-400 font-bold text-md">{top3[0].accuracy}%</p>
                                    </div>
                                </div>
                                <div className="w-40 h-56 bg-gradient-to-t from-amber-900/50 to-amber-500/20 rounded-t-2xl border-x border-t border-amber-500/30 flex items-start justify-center pt-8">
                                    <span className="text-8xl font-black text-amber-300/40">1</span>
                                </div>
                            </div>
                        )}
                        {/* 3rd Place */}
                        {top3[2] && (
                            <div className="flex flex-col items-center">
                                <div className="mb-4 text-center">
                                    <div className="w-20 h-20 bg-amber-700 rounded-full border-4 border-amber-600 flex items-center justify-center text-3xl mx-auto mb-3 shadow-[0_0_30px_rgba(180,83,9,0.3)]">🥉</div>
                                    <div className="bg-slate-800 px-4 py-2 rounded-xl border border-slate-700">
                                        <p className="text-white font-black">{top3[2].name}</p>
                                        <p className="text-emerald-400 font-bold text-sm">{top3[2].accuracy}%</p>
                                    </div>
                                </div>
                                <div className="w-32 h-32 bg-gradient-to-t from-slate-800 to-amber-700/20 rounded-t-2xl border-x border-t border-amber-700/30 flex items-start justify-center pt-4">
                                    <span className="text-6xl font-black text-amber-700/40">3</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-3 gap-8 mb-16 relative z-10">
                {/* Smart Card */}
                <div className="bg-emerald-950/40 border border-emerald-500/20 rounded-3xl p-8 backdrop-blur-sm">
                    <h3 className="text-emerald-400 font-black uppercase tracking-widest flex items-center gap-3 mb-6">
                        <span className="text-2xl">🟩</span> Smart Card (&gt;=80%)
                    </h3>
                    <div className="space-y-3">
                        {smartCard.length > 0 ? smartCard.map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-emerald-950/50 p-4 rounded-xl border border-emerald-500/10">
                                <span className="font-bold text-emerald-50">{s.name}</span>
                                <span className="font-black text-emerald-400">{s.accuracy}%</span>
                            </div>
                        )) : (
                            <p className="text-emerald-500/50 font-bold italic">No students</p>
                        )}
                    </div>
                </div>

                {/* Needs Practice */}
                <div className="bg-red-950/40 border border-red-500/20 rounded-3xl p-8 backdrop-blur-sm">
                    <h3 className="text-red-400 font-black uppercase tracking-widest flex items-center gap-3 mb-6">
                        <span className="text-2xl">🟥</span> Needs Practice (&lt;50%)
                    </h3>
                    <div className="space-y-3">
                        {needsPractice.length > 0 ? needsPractice.map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-red-950/50 p-4 rounded-xl border border-red-500/10">
                                <span className="font-bold text-red-50">{s.name}</span>
                                <span className="font-black text-red-400">{s.accuracy}%</span>
                            </div>
                        )) : (
                            <p className="text-red-500/50 font-bold italic">No students</p>
                        )}
                    </div>
                </div>

                {/* Not Completed */}
                <div className="bg-slate-900/60 border border-slate-700 rounded-3xl p-8 backdrop-blur-sm">
                    <h3 className="text-slate-400 font-black uppercase tracking-widest flex items-center gap-3 mb-6">
                        <span className="text-2xl">❌</span> Not Completed
                    </h3>
                    <div className="space-y-3">
                        {notCompleted.length > 0 ? notCompleted.map((s, i) => (
                            <div key={i} className="flex justify-between items-center bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                                <span className="font-bold text-slate-300">{s.name}</span>
                                <span className="font-black text-slate-500">Absent</span>
                            </div>
                        )) : (
                            <p className="text-slate-500/50 font-bold italic">No students</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Most Difficult Words */}
            {difficultWords.length > 0 && (
                <div className="relative z-10 mb-16 bg-gradient-to-r from-indigo-950/50 to-purple-950/50 border border-indigo-500/20 rounded-3xl p-10">
                    <h2 className="text-xl font-black uppercase tracking-widest text-indigo-300 mb-8 flex items-center gap-3">
                        <span className="text-2xl">😖</span> Most Difficult Words
                    </h2>
                    <div className="flex flex-wrap gap-4">
                        {difficultWords.map((dw, i) => (
                            <div key={i} className="bg-slate-900 border border-white/10 px-5 py-3 rounded-2xl flex items-center gap-3 shadow-lg">
                                <span className="font-bold text-white text-lg">{dw.word}</span>
                                <span className="bg-red-500/20 text-red-400 font-black px-3 py-1 rounded-full text-sm">
                                    {dw.count} xato
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Individual Student Results */}
            <div className="relative z-10 flex-1">
                <h2 className="text-2xl font-black uppercase tracking-widest text-white/80 mb-8">Detailed Results</h2>
                <div className="grid grid-cols-2 gap-6">
                    {studentResults.map((s, i) => (
                        <div key={i} className="bg-slate-900/80 backdrop-blur-sm border border-white/10 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center font-black text-indigo-300 text-xl">
                                        {s.name.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <h4 className="font-black text-lg text-white">{s.name}</h4>
                                        <p className="text-sm font-bold text-white/40">
                                            ✅ {s.correctCount} | ❌ {s.wrongCount}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-xl font-black text-lg border ${
                                    s.accuracy >= 80 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    s.accuracy < 50 ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                    'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                }`}>
                                    {s.accuracy}%
                                </div>
                            </div>
                            
                            <div className="bg-black/30 rounded-2xl p-4 min-h-[80px]">
                                <p className="text-xs font-black uppercase tracking-widest text-white/30 mb-2">Wrong Words</p>
                                {s.wrongWords.length === 0 ? (
                                    <p className="text-emerald-400 font-bold">Xato yo'q 🎉</p>
                                ) : (
                                    <p className="text-red-300/80 font-medium text-sm leading-relaxed">
                                        {s.wrongWords.join(', ')}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-16 pt-8 border-t border-white/10 text-center relative z-10 pb-8">
                <p className="font-black uppercase tracking-[0.3em] text-white/30 text-sm">
                    Generated by MT-Vocab Platform
                </p>
            </div>
        </div>
    );
});

ReportInfographic.displayName = 'ReportInfographic';
export default ReportInfographic;
