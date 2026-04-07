import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    BookOpen, Users, ClipboardCheck, Clock, Shield, UserCheck, FileText,
    Loader2, TrendingUp, Activity, ArrowRight, Zap, GraduationCap,
    BarChart3, AlertTriangle, CheckCircle2
} from 'lucide-react';
import api from '../../utils/api';

const AdminDashboard = () => {
    const [metrics, setMetrics] = useState(null);
    const [activity, setActivity] = useState({ recentSubmissions: [], recentEvaluations: [] });
    const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
    const [isLoadingActivity, setIsLoadingActivity] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchMetrics();
        fetchActivity();
    }, []);

    const fetchMetrics = async () => {
        try {
            const response = await api.get('/api/dashboard/admin/stats');
            setMetrics(response.data);
        } catch (err) {
            console.error('Failed to fetch admin metrics:', err);
        } finally {
            setIsLoadingMetrics(false);
        }
    };

    const fetchActivity = async () => {
        try {
            const response = await api.get('/api/admin/activity');
            setActivity(response.data);
        } catch (err) {
            console.error('Failed to fetch activity:', err);
        } finally {
            setIsLoadingActivity(false);
        }
    };

    const metricsCards = metrics ? [
        { title: "Total Exams", value: metrics.totalExams, icon: BookOpen, color: "from-blue-500 to-blue-600", lightBg: "bg-blue-50", lightText: "text-blue-600" },
        { title: "Total Students", value: metrics.totalStudents, icon: GraduationCap, color: "from-emerald-500 to-emerald-600", lightBg: "bg-emerald-50", lightText: "text-emerald-600" },
        { title: "Instructors", value: metrics.totalInstructors, icon: UserCheck, color: "from-violet-500 to-violet-600", lightBg: "bg-violet-50", lightText: "text-violet-600" },
        { title: "Submissions", value: metrics.totalSubmissions, icon: FileText, color: "from-indigo-500 to-indigo-600", lightBg: "bg-indigo-50", lightText: "text-indigo-600" },
        { title: "Evaluations", value: metrics.totalEvaluations, icon: ClipboardCheck, color: "from-cyan-500 to-cyan-600", lightBg: "bg-cyan-50", lightText: "text-cyan-600" },
        { title: "Pending", value: metrics.pendingEvaluations, icon: Clock, color: "from-amber-500 to-amber-600", lightBg: "bg-amber-50", lightText: "text-amber-600" },
    ] : [];

    const quickActions = [
        { label: "Manage Users", desc: "Create, edit & delete users", icon: Users, path: "/admin/users", gradient: "from-blue-600 to-indigo-600" },
        { label: "Manage Exams", desc: "Control all examinations", icon: BookOpen, path: "/admin/exams", gradient: "from-violet-600 to-purple-600" },
        { label: "Submissions", desc: "Upload & track submissions", icon: FileText, path: "/admin/submissions", gradient: "from-emerald-600 to-teal-600" },
        { label: "View Evaluations", desc: "Review AI grading results", icon: BarChart3, path: "/admin/evaluations", gradient: "from-orange-500 to-red-500" },
    ];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Hero Header */}
            <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 md:p-10 text-white shadow-2xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4aDEydjEySDE4eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                                <Shield size={24} className="text-red-400" />
                            </div>
                            <span className="px-3 py-1 bg-red-500/20 text-red-300 text-xs font-bold rounded-full uppercase tracking-wider border border-red-500/30">
                                Administrator
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight">System Control Center</h1>
                        <p className="text-gray-400 mt-2 max-w-lg">Walchand College of Engineering, Sangli — Full administrative authority over the Academic Paper Assessment & Management System.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right hidden md:block">
                            <div className="text-xs text-gray-500 uppercase tracking-wider">System Status</div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-sm font-semibold text-green-400">All Systems Operational</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            {isLoadingMetrics ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {[1,2,3,4,5,6].map(i => (
                        <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse">
                            <div className="h-10 w-10 bg-gray-100 rounded-xl mb-3"></div>
                            <div className="h-3 bg-gray-100 rounded w-16 mb-2"></div>
                            <div className="h-7 bg-gray-100 rounded w-12"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {metricsCards.map((metric, index) => (
                        <div key={index} className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default">
                            <div className={`p-2.5 rounded-xl ${metric.lightBg} ${metric.lightText} w-fit mb-3 group-hover:scale-110 transition-transform duration-300`}>
                                <metric.icon size={20} />
                            </div>
                            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">{metric.title}</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-0.5">{metric.value}</h3>
                        </div>
                    ))}
                </div>
            )}

            {/* Quick Actions */}
            <div>
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Zap size={18} className="text-amber-500" /> Quick Actions
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {quickActions.map((action, i) => (
                        <button
                            key={i}
                            onClick={() => navigate(action.path)}
                            className="group relative overflow-hidden bg-white border border-gray-200 rounded-2xl p-6 text-left hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                        >
                            <div className={`absolute inset-0 bg-gradient-to-br ${action.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`}></div>
                            <div className="relative z-10">
                                <div className="p-3 bg-gray-100 group-hover:bg-white/20 rounded-xl w-fit mb-4 transition-colors duration-300">
                                    <action.icon size={22} className="text-gray-700 group-hover:text-white transition-colors duration-300" />
                                </div>
                                <h3 className="font-bold text-gray-900 group-hover:text-white transition-colors duration-300">{action.label}</h3>
                                <p className="text-sm text-gray-500 group-hover:text-white/70 mt-1 transition-colors duration-300">{action.desc}</p>
                                <ArrowRight size={16} className="mt-3 text-gray-300 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Recent Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recent Submissions */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <FileText size={16} className="text-blue-500" /> Recent Submissions
                        </h3>
                        <span className="text-xs text-gray-400 font-medium">Latest 8</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {isLoadingActivity ? (
                            <div className="p-8 text-center text-gray-400"><Loader2 className="animate-spin inline-block mr-2" size={18} />Loading...</div>
                        ) : activity.recentSubmissions.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 italic">No submissions yet.</div>
                        ) : (
                            activity.recentSubmissions.map((s, i) => (
                                <div key={i} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                                            {s.student_name?.split(' ').map(n => n[0]).join('').substring(0,2)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{s.student_name}</p>
                                            <p className="text-xs text-gray-400 truncate">{s.course_code} — {s.exam_name}</p>
                                        </div>
                                    </div>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${
                                        s.status === 'graded' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                        {s.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Recent Evaluations */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                            <Activity size={16} className="text-emerald-500" /> Recent Evaluations
                        </h3>
                        <span className="text-xs text-gray-400 font-medium">Latest 8</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                        {isLoadingActivity ? (
                            <div className="p-8 text-center text-gray-400"><Loader2 className="animate-spin inline-block mr-2" size={18} />Loading...</div>
                        ) : activity.recentEvaluations.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 italic">No evaluations yet.</div>
                        ) : (
                            activity.recentEvaluations.map((e, i) => (
                                <div key={i} className="px-6 py-3.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                            e.confidence_flag ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                                        }`}>
                                            {e.confidence_flag ? <AlertTriangle size={14} /> : <CheckCircle2 size={14} />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-semibold text-gray-900 truncate">{e.student_name}</p>
                                            <p className="text-xs text-gray-400 truncate">{e.course_code} — {e.exam_name}</p>
                                        </div>
                                    </div>
                                    <span className="text-lg font-black text-gray-900 flex-shrink-0">{e.total_score}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
