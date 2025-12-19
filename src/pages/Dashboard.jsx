import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function Dashboard() {
    const [stats, setStats] = useState(null);
    const [recentQuotations, setRecentQuotations] = useState([]);
    const [recentReceipts, setRecentReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const { company } = useAuth();
    const toast = useToast();

    useEffect(() => {
        fetchDashboardData();
    }, []);

    const fetchDashboardData = async () => {
        try {
            const [statsRes, quotationsRes, receiptsRes] = await Promise.all([
                fetch('/api/reports/dashboard', { credentials: 'include' }),
                fetch('/api/quotations/recent?limit=5', { credentials: 'include' }),
                fetch('/api/receipts/recent?limit=5', { credentials: 'include' })
            ]);

            const statsData = await statsRes.json();
            const quotationsData = await quotationsRes.json();
            const receiptsData = await receiptsRes.json();

            setStats(statsData);
            setRecentQuotations(quotationsData);
            setRecentReceipts(receiptsData);
        } catch (error) {
            toast.error('Failed to load dashboard data');
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading">
                    <div className="spinner"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Dashboard</h1>
            </div>

            {/* Stats Grid */}
            <div className="stat-grid">
                <div className="stat-card">
                    <div className="stat-value">{stats?.quotations?.count || 0}</div>
                    <div className="stat-label">Total Quotations</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-success-light)' }}>
                        {formatCurrency(stats?.receipts?.total)}
                    </div>
                    <div className="stat-label">Total Received</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value" style={{ color: 'var(--color-warning-light)' }}>
                        {formatCurrency(stats?.pendingBalance)}
                    </div>
                    <div className="stat-label">Pending Balance</div>
                </div>
                <div className="stat-card">
                    <div className="stat-value">{stats?.clients || 0}</div>
                    <div className="stat-label">Total Clients</div>
                </div>
            </div>

            {/* Quick Actions */}
            <h2 style={{ fontSize: 'var(--font-size-lg)', marginBottom: 'var(--space-md)' }}>Quick Actions</h2>
            <div className="action-grid">
                <Link to="/quotations/new" className="action-card">
                    <div className="action-icon">📝</div>
                    <span className="action-title">Create Quotation</span>
                </Link>
                <Link to="/receipts/new" className="action-card">
                    <div className="action-icon">💰</div>
                    <span className="action-title">Create Receipt</span>
                </Link>

                <Link to="/packages" className="action-card">
                    <div className="action-icon">📦</div>
                    <span className="action-title">Packages</span>
                </Link>
                <Link to="/reports" className="action-card">
                    <div className="action-icon">📊</div>
                    <span className="action-title">Reports</span>
                </Link>
            </div>

            {/* Recent Quotations */}
            <div style={{ marginTop: 'var(--space-2xl)' }}>
                <div className="flex justify-between items-center mb-md">
                    <h2 style={{ fontSize: 'var(--font-size-lg)' }}>Recent Quotations</h2>
                    <Link to="/quotations" className="btn btn-ghost" style={{ minHeight: 'auto', padding: '8px 16px' }}>
                        View All
                    </Link>
                </div>

                {recentQuotations.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">📄</div>
                        <p>No quotations yet</p>
                    </div>
                ) : (
                    recentQuotations.map((quotation) => (
                        <Link
                            key={quotation.id}
                            to={`/quotations/${quotation.id}`}
                            className="list-item"
                            style={{ textDecoration: 'none' }}
                        >
                            <div className="list-item-content">
                                <div className="list-item-title">{quotation.client_name}</div>
                                <div className="list-item-subtitle">{quotation.quotation_number}</div>
                            </div>
                            <div className="list-item-value">
                                {formatCurrency(quotation.grand_total)}
                            </div>
                        </Link>
                    ))
                )}
            </div>

            {/* Recent Receipts */}
            <div style={{ marginTop: 'var(--space-xl)' }}>
                <div className="flex justify-between items-center mb-md">
                    <h2 style={{ fontSize: 'var(--font-size-lg)' }}>Recent Receipts</h2>
                    <Link to="/receipts" className="btn btn-ghost" style={{ minHeight: 'auto', padding: '8px 16px' }}>
                        View All
                    </Link>
                </div>

                {recentReceipts.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state-icon">🧾</div>
                        <p>No receipts yet</p>
                    </div>
                ) : (
                    recentReceipts.map((receipt) => (
                        <div key={receipt.id} className="list-item">
                            <div className="list-item-content">
                                <div className="list-item-title">{receipt.client_name}</div>
                                <div className="list-item-subtitle">{receipt.receipt_number}</div>
                            </div>
                            <div className="list-item-value">
                                {formatCurrency(receipt.amount)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

export default Dashboard;
