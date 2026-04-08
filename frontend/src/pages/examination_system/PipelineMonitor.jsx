import React, { useState, useEffect, useCallback } from 'react';
import {
    Activity, ChevronDown, Loader2, RefreshCw, Play, Globe,
    GlobeLock, CheckCircle2, AlertCircle, Clock, Zap, FileText,
    Users, BarChart3, ChevronRight, X, Terminal
} from 'lucide-react';
import api from '../../utils/api';

// ─── Status badge component ──────────────────────────────────────────────────
const PipelineBadge = ({ status }) => {
    const map = {
        uploaded:   { cls: 'bg-gray-100 text-gray-600',    icon: Clock,          label: 'Uploaded' },
        evaluating: { cls: 'bg-blue-100 text-blue-700',    icon: Loader2,        label: 'Evaluating', spin: true },
        completed:  { cls: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2, label: 'Completed' },
        failed:     { cls: 'bg-red-100 text-red-700',      icon: AlertCircle,    label: 'Failed' },
    };
    const cfg = map[status] || map.uploaded;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${cfg.cls}`}>
            <Icon size={11} className={cfg.spin ? 'animate-spin' : ''} /> {cfg.label}
        </span>
    );
};

// ─── Stat mini card ──────────────────────────────────────────────────────────
const StatPill = ({ label, value, color }) => (
    <div className={`flex flex-col items-center px-4 py-3 rounded-xl border ${color}`}>
        <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-2xl font-black mt-0.5">{value}</p>
    </div>
);

// ─── Log Drawer ───────────────────────────────────────────────────────────────
const LogDrawer = ({ submissionId, onClose }) => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/api/pipeline/logs/${submissionId}`)
            .then(r => setLogs(r.data))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [submissionId]);

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-lg w-full flex flex-col max-h-[70vh]">
                <div className="p-4 border-b border-gray-100 dark:border-slate-700 flex items-center gap-2">
                    <Terminal size={18} className="text-indigo-600 dark:text-indigo-400" />
                    <h3 className="font-bold text-gray-900 dark:text-white">Pipeline Logs — Submission #{submissionId}</h3>
                    <button onClick={onClose} className="ml-auto p-1.5 text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                    {loading ? (
                        <div className="text-center text-gray-400 dark:text-gray-500 py-8"><Loader2 className="animate-spin inline-block mr-2" size={16} />Loading...</div>
                    ) : logs.length === 0 ? (
                        <p className="text-center text-gray-400 dark:text-gray-500 italic py-8">No log entries yet.</p>
                    ) : logs.map((log, i) => (
                        <div key={i} className={`p-2.5 rounded-lg border ${
                            log.status === 'failed' ? 'bg-red-50 border-red-100 text-red-700' :
                            log.status === 'completed' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' :
                            'bg-blue-50 border-blue-100 text-blue-700'
                        }`}>
                            <div className="flex items-center justify-between mb-1">
                                <span className="font-bold uppercase tracking-wider text-[10px]">{log.stage} · {log.status}</span>
                                <span className="text-[10px] opacity-60">{new Date(log.created_at).toLocaleTimeString()}</span>
                            </div>
                            {log.message && <p className="text-[11px] opacity-80 whitespace-pre-wrap">{log.message}</p>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const PipelineMonitor = () => {
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [examInfo, setExamInfo] = useState(null);
    const [pipelineData, setPipelineData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [isPipelineRunning, setIsPipelineRunning] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [logSubmissionId, setLogSubmissionId] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        api.get('/api/exams')
            .then(r => setExams(r.data))
            .catch(console.error)
            .finally(() => setIsLoadingExams(false));
    }, []);

    const fetchPipelineStatus = useCallback(async (examId) => {
        if (!examId) return;
        setIsLoading(true);
        try {
            const [statusRes, examRes] = await Promise.all([
                api.get(`/api/pipeline/status/${examId}`),
                api.get(`/api/exams/${examId}`)
            ]);
            setPipelineData(statusRes.data);
            setExamInfo(examRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Auto-refresh every 4s when pipeline is running
    useEffect(() => {
        if (!autoRefresh || !selectedExamId) return;
        const interval = setInterval(() => fetchPipelineStatus(selectedExamId), 4000);
        return () => clearInterval(interval);
    }, [autoRefresh, selectedExamId, fetchPipelineStatus]);

    const handleExamSelect = (examId) => {
        setSelectedExamId(examId);
        setPipelineData(null);
        setExamInfo(null);
        setAutoRefresh(false);
        if (examId) fetchPipelineStatus(examId);
    };

    const handleRunPipeline = async () => {
        if (!selectedExamId) return;
        if (!window.confirm('Start AI evaluation pipeline for all pending submissions? This runs in the background.')) return;
        setIsPipelineRunning(true);
        try {
            const r = await api.post(`/api/pipeline/run/${selectedExamId}`);
            alert(r.data.message);
            setAutoRefresh(true);
            setTimeout(() => fetchPipelineStatus(selectedExamId), 1000);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to start pipeline.');
        } finally {
            setIsPipelineRunning(false);
        }
    };

    const handlePublishToggle = async (publish) => {
        if (!selectedExamId) return;
        setIsPublishing(true);
        try {
            await api.post(`/api/pipeline/publish/${selectedExamId}`, { publish });
            setExamInfo(prev => ({ ...prev, results_published: publish }));
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to update publish state.');
        } finally {
            setIsPublishing(false);
        }
    };

    const stats = pipelineData?.stats;
    const submissions = (pipelineData?.submissions || []).filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.student_name?.toLowerCase().includes(q) || s.prn_number?.includes(q);
    });

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-br from-violet-700 via-purple-700 to-fuchsia-800 rounded-3xl p-8 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
                        <Activity size={22} className="text-purple-200" />
                    </div>
                    <span className="px-3 py-1 bg-white/10 text-purple-200 text-xs font-bold rounded-full uppercase tracking-wider border border-purple-400/30">
                        Pipeline Control
                    </span>
                    {autoRefresh && (
                        <span className="ml-auto flex items-center gap-1.5 text-xs text-purple-300 animate-pulse">
                            <div className="h-2 w-2 bg-green-400 rounded-full" /> Live
                        </span>
                    )}
                </div>
                <h1 className="text-3xl font-black tracking-tight">Evaluation Pipeline Monitor</h1>
                <p className="text-purple-200 mt-2 max-w-xl">
                    Track per-submission AI evaluation progress, trigger the pipeline, and publish results to students.
                </p>
            </div>

            {/* Exam Selector */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 transition-colors">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Select Exam to Monitor</label>
                        {isLoadingExams ? (
                            <div className="text-gray-400 dark:text-gray-500 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading...</div>
                        ) : (
                            <div className="relative max-w-xl">
                                <select
                                    value={selectedExamId}
                                    onChange={e => handleExamSelect(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-violet-500 text-gray-900 dark:text-gray-100 text-sm transition-all appearance-none pr-10"
                                >
                                    <option value="" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100">— Choose exam —</option>
                                    {exams.map(ex => (
                                        <option key={ex.id} value={ex.id} className="bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100">#{ex.id} — {ex.course_code} — {ex.exam_name}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                            </div>
                        )}
                    </div>

                    {selectedExamId && (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => fetchPipelineStatus(selectedExamId)}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                            >
                                <RefreshCw size={14} /> Refresh
                            </button>
                            <button
                                onClick={() => setAutoRefresh(v => !v)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${
                                    autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                <Activity size={14} /> {autoRefresh ? 'Live ON' : 'Auto-Refresh'}
                            </button>
                            <button
                                onClick={handleRunPipeline}
                                disabled={isPipelineRunning || !pipelineData}
                                className="flex items-center gap-1.5 px-4 py-2 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl shadow-md transition-all disabled:opacity-50"
                            >
                                {isPipelineRunning ? <Loader2 className="animate-spin" size={14} /> : <Play size={14} />}
                                {isPipelineRunning ? 'Starting...' : 'Run Pipeline'}
                            </button>
                            {examInfo && (
                                <button
                                    onClick={() => handlePublishToggle(!examInfo.results_published)}
                                    disabled={isPublishing}
                                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${
                                        examInfo.results_published
                                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                                >
                                    {examInfo.results_published ? <Globe size={14} /> : <GlobeLock size={14} />}
                                    {examInfo.results_published ? 'Published' : 'Publish Results'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Loading State */}
            {isLoading && !pipelineData && (
                <div className="flex items-center justify-center py-16 text-gray-400">
                    <Loader2 className="animate-spin mr-3" size={24} /> Fetching pipeline data...
                </div>
            )}

            {/* Stats Row */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    <StatPill label="Total" value={stats.total} color="border-gray-200 bg-white text-gray-900" />
                    <StatPill label="Uploaded" value={stats.uploaded} color="border-gray-200 bg-gray-50 text-gray-600" />
                    <StatPill label="Evaluating" value={stats.evaluating} color="border-blue-200 bg-blue-50 text-blue-700" />
                    <StatPill label="Completed" value={stats.completed} color="border-emerald-200 bg-emerald-50 text-emerald-700" />
                    <StatPill label="Failed" value={stats.failed} color="border-red-200 bg-red-50 text-red-600" />
                </div>
            )}

            {/* Progress bar */}
            {stats && stats.total > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Overall Pipeline Progress</span>
                        <span className="text-sm font-black text-gray-900 dark:text-white">
                            {stats.completed} / {stats.total} completed
                        </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
                        <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(stats.completed / stats.total) * 100}%` }} />
                        <div className="bg-blue-500 transition-all duration-700" style={{ width: `${(stats.evaluating / stats.total) * 100}%` }} />
                        <div className="bg-red-400 transition-all duration-700" style={{ width: `${(stats.failed / stats.total) * 100}%` }} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Completed</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Evaluating</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400 inline-block" /> Failed</span>
                    </div>
                </div>
            )}

            {/* Submissions Table */}
            {pipelineData && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden transition-colors">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-gray-50/30 dark:bg-slate-800/80 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 dark:text-white">Submission Pipeline Status</h3>
                        <input
                            type="text"
                            placeholder="Search student or PRN..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="px-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-violet-500 w-52"
                        />
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-5 py-3">Student</th>
                                    <th className="px-5 py-3">PRN</th>
                                    <th className="px-5 py-3 text-center">Pipeline Status</th>
                                    <th className="px-5 py-3 text-center">Score</th>
                                    <th className="px-5 py-3">Error</th>
                                    <th className="px-5 py-3 text-right">Logs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                {submissions.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-gray-400 dark:text-gray-500 italic">
                                            {searchQuery ? 'No matches.' : 'No submissions yet.'}
                                        </td>
                                    </tr>
                                ) : submissions.map((sub, i) => (
                                    <tr key={i} className={`transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-700/50 ${
                                        sub.pipeline_status === 'failed' ? 'bg-red-50/20 dark:bg-red-900/10' :
                                        sub.pipeline_status === 'evaluating' ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''
                                    }`}>
                                        <td className="px-5 py-3.5">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                                                    {sub.student_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{sub.student_name}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500">{sub.department}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-3.5 text-xs font-mono text-gray-500 dark:text-gray-400">{sub.prn_number || '—'}</td>
                                        <td className="px-5 py-3.5 text-center">
                                            <PipelineBadge status={sub.pipeline_status} />
                                        </td>
                                        <td className="px-5 py-3.5 text-center">
                                            {sub.total_score !== null && sub.total_score !== undefined ? (
                                                <span className="text-base font-black text-gray-900 dark:text-white">{sub.total_score}</span>
                                            ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                        </td>
                                        <td className="px-5 py-3.5 max-w-[200px]">
                                            {sub.error_message ? (
                                                <p className="text-xs text-red-600 dark:text-red-400 truncate" title={sub.error_message}>{sub.error_message}</p>
                                            ) : <span className="text-gray-300 dark:text-gray-600 text-xs">—</span>}
                                        </td>
                                        <td className="px-5 py-3.5 text-right">
                                            <button
                                                onClick={() => setLogSubmissionId(sub.submission_id)}
                                                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 rounded-lg transition-colors"
                                                title="View pipeline logs"
                                            >
                                                <Terminal size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Log Drawer */}
            {logSubmissionId && (
                <LogDrawer submissionId={logSubmissionId} onClose={() => setLogSubmissionId(null)} />
            )}
        </div>
    );
};

export default PipelineMonitor;
