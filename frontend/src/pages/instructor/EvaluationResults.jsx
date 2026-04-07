import React, { useState, useMemo } from 'react';
import { Search, AlertTriangle, FileText, CheckCircle, BarChart2, TrendingUp, TrendingDown, X, Edit3, Save, Loader2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '../../utils/api';
import FeedbackViewer from '../../components/student/FeedbackViewer';

const EvaluationResults = () => {
    const [examId, setExamId] = useState('');
    const [evaluations, setEvaluations] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    
    // Exam list for dropdown
    const [exams, setExams] = useState([]);
    const [isLoadingExams, setIsLoadingExams] = useState(true);

    // Modal State
    const [selectedEvaluationId, setSelectedEvaluationId] = useState(null);

    // Override Modal State
    const [overrideModalOpen, setOverrideModalOpen] = useState(false);
    const [overrideEvalId, setOverrideEvalId] = useState(null);
    const [overrideScore, setOverrideScore] = useState('');
    const [overrideFeedback, setOverrideFeedback] = useState('');
    const [isOverriding, setIsOverriding] = useState(false);
    const [overrideStatus, setOverrideStatus] = useState({ type: '', message: '' });

    // Fetch exams on mount
    React.useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await api.get('/api/exams');
                setExams(response.data);
            } catch (err) { console.error(err); }
            finally { setIsLoadingExams(false); }
        };
        fetchExams();
    }, []);

    const handleSearch = async (selectedExamId) => {
        const eid = selectedExamId || examId;
        if (!eid) return;

        setExamId(eid);
        setIsFetching(true);
        setError(null);
        setHasSearched(true);
        setSelectedEvaluationId(null);

        try {
            const response = await api.get(`/api/dashboard/teacher/exam/${eid}`);
            setEvaluations(response.data);
        } catch (err) {
            console.error("Dashboard fetch error:", err);
            setError(err.response?.data?.error || 'Failed to fetch examination data from the server.');
            setEvaluations([]);
        } finally {
            setIsFetching(false);
        }
    };

    // --- Override Functions ---
    const openOverrideModal = (evalData) => {
        setOverrideEvalId(evalData.evaluationId);
        setOverrideScore(evalData.totalScore || '');
        setOverrideFeedback('');
        setOverrideStatus({ type: '', message: '' });
        setOverrideModalOpen(true);
    };

    const handleOverrideSubmit = async () => {
        if (overrideScore === '' || overrideScore === null) {
            setOverrideStatus({ type: 'error', message: 'Score is required.' });
            return;
        }

        setIsOverriding(true);
        setOverrideStatus({ type: '', message: '' });

        try {
            const payload = { totalScore: parseFloat(overrideScore) };
            if (overrideFeedback.trim()) {
                payload.detailedFeedback = overrideFeedback;
            }

            await api.put(`/api/dashboard/teacher/override/${overrideEvalId}`, payload);
            
            setOverrideStatus({ type: 'success', message: 'Grade overridden successfully!' });
            
            // Refresh the table data
            setTimeout(async () => {
                setOverrideModalOpen(false);
                if (examId) {
                    const response = await api.get(`/api/dashboard/teacher/exam/${examId}`);
                    setEvaluations(response.data);
                }
            }, 1200);
        } catch (err) {
            setOverrideStatus({ type: 'error', message: err.response?.data?.error || 'Failed to override grade.' });
        } finally {
            setIsOverriding(false);
        }
    };

    // --- Analytics Calculations ---
    const gradedEvals = useMemo(() => evaluations.filter(e => e.totalScore !== null), [evaluations]);
    
    const stats = useMemo(() => {
        if (gradedEvals.length === 0) return { avg: 0, high: 0, low: 0, count: 0 };
        const scores = gradedEvals.map(e => e.totalScore);
        const sum = scores.reduce((a, b) => a + b, 0);
        return {
            avg: Math.round(sum / scores.length),
            high: Math.max(...scores),
            low: Math.min(...scores),
            count: gradedEvals.length
        };
    }, [gradedEvals]);

    // Bucket scores for the Bar Chart
    const chartData = useMemo(() => {
        if (gradedEvals.length === 0) return [];
        const buckets = { '0-20': 0, '21-40': 0, '41-60': 0, '61-80': 0, '81-100': 0 };
        
        gradedEvals.forEach(e => {
            const s = e.totalScore;
            if (s <= 20) buckets['0-20']++;
            else if (s <= 40) buckets['21-40']++;
            else if (s <= 60) buckets['41-60']++;
            else if (s <= 80) buckets['61-80']++;
            else buckets['81-100']++;
        });

        return Object.keys(buckets).map(key => ({
            name: key,
            count: buckets[key]
        }));
    }, [gradedEvals]);

    return (
        <div className="max-w-7xl mx-auto space-y-6 relative">
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Review Evaluations</h2>
                <p className="text-gray-500 mt-2">Analyze AI-generated grades, review flagged submissions, and override grades.</p>
            </div>

            {/* View Layer: Split layout */}
            <div className="flex flex-col xl:flex-row gap-6">
                
                {/* Left Column: Search & Table */}
                <div className={`flex-1 transition-all duration-300 ${selectedEvaluationId ? 'xl:w-1/2' : 'w-full'}`}>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
                        
                        {/* Search Header */}
                        <div className="p-6 border-b border-gray-200 bg-gray-50/50">
                            <label className="block text-sm font-bold text-gray-700 mb-2">Select Exam</label>
                            <div className="flex gap-4 max-w-xl">
                                {isLoadingExams ? (
                                    <div className="text-gray-400 text-sm py-2">Loading exams...</div>
                                ) : (
                                    <select
                                        value={examId}
                                        onChange={(e) => { setExamId(e.target.value); handleSearch(e.target.value); }}
                                        className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm"
                                    >
                                        <option value="">— Select an Exam to Analyze —</option>
                                        {exams.map(exam => (
                                            <option key={exam.id} value={exam.id}>
                                                #{exam.id} — {exam.course_code} — {exam.exam_name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>
                            {error && <div className="mt-4 text-sm text-red-600">{error}</div>}
                        </div>

                        {/* Data Table */}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 text-gray-600 text-xs uppercase tracking-wider">
                                        <th className="px-6 py-4 font-semibold">Student</th>
                                        <th className="px-6 py-4 font-semibold text-center">Status</th>
                                        <th className="px-6 py-4 font-semibold text-center">Score</th>
                                        <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {hasSearched && evaluations.length === 0 && !isFetching && !error && (
                                        <tr>
                                            <td colSpan="4" className="px-6 py-12 text-center text-gray-500 italic">
                                                No submissions found for this exam yet.
                                            </td>
                                        </tr>
                                    )}

                                    {evaluations.map((evalData, index) => {
                                        const needsReview = evalData.needsReview === true;
                                        const isSelected = selectedEvaluationId === evalData.evaluationId;
                                        const rowBg = isSelected 
                                            ? 'bg-blue-50 border-l-4 border-blue-500' 
                                            : needsReview ? 'bg-amber-50/40 hover:bg-amber-50' : 'hover:bg-gray-50 border-l-4 border-transparent';

                                        return (
                                            <tr key={index} className={`transition-colors cursor-pointer ${rowBg}`} onClick={() => evalData.evaluationId && setSelectedEvaluationId(evalData.evaluationId)}>
                                                <td className="px-6 py-4">
                                                    <div className="font-bold text-gray-900 flex items-center gap-2">
                                                        {evalData.studentName}
                                                        {needsReview && (
                                                            <span title="AI flagged this paper for human review." className="text-amber-500">
                                                                <AlertTriangle size={16} />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-gray-500 font-mono mt-1">PRN: {evalData.prnNumber || 'N/A'}</div>
                                                </td>
                                                
                                                <td className="px-6 py-4 text-center">
                                                    {evalData.submissionStatus === 'graded' ? (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-800">
                                                            Graded
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-600">
                                                            Pending
                                                        </span>
                                                    )}
                                                </td>
                                                
                                                <td className="px-6 py-4 text-center">
                                                    {evalData.totalScore !== null ? (
                                                        <span className={`text-lg font-bold ${needsReview ? 'text-amber-600' : 'text-gray-900'}`}>
                                                            {evalData.totalScore}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </td>
                                                
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            disabled={!evalData.evaluationId}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedEvaluationId(evalData.evaluationId);
                                                            }}
                                                            className="inline-flex items-center p-2 text-gray-400 hover:text-blue-600 transition-colors disabled:opacity-20 disabled:cursor-not-allowed"
                                                            title="View Details"
                                                        >
                                                            <FileText size={20} />
                                                        </button>
                                                        {evalData.evaluationId && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openOverrideModal(evalData);
                                                                }}
                                                                className="inline-flex items-center p-2 text-gray-400 hover:text-orange-600 transition-colors"
                                                                title="Override Grade"
                                                            >
                                                                <Edit3 size={18} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Column: Analytics OR Detail Modal */}
                {hasSearched && (
                    <div className={`transition-all duration-500 ease-in-out ${selectedEvaluationId ? 'w-full xl:w-1/2' : 'w-full xl:w-96'}`}>
                        
                        {/* Case 1: Show Analytics if Modal is CLOSED */}
                        {!selectedEvaluationId && gradedEvals.length > 0 && (
                            <div className="space-y-6 sticky top-8">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                                        <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1"><BarChart2 size={16}/> Average</p>
                                        <p className="text-3xl font-bold text-gray-900">{stats.avg}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                                        <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1">Graded</p>
                                        <p className="text-3xl font-bold text-gray-900">{stats.count}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                                        <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1 text-green-600"><TrendingUp size={16}/> High</p>
                                        <p className="text-2xl font-bold text-gray-900">{stats.high}</p>
                                    </div>
                                    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
                                        <p className="text-sm font-semibold text-gray-500 mb-1 flex items-center gap-1 text-red-600"><TrendingDown size={16}/> Low</p>
                                        <p className="text-2xl font-bold text-gray-900">{stats.low}</p>
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                                    <h3 className="text-sm font-bold text-gray-800 mb-6 uppercase tracking-wider">Score Distribution</h3>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#6B7280' }} />
                                                <Tooltip 
                                                    cursor={{ fill: '#F3F4F6' }}
                                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                                    {chartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.count > 0 ? '#3B82F6' : '#E5E7EB'} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Case 2: Show Drilldown if OPEN */}
                        {selectedEvaluationId && (
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 h-full min-h-[600px] flex flex-col relative">
                                {/* Modal Header */}
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <FileText className="text-blue-600" size={18} />
                                        Evaluation Details
                                    </h3>
                                    <button 
                                        onClick={() => setSelectedEvaluationId(null)}
                                        className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                                
                                <div className="flex-1 overflow-y-auto p-4">
                                    <FeedbackViewer 
                                        evaluationId={selectedEvaluationId} 
                                        hideBackButton={true}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* ============================================== */}
            {/* GRADE OVERRIDE MODAL (Floating Overlay) */}
            {/* ============================================== */}
            {overrideModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                        <button 
                            onClick={() => setOverrideModalOpen(false)}
                            className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>

                        <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center gap-2">
                            <Edit3 className="text-orange-500" size={20} />
                            Override AI Grade
                        </h3>
                        <p className="text-sm text-gray-500 mb-6">Manually adjust the score and provide optional feedback.</p>

                        {overrideStatus.message && (
                            <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${overrideStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {overrideStatus.message}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">New Total Score *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={overrideScore}
                                    onChange={(e) => setOverrideScore(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 font-mono text-lg"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Override Justification <span className="font-normal text-gray-400">(Optional)</span></label>
                                <textarea
                                    rows="3"
                                    value={overrideFeedback}
                                    onChange={(e) => setOverrideFeedback(e.target.value)}
                                    placeholder="Reason for modifying the AI's grade..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setOverrideModalOpen(false)}
                                className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOverrideSubmit}
                                disabled={isOverriding}
                                className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors disabled:bg-orange-400"
                            >
                                {isOverriding ? (
                                    <><Loader2 className="animate-spin" size={16} /> Saving...</>
                                ) : (
                                    <><Save size={16} /> Confirm Override</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EvaluationResults;
