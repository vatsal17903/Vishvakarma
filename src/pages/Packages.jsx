import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config/api';

function Packages() {
    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTier, setActiveTier] = useState('all');
    const toast = useToast();

    useEffect(() => {
        fetchPackages();
    }, []);

    const fetchPackages = async () => {
        try {
            const response = await fetch(`${API_URL}/api/packages`, { credentials: 'include' });
            const data = await response.json();
            setPackages(data);
        } catch (error) {
            toast.error('Failed to load packages');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        if (!confirm('Are you sure you want to delete this package?')) return;

        try {
            const response = await fetch(`${API_URL}/api/packages/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete package');
            }

            toast.success('Package deleted');
            setPackages(prev => prev.filter(p => p.id !== id));
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

    const tiers = ['all', 'Silver', 'Gold', 'Platinum'];
    const filteredPackages = activeTier === 'all'
        ? packages
        : packages.filter(p => p.tier === activeTier);

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
                <h1 className="page-title">Packages</h1>
                <Link to="/packages/new" className="btn btn-primary">
                    + New Package
                </Link>
            </div>

            <div className="tabs">
                {tiers.map(tier => (
                    <button
                        key={tier}
                        className={`tab ${activeTier === tier ? 'active' : ''}`}
                        onClick={() => setActiveTier(tier)}
                    >
                        {tier === 'all' ? 'All' : tier}
                    </button>
                ))}
            </div>

            {filteredPackages.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📦</div>
                    <p>No packages found</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                    {filteredPackages.map((pkg) => (
                        <Link
                            key={pkg.id}
                            to={`/packages/${pkg.id}/edit`}
                            className="card"
                            style={{ textDecoration: 'none', display: 'block' }}
                        >
                            <div className="flex justify-between items-center">
                                <div>
                                    <h3 style={{ fontSize: 'var(--font-size-base)', marginBottom: '4px' }}>
                                        {pkg.name}
                                    </h3>
                                    <div className="flex gap-sm" style={{ flexWrap: 'wrap' }}>
                                        <span className={`badge badge-${pkg.tier === 'Platinum' ? 'primary' : pkg.tier === 'Gold' ? 'warning' : 'success'}`}>
                                            {pkg.tier}
                                        </span>
                                        <span className="badge badge-primary">{pkg.bhk_type}</span>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ marginRight: '8px', textAlign: 'right' }}>
                                        <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: '600', color: 'var(--color-success-light)' }}>
                                            {formatCurrency(pkg.base_rate_sqft)}
                                        </div>
                                        <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-muted)' }}>
                                            per sqft
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(e, pkg.id)}
                                        className="btn btn-ghost btn-icon"
                                        style={{ color: 'var(--color-danger)', width: '32px', height: '32px' }}
                                        title="Delete Package"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            </div>
                            {pkg.description && (
                                <p style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 0 }}>
                                    {pkg.description}
                                </p>
                            )}
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}

export default Packages;
