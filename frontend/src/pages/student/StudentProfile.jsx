import React, { useState, useEffect, useContext } from 'react';
import {
    User, Hash, Building2, Calendar, Mail, GraduationCap,
    Loader2, Clock
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import api from '../../utils/api';

const StudentProfile = () => {
    const { user } = useContext(AuthContext);
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get('/api/dashboard/student/profile');
                setProfile(res.data);
            } catch (err) {
                console.error('Failed to fetch profile:', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, []);

    if (isLoading) {
        return (
            <div style={{ maxWidth:640, margin:'0 auto', padding:'60px 20px', textAlign:'center', color:'var(--text-muted)' }}>
                <Loader2 className="animate-spin" size={22} style={{ margin:'0 auto 8px' }} />
                <span style={{ fontSize:13 }}>Loading profile...</span>
            </div>
        );
    }

    const profileFields = [
        { label: "PRN Number", value: profile?.prn_number, icon: Hash, highlight: true, sublabel: "Permanent Registration Number" },
        { label: "Roll Number", value: profile?.roll_number, icon: User, sublabel: "Class roll number" },
        { label: "Department", value: profile?.department, icon: Building2, sublabel: "Academic department" },
        { label: "Academic Year", value: profile?.year, icon: Calendar, sublabel: "Current year of study" },
        { label: "Email Address", value: profile?.email, icon: Mail, sublabel: "Registered email" },
        { label: "Account Created", value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : null, icon: Clock, sublabel: "Registration date" },
    ];

    return (
        <div style={{ maxWidth:640, margin:'0 auto' }}>
            {/* Page Header */}
            <div className="page-header" style={{ marginBottom:16 }}>
                <div>
                    <h2 className="page-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <User size={18} style={{ color:'#8b5cf6' }}/> My Profile
                    </h2>
                    <p className="page-subtitle">Your academic identity at WCE Sangli.</p>
                </div>
            </div>

            {/* Compact Identity Card — violet theme */}
            <div style={{
                background: 'linear-gradient(135deg, #6d28d9, #7c3aed, #6366f1)',
                borderRadius: 14, padding: '20px 22px', color: '#fff',
                marginBottom: 14,
            }}>
                <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
                    {/* Avatar */}
                    <div style={{
                        width:50, height:50, borderRadius:12,
                        background:'rgba(255,255,255,0.15)',
                        border:'1px solid rgba(255,255,255,0.15)',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:18, fontWeight:800, flexShrink:0,
                    }}>
                        {profile?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                        <h3 style={{ fontSize:'1.1rem', fontWeight:800, margin:0, lineHeight:1.2 }}>{profile?.full_name}</h3>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:6 }}>
                            <span style={{
                                display:'inline-flex', alignItems:'center', gap:4,
                                padding:'2px 8px', borderRadius:5,
                                background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.1)',
                                fontSize:10, fontWeight:700,
                            }}>
                                <GraduationCap size={10}/> Student
                            </span>
                            {profile?.department && (
                                <span style={{
                                    display:'inline-flex', alignItems:'center', gap:4,
                                    padding:'2px 8px', borderRadius:5,
                                    background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.1)',
                                    fontSize:10, fontWeight:700,
                                }}>
                                    <Building2 size={10}/> {profile.department}
                                </span>
                            )}
                            {profile?.year && (
                                <span style={{
                                    display:'inline-flex', alignItems:'center', gap:4,
                                    padding:'2px 8px', borderRadius:5,
                                    background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.1)',
                                    fontSize:10, fontWeight:700,
                                }}>
                                    <Calendar size={10}/> {profile.year}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* PRN inline */}
                    {profile?.prn_number && (
                        <div style={{
                            padding:'8px 14px', borderRadius:8,
                            background:'rgba(255,255,255,0.1)', border:'1px solid rgba(255,255,255,0.08)',
                        }}>
                            <div style={{ fontSize:8, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:700 }}>PRN</div>
                            <div style={{ fontSize:16, fontWeight:800, fontFamily:'monospace', letterSpacing:'1.5px', marginTop:1 }}>{profile.prn_number}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Detail Fields */}
            <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:14 }}>
                <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg-page)' }}>
                    <h3 style={{ fontSize:'0.78rem', fontWeight:700, color:'var(--text-primary)', margin:0 }}>Academic Details</h3>
                </div>
                <div>
                    {profileFields.map((field, i) => {
                        const Icon = field.icon;
                        return (
                            <div key={i} style={{
                                padding:'12px 16px', display:'flex', alignItems:'flex-start', gap:12,
                                borderBottom: i < profileFields.length - 1 ? '1px solid var(--border)' : 'none',
                            }}>
                                <div style={{
                                    padding:7, borderRadius:7, flexShrink:0,
                                    background: field.highlight ? 'rgba(139,92,246,0.08)' : 'var(--bg-page)',
                                    color: field.highlight ? '#8b5cf6' : 'var(--text-muted)',
                                    border: `1px solid ${field.highlight ? 'rgba(139,92,246,0.15)' : 'var(--border)'}`,
                                }}>
                                    <Icon size={14}/>
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                    <div className="section-label" style={{ marginBottom:1 }}>{field.label}</div>
                                    <div style={{
                                        fontWeight: field.highlight ? 800 : 600,
                                        fontSize: field.highlight ? '0.95rem' : '0.82rem',
                                        fontFamily: field.highlight ? 'monospace' : 'inherit',
                                        letterSpacing: field.highlight ? '1px' : 'normal',
                                        color: 'var(--text-primary)',
                                    }}>
                                        {field.value || <span style={{ color:'var(--text-muted)', fontStyle:'italic', fontWeight:400 }}>Not set</span>}
                                    </div>
                                    <div style={{ fontSize:10, color:'var(--text-muted)', marginTop:1 }}>{field.sublabel}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div className="card" style={{ textAlign:'center', padding:12 }}>
                <p style={{ fontSize:11, color:'var(--text-secondary)', margin:0 }}>
                    <span style={{ fontWeight:700, color:'var(--text-primary)' }}>Walchand College of Engineering, Sangli</span>
                </p>
                <p style={{ fontSize:9, color:'var(--text-muted)', marginTop:3 }}>APAM · Student Module</p>
            </div>
        </div>
    );
};

export default StudentProfile;
