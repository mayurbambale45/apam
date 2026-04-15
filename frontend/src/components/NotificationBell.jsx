import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, Info } from 'lucide-react';
import api from '../utils/api';

const NotificationBell = () => {
    const [notifications, setNotifications] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const dropdownRef = useRef(null);

    useEffect(() => {
        fetchNotifications();
        
        // Poll for new notifications every 30 seconds
        const pollInterval = setInterval(fetchNotifications, 30000);

        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            clearInterval(pollInterval);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const response = await api.get('/api/notifications');
            setNotifications(response.data);
            
            // Calculate unread based on localStorage
            const lastReadId = localStorage.getItem('lastReadNotificationId') || 0;
            const unread = response.data.filter(n => parseInt(n.id) > parseInt(lastReadId)).length;
            setUnreadCount(unread);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const handleOpen = () => {
        setIsOpen(!isOpen);
        if (!isOpen && notifications.length > 0) {
            // Mark all currently fetched as read
            const latestId = Math.max(...notifications.map(n => parseInt(n.id)));
            if (latestId > 0) {
                localStorage.setItem('lastReadNotificationId', latestId.toString());
            }
            setUnreadCount(0);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button 
                onClick={handleOpen}
                className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-slate-700 rounded-full transition-colors relative"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-gray-100 dark:border-slate-700/50 overflow-hidden z-[999] animate-in fade-in zoom-in duration-200 origin-top-right">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-slate-700/50 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-md">
                        <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 dark:text-white">Notifications</h3>
                            {unreadCount > 0 && (
                                <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-black">
                                    {unreadCount}
                                </span>
                            )}
                        </div>
                        <button onClick={() => setIsOpen(false)} className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                            <X size={16} />
                        </button>
                    </div>
                    <div className="max-h-[28rem] overflow-y-auto">
                        {notifications.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center gap-3">
                                <div className="bg-gray-100 dark:bg-slate-700 p-4 rounded-full">
                                    <Bell size={24} className="text-gray-400" />
                                </div>
                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">All caught up! No alerts found.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50 dark:divide-slate-700/50">
                                {notifications.map(notif => (
                                    <div key={notif.id} className="p-5 hover:bg-gray-50 dark:hover:bg-slate-700/40 transition-all duration-200 group">
                                        <div className="flex gap-4 items-start">
                                            <div className="mt-1 flex-shrink-0 text-blue-500 bg-blue-50 dark:bg-blue-900/40 p-2 rounded-xl group-hover:scale-110 transition-transform">
                                                <Info size={18} />
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="text-sm font-bold text-gray-900 dark:text-white truncate">{notif.title}</h4>
                                                <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-3 leading-relaxed">{notif.message}</p>
                                                <div className="flex items-center gap-2 mt-3">
                                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                                        {new Date(notif.created_at).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationBell;
