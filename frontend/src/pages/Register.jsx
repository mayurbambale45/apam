import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, ShieldCheck, UserPlus, RefreshCw, AlertCircle, CheckCircle2, GraduationCap, Building2, Calendar, Fingerprint, Lock } from 'lucide-react';
import api from '../utils/api';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        prn: '',
        password: '',
        confirmPassword: '',
        role: 'student',
        branch: '',
        year: 'FY'
    });
    const [isRobotChecked, setIsRobotChecked] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    
    const navigate = useNavigate();

    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    // Handle role switching - only student and Faculty
    const handleRoleChange = (newRole) => {
        let updates = { role: newRole };
        
        if (newRole === 'Faculty') {
            updates.prn = '';
            updates.password = '';
            updates.confirmPassword = '';
            updates.branch = '';
            updates.year = 'Faculty';
        } else {
            // Student defaults
            updates.prn = '';
            updates.password = '';
            updates.confirmPassword = '';
            updates.branch = '';
            updates.year = 'FY';
        }
        
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        
        // Sanitize identifiers
        const trimmedPrn = formData.prn.trim();
        const trimmedName = formData.name.trim();
        const trimmedBranch = formData.branch.trim();

        if (!trimmedName || !trimmedPrn || !formData.password) {
            setError("Validation Alert: Name, PRN/ID, and Password are required.");
            return;
        }

        if (!formData.password) {
            setError("Password is required.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Logic Error: Passwords do not match. Verification failed.");
            return;
        }

        if (formData.role === 'student' && !trimmedBranch) {
            setError("Validation Alert: Student branch is mandatory.");
            return;
        }

        if (!isRobotChecked) {
            setError("Safety Check: Please verify you are not a robot.");
            return;
        }

        setIsLoading(true);

        try {
            await api.post('/api/auth/register', {
                name: trimmedName,
                prn: trimmedPrn,
                email: trimmedPrn, // Use sanitized PRN/Username as the primary identifier
                password: formData.password,
                confirmPassword: formData.confirmPassword,
                role: formData.role,
                branch: trimmedBranch,
                year: formData.year
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.response?.data?.error || 'Node Registration Error: System could not finalize user creation.');
        } finally {
            setIsLoading(false);
        }
    };

    // Dynamic Labels based on Role
    const idLabel = formData.role === 'student' ? 'PRN Number (User ID)' : 'Username / Faculty ID';
    const idPlaceholder = formData.role === 'student' ? 'e.g. 2022027001' : 'e.g. prof_jain';

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-900 overflow-hidden relative py-12">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-blue-600/10 blur-[160px] rounded-full pointer-events-none"></div>

            <div className="w-full max-w-xl bg-slate-800/95 backdrop-blur-3xl p-10 rounded-3xl shadow-2xl border border-slate-700/50 z-10 relative">
                <div className="text-center mb-10">
                    <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-blue-500/30">
                        <UserPlus className="text-white" size={40} />
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tight">Access Provisioning</h2>
                    <p className="text-[11px] font-bold text-slate-400 mt-3 tracking-[0.3em] uppercase">Walchand College of Engineering</p>
                </div>
                
                {error && (
                    <div className="mb-8 p-4 bg-red-900/40 text-red-300 rounded-2xl border border-red-800/50 text-sm flex items-start gap-3 shadow-inner">
                        <AlertCircle className="flex-shrink-0 mt-0.5" size={16} />
                        <span className="font-semibold">{error}</span>
                    </div>
                )}

                {success && (
                    <div className="mb-8 p-4 bg-emerald-900/40 text-emerald-400 rounded-2xl border border-emerald-800/50 text-sm flex items-start gap-3 shadow-inner">
                        <CheckCircle2 className="flex-shrink-0 mt-0.5" size={16} />
                        <span className="font-semibold">Account Initialized. Migrating to authentication layer...</span>
                    </div>
                )}
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Role Selection Tabs - Only Student and Faculty */}
                    <div className="bg-slate-900/60 p-1.5 rounded-2xl border border-slate-700/50 flex gap-1 mb-2">
                        {['student', 'Faculty'].map((role) => (
                            <button
                                key={role}
                                type="button"
                                onClick={() => handleRoleChange(role)}
                                className={`flex-1 py-3 px-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                    formData.role === role 
                                    ? 'bg-blue-600 text-white shadow-lg' 
                                    : 'text-slate-500 hover:bg-slate-800/50'
                                }`}
                            >
                                {role === 'student' ? 'Student' : 'Faculty'}
                            </button>
                        ))}
                    </div>


                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-slate-300 text-[10px] font-black uppercase tracking-widest pl-1">Full Name</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500">
                                    <User className="text-slate-500" size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    name="name"
                                    required 
                                    value={formData.name} 
                                    onChange={handleChange}
                                    placeholder="e.g. Mayur B."
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 transition-all text-sm shadow-inner" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-slate-300 text-[10px] font-black uppercase tracking-widest pl-1">{idLabel}</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-blue-500">
                                    <Fingerprint className="text-slate-500" size={18} />
                                </div>
                                <input 
                                    type="text" 
                                    name="prn"
                                    required 
                                    value={formData.prn} 
                                    onChange={handleChange}
                                    placeholder={idPlaceholder}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 transition-all font-mono text-sm shadow-inner"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Branch and Year - Only for relevant roles */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-slate-300 text-[10px] font-black uppercase tracking-widest pl-1">Branch / Dept</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Building2 className="text-slate-500" size={18} />
                                </div>
                                {formData.role === 'student' ? (
                                    <select
                                        name="branch"
                                        value={formData.branch}
                                        onChange={handleChange}
                                        required
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white text-sm appearance-none cursor-pointer"
                                    >
                                        <option value="">— Select Branch —</option>
                                        <option value="Computer Science &amp; Engineering">Computer Science &amp; Engineering</option>
                                        <option value="Information Technology">Information Technology</option>
                                        <option value="Electronics &amp; Telecommunication">Electronics &amp; Telecommunication</option>
                                        <option value="Electrical Engineering">Electrical Engineering</option>
                                        <option value="Mechanical Engineering">Mechanical Engineering</option>
                                        <option value="Civil Engineering">Civil Engineering</option>
                                        <option value="Artificial Intelligence &amp; Data Science">Artificial Intelligence &amp; Data Science</option>
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        name="branch"
                                        value={formData.branch}
                                        onChange={handleChange}
                                        placeholder="e.g. Computer Department"
                                        className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 text-sm shadow-inner"
                                    />
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-slate-300 text-[10px] font-black uppercase tracking-widest pl-1">Year / Grade</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Calendar className="text-slate-500" size={18} />
                                </div>
                                <select 
                                    name="year"
                                    value={formData.year}
                                    onChange={handleChange}
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white transition-all text-sm appearance-none cursor-pointer"
                                >
                                    {formData.role === 'student' ? (
                                        <>
                                            <option value="FY">First Year (FY)</option>
                                            <option value="SY">Second Year (SY)</option>
                                            <option value="TY">Third Year (TY)</option>
                                            <option value="LY">Last Year (LY)</option>
                                        </>
                                    ) : (
                                        <option value="Faculty">Faculty Staff</option>
                                    )}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="block text-slate-300 text-[10px] font-black uppercase tracking-widest pl-1">Secure Password</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock className="text-slate-500" size={18} />
                                </div>
                                <input 
                                    type="password" 
                                    name="password"
                                    required 
                                    value={formData.password} 
                                    onChange={handleChange}
                                    placeholder="Create a password"
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 transition-all text-sm tracking-widest shadow-inner" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-slate-300 text-[10px] font-black uppercase tracking-widest pl-1">Confirm Identity</label>
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <ShieldCheck className="text-slate-500" size={18} />
                                </div>
                                <input 
                                    type="password" 
                                    name="confirmPassword"
                                    required 
                                    value={formData.confirmPassword} 
                                    onChange={handleChange}
                                    placeholder="Repeat Password"
                                    className="w-full pl-12 pr-4 py-3.5 bg-slate-900/50 border border-slate-700/80 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder-slate-600 transition-all text-sm tracking-widest shadow-inner" 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="p-4 bg-slate-900/40 border border-slate-700/60 rounded-2xl flex items-center justify-between select-none shadow-inner backdrop-blur-sm">
                        <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => setIsRobotChecked(!isRobotChecked)}>
                            <div className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center transition-all duration-500 ${isRobotChecked ? 'bg-blue-600 border-blue-400 shadow-lg' : 'bg-slate-800 border-slate-600'}`}>
                                <CheckCircle2 size={18} className={`text-white transition-transform duration-500 ${isRobotChecked ? 'scale-100' : 'scale-0'}`} />
                            </div>
                            <span className={`text-[13px] font-bold tracking-wide transition-colors ${isRobotChecked ? 'text-white' : 'text-slate-400'}`}>Human Session Verification</span>
                        </div>
                        <ShieldCheck size={28} className="text-blue-500 drop-shadow-lg" />
                    </div>

                    <button 
                        type="submit" 
                        disabled={isLoading || success}
                        className="w-full mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-4 px-4 rounded-2xl shadow-2xl transition-all duration-300 disabled:opacity-50 uppercase tracking-widest"
                    >
                        {isLoading ? <RefreshCw className="animate-spin inline-block" /> : 'Initialize Node'}
                    </button>
                    
                    <div className="text-center mt-8 text-[11px] font-black text-slate-500 uppercase tracking-widest">
                        Enrolled already? <Link to="/login" className="text-blue-400 hover:text-white transition-colors border-b border-blue-400/30 ml-2">Authenticate</Link>
                    </div>
                </form>
            </div>
            
            <div className="absolute bottom-6 w-full flex justify-center opacity-60">
                <span className="text-[8px] text-slate-500 font-mono tracking-[0.3em] uppercase font-bold px-6 py-2 border border-slate-800 rounded-full bg-slate-900/60 shadow-sm backdrop-blur-md">
                    Security Layer 1.4.52 • Enterprise Enrollment
                </span>
            </div>
        </div>
    );
};

export default Register;
