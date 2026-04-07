import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../utils/api';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'student' // Default role
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await api.post('/api/auth/register', formData);
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md border border-gray-100">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-semibold text-gray-800">APAM — Register</h2>
                    <p className="text-sm text-gray-500 mt-1">Walchand College of Engineering, Sangli</p>
                </div>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200 text-sm">
                        {error}
                    </div>
                )}

                {success && (
                    <div className="mb-4 p-3 bg-green-100 text-green-700 rounded border border-green-200 text-sm">
                        Registration successful! Redirecting to login...
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Full Name</label>
                        <input 
                            type="text" 
                            name="name"
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            required 
                            value={formData.name} 
                            onChange={handleChange} 
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Email Address</label>
                        <input 
                            type="email" 
                            name="email"
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            required 
                            value={formData.email} 
                            onChange={handleChange} 
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                        <input 
                            type="password" 
                            name="password"
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                            required 
                            value={formData.password} 
                            onChange={handleChange} 
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Role</label>
                        <select 
                            name="role"
                            value={formData.role}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                        >
                            <option value="student">Student</option>
                            <option value="teacher">Instructor</option>
                            <option value="examination_system">Examination System</option>
                            <option value="administrator">Administrator</option>
                        </select>
                    </div>
                    
                    <button 
                        type="submit" 
                        disabled={isLoading || success}
                        className="w-full bg-gray-900 hover:bg-black text-white font-bold py-2 px-4 rounded focus:outline-none shadow mt-4 disabled:bg-gray-400"
                    >
                        {isLoading ? 'Registering...' : 'Register'}
                    </button>
                    
                    <div className="text-center mt-4 text-sm text-gray-600">
                        Already have an account? <Link to="/login" className="text-blue-600 hover:underline font-medium">Sign in</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Register;
