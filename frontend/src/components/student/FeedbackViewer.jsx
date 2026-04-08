import React, { useState, useEffect, useContext } from 'react';
import { XCircle, CheckCircle, AlertCircle, FileText, ArrowLeft } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const FeedbackViewer = ({ evaluationId, onBack, hideBackButton = false }) => {
    const { user } = useContext(AuthContext);
    const [feedbackData, setFeedbackData] = useState(null);
    const [isFetching, setIsFetching] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchFeedback = async () => {
            setIsFetching(true);
            setError(null);
            try {
                // Use different endpoint based on role
                const isTeacherOrAdmin = user?.role === 'teacher' || user?.role === 'administrator' || user?.role === 'examination_system';
                const endpoint = isTeacherOrAdmin
                    ? `/api/dashboard/teacher/feedback/${evaluationId}`
                    : `/api/dashboard/student/feedback/${evaluationId}`;

                const response = await api.get(endpoint);
                setFeedbackData(response.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch evaluation feedback.');
            } finally {
                setIsFetching(false);
            }
        };

        if (evaluationId) {
            fetchFeedback();
        }
    }, [evaluationId, user?.role]);

    if (isFetching) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mb-4"></div>
                <p className="text-gray-500 dark:text-gray-400 font-medium">Loading your detailed AI evaluation...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50">
                <div className="flex items-center gap-3 text-red-700 dark:text-red-400 mb-4">
                    <AlertCircle size={24} />
                    <h3 className="text-lg font-bold">Access Error</h3>
                </div>
                <p className="text-red-600 dark:text-red-300">{error}</p>
                {onBack && !hideBackButton && (
                    <button 
                        onClick={onBack}
                        className="mt-6 px-4 py-2 bg-red-100 dark:bg-red-800/50 hover:bg-red-200 dark:hover:bg-red-800 text-red-800 dark:text-red-200 rounded-md font-medium transition-colors"
                    >
                        Return to Dashboard
                    </button>
                )}
            </div>
        );
    }

    if (!feedbackData) return null;

    let breakdownData = [];
    let strengths = [];
    let weaknesses = [];
    let suggestions = [];

    // Detailed feedback can be an array (old data) or an object (new data format)
    if (Array.isArray(feedbackData.detailedFeedback)) {
        breakdownData = feedbackData.detailedFeedback;
    } else if (feedbackData.detailedFeedback) {
        breakdownData = feedbackData.detailedFeedback.breakdown || [];
        strengths = feedbackData.detailedFeedback.strengths || [];
        weaknesses = feedbackData.detailedFeedback.weaknesses || [];
        suggestions = feedbackData.detailedFeedback.suggestions || [];
    }

    return (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200 dark:border-slate-700 overflow-hidden transition-colors">
            
            {/* Header Area */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-indigo-800 dark:to-purple-900 p-6 sm:p-8 text-white">
                {onBack && !hideBackButton && (
                    <button 
                        onClick={onBack}
                        className="flex items-center gap-2 text-blue-100 hover:text-white mb-6 transition-colors font-medium text-sm"
                    >
                        <ArrowLeft size={16} /> Back to My Exams
                    </button>
                )}
                
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold mb-2">Evaluation Report</h2>
                        <p className="text-blue-100 flex items-center gap-2">
                            <FileText size={16} /> Detailed AI Analysis
                        </p>
                    </div>
                    <div className="bg-white/20 dark:bg-black/20 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                        <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">Total Score</p>
                        <p className="text-4xl font-black">{feedbackData.totalScore}</p>
                    </div>
                </div>
            </div>

            {/* Questions Breakdown */}
            <div className="p-6 sm:p-8 space-y-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 border-b dark:border-slate-700 pb-2">Question-by-Question Breakdown</h3>
                
                {breakdownData && breakdownData.map((question, index) => {
                    
                    const isZero = question.awardedMarks === 0;

                    return (
                        <div key={index} className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-5 sm:p-6 border border-gray-200 dark:border-slate-600 hover:border-gray-300 dark:hover:border-slate-500 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-200 dark:bg-slate-800 text-gray-700 dark:text-gray-300 font-bold w-10 h-10 rounded-full flex items-center justify-center">
                                        Q{question.questionNumber}
                                    </div>
                                    <h4 className="font-semibold text-gray-800 dark:text-gray-200 text-lg">Question Analysis</h4>
                                </div>
                                
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${
                                    isZero ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400' : 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                                }`}>
                                    {isZero ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                    {question.awardedMarks} Marks Awarded
                                </div>
                            </div>
                            
                            <div className="mt-4 bg-white dark:bg-slate-800 p-4 rounded border border-gray-100 dark:border-slate-700 text-gray-700 dark:text-gray-300 leading-relaxed shadow-sm">
                                <span className="text-xs font-bold uppercase text-gray-400 tracking-wider block mb-2">AI Justification</span>
                                {question.justification}
                            </div>
                            {question.missing_points && question.missing_points.length > 0 && (
                                <div className="mt-2 bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-100 dark:border-red-800/50 text-red-700 dark:text-red-300 text-sm leading-relaxed shadow-sm">
                                    <span className="text-xs font-bold uppercase text-red-400 tracking-wider block mb-2">Missing Points</span>
                                    <ul className="list-disc pl-5">
                                        {question.missing_points.map((mp, idx) => <li key={idx}>{mp}</li>)}
                                    </ul>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Strengths, Weaknesses, Suggestions (If available from new AI Engine) */}
            {(strengths.length > 0 || weaknesses.length > 0 || suggestions.length > 0) && (
                <div className="p-6 sm:p-8 space-y-6 pt-0">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-4 border-b dark:border-slate-700 pb-2">Overall Performance Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {strengths.length > 0 && (
                            <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl p-5">
                                <h4 className="font-bold text-emerald-800 dark:text-emerald-400 mb-3 uppercase tracking-wide text-xs">Strengths</h4>
                                <ul className="list-disc pl-4 text-emerald-700 dark:text-emerald-300 text-sm space-y-1">
                                    {strengths.map((str, idx) => <li key={idx}>{str}</li>)}
                                </ul>
                            </div>
                        )}
                        {weaknesses.length > 0 && (
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl p-5">
                                <h4 className="font-bold text-amber-800 dark:text-amber-400 mb-3 uppercase tracking-wide text-xs">Weaknesses</h4>
                                <ul className="list-disc pl-4 text-amber-700 dark:text-amber-300 text-sm space-y-1">
                                    {weaknesses.map((wk, idx) => <li key={idx}>{wk}</li>)}
                                </ul>
                            </div>
                        )}
                        {suggestions.length > 0 && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/50 rounded-xl p-5">
                                <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-3 uppercase tracking-wide text-xs">Suggestions</h4>
                                <ul className="list-disc pl-4 text-blue-700 dark:text-blue-300 text-sm space-y-1">
                                    {suggestions.map((sg, idx) => <li key={idx}>{sg}</li>)}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
        </div>
    );
};

export default FeedbackViewer;
