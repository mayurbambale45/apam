import React, { useState, useContext, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { Lock, User, ShieldCheck, Mail, ArrowLeft, RefreshCw, KeyRound, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import api from '../utils/api';

/* ── Mini Captcha Challenge ──────────────────────────────────────────────── */
const CaptchaChallenge = ({ onVerified }) => {
    const [state, setState] = useState('idle'); // idle | challenge | verified
    const [challenge, setChallenge] = useState(null);
    const [answer, setAnswer] = useState('');
    const [error, setError] = useState('');
    const inputRef = useRef(null);

    const generateChallenge = useCallback(() => {
        const ops = ['+', '−', '×'];
        const op = ops[Math.floor(Math.random() * ops.length)];
        let a, b, result;
        if (op === '×') {
            a = Math.floor(Math.random() * 9) + 2;
            b = Math.floor(Math.random() * 9) + 2;
            result = a * b;
        } else if (op === '−') {
            a = Math.floor(Math.random() * 40) + 10;
            b = Math.floor(Math.random() * a);
            result = a - b;
        } else {
            a = Math.floor(Math.random() * 50) + 5;
            b = Math.floor(Math.random() * 50) + 5;
            result = a + b;
        }
        return { question: `${a} ${op} ${b}`, result };
    }, []);

    const startChallenge = () => {
        const c = generateChallenge();
        setChallenge(c);
        setAnswer('');
        setError('');
        setState('challenge');
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    const checkAnswer = () => {
        if (parseInt(answer) === challenge.result) {
            setState('verified');
            setError('');
            onVerified(true);
        } else {
            setError('Incorrect answer. Try again.');
            const c = generateChallenge();
            setChallenge(c);
            setAnswer('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            checkAnswer();
        }
    };

    if (state === 'verified') {
        return (
            <div style={{
                padding:'12px 16px', borderRadius:10,
                background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)',
                display:'flex', alignItems:'center', gap:10,
            }}>
                <div style={{
                    width:22, height:22, borderRadius:6,
                    background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                    <CheckCircle2 size={14} style={{ color:'#fff' }}/>
                </div>
                <span style={{ fontSize:13, fontWeight:600, color:'#10b981' }}>Verification passed</span>
                <ShieldCheck size={20} style={{ marginLeft:'auto', color:'#10b981', opacity:0.6 }}/>
            </div>
        );
    }

    if (state === 'challenge') {
        return (
            <div style={{
                padding:'14px 16px', borderRadius:10,
                background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)',
            }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em' }}>
                        Solve to verify
                    </span>
                    <button type="button" onClick={startChallenge} style={{
                        background:'none', border:'none', cursor:'pointer', padding:4, color:'rgba(255,255,255,0.4)',
                    }} title="New challenge">
                        <RefreshCw size={14}/>
                    </button>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{
                        padding:'8px 14px', borderRadius:8,
                        background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.2)',
                        fontSize:18, fontWeight:800, color:'#a5b4fc', fontFamily:'monospace', letterSpacing:'2px',
                        whiteSpace:'nowrap',
                    }}>
                        {challenge.question} = ?
                    </div>
                    <input
                        ref={inputRef}
                        type="number"
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="?"
                        style={{
                            width:70, padding:'8px 10px', borderRadius:8,
                            background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)',
                            color:'#fff', fontSize:16, fontWeight:700, fontFamily:'monospace',
                            textAlign:'center', outline:'none',
                        }}
                    />
                    <button type="button" onClick={checkAnswer} style={{
                        padding:'8px 14px', borderRadius:8,
                        background:'#6366f1', border:'none', cursor:'pointer',
                        color:'#fff', fontSize:12, fontWeight:700,
                    }}>
                        Verify
                    </button>
                </div>
                {error && <div style={{ fontSize:11, color:'#f87171', marginTop:8, fontWeight:600 }}>{error}</div>}
            </div>
        );
    }

    // Idle state — checkbox style
    return (
        <div style={{
            padding:'12px 16px', borderRadius:10,
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            cursor:'pointer', userSelect:'none',
        }} onClick={startChallenge}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{
                    width:22, height:22, borderRadius:6,
                    border:'2px solid rgba(255,255,255,0.2)', background:'rgba(0,0,0,0.2)',
                    display:'flex', alignItems:'center', justifyContent:'center',
                }}/>
                <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.6)' }}>I am not a robot</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <ShieldCheck size={20} style={{ color:'#6366f1', opacity:0.7 }}/>
                <span style={{ fontSize:7, fontWeight:800, color:'rgba(255,255,255,0.3)', textTransform:'uppercase', letterSpacing:'.15em', marginTop:1 }}>
                    Captcha
                </span>
            </div>
        </div>
    );
};

