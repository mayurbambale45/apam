import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, FileText, ClipboardCheck, Clock, Users, AlertTriangle,
    CheckCircle2, ArrowRight, Zap, UploadCloud, BarChart3, Loader2,
    TrendingUp, Pen
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const TeacherDashboard = () => {
    const { user } = useContext(AuthContext);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await api.get('/api/dashboard/teacher/stats');
            setStats(response.data);
        } catch (err) {
            console.error('Failed to fetch teacher stats:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const metricsCards = stats ? [
        { title: "My Exams", value: stats.myExams, icon: BookOpen, lightBg: "bg-blue-50", lightText: "text-blue-600" },
        { title: "Total Submissions", value: stats.totalSubmissions, icon: FileText, lightBg: "bg-indigo-50", lightText: "text-indigo-600" },
        { title: "Graded", value: stats.gradedSubmissions, icon: CheckCircle2, lightBg: "bg-emerald-50", lightText: "text-emerald-600" },
        { title: "Pending Evaluation", value: stats.pendingSubmissions, icon: Clock, lightBg: "bg-amber-50", lightText: "text-amber-600" },
        { title: "Rubrics Created", value: stats.myRubrics, icon: ClipboardCheck, lightBg: "bg-violet-50", lightText: "text-violet-600" },
        { title: "Flagged for Review", value: stats.flaggedReviews, icon: AlertTriangle, lightBg: "bg-red-50", lightText: "text-red-600" },
    ] : [];

    const quickActions = [
        { label: "Create Exam", desc: "Define a new examination session", icon: BookOpen, path: "/instructor/exams", gradient: "from-blue-600 to-indigo-600" },
        { label: "Upload Answer Key", desc: "Upload model answer PDF", icon: UploadCloud, path: "/instructor/answer-key", gradient: "from-violet-600 to-purple-600" },
        { label: "Configure Rubric", desc: "Build grading criteria for AI", icon: Pen, path: "/instructor/rubrics", gradient: "from-cyan-600 to-teal-600" },
        { label: "View Submissions", desc: "Track student answer scripts", icon: FileText, path: "/instructor/submissions", gradient: "from-emerald-600 to-green-600" },
        { label: "Review Evaluations", desc: "View AI grades & override", icon: BarChart3, path: "/instructor/evaluations", gradient: "from-orange-500 to-red-500" },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-blue-700 via-indigo-700 to-violet-800 rounded-3xl p-8 md:p-10 text-white shadow-2xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4aDEydjEySDE4eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                                <BookOpen size={24} className="text-blue-200" />
                            </div>
                            <span className="px-3 py-1 bg-blue-500/30 text-blue-200 text-xs font-bold rounded-full uppercase tracking-wider border border-blue-400/30">
                                Instructor
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight">Welcome, {user?.full_name?.split(' ')[0]}</h1>
                        <p className="text-blue-200 mt-2 max-w-lg">Your teaching control center — manage exams, configure AI rubrics, review and override grading results.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <div className="text-xs text-blue-300 uppercase tracking-wider">Grading Engine</div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-sm font-semibold text-green-300">AI Ready</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 animate-pulse transition-colors">
                            <div className="h-10 w-10 bg-gray-100 dark:bg-slate-700 rounded-xl mb-3"></div>
                            <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-16 mb-2"></div>
                            <div className="h-7 bg-gray-100 dark:bg-slate-700 rounded w-12"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {metricsCards.map((metric, index) => (
                        <div key={index} className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default">
                            <div className={`p-2.5 rounded-xl ${metric.lightBg} dark:bg-opacity-10 ${metric.lightText} w-fit mb-3 group-hover:scale-110 transition-transform duration-300`}>
                                <metric.icon size={20} />
                            </div>
                            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{metric.title}</p>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{metric.value}</h3>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <Zap size={18} className="text-amber-500" /> Teaching Workflow
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => navigate(action.path)}
                            className="group relative overflow-hidden bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 text-left hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                            <div className="relative z-10">
                                <div className="p-2.5 bg-gray-100 dark:bg-slate-700 group-hover:bg-white/20 rounded-xl w-fit mb-3 transition-colors duration-300">
                                    <action.icon size={20} className="text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors duration-300" />
                                </div>
                                <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-white transition-colors duration-300">{action.label}</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white/70 mt-1 transition-colors duration-300">{action.desc}</p>
                                <ArrowRight size={14} className="mt-2 text-gray-300 dark:text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Evaluations Feed */}
            {stats?.recentEvaluations?.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/80 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <TrendingUp size={16} className="text-emerald-500" /> Recent AI Evaluations
                        </h3>
                        <button onClick={() => navigate('/instructor/evaluations')} className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline">View All →</button>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                        {stats.recentEvaluations.map((e, i) => (
                            <div key={i} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-slate-700/50 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                        e.confidence_flag ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400'
                                    }`}>
                                        {e.confidence_flag ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{e.student_name}</p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{e.course_code} — {e.exam_name}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 flex-shrink-0">
                                    <span className="text-lg font-black text-gray-900 dark:text-white">{e.total_score}</span>
                                    {e.confidence_flag && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">Review</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherDashboard;
