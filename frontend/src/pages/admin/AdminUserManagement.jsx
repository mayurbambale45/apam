import React, { useState, useEffect } from 'react';
import {
    Users, Search, Plus, Edit3, Trash2, KeyRound, X, Loader2,
    CheckCircle, AlertCircle, Shield, GraduationCap, BookOpen, Monitor
} from 'lucide-react';
import { toast } from 'sonner';
import api from '../../utils/api';

const AdminUserManagement = () => {
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    // Create Modal
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({ email: '', password: '', full_name: '', role: 'student', roll_number: '', prn_number: '', department: '', year: '' });
    const [isCreating, setIsCreating] = useState(false);

    // Edit Modal
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState({ id: null, full_name: '', email: '', role: '' });
    const [isEditing, setIsEditing] = useState(false);

    // Reset Password Modal
    const [showResetModal, setShowResetModal] = useState(false);
    const [resetForm, setResetForm] = useState({ id: null, full_name: '', new_password: '' });
    const [isResetting, setIsResetting] = useState(false);

    // Delete Confirmation
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/api/auth/users');
            setUsers(response.data);
        } catch (err) {
            toast.error('Failed to load users.');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch = !searchQuery ||
            user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.prn_number?.includes(searchQuery);
        const matchesRole = !roleFilter || user.role === roleFilter;
        return matchesSearch && matchesRole;
    });

    // ---- HANDLERS ----
    const handleCreateUser = async (e) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            await api.post('/api/admin/users', createForm);
            toast.success('User created successfully!');
            setShowCreateModal(false);
            setCreateForm({ email: '', password: '', full_name: '', role: 'student', roll_number: '', prn_number: '', department: '', year: '' });
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to create user.');
        } finally {
            setIsCreating(false);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setIsEditing(true);
        try {
            await api.put(`/api/admin/users/${editForm.id}`, {
                full_name: editForm.full_name,
                email: editForm.email,
                role: editForm.role
            });
            toast.success('User updated successfully!');
            setShowEditModal(false);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update user.');
        } finally {
            setIsEditing(false);
        }
    };

    const handleDeleteUser = async () => {
        setIsDeleting(true);
        try {
            await api.delete(`/api/admin/users/${deleteTarget.id}`);
            toast.success(`User "${deleteTarget.full_name}" deleted.`);
            setShowDeleteModal(false);
            setDeleteTarget(null);
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete user.');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setIsResetting(true);
        try {
            await api.put(`/api/admin/users/${resetForm.id}/reset-password`, { new_password: resetForm.new_password });
            toast.success(`Password reset for "${resetForm.full_name}"!`);
            setShowResetModal(false);
            setResetForm({ id: null, full_name: '', new_password: '' });
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to reset password.');
        } finally {
            setIsResetting(false);
        }
    };

    const openEditModal = (user) => {
        setEditForm({ id: user.id, full_name: user.full_name, email: user.email, role: user.role });
        setShowEditModal(true);
    };

    const openResetModal = (user) => {
        setResetForm({ id: user.id, full_name: user.full_name, new_password: '' });
        setShowResetModal(true);
    };

    const openDeleteModal = (user) => {
        setDeleteTarget(user);
        setShowDeleteModal(true);
    };

    const getRoleIcon = (role) => {
        const map = { administrator: Shield, teacher: BookOpen, student: GraduationCap, examination_system: Monitor };
        return map[role] || Users;
    };

    const getRoleBadge = (role) => {
        const styles = {
            administrator: 'bg-red-50 text-red-700 border-red-200',
            teacher: 'bg-blue-50 text-blue-700 border-blue-200',
            student: 'bg-emerald-50 text-emerald-700 border-emerald-200',
            examination_system: 'bg-violet-50 text-violet-700 border-violet-200',
        };
        const RoleIcon = getRoleIcon(role);
        return (
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${styles[role] || 'bg-gray-50 text-gray-700 border-gray-200'}`}>
                <RoleIcon size={12} /> {role?.replace('_', ' ')}
            </span>
        );
    };

    const roleCounts = {
        all: users.length,
        administrator: users.filter(u => u.role === 'administrator').length,
        teacher: users.filter(u => u.role === 'teacher').length,
        student: users.filter(u => u.role === 'student').length,
        examination_system: users.filter(u => u.role === 'examination_system').length,
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                        <Users className="text-blue-500" size={28} /> User Management
                    </h2>
                    <p className="text-gray-500 mt-1">Create, edit, and manage all system users across roles.</p>
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all duration-300"
                >
                    <Plus size={18} /> Add New User
                </button>
            </div>

            {/* Role Filter Chips */}
            <div className="flex flex-wrap gap-2">
                {[
                    { key: '', label: 'All', count: roleCounts.all },
                    { key: 'administrator', label: 'Admins', count: roleCounts.administrator },
                    { key: 'teacher', label: 'Teachers', count: roleCounts.teacher },
                    { key: 'student', label: 'Students', count: roleCounts.student },
                    { key: 'examination_system', label: 'Exam Coord.', count: roleCounts.examination_system },
                ].map(chip => (
                    <button
                        key={chip.key}
                        onClick={() => setRoleFilter(chip.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 border ${
                            roleFilter === chip.key
                                ? 'bg-gray-900 text-white border-gray-900 shadow-lg'
                                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                        }`}
                    >
                        {chip.label} <span className="ml-1 opacity-60">{chip.count}</span>
                    </button>
                ))}
            </div>

            {/* Search + Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 bg-gray-50/30">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, email, or PRN..."
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm transition-all"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-500 text-[11px] uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">User</th>
                                <th className="px-6 py-4 font-semibold">Email</th>
                                <th className="px-6 py-4 font-semibold">Role</th>
                                <th className="px-6 py-4 font-semibold">PRN / Dept</th>
                                <th className="px-6 py-4 font-semibold">Joined</th>
                                <th className="px-6 py-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan="6" className="px-6 py-16 text-center text-gray-400">
                                    <Loader2 className="animate-spin inline-block mr-2" size={20} />Loading users...
                                </td></tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr><td colSpan="6" className="px-6 py-16 text-center text-gray-400 italic">No users found.</td></tr>
                            ) : (
                                filteredUsers.map(user => (
                                    <tr key={user.id} className="hover:bg-blue-50/30 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-sm flex-shrink-0">
                                                    {user.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                                                </div>
                                                <div>
                                                    <span className="font-semibold text-gray-900 text-sm">{user.full_name}</span>
                                                    <span className="block text-xs text-gray-400 font-mono">#{user.id}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600 text-sm">{user.email}</td>
                                        <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                                        <td className="px-6 py-4">
                                            {user.prn_number ? (
                                                <div>
                                                    <span className="text-sm text-gray-700 font-mono">{user.prn_number}</span>
                                                    <span className="block text-xs text-gray-400">{user.department}</span>
                                                </div>
                                            ) : <span className="text-gray-300">—</span>}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm">{new Date(user.created_at).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                <button onClick={() => openEditModal(user)} title="Edit User"
                                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                    <Edit3 size={16} />
                                                </button>
                                                <button onClick={() => openResetModal(user)} title="Reset Password"
                                                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                                                    <KeyRound size={16} />
                                                </button>
                                                <button onClick={() => openDeleteModal(user)} title="Delete User"
                                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                {!isLoading && <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/30 text-xs text-gray-400 font-medium">
                    Showing {filteredUsers.length} of {users.length} total users
                </div>}
            </div>

            {/* ==================== CREATE USER MODAL ==================== */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center sticky top-0 bg-white rounded-t-2xl z-10">
                            <div>
                                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><Plus size={20} className="text-blue-500" /> Create New User</h3>
                                <p className="text-sm text-gray-500 mt-0.5">Add a new user to the APAM system.</p>
                            </div>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                                    <input type="text" required value={createForm.full_name} onChange={e => setCreateForm({...createForm, full_name: e.target.value})}
                                        placeholder="Dr. R. K. Jain" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Email *</label>
                                    <input type="email" required value={createForm.email} onChange={e => setCreateForm({...createForm, email: e.target.value})}
                                        placeholder="user@walchandsangli.ac.in" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Password *</label>
                                    <input type="password" required value={createForm.password} onChange={e => setCreateForm({...createForm, password: e.target.value})}
                                        placeholder="Min 6 characters" minLength={6} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1">Role *</label>
                                    <select required value={createForm.role} onChange={e => setCreateForm({...createForm, role: e.target.value})}
                                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                                        <option value="student">Student</option>
                                        <option value="teacher">Teacher</option>
                                        <option value="examination_system">Examination System</option>
                                        <option value="administrator">Administrator</option>
                                    </select>
                                </div>
                            </div>

                            {/* Conditional Student Fields */}
                            {createForm.role === 'student' && (
                                <div className="border-t border-gray-100 pt-4 mt-4 space-y-4">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1"><GraduationCap size={14} /> Student Profile Details</p>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Roll Number *</label>
                                            <input type="text" required value={createForm.roll_number} onChange={e => setCreateForm({...createForm, roll_number: e.target.value})}
                                                placeholder="CS-301" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">PRN Number *</label>
                                            <input type="text" required value={createForm.prn_number} onChange={e => setCreateForm({...createForm, prn_number: e.target.value})}
                                                placeholder="2022027001" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Department *</label>
                                            <select required value={createForm.department} onChange={e => setCreateForm({...createForm, department: e.target.value})}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                                                <option value="">Select Department</option>
                                                <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                                                <option value="Information Technology">Information Technology</option>
                                                <option value="Electronics & Telecommunication">Electronics & Telecommunication</option>
                                                <option value="Electrical Engineering">Electrical Engineering</option>
                                                <option value="Mechanical Engineering">Mechanical Engineering</option>
                                                <option value="Civil Engineering">Civil Engineering</option>
                                                <option value="Artificial Intelligence & Data Science">Artificial Intelligence & Data Science</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Year *</label>
                                            <select required value={createForm.year} onChange={e => setCreateForm({...createForm, year: e.target.value})}
                                                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                                                <option value="">Select Year</option>
                                                <option value="FE">FE</option>
                                                <option value="SE">SE</option>
                                                <option value="TE">TE</option>
                                                <option value="BE">BE</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" disabled={isCreating}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 rounded-xl transition-all disabled:opacity-50 shadow-lg shadow-blue-500/25">
                                    {isCreating ? <><Loader2 className="animate-spin" size={16} /> Creating...</> : <><Plus size={16} /> Create User</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==================== EDIT USER MODAL ==================== */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowEditModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><Edit3 size={20} className="text-blue-500" /> Edit User</h3>
                            <button onClick={() => setShowEditModal(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleEditUser} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
                                <input type="text" required value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
                                <input type="email" required value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Role</label>
                                <select value={editForm.role} onChange={e => setEditForm({...editForm, role: e.target.value})}
                                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-sm bg-white">
                                    <option value="student">Student</option>
                                    <option value="teacher">Teacher</option>
                                    <option value="examination_system">Examination System</option>
                                    <option value="administrator">Administrator</option>
                                </select>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowEditModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
                                <button type="submit" disabled={isEditing}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-50">
                                    {isEditing ? <><Loader2 className="animate-spin" size={16} /> Saving...</> : <><CheckCircle size={16} /> Save Changes</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==================== RESET PASSWORD MODAL ==================== */}
            {showResetModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowResetModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-black text-gray-900 flex items-center gap-2"><KeyRound size={20} className="text-amber-500" /> Reset Password</h3>
                            <button onClick={() => setShowResetModal(false)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleResetPassword} className="p-6 space-y-4">
                            <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-sm text-amber-700">
                                Resetting password for: <strong>{resetForm.full_name}</strong>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">New Password *</label>
                                <input type="text" required minLength={6} value={resetForm.new_password} onChange={e => setResetForm({...resetForm, new_password: e.target.value})}
                                    placeholder="Min 6 characters" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 text-sm font-mono" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                <button type="button" onClick={() => setShowResetModal(false)} className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
                                <button type="submit" disabled={isResetting}
                                    className="flex items-center gap-2 px-6 py-2.5 text-sm font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl disabled:opacity-50">
                                    {isResetting ? <><Loader2 className="animate-spin" size={16} /> Resetting...</> : <><KeyRound size={16} /> Reset Password</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ==================== DELETE CONFIRMATION MODAL ==================== */}
            {showDeleteModal && deleteTarget && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowDeleteModal(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full" onClick={e => e.stopPropagation()}>
                        <div className="p-6 text-center">
                            <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <Trash2 size={24} className="text-red-600" />
                            </div>
                            <h3 className="text-lg font-black text-gray-900 mb-2">Delete User?</h3>
                            <p className="text-sm text-gray-500">
                                Are you sure you want to permanently delete <strong>"{deleteTarget.full_name}"</strong>? This will cascade-delete all their submissions, evaluations, and profile data.
                            </p>
                        </div>
                        <div className="flex gap-3 p-6 pt-0">
                            <button onClick={() => setShowDeleteModal(false)} className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl">Cancel</button>
                            <button onClick={handleDeleteUser} disabled={isDeleting}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl disabled:opacity-50">
                                {isDeleting ? <><Loader2 className="animate-spin" size={16} /> Deleting...</> : <><Trash2 size={16} /> Delete</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserManagement;
