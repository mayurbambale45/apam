import React from 'react';
import RubricForm from '../../components/teacher/RubricForm';

const InstructorRubrics = () => {
    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Configure Rubrics</h2>
                <p className="text-gray-500 dark:text-gray-400 mt-1">Create or edit the grading model answers for your exams.</p>
            </div>
            <RubricForm />
        </div>
    );
};

export default InstructorRubrics;
