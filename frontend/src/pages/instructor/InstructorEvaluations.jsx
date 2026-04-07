import React from 'react';
import EvaluationTable from '../../components/teacher/EvaluationTable';

const InstructorEvaluations = () => {
    return (
        <div className="max-w-6xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Evaluations</h2>
                <p className="text-gray-500 mt-1">Review AI-graded student submissions.</p>
            </div>
            <EvaluationTable />
        </div>
    );
};

export default InstructorEvaluations;
