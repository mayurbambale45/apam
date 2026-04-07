import React, { useState, useEffect, useRef } from 'react';
import {
    FileText, Search, UploadCloud, Loader2, CheckCircle2, Clock,
    AlertCircle, BookOpen, GraduationCap, Eye, X
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';
import FeedbackViewer from '../../components/student/FeedbackViewer';

const AdminSubmissions = () => {
    const [exams, setExams] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);
    const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);

    // Upload
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadForm, setUploadForm] = useState({ exam_id: '', student_id: '' });
    const [uploadFile, setUploadFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Feedback viewer
    const [viewEvalId, setViewEvalId] = useState(null);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await api.get('/api/exams');
                setExams(response.data);
            } catch (err) { console.error(err); }
            finally { setIsLoadingExams(false); }
        };
        const fetchStudents = async () => {
            try {
                const response = await api.get('/api/auth/users?role=student');
                setStudents(response.data);
            } catch (err) { console.error(err); }
            finally { setIsLoadingStudents(false); }
        };
        fetchExams();
        fetchStudents();
    }, []);

    const fetchSubmissions = async (examId) => {
        if (!examId) { setSubmissions([]); return; }
        setIsLoadingSubmissions(true);
        try {
            const response = await api.get(`/api/submissions/exam/${examId}`);
            setSubmissions(response.data);
        } catch (err) {
            toast.error('Failed to load submissions.');
            setSubmissions([]);
        } finally {
            setIsLoadingSubmissions(false);
        }
    };

    const handleExamChange = (examId) => {
        setSelectedExamId(examId);
        fetchSubmissions(examId);
    };

    const handleUploadSubmission = async () => {
        if (!uploadFile || !uploadForm.exam_id || !uploadForm.student_id) {
            toast.error('Select an exam, student, and PDF file.');
            return;
        }
        setIsUploading(true);
        const formData = new FormData();
        formData.append('exam_id', uploadForm.exam_id);
        formData.append('student_id', uploadForm.student_id);
        formData.append('file', uploadFile);
        try {
            await api.post('/api/submissions/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success('Submission uploaded and linked!');
            setShowUploadModal(false);
            setUploadFile(null);
            setUploadForm({ exam_id: '', student_id: '' });
            if (selectedExamId) fetchSubmissions(selectedExamId);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Upload failed.');
        } finally {
            setIsUploading(false);
        }
    };

    const getStatusBadge = (status) => {
        if (status === 'graded') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700"><CheckCircle2 size={12} /> Graded</span>;
        if (status === 'processing') return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700"><Loader2 size={12} className="animate-spin" /> Processing</span>;
        return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700"><Clock size={12} /> Uploaded</span>;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <FileText className="text-emerald-500" size={28} /> Submission Management
                    </h2>
                    <p className="text-gray-500 mt-1">View, upload, and track all student answer script submissions.</p>
                </div>
                <button onClick={() => setShowUploadModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300">
                    <UploadCloud size={18} /> Upload Submission
                </button>
            </div>

            {/* Exam Selector */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <label className="block text-sm font-bold text-gray-700 mb-2">Select Exam to View Submissions</label>
                {isLoadingExams ? (
                    <div className="text-gray-400 text-sm py-2">Loading exams...</div>
                ) : (
                    <select value={selectedExamId} onChange={e => handleExamChange(e.target.value)}
                        className="w-full max-w-xl px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-emerald-500 text-sm transition-all">
                        <option value="">— Select an Exam —</option>
                        {exams.map(exam => (
                            <option key={exam.id} value={exam.id}>
                                #{exam.id} — {exam.course_code} — {exam.exam_name}
                            </option>
                        ))}
                    </select>
                )}
            </div>

            {/* Submissions Table */}
            {selectedExamId && (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/30 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 text-sm">Submissions for Exam #{selectedExamId}</h3>
                        <span className="text-xs text-gray-400">{submissions.length} total</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">Student</th>
                                    <th className="px-6 py-4 font-semibold">PRN / Roll</th>
                                    <th className="px-6 py-4 font-semibold text-center">Status</th>
                                    <th className="px-6 py-4 font-semibold text-center">Score</th>
                                    <th className="px-6 py-4 font-semibold">Uploaded</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {isLoadingSubmissions ? (
                                    <tr><td colSpan="6" className="px-6 py-16 text-center text-gray-400"><Loader2 className="animate-spin inline-block mr-2" size={20} />Loading...</td></tr>
                                ) : submissions.length === 0 ? (
                                    <tr><td colSpan="6" className="px-6 py-16 text-center text-gray-400 italic">No submissions for this exam yet.</td></tr>
                                ) : (
                                    submissions.map(sub => (
                                        <tr key={sub.id} className="hover:bg-emerald-50/30 transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                                                        {sub.studentName?.split(' ').map(n => n[0]).join('').substring(0,2)}
                                                    </div>
                                                    <span className="font-semibold text-gray-900 text-sm">{sub.studentName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="text-sm text-gray-700 font-mono">{sub.prnNumber || '—'}</span>
                                                <span className="block text-xs text-gray-400">{sub.rollNumber || ''}</span>
                                            </td>
                                            <td className="px-6 py-4 text-center">{getStatusBadge(sub.status)}</td>
                                            <td className="px-6 py-4 text-center">
                                                {sub.total_score !== null && sub.total_score !== undefined ? (
                                                    <span className="text-lg font-black text-gray-900">{sub.total_score}</span>
                                                ) : (
                                                    <span className="text-gray-300">—</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-xs">
                                                {new Date(sub.upload_timestamp).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {sub.total_score !== null && sub.total_score !== undefined && (
                                                    <button onClick={() => setViewEvalId(viewEvalId === sub.id ? null : sub.id)}
                                                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-colors">
                                                        <Eye size={14} /> View Feedback
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Feedback Detail Panel */}
            {viewEvalId && (
                <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-bold text-gray-900 flex items-center gap-2"><Eye size={16} className="text-emerald-500" /> Evaluation Detail</h3>
                        <button onClick={() => setViewEvalId(null)} className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-lg"><X size={18} /></button>
                    </div>
                    <div className="p-4">
                        <FeedbackViewer evaluationId={viewEvalId} hideBackButton={true} />
                    </div>
                </div>
            )}

            {/* ==================== UPLOAD SUBMISSION MODAL ==================== */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => { setShowUploadModal(false); setUploadFile(null); }}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><UploadCloud size={20} className="text-emerald-500" /> Upload Submission</h3>
                            <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Target Exam *</label>
                                    {isLoadingExams ? <div className="text-sm text-gray-400 py-2">Loading...</div> : (
                                        <select required value={uploadForm.exam_id} onChange={e => setUploadForm({...uploadForm, exam_id: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm">
                                            <option value="">Select Exam...</option>
                                            {exams.map(exam => <option key={exam.id} value={exam.id}>#{exam.id} — {exam.course_code}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Target Student *</label>
                                    {isLoadingStudents ? <div className="text-sm text-gray-400 py-2">Loading...</div> : (
                                        <select required value={uploadForm.student_id} onChange={e => setUploadForm({...uploadForm, student_id: e.target.value})}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm">
                                            <option value="">Select Student...</option>
                                            {students.map(s => <option key={s.id} value={s.id}>PRN: {s.prn_number || s.id} — {s.full_name}</option>)}
                                        </select>
                                    )}
                                </div>
                            </div>
                            <div onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${uploadFile ? 'border-emerald-300 bg-emerald-50/30' : 'border-gray-300 hover:border-emerald-400'}`}>
                                <input type="file" ref={fileInputRef} accept="application/pdf" className="hidden"
                                    onChange={e => { if (e.target.files?.[0]) setUploadFile(e.target.files[0]); }} />
                                {uploadFile ? (
                                    <div className="flex flex-col items-center">
                                        <FileText size={28} className="text-emerald-500 mb-2" />
                                        <p className="font-bold text-gray-900 text-sm">{uploadFile.name}</p>
                                        <p className="text-xs text-gray-500">{(uploadFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <UploadCloud size={28} className="text-gray-400 mb-2" />
                                        <p className="font-bold text-gray-700 text-sm">Click to select student answer PDF</p>
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 pt-2">
                                <button onClick={() => { setShowUploadModal(false); setUploadFile(null); }} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
                                <button onClick={handleUploadSubmission} disabled={!uploadFile || !uploadForm.exam_id || !uploadForm.student_id || isUploading}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 rounded-xl disabled:opacity-50 shadow-lg shadow-emerald-500/25">
                                    {isUploading ? <><Loader2 className="animate-spin" size={16} /> Uploading...</> : <><UploadCloud size={16} /> Upload & Link</>}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSubmissions;
