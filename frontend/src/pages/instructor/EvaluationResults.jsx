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
            <div className="page-header mb-6">
                <div>
                    <h2 className="page-title">Review Evaluations</h2>
                    <p className="page-subtitle">Analyze AI-generated grades, review flagged submissions, and override grades.</p>
                </div>
            </div>

            {/* View Layer: Split layout */}
            <div className="flex flex-col xl:flex-row gap-6">
                
                {/* Left Column: Search & Table */}
                <div className={`flex-1 transition-all duration-300 ${selectedEvaluationId ? 'xl:w-1/2' : 'w-full'}`}>
                    <div className="card overflow-hidden mb-6" style={{ padding: 0 }}>
                        
                        {/* Search Header */}
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700" style={{ background: 'var(--bg-page)' }}>
                            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--text-primary)' }}>Select Exam</label>
                            <div className="flex gap-4 max-w-xl">
                                {isLoadingExams ? (
                                    <div className="text-gray-400 text-sm py-2">Loading exams...</div>
                                ) : (
                                    <select
                                        value={examId}
                                        onChange={(e) => { setExamId(e.target.value); handleSearch(e.target.value); }}
                                        className="form-select flex-1"
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
                            <table className="data-table">
                                <thead>
                                    <tr>
                                        <th>Student</th>
                                        <th style={{ textAlign: 'center' }}>Status</th>
                                        <th style={{ textAlign: 'center' }}>Score</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {hasSearched && evaluations.length === 0 && !isFetching && !error && (
                                        <tr>
                                            <td colSpan="4" className="text-center italic" style={{ padding: '40px', color: 'var(--text-muted)' }}>
                                                No submissions found for this exam yet.
                                            </td>
                                        </tr>
                                    )}

                                    {evaluations.map((evalData, index) => {
                                        const needsReview = evalData.needsReview === true;
                                        const isSelected = selectedEvaluationId === evalData.evaluationId;
                                        const rowStyle = isSelected 
                                            ? { background: 'var(--bg-page)', borderLeft: '4px solid var(--color-accent)' } 
                                            : needsReview ? { background: 'rgba(245,158,11,0.05)' } : {};

                                        return (
                                            <tr key={index} style={{ cursor: 'pointer', ...rowStyle }} onClick={() => evalData.evaluationId && setSelectedEvaluationId(evalData.evaluationId)}>
                                                <td>
                                                    <div className="flex items-center gap-2" style={{ fontWeight: 700 }}>
                                                        {evalData.studentName}
                                                        {needsReview && (
                                                            <span title="AI flagged this paper for human review." className="text-amber-500">
                                                                <AlertTriangle size={14} />
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace', marginTop: 2 }}>PRN: {evalData.prnNumber || 'N/A'}</div>
                                                </td>
                                                
                                                <td style={{ textAlign: 'center' }}>
                                                    {evalData.submissionStatus === 'graded' ? (
                                                        <span className="badge badge-emerald">Graded</span>
                                                    ) : (
                                                        <span className="badge badge-gray">Pending</span>
                                                    )}
                                                </td>
                                                
                                                <td style={{ textAlign: 'center' }}>
                                                    {evalData.totalScore !== null ? (
                                                        <span style={{ fontWeight: 800, fontSize: '14px', color: needsReview ? 'var(--color-warning)' : 'inherit' }}>
                                                            {evalData.totalScore}
                                                        </span>
                                                    ) : (
                                                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                                                    )}
                                                </td>
                                                
                                                <td style={{ textAlign: 'right' }}>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            disabled={!evalData.evaluationId}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedEvaluationId(evalData.evaluationId);
                                                            }}
                                                            className="btn btn-ghost"
                                                            style={{ padding: '6px' }}
                                                            title="View Details"
                                                        >
                                                            <FileText size={16} />
                                                        </button>
                                                        {evalData.evaluationId && (
                                                            <button 
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    openOverrideModal(evalData);
                                                                }}
                                                                className="btn btn-ghost"
                                                                style={{ padding: '6px', color: 'var(--color-warning)' }}
                                                                title="Override Grade"
                                                            >
                                                                <Edit3 size={16} />
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
                                    <div className="stat-card" style={{ borderTop: '3px solid var(--text-muted)' }}>
                                        <p className="stat-label flex items-center gap-1"><BarChart2 size={12}/> Average</p>
                                        <p className="stat-value">{stats.avg}</p>
                                    </div>
                                    <div className="stat-card" style={{ borderTop: '3px solid var(--border)' }}>
                                        <p className="stat-label flex items-center gap-1">Graded</p>
                                        <p className="stat-value">{stats.count}</p>
                                    </div>
                                    <div className="stat-card" style={{ borderTop: '3px solid var(--color-success)' }}>
                                        <p className="stat-label flex items-center gap-1" style={{ color: 'var(--color-success)' }}><TrendingUp size={12}/> High</p>
                                        <p className="stat-value" style={{ color: 'var(--color-success)' }}>{stats.high}</p>
                                    </div>
                                    <div className="stat-card" style={{ borderTop: '3px solid var(--color-danger)' }}>
                                        <p className="stat-label flex items-center gap-1" style={{ color: 'var(--color-danger)' }}><TrendingDown size={12}/> Low</p>
                                        <p className="stat-value" style={{ color: 'var(--color-danger)' }}>{stats.low}</p>
                                    </div>
                                </div>

                                {/* Chart */}
                                <div className="card">
                                    <h3 className="section-label mb-6">Score Distribution</h3>
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
                            <div className="card h-full min-h-[600px] flex flex-col relative" style={{ padding: 0 }}>
                                {/* Modal Header */}
                                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/80 rounded-t-2xl">
                                    <h3 className="font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                        <FileText className="text-blue-600" size={18} />
                                        Evaluation Details
                                    </h3>
                                    <button 
                                        onClick={() => setSelectedEvaluationId(null)}
                                        className="btn btn-ghost"
                                        style={{ padding: 4 }}
                                    >
                                        <X size={16} />
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
                    <div className="card max-w-md w-full relative">
                        <button 
                            onClick={() => setOverrideModalOpen(false)}
                            className="btn btn-ghost absolute top-4 right-4"
                            style={{ padding: 4 }}
                        >
                            <X size={16} />
                        </button>

                        <h3 className="page-title mb-1 flex items-center gap-2">
                            <Edit3 className="text-orange-500" size={18} />
                            Override AI Grade
                        </h3>
                        <p className="page-subtitle mb-6">Manually adjust the score and provide optional feedback.</p>

                        {overrideStatus.message && (
                            <div className={`p-3 rounded-lg mb-4 text-sm font-medium ${overrideStatus.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                {overrideStatus.message}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>New Total Score *</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    required
                                    value={overrideScore}
                                    onChange={(e) => setOverrideScore(e.target.value)}
                                    className="form-input"
                                    style={{ fontSize: 16, fontFamily: 'monospace' }}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>Override Justification <span className="font-normal text-gray-400">(Optional)</span></label>
                                <textarea
                                    rows="3"
                                    value={overrideFeedback}
                                    onChange={(e) => setOverrideFeedback(e.target.value)}
                                    placeholder="Reason for modifying the AI's grade..."
                                    className="form-input"
                                    style={{ resize: 'none' }}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setOverrideModalOpen(false)}
                                className="btn btn-ghost"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOverrideSubmit}
                                disabled={isOverriding}
                                className="btn btn-amber"
                            >
                                {isOverriding ? (
                                    <><Loader2 className="animate-spin" size={14} /> Saving...</>
                                ) : (
                                    <><Save size={14} /> Confirm Override</>
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