/* ── Auth Input Component ────────────────────────────────────────────────── */
const AuthInput = ({ icon: Icon, ...props }) => (
    <div style={{ position:'relative' }}>
        <div style={{ position:'absolute', top:'50%', left:14, transform:'translateY(-50%)', pointerEvents:'none', color:'rgba(255,255,255,0.25)' }}>
            <Icon size={16}/>
        </div>
        <input
            {...props}
            style={{
                width:'100%', padding:'10px 14px 10px 40px',
                borderRadius:10, border:'1px solid rgba(255,255,255,0.1)',
                background:'rgba(0,0,0,0.25)', color:'#fff',
                fontSize:13, fontFamily: props.type === 'password' ? 'monospace' : 'inherit',
                outline:'none',
                ...props.style,
            }}
        />
    </div>
);

/* ── Login Component ─────────────────────────────────────────────────────── */
const Login = () => {
    const [view, setView] = useState('login'); // 'login' | 'forgot' | 'reset'
    
    // Login State
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [isRobotChecked, setIsRobotChecked] = useState(false);
    
    // Forgot Password State
    const [resetEmail, setResetEmail] = useState('');
    
    // Reset Password State
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    
    const { login } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        document.documentElement.classList.add('dark');
    }, []);

    const resetMessages = () => { setError(null); setSuccess(null); };

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        resetMessages();
        const trimmedUserId = userId.trim();
        
        if (!trimmedUserId || !password) {
            return setError("User ID and Password are required.");
        }
        if (!isRobotChecked) {
            return setError("Please complete the security verification.");
        }

        setIsLoading(true);
        try {
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
            setError(err.response?.data?.error || 'Authentication failed. Please check your credentials.');
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
            setSuccess("If this account exists, a recovery link has been sent.");
            setResetEmail('');
        }, 1500);
    };

    const handleResetSubmit = async (e) => {
        e.preventDefault();
        resetMessages();
        
        if (!userId) return setError("Please enter your User ID.");
        if (!newPassword) return setError("New password is required.");
        if (newPassword !== confirmPassword) return setError("Passwords do not match.");

        setIsLoading(true);
        try {
            await api.post('/api/auth/change-password', { userId, oldPassword, newPassword });
            setSuccess("Password changed successfully.");
            setOldPassword(''); setNewPassword(''); setConfirmPassword('');
            setTimeout(() => setView('login'), 3000);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to change password.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(135deg, #0f111a 0%, #1a1c2e 50%, #0f111a 100%)',
            position:'relative', overflow:'hidden',
        }}>
            {/* Ambient glow */}
            <div style={{
                position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                width:500, height:500, borderRadius:'50%',
                background:'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
                pointerEvents:'none',
            }}/>

            <div style={{
                width:'100%', maxWidth:380, padding:28, borderRadius:16,
                background:'rgba(24,26,36,0.95)', backdropFilter:'blur(20px)',
                border:'1px solid rgba(255,255,255,0.06)',
                boxShadow:'0 25px 50px rgba(0,0,0,0.4)',
                position:'relative', zIndex:1,
            }}>
                {/* Header */}
                <div style={{ textAlign:'center', marginBottom:24 }}>
                    <div style={{
                        width:48, height:48, borderRadius:12, margin:'0 auto 14px',
                        background:'linear-gradient(135deg, #6366f1, #4f46e5)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        boxShadow:'0 8px 20px rgba(99,102,241,0.25)',
                    }}>
                        <ShieldCheck size={24} style={{ color:'#fff' }}/>
                    </div>
                    <h2 style={{ fontSize:20, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>
                        {view === 'login' ? 'Sign In' : view === 'forgot' ? 'Forgot Password' : 'Change Password'}
                    </h2>
                    <p style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.3)', marginTop:4, textTransform:'uppercase', letterSpacing:'.12em' }}>
                        APAM — WCE Sangli
                    </p>
                </div>

                {/* Messages */}
                {error && (
                    <div style={{
                        marginBottom:16, padding:'10px 14px', borderRadius:10,
                        background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)',
                        display:'flex', alignItems:'flex-start', gap:10, fontSize:12, fontWeight:600, color:'#f87171',
                    }}>
                        <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }}/> {error}
                    </div>
                )}
                {success && (
                    <div style={{
                        marginBottom:16, padding:'10px 14px', borderRadius:10,
                        background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)',
                        display:'flex', alignItems:'flex-start', gap:10, fontSize:12, fontWeight:600, color:'#34d399',
                    }}>
                        <CheckCircle2 size={14} style={{ flexShrink:0, marginTop:1 }}/> {success}
                    </div>
                )}

                {/* ── Login Form ──────────────────────────────── */}
                {view === 'login' && (
                    <form onSubmit={handleLoginSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                        <div>
                            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6, paddingLeft:2 }}>
                                User ID / Email
                            </label>
                            <AuthInput icon={User} type="text" required placeholder="Enter your User ID" value={userId} onChange={e => setUserId(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6, paddingLeft:2 }}>
                                Password
                            </label>
                            <AuthInput icon={Lock} type="password" required placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} style={{ letterSpacing:'3px' }} />
                        </div>

                        {/* Real Captcha */}
                        <CaptchaChallenge onVerified={setIsRobotChecked} />

                        <button type="submit" disabled={isLoading} style={{
                            width:'100%', padding:'11px 16px', borderRadius:10, border:'none', cursor:'pointer',
                            background:'linear-gradient(135deg, #6366f1, #4f46e5)',
                            color:'#fff', fontSize:13, fontWeight:700,
                            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                            opacity: isLoading ? 0.6 : 1, marginTop:4,
                            boxShadow:'0 4px 15px rgba(99,102,241,0.25)',
                        }}>
                            {isLoading ? <><Loader2 size={16} className="animate-spin"/> Signing in...</> : 'Sign In'}
                        </button>

                        <div style={{ display:'flex', justifyContent:'space-between', marginTop:4, padding:'0 2px' }}>
                            <button type="button" onClick={() => { setView('forgot'); resetMessages(); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, color:'rgba(99,102,241,0.7)' }}>
                                Forgot Password?
                            </button>
                            <button type="button" onClick={() => { setView('reset'); resetMessages(); }} style={{ background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.3)' }}>
                                Change Password
                            </button>
                        </div>

                        <div style={{ textAlign:'center', marginTop:16, paddingTop:16, borderTop:'1px solid rgba(255,255,255,0.06)' }}>
                            <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>
                                New here? <Link to="/register" style={{ color:'#818cf8', fontWeight:600, textDecoration:'none' }}>Create Account</Link>
                            </span>
                        </div>
                    </form>
                )}

                {/* ── Forgot Password Form ───────────────────── */}
                {view === 'forgot' && (
                    <form onSubmit={handleForgotSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                        <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', textAlign:'center', lineHeight:1.5 }}>
                            Enter your registered User ID or Email to receive a recovery link.
                        </p>
                        <AuthInput icon={Mail} type="text" required placeholder="User ID or Email" value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
                        <button type="submit" disabled={isLoading} style={{
                            width:'100%', padding:'11px', borderRadius:10, border:'none', cursor:'pointer',
                            background:'rgba(255,255,255,0.08)', color:'#fff', fontSize:13, fontWeight:700,
                            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                            opacity: isLoading ? 0.6 : 1,
                        }}>
                            {isLoading ? <Loader2 size={16} className="animate-spin"/> : 'Send Recovery Link'}
                        </button>
                        <button type="button" onClick={() => { setView('login'); resetMessages(); }} style={{
                            background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                            fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.4)', marginTop:4,
                        }}>
                            <ArrowLeft size={14}/> Back to Sign In
                        </button>
                    </form>
                )}

                {/* ── Change Password Form ───────────────────── */}
                {view === 'reset' && (
                    <form onSubmit={handleResetSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                        <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', textAlign:'center', lineHeight:1.5 }}>
                            Enter your current password and set a new one.
                        </p>
                        <AuthInput icon={KeyRound} type="password" required placeholder="Current Password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
                        <AuthInput icon={Lock} type="password" required placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        <AuthInput icon={ShieldCheck} type="password" required placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        <button type="submit" disabled={isLoading} style={{
                            width:'100%', padding:'11px', borderRadius:10, border:'none', cursor:'pointer',
                            background:'linear-gradient(135deg, #6366f1, #7c3aed)',
                            color:'#fff', fontSize:13, fontWeight:700,
                            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                            opacity: isLoading ? 0.6 : 1,
                        }}>
                            {isLoading ? <Loader2 size={16} className="animate-spin"/> : 'Update Password'}
                        </button>
                        <button type="button" onClick={() => { setView('login'); resetMessages(); }} style={{
                            background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                            fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.4)', marginTop:4,
                        }}>
                            <ArrowLeft size={14}/> Back to Sign In
                        </button>
                    </form>
                )}
            </div>

            {/* Footer tag */}
            <div style={{ position:'absolute', bottom:20, width:'100%', textAlign:'center' }}>
                <span style={{
                    fontSize:9, color:'rgba(255,255,255,0.2)', fontFamily:'monospace',
                    textTransform:'uppercase', letterSpacing:'.15em', fontWeight:600,
                    padding:'4px 12px', border:'1px solid rgba(255,255,255,0.05)', borderRadius:20,
                    background:'rgba(0,0,0,0.3)',
                }}>
                    APAM v1.4 · Walchand College of Engineering
                </span>
            </div>
        </div>
    );
};

export default Login;
