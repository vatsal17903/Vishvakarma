import React from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Layout() {
    const { company } = useAuth();

    return (
        <div className="app-layout">
            <div className="fixed-header">
                {/* Unified Navigation Bar */}
                <nav className="top-nav">
                    {/* Left: Company Name */}
                    <div className="nav-left">
                        <span className="company-name">{company?.name}</span>
                    </div>

                    {/* Center: Navigation Links */}
                    <div className="nav-center">
                        <NavLink to="/dashboard" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <span className="nav-icon">📊</span>
                            <span className="nav-label">Dashboard</span>
                        </NavLink>
                        <NavLink to="/quotations" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <span className="nav-icon">📝</span>
                            <span className="nav-label">Quotes</span>
                        </NavLink>
                        <NavLink to="/receipts" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <span className="nav-icon">💰</span>
                            <span className="nav-label">Receipts</span>
                        </NavLink>
                        <NavLink to="/bills" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <span className="nav-icon">📑</span>
                            <span className="nav-label">Bills</span>
                        </NavLink>
                        <NavLink to="/settings" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
                            <span className="nav-icon">⚙️</span>
                            <span className="nav-label">More</span>
                        </NavLink>
                    </div>

                    {/* Right: Switch Company Button */}
                    <div className="nav-right">
                        <NavLink to="/select-company" className="btn btn-sm btn-primary-outline">
                            Switch Company
                        </NavLink>
                    </div>
                </nav>
            </div>

            {/* Main Content */}
            <main className="main-content-with-top-nav">
                <Outlet />
            </main>

            {/* Mobile Bottom Navigation */}
            <nav className="mobile-bottom-nav">
                <NavLink to="/dashboard" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon">📊</span>
                    <span className="nav-label">Home</span>
                </NavLink>
                <NavLink to="/quotations" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon">📝</span>
                    <span className="nav-label">Quotes</span>
                </NavLink>
                <NavLink to="/receipts" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon">💰</span>
                    <span className="nav-label">Receipts</span>
                </NavLink>
                <NavLink to="/bills" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon">📑</span>
                    <span className="nav-label">Bills</span>
                </NavLink>
                <NavLink to="/settings" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
                    <span className="nav-icon">⚙️</span>
                    <span className="nav-label">More</span>
                </NavLink>
            </nav>
        </div>
    );
}

export default Layout;
