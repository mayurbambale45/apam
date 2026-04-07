import React, { useState, useEffect } from 'react';
import { PlusCircle, Search, Calendar, BookOpen, Presentation, PlayCircle } from 'lucide-react';
import api from '../../utils/api';

const ManageExams = () => {
    // Form State
    const [courseCode, setCourseCode] = useState('');
    const [examName, setExamName] = useState('');
    const [createStatus, setCreateStatus] = useState({ type: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // List State
    const [exams, setExams] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    
    // Evaluation state mapping exam_id -> evaluating boolean
    const [evaluatingExams, setEvaluatingExams] = useState({});

    // Fetch existing exams from the real backend endpoint
    const fetchExams = async () => {
        setIsFetching(true);
        try {
            const response = await api.get('/api/exams');
            setExams(response.data);
        } catch (error) {
            console.error("Failed to fetch exams", error);
            // Optional: Handle error UI instead of just silenty failing or mocking
        } finally {
            setIsFetching(false);
        }
    };

    useEffect(() => {
        fetchExams();
    }, []);

    const handleCreateExam = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        setCreateStatus({ type: '', message: '' });

        try {
            const response = await api.post('/api/exams/create', {
                course_code: courseCode,
                exam_name: examName
            });
            
            setCreateStatus({ type: 'success', message: `Exam created successfully! ID: ${response.data.exam.id}` });
            setCourseCode('');
            setExamName('');
            
            // Add to the top of our local list
            setExams([response.data.exam, ...exams]);
        } catch (error) {
            setCreateStatus({ 
                type: 'error', 
                message: error.response?.data?.error || 'Failed to create exam.' 
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleTriggerEvaluation = async (examId) => {
        if (!confirm(`Are you sure you want to trigger AI evaluation for ALL pending submissions in Exam ${examId}? This consumes API credits and can take some time.`)) return;

        setEvaluatingExams(prev => ({ ...prev, [examId]: true }));
        try {
            const response = await api.post(`/api/evaluate/exam/${examId}`);
            
            // Assuming response contains messages about success/failure
            alert(`Evaluation sequence completed! \n${response.data.message}`);
            
        } catch (error) {
            alert(`Error triggering evaluation: ${error.response?.data?.error || error.message}`);
        } finally {
            setEvaluatingExams(prev => ({ ...prev, [examId]: false }));
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="mb-6">
                <h2 className="text-3xl font-bold text-gray-800 tracking-tight">Manage Exams</h2>
                <p className="text-gray-500 mt-2">Create new examination sessions and trigger AI grading for bulk submissions.</p>
            </div>

            {/* Top Section: Split Layout for Form and Quick Stats */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Create Exam Form */}
                <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 self-start">
                    <div className="flex items-center gap-2 mb-6">
                        <PlusCircle className="text-blue-600" size={20} />
                        <h3 className="text-xl font-bold text-gray-800">New Exam</h3>
                    </div>

                    {createStatus.message && (
                        <div className={`p-3 rounded-md mb-4 text-sm font-medium ${createStatus.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {createStatus.message}
                        </div>
                    )}

                    <form onSubmit={handleCreateExam} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Course Code</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. CS101"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 uppercase"
                                value={courseCode}
                                onChange={(e) => setCourseCode(e.target.value.toUpperCase())}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Exam Title</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Midterm Examination"
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                value={examName}
                                onChange={(e) => setExamName(e.target.value)}
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:bg-blue-400"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Exam Instance'}
                        </button>
                    </form>
                </div>

                {/* Exam Data Grid */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <div className="p-6 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-800">Active Examinations</h3>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Search exams..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 pr-4 py-1.5 text-sm border border-gray-300 rounded-full focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="px-6 py-4 font-semibold">ID</th>
                                    <th className="px-6 py-4 font-semibold">Course</th>
                                    <th className="px-6 py-4 font-semibold">Exam Title</th>
                                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {isFetching && exams.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" className="px-6 py-8 text-center text-gray-500">Loading exams...</td>
                                    </tr>
                                ) : exams.filter(exam => {
                                    if (!searchQuery) return true;
                                    const q = searchQuery.toLowerCase();
                                    return (
                                        (exam.course_code || exam.courseCode || '').toLowerCase().includes(q) ||
                                        (exam.exam_name || exam.examName || '').toLowerCase().includes(q) ||
                                        String(exam.id).includes(q)
                                    );
                                }).map((exam) => (
                                    <tr key={exam.id} className="hover:bg-blue-50/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-mono text-gray-500">#{exam.id}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-100 text-gray-800 text-sm font-bold tracking-wide">
                                                <BookOpen size={14} className="text-blue-500"/>
                                                {exam.course_code || exam.courseCode}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{exam.exam_name || exam.examName}</div>
                                            <div className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                                                <Calendar size={12} />
                                                {new Date(exam.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => handleTriggerEvaluation(exam.id)}
                                                disabled={evaluatingExams[exam.id]}
                                                className={`
                                                    inline-flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-lg transition-all shadow-sm
                                                    ${evaluatingExams[exam.id] 
                                                        ? 'bg-amber-100 text-amber-700 cursor-not-allowed' 
                                                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'
                                                    }
                                                `}
                                            >
                                                {evaluatingExams[exam.id] ? (
                                                    <><div className="animate-spin h-4 w-4 border-2 border-amber-600 border-t-transparent rounded-full"></div> Processing AI...</>
                                                ) : (
                                                    <><PlayCircle size={16} /> Trigger AI Evaluation</>
                                                )}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ManageExams;
