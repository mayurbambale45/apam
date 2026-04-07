import React, { useContext } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, FilePlus, LogOut, CheckSquare, ClipboardList, Shield, Users, BookOpen, UploadCloud, FileText, BarChart3 } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

const DashboardLayout = () => {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Define sidebar links based on the user's role
    const getNavigationLinks = () => {
        if (!user) return [];

        if (user.role === 'teacher') {
            return [
                { name: 'Dashboard', path: '/instructor/dashboard', icon: LayoutDashboard },
                { name: 'Manage Exams', path: '/instructor/exams', icon: ClipboardList },
                { name: 'Upload Answer Key', path: '/instructor/answer-key', icon: UploadCloud },
                { name: 'Configure Rubrics', path: '/instructor/rubrics', icon: CheckSquare },
                { name: 'View Submissions', path: '/instructor/submissions', icon: FileText },
                { name: 'Review Evaluations', path: '/instructor/evaluations', icon: BarChart3 },
            ];
        } else if (user.role === 'student') {
            return [
                { name: 'Dashboard', path: '/student/dashboard', icon: LayoutDashboard },
                { name: 'My Submissions', path: '/student/submissions', icon: FileText },
                { name: 'My Profile', path: '/student/profile', icon: Users },
            ];
        } else if (user.role === 'administrator') {
            return [
                { name: 'Dashboard', path: '/administrator-dashboard', icon: Shield },
                { name: 'User Management', path: '/admin/users', icon: Users },
                { name: 'Exam Management', path: '/admin/exams', icon: BookOpen },
                { name: 'Submissions', path: '/admin/submissions', icon: FileText },
                { name: 'Evaluations', path: '/admin/evaluations', icon: BarChart3 },
            ];
        } else if (user.role === 'examination_system') {
            return [
                { name: 'Dashboard', path: '/examination_system-dashboard', icon: LayoutDashboard },
                { name: 'Upload Submissions', path: '/examination_system/uploads', icon: UploadCloud },
            ];
        }
        
        // Fallback
        return [
            { name: 'Dashboard Home', path: `/${user.role}-dashboard`, icon: LayoutDashboard }
        ];
    };

    const navLinks = getNavigationLinks();

    return (
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            
            {/* Sidebar Navigation */}
            <aside className="w-64 bg-gray-900 text-white flex flex-col flex-shrink-0 transition-transform duration-300">
                <div className="h-16 flex items-center px-6 border-b border-gray-800">
                    <LayoutDashboard className="text-blue-500 mr-3" size={24} />
                    <div>
                        <span className="text-lg font-bold tracking-wider">APAM</span>
                        <span className="text-[10px] text-gray-400 block -mt-1">WCE Sangli</span>
                    </div>
                </div>
                
                <div className="px-6 py-4 border-b border-gray-800">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Logged in as</p>
                    <p className="text-sm font-semibold truncate">{user?.full_name}</p>
                    <span className="inline-block px-2 py-0.5 mt-2 text-xs rounded bg-gray-800 text-gray-300 capitalize border border-gray-700">
                        {user?.role?.replace('_', ' ')}
                    </span>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    {navLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                            <NavLink
                                key={link.name}
                                to={link.path}
                                className={({ isActive }) => `
                                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors
                                    ${isActive 
                                        ? 'bg-blue-600 text-white shadow-sm' 
                                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                                    }
                                `}
                            >
                                <Icon size={18} />
                                {link.name}
                            </NavLink>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-gray-800">
                    <button
                        onClick={handleLogout}
                        className="flex items-center w-full gap-3 px-3 py-2.5 text-sm font-medium text-gray-400 rounded-lg hover:bg-gray-800 hover:text-red-400 transition-colors"
                    >
                        <LogOut size={18} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="h-16 bg-white shadow-sm flex items-center px-8 flex-shrink-0 z-10 border-b border-gray-200">
                    <h1 className="text-xl font-semibold text-gray-800 capitalize">
                        {user?.role?.replace('_', ' ')} Portal
                    </h1>
                </header>
                
                <div className="flex-1 overflow-y-auto p-8">
                    {/* Nested views will render here based on the route */}
                    <Outlet />
                </div>
            </main>

        </div>
    );
};

export default DashboardLayout;
