import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import {
    FileText, CheckCircle2, Clock, BarChart3, Eye, X,
    ChevronLeft, GraduationCap, BookOpen, AlertTriangle, Loader2, Search
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';
import FeedbackViewer from '../../components/student/FeedbackViewer';

const StudentSubmissions = () => {
    const { user } = useContext(AuthContext);
    const location = useLocation();
    const [exams, setExams] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Detail View
    const [activeEvaluationId, setActiveEvaluationId] = useState(null);
    const [activeExamDetails, setActiveExamDetails] = useState(null);

    useEffect(() => {
        const fetchMyExams = async () => {
            try {
                const res = await api.get('/api/dashboard/student/my-exams');
                setExams(res.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load your submissions.');
            } finally {
                setIsLoading(false);
            }
        };
        fetchMyExams();
    }, []);

    // Handle deep-link from dashboard
    useEffect(() => {
        if (location.state?.viewEvalId) {
            setActiveEvaluationId(location.state.viewEvalId);
            setActiveExamDetails(location.state.examDetails);
        }
    }, [location.state]);

    const handleViewFeedback = (exam) => {
        setActiveEvaluationId(exam.evaluationId);
        setActiveExamDetails(exam);
    };

    const handleCloseFeedback = () => {
        setActiveEvaluationId(null);
        setActiveExamDetails(null);
    };

    const gradedCount = exams.filter(e => e.status === 'graded').length;
    const pendingCount = exams.filter(e => e.status !== 'graded').length;

    if (activeEvaluationId) {
        return (
            <div className="max-w-5xl mx-auto space-y-6">
                <button onClick={handleCloseFeedback}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <ChevronLeft size={16} /> Back to My Submissions
                </button>

                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
                    {/* Exam Header */}
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 md:p-8">
                        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                            <div>
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 text-white text-[10px] font-bold rounded-full uppercase tracking-wider mb-3">
                                    <BookOpen size={12} /> {activeExamDetails?.courseCode}
                                </span>
                                <h2 className="text-3xl font-black">{activeExamDetails?.examName}</h2>
                                <p className="text-emerald-200 mt-1 flex items-center gap-2">
                                    <CheckCircle2 size={16} /> Official AI Evaluation Report
                                </p>
                            </div>
                            <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 text-center min-w-[120px]">
                                <p className="text-emerald-200 text-[10px] font-bold uppercase tracking-wider mb-1">Total Score</p>
                                <p className="text-4xl font-black">{activeExamDetails?.totalScore}</p>
                            </div>
                        </div>
                    </div>

                    {/* Feedback Content */}
                    <div className="p-4 md:p-6 bg-gray-50">
                        <FeedbackViewer evaluationId={activeEvaluationId} hideBackButton={true} />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <FileText className="text-emerald-500" size={28} /> My Submissions
                </h2>
                <p className="text-gray-500 mt-1">All your exam answer scripts and AI evaluation results.</p>
            </div>

            {/* Stats Bar */}
            {!isLoading && exams.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    <div className="bg-white border border-gray-200 px-5 py-3 rounded-2xl flex items-center gap-3">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><FileText size={16} /></div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
                            <p className="text-lg font-black text-gray-900">{exams.length}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 px-5 py-3 rounded-2xl flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><CheckCircle2 size={16} /></div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Graded</p>
                            <p className="text-lg font-black text-gray-900">{gradedCount}</p>
                        </div>
                    </div>
                    <div className="bg-white border border-gray-200 px-5 py-3 rounded-2xl flex items-center gap-3">
                        <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Clock size={16} /></div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending</p>
                            <p className="text-lg font-black text-gray-900">{pendingCount}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 flex items-center gap-2">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Submissions Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Course</th>
                                <th className="px-6 py-4 font-semibold">Exam Title</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-center">Score</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan="5" className="px-6 py-16 text-center text-gray-400">
                                    <Loader2 className="animate-spin inline-block mr-2" size={20} />Loading your submissions...
                                </td></tr>
                            ) : exams.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-16 text-center">
                                    <FileText size={40} className="mx-auto text-gray-300 mb-3" />
                                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Submissions Yet</h3>
                                    <p className="text-sm text-gray-400">Your answer scripts will appear here once uploaded by the Examination Cell of WCE Sangli.</p>
                                </td></tr>
                            ) : (
                                exams.map((exam, index) => {
                                    const isGraded = exam.status === 'graded';
                                    return (
                                        <tr key={index} className="hover:bg-emerald-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                                    <BookOpen size={10} /> {exam.courseCode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-gray-900 text-sm">{exam.examName}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isGraded ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                                                        <CheckCircle2 size={12} /> Graded
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                                                        <Clock size={12} /> Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {exam.totalScore !== null && exam.totalScore !== undefined ? (
                                                    <span className="text-xl font-black text-gray-900">{exam.totalScore}</span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isGraded && exam.evaluationId ? (
                                                    <button onClick={() => handleViewFeedback(exam)}
                                                        className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl hover:bg-emerald-100 transition-colors">
                                                        <Eye size={14} /> View Feedback
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-gray-400 italic">Awaiting evaluation</span>
                                                )}
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

export default StudentSubmissions;
