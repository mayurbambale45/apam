import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, CheckCircle, XCircle, FileText, AlertCircle, Loader2 } from 'lucide-react';
import api from '../../utils/api';

const UploadSubmissions = () => {
    const [examId, setExamId] = useState('');
    const [studentId, setStudentId] = useState('');
    const [file, setFile] = useState(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Dropdown data
    const [exams, setExams] = useState([]);
    const [students, setStudents] = useState([]);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [isLoadingStudents, setIsLoadingStudents] = useState(true);

    // Status can be: 'idle', 'uploading', 'success', 'error'
    const [status, setStatus] = useState('idle');
    const [message, setMessage] = useState('');
    
    const fileInputRef = useRef(null);

    // Fetch exams and students on mount
    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await api.get('/api/exams');
                setExams(response.data);
            } catch (err) {
                console.error('Failed to load exams', err);
            } finally {
                setIsLoadingExams(false);
            }
        };

        const fetchStudents = async () => {
            try {
                const response = await api.get('/api/auth/users?role=student');
                setStudents(response.data);
            } catch (err) {
                console.error('Failed to load students', err);
            } finally {
                setIsLoadingStudents(false);
            }
        };

        fetchExams();
        fetchStudents();
    }, []);

    const handleDragOver = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileSelect(e.dataTransfer.files[0]);
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
        }
    };

    const handleFileSelect = (selectedFile) => {
        setStatus('idle');
        setMessage('');
        if (selectedFile.type !== 'application/pdf') {
            setStatus('error');
            setMessage('Please select a valid PDF file.');
            setFile(null);
            return;
        }
        if (selectedFile.size > 15 * 1024 * 1024) {
            setStatus('error');
            setMessage('File size exceeds the 15MB limit.');
            setFile(null);
            return;
        }
        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file || !examId || !studentId) {
            setStatus('error');
            setMessage('Please select an Exam, a Student, and a PDF file.');
            return;
        }

        setStatus('uploading');
        setMessage('Uploading answer script securely...');

        const formData = new FormData();
        formData.append('exam_id', examId);
        formData.append('student_id', studentId);
        formData.append('file', file);

        try {
            await api.post('/api/submissions/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            setStatus('success');
            setMessage('Submission uploaded and linked successfully!');
            
            // Clear form on success
            setFile(null);
            setStudentId('');
            // Keep examId in case they are doing batch uploads for the same exam
        } catch (error) {
            setStatus('error');
            setMessage(error.response?.data?.error || 'Failed to upload the file to the server.');
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="mb-8 border-l-4 border-blue-500 pl-4">
                <h2 className="text-3xl font-bold text-gray-800 dark:text-gray-100 tracking-tight">Upload Student Answer Scripts</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Exam Department Only: Upload scanned student handwritten scripts (PDF) to link them to an exam.</p>
            </div>

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-200 dark:border-slate-700 p-8 transition-colors">
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Target Exam</label>
                        {isLoadingExams ? (
                            <div className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-400 dark:text-gray-500 text-sm">Loading exams...</div>
                        ) : (
                            <select
                                required
                                value={examId}
                                onChange={(e) => setExamId(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 transition-all"
                            >
                                <option value="" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100">Select an Exam...</option>
                                {exams.map(exam => (
                                    <option key={exam.id} value={exam.id} className="bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100">
                                        #{exam.id} — {exam.course_code} — {exam.exam_name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Target Student</label>
                        {isLoadingStudents ? (
                            <div className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-gray-400 dark:text-gray-500 text-sm">Loading students...</div>
                        ) : (
                            <select
                                required
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100 transition-all"
                            >
                                <option value="" className="bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100">Select a Student...</option>
                                {students.map(student => (
                                    <option key={student.id} value={student.id} className="bg-white dark:bg-slate-700 text-gray-900 dark:text-gray-100">
                                        PRN: {student.prn_number || student.id} — {student.full_name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                </div>

                {/* Drag and Drop Zone */}
                <div 
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`
                        relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center
                        ${isDragging ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-gray-50 dark:hover:bg-slate-700/50'}
                        ${file ? 'bg-green-50/30 dark:bg-emerald-900/10 border-green-300 dark:border-emerald-700' : ''}
                    `}
                >
                    <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileInput} 
                        accept="application/pdf" 
                        className="hidden" 
                    />
                    
                    {file ? (
                        <div className="flex flex-col items-center">
                            <div className="bg-green-100 p-4 rounded-full mb-4 text-green-600">
                                <FileText size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate max-w-xs">{file.name}</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB PDF Document</p>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setFile(null); setStatus('idle'); }}
                                className="mt-4 text-sm font-medium text-red-500 hover:text-red-700 py-1 px-3 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                Remove File
                            </button>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center pointer-events-none">
                            <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-full mb-4 text-blue-600 dark:text-blue-400">
                                <UploadCloud size={32} />
                            </div>
                            <h4 className="text-lg font-bold text-gray-900 dark:text-gray-100">Drag & drop your PDF here</h4>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm">
                                Or click to browse files. Ensure the document is a scanned handwritten answer script under 15MB.
                            </p>
                        </div>
                    )}
                </div>

                {/* Status Indicator Bar */}
                {status !== 'idle' && (
                    <div className={`mt-6 p-4 rounded-xl flex items-center gap-3 border ${
                        status === 'uploading' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                        status === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
                        'bg-red-50 border-red-200 text-red-700'
                    }`}>
                        {status === 'uploading' && <Loader2 className="animate-spin" size={20} />}
                        {status === 'success' && <CheckCircle size={20} />}
                        {status === 'error' && <AlertCircle size={20} />}
                        <span className="font-medium text-sm">{message}</span>
                    </div>
                )}

                <div className="mt-8 pt-6 border-t border-gray-100 dark:border-slate-700 flex justify-end">
                    <button
                        onClick={handleUpload}
                        disabled={!file || !examId || !studentId || status === 'uploading'}
                        className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-8 py-3 rounded-xl font-bold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {status === 'uploading' ? 'Uploading...' : 'Confirm Upload & Link'}
                    </button>
                </div>

            </div>
        </div>
    );
};

export default UploadSubmissions;
