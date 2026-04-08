import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    GraduationCap, FileText, CheckCircle2, Clock, BarChart3, TrendingUp,
    BookOpen, ArrowRight, AlertTriangle, Loader2, User, Hash, Building2, Calendar
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const StudentDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [exams, setExams] = useState([]);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLoadingExams, setIsLoadingExams] = useState(true);

    useEffect(() => {
        fetchProfile();
        fetchStats();
        fetchExams();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/api/dashboard/student/profile');
            setProfile(res.data);
        } catch (err) { console.error(err); }
        finally { setIsLoadingProfile(false); }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/api/dashboard/student/stats');
            setStats(res.data);
        } catch (err) { console.error(err); }
        finally { setIsLoadingStats(false); }
    };

    const fetchExams = async () => {
        try {
            const res = await api.get('/api/dashboard/student/my-exams');
            setExams(res.data);
        } catch (err) { console.error(err); }
        finally { setIsLoadingExams(false); }
    };

    const metricsCards = stats ? [
        { title: "Total Exams Attempted", value: stats.totalSubmissions, icon: FileText, lightBg: "bg-blue-50", lightText: "text-blue-600" },
        { title: "Results Declared", value: stats.gradedSubmissions, icon: CheckCircle2, lightBg: "bg-emerald-50", lightText: "text-emerald-600" },
        { title: "Awaiting Evaluation", value: stats.pendingSubmissions, icon: Clock, lightBg: "bg-amber-50", lightText: "text-amber-600" },
        { title: "Average Score", value: stats.averageScore, icon: TrendingUp, lightBg: "bg-violet-50", lightText: "text-violet-600" },
    ] : [];

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* Hero — WCE Sangli Student Identity Card  */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-700 via-emerald-600 to-teal-700 rounded-3xl p-8 md:p-10 text-white shadow-2xl">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4aDEydjEySDE4eiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="p-2.5 bg-white/10 backdrop-blur-sm rounded-xl border border-white/10">
                                <GraduationCap size={24} className="text-emerald-200" />
                            </div>
                            <span className="px-3 py-1 bg-emerald-500/30 text-emerald-200 text-xs font-bold rounded-full uppercase tracking-wider border border-emerald-400/30">
                                Student
                            </span>
                        </div>
                        <h1 className="text-3xl md:text-4xl font-black tracking-tight">Welcome, {user?.full_name?.split(' ')[0]}</h1>
                        <p className="text-emerald-200 mt-2 max-w-lg">Walchand College of Engineering, Sangli — Academic Paper Assessment & Management System</p>
                    </div>

                    {/* PRN Identity Card */}
                    {!isLoadingProfile && profile && (
                        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/15 min-w-[240px]">
                            <div className="text-[10px] text-emerald-300 uppercase tracking-wider font-bold mb-3">Student Identity</div>
                            <div className="space-y-2.5">
                                <div className="flex items-center gap-2.5">
                                    <Hash size={14} className="text-emerald-300 flex-shrink-0" />
                                    <div>
                                        <div className="text-[10px] text-emerald-300 uppercase tracking-wider">PRN Number</div>
                                        <div className="text-lg font-black font-mono tracking-wider">{profile.prn_number || '—'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <User size={14} className="text-emerald-300 flex-shrink-0" />
                                    <div>
                                        <div className="text-[10px] text-emerald-300 uppercase tracking-wider">Roll Number</div>
                                        <div className="text-sm font-semibold">{profile.roll_number || '—'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Building2 size={14} className="text-emerald-300 flex-shrink-0" />
                                    <div>
                                        <div className="text-[10px] text-emerald-300 uppercase tracking-wider">Department</div>
                                        <div className="text-sm font-semibold">{profile.department || '—'}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5">
                                    <Calendar size={14} className="text-emerald-300 flex-shrink-0" />
                                    <div>
                                        <div className="text-[10px] text-emerald-300 uppercase tracking-wider">Year</div>
                                        <div className="text-sm font-semibold">{profile.year || '—'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Metrics */}
            {isLoadingStats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 animate-pulse">
                            <div className="h-10 w-10 bg-gray-100 dark:bg-slate-700 rounded-xl mb-3"></div>
                            <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded w-20 mb-2"></div>
                            <div className="h-7 bg-gray-100 dark:bg-slate-700 rounded w-12"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {metricsCards.map((metric, index) => (
                        <div key={index} className="group bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-5 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-default">
                            <div className={`p-2.5 rounded-xl ${metric.lightBg} ${metric.lightText} dark:bg-opacity-20 w-fit mb-3 group-hover:scale-110 transition-transform duration-300`}>
                                <metric.icon size={20} />
                            </div>
                            <p className="text-[11px] font-bold text-gray-400 dark:text-gray-400 uppercase tracking-wider">{metric.title}</p>
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-0.5">{metric.value}</h3>
                        </div>
                    ))}
                </div>
            )}

            {/* Exam Submissions Grid */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <BookOpen size={18} className="text-emerald-500" /> My Exam Submissions
                    </h2>
                    <button onClick={() => navigate('/student/submissions')} className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold hover:underline flex items-center gap-1">
                        View All <ArrowRight size={14} />
                    </button>
                </div>

                {isLoadingExams ? (
                    <div className="p-12 text-center text-gray-400 dark:text-gray-500"><Loader2 className="animate-spin inline-block mr-2" size={20} />Loading your exams...</div>
                ) : exams.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 p-12 text-center rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700">
                        <FileText size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">No Submissions Yet</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm">Your answer scripts will appear here once uploaded by the Examination Cell.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                        {exams.map((exam, index) => {
                            const isGraded = exam.status === 'graded';

                            return (
                                <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                                    <div className="p-6 flex-1">
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                                <BookOpen size={12} /> {exam.courseCode}
                                            </span>
                                            {isGraded ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                                                    <CheckCircle2 size={12} /> Graded
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                                                    <Clock size={12} /> Pending
                                                </span>
                                            )}
                                        </div>

                                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">{exam.examName}</h3>

                                        {isGraded && (
                                            <div className="mt-5 pt-4 border-t border-gray-100 dark:border-slate-700 flex items-end justify-between">
                                                <div>
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider font-bold">Final Score</span>
                                                    <p className="text-3xl font-black text-gray-900 dark:text-white">{exam.totalScore}</p>
                                                </div>
                                                <BarChart3 size={28} className="text-emerald-200 dark:text-emerald-800" />
                                            </div>
                                        )}
                                    </div>

                                    <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 px-6 py-3.5">
                                        {isGraded && exam.evaluationId ? (
                                            <button
                                                onClick={() => navigate('/student/submissions', { state: { viewEvalId: exam.evaluationId, examDetails: exam } })}
                                                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-800/50 transition-colors"
                                            >
                                                View Detailed AI Feedback
                                            </button>
                                        ) : (
                                            <div className="text-center text-sm font-medium text-gray-400 py-1.5 flex items-center justify-center gap-2">
                                                <Clock size={14} /> Evaluation in progress...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
