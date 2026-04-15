import React, { useState, useEffect } from 'react';
import { PlusCircle, Trash2, Save, FileText, Loader2, CheckCircle, BookOpen, Eye, X, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';

const ConfigureRubric = () => {
    const [exams, setExams] = useState([]);
    const [isLoadingExams, setIsLoadingExams] = useState(true);
    const [examId, setExamId] = useState('');
    const [questions, setQuestions] = useState([
        { question_number: 1, question_text: '', max_marks: '', model_answer_text: '', mandatory_keywords: '' }
    ]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    // View existing rubric
    const [existingRubric, setExistingRubric] = useState(null);
    const [isLoadingRubric, setIsLoadingRubric] = useState(false);
    const [showExistingView, setShowExistingView] = useState(false);

    useEffect(() => {
        const fetchExams = async () => {
            try {
                const response = await api.get('/api/exams');
                setExams(response.data);
            } catch (err) {
                console.error('Failed to load exams:', err);
            } finally {
                setIsLoadingExams(false);
            }
        };
        fetchExams();
    }, []);

    // When exam changes, check for existing rubric
    const handleExamChange = async (newExamId) => {
        setExamId(newExamId);
        setExistingRubric(null);
        setShowExistingView(false);

        if (!newExamId) return;

        setIsLoadingRubric(true);
        try {
            const response = await api.get(`/api/rubrics/${newExamId}`);
            setExistingRubric(response.data);
        } catch (err) {
            // 404 = no rubric exists yet, which is fine
            if (err.response?.status !== 404) {
                console.error('Failed to check rubric:', err);
            }
            setExistingRubric(null);
        } finally {
            setIsLoadingRubric(false);
        }
    };

    const handleAddQuestion = () => {
        setQuestions([
            ...questions,
            { question_number: questions.length + 1, question_text: '', max_marks: '', model_answer_text: '', mandatory_keywords: '' }
        ]);
    };

    const handleRemoveQuestion = (indexToRemove) => {
        if (questions.length === 1) return;
        const updatedQuestions = questions.filter((_, index) => index !== indexToRemove)
            .map((q, index) => ({ ...q, question_number: index + 1 }));
        setQuestions(updatedQuestions);
    };

    const handleQuestionChange = (index, field, value) => {
        const updatedQuestions = [...questions];
        updatedQuestions[index][field] = value;
        setQuestions(updatedQuestions);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!examId) {
            toast.error('Please select an exam first.');
            return;
        }
        setIsSubmitting(true);

        try {
            const formattedQuestions = questions.map(q => {
                const fullModelAnswer = q.question_text
                    ? `[QUESTION]: ${q.question_text}\n\n[GRADING CRITERIA]: ${q.model_answer_text}`
                    : q.model_answer_text;

                return {
                    question_number: parseInt(q.question_number),
                    max_marks: parseInt(q.max_marks),
                    model_answer_text: fullModelAnswer,
                    mandatory_keywords: q.mandatory_keywords
                        ? q.mandatory_keywords.split(',').map(word => word.trim()).filter(Boolean)
                        : null
                };
            });

            await api.post('/api/rubrics/create', {
                exam_id: parseInt(examId),
                questions: formattedQuestions
            });

            toast.success('Rubric saved successfully! AI grading criteria configured.');

            setQuestions([{ question_number: 1, question_text: '', max_marks: '', model_answer_text: '', mandatory_keywords: '' }]);
            // Re-check to show the new rubric
            handleExamChange(examId);

        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to create rubric.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAutoGenerate = async () => {
        if (!examId) return toast.error('Select an exam first.');
        
        setIsGenerating(true);
        const toastId = toast.loading('AI is analyzing your Answer Key PDF...');
        
        try {
            const response = await api.post(`/api/rubrics/generate-auto/${examId}`);
            setQuestions(response.data);
            toast.success('Rubric generated! Please review marks and questions below.', { id: toastId });
        } catch (err) {
            toast.error(err.response?.data?.error || 'AI failed to generate rubric.', { id: toastId });
        } finally {
            setIsGenerating(false);
        }
    };

    const totalMaxMarks = questions.reduce((sum, q) => sum + (parseInt(q.max_marks) || 0), 0);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-gray-900 dark:text-gray-100 tracking-tight flex items-center gap-3">
                    <FileText className="text-cyan-500" size={28} /> Configure Rubric
                </h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Design the AI grading criteria. Each question defines what the AI evaluates and how marks are awarded.</p>
            </div>

            {/* Exam Selector + Rubric Status */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 transition-colors">
                <div className="flex flex-col md:flex-row md:items-end gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Target Exam</label>
                        {isLoadingExams ? (
                            <div className="text-gray-400 dark:text-gray-500 text-sm py-2">Loading exams...</div>
                        ) : (
                            <select value={examId} onChange={e => handleExamChange(e.target.value)}
                                className="w-full max-w-xl px-4 py-3 bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 dark:text-gray-100 rounded-xl focus:bg-white dark:focus:bg-slate-600 focus:ring-2 focus:ring-cyan-500 text-sm transition-all">
                                <option value="" className="text-gray-900 dark:text-gray-100">— Select an Exam —</option>
                                {exams.map(exam => (
                                    <option key={exam.id} value={exam.id} className="text-gray-900 dark:text-gray-100">
                                        #{exam.id} — {exam.course_code} — {exam.exam_name}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    {examId && !isLoadingRubric && (
                        <div>
                            {existingRubric ? (
                                <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/30">
                                        <CheckCircle size={16} /> Rubric Exists ({existingRubric.questions?.length} questions)
                                    </span>
                                    <button onClick={() => setShowExistingView(!showExistingView)}
                                        className="inline-flex items-center gap-1 px-3 py-2 text-sm font-semibold text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/30 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors">
                                        <Eye size={16} /> {showExistingView ? 'Hide' : 'View'}
                                    </button>
                                </div>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/30">
                                    No rubric configured yet
                                </span>
                            )}
                        </div>
                    )}
                    {isLoadingRubric && <Loader2 className="animate-spin text-gray-400" size={20} />}
                </div>
            </div>

            {/* Existing Rubric Viewer */}
            {showExistingView && existingRubric && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
                    <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/10 flex items-center justify-between">
                        <h3 className="font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2"><CheckCircle size={16} className="text-emerald-500" /> Current Rubric Configuration</h3>
                        <button onClick={() => setShowExistingView(false)} className="p-1.5 text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg"><X size={18} /></button>
                    </div>
                    <div className="p-6 space-y-4">
                        {existingRubric.questions?.map((q, i) => (
                            <div key={i} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-5 border border-gray-200 dark:border-slate-600">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-300 font-bold w-9 h-9 rounded-full flex items-center justify-center text-sm">Q{q.question_number}</div>
                                        <span className="font-bold text-gray-900 dark:text-gray-100">Question {q.question_number}</span>
                                    </div>
                                    <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-bold">{q.max_marks} marks</span>
                                </div>
                                <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-gray-100 dark:border-slate-600 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{q.model_answer_text}</div>
                                {q.mandatory_keywords && (
                                    <div className="mt-3 flex flex-wrap gap-1.5">
                                        {(typeof q.mandatory_keywords === 'string' ? JSON.parse(q.mandatory_keywords) : q.mandatory_keywords)?.map((kw, ki) => (
                                            <span key={ki} className="px-2 py-0.5 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-md border border-purple-200 dark:border-purple-800/50">{kw}</span>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Create New Rubric Form - Only show if no existing rubric */}
            {examId && !existingRubric && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
                    <div className="p-6 md:p-8">
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Question Builder */}
                            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-slate-700">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                                    <FileText className="text-gray-400 dark:text-gray-500" size={18} />
                                    Rubric Questions
                                    <span className="text-xs text-gray-400 dark:text-gray-500 font-normal ml-2">({questions.length} questions · {totalMaxMarks} total marks)</span>
                                </h3>
                                <div className="flex gap-2">
                                    <button type="button" onClick={handleAutoGenerate} disabled={isGenerating}
                                        className="flex items-center gap-1.5 text-sm text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 font-bold bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/40 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
                                        {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} 
                                        {isGenerating ? 'AI Generating...' : 'Generate from Answer Key'}
                                    </button>
                                    <button type="button" onClick={handleAddQuestion}
                                        className="flex items-center gap-1.5 text-sm text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-300 font-bold bg-cyan-50 dark:bg-cyan-900/20 hover:bg-cyan-100 dark:hover:bg-cyan-900/40 px-4 py-2 rounded-lg transition-colors">
                                        <PlusCircle size={16} /> Add Question
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-5">
                                {questions.map((q, index) => (
                                    <div key={index} className="bg-gray-50 dark:bg-slate-700/50 p-5 rounded-xl border border-gray-200 dark:border-slate-600 relative group hover:border-gray-300 dark:hover:border-slate-500 transition-colors">

                                        <div className="absolute top-3 right-3 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button type="button" onClick={() => handleRemoveQuestion(index)}
                                                className="text-gray-400 dark:text-gray-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 p-1.5 rounded-lg transition-colors"
                                                disabled={questions.length === 1}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                            <div className="md:col-span-2 space-y-3">
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Q Number</label>
                                                    <div className="flex items-center">
                                                        <span className="bg-gray-200 dark:bg-slate-600 text-gray-500 dark:text-gray-300 px-2.5 py-2 border border-r-0 border-gray-300 dark:border-slate-500 rounded-l-lg font-mono text-sm">Q</span>
                                                        <input type="number" required min="1" value={q.question_number}
                                                            onChange={e => handleQuestionChange(index, 'question_number', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-r-lg focus:ring-2 focus:ring-cyan-500 text-sm" />
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Max Marks</label>
                                                    <input type="number" required min="1" placeholder="10" value={q.max_marks}
                                                        onChange={e => handleQuestionChange(index, 'max_marks', e.target.value)}
                                                        className="w-full px-3 py-2 border border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 rounded-lg focus:ring-2 focus:ring-cyan-500 font-bold text-sm" />
                                                </div>
                                            </div>

                                            <div className="md:col-span-10 space-y-3">
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Question Text</label>
                                                    <input type="text" placeholder="Enter the actual question asked to the student..."
                                                        value={q.question_text} onChange={e => handleQuestionChange(index, 'question_text', e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500 text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-1">Grading Criteria / Model Answer *</label>
                                                    <textarea required rows="3"
                                                        placeholder="Explain exactly how points should be awarded."
                                                        value={q.model_answer_text} onChange={e => handleQuestionChange(index, 'model_answer_text', e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-300 dark:border-slate-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500 resize-y text-sm" />
                                                </div>
                                                <div>
                                                    <label className="block text-[10px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                                        Mandatory Keywords <span className="font-normal lowercase text-gray-400 dark:text-gray-500">(comma-separated, optional)</span>
                                                    </label>
                                                    <input type="text" placeholder="E.g. inheritance, encapsulation, polymorphism"
                                                        value={q.mandatory_keywords} onChange={e => handleQuestionChange(index, 'mandatory_keywords', e.target.value)}
                                                        className="w-full px-4 py-2 border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono text-xs" />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer */}
                            <div className="flex justify-between items-center pt-6 border-t border-gray-100 dark:border-slate-700">
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-bold text-gray-900 dark:text-gray-100">{questions.length}</span> questions · <span className="font-bold text-gray-900 dark:text-gray-100">{totalMaxMarks}</span> total marks
                                </div>
                                <button type="submit" disabled={isSubmitting}
                                    className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isSubmitting ? <><Loader2 className="animate-spin" size={18} /> Saving Rubric...</> : <><Save size={18} /> Save Exam Rubric</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* If rubric exists, show a message with option to create another */}
            {examId && existingRubric && !showExistingView && (
                <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-800/30 rounded-2xl p-6 text-center transition-colors">
                    <CheckCircle size={32} className="text-emerald-500 mx-auto mb-3" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">Rubric Already Configured</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">This exam already has a rubric with {existingRubric.questions?.length} questions. Click "View" above to review it.</p>
                </div>
            )}
        </div>
    );
};

export default ConfigureRubric;
