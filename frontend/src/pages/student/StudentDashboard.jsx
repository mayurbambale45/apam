import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    GraduationCap, FileText, CheckCircle2, Clock, BarChart3, TrendingUp,
    BookOpen, ArrowRight, AlertTriangle, Loader2, Hash, Building2, Calendar
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const StudentDashboard = () => {
    const { user } = useContext(AuthContext);
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [stats, setStats] = useState(null);
    const [exams, setExams] = useState([]);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLoadingExams, setIsLoadingExams] = useState(true);

    useEffect(() => {
        fetchProfile();
        fetchStats();
        fetchExams();
    }, []);

    const fetchProfile = async () => {
        try { const res = await api.get('/api/dashboard/student/profile'); setProfile(res.data); }
        catch (err) { console.error(err); }
        finally { setIsLoadingProfile(false); }
    };
    const fetchStats = async () => {
        try { const res = await api.get('/api/dashboard/student/stats'); setStats(res.data); }
        catch (err) { console.error(err); }
        finally { setIsLoadingStats(false); }
    };
    const fetchExams = async () => {
        try { const res = await api.get('/api/dashboard/student/my-exams'); setExams(res.data); }
        catch (err) { console.error(err); }
        finally { setIsLoadingExams(false); }
    };

    const metricsCards = stats ? [
        { title: "Exams Attempted", value: stats.totalSubmissions, icon: FileText, accent: '#6366f1' },
        { title: "Results Declared", value: stats.gradedSubmissions, icon: CheckCircle2, accent: '#10b981' },
        { title: "Awaiting Evaluation", value: stats.pendingSubmissions, icon: Clock, accent: '#f59e0b' },
        { title: "Average Score", value: stats.averageScore, icon: TrendingUp, accent: '#8b5cf6' },
    ] : [];

    return (
        <div className="max-w-7xl mx-auto" style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* Compact Hero */}
            <div style={{
                background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)',
                borderRadius: 16, padding: '24px 28px', color: '#fff',
                position: 'relative', overflow: 'hidden',
            }}>
                <div style={{
                    position:'absolute', inset:0, opacity:0.05,
                    backgroundImage: "url(\"data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDE4aDEydjEySDE4eiIvPjwvZz48L2c+PC9zdmc+\")",
                }}/>
                <div style={{ position:'relative', zIndex:1, display:'flex', flexWrap:'wrap', justifyContent:'space-between', alignItems:'center', gap:16 }}>
                    <div>
                        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                            <div style={{ padding:6, background:'rgba(255,255,255,0.12)', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)' }}>
                                <GraduationCap size={18} style={{ color:'#c4b5fd' }}/>
                            </div>
                            <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.1)' }}>
                                Student
                            </span>
                        </div>
                        <h1 style={{ fontSize:'1.3rem', fontWeight:800, letterSpacing:'-0.02em', margin:0 }}>
                            Welcome, {user?.full_name?.split(' ')[0]}
                        </h1>
                        <p style={{ fontSize:12, color:'#c4b5fd', marginTop:4, maxWidth:420 }}>
                            WCE Sangli — Academic Paper Assessment & Management System
                        </p>
                    </div>

                    {/* Compact PRN pill */}
                    {!isLoadingProfile && profile && (
                        <div style={{
                            display:'flex', alignItems:'center', gap:14,
                            padding:'10px 16px', borderRadius:12,
                            background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.08)',
                            backdropFilter:'blur(8px)',
                        }}>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <Hash size={12} style={{ color:'#c4b5fd' }}/>
                                <div>
                                    <div style={{ fontSize:8, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:700 }}>PRN</div>
                                    <div style={{ fontSize:14, fontWeight:800, fontFamily:'monospace', letterSpacing:'1px' }}>{profile.prn_number || '—'}</div>
                                </div>
                            </div>
                            <div style={{ width:1, height:24, background:'rgba(255,255,255,0.15)' }}/>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <Building2 size={12} style={{ color:'#c4b5fd' }}/>
                                <span style={{ fontSize:12, fontWeight:600 }}>{profile.department || '—'}</span>
                            </div>
                            <div style={{ width:1, height:24, background:'rgba(255,255,255,0.15)' }}/>
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <Calendar size={12} style={{ color:'#c4b5fd' }}/>
                                <span style={{ fontSize:12, fontWeight:600 }}>{profile.year || '—'}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Metrics */}
            {isLoadingStats ? (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12 }}>
                    {[1,2,3,4].map(i => (
                        <div key={i} className="card" style={{ padding:16 }}>
                            <div style={{ height:10, width:60, background:'var(--border)', borderRadius:4, marginBottom:10 }} className="animate-pulse"/>
                            <div style={{ height:24, width:40, background:'var(--border)', borderRadius:4 }} className="animate-pulse"/>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(180px, 1fr))', gap:12 }}>
                    {metricsCards.map((metric, index) => {
                        const Icon = metric.icon;
                        return (
                            <div key={index} className="card" style={{ padding:16, display:'flex', flexDirection:'column', gap:6, cursor:'default', transition:'transform 200ms, box-shadow 200ms' }}
                                onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 6px 20px rgba(0,0,0,0.08)'; }}
                                onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
                            >
                                <div style={{ padding:8, borderRadius:8, width:'fit-content', background:`${metric.accent}15`, color:metric.accent }}>
                                    <Icon size={18}/>
                                </div>
                                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--text-muted)' }}>{metric.title}</div>
                                <div style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--text-primary)', lineHeight:1 }}>{metric.value}</div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Exam Submissions */}
            <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                    <h2 style={{ fontSize:'0.95rem', fontWeight:700, color:'var(--text-primary)', display:'flex', alignItems:'center', gap:8, margin:0 }}>
                        <BookOpen size={16} style={{ color:'#8b5cf6' }}/> My Exam Submissions
                    </h2>
                    <button onClick={() => navigate('/student/submissions')} style={{
                        background:'none', border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
                        color:'#8b5cf6', display:'flex', alignItems:'center', gap:4,
                    }}>
                        View All <ArrowRight size={13}/>
                    </button>
                </div>

                {isLoadingExams ? (
                    <div style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>
                        <Loader2 className="animate-spin" size={20} style={{ display:'inline-block', marginRight:8 }}/>Loading...
                    </div>
                ) : exams.length === 0 ? (
                    <div className="card" style={{ textAlign:'center', padding:40 }}>
                        <FileText size={36} style={{ margin:'0 auto 12px', color:'var(--text-muted)', opacity:0.4 }}/>
                        <h3 style={{ fontSize:'0.95rem', fontWeight:700, color:'var(--text-primary)', marginBottom:4 }}>No Submissions Yet</h3>
                        <p style={{ fontSize:12, color:'var(--text-muted)' }}>Your answer scripts will appear here once uploaded by the Examination Cell.</p>
                    </div>
                ) : (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
                        {exams.map((exam, index) => {
                            const isGraded = exam.status === 'graded';
                            return (
                                <div key={index} className="card" style={{ padding:0, overflow:'hidden', display:'flex', flexDirection:'column', transition:'transform 200ms, box-shadow 200ms', cursor:'default' }}
                                    onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.1)'; }}
                                    onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none'; }}
                                >
                                    <div style={{ padding:'16px 18px', flex:1 }}>
                                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                                            <span className="badge badge-indigo">
                                                <BookOpen size={10}/> {exam.courseCode}
                                            </span>
                                            {isGraded ? (
                                                <span className="badge badge-emerald"><CheckCircle2 size={10}/> Graded</span>
                                            ) : (
                                                <span className="badge badge-amber"><Clock size={10}/> Pending</span>
                                            )}
                                        </div>
                                        <h3 style={{ fontSize:'0.9rem', fontWeight:700, color:'var(--text-primary)', margin:'0 0 4px' }}>{exam.examName}</h3>

                                        {isGraded && (
                                            <div style={{ marginTop:12, paddingTop:12, borderTop:'1px solid var(--border)', display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                                                <div>
                                                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--text-muted)' }}>Score</span>
                                                    <p style={{ fontSize:'1.6rem', fontWeight:800, color:'var(--text-primary)', lineHeight:1, marginTop:2 }}>{exam.totalScore}</p>
                                                </div>
                                                <BarChart3 size={22} style={{ color:'var(--border)' }}/>
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ borderTop:'1px solid var(--border)', padding:'10px 18px', background:'var(--bg-page)' }}>
                                        {isGraded && exam.evaluationId ? (
                                            <button onClick={() => navigate('/student/submissions', { state: { viewEvalId: exam.evaluationId, examDetails: exam } })}
                                                className="btn btn-sky" style={{ width:'100%', justifyContent:'center' }}>
                                                View Detailed AI Feedback
                                            </button>
                                        ) : (
                                            <div style={{ textAlign:'center', fontSize:12, color:'var(--text-muted)', display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:2 }}>
                                                <Clock size={13}/> Evaluation in progress...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StudentDashboard;
