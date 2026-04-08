import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, GraduationCap, CheckCircle, Clock, FileText, TrendingUp } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';
import FeedbackViewer from '../components/student/FeedbackViewer';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const StudentDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    
    const [exams, setExams] = useState([]);
    const [isFetching, setIsFetching] = useState(true);
    const [error, setError] = useState(null);
    
    // State to handle which deeply detailed feedback view is open
    const [selectedEvaluationId, setSelectedEvaluationId] = useState(null);

    useEffect(() => {
        const fetchMyExams = async () => {
            try {
                const response = await api.get('/api/dashboard/student/my-exams');
                setExams(response.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to fetch your exams from the server.');
            } finally {
                setIsFetching(false);
            }
        };

        fetchMyExams();
    }, []);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            
            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        
                        <div className="flex items-center gap-3">
                            <div className="bg-green-600 text-white p-2 rounded-lg">
                                <GraduationCap size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 leading-tight">Student Portal</h1>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="hidden md:block text-right">
                                <div className="text-sm font-semibold text-gray-900">{user?.full_name}</div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors bg-gray-100 hover:bg-red-50 px-3 py-1.5 rounded-md"
                            >
                                <LogOut size={16} />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Conditional Rendering: Show either the detailed viewer OR the dashboard grid */}
                {selectedEvaluationId ? (
                    <FeedbackViewer 
                        evaluationId={selectedEvaluationId} 
                        onBack={() => setSelectedEvaluationId(null)} 
                    />
                ) : (
                    <>
                        {/* Performance Chart Section */}
                        {exams.some(e => e.status === 'graded') && (
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mb-8 h-80">
                                <h3 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                                    <TrendingUp className="text-emerald-500" size={20} />
                                    Performance Trend
                                </h3>
                                <ResponsiveContainer width="100%" height="80%">
                                    <LineChart data={[...exams].reverse().filter(e => e.status === 'graded').map(e => ({ name: e.courseCode, score: parseFloat(e.totalScore) }))}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dy={10} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12 }} dx={-10} domain={[0, 100]} />
                                        <Tooltip 
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}
                                        />
                                        <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}

                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-gray-800">Results</h2>
                            <p className="text-gray-500 mt-1">Review your uploaded scripts and AI evaluation results.</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-6">
                                {error}
                            </div>
                        )}

                        {isFetching ? (
                            <div className="flex justify-center items-center py-20">
                                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
                            </div>
                        ) : exams.length === 0 ? (
                            <div className="bg-white p-12 text-center rounded-xl shadow-sm border border-gray-200">
                                <FileText size={48} className="mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900">No Exams Found</h3>
                                <p className="text-gray-500 mt-2">You haven't uploaded any answer scripts yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {exams.map((exam, index) => {
                                    const isGraded = exam.status === 'graded';

                                    return (
                                        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
                                            
                                            <div className="p-6 flex-1">
                                                <div className="flex justify-between items-start mb-4">
                                                    <span className="inline-block px-3 py-1 bg-gray-100 text-gray-700 text-xs font-bold rounded-full uppercase tracking-wider">
                                                        {exam.courseCode}
                                                    </span>
                                                    {isGraded ? (
                                                        <span className="flex items-center gap-1 text-green-600 font-medium text-sm">
                                                            <CheckCircle size={16} /> Graded
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-amber-500 font-medium text-sm">
                                                            <Clock size={16} /> Pending
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <h3 className="text-xl font-bold text-gray-900 mb-2">{exam.examName}</h3>
                                                
                                                {isGraded && (
                                                    <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
                                                        <span className="text-gray-500 text-sm font-medium">Final Score</span>
                                                        <span className="text-2xl font-bold text-gray-900">{exam.totalScore}</span>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="bg-gray-50 p-4 border-t border-gray-100">
                                                {isGraded && exam.evaluationId ? (
                                                    <button
                                                        onClick={() => setSelectedEvaluationId(exam.evaluationId)}
                                                        className="w-full relative inline-flex items-center justify-center gap-2 px-4 py-2 border border-green-600 text-sm font-medium rounded-md text-green-700 bg-white hover:bg-green-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                                                    >
                                                        View Detailed Feedback
                                                    </button>
                                                ) : (
                                                    <div className="text-center text-sm font-medium text-gray-400 py-2">
                                                        Evaluation in progress...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
};

export default StudentDashboard;
