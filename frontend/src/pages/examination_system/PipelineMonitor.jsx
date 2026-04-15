import React, { useState, useEffect, useCallback, useContext } from 'react';
import {
    Activity, ChevronDown, Loader2, RefreshCw, Play, Globe,
    GlobeLock, CheckCircle2, AlertCircle, Clock, Zap, FileText,
    BarChart3, ChevronRight, X, Terminal, AlertTriangle, Wifi,
    CreditCard, RotateCcw, Upload, Search
} from 'lucide-react';
import api from '../../utils/api';
import { AuthContext } from '../../context/AuthContext';

// ─── Status badge ─────────────────────────────────────────────────────────────
const PipelineBadge = ({ status }) => {
    const map = {
        uploaded:   { cls: 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400',          icon: Clock,          label: 'Uploaded' },
        extracting: { cls: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-400', icon: Loader2,        label: 'Extracting', spin: true },
        evaluating: { cls: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',        icon: Loader2,        label: 'Evaluating', spin: true },
        completed:  { cls: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400', icon: CheckCircle2, label: 'Completed' },
        failed:     { cls: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',            icon: AlertCircle,    label: 'Failed' },
    };
    const cfg = map[status] || map.uploaded;
    const Icon = cfg.icon;
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${cfg.cls}`}>
            <Icon size={11} className={cfg.spin ? 'animate-spin' : ''} /> {cfg.label}
        </span>
    );
};

// ─── Stat mini card ───────────────────────────────────────────────────────────
const StatPill = ({ label, value, color }) => (
    <div className={`flex flex-col items-center px-4 py-3 rounded-xl border ${color}`}>
        <p className="text-xs font-bold uppercase tracking-wider opacity-70">{label}</p>
        <p className="text-2xl font-black mt-0.5">{value}</p>
    </div>
);

// ─── API Quota / Error Banner ─────────────────────────────────────────────────
const APIErrorBanner = ({ error, onDismiss }) => {
    if (!error) return null;
    const isQuota = error.type === 'quota';
    const isKey   = error.type === 'key';
    return (
        <div className={`rounded-2xl border p-5 flex items-start gap-4 ${
            isQuota ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/40' :
            isKey   ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/40' :
                      'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40'
        }`}>
            <div className={`p-2 rounded-xl flex-shrink-0 ${
                isQuota ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400' :
                isKey   ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400' :
                          'bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400'
            }`}>
                {isQuota ? <CreditCard size={20} /> : isKey ? <Wifi size={20} /> : <AlertTriangle size={20} />}
            </div>
            <div className="flex-1 min-w-0">
                <p className={`font-bold text-sm ${
                    isQuota ? 'text-amber-800 dark:text-amber-300' :
                    isKey   ? 'text-red-800 dark:text-red-300' :
                              'text-orange-800 dark:text-orange-300'
                }`}>
                    {isQuota ? '⚡ API Quota Exceeded — AI Pipeline Cannot Run' :
                     isKey   ? '🔑 Invalid or Expired Groq API Key' :
                               '⚠️ AI Service Error'}
                </p>
                <p className={`text-xs mt-1 ${
                    isQuota ? 'text-amber-700 dark:text-amber-400' :
                    isKey   ? 'text-red-700 dark:text-red-400' :
                              'text-orange-700 dark:text-orange-400'
                }`}>
                    {isQuota
                        ? 'Your Groq API free-tier credits are exhausted. Go to console.groq.com to check your quota or upgrade your plan. The pipeline cannot evaluate answer sheets until the API is available again.'
                        : isKey
                        ? 'The GROQ_API_KEY in your .env file is invalid or has expired. Generate a new key at console.groq.com/keys and restart the backend server.'
                        : error.message}
                </p>
                {(isQuota || isKey) && (
                    <a
                        href={isKey ? 'https://console.groq.com/keys' : 'https://console.groq.com'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`inline-flex items-center gap-1 mt-2 text-xs font-bold underline ${
                            isQuota ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400'
                        }`}
                    >
                        Open Groq Console ↗
                    </a>
                )}
            </div>
            <button onClick={onDismiss} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg flex-shrink-0">
                <X size={16} />
            </button>
        </div>
    );
};

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
                    <button onClick={onClose} className="ml-auto p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg">
                        <X size={18} />
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 font-mono text-xs">
                    {loading ? (
                        <div className="text-center text-gray-400 py-8"><Loader2 className="animate-spin inline-block mr-2" size={16} />Loading...</div>
                    ) : logs.length === 0 ? (
                        <p className="text-center text-gray-400 italic py-8">No log entries yet.</p>
                    ) : logs.map((log, i) => (
                        <div key={i} className={`p-2.5 rounded-lg border ${
                            log.status === 'failed'    ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800/30 text-red-700 dark:text-red-400' :
                            log.status === 'completed' ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800/30 text-emerald-700 dark:text-emerald-400' :
                            log.status === 'retrying'  ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800/30 text-amber-700 dark:text-amber-400' :
                            'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800/30 text-blue-700 dark:text-blue-400'
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

// ─── Year / Branch constants ──────────────────────────────────────────────────
const YEARS    = ['FY', 'SY', 'TY', 'LY'];
const BRANCHES = [
    'Computer Science & Engineering',
    'Information Technology',
    'Electronics & Telecommunication',
    'Electrical Engineering',
    'Mechanical Engineering',
    'Civil Engineering',
    'Artificial Intelligence & Data Science',
];

// ─── Smart Upload Panel ───────────────────────────────────────────────────────
const BulkUploadPanel = ({ examId, onUploadDone }) => {
    const emptyRow = () => ({ id: Date.now() + Math.random(), file: null, year: '', branch: '', studentId: '', students: [], loadingStudents: false });
    const [rows, setRows] = useState([emptyRow()]);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState(null);

    const addRow    = () => setRows(p => [...p, emptyRow()]);
    const removeRow = (id) => setRows(p => p.filter(r => r.id !== id));
    const updateRow = (id, patch) => setRows(p => p.map(r => r.id === id ? { ...r, ...patch } : r));

    const fetchStudents = async (rowId, year, branch) => {
        if (!year || !branch) { updateRow(rowId, { students: [], studentId: '' }); return; }
        updateRow(rowId, { loadingStudents: true, students: [], studentId: '' });
        try {
            const res = await api.get('/api/pipeline/all-students', { params: { year, branch } });
            updateRow(rowId, { students: res.data, loadingStudents: false });
        } catch { updateRow(rowId, { loadingStudents: false }); }
    };

    const handleYearChange   = (rowId, year)   => { updateRow(rowId, { year, branch: '', studentId: '', students: [] }); };
    const handleBranchChange = (rowId, branch) => {
        const row = rows.find(r => r.id === rowId);
        updateRow(rowId, { branch, studentId: '', students: [] });
        if (row?.year) fetchStudents(rowId, row.year, branch);
    };

    const handleUpload = async () => {
        const valid = rows.filter(r => r.file && r.studentId);
        if (!valid.length || !examId) {
            setResult({ error: 'Please select a file AND a student for each row.' });
            return;
        }
        setUploading(true);
        setResult(null);
        const mapping = {};
        valid.forEach(r => { mapping[r.file.name] = r.studentId; });
        const formData = new FormData();
        formData.append('exam_id', examId);
        formData.append('student_id_map', JSON.stringify(mapping));
        valid.forEach(r => formData.append('files', r.file, r.file.name));
        try {
            const res = await api.post('/api/pipeline/bulk-upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            setResult(res.data);
            setRows([emptyRow()]);
            onUploadDone();
        } catch (err) {
            setResult({ error: err.response?.data?.error || 'Upload failed.' });
        } finally { setUploading(false); }
    };

    const sel = "w-full px-2 py-1.5 text-xs bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-violet-500 appearance-none";

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 transition-colors">
            <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <Upload size={18} className="text-violet-500" /> Upload Student Answer Sheets
                </h3>
                <button onClick={addRow} className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400 rounded-lg hover:bg-violet-200 transition-colors">
                    + Add Another
                </button>
            </div>

            {/* Column headers */}
            <div className="hidden sm:grid grid-cols-[2fr_80px_2fr_2fr_32px] gap-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-1">
                <span>Answer Sheet File</span><span>Year</span><span>Branch</span><span>Student</span><span />
            </div>

            <div className="space-y-2">
                {rows.map(row => (
                    <div key={row.id} className="grid grid-cols-1 sm:grid-cols-[2fr_80px_2fr_2fr_32px] gap-2 items-center bg-gray-50 dark:bg-slate-700/50 p-2 rounded-xl border border-gray-100 dark:border-slate-700">
                        {/* File */}
                        <label className="flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg cursor-pointer hover:border-violet-400 transition-colors text-xs text-gray-500 dark:text-gray-400 hover:text-violet-600 min-w-0">
                            <FileText size={13} className="flex-shrink-0" />
                            <span className="truncate">{row.file ? row.file.name : 'Click to pick file…'}</span>
                            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={e => updateRow(row.id, { file: e.target.files[0] || null })} />
                        </label>
                        {/* Year */}
                        <select value={row.year} onChange={e => handleYearChange(row.id, e.target.value)} className={sel}>
                            <option value="">Year</option>
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                        {/* Branch */}
                        <select value={row.branch} onChange={e => handleBranchChange(row.id, e.target.value)} className={sel} disabled={!row.year}>
                            <option value="">{row.year ? '— Branch —' : 'Select year first'}</option>
                            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        {/* Student */}
                        <select value={row.studentId} onChange={e => updateRow(row.id, { studentId: e.target.value })} className={sel} disabled={!row.branch || row.loadingStudents}>
                            <option value="">
                                {row.loadingStudents ? 'Loading…' : !row.branch ? 'Select branch first' : row.students.length === 0 ? 'No students found' : '— Select Student —'}
                            </option>
                            {row.students.map(s => (
                                <option key={s.id} value={s.id}>{s.roll_number} — {s.full_name}</option>
                            ))}
                        </select>
                        {/* Remove */}
                        <button onClick={() => removeRow(row.id)} disabled={rows.length === 1}
                            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 disabled:opacity-20 rounded transition-colors">
                            <X size={15} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
                <button onClick={handleUpload} disabled={uploading || !rows.some(r => r.file && r.studentId)}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-40 transition-all shadow">
                    {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                    {uploading ? 'Uploading…' : `Upload ${rows.filter(r => r.file && r.studentId).length} Sheet(s)`}
                </button>
                <span className="text-xs text-gray-400">Select a file + Year + Branch + Student for each row.</span>
            </div>

            {result && (
                <div className={`mt-3 p-3 rounded-xl text-sm ${ result.error ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'}`}>
                    {result.error ? result.error : `✓ ${result.uploaded} uploaded, ${result.failed} failed.`}
                    {result.results?.filter(r => r.status === 'failed').map((r, i) => (
                        <div key={i} className="text-xs mt-1 opacity-80">• {r.filename}: {r.reason}</div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const PipelineMonitor = () => {
    const { user } = useContext(AuthContext);
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [examInfo, setExamInfo] = useState(null);
    const [pipelineData, setPipelineData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [isPipelineRunning, setIsPipelineRunning] = useState(false);
    const [isPublishing, setIsPublishing] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [logSubmissionId, setLogSubmissionId] = useState(null);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [apiError, setApiError] = useState(null); // {type: 'quota'|'key'|'generic', message: ''}

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
        setApiError(null);
        if (examId) fetchPipelineStatus(examId);
    };

    // Classify pipeline errors for the banner
    const classifyError = (errMsg = '') => {
        if (errMsg.includes('429') || errMsg.toLowerCase().includes('rate') || errMsg.toLowerCase().includes('quota')) {
            return { type: 'quota', message: errMsg };
        }
        if (errMsg.includes('401') || errMsg.includes('403') || errMsg.toLowerCase().includes('api key') || errMsg.toLowerCase().includes('invalid key')) {
            return { type: 'key', message: errMsg };
        }
        return { type: 'generic', message: errMsg };
    };

    const handleRunPipeline = async () => {
        if (!selectedExamId) return;
        if (!window.confirm('Start AI evaluation pipeline for all pending submissions? This runs in the background.')) return;

        setIsPipelineRunning(true);
        setApiError(null);
        try {
            const r = await api.post(`/api/pipeline/run/${selectedExamId}`);
            alert(r.data.message);
            setAutoRefresh(true);
            setTimeout(() => fetchPipelineStatus(selectedExamId), 1500);
        } catch (e) {
            const msg = e.response?.data?.error || e.message || 'Failed to start pipeline.';
            const classified = classifyError(msg);
            setApiError(classified);
            if (classified.type === 'generic') alert(msg);
        } finally {
            setIsPipelineRunning(false);
        }
    };

    const handleResetFailed = async () => {
        if (!selectedExamId) return;
        setIsResetting(true);
        try {
            const r = await api.post(`/api/pipeline/reset-failed/${selectedExamId}`);
            alert(r.data.message);
            fetchPipelineStatus(selectedExamId);
        } catch (e) {
            alert(e.response?.data?.error || 'Failed to reset.');
        } finally {
            setIsResetting(false);
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

    // When pipeline status has failed entries, auto-classify their error messages
    useEffect(() => {
        if (!pipelineData) return;
        const failedSub = pipelineData.submissions?.find(s => s.pipeline_status === 'failed' && s.error_message);
        if (failedSub && !apiError) {
            const classified = classifyError(failedSub.error_message);
            if (classified.type !== 'generic') setApiError(classified);
        }
    }, [pipelineData]);

    const stats = pipelineData?.stats;
    const hasFailed = stats?.failed > 0;
    const submissions = (pipelineData?.submissions || []).filter(s => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return s.student_name?.toLowerCase().includes(q) || s.prn_number?.includes(q);
    });

    return (
        <div className="max-w-7xl mx-auto space-y-5">
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
                <p className="text-purple-200 mt-2 max-w-2xl text-sm">
                    Upload student answer sheets · Run AI evaluation · Monitor progress · Publish results
                </p>
                {/* Step guide */}
                <div className="mt-5 flex flex-wrap gap-2">
                    {['1. Upload Answer Sheets', '2. Run AI Pipeline', '3. Monitor Progress', '4. Publish Results'].map((step, i) => (
                        <span key={i} className="px-3 py-1 bg-white/10 border border-white/20 text-white text-xs rounded-full font-medium">{step}</span>
                    ))}
                </div>
            </div>

            {/* API Error Banner */}
            {apiError && <APIErrorBanner error={apiError} onDismiss={() => setApiError(null)} />}

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
                                    <option value="">— Choose exam —</option>
                                    {exams.map(ex => (
                                        <option key={ex.id} value={ex.id}>#{ex.id} — {ex.course_code} — {ex.exam_name}</option>
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
                                className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors"
                            >
                                <RefreshCw size={14} /> Refresh
                            </button>
                            <button
                                onClick={() => setAutoRefresh(v => !v)}
                                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-xl transition-colors ${
                                    autoRefresh ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
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
                            {hasFailed && (
                                <button
                                    onClick={handleResetFailed}
                                    disabled={isResetting}
                                    className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 hover:bg-amber-200 dark:hover:bg-amber-900/50 rounded-xl transition-colors disabled:opacity-50"
                                    title="Reset failed submissions so they can be re-evaluated"
                                >
                                    {isResetting ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
                                    Retry Failed
                                </button>
                            )}
                            {examInfo && (
                                <button
                                    onClick={() => handlePublishToggle(!examInfo.results_published)}
                                    disabled={isPublishing}
                                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl transition-all disabled:opacity-50 ${
                                        examInfo.results_published
                                            ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-900/60'
                                            : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                                    }`}
                                >
                                    {examInfo.results_published ? <Globe size={14} /> : <GlobeLock size={14} />}
                                    {isPublishing ? 'Saving...' : examInfo.results_published ? 'Published ✓' : 'Publish Results'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Bulk Upload Panel */}
            {selectedExamId && (
                <BulkUploadPanel examId={selectedExamId} onUploadDone={() => fetchPipelineStatus(selectedExamId)} />
            )}

            {/* Loading State */}
            {isLoading && !pipelineData && (
                <div className="flex items-center justify-center py-16 text-gray-400 dark:text-gray-500">
                    <Loader2 className="animate-spin mr-3" size={24} /> Fetching pipeline data...
                </div>
            )}

            {/* Stats Row */}
            {stats && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <StatPill label="Total"      value={stats.total}      color="border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-gray-900 dark:text-white" />
                    <StatPill label="Uploaded"   value={stats.uploaded}   color="border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-gray-400" />
                    <StatPill label="Evaluating" value={stats.evaluating} color="border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" />
                    <StatPill label="Completed"  value={stats.completed}  color="border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" />
                    <StatPill label="Failed"     value={stats.failed}     color="border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400" />
                </div>
            )}

            {/* Progress bar */}
            {stats && stats.total > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 transition-colors">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Overall Pipeline Progress</span>
                        <span className="text-sm font-black text-gray-900 dark:text-white">{stats.completed} / {stats.total} completed</span>
                    </div>
                    <div className="h-3 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden flex gap-0.5">
                        <div className="bg-emerald-500 transition-all duration-700" style={{ width: `${(stats.completed / stats.total) * 100}%` }} />
                        <div className="bg-blue-500 transition-all duration-700"    style={{ width: `${(stats.evaluating / stats.total) * 100}%` }} />
                        <div className="bg-red-400 transition-all duration-700"     style={{ width: `${(stats.failed / stats.total) * 100}%` }} />
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
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
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                placeholder="Search student or PRN..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-8 pr-3 py-1.5 text-xs text-gray-900 dark:text-gray-100 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-violet-500 w-52"
                            />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-gray-50 dark:bg-slate-800 border-b border-gray-100 dark:border-slate-700">
                                    <th className="px-5 py-3">Student</th>
                                    <th className="px-5 py-3">PRN</th>
                                    <th className="px-5 py-3 text-center">Pipeline Status</th>
                                    <th className="px-5 py-3 text-center">Score</th>
                                    <th className="px-5 py-3 max-w-xs">Error / Info</th>
                                    <th className="px-5 py-3 text-right">Logs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                {submissions.length === 0 ? (
                                    <tr>
                                        <td colSpan="6" className="py-12 text-center text-gray-400 dark:text-gray-500 italic">
                                            {searchQuery ? 'No matches found.' : 'No submissions yet. Upload answer sheets above.'}
                                        </td>
                                    </tr>
                                ) : submissions.map((sub, i) => (
                                    <tr key={i} className={`transition-colors hover:bg-gray-50/50 dark:hover:bg-slate-700/50 ${
                                        sub.pipeline_status === 'failed'    ? 'bg-red-50/20 dark:bg-red-900/10' :
                                        sub.pipeline_status === 'evaluating' || sub.pipeline_status === 'extracting' ? 'bg-blue-50/20 dark:bg-blue-900/10' : ''
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
                                        <td className="px-5 py-3.5 text-center"><PipelineBadge status={sub.pipeline_status} /></td>
                                        <td className="px-5 py-3.5 text-center">
                                            {sub.total_score !== null && sub.total_score !== undefined ? (
                                                <span className="text-base font-black text-gray-900 dark:text-white">{sub.total_score}</span>
                                            ) : <span className="text-gray-300 dark:text-gray-600">—</span>}
                                        </td>
                                        <td className="px-5 py-3.5 max-w-[220px]">
                                            {sub.error_message ? (
                                                <p className="text-xs text-red-600 dark:text-red-400 truncate" title={sub.error_message}>
                                                    {sub.error_message}
                                                </p>
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
