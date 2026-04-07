import React, { useState, useEffect } from 'react';
import {
    FileText, Search, Loader2, CheckCircle2, Clock, AlertTriangle,
    Eye, X, Download, BookOpen
} from 'lucide-react';
import api from '../../utils/api';
import FeedbackViewer from '../../components/student/FeedbackViewer';

const TeacherSubmissions = () => {
    const [exams, setExams] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [submissions, setSubmissions] = useState([]);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Feedback Detail Panel
    const [viewEvalId, setViewEvalId] = useState(null);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await api.get('/api/exams');
                setExams(response.data);
            } catch (err) { console.error(err); }
            finally { setIsLoadingExams(false); }
        };
        fetchExams();
    }, []);

    const fetchSubmissions = async (examId) => {
        if (!examId) { setSubmissions([]); return; }
        setIsLoadingSubmissions(true);
        setViewEvalId(null);
        try {
            const response = await api.get(`/api/submissions/exam/${examId}`);
            setSubmissions(response.data);
        } catch (err) {
            console.error('Failed to load submissions:', err);
            setSubmissions([]);
        } finally {
            setIsLoadingSubmissions(false);
        }
    };

    const handleExamChange = (examId) => {
        setSelectedExamId(examId);
        setSearchQuery('');
        fetchSubmissions(examId);
    };

    const filteredSubmissions = submissions.filter(sub => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return sub.studentName?.toLowerCase().includes(q) ||
            sub.prnNumber?.includes(q) ||
            sub.rollNumber?.includes(q);
    });

    const gradedCount = submissions.filter(s => s.status === 'graded').length;
    const pendingCount = submissions.filter(s => s.status !== 'graded').length;

    const getStatusBadge = (sub) => {
        if (sub.status === 'graded') return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700">
                <CheckCircle2 size={12} /> Graded
            </span>
        );
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700">
                <Clock size={12} /> Pending
            </span>
        );
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <FileText className="text-indigo-500" size={28} /> Student Submissions
                </h2>
                <p className="text-gray-500 mt-1">View all student answer scripts submitted for your examinations.</p>
            </div>

            {/* Exam Selector + Stats */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Select Exam</label>
                        {isLoadingExams ? (
                            <div className="text-gray-400 text-sm py-2">Loading exams...</div>
                        ) : (
                            <select value={selectedExamId} onChange={e => handleExamChange(e.target.value)}
                                className="w-full max-w-xl px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 text-sm transition-all">
                                <option value="">— Select an Exam —</option>
                                {exams.map(exam => (
                                    <option key={exam.id} value={exam.id}>
                                        #{exam.id} — {exam.course_code} — {exam.exam_name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {selectedExamId && submissions.length > 0 && (
                        <div className="flex gap-3">
                            <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-xl text-center min-w-[100px]">
                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Graded</p>
                                <p className="text-xl font-black text-emerald-700">{gradedCount}</p>
                            </div>
                            <div className="bg-amber-50 border border-amber-200 px-4 py-2 rounded-xl text-center min-w-[100px]">
                                <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Pending</p>
                                <p className="text-xl font-black text-amber-700">{pendingCount}</p>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl text-center min-w-[100px]">
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Total</p>
                                <p className="text-xl font-black text-blue-700">{submissions.length}</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Split Layout: Table + Detail */}
            {selectedExamId && (
                <div className="flex flex-col xl:flex-row gap-6">
                    {/* Submissions Table */}
                    <div className={`transition-all duration-300 ${viewEvalId ? 'xl:w-1/2' : 'w-full'}`}>
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="p-4 border-b border-gray-100 bg-gray-50/30">
                                <div className="relative max-w-sm">
                                    <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                                    <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                                        placeholder="Search by student name or PRN..."
                                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 transition-all" />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider">
                                            <th className="px-5 py-3.5 font-semibold">Student</th>
                                            <th className="px-5 py-3.5 font-semibold">PRN</th>
                                            <th className="px-5 py-3.5 font-semibold text-center">Status</th>
                                            <th className="px-5 py-3.5 font-semibold text-center">Score</th>
                                            <th className="px-5 py-3.5 font-semibold text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {isLoadingSubmissions ? (
                                            <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-400"><Loader2 className="animate-spin inline-block mr-2" size={18} />Loading...</td></tr>
                                        ) : filteredSubmissions.length === 0 ? (
                                            <tr><td colSpan="5" className="px-5 py-12 text-center text-gray-400 italic">{searchQuery ? 'No matches found.' : 'No submissions yet.'}</td></tr>
                                        ) : (
                                            filteredSubmissions.map(sub => {
                                                const isSelected = viewEvalId === sub.id;
                                                return (
                                                    <tr key={sub.id} className={`transition-colors group cursor-pointer ${isSelected ? 'bg-indigo-50 border-l-4 border-indigo-500' : 'hover:bg-indigo-50/30 border-l-4 border-transparent'}`}
                                                        onClick={() => sub.total_score !== null && setViewEvalId(isSelected ? null : sub.id)}>
                                                        <td className="px-5 py-3.5">
                                                            <div className="flex items-center gap-2.5">
                                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                                                                    {sub.studentName?.split(' ').map(n => n[0]).join('').substring(0,2)}
                                                                </div>
                                                                <div>
                                                                    <span className="font-semibold text-gray-900 text-sm flex items-center gap-1.5">
                                                                        {sub.studentName}
                                                                        {sub.needsReview && <AlertTriangle size={14} className="text-amber-500" title="Flagged for review" />}
                                                                    </span>
                                                                    <span className="block text-xs text-gray-400">{sub.department}</span>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-5 py-3.5 text-gray-600 text-sm font-mono">{sub.prnNumber || '—'}</td>
                                                        <td className="px-5 py-3.5 text-center">{getStatusBadge(sub)}</td>
                                                        <td className="px-5 py-3.5 text-center">
                                                            {sub.total_score !== null && sub.total_score !== undefined ? (
                                                                <span className={`text-lg font-black ${sub.needsReview ? 'text-amber-600' : 'text-gray-900'}`}>{sub.total_score}</span>
                                                            ) : <span className="text-gray-300">—</span>}
                                                        </td>
                                                        <td className="px-5 py-3.5 text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                {sub.file_path && (
                                                                    <a href={`http://localhost:3000/${sub.file_path}`} target="_blank" rel="noopener noreferrer"
                                                                        onClick={e => e.stopPropagation()}
                                                                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Download PDF">
                                                                        <Download size={16} />
                                                                    </a>
                                                                )}
                                                                {sub.total_score !== null && (
                                                                    <button onClick={e => { e.stopPropagation(); setViewEvalId(isSelected ? null : sub.id); }}
                                                                        className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="View Feedback">
                                                                        <Eye size={16} />
                                                                    </button>
                                                                )}
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
                    </div>

                    {/* Detail Panel */}
                    {viewEvalId && (
                        <div className="xl:w-1/2">
                            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden sticky top-8">
                                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-t-2xl">
                                    <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                        <Eye className="text-indigo-600" size={16} /> AI Evaluation Detail
                                    </h3>
                                    <button onClick={() => setViewEvalId(null)}
                                        className="p-1.5 text-gray-400 hover:text-gray-900 hover:bg-gray-200 rounded-lg transition-colors">
                                        <X size={18} />
                                    </button>
                                </div>
                                <div className="p-4 max-h-[70vh] overflow-y-auto">
                                    <FeedbackViewer evaluationId={viewEvalId} hideBackButton={true} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TeacherSubmissions;
