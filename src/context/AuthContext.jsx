import React, { createContext, useContext, useState, useEffect } from 'react';
import { API_URL } from '../config/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [company, setCompany] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkSession();
    }, []);

    const checkSession = async () => {
        try {
            const token = localStorage.getItem('token');

            if (!token) {
                setLoading(false);
                return;
            }

            const response = await fetch(`${API_URL}/api/auth/session`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await response.json();

            if (data.authenticated) {
                setUser(data.user);
                if (data.companyId) {
                    setCompany({
                        id: data.companyId,
                        name: data.companyName
                    });
                }
            } else {
                // Token invalid, clear it
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Session check failed:', error);
            localStorage.removeItem('token');
        } finally {
            setLoading(false);
        }
    };

    const login = async (username, password) => {
        const response = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Login failed');
        }

        // Store JWT token
        localStorage.setItem('token', data.token);

        setUser(data.user);
        setCompany(null); // Force company selection every login
        return data;
    };

    const logout = async () => {
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/api/auth/logout`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        localStorage.removeItem('token');
        setUser(null);
        setCompany(null);
    };

    const selectCompany = async (companyId) => {
        const token = localStorage.getItem('token');

        const response = await fetch(`${API_URL}/api/company/select`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ companyId })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Company selection failed');
        }

        // Update token with company info
        localStorage.setItem('token', data.token);

        setCompany(data.company);
        return data;
    };

    const value = {
        user,
        company,
        loading,
        login,
        logout,
        selectCompany,
        isAuthenticated: !!user,
        hasCompany: !!company
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
}

export default AuthContext;
