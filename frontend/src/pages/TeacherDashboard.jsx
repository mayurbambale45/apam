import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, FilePlus, LayoutDashboard } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';
import RubricForm from '../components/teacher/RubricForm';
import EvaluationTable from '../components/teacher/EvaluationTable';

const TeacherDashboard = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    
    // Tab state: 'create' or 'review'
    const [activeTab, setActiveTab] = useState('review');

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            
            {/* Top Navigation Bar */}
            <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        
                        <div className="flex items-center gap-3">
                            <div className="bg-blue-600 text-white p-2 rounded-lg">
                                <LayoutDashboard size={20} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900 leading-tight">Teacher Portal</h1>
                                <p className="text-xs text-gray-500 font-medium">Automated Answer Script Evaluator</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-6">
                            <div className="hidden md:block">
                                <span className="text-sm text-gray-500 mr-2">Logged in as:</span>
                                <span className="text-sm font-semibold text-gray-900">{user?.full_name}</span>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
                            >
                                <LogOut size={18} />
                                <span className="hidden sm:inline">Sign Out</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            {/* Dashboard Content */}
            <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
                
                {/* Tabbed Navigation */}
                <div className="mb-8 border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        <button
                            onClick={() => setActiveTab('review')}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeTab === 'review'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <LayoutDashboard size={18} />
                            Review Grades
                        </button>

                        <button
                            onClick={() => setActiveTab('create')}
                            className={`
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors
                                ${activeTab === 'create'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                            `}
                        >
                            <FilePlus size={18} />
                            Create Rubric
                        </button>
                    </nav>
                </div>

                {/* Active Tab View Rendering */}
                <div className="transition-all duration-300 ease-in-out">
                    {activeTab === 'review' ? <EvaluationTable /> : <RubricForm />}
                </div>

            </main>
        </div>
    );
};

export default TeacherDashboard;
