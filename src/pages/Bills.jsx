import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config/api';


// Helper to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
    };
};

function Bills() {
    const [bills, setBills] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const toast = useToast();

    useEffect(() => {
        fetchBills();
    }, []);

    const fetchBills = async () => {
        try {
            const response = await fetch(`${API_URL}/api/bills`, { headers: getAuthHeaders() });
            const data = await response.json();
            setBills(data);
        } catch (error) {
            toast.error('Failed to load bills');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        if (!confirm('Are you sure you want to delete this bill?')) return;

        try {
            const response = await fetch(`${API_URL}/api/bills/${id}`, { method: 'DELETE', headers: getAuthHeaders()
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete bill');
            }

            toast.success('Bill deleted');
            setBills(prev => prev.filter(b => b.id !== id));
        } catch (error) {
            toast.error(error.message);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const filteredBills = filter === 'all'
        ? bills
        : bills.filter(b => b.status === filter);

    const statusColors = {
        pending: 'danger',
        partial: 'warning',
        paid: 'success'
    };

    if (loading) {
        return (
            <div className="page">
                <div className="loading"><div className="spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Bills</h1>
            </div>

            <div className="tabs">
                {['all', 'pending', 'partial', 'paid'].map(status => (
                    <button
                        key={status}
                        className={`tab ${filter === status ? 'active' : ''}`}
                        onClick={() => setFilter(status)}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {filteredBills.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📑</div>
                    <p>No bills found</p>
                    <p className="text-muted" style={{ fontSize: 'var(--font-size-sm)' }}>
                        Create bills from confirmed quotations
                    </p>
                </div>
            ) : (
                filteredBills.map((bill) => (
                    <Link
                        key={bill.id}
                        to={`/bills/${bill.id}`}
                        className="list-item"
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                        <div className="list-item-content">
                            <div className="list-item-title">{bill.client_name}</div>
                            <div className="list-item-subtitle">
                                {bill.bill_number} • {formatDate(bill.date)}
                            </div>
                            <span className={`badge badge-${statusColors[bill.status]}`} style={{ marginTop: '4px' }}>
                                {bill.status}
                            </span>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div>
                                <div className="list-item-value">{formatCurrency(bill.grand_total)}</div>
                                {bill.balance_amount > 0 && (
                                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning-light)' }}>
                                        Due: {formatCurrency(bill.balance_amount)}
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={(e) => handleDelete(e, bill.id)}
                                className="btn btn-ghost btn-icon"
                                style={{ color: 'var(--color-danger)', width: '32px', height: '32px' }}
                                title="Delete Bill"
                            >
                                🗑️
                            </button>
                        </div>
                    </Link>
                ))
            )}
        </div>
    );
}

export default Bills;
