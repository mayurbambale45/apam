import React, { useState, useEffect } from 'react';
import { Search, AlertTriangle, FileText, CheckCircle } from 'lucide-react';
import api from '../../utils/api';

const EvaluationTable = () => {
    const [examId, setExamId] = useState('');
    const [evaluations, setEvaluations] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [myExams, setMyExams] = useState([]);
    const [isLoadingExams, setIsLoadingExams] = useState(true);

    useEffect(() => {
        const fetchMyExams = async () => {
            try {
                const response = await api.get('/api/dashboard/teacher/my-exams');
                setMyExams(response.data);
                if (response.data.length > 0) {
                    setExamId(response.data[0].id.toString());
                }
            } catch (err) {
                console.error('Failed to fetch assigned exams:', err);
                setError('Failed to load your assigned subjects.');
            } finally {
                setIsLoadingExams(false);
            }
        };

        fetchMyExams();
    }, []);

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!examId) return;

        setIsFetching(true);
        setError(null);
        setHasSearched(true);

        try {
            const response = await api.get(`/api/dashboard/teacher/exam/${examId}`);
            setEvaluations(response.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch examination data.');
            setEvaluations([]);
        } finally {
            setIsFetching(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
                
                {/* Search Header */}
                <div className="p-6 border-b border-gray-200 bg-gray-50/50">
                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Review Submissions</h2>
                    
                    <form onSubmit={handleSearch} className="flex gap-4 max-w-lg">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={18} className="text-gray-400" />
                            </div>
                            <select
                                required
                                value={examId}
                                onChange={(e) => setExamId(e.target.value)}
                                disabled={isLoadingExams || myExams.length === 0}
                                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
                            >
                                {isLoadingExams ? (
                                    <option value="">Loading your subjects...</option>
                                ) : myExams.length === 0 ? (
                                    <option value="">No subjects assigned to you</option>
                                ) : (
                                    myExams.map(exam => (
                                        <option key={exam.id} value={exam.id}>
                                            {exam.course_code} - {exam.exam_name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <button
                            type="submit"
                            disabled={isFetching}
                            className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors disabled:bg-gray-400"
                        >
                            {isFetching ? 'Fetching...' : 'View Results'}
                        </button>
                    </form>
                    
                    {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
                </div>

                {/* Data Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-100 text-gray-600 text-sm uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Student Name</th>
                                <th className="px-6 py-4 font-semibold">PRN</th>
                                <th className="px-6 py-4 font-semibold text-center">Status</th>
                                <th className="px-6 py-4 font-semibold text-center">AI Score</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            
                            {hasSearched && evaluations.length === 0 && !isFetching && !error && (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500 italic">
                                        No submissions found for this exam yet.
                                    </td>
                                </tr>
                            )}

                            {evaluations.map((evalData, index) => {
                                // Design highlighting for AI warnings
                                const needsReview = evalData.needsReview === true;
                                const rowBg = needsReview ? 'bg-amber-50/60 hover:bg-amber-100/60' : 'hover:bg-gray-50';

                                return (
                                    <tr key={index} className={`transition-colors ${rowBg}`}>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900 flex items-center gap-2">
                                                {evalData.studentName}
                                                {needsReview && (
                                                    <span title="AI flagged this paper for human review." className="text-amber-500">
                                                        <AlertTriangle size={16} />
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        
                                        <td className="px-6 py-4 text-gray-600 font-mono text-sm">
                                            {evalData.prnNumber || evalData.rollNumber}
                                        </td>
                                        
                                        <td className="px-6 py-4 text-center">
                                            {evalData.submissionStatus === 'graded' ? (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    <CheckCircle size={12} className="mr-1" /> Graded
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                    Pending
                                                </span>
                                            )}
                                        </td>
                                        
                                        <td className="px-6 py-4 text-center">
                                            {evalData.totalScore !== null ? (
                                                <div className="flex flex-col items-center">
                                                    <span className={`text-lg font-bold ${needsReview ? 'text-amber-600' : 'text-gray-900'}`}>
                                                        {evalData.totalScore}
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                disabled={!evalData.evaluationId}
                                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                <FileText size={16} className="mr-2 text-gray-400" />
                                                Review
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EvaluationTable;
