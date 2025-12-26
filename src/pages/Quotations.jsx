import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

function Quotations() {
    const [quotations, setQuotations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const toast = useToast();

    useEffect(() => {
        fetchQuotations();
    }, []);

    const fetchQuotations = async () => {
        try {
            const response = await fetch(`${API_URL}/api/quotations`, { credentials: 'include' });
            const data = await response.json();
            setQuotations(data);
        } catch (error) {
            toast.error('Failed to load quotations');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.preventDefault(); // Prevent navigation
        if (!confirm('Are you sure you want to delete this quotation?')) return;

        try {
            const response = await fetch(`https://apivkq.softodoor.com/api/quotations/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete quotation');
            }

            toast.success('Quotation deleted');
            // Remove from local state
            setQuotations(prev => prev.filter(q => q.id !== id));
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

    const filteredQuotations = filter === 'all'
        ? quotations
        : quotations.filter(q => q.status === filter);

    const statusColors = {
        draft: 'warning',
        confirmed: 'primary',
        billed: 'success'
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
                <h1 className="page-title">Quotations</h1>
                <Link to="/quotations/new" className="btn btn-primary">
                    + Create
                </Link>
            </div>

            <div className="tabs">
                {['all', 'draft', 'confirmed', 'billed'].map(status => (
                    <button
                        key={status}
                        className={`tab ${filter === status ? 'active' : ''}`}
                        onClick={() => setFilter(status)}
                    >
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                ))}
            </div>

            {filteredQuotations.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📄</div>
                    <p>No quotations found</p>
                    <Link to="/quotations/new" className="btn btn-primary mt-md">
                        Create First Quotation
                    </Link>
                </div>
            ) : (
                filteredQuotations.map((quotation) => (
                    <Link
                        key={quotation.id}
                        to={`/quotations/${quotation.id}`}
                        className="list-item"
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                        <div className="list-item-content">
                            <div className="list-item-title">{quotation.client_name}</div>
                            <div className="list-item-subtitle">
                                {quotation.quotation_number} • {formatDate(quotation.date)}
                            </div>
                            <span className={`badge badge-${statusColors[quotation.status] || 'primary'}`} style={{ marginTop: '4px' }}>
                                {quotation.status}
                            </span>
                        </div>
                        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div>
                                <div className="list-item-value">{formatCurrency(quotation.grand_total)}</div>
                                <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                    {quotation.bedroom_count} BHK • {quotation.total_sqft} sqft
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleDelete(e, quotation.id)}
                                className="btn btn-ghost btn-icon"
                                style={{ color: 'var(--color-danger)', width: '32px', height: '32px' }}
                                title="Delete Quotation"
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

export default Quotations;
