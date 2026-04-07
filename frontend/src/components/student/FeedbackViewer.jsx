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
            <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-500 font-medium">Loading your detailed AI evaluation...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-center gap-3 text-red-700 mb-4">
                    <AlertCircle size={24} />
                    <h3 className="text-lg font-bold">Access Error</h3>
                </div>
                <p className="text-red-600">{error}</p>
                {onBack && !hideBackButton && (
                    <button 
                        onClick={onBack}
                        className="mt-6 px-4 py-2 bg-red-100 hover:bg-red-200 text-red-800 rounded-md font-medium transition-colors"
                    >
                        Return to Dashboard
                    </button>
                )}
            </div>
        );
    }

    if (!feedbackData) return null;

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
            
            {/* Header Area */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 sm:p-8 text-white">
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
                    <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4 text-center min-w-[120px]">
                        <p className="text-blue-100 text-sm font-medium uppercase tracking-wider mb-1">Total Score</p>
                        <p className="text-4xl font-black">{feedbackData.totalScore}</p>
                    </div>
                </div>
            </div>

            {/* Questions Breakdown */}
            <div className="p-6 sm:p-8 space-y-6">
                <h3 className="text-xl font-bold text-gray-800 mb-6 border-b pb-2">Question-by-Question Breakdown</h3>
                
                {feedbackData.detailedFeedback && feedbackData.detailedFeedback.map((question, index) => {
                    
                    const isZero = question.awardedMarks === 0;

                    return (
                        <div key={index} className="bg-gray-50 rounded-lg p-5 sm:p-6 border border-gray-200 hover:border-gray-300 transition-colors">
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-gray-200 text-gray-700 font-bold w-10 h-10 rounded-full flex items-center justify-center">
                                        Q{question.questionNumber}
                                    </div>
                                    <h4 className="font-semibold text-gray-800 text-lg">Question Analysis</h4>
                                </div>
                                
                                <div className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold ${
                                    isZero ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                }`}>
                                    {isZero ? <XCircle size={18} /> : <CheckCircle size={18} />}
                                    {question.awardedMarks} Marks Awarded
                                </div>
                            </div>
                            
                            <div className="mt-4 bg-white p-4 rounded border border-gray-100 text-gray-700 leading-relaxed shadow-sm">
                                <span className="text-xs font-bold uppercase text-gray-400 tracking-wider block mb-2">AI Justification</span>
                                {question.justification}
                            </div>
                        </div>
                    );
                })}
            </div>
            
        </div>
    );
};

export default FeedbackViewer;
