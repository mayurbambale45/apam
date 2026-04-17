import React, { useState, useEffect, useContext } from 'react';
import { useLocation } from 'react-router-dom';
import {
    FileText, CheckCircle2, Clock, BarChart3, Eye, X,
    ChevronLeft, GraduationCap, BookOpen, AlertTriangle, Loader2, Send,
    MessageSquare, CheckCheck, ShieldCheck
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

    // Grievance modal state
    const [grievanceModal, setGrievanceModal] = useState({ open: false, exam: null });
    const [grievanceMessage, setGrievanceMessage] = useState('');
    const [isSubmittingGrievance, setIsSubmittingGrievance] = useState(false);
    const [grievanceError, setGrievanceError] = useState('');

    const openGrievanceModal = (exam) => {
        setGrievanceModal({ open: true, exam });
        setGrievanceMessage('');
        setGrievanceError('');
    };

    const closeGrievanceModal = () => {
        setGrievanceModal({ open: false, exam: null });
        setGrievanceMessage('');
        setGrievanceError('');
    };

    const handleSubmitGrievance = async () => {
        if (!grievanceMessage.trim() || grievanceMessage.trim().length < 10) {
            setGrievanceError('Please write at least 10 characters explaining your grievance.');
            return;
        }
        setIsSubmittingGrievance(true);
        setGrievanceError('');
        try {
            await api.post('/api/dashboard/student/grievance', {
                evaluation_id: grievanceModal.exam.evaluationId,
                message: grievanceMessage.trim()
            });
            // Refresh exams list to show updated grievance status
            const res = await api.get('/api/dashboard/student/my-exams');
            setExams(res.data);
            closeGrievanceModal();
        } catch (err) {
            setGrievanceError(err.response?.data?.error || 'Failed to raise grievance. Please try again.');
        } finally {
            setIsSubmittingGrievance(false);
        }
    };

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
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-slate-700 rounded-xl text-sm font-medium transition-colors shadow-sm">
                    <ChevronLeft size={16} /> Back to Results
                </button>

                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-100 dark:border-slate-700 overflow-hidden">
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
                <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                    <FileText className="text-emerald-500" size={28} /> Results
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">All your exam answer scripts and AI evaluation results.</p>
            </div>

            {/* Stats Bar */}
            {!isLoading && exams.length > 0 && (
                <div className="flex flex-wrap gap-3">
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-5 py-3 rounded-2xl flex items-center gap-3">
                        <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><FileText size={16} /></div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Total</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{exams.length}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-5 py-3 rounded-2xl flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><CheckCircle2 size={16} /></div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Graded</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{gradedCount}</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-5 py-3 rounded-2xl flex items-center gap-3">
                        <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg"><Clock size={16} /></div>
                        <div>
                            <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wider">Pending</p>
                            <p className="text-lg font-black text-gray-900 dark:text-white">{pendingCount}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800/30 flex items-center gap-2">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Submissions Table */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-slate-800/80 border-b border-gray-100 dark:border-slate-700 text-gray-500 dark:text-gray-400 text-[11px] uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Course</th>
                                <th className="px-6 py-4 font-semibold">Exam Title</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-center">Score</th>
                                <th className="px-6 py-4 font-semibold text-center">Grievance</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                            {isLoading ? (
                                <tr><td colSpan="6" className="px-6 py-16 text-center text-gray-400 dark:text-gray-500">
                                    <Loader2 className="animate-spin inline-block mr-2" size={20} />Loading your results...
                                </td></tr>
                            ) : exams.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-16 text-center">
                                    <FileText size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">No Results Yet</h3>
                                    <p className="text-sm text-gray-400 dark:text-gray-500">Your answer scripts will appear here once uploaded by the Examination Cell of WCE Sangli.</p>
                                </td></tr>
                            ) : (
                                exams.map((exam, index) => {
                                    const isGraded = exam.status === 'graded';
                                    const hasGrievance = exam.hasRaisedGrievance;
                                    const isResolved = exam.grievanceStatus === 'resolved';
                                    return (
                                        <tr key={index} className="hover:bg-emerald-50/30 dark:hover:bg-slate-700/50 transition-colors group">
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                                    <BookOpen size={10} /> {exam.courseCode}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{exam.examName}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {isGraded ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                                                        <CheckCircle2 size={12} /> Graded
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400">
                                                        <Clock size={12} /> Pending
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {exam.totalScore !== null && exam.totalScore !== undefined ? (
                                                    <span className="text-xl font-black text-gray-900 dark:text-white">{exam.totalScore}</span>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            {/* Grievance status column */}
                                            <td className="px-6 py-4 text-center">
                                                {!isGraded || !exam.evaluationId ? (
                                                    <span className="text-gray-300 dark:text-gray-600">—</span>
                                                ) : isResolved ? (
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400">
                                                            <CheckCheck size={12} /> Resolved
                                                        </span>
                                                        {exam.grievanceMarks !== null && exam.grievanceMarks !== undefined && (
                                                            <span className="text-sm font-black text-green-600 dark:text-green-400">
                                                                New: {exam.grievanceMarks}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : hasGrievance ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400">
                                                        <Clock size={12} /> Pending Review
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-300 dark:text-gray-600">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {isGraded && exam.evaluationId ? (
                                                    <div className="flex justify-end items-center gap-2">
                                                        <button onClick={() => handleViewFeedback(exam)}
                                                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/40 border border-emerald-200 dark:border-emerald-800/50 rounded-xl hover:bg-emerald-100 dark:hover:bg-emerald-800/50 transition-colors">
                                                            <Eye size={14} /> View Feedback
                                                        </button>
                                                        {/* Grievance button: only show if no grievance raised yet and not resolved */}
                                                        {!hasGrievance && !isResolved ? (
                                                            <button onClick={() => openGrievanceModal(exam)}
                                                                className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-800/50 rounded-xl hover:bg-amber-100 dark:hover:bg-amber-800/50 transition-colors">
                                                                <MessageSquare size={14} /> Raise Grievance
                                                            </button>
                                                        ) : isResolved ? (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 rounded-xl cursor-default">
                                                                <ShieldCheck size={14} /> Resolved
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl cursor-default" title="Grievance Already Raised">
                                                                <Clock size={14} /> Grievance Raised
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-gray-400 dark:text-gray-500 italic">Awaiting evaluation</span>
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

            {/* Grievance Modal */}
            {grievanceModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeGrievanceModal} />
                    {/* Modal */}
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-lg animate-fadeIn">
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                    <MessageSquare className="text-amber-600 dark:text-amber-400" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-lg">Raise a Grievance</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {grievanceModal.exam?.courseCode} — {grievanceModal.exam?.examName}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeGrievanceModal}
                                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-6 space-y-4">
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
                                <p className="text-sm text-amber-800 dark:text-amber-300 font-medium flex items-start gap-2">
                                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                                    You can only raise ONE grievance per exam. Once submitted, you cannot raise another grievance for this evaluation.
                                </p>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">
                                        Your Message to the Teacher *
                                    </label>
                                    <span className={`text-xs font-medium ${grievanceMessage.length < 10 ? 'text-red-400' : 'text-emerald-500'}`}>
                                        {grievanceMessage.length} chars
                                    </span>
                                </div>
                                <textarea
                                    value={grievanceMessage}
                                    onChange={e => { setGrievanceMessage(e.target.value); setGrievanceError(''); }}
                                    placeholder="e.g. I believe Question 3 was marked incorrectly. My answer covered all the required points about normalization. The model answer says 5 marks but I should receive at least 4 marks because..."
                                    rows={6}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none transition-all placeholder-gray-400 dark:placeholder-gray-500"
                                />
                                {grievanceError && (
                                    <p className="mt-2 text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                        <AlertTriangle size={14} /> {grievanceError}
                                    </p>
                                )}
                            </div>

                            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-3">
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    <strong className="text-gray-700 dark:text-gray-300">Current Score:</strong>{' '}
                                    {grievanceModal.exam?.totalScore ?? '—'}
                                </p>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-slate-700">
                            <button onClick={closeGrievanceModal}
                                className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmitGrievance}
                                disabled={isSubmittingGrievance || grievanceMessage.trim().length < 10}
                                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 dark:disabled:bg-amber-800 rounded-xl transition-colors disabled:cursor-not-allowed shadow-sm">
                                {isSubmittingGrievance ? (
                                    <><Loader2 size={16} className="animate-spin" /> Submitting...</>
                                ) : (
                                    <><Send size={16} /> Submit Grievance</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentSubmissions;
