import React, { useState, useEffect } from 'react';
import {
    MessageSquare, CheckCheck, Clock, AlertTriangle, Loader2,
    User, BookOpen, ChevronDown, ChevronUp, X, Send, ShieldCheck,
    RefreshCw
} from 'lucide-react';
import api from '../../utils/api';

const TeacherGrievances = () => {
    const [grievances, setGrievances] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [expandedId, setExpandedId] = useState(null);

    // Resolve modal state
    const [resolveModal, setResolveModal] = useState({ open: false, grievance: null });
    const [newScore, setNewScore] = useState('');
    const [teacherNote, setTeacherNote] = useState('');
    const [isResolving, setIsResolving] = useState(false);
    const [resolveError, setResolveError] = useState('');

    const fetchGrievances = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/dashboard/teacher/grievances');
            setGrievances(res.data);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load grievances.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchGrievances(); }, []);

    const openResolveModal = (grievance) => {
        setResolveModal({ open: true, grievance });
        setNewScore(String(grievance.currentScore ?? ''));
        setTeacherNote('');
        setResolveError('');
    };

    const closeResolveModal = () => {
        setResolveModal({ open: false, grievance: null });
        setNewScore('');
        setTeacherNote('');
        setResolveError('');
    };

    const handleResolve = async () => {
        const score = parseFloat(newScore);
        if (isNaN(score) || score < 0) {
            setResolveError('Please enter a valid non-negative score.');
            return;
        }
        setIsResolving(true);
        setResolveError('');
        try {
            await api.put(`/api/dashboard/teacher/grievance/${resolveModal.grievance.grievanceId}/resolve`, {
                newScore: score,
                teacherNote: teacherNote.trim() || null
            });
            await fetchGrievances();
            closeResolveModal();
        } catch (err) {
            setResolveError(err.response?.data?.error || 'Failed to resolve grievance.');
        } finally {
            setIsResolving(false);
        }
    };

    const pendingCount = grievances.filter(g => g.status === 'pending').length;
    const resolvedCount = grievances.filter(g => g.status === 'resolved').length;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                        <MessageSquare className="text-amber-500" size={28} /> Student Grievances
                    </h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Review student grievances and update marks accordingly.</p>
                </div>
                <button onClick={fetchGrievances}
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <RefreshCw size={15} /> Refresh
                </button>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-3">
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-5 py-3 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg"><MessageSquare size={16} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Total</p>
                        <p className="text-lg font-black text-gray-900 dark:text-white">{grievances.length}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-5 py-3 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg"><Clock size={16} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pending</p>
                        <p className="text-lg font-black text-amber-600 dark:text-amber-400">{pendingCount}</p>
                    </div>
                </div>
                <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 px-5 py-3 rounded-2xl flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg"><CheckCheck size={16} /></div>
                    <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Resolved</p>
                        <p className="text-lg font-black text-emerald-600 dark:text-emerald-400">{resolvedCount}</p>
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800/30 flex items-center gap-2">
                    <AlertTriangle size={18} /> {error}
                </div>
            )}

            {/* Grievances List */}
            <div className="space-y-3">
                {isLoading ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-16 text-center text-gray-400 dark:text-gray-500">
                        <Loader2 className="animate-spin inline-block mr-2" size={20} />Loading grievances...
                    </div>
                ) : grievances.length === 0 ? (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 p-16 text-center">
                        <MessageSquare size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3" />
                        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">No Grievances</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500">No students have raised grievances for your exams yet.</p>
                    </div>
                ) : (
                    grievances.map(g => {
                        const isPending = g.status === 'pending';
                        const isExpanded = expandedId === g.grievanceId;
                        return (
                            <div key={g.grievanceId}
                                className={`bg-white dark:bg-slate-800 rounded-2xl border transition-all shadow-sm ${isPending
                                    ? 'border-amber-200 dark:border-amber-800/50'
                                    : 'border-emerald-200 dark:border-emerald-800/30'
                                    }`}>
                                {/* Grievance Card Header */}
                                <div className="p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                                    {/* Status Badge */}
                                    <div className={`flex-shrink-0 p-2.5 rounded-xl ${isPending
                                        ? 'bg-amber-100 dark:bg-amber-900/30'
                                        : 'bg-emerald-100 dark:bg-emerald-900/30'
                                        }`}>
                                        {isPending
                                            ? <Clock className="text-amber-600 dark:text-amber-400" size={20} />
                                            : <CheckCheck className="text-emerald-600 dark:text-emerald-400" size={20} />
                                        }
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2 mb-1">
                                            <span className="font-black text-gray-900 dark:text-white">{g.studentName}</span>
                                            <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{g.prnNumber}</span>
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${isPending
                                                ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                                                : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                                                }`}>
                                                {isPending ? <Clock size={10} /> : <CheckCheck size={10} />}
                                                {g.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-1.5">
                                            <BookOpen size={12} className="text-indigo-400" />
                                            {g.courseCode} — {g.examName}
                                        </p>
                                        <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-gray-400 dark:text-gray-500">
                                            <span>Current Score: <strong className="text-gray-700 dark:text-gray-300">{g.currentScore ?? '—'}</strong></span>
                                            {!isPending && <span>Updated Score: <strong className="text-emerald-600 dark:text-emerald-400">{g.teacherMarks}</strong></span>}
                                            <span>Raised: {new Date(g.raisedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                            {g.resolvedAt && <span>Resolved: {new Date(g.resolvedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <button
                                            onClick={() => setExpandedId(isExpanded ? null : g.grievanceId)}
                                            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors">
                                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                            {isExpanded ? 'Hide' : 'View Message'}
                                        </button>
                                        {isPending && (
                                            <button onClick={() => openResolveModal(g)}
                                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 rounded-xl transition-colors shadow-sm">
                                                <ShieldCheck size={14} /> Resolve & Update Marks
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Expanded: student message + teacher note */}
                                {isExpanded && (
                                    <div className="px-5 pb-5 space-y-3 border-t border-gray-100 dark:border-slate-700 pt-4">
                                        <div>
                                            <h4 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                <MessageSquare size={11} /> Student's Message
                                            </h4>
                                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                                {g.message}
                                            </div>
                                        </div>
                                        {g.teacherNote && (
                                            <div>
                                                <h4 className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                                    <ShieldCheck size={11} /> Your Note
                                                </h4>
                                                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800/30 rounded-xl p-4 text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                                                    {g.teacherNote}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>

            {/* Resolve Modal */}
            {resolveModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeResolveModal} />
                    <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700 w-full max-w-lg">
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-slate-700">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-xl">
                                    <ShieldCheck className="text-amber-600 dark:text-amber-400" size={20} />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-lg">Resolve Grievance</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        {resolveModal.grievance?.studentName} — {resolveModal.grievance?.courseCode}
                                    </p>
                                </div>
                            </div>
                            <button onClick={closeResolveModal}
                                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-xl transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-4">
                            {/* Student's message summary */}
                            <div>
                                <h4 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">Student's Grievance</h4>
                                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800/30 rounded-xl p-3 text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                                    {resolveModal.grievance?.message}
                                </div>
                            </div>

                            {/* Score input */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Updated Score *
                                </label>
                                <div className="flex items-center gap-3">
                                    <div className="flex-1">
                                        <input
                                            type="number"
                                            step="0.5"
                                            min="0"
                                            value={newScore}
                                            onChange={e => { setNewScore(e.target.value); setResolveError(''); }}
                                            placeholder="Enter new total score"
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    <div className="bg-gray-100 dark:bg-slate-700 rounded-xl px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center min-w-[100px]">
                                        Was: <strong className="text-gray-900 dark:text-white">{resolveModal.grievance?.currentScore ?? '—'}</strong>
                                    </div>
                                </div>
                            </div>

                            {/* Teacher note */}
                            <div>
                                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                    Resolution Note <span className="text-gray-400 font-normal">(optional)</span>
                                </label>
                                <textarea
                                    value={teacherNote}
                                    onChange={e => setTeacherNote(e.target.value)}
                                    placeholder="e.g. After reviewing, I agree Q3 deserved 4 marks. Updating score accordingly."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none transition-all placeholder-gray-400 dark:placeholder-gray-500"
                                />
                            </div>

                            {resolveError && (
                                <p className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1.5">
                                    <AlertTriangle size={14} /> {resolveError}
                                </p>
                            )}

                            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/30 rounded-xl p-3">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                    ⓘ This will update the student's score to the new value and mark the grievance as resolved. The student will no longer be able to raise another grievance for this evaluation.
                                </p>
                            </div>
                        </div>

                        {/* Modal Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 dark:border-slate-700">
                            <button onClick={closeResolveModal}
                                className="px-5 py-2.5 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-xl transition-colors">
                                Cancel
                            </button>
                            <button
                                onClick={handleResolve}
                                disabled={isResolving || newScore === '' || isNaN(parseFloat(newScore))}
                                className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 dark:disabled:bg-emerald-900 rounded-xl transition-colors disabled:cursor-not-allowed shadow-sm">
                                {isResolving ? (
                                    <><Loader2 size={16} className="animate-spin" /> Resolving...</>
                                ) : (
                                    <><CheckCheck size={16} /> Resolve & Update Marks</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeacherGrievances;
