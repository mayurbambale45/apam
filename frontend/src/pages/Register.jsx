import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, ShieldCheck, UserPlus, RefreshCw, AlertCircle, CheckCircle2, Building2, Calendar, Fingerprint, Lock, Loader2 } from 'lucide-react';
import api from '../utils/api';

/* ── Mini Captcha Challenge (same as Login) ──────────────────────────────── */
const CaptchaChallenge = ({ onVerified }) => {
    const [state, setState] = useState('idle');
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
            setError('Incorrect. Try again.');
            const c = generateChallenge();
            setChallenge(c);
            setAnswer('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    const handleKeyDown = (e) => { if (e.key === 'Enter') { e.preventDefault(); checkAnswer(); } };

    if (state === 'verified') {
        return (
            <div style={{
                padding:'12px 16px', borderRadius:10,
                background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.2)',
                display:'flex', alignItems:'center', gap:10,
            }}>
                <div style={{ width:22, height:22, borderRadius:6, background:'#10b981', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <CheckCircle2 size={14} style={{ color:'#fff' }}/>
                </div>
                <span style={{ fontSize:13, fontWeight:600, color:'#10b981' }}>Verification passed</span>
                <ShieldCheck size={20} style={{ marginLeft:'auto', color:'#10b981', opacity:0.6 }}/>
            </div>
        );
    }

    if (state === 'challenge') {
        return (
            <div style={{ padding:'14px 16px', borderRadius:10, background:'rgba(99,102,241,0.06)', border:'1px solid rgba(99,102,241,0.15)' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em' }}>Solve to verify</span>
                    <button type="button" onClick={startChallenge} style={{ background:'none', border:'none', cursor:'pointer', padding:4, color:'rgba(255,255,255,0.4)' }} title="New challenge">
                        <RefreshCw size={14}/>
                    </button>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                    <div style={{
                        padding:'8px 14px', borderRadius:8,
                        background:'rgba(99,102,241,0.12)', border:'1px solid rgba(99,102,241,0.2)',
                        fontSize:18, fontWeight:800, color:'#a5b4fc', fontFamily:'monospace', letterSpacing:'2px', whiteSpace:'nowrap',
                    }}>
                        {challenge.question} = ?
                    </div>
                    <input ref={inputRef} type="number" value={answer} onChange={e => setAnswer(e.target.value)} onKeyDown={handleKeyDown} placeholder="?"
                        style={{ width:70, padding:'8px 10px', borderRadius:8, background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)', color:'#fff', fontSize:16, fontWeight:700, fontFamily:'monospace', textAlign:'center', outline:'none' }}
                    />
                    <button type="button" onClick={checkAnswer} style={{ padding:'8px 14px', borderRadius:8, background:'#6366f1', border:'none', cursor:'pointer', color:'#fff', fontSize:12, fontWeight:700 }}>Verify</button>
                </div>
                {error && <div style={{ fontSize:11, color:'#f87171', marginTop:8, fontWeight:600 }}>{error}</div>}
            </div>
        );
    }

    return (
        <div style={{
            padding:'12px 16px', borderRadius:10,
            background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.08)',
            display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', userSelect:'none',
        }} onClick={startChallenge}>
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:22, height:22, borderRadius:6, border:'2px solid rgba(255,255,255,0.2)', background:'rgba(0,0,0,0.2)' }}/>
                <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,0.6)' }}>I am not a robot</span>
            </div>
            <ShieldCheck size={20} style={{ color:'#6366f1', opacity:0.7 }}/>
        </div>
    );
};

/* ── Auth Input ──────────────────────────────────────────────────────────── */
const AuthInput = ({ icon: Icon, ...props }) => (
    <div style={{ position:'relative' }}>
        <div style={{ position:'absolute', top:'50%', left:14, transform:'translateY(-50%)', pointerEvents:'none', color:'rgba(255,255,255,0.25)' }}>
            <Icon size={16}/>
        </div>
        <input {...props} style={{
            width:'100%', padding:'10px 14px 10px 40px', borderRadius:10,
            border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.25)',
            color:'#fff', fontSize:13, outline:'none', ...props.style,
        }}/>
    </div>
);

const AuthSelect = ({ icon: Icon, children, ...props }) => (
    <div style={{ position:'relative' }}>
        <div style={{ position:'absolute', top:'50%', left:14, transform:'translateY(-50%)', pointerEvents:'none', color:'rgba(255,255,255,0.25)' }}>
            <Icon size={16}/>
        </div>
        <select {...props} style={{
            width:'100%', padding:'10px 14px 10px 40px', borderRadius:10,
            border:'1px solid rgba(255,255,255,0.1)', background:'rgba(0,0,0,0.25)',
            color:'#fff', fontSize:13, outline:'none', appearance:'none', cursor:'pointer', ...props.style,
        }}>
            {children}
        </select>
    </div>
);

