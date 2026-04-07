import React, { useState, useEffect, useRef } from 'react';
import {
    BookOpen, Search, Plus, Trash2, X, Loader2, Calendar, PlayCircle,
    UploadCloud, FileText, CheckCircle2, Clock, AlertCircle, Users
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';

const AdminExamManagement = () => {
    const [exams, setExams] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Create Exam
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ course_code: '', exam_name: '' });
    const [isCreating, setIsCreating] = useState(false);

    // Upload Answer Key
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadExamId, setUploadExamId] = useState(null);
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Delete
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Evaluation
    const [evaluatingExams, setEvaluatingExams] = useState({});

    // Submission counts
    const [examDetails, setExamDetails] = useState([]);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);

    useEffect(() => {
        fetchExams();
        fetchExamDetails();
    }, []);

    const fetchExams = async () => {
        try {
            const response = await api.get('/api/exams');
            setExams(response.data);
        } catch (err) {
            toast.error('Failed to load exams.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchExamDetails = async () => {
        try {
            const response = await api.get('/api/dashboard/coordinator/exams');
            setExamDetails(response.data);
        } catch (err) {
            console.error('Failed to fetch exam details:', err);
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const getExamDetail = (examId) => examDetails.find(d => d.id === examId) || {};

    const filteredExams = exams.filter(exam => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
            exam.course_code?.toLowerCase().includes(q) ||
            exam.exam_name?.toLowerCase().includes(q) ||
            exam.created_by_name?.toLowerCase().includes(q) ||
            String(exam.id).includes(q)
        );
    });

    const handleCreateExam = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await api.post('/api/exams/create', createForm);
            toast.success('Exam created successfully!');
            setShowCreateModal(false);
            setCreateForm({ course_code: '', exam_name: '' });
            fetchExams();
            fetchExamDetails();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create exam.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleUploadAnswerKey = async () => {
        if (!uploadFile || !uploadExamId) return;
        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', uploadFile);
        try {
            await api.post(`/api/exams/${uploadExamId}/model-answer`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Answer key uploaded successfully!');
            setShowUploadModal(false);
            setUploadFile(null);
            fetchExams();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to upload answer key. You may not be the owner of this exam.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleDeleteExam = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/api/admin/exams/${deleteTarget.id}`);
            toast.success(`Exam "${deleteTarget.course_code} — ${deleteTarget.exam_name}" deleted.`);
            setShowDeleteModal(false);
            setDeleteTarget(null);
            fetchExams();
            fetchExamDetails();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete exam.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleTriggerEvaluation = async (examId) => {
        setEvaluatingExams(prev => ({ ...prev, [examId]: true }));
        try {
            const response = await api.post(`/api/evaluate/exam/${examId}`);
            toast.success(response.data.message);
            fetchExamDetails();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to trigger evaluation.');
        } finally {
            setEvaluatingExams(prev => ({ ...prev, [examId]: false }));
        }
    };

    const getStatusBadge = (detail) => {
        const total = parseInt(detail.totalSubmissions || 0);
        const graded = parseInt(detail.gradedCount || 0);
        const pending = parseInt(detail.pendingCount || 0);

        if (total === 0) return { label: 'No Submissions', style: 'bg-gray-100 text-gray-500', icon: AlertCircle };
        if (pending === 0 && graded > 0) return { label: 'Completed', style: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
        if (graded > 0 && pending > 0) return { label: 'Partial', style: 'bg-blue-100 text-blue-700', icon: Clock };
        return { label: 'Pending', style: 'bg-amber-100 text-amber-700', icon: Clock };
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <BookOpen className="text-violet-500" size={28} /> Exam Management
                    </h2>
                    <p className="text-gray-500 mt-1">Create, manage, and control all examinations system-wide.</p>
                </div>
                <button onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all duration-300">
                    <Plus size={18} /> Create Exam
                </button>
            </div>

            {/* Exam Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/30 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="relative w-full sm:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by course code, title, or instructor..."
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm transition-all" />
                    </div>
                    <span className="text-sm text-gray-400 font-medium">{filteredExams.length} exams found</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Exam</th>
                                <th className="px-6 py-4 font-semibold">Instructor</th>
                                <th className="px-6 py-4 font-semibold text-center">Submissions</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                                <th className="px-6 py-4 font-semibold">Answer Key</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan="6" className="px-6 py-16 text-center text-gray-400"><Loader2 className="animate-spin inline-block mr-2" size={20} />Loading exams...</td></tr>
                            ) : filteredExams.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-16 text-center text-gray-400 italic">No exams found.</td></tr>
                            ) : (
                                filteredExams.map(exam => {
                                    const detail = getExamDetail(exam.id);
                                    const status = getStatusBadge(detail);
                                    const StatusIcon = status.icon;
                                    const pending = parseInt(detail.pendingCount || 0);

                                    return (
                                        <tr key={exam.id} className="hover:bg-violet-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2.5 bg-violet-100 text-violet-600 rounded-xl flex-shrink-0">
                                                        <BookOpen size={16} />
                                                    </div>
                                                    <div>
                                                        <span className="font-bold text-gray-900 text-sm">{exam.course_code}</span>
                                                        <span className="block text-xs text-gray-500">{exam.exam_name}</span>
                                                        <span className="block text-[10px] text-gray-400 font-mono mt-0.5">ID #{exam.id} · {new Date(exam.created_at).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                                                        {exam.created_by_name?.split(' ').map(n => n[0]).join('').substring(0,2)}
                                                    </div>
                                                    <span className="text-sm text-gray-700 font-medium">{exam.created_by_name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="text-lg font-black text-gray-900">{detail.totalSubmissions || 0}</span>
                                                <span className="block text-[10px] text-gray-400">
                                                    {detail.gradedCount || 0} graded / {detail.pendingCount || 0} pending
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${status.style}`}>
                                                    <StatusIcon size={12} /> {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                {exam.model_answer_path ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-semibold">
                                                        <CheckCircle2 size={14} /> Uploaded
                                                    </span>
                                                ) : (
                                                    <button onClick={() => { setUploadExamId(exam.id); setShowUploadModal(true); }}
                                                        className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-700 text-xs font-semibold hover:underline">
                                                        <UploadCloud size={14} /> Upload
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => handleTriggerEvaluation(exam.id)}
                                                        disabled={evaluatingExams[exam.id] || pending === 0}
                                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                                            evaluatingExams[exam.id]
                                                                ? 'bg-amber-100 text-amber-700 cursor-not-allowed'
                                                                : pending === 0
                                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-700 hover:to-indigo-700 shadow-sm'
                                                        }`}>
                                                        {evaluatingExams[exam.id] ? (
                                                            <><div className="animate-spin h-3 w-3 border-2 border-amber-600 border-t-transparent rounded-full"></div> AI...</>
                                                        ) : (
                                                            <><PlayCircle size={14} /> Evaluate</>
                                                        )}
                                                    </button>
                                                    <button onClick={() => { setDeleteTarget(exam); setShowDeleteModal(true); }}
                                                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ==================== CREATE EXAM MODAL ==================== */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><Plus size={20} className="text-violet-500" /> Create Exam</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateExam} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Course Code *</label>
                                <input type="text" required value={createForm.course_code}
                                    onChange={e => setCreateForm({...createForm, course_code: e.target.value.toUpperCase()})}
                                    placeholder="CS304" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm font-mono uppercase" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Exam Name *</label>
                                <input type="text" required value={createForm.exam_name}
                                    onChange={e => setCreateForm({...createForm, exam_name: e.target.value})}
                                    placeholder="Database Management Systems - MSE-I" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-500 text-sm" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
                                <button type="submit" disabled={isCreating}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 rounded-xl disabled:opacity-50 shadow-lg shadow-violet-500/25">
                                    {isCreating ? <><Loader2 className="animate-spin" size={16} /> Creating...</> : <><Plus size={16} /> Create Exam</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==================== UPLOAD ANSWER KEY MODAL ==================== */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowUploadModal(false); setUploadFile(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><UploadCloud size={20} className="text-blue-500" /> Upload Answer Key</h3>
                            <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl text-sm text-blue-700">
                                Uploading model answer key for Exam <strong>#{uploadExamId}</strong>
                            </div>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${uploadFile ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'}`}>
                                <input type="file" ref={fileInputRef} accept="application/pdf" className="hidden"
                                    onChange={e => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]); }} />
                                {uploadFile ? (
                                    <div className="flex flex-col items-center">
                                        <FileText size={32} className="text-emerald-500 mb-2" />
                                        <p className="font-bold text-gray-900 text-sm">{uploadFile.name}</p>
                                        <p className="text-xs text-gray-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <UploadCloud size={32} className="text-gray-400 mb-2" />
                                        <p className="font-bold text-gray-700 text-sm">Click to select PDF</p>
                                        <p className="text-xs text-gray-400 mt-1">Max 15MB</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
                                <button onClick={handleUploadAnswerKey} disabled={!uploadFile || isUploading}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                                    {isUploading ? <><Loader2 className="animate-spin" size={16} /> Uploading...</> : <><UploadCloud size={16} /> Upload</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ==================== DELETE EXAM MODAL ==================== */}
            {showDeleteModal && deleteTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <Trash2 size={24} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mb-2">Delete Exam?</h3>
                            <p className="text-sm text-gray-500">
                                This will permanently delete <strong>"{deleteTarget.course_code} — {deleteTarget.exam_name}"</strong> along with all its submissions, rubrics, and evaluations.
                            </p>
                        </div>
                        <div className="flex gap-3 p-6 pt-0">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
                            <button onClick={handleDeleteExam} disabled={isDeleting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50">
                                {isDeleting ? <><Loader2 className="animate-spin" size={16} /> Deleting...</> : <><Trash2 size={16} /> Delete</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminExamManagement;
