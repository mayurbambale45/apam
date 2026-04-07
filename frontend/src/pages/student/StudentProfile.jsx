import React, { useState, useEffect, useContext } from 'react';
import {
    User, Hash, Building2, Calendar, Mail, GraduationCap,
    Loader2, Shield, Clock
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
            <div className="max-w-3xl mx-auto p-12 text-center text-gray-400">
                <Loader2 className="animate-spin mx-auto mb-3" size={28} />
                Loading your profile...
            </div>
        );
    }

    const profileFields = [
        { label: "PRN Number", value: profile?.prn_number, icon: Hash, highlight: true, sublabel: "Permanent Registration Number — primary unique identifier at WCE Sangli" },
        { label: "Roll Number", value: profile?.roll_number, icon: User, sublabel: "Class roll number assigned by department" },
        { label: "Department", value: profile?.department, icon: Building2, sublabel: "Academic department / branch" },
        { label: "Academic Year", value: profile?.year, icon: Calendar, sublabel: "Current year of study (FE / SE / TE / BE)" },
        { label: "Email Address", value: profile?.email, icon: Mail, sublabel: "Registered institutional email" },
        { label: "Account Created", value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' }) : null, icon: Clock, sublabel: "Registration date on APAM" },
    ];

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
                    <User className="text-emerald-500" size={28} /> My Profile
                </h2>
                <p className="text-gray-500 mt-1">Your academic identity at Walchand College of Engineering, Sangli.</p>
            </div>

            {/* Identity Card */}
            <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-8 text-white shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                    <div className="h-20 w-20 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                        <span className="text-3xl font-black">
                            {profile?.full_name?.split(' ').map(n => n[0]).join('').substring(0, 2)}
                        </span>
                    </div>
                    <div className="flex-1">
                        <h3 className="text-2xl font-black">{profile?.full_name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm text-white text-xs font-bold rounded-full border border-white/20">
                                <GraduationCap size={14} /> Student
                            </span>
                            {profile?.department && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm text-white text-xs font-bold rounded-full border border-white/20">
                                    <Building2 size={14} /> {profile.department}
                                </span>
                            )}
                            {profile?.year && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/15 backdrop-blur-sm text-white text-xs font-bold rounded-full border border-white/20">
                                    <Calendar size={14} /> {profile.year}
                                </span>
                            )}
                        </div>

                        {profile?.prn_number && (
                            <div className="mt-4 bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/10 inline-block">
                                <div className="text-[10px] text-emerald-200 uppercase tracking-wider font-bold">PRN</div>
                                <div className="text-2xl font-black font-mono tracking-widest">{profile.prn_number}</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Detail Fields */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h3 className="font-bold text-gray-900 text-sm">Academic Details</h3>
                </div>
                <div className="divide-y divide-gray-50">
                    {profileFields.map((field, i) => {
                        const Icon = field.icon;
                        return (
                            <div key={i} className="px-6 py-5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors">
                                <div className={`p-2.5 rounded-xl flex-shrink-0 ${field.highlight ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                    <Icon size={18} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{field.label}</div>
                                    <div className={`mt-0.5 ${field.highlight ? 'text-xl font-black text-gray-900 font-mono tracking-wider' : 'text-base font-semibold text-gray-900'}`}>
                                        {field.value || <span className="text-gray-300 italic font-normal">Not set</span>}
                                    </div>
                                    <p className="text-xs text-gray-400 mt-0.5">{field.sublabel}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* WCE Footer */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-5 text-center">
                <p className="text-xs text-gray-400">
                    <span className="font-bold text-gray-500">Walchand College of Engineering, Sangli</span> — Autonomous Institute affiliated to Shivaji University, Kolhapur.
                </p>
                <p className="text-[10px] text-gray-400 mt-1">Academic Paper Assessment & Management System (APAM) · Student Module</p>
            </div>
        </div>
    );
};

export default StudentProfile;
