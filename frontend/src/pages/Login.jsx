import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock, User, ShieldCheck, Mail, ArrowLeft, RefreshCw, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';

const Login = () => {
    const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset'
    
    // Login State
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('student'); // 'student' | 'Faculty' | 'Exam Cell'
    const [isRobotChecked, setIsRobotChecked] = useState(false);
    
    // Forgot Password State
    const [resetEmail, setResetEmail] = useState('');
    
    // Reset Password State (Using old & new)
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    // Enforce Dark Mode on the background
    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    const resetMessages = () => {
        setError(null);
        setSuccess(null);
    };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        resetMessages();

        const trimmedUserId = userId.trim();
        
        if (!trimmedUserId || !password) {
            return setError("User ID and Password are required.");
        }

        if (!isRobotChecked) {
            return setError("Security verification required. Please confirm you are not a robot.");
        }

        setIsLoading(true);
        try {
            // Send user_id string down to the server (the API uses 'email' field universally in APAM structure)
            const response = await api.post('/api/auth/login', { email: trimmedUserId, password });
            
            const { token, user } = response.data;
            login(token, user);
            
            switch (user.role) {
                case 'administrator': navigate('/administrator-dashboard'); break;
                case 'Exam Cell': navigate('/examination_system-dashboard'); break;
                case 'Faculty': navigate('/instructor/dashboard'); break;
                case 'student': navigate('/student/dashboard'); break;
                default: navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Authentication Failed. Invalid User ID or Password.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotSubmit = async (e) => {
        e.preventDefault();
        resetMessages();
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setSuccess("Recovery protocol dispatched. If registered, a link has been sent.");
            setResetEmail('');
        }, 1500);
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        resetMessages();
        
        if (!userId) {
            return setError("Identification Required: Please specify your User ID to continue.");
        }
        if (!newPassword) {
            return setError("New password is required.");
        }
        if (newPassword !== confirmPassword) {
            return setError("Confirmation password does not match.");
        }

        setIsLoading(true);
        try {
            await api.post('/api/auth/change-password', {
                userId,
                oldPassword,
                newPassword
            });
            setSuccess("Password reset successfully. Credentials have been rotated.");
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setView('login'), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Credential Rotation Error: Identity could not be verified.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 overflow-hidden relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-600/10 blur-[130px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-md bg-slate-800/95 backdrop-blur-3xl p-8 rounded-3xl shadow-2xl border border-slate-700/50 z-10 relative">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-5 shadow-lg shadow-blue-500/30">
                        <ShieldCheck className="text-white" size={32} />
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tight">APAM Verify</h2>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 tracking-[0.2em] uppercase">Academic Management Node</p>
                </div>
                
                {error && (
                    <div className="mb-6 p-4 bg-red-900/30 text-red-300 rounded-xl border border-red-800/50 text-sm flex items-start gap-3">
                        <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
                        <span className="font-semibold">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-6 p-4 bg-emerald-900/30 text-emerald-400 rounded-xl border border-emerald-800/50 text-sm flex items-start gap-3">
                        <CheckCircle2 className="flex-shrink-0 mt-0.5" size={16} />
                        <span className="font-semibold">{success}</span>
                    </div>
                )}
                
                {view === 'login' && (
                    <form onSubmit={handleLoginSubmit} className="space-y-5">
                        <div className="space-y-1.5 mt-2">
                            <label className="block text-slate-300 text-[11px] font-extrabold uppercase tracking-widest pl-1">User ID</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User className="text-slate-500" size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-600 transition-all font-mono text-sm shadow-inner" 
                                    required 
                                    placeholder="Enter User ID or Email"
                                    value={userId} 
                                    onChange={(e) => setUserId(e.target.value)} 
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="block text-slate-300 text-[11px] font-extrabold uppercase tracking-widest pl-1">Secure Password</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="text-slate-500" size={18} />
                                </div>
                                <input 
                                    type="password" 
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-slate-600 transition-all text-sm tracking-widest shadow-inner" 
                                    required 
                                    placeholder="••••••••"
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                />
                            </div>
                        </div>

                        {/* Professional 'I am not a robot' System implementation */}
                        <div className="mt-4 p-4 bg-slate-900/40 border border-slate-700/60 rounded-2xl flex items-center justify-between select-none hover:border-slate-600 transition-colors shadow-inner backdrop-blur-sm">
                            <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => setIsRobotChecked(!isRobotChecked)}>
                                <div className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all duration-300 ${isRobotChecked ? 'bg-blue-600 border-blue-500 shadow-lg shadow-blue-500/30' : 'bg-slate-800 border-slate-500 group-hover:border-slate-400'}`}>
                                    <CheckCircle2 size={16} className={`text-white transition-transform duration-300 ${isRobotChecked ? 'scale-100' : 'scale-0'}`} />
                                </div>
                                <span className={`text-[13px] font-bold tracking-wide transition-colors ${isRobotChecked ? 'text-white' : 'text-slate-300'}`}>I am not a robot</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <RefreshCw size={24} className="text-blue-500 mb-1" />
                                <span className="text-[7.5px] text-slate-400 font-black uppercase tracking-[0.2em] font-mono">SysCaptcha</span>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full mt-8 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold py-3.5 px-4 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-slate-900 shadow-xl shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
                        >
                            {isLoading ? <><RefreshCw className="animate-spin" size={18} /> Authenticating Node...</> : 'Authenticate Session'}
                        </button>
                        
                        <div className="flex items-center justify-between mt-6 px-2">
                            <button type="button" onClick={() => { setView('forgot'); resetMessages(); }} className="text-xs text-blue-400 hover:text-white font-semibold transition-colors">
                                Forgot Password?
                            </button>
                            <button type="button" onClick={() => { setView('reset'); resetMessages(); }} className="text-xs text-indigo-400 hover:text-white font-semibold transition-colors">
                                Change Password
                            </button>
                        </div>

                        <div className="text-center mt-8 pt-6 border-t border-slate-700/50">
                            <p className="text-[11px] font-black text-slate-500 uppercase tracking-widest leading-relaxed">
                                Need system access? <br />
                                <Link to="/register" className="text-blue-400 hover:text-white transition-all duration-300 border-b border-blue-400/30 hover:border-white inline-block mt-2">Create New Node Identity</Link>
                            </p>
                        </div>
                    </form>
                )}

                {view === 'forgot' && (
                    <form onSubmit={handleForgotSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <p className="text-[13px] leading-relaxed font-medium text-slate-300 mb-2 text-center px-4">To initiate a password reset, enter your associated secure User ID or Email.</p>
                        <div className="space-y-1.5">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail className="text-slate-500" size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 transition-all font-mono text-sm" 
                                    required 
                                    placeholder="Enter Registered ID"
                                    value={resetEmail} 
                                    onChange={(e) => setResetEmail(e.target.value)} 
                                />
                            </div>
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-slate-700 text-white font-bold py-3.5 px-4 rounded-2xl hover:bg-slate-600 hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center"
                        >
                            {isLoading ? <RefreshCw className="animate-spin" size={18} /> : 'Dispatch Recovery Request'}
                        </button>
                        <button type="button" onClick={() => { setView('login'); resetMessages(); }} className="mt-4 w-full flex justify-center items-center gap-1.5 text-[13px] font-bold text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft size={14} /> Back to Auth Layer
                        </button>
                    </form>
                )}

                {view === 'reset' && (
                    <form onSubmit={handleResetSubmit} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <p className="text-[13px] leading-relaxed font-medium text-slate-300 mb-2 text-center px-4">Provide your current secure password followed by the new credentials.</p>
                        
                        <div className="space-y-4">
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <KeyRound className="text-slate-500" size={18} />
                                </div>
                                <input type="password" required placeholder="Current Password" 
                                    value={oldPassword} onChange={e => setOldPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-white text-sm tracking-widest placeholder:tracking-normal" />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="text-slate-500" size={18} />
                                </div>
                                <input type="password" required placeholder="New Secure Password" 
                                    value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-white text-sm tracking-widest placeholder:tracking-normal" />
                            </div>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <ShieldCheck className="text-slate-500" size={18} />
                                </div>
                                <input type="password" required placeholder="Confirm New Password" 
                                    value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:ring-2 focus:ring-indigo-500 text-white text-sm tracking-widest placeholder:tracking-normal" />
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold py-3.5 px-4 rounded-2xl hover:shadow-lg hover:shadow-indigo-500/25 transition-all disabled:opacity-50 flex items-center justify-center p-2"
                        >
                            {isLoading ? <RefreshCw className="animate-spin" size={18} /> : 'Commit Password Core'}
                        </button>
                        <button type="button" onClick={() => { setView('login'); resetMessages(); }} className="mt-4 w-full flex justify-center items-center gap-1.5 text-[13px] font-bold text-slate-400 hover:text-white transition-colors">
                            <ArrowLeft size={14} /> Back to Auth Layer
                        </button>
                    </form>
                )}
            </div>
            
            <div className="absolute bottom-8 w-full flex justify-center opacity-70">
                <span className="text-[9px] text-slate-500 font-mono tracking-[0.2em] uppercase font-bold px-4 py-1.5 border border-slate-800 rounded-full bg-slate-900/80 shadow-sm backdrop-blur-sm">
                    Protected by zero-trust framework • V1.4.2
                </span>
            </div>
        </div>
    );
};

export default Login;
