import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart3, TrendingUp, TrendingDown, Users, Award, AlertTriangle,
    Loader2, BookOpen, ChevronDown, Target, Zap
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
    RadarChart, PolarGrid, PolarAngleAxis, Radar
} from 'recharts';
import api from '../../utils/api';

const StatCard = ({ icon: Icon, label, value, sub, color = 'blue', trend }) => {
    const colorMap = {
        blue: 'bg-blue-50 text-blue-600',
        green: 'bg-emerald-50 text-emerald-600',
        amber: 'bg-amber-50 text-amber-600',
        red: 'bg-red-50 text-red-600',
        violet: 'bg-violet-50 text-violet-600',
    };
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4">
            <div className={`p-3 rounded-xl flex-shrink-0 ${colorMap[color]}`}>
                <Icon size={20} />
            </div>
            <div className="min-w-0">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</p>
                <p className="text-2xl font-black text-gray-900 mt-0.5">{value ?? '—'}</p>
                {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
            </div>
            {trend !== undefined && (
                <div className={`ml-auto flex-shrink-0 flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg ${trend >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                    {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    {Math.abs(trend)}%
                </div>
            )}
        </div>
    );
};

const TeacherAnalytics = () => {
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [analyticsData, setAnalyticsData] = useState(null);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const res = await api.get('/api/exams');
                setExams(res.data);
            } catch (e) {
                console.error(e);
            } finally {
                setIsLoadingExams(false);
            }
        };
        fetchExams();
    }, []);

    const fetchAnalytics = async (examId) => {
        if (!examId) return;
        setIsLoadingAnalytics(true);
        setError(null);
        setAnalyticsData(null);
        try {
            const res = await api.get(`/api/dashboard/teacher/analytics/${examId}`);
            setAnalyticsData(res.data);
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to load analytics for this exam.');
        } finally {
            setIsLoadingAnalytics(false);
        }
    };

    const scoreDistribution = useMemo(() => {
        if (!analyticsData?.evaluations?.length) return [];
        const buckets = { '0–20': 0, '21–40': 0, '41–60': 0, '61–80': 0, '81–100': 0 };
        analyticsData.evaluations.forEach(e => {
            const s = parseFloat(e.total_score);
            if (s <= 20) buckets['0–20']++;
            else if (s <= 40) buckets['21–40']++;
            else if (s <= 60) buckets['41–60']++;
            else if (s <= 80) buckets['61–80']++;
            else buckets['81–100']++;
        });
        return Object.entries(buckets).map(([name, count]) => ({ name, count }));
    }, [analyticsData]);

    const COLORS = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6'];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Page Header */}
            <div className="bg-gradient-to-br from-indigo-700 via-purple-700 to-violet-800 rounded-3xl p-8 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
                        <BarChart3 size={22} className="text-purple-200" />
                    </div>
                    <span className="px-3 py-1 bg-white/10 text-purple-200 text-xs font-bold rounded-full uppercase tracking-wider border border-purple-400/30">
                        Analytics
                    </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight">Exam Analytics</h1>
                <p className="text-purple-200 mt-2 max-w-xl">
                    Deep-dive into exam-level performance — score distributions, top performers, and problem questions.
                </p>
            </div>

            {/* Exam Selector */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">Select Exam to Analyze</label>
                {isLoadingExams ? (
                    <div className="text-gray-400 text-sm flex items-center gap-2">
                        <Loader2 className="animate-spin" size={16} /> Loading exams...
                    </div>
                ) : (
                    <div className="relative max-w-xl">
                        <select
                            value={selectedExamId}
                            onChange={e => { setSelectedExamId(e.target.value); fetchAnalytics(e.target.value); }}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500 text-sm transition-all appearance-none pr-10"
                        >
                            <option value="">— Choose an exam —</option>
                            {exams.map(exam => (
                                <option key={exam.id} value={exam.id}>
                                    #{exam.id} — {exam.course_code} — {exam.exam_name}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>
                )}
            </div>

            {/* Loading State */}
            {isLoadingAnalytics && (
                <div className="flex items-center justify-center py-20 text-gray-400">
                    <Loader2 className="animate-spin mr-3" size={24} /> Fetching analytics...
                </div>
            )}

            {/* Error State */}
            {error && !isLoadingAnalytics && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-4 flex items-center gap-2">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Analytics Content */}
            {analyticsData && !isLoadingAnalytics && (
                <>
                    {/* Summary Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard icon={Users} label="Total Students" value={analyticsData.totalStudents} color="blue" />
                        <StatCard icon={BarChart3} label="Average Score" value={analyticsData.avgScore} color="violet" />
                        <StatCard icon={Award} label="Highest Score" value={analyticsData.highScore} color="green" />
                        <StatCard icon={TrendingDown} label="Lowest Score" value={analyticsData.lowScore} color="red" />
                        <StatCard icon={AlertTriangle} label="Flagged Papers" value={analyticsData.flaggedCount} sub="Need human review" color="amber" />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Score Distribution Bar Chart */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <BarChart3 size={18} className="text-indigo-500" /> Score Distribution
                            </h3>
                            <p className="text-xs text-gray-400 mb-6">Number of students in each score band</p>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={scoreDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
                                        <Tooltip
                                            cursor={{ fill: '#F3F4F6' }}
                                            contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            formatter={(v) => [`${v} students`, 'Count']}
                                        />
                                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                                            {scoreDistribution.map((_, i) => (
                                                <Cell key={i} fill={COLORS[i % COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Top Performers */}
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <Award size={18} className="text-amber-500" /> Top Performers
                            </h3>
                            <p className="text-xs text-gray-400 mb-4">Top 5 students by total score</p>
                            <div className="space-y-3">
                                {analyticsData.topPerformers?.length === 0 && (
                                    <p className="text-sm text-gray-400 italic">No evaluated submissions yet.</p>
                                )}
                                {analyticsData.topPerformers?.map((s, i) => (
                                    <div key={i} className="flex items-center gap-3">
                                        <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${
                                            i === 0 ? 'bg-amber-100 text-amber-700' :
                                            i === 1 ? 'bg-gray-100 text-gray-600' :
                                            i === 2 ? 'bg-orange-100 text-orange-700' :
                                            'bg-gray-50 text-gray-500'
                                        }`}>{i + 1}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{s.student_name}</p>
                                            <p className="text-xs text-gray-400 truncate">{s.department} · {s.prn_number}</p>
                                        </div>
                                        <span className="text-lg font-black text-gray-900 flex-shrink-0">{s.total_score}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Weak Questions */}
                    {analyticsData.questionStats?.length > 0 && (
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                            <h3 className="font-bold text-gray-900 mb-1 flex items-center gap-2">
                                <Target size={18} className="text-red-500" /> Question-wise Performance
                            </h3>
                            <p className="text-xs text-gray-400 mb-5">Average score per question vs maximum marks. Low ratios indicate weak areas.</p>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                                            <th className="pb-3 pr-6">Question</th>
                                            <th className="pb-3 pr-6 text-center">Max Marks</th>
                                            <th className="pb-3 pr-6 text-center">Avg Score</th>
                                            <th className="pb-3">Performance</th>
                                            <th className="pb-3 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {analyticsData.questionStats.map((q, i) => {
                                            const ratio = q.max_marks > 0 ? (q.avg_score / q.max_marks) * 100 : 0;
                                            const isWeak = ratio < 50;
                                            const barColor = ratio >= 75 ? 'bg-emerald-500' : ratio >= 50 ? 'bg-amber-400' : 'bg-red-500';
                                            return (
                                                <tr key={i} className={`transition-colors ${isWeak ? 'bg-red-50/30' : ''}`}>
                                                    <td className="py-3 pr-6">
                                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-lg">
                                                            Q{q.question_number}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 pr-6 text-center font-bold text-gray-700">{q.max_marks}</td>
                                                    <td className="py-3 pr-6 text-center font-black text-gray-900">{parseFloat(q.avg_score).toFixed(1)}</td>
                                                    <td className="py-3 pr-6">
                                                        <div className="flex items-center gap-2">
                                                            <div className="flex-1 bg-gray-100 rounded-full h-2 max-w-[120px]">
                                                                <div className={`h-2 rounded-full ${barColor} transition-all duration-500`}
                                                                    style={{ width: `${Math.round(ratio)}%` }} />
                                                            </div>
                                                            <span className="text-xs font-semibold text-gray-500 w-8">{Math.round(ratio)}%</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 text-right">
                                                        {isWeak ? (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-red-100 text-red-700">
                                                                <AlertTriangle size={10} /> Weak Area
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                                                <Zap size={10} /> Good
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Grievance Summary */}
                    {analyticsData.grievanceSummary !== undefined && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center gap-4">
                            <div className="p-3 bg-amber-100 rounded-xl text-amber-600">
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <p className="font-bold text-amber-900">Grievances Raised: {analyticsData.grievanceSummary}</p>
                                <p className="text-xs text-amber-700 mt-0.5">Students who disputed the AI evaluation results for this exam.</p>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default TeacherAnalytics;
