import React, { useState, useEffect } from 'react';
import { BookOpen, Users, ClipboardCheck, Search, Calendar, CheckCircle2, Clock, AlertCircle, PlayCircle, FileText, Loader2, UploadCloud, Activity, Layers, ArrowRight } from 'lucide-react';
import api from '../../utils/api';
import { useNavigate } from 'react-router-dom';

const ExamCoordinatorDashboard = () => {
    // Real Data State
    const [metrics, setMetrics] = useState(null);
    const [exams, setExams] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Evaluation state mapping exam_id -> evaluating boolean
    const [evaluatingExams, setEvaluatingExams] = useState({});

    useEffect(() => {
        fetchMetrics();
        fetchExams();
    }, []);

    const fetchMetrics = async () => {
        try {
            const response = await api.get('/api/dashboard/admin/stats');
            setMetrics(response.data);
        } catch (err) {
            console.error('Failed to fetch metrics:', err);
        } finally {
            setIsLoadingMetrics(false);
        }
    };

    const fetchExams = async () => {
        try {
            const response = await api.get('/api/dashboard/coordinator/exams');
            setExams(response.data);
        } catch (err) {
            console.error('Failed to fetch exams:', err);
            setError(err.response?.data?.error || 'Failed to load examination data.');
        } finally {
            setIsLoadingExams(false);
        }
    };

    const handleTriggerEvaluation = async (examId) => {
        if (!confirm(`Are you sure you want to trigger AI evaluation for ALL pending submissions in Exam #${examId}? This consumes API credits.`)) return;

        setEvaluatingExams(prev => ({ ...prev, [examId]: true }));
        try {
            const response = await api.post(`/api/evaluate/exam/${examId}`);
            alert(`Evaluation complete!\n${response.data.message}`);
            fetchExams(); // Refresh data
        } catch (err) {
            alert(`Error: ${err.response?.data?.error || err.message}`);
        } finally {
            setEvaluatingExams(prev => ({ ...prev, [examId]: false }));
        }
    };

    // Filtered exams based on search
    const filteredExams = exams.filter(exam => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            exam.courseCode?.toLowerCase().includes(q) ||
            exam.examName?.toLowerCase().includes(q) ||
            exam.instructorName?.toLowerCase().includes(q) ||
            String(exam.id).includes(q)
        );
    });

    const getStatusInfo = (exam) => {
        const total = parseInt(exam.totalSubmissions || 0);
        const graded = parseInt(exam.gradedCount || 0);
        const pending = parseInt(exam.pendingCount || 0);

        if (total === 0) return { label: 'No Submissions', color: 'bg-gray-100 text-gray-600', icon: AlertCircle };
        if (pending === 0 && graded > 0) return { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 };
        if (graded > 0 && pending > 0) return { label: 'Partially Graded', color: 'bg-blue-100 text-blue-700', icon: Clock };
        return { label: 'Pending Evaluation', color: 'bg-amber-100 text-amber-700', icon: AlertCircle };
    };

    const metricsCards = metrics ? [
        { title: "Total Active Exams", value: metrics.totalExams, icon: BookOpen, color: "text-blue-600", bg: "bg-blue-50" },
        { title: "Pending Evaluation", value: metrics.pendingEvaluations, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
        { title: "Registered Instructors", value: metrics.totalInstructors, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
        { title: "Completed Evaluations", value: metrics.totalEvaluations, icon: ClipboardCheck, color: "text-green-600", bg: "bg-green-50" },
    ] : [];

    return (
        <div className="max-w-7xl mx-auto space-y-8">

            {/* Header Section */}
            <div className="bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 rounded-3xl p-8 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
                        <ClipboardCheck size={22} className="text-slate-200" />
                    </div>
                    <span className="px-3 py-1 bg-white/10 text-slate-200 text-xs font-bold rounded-full uppercase tracking-wider border border-slate-400/30">
                        Exam Cell
                    </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight">Examination Hub Overview</h1>
                <p className="text-slate-300 mt-2">WCE Sangli — Global control center for managing all examination cycles.</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { label: 'Bulk Upload Scripts', desc: 'Upload multiple PDFs at once', icon: Layers, path: '/examination_system/bulk-upload', gradient: 'from-teal-600 to-emerald-600' },
                    { label: 'Pipeline Monitor', desc: 'Track evaluation progress live', icon: Activity, path: '/examination_system/pipeline', gradient: 'from-violet-600 to-purple-600' },
                    { label: 'Single Upload', desc: 'Upload one script manually', icon: UploadCloud, path: '/examination_system/uploads', gradient: 'from-blue-600 to-indigo-600' },
                ].map((a, i) => (
                    <button key={i} onClick={() => navigate(a.path)}
                        className="group relative overflow-hidden bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-2xl p-5 text-left shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                        <div className={`absolute inset-0 bg-gradient-to-br ${a.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                        <div className="relative z-10">
                            <div className="p-2.5 bg-gray-100 dark:bg-slate-700 group-hover:bg-white/20 rounded-xl w-fit mb-3 transition-colors duration-300">
                                <a.icon size={20} className="text-gray-700 dark:text-gray-300 group-hover:text-white transition-colors duration-300" />
                            </div>
                            <h3 className="font-bold text-sm text-gray-900 dark:text-white group-hover:text-white transition-colors duration-300">{a.label}</h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400 group-hover:text-white/70 mt-1 transition-colors duration-300">{a.desc}</p>
                            <ArrowRight size={14} className="mt-2 text-gray-300 dark:text-gray-600 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
                        </div>
                    </button>
                ))}
            </div>

            {/* Metrics Top Section */}
            {isLoadingMetrics ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1,2,3,4].map(i => (
                        <div key={i} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 animate-pulse transition-colors">
                            <div className="h-12 bg-gray-100 dark:bg-slate-700 rounded-xl w-12 mb-4"></div>
                            <div className="h-4 bg-gray-100 dark:bg-slate-700 rounded w-24 mb-2"></div>
                            <div className="h-8 bg-gray-100 dark:bg-slate-700 rounded w-16"></div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {metricsCards.map((metric, index) => (
                        <div key={index} className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-6 flex items-center gap-5 transition-transform hover:-translate-y-1 duration-300">
                            <div className={`p-4 rounded-xl ${metric.bg} ${metric.color} dark:bg-opacity-20`}>
                                <metric.icon size={28} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">{metric.title}</p>
                                <h3 className="text-3xl font-black text-gray-900 dark:text-white mt-1">{metric.value}</h3>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Global Exam Management Grid */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 overflow-hidden mt-8 transition-colors">
                <div className="p-6 border-b border-gray-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50 dark:bg-slate-800/50">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Global Examination Records</h3>
                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by Course, ID or Instructor..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>
                </div>

                {error && (
                    <div className="p-4 m-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800/50 text-sm">
                        {error}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 text-gray-500 dark:text-gray-400 text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Exam ID</th>
                                <th className="px-6 py-4 font-semibold">Course Title</th>
                                <th className="px-6 py-4 font-semibold">Assigned Instructor</th>
                                <th className="px-6 py-4 font-semibold text-center">Submissions</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-slate-700/50">
                            {isLoadingExams ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                                    <Loader2 className="animate-spin inline-block mr-2" size={20} /> Loading examination records...
                                </td></tr>
                            ) : filteredExams.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-12 text-center text-gray-500 dark:text-gray-400 italic">
                                    {searchQuery ? 'No exams match your search.' : 'No examination records found.'}
                                </td></tr>
                            ) : (
                                filteredExams.map((exam) => {
                                    const status = getStatusInfo(exam);
                                    const StatusIcon = status.icon;

                                    return (
                                        <tr key={exam.id} className="hover:bg-blue-50/50 dark:hover:bg-slate-700/50 transition-colors group cursor-pointer">
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <div className="font-mono text-sm font-semibold text-gray-900 dark:text-white">#{exam.id}</div>
                                                <div className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1 mt-1">
                                                    <Calendar size={12} /> {new Date(exam.createdAt).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 text-sm font-bold tracking-wide group-hover:bg-blue-100 dark:group-hover:bg-blue-900/40 group-hover:text-blue-800 dark:group-hover:text-blue-300 transition-colors">
                                                    <BookOpen size={14} className="text-blue-500 dark:text-blue-400 text-opacity-70 dark:text-opacity-100"/>
                                                    {exam.courseCode} — {exam.examName}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm">
                                                        {exam.instructorName?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                    </div>
                                                    <span className="font-medium text-gray-700 dark:text-gray-300">{exam.instructorName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">{exam.totalSubmissions}</span>
                                                <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                                    {exam.gradedCount} graded / {exam.pendingCount} pending
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 whitespace-nowrap">
                                                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${status.color} dark:bg-opacity-20`}>
                                                    <StatusIcon size={14} /> {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                <button
                                                    onClick={() => handleTriggerEvaluation(exam.id)}
                                                    disabled={evaluatingExams[exam.id] || parseInt(exam.pendingCount) === 0}
                                                    className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all shadow-sm ${
                                                        evaluatingExams[exam.id]
                                                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 cursor-not-allowed'
                                                            : parseInt(exam.pendingCount) === 0
                                                            ? 'bg-gray-100 text-gray-400 dark:bg-slate-700 dark:text-gray-500 cursor-not-allowed'
                                                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                                                    }`}
                                                >
                                                    {evaluatingExams[exam.id] ? (
                                                        <><div className="animate-spin h-4 w-4 border-2 border-amber-600 dark:border-amber-400 border-t-transparent rounded-full"></div> Processing...</>
                                                    ) : (
                                                        <><PlayCircle size={16} /> Evaluate All</>
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default ExamCoordinatorDashboard;
