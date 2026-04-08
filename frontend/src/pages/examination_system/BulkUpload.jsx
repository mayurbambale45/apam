import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    UploadCloud, FileText, X, CheckCircle2, AlertCircle, Loader2,
    Users, Link2, ChevronDown, Info, PlusCircle, Trash2
} from 'lucide-react';
import api from '../../utils/api';

// ─────────────────────────────────────────────────────
//  File Status Badge
// ─────────────────────────────────────────────────────
const FileBadge = ({ status, reason }) => {
    if (status === 'resolved') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
            <CheckCircle2 size={10} /> Mapped
        </span>
    );
    if (status === 'manual') return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
            <Link2 size={10} /> Manual
        </span>
    );
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700" title={reason}>
            <AlertCircle size={10} /> Unmapped
        </span>
    );
};

// ─────────────────────────────────────────────────────
//  Progress Bar
// ─────────────────────────────────────────────────────
const ProgressBar = ({ value, total, color = 'bg-blue-500' }) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0;
    return (
        <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
            </div>
            <span className="text-xs font-semibold text-gray-500 w-8 text-right">{pct}%</span>
        </div>
    );
};

// ─────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────
const BulkUpload = () => {
    const [exams, setExams] = useState([]);
    const [students, setStudents] = useState([]);
    const [selectedExamId, setSelectedExamId] = useState('');
    const [files, setFiles] = useState([]); // { file, status, student_id, reason }
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadResults, setUploadResults] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const fileInputRef = useRef(null);

    useEffect(() => {
        api.get('/api/exams')
            .then(r => setExams(r.data))
            .catch(console.error)
            .finally(() => setIsLoadingExams(false));
    }, []);

    const loadStudents = async (examId) => {
        if (!examId) { setStudents([]); return; }
        setIsLoadingStudents(true);
        try {
            const r = await api.get(`/api/pipeline/students/${examId}`);
            setStudents(r.data);
        } catch (e) {
            console.error(e);
        } finally {
            setIsLoadingStudents(false);
        }
    };

    const handleExamChange = (examId) => {
        setSelectedExamId(examId);
        setFiles([]);
        setUploadResults(null);
        loadStudents(examId);
    };

    // ─── PRN auto-detect from filename ───────────────────────────────────────
    const tryMatchPRN = useCallback((filename) => {
        const match = filename.match(/(?:PRN)?(\d{10})/i);
        if (!match) return null;
        const prn = match[1];
        // Try to find in loaded students list
        const found = students.find(s => s.prn_number === prn);
        return found ? found.id : null;
    }, [students]);

    const processDroppedFiles = useCallback((fileList) => {
        const newFiles = Array.from(fileList).map(file => {
            const autoStudentId = tryMatchPRN(file.name);
            return {
                file,
                id: crypto.randomUUID(),
                status: autoStudentId ? 'resolved' : 'unmapped',
                student_id: autoStudentId || '',
                reason: autoStudentId ? null : 'No PRN in filename'
            };
        });
        setFiles(prev => [...prev, ...newFiles]);
    }, [tryMatchPRN]);

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) processDroppedFiles(e.dataTransfer.files);
    };

    const handleFileInput = (e) => {
        if (e.target.files?.length) processDroppedFiles(e.target.files);
    };

    const updateStudentMapping = (fileId, studentId) => {
        setFiles(prev => prev.map(f => f.id === fileId ? {
            ...f,
            student_id: studentId,
            status: studentId ? 'manual' : 'unmapped'
        } : f));
    };

    const removeFile = (fileId) => {
        setFiles(prev => prev.filter(f => f.id !== fileId));
    };

    const handleBulkUpload = async () => {
        if (!selectedExamId || files.length === 0) return;

        const unmapped = files.filter(f => !f.student_id);
        if (unmapped.length > 0) {
            const confirmed = window.confirm(
                `${unmapped.length} file(s) have no student mapping and will be skipped. Continue with the rest?`
            );
            if (!confirmed) return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setUploadResults(null);

        try {
            const formData = new FormData();
            formData.append('exam_id', selectedExamId);

            // Build manual mapping JSON for files that have student assigned
            const manualMapping = {};
            files.forEach(f => {
                if (f.student_id) manualMapping[f.file.name] = f.student_id;
                formData.append('files', f.file);
            });
            formData.append('mapping', JSON.stringify(manualMapping));

            const response = await api.post('/api/pipeline/bulk-upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    if (e.total) setUploadProgress(Math.round((e.loaded / e.total) * 100));
                }
            });

            setUploadResults(response.data);
            setFiles([]);
        } catch (err) {
            alert(err.response?.data?.error || 'Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
            setUploadProgress(0);
        }
    };

    const mappedCount = files.filter(f => f.student_id).length;
    const unmappedCount = files.filter(f => !f.student_id).length;

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Page Header */}
            <div className="bg-gradient-to-br from-teal-700 via-emerald-700 to-green-800 rounded-3xl p-8 text-white shadow-xl">
                <div className="flex items-center gap-3 mb-3">
                    <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
                        <UploadCloud size={22} className="text-teal-200" />
                    </div>
                    <span className="px-3 py-1 bg-white/10 text-teal-200 text-xs font-bold rounded-full uppercase tracking-wider border border-teal-400/30">
                        Exam Cell
                    </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight">Bulk Answer Script Upload</h1>
                <p className="text-teal-200 mt-2 max-w-xl">
                    Upload multiple student answer PDFs at once. PRNs in filenames are auto-detected — manually map the rest.
                </p>
            </div>

            {/* Step 1: Exam Selection */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 transition-colors">
                <div className="flex items-center gap-2 mb-4">
                    <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">1</span>
                    <h2 className="font-bold text-gray-900 dark:text-white">Select Target Exam</h2>
                </div>
                {isLoadingExams ? (
                    <div className="text-gray-400 dark:text-gray-500 text-sm flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Loading exams...</div>
                ) : (
                    <div className="relative max-w-xl">
                        <select
                            value={selectedExamId}
                            onChange={e => handleExamChange(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-gray-100 text-sm transition-all appearance-none pr-10"
                        >
                            <option value="">— Select an exam —</option>
                            {exams.map(ex => (
                                <option key={ex.id} value={ex.id} className="bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100">#{ex.id} — {ex.course_code} — {ex.exam_name}</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={18} />
                    </div>
                )}
            </div>

            {/* Step 2: File Drop */}
            {selectedExamId && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 transition-colors">
                    <div className="flex items-center gap-2 mb-4">
                        <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">2</span>
                        <h2 className="font-bold text-gray-900 dark:text-white">Upload Answer Scripts</h2>
                        <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            <Info size={12} /> PDFs/Images, max 20MB each
                        </span>
                    </div>

                    {/* Drop Zone */}
                    <div
                        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 flex flex-col items-center
                            ${isDragging ? 'border-teal-500 bg-teal-50/50 dark:bg-teal-900/20' : 'border-gray-300 dark:border-slate-600 hover:border-teal-400 dark:hover:border-teal-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'}`}
                    >
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            accept="application/pdf,image/jpeg,image/png"
                            className="hidden"
                            onChange={handleFileInput}
                        />
                        <div className="p-4 bg-teal-50 dark:bg-teal-900/30 rounded-full mb-4 text-teal-600 dark:text-teal-400">
                            <UploadCloud size={30} />
                        </div>
                        <h3 className="text-base font-bold text-gray-900 dark:text-white">Drop multiple files here</h3>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Or click to browse. PDF, JPG, PNG accepted.</p>
                        <p className="text-xs text-teal-600 dark:text-teal-400 font-medium mt-2">
                            💡 Name files with PRN (e.g. <code className="bg-teal-50 dark:bg-teal-900/40 px-1 rounded">2022027001_John.pdf</code>) for auto-mapping
                        </p>
                    </div>
                </div>
            )}

            {/* Step 3: File List + Mapping */}
            {files.length > 0 && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 transition-colors">
                    <div className="flex items-center gap-2 mb-5">
                        <span className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-black flex items-center justify-center flex-shrink-0">3</span>
                        <h2 className="font-bold text-gray-900 dark:text-white">Review & Map Students</h2>
                        <div className="ml-auto flex gap-2 text-xs">
                            <span className="px-2 py-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 rounded-lg font-bold">{mappedCount} mapped</span>
                            {unmappedCount > 0 && <span className="px-2 py-1 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 rounded-lg font-bold">{unmappedCount} unmapped</span>}
                        </div>
                    </div>

                    <div className="space-y-2">
                        {files.map((f) => (
                            <div key={f.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-colors
                                ${f.student_id ? 'border-emerald-100 dark:border-emerald-800/50 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-amber-100 dark:border-amber-800/50 bg-amber-50/20 dark:bg-amber-900/10'}`}>
                                <div className="p-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400 flex-shrink-0">
                                    <FileText size={16} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{f.file.name}</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500">{(f.file.size / (1024 * 1024)).toFixed(2)} MB</p>
                                </div>
                                <FileBadge status={f.status} reason={f.reason} />
                                {/* Student selector */}
                                <select
                                    value={f.student_id}
                                    onChange={e => updateStudentMapping(f.id, e.target.value)}
                                    className={`text-xs px-2 py-1.5 border rounded-lg focus:ring-2 focus:ring-teal-500 text-gray-900 dark:text-gray-100 transition-all max-w-[200px]
                                        ${f.student_id ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-slate-700' : 'border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-slate-700'}`}
                                >
                                    <option value="" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100">— Select student —</option>
                                    {isLoadingStudents ? (
                                        <option disabled className="bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100">Loading...</option>
                                    ) : students.map(s => (
                                        <option key={s.id} value={s.id} className="bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100">
                                            {s.prn_number} — {s.full_name}
                                        </option>
                                    ))}
                                </select>
                                <button
                                    onClick={() => removeFile(f.id)}
                                    className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex-shrink-0"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Progress */}
                    {isUploading && (
                        <div className="mt-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                <span>Uploading files...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center mt-6 pt-5 border-t border-gray-100">
                        <p className="text-sm text-gray-500">
                            <span className="font-bold text-gray-900">{files.length}</span> files ready ·{' '}
                            <span className={`font-bold ${unmappedCount > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                {unmappedCount > 0 ? `${unmappedCount} will be skipped` : 'All mapped'}
                            </span>
                        </p>
                        <button
                            onClick={handleBulkUpload}
                            disabled={isUploading || mappedCount === 0}
                            className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-700 hover:to-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-teal-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isUploading ? (
                                <><Loader2 className="animate-spin" size={18} /> Uploading...</>
                            ) : (
                                <><UploadCloud size={18} /> Upload {mappedCount} Scripts</>
                            )}
                        </button>
                    </div>
                </div>
            )}

            {/* Upload Results */}
            {uploadResults && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-6 transition-colors">
                    <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <CheckCircle2 className="text-emerald-500" size={20} /> Upload Complete
                    </h2>
                    <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-gray-50 dark:bg-slate-700 rounded-xl p-4 text-center">
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Total</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{uploadResults.total}</p>
                        </div>
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 text-center border border-emerald-100 dark:border-emerald-800/30">
                            <p className="text-xs font-bold text-emerald-500 dark:text-emerald-400 uppercase tracking-wider">Uploaded</p>
                            <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300 mt-1">{uploadResults.uploaded}</p>
                        </div>
                        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center border border-red-100 dark:border-red-800/30">
                            <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Failed</p>
                            <p className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">{uploadResults.failed}</p>
                        </div>
                    </div>
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                        {uploadResults.results?.map((r, i) => (
                            <div key={i} className={`flex items-center gap-2 p-2 rounded-lg text-xs
                                ${r.status === 'uploaded' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'}`}>
                                {r.status === 'uploaded' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                                <span className="font-semibold truncate">{r.filename}</span>
                                {r.reason && <span className="ml-auto text-gray-500 dark:text-gray-400 shrink-0">— {r.reason}</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default BulkUpload;
