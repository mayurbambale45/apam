import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token') || null);

    useEffect(() => {
        // Hydrate user from localStorage on initial load
        const storedUser = localStorage.getItem('user');
        if (storedUser && storedUser !== 'undefined' && token) {
            try {
                setUser(JSON.parse(storedUser));
            } catch (error) {
                console.error('Failed to parse user from local storage:', error);
                localStorage.removeItem('user');
            }
        }

        // Global Logout Listener for 401 Unauthorized API responses
        const handleAuthLogout = () => {
            logout();
        };

        window.addEventListener('auth:logout', handleAuthLogout);

        return () => {
            window.removeEventListener('auth:logout', handleAuthLogout);
        };
    }, [token]);

    const login = (newToken, userData) => {
        setToken(newToken);
        setUser(userData);
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
