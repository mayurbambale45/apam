import React, { useState } from 'react';
import FeedbackViewer from '../../components/student/FeedbackViewer';
import { Search } from 'lucide-react';

const StudentResults = () => {
    const [evaluationIdQuery, setEvaluationIdQuery] = useState('');
    const [activeEvaluationId, setActiveEvaluationId] = useState(null);

    const handleSearch = (e) => {
        e.preventDefault();
        if (evaluationIdQuery) {
            setActiveEvaluationId(parseInt(evaluationIdQuery));
        }
    };

    return (
        <div className="max-w-6xl mx-auto">
            {!activeEvaluationId ? (
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-8">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-6">View Evaluation Results</h2>
                    
                    <form onSubmit={handleSearch} className="flex gap-4 max-w-lg mb-8">
                        <div className="flex-1 relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={18} className="text-gray-400" />
                            </div>
                            <input
                                type="number"
                                required
                                value={evaluationIdQuery}
                                onChange={(e) => setEvaluationIdQuery(e.target.value)}
                                placeholder="Enter Evaluation ID..."
                                className="w-full pl-10 pr-3 py-2 bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-600 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                        </div>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors"
                        >
                            View Feedback
                        </button>
                    </form>
                    
                    <p className="text-gray-500 dark:text-slate-400 text-sm">
                        * In a full implementation, you would click "View Results" directly from the Submissions grid. For this placeholder, please enter an Evaluation ID manually (e.g., 1 or 2).
                    </p>
                </div>
            ) : (
                <FeedbackViewer 
                    evaluationId={activeEvaluationId} 
                    onBack={() => setActiveEvaluationId(null)} 
                />
            )}
        </div>
    );
};

export default StudentResults;