/* ── Register Component ──────────────────────────────────────────────────── */
const Register = () => {
    const [formData, setFormData] = useState({
        name: '', prn: '', password: '', confirmPassword: '',
        role: 'student', branch: '', year: 'FY'
    });
    const [isRobotChecked, setIsRobotChecked] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => { document.documentElement.classList.add('dark'); }, []);

    const handleRoleChange = (newRole) => {
        let updates = { role: newRole };
        if (newRole === 'Faculty') {
            updates = { ...updates, prn: '', password: '', confirmPassword: '', branch: '', year: 'Faculty' };
        } else {
            updates = { ...updates, prn: '', password: '', confirmPassword: '', branch: '', year: 'FY' };
        }
        setFormData(prev => ({ ...prev, ...updates }));
    };

    const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);
        const trimmedPrn = formData.prn.trim();
        const trimmedName = formData.name.trim();
        const trimmedBranch = formData.branch.trim();

        if (!trimmedName || !trimmedPrn || !formData.password) return setError("Name, ID, and Password are required.");
        if (formData.password !== formData.confirmPassword) return setError("Passwords do not match.");
        if (formData.role === 'student' && !trimmedBranch) return setError("Branch is required for students.");
        if (!isRobotChecked) return setError("Please complete the security verification.");

        setIsLoading(true);
        try {
            await api.post('/api/auth/register', {
                name: trimmedName, prn: trimmedPrn, email: trimmedPrn,
                password: formData.password, confirmPassword: formData.confirmPassword,
                role: formData.role, branch: trimmedBranch, year: formData.year
            });
            setSuccess(true);
            setTimeout(() => navigate('/login'), 2500);
        } catch (err) {
            setError(err.response?.data?.error || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const idLabel = formData.role === 'student' ? 'PRN Number' : 'Faculty ID';
    const idPlaceholder = formData.role === 'student' ? 'e.g. 2022027001' : 'e.g. prof_jain';

    return (
        <div style={{
            minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
            background:'linear-gradient(135deg, #0f111a 0%, #1a1c2e 50%, #0f111a 100%)',
            position:'relative', overflow:'hidden', padding:'20px 0',
        }}>
            <div style={{
                position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)',
                width:600, height:600, borderRadius:'50%',
                background:'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)',
                pointerEvents:'none',
            }}/>

            <div style={{
                width:'100%', maxWidth:440, padding:28, borderRadius:16,
                background:'rgba(24,26,36,0.95)', backdropFilter:'blur(20px)',
                border:'1px solid rgba(255,255,255,0.06)',
                boxShadow:'0 25px 50px rgba(0,0,0,0.4)',
                position:'relative', zIndex:1,
            }}>
                {/* Header */}
                <div style={{ textAlign:'center', marginBottom:22 }}>
                    <div style={{
                        width:48, height:48, borderRadius:12, margin:'0 auto 14px',
                        background:'linear-gradient(135deg, #6366f1, #4f46e5)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        boxShadow:'0 8px 20px rgba(99,102,241,0.25)',
                    }}>
                        <UserPlus size={24} style={{ color:'#fff' }}/>
                    </div>
                    <h2 style={{ fontSize:20, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>Create Account</h2>
                    <p style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,0.3)', marginTop:4, textTransform:'uppercase', letterSpacing:'.12em' }}>
                        WCE Sangli — APAM System
                    </p>
                </div>

                {/* Messages */}
                {error && (
                    <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:10, background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)', display:'flex', alignItems:'flex-start', gap:10, fontSize:12, fontWeight:600, color:'#f87171' }}>
                        <AlertCircle size={14} style={{ flexShrink:0, marginTop:1 }}/> {error}
                    </div>
                )}
                {success && (
                    <div style={{ marginBottom:16, padding:'10px 14px', borderRadius:10, background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.2)', display:'flex', alignItems:'flex-start', gap:10, fontSize:12, fontWeight:600, color:'#34d399' }}>
                        <CheckCircle2 size={14} style={{ flexShrink:0, marginTop:1 }}/> Account created! Redirecting to sign in...
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {/* Role Tabs */}
                    <div style={{ display:'flex', gap:4, padding:4, borderRadius:10, background:'rgba(0,0,0,0.2)', border:'1px solid rgba(255,255,255,0.05)' }}>
                        {['student', 'Faculty'].map(role => (
                            <button key={role} type="button" onClick={() => handleRoleChange(role)} style={{
                                flex:1, padding:'9px 8px', borderRadius:8, border:'none', cursor:'pointer',
                                fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em',
                                background: formData.role === role ? '#6366f1' : 'transparent',
                                color: formData.role === role ? '#fff' : 'rgba(255,255,255,0.35)',
                                boxShadow: formData.role === role ? '0 2px 8px rgba(99,102,241,0.3)' : 'none',
                            }}>
                                {role === 'student' ? 'Student' : 'Faculty'}
                            </button>
                        ))}
                    </div>

                    {/* Name + ID */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6, paddingLeft:2 }}>Full Name</label>
                            <AuthInput icon={User} type="text" name="name" required value={formData.name} onChange={handleChange} placeholder="e.g. Mayur B." />
                        </div>
                        <div>
                            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6, paddingLeft:2 }}>{idLabel}</label>
                            <AuthInput icon={Fingerprint} type="text" name="prn" required value={formData.prn} onChange={handleChange} placeholder={idPlaceholder} style={{ fontFamily:'monospace' }} />
                        </div>
                    </div>

                    {/* Branch + Year */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6, paddingLeft:2 }}>Branch / Dept</label>
                            {formData.role === 'student' ? (
                                <AuthSelect icon={Building2} name="branch" value={formData.branch} onChange={handleChange} required>
                                    <option value="">— Select —</option>
                                    <option value="Computer Science & Engineering">CSE</option>
                                    <option value="Information Technology">IT</option>
                                    <option value="Electronics & Telecommunication">E&TC</option>
                                    <option value="Electrical Engineering">EE</option>
                                    <option value="Mechanical Engineering">ME</option>
                                    <option value="Civil Engineering">CE</option>
                                    <option value="Artificial Intelligence & Data Science">AIDS</option>
                                </AuthSelect>
                            ) : (
                                <AuthInput icon={Building2} type="text" name="branch" value={formData.branch} onChange={handleChange} placeholder="e.g. Computer Dept" />
                            )}
                        </div>
                        <div>
                            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6, paddingLeft:2 }}>Year</label>
                            <AuthSelect icon={Calendar} name="year" value={formData.year} onChange={handleChange}>
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
                            </AuthSelect>
                        </div>
                    </div>

                    {/* Passwords */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6, paddingLeft:2 }}>Password</label>
                            <AuthInput icon={Lock} type="password" name="password" required value={formData.password} onChange={handleChange} placeholder="Create password" style={{ letterSpacing:'2px' }} />
                        </div>
                        <div>
                            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em', marginBottom:6, paddingLeft:2 }}>Confirm</label>
                            <AuthInput icon={ShieldCheck} type="password" name="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} placeholder="Repeat password" style={{ letterSpacing:'2px' }} />
                        </div>
                    </div>

                    {/* Captcha */}
                    <CaptchaChallenge onVerified={setIsRobotChecked} />

                    <button type="submit" disabled={isLoading || success} style={{
                        width:'100%', padding:'11px 16px', borderRadius:10, border:'none', cursor:'pointer',
                        background:'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color:'#fff', fontSize:13, fontWeight:700,
                        display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                        opacity: (isLoading || success) ? 0.6 : 1, marginTop:2,
                        boxShadow:'0 4px 15px rgba(99,102,241,0.25)',
                    }}>
                        {isLoading ? <><Loader2 size={16} className="animate-spin"/> Creating...</> : 'Create Account'}
                    </button>

                    <div style={{ textAlign:'center', marginTop:8 }}>
                        <span style={{ fontSize:12, color:'rgba(255,255,255,0.3)' }}>
                            Already registered? <Link to="/login" style={{ color:'#818cf8', fontWeight:600, textDecoration:'none' }}>Sign In</Link>
                        </span>
                    </div>
                </form>
            </div>

            <div style={{ position:'absolute', bottom:20, width:'100%', textAlign:'center' }}>
                <span style={{
                    fontSize:9, color:'rgba(255,255,255,0.2)', fontFamily:'monospace',
                    textTransform:'uppercase', letterSpacing:'.15em', fontWeight:600,
                    padding:'4px 12px', border:'1px solid rgba(255,255,255,0.05)', borderRadius:20,
                    background:'rgba(0,0,0,0.3)',
                }}>
                    APAM v1.4 · WCE Sangli
                </span>
            </div>
        </div>
    );
};

export default Register;
