import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

function Receipts() {
    const [receipts, setReceipts] = useState([]);
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        fetchReceipts();
    }, []);

    const fetchReceipts = async () => {
        try {
            const response = await fetch(`${API_URL}/api/receipts`, { credentials: 'include' });
            const data = await response.json();
            setReceipts(data);
        } catch (error) {
            toast.error('Failed to load receipts');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        if (!confirm('Are you sure you want to delete this receipt?')) return;

        try {
            const response = await fetch(`https://apivkq.softodoor.com/api/receipts/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete receipt');
            }

            toast.success('Receipt deleted');
            setReceipts(prev => prev.filter(r => r.id !== id));
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

    const paymentModeColors = {
        Cash: 'success',
        Bank: 'primary',
        UPI: 'warning'
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
                <h1 className="page-title">Receipts</h1>
                <Link to="/receipts/new" className="btn btn-primary">
                    + Create
                </Link>
            </div>

            {receipts.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🧾</div>
                    <p>No receipts found</p>
                    <Link to="/receipts/new" className="btn btn-primary mt-md">
                        Create First Receipt
                    </Link>
                </div>
            ) : (
                receipts.map((receipt) => (
                    <Link
                        key={receipt.id}
                        to={`/receipts/${receipt.id}/edit`}
                        className="list-item"
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                        <div className="list-item-content">
                            <div className="list-item-title">{receipt.client_name}</div>
                            <div className="list-item-subtitle">
                                {receipt.receipt_number} • {formatDate(receipt.date)}
                            </div>
                            <span className={`badge badge-${paymentModeColors[receipt.payment_mode] || 'primary'}`} style={{ marginTop: '4px' }}>
                                {receipt.payment_mode}
                            </span>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div>
                                <div className="list-item-value">{formatCurrency(receipt.amount)}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                    {receipt.quotation_number}
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleDelete(e, receipt.id)}
                                className="btn btn-ghost btn-icon"
                                style={{ color: 'var(--color-danger)', width: '32px', height: '32px' }}
                                title="Delete Receipt"
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

export default Receipts;
