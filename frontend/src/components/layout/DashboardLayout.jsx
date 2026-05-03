import React, { useContext, useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    LayoutDashboard, FilePlus, LogOut, CheckSquare, ClipboardList,
    Shield, Users, BookOpen, UploadCloud, FileText, BarChart3,
    PieChart, Activity, Layers, Sun, Moon, MessageSquare,
    Menu, X, ChevronLeft, ChevronRight, Bell, AlertTriangle
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';
import NotificationBell from '../NotificationBell';

/* ── role → colour accent ───────────────────────────────────────────────── */
const ROLE_ACCENT = {
    Faculty:       '#6366f1',  // indigo
    'Exam Cell':   '#0ea5e9',  // sky
    administrator: '#f59e0b',  // amber
    student:       '#10b981',  // emerald
};

/* ── role → nav links ───────────────────────────────────────────────────── */
const NAV = {
    Faculty: [
        { name: 'Dashboard',         path: '/instructor/dashboard',   icon: LayoutDashboard },
        { name: 'Manage Exams',      path: '/instructor/exams',       icon: ClipboardList },
        { name: 'Upload Answer Key', path: '/instructor/answer-key',  icon: UploadCloud },
        { name: 'Configure Rubrics', path: '/instructor/rubrics',     icon: CheckSquare },
        { name: 'View Submissions',  path: '/instructor/submissions', icon: FileText },
        { name: 'Evaluations',       path: '/instructor/evaluations', icon: BarChart3 },
        { name: 'Pipeline Monitor',  path: '/instructor/pipeline',    icon: Activity },
        { name: 'Analytics',         path: '/instructor/analytics',   icon: PieChart },
        { name: 'Grievances',        path: '/instructor/grievances',  icon: MessageSquare },
    ],
    student: [
        { name: 'Dashboard',  path: '/student/dashboard',   icon: LayoutDashboard },
        { name: 'Results',    path: '/student/submissions',  icon: FileText },
        { name: 'My Profile', path: '/student/profile',     icon: Users },
    ],
    administrator: [
        { name: 'Dashboard',       path: '/administrator-dashboard', icon: Shield },
        { name: 'User Management', path: '/admin/users',             icon: Users },
        { name: 'Exam Management', path: '/admin/exams',             icon: BookOpen },
        { name: 'Submissions',     path: '/admin/submissions',       icon: FileText },
        { name: 'Evaluations',     path: '/admin/evaluations',       icon: BarChart3 },
    ],
    'Exam Cell': [
        { name: 'Dashboard',        path: '/examination_system-dashboard',  icon: LayoutDashboard },
        { name: 'Upload Scripts',   path: '/examination_system/uploads',    icon: UploadCloud },
        { name: 'Bulk Upload',      path: '/examination_system/bulk-upload',icon: Layers },
        { name: 'Pipeline Monitor', path: '/examination_system/pipeline',   icon: Activity },
    ],
};

/* ── Role label ─────────────────────────────────────────────────────────── */
const ROLE_LABEL = {
    Faculty:       'Faculty Portal',
    'Exam Cell':   'Exam Cell Portal',
    administrator: 'Admin Portal',
    student:       'Student Portal',
};

const DashboardLayout = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate  = useNavigate();
    const location  = useLocation();

    const [profileOpen, setProfileOpen] = useState(false);
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

    /* dark mode */
    const [isDark, setIsDark] = useState(() => {
        const s = localStorage.getItem('darkMode');
        return s ? JSON.parse(s) : true; // default dark
    });
    useEffect(() => {
        localStorage.setItem('darkMode', JSON.stringify(isDark));
        document.documentElement.classList.toggle('dark', isDark);
    }, [isDark]);

    /* sidebar collapsed (desktop) */
    const [collapsed, setCollapsed] = useState(false);

    /* sidebar open (mobile) */
    const [mobileOpen, setMobileOpen] = useState(false);

    /* close mobile sidebar on route change */
    useEffect(() => { setMobileOpen(false); }, [location.pathname]);

    /* close mobile sidebar on resize to desktop */
    useEffect(() => {
        const handle = () => { if (window.innerWidth > 768) setMobileOpen(false); };
        window.addEventListener('resize', handle);
        return () => window.removeEventListener('resize', handle);
    }, []);

    const accent = ROLE_ACCENT[user?.role] || '#6366f1';
    const links  = NAV[user?.role] || [];

    const handleLogout = () => {
        setShowLogoutConfirm(false);
        setProfileOpen(false);
        logout();
        navigate('/login');
    };

    const requestLogout = () => {
        setProfileOpen(false);
        setShowLogoutConfirm(true);
    };

    /* ── Sidebar content ────────────────────────────────────────────────── */
    const SidebarContent = () => (
        <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>

            {/* Logo row */}
            <div style={{
                height: 52,
                display: 'flex', alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                padding: collapsed ? '0' : '0 16px',
                borderBottom: '1px solid rgba(255,255,255,.08)',
                gap: 10, flexShrink: 0,
            }}>
                {!collapsed && (
                    <div style={{
                        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
                        background: accent,
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontWeight: 800, fontSize: 12, color:'#fff', letterSpacing:'-.5px',
                    }}>A</div>
                )}
                {!collapsed && (
                    <div style={{ overflow:'hidden' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color:'#fff', lineHeight:1 }}>APAM</div>
                        <div style={{ fontSize: 10, color:'rgba(255,255,255,.4)', marginTop:1 }}>WCE Sangli</div>
                    </div>
                )}
                {/* Collapse toggle — desktop only */}
                <button
                    onClick={() => setCollapsed(v => !v)}
                    className="hide-mobile"
                    style={{
                        ...(collapsed ? {} : { marginLeft: 'auto' }),
                        padding:'6px', borderRadius:5,
                        background:'rgba(255,255,255,.06)', border:'none', cursor:'pointer',
                        color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center',
                        flexShrink:0,
                    }}
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight size={16}/> : <ChevronLeft size={14}/>}
                </button>
                {/* Mobile close button */}
                <button
                    onClick={() => setMobileOpen(false)}
                    style={{
                        marginLeft:'auto', padding:'4px', borderRadius:5,
                        background:'rgba(255,255,255,.06)', border:'none', cursor:'pointer',
                        color:'rgba(255,255,255,.5)', display:'none', alignItems:'center',
                    }}
                    className="show-mobile"
                    title="Close"
                >
                    <X size={16}/>
                </button>
            </div>

            {/* User chip */}
            {!collapsed && (
                <div style={{
                    margin: '12px 12px 4px',
                    padding: '10px 12px',
                    borderRadius: 8,
                    background: 'rgba(255,255,255,.06)',
                    border: '1px solid rgba(255,255,255,.08)',
                }}>
                    <div style={{ fontSize: 10, color:'rgba(255,255,255,.4)', textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Logged in as</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color:'#fff', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user?.full_name}</div>
                    <div style={{
                        display:'inline-flex', marginTop:5, padding:'2px 8px',
                        borderRadius:4, fontSize:10, fontWeight:600,
                        background: accent + '25', color: accent,
                        border:`1px solid ${accent}40`,
                        textTransform:'uppercase', letterSpacing:'.05em',
                    }}>{user?.role?.replace('_',' ')}</div>
                </div>
            )}

            {/* Nav */}
            <nav style={{ flex:1, padding:'8px 10px', overflowY:'auto', overflowX:'hidden' }}>
                {!collapsed && (
                    <div style={{ fontSize:10, fontWeight:600, textTransform:'uppercase', letterSpacing:'.08em', color:'rgba(255,255,255,.25)', padding:'4px 4px 8px' }}>
                        Navigation
                    </div>
                )}
                <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                    {links.map((link) => {
                        const Icon = link.icon;
                        return (
                            <NavLink
                                key={link.path}
                                to={link.path}
                                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                                style={({ isActive }) => isActive ? { background: accent + '22', color:'#fff', borderLeft:`3px solid ${accent}` } : {}}
                            >
                                <Icon className="nav-icon" strokeWidth={1.8}/>
                                <span className="nav-text">{link.name}</span>
                            </NavLink>
                        );
                    })}
                </div>
            </nav>

            {/* Footer */}
            <div style={{ padding:'10px', borderTop:'1px solid rgba(255,255,255,.07)', flexShrink:0 }}>
                <button
                    onClick={requestLogout}
                    className="nav-link"
                    style={{ width:'100%', background:'none', border:'none', color:'rgba(255,255,255,.4)' }}
                >
                    <LogOut className="nav-icon" strokeWidth={1.8}/>
                    <span className="nav-text">Sign Out</span>
                </button>
            </div>
        </div>
    );

    return (
        <div className="app-shell">

            {/* ── Sidebar ─────────────────────────────────────────────── */}
            <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
                <SidebarContent />
            </aside>

            {/* ── Mobile overlay ───────────────────────────────────────── */}
            <div
                className={`sidebar-overlay${mobileOpen ? ' active' : ''}`}
                onClick={() => setMobileOpen(false)}
            />

            {/* ── Main ─────────────────────────────────────────────────── */}
            <main className="app-main">

                {/* Top bar */}
                <header className="app-topbar">
                    {/* Hamburger — mobile */}
                    <button
                        onClick={() => setMobileOpen(v => !v)}
                        style={{
                            padding:6, borderRadius:7, border:'1px solid var(--border)',
                            background:'var(--bg-page)', color:'var(--text-secondary)',
                            cursor:'pointer', display:'flex', alignItems:'center',
                        }}
                        className="show-mobile-flex"
                        aria-label="Open menu"
                    >
                        <Menu size={18}/>
                    </button>

                    {/* Page label */}
                    <div style={{ flex:1, minWidth:0 }}>
                        <span style={{ fontSize:13, fontWeight:600, color:'var(--text-secondary)' }}>
                            {ROLE_LABEL[user?.role] || 'Portal'}
                        </span>
                    </div>

                    {/* Right actions */}
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        {(user?.role === 'student' || user?.role === 'Faculty') && <NotificationBell />}

                        {/* Dark mode toggle */}
                        <button
                            onClick={() => setIsDark(v => !v)}
                            style={{
                                padding:7, borderRadius:7, border:'1px solid var(--border)',
                                background:'var(--bg-page)', color:'var(--text-secondary)',
                                cursor:'pointer', display:'flex', alignItems:'center',
                            }}
                            title="Toggle theme"
                        >
                            {isDark ? <Sun size={15}/> : <Moon size={15}/>}
                        </button>

                        {/* User avatar dropdown */}
                        <div style={{ position:'relative' }}>
                            <button
                                onClick={() => setProfileOpen(v => !v)}
                                style={{
                                    width:30, height:30, borderRadius:8, border:'none', padding:0, cursor:'pointer',
                                    background: accent,
                                    display:'flex', alignItems:'center', justifyContent:'center',
                                    fontSize:11, fontWeight:700, color:'#fff', flexShrink:0,
                                }}
                                title="Profile Options"
                            >
                                {user?.full_name?.split(' ').map(n => n[0]).join('').substring(0,2).toUpperCase()}
                            </button>

                            {profileOpen && (
                                <>
                                    <div style={{ position:'fixed', inset:0, zIndex:40 }} onClick={() => setProfileOpen(false)} />
                                    <div className="card" style={{
                                        position:'absolute', top:'calc(100% + 8px)', right:0,
                                        width: 200, padding: 6, zIndex:50,
                                        display:'flex', flexDirection:'column', gap:2,
                                        boxShadow: '0 10px 25px rgba(0,0,0,0.15)'
                                    }}>
                                        {/* User info */}
                                        <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)', marginBottom:4 }}>
                                            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-primary)' }}>{user?.full_name}</div>
                                            <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{user?.role}</div>
                                        </div>

                                        {user?.role === 'student' && (
                                            <button className="btn btn-ghost" style={{ justifyContent:'flex-start', width:'100%', padding:'8px 10px' }} onClick={() => { setProfileOpen(false); navigate('/student/profile'); }}>
                                                <Users size={14}/> My Profile
                                            </button>
                                        )}
                                        <button className="btn btn-ghost" style={{ justifyContent:'flex-start', width:'100%', padding:'8px 10px', color:'var(--color-danger)' }} onClick={requestLogout}>
                                            <LogOut size={14}/> Sign Out
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <div className="app-content">
                    <Outlet />
                </div>
            </main>

            {/* ── Logout Confirmation Modal ──────────────────────────── */}
            {showLogoutConfirm && (
                <div style={{
                    position:'fixed', inset:0, zIndex:100,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)',
                }}>
                    <div className="card" style={{
                        maxWidth:380, width:'90%', padding:24,
                        textAlign:'center',
                        boxShadow:'0 20px 40px rgba(0,0,0,0.2)',
                    }}>
                        <div style={{
                            width:48, height:48, borderRadius:12,
                            background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            margin:'0 auto 16px',
                        }}>
                            <AlertTriangle size={22} style={{ color:'var(--color-danger)' }} />
                        </div>
                        <h3 style={{ fontSize:'1.1rem', fontWeight:700, color:'var(--text-primary)', marginBottom:6 }}>
                            Sign Out?
                        </h3>
                        <p style={{ fontSize:'0.82rem', color:'var(--text-secondary)', marginBottom:20, lineHeight:1.5 }}>
                            Are you sure you want to sign out? You will need to log in again to access your account.
                        </p>
                        <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
                            <button
                                className="btn btn-ghost"
                                style={{ padding:'8px 20px' }}
                                onClick={() => setShowLogoutConfirm(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-danger"
                                style={{ padding:'8px 20px' }}
                                onClick={handleLogout}
                            >
                                <LogOut size={14}/> Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardLayout;
