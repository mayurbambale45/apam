import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../utils/api';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const response = await api.post('/api/auth/login', { email, password });
            
            // Extract the token and user data from the successfully authenticated response
            const { token, user } = response.data;
            
            // Save to global context and localStorage globally via the provider
            login(token, user);
            
            // Redirect smoothly based on role mapping
            switch (user.role) {
                case 'administrator':
                    navigate('/administrator-dashboard');
                    break;
                case 'examination_system':
                    navigate('/examination_system-dashboard');
                    break;
                case 'teacher':
                    navigate('/instructor/exams');
                    break;
                case 'student':
                    navigate('/student/dashboard');
                    break;
                default:
                    navigate('/login');
            }
        } catch (err) {
            // Surface errors to the user in a red dialog securely
            setError(err.response?.data?.error || 'Invalid credentials or server error.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-screen items-center justify-center bg-gray-50">
            <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md border border-gray-100">
                <div className="text-center mb-6">
                    <h2 className="text-3xl font-semibold text-gray-800">APAM</h2>
                    <p className="text-sm text-gray-500 mt-1">Walchand College of Engineering, Sangli</p>
                    <p className="text-xs text-gray-400 mt-0.5">Academic Paper Assessment & Management</p>
                </div>
                
                {error && (
                    <div className="mb-4 p-3 bg-red-100 text-red-700 rounded border border-red-200 text-sm h-auto flex items-center shadow-sm">
                        {error}
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Email Address</label>
                        <input 
                            type="email" 
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" 
                            required 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                        />
                    </div>
                    <div>
                        <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
                        <input 
                            type="password" 
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm" 
                            required 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={isLoading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none shadow disabled:bg-blue-400"
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                    
                    <div className="text-center mt-4 text-sm text-gray-600">
                        Don't have an account? <Link to="/register" className="text-blue-600 hover:underline font-medium">Register</Link>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Login;
