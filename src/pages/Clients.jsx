import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import { API_URL } from '../config/api';

function Clients() {
    const [clients, setClients] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const toast = useToast();

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            const response = await fetch(`${API_URL}/api/clients`, { credentials: 'include' });
            const data = await response.json();
            setClients(data);
        } catch (error) {
            toast.error('Failed to load clients');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (e, id) => {
        e.preventDefault();
        if (!confirm('Are you sure you want to delete this client?')) return;

        try {
            const response = await fetch(`${API_URL}/api/clients/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete client');
            }

            toast.success('Client deleted');
            setClients(prev => prev.filter(c => c.id !== id));
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleSearch = async (query) => {
        setSearchQuery(query);
        if (query.length >= 2) {
            try {
                const response = await fetch(`${API_URL}/api/clients/search/${encodeURIComponent(query)}`, {
                    credentials: 'include'
                });
                const data = await response.json();
                setClients(data);
            } catch (error) {
                console.error('Search failed:', error);
            }
        } else if (query.length === 0) {
            fetchClients();
        }
    };

    const filteredClients = searchQuery.length < 2
        ? clients
        : clients.filter(c =>
            c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            c.phone?.includes(searchQuery)
        );

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
                <h1 className="page-title">Clients</h1>
                <Link to="/clients/new" className="btn btn-primary">
                    + Add Client
                </Link>
            </div>

            <div className="search-container">
                <span className="search-icon">🔍</span>
                <input
                    type="text"
                    className="search-input"
                    placeholder="Search clients..."
                    value={searchQuery}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </div>

            {filteredClients.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">👤</div>
                    <p>No clients found</p>
                    <Link to="/clients/new" className="btn btn-primary mt-md">
                        Add First Client
                    </Link>
                </div>
            ) : (
                filteredClients.map((client) => (
                    <Link
                        key={client.id}
                        to={`/clients/${client.id}/edit`}
                        className="list-item"
                        style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)', flex: 1 }}>
                            <div style={{
                                width: '44px',
                                height: '44px',
                                background: 'var(--gradient-primary)',
                                borderRadius: 'var(--radius-full)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                fontWeight: '600',
                                color: 'white'
                            }}>
                                {client.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="list-item-content">
                                <div className="list-item-title">{client.name}</div>
                                <div className="list-item-subtitle">
                                    {client.phone || 'No phone'} • {client.project_location || 'No location'}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <span style={{ color: 'var(--text-muted)' }}>→</span>
                            <button
                                onClick={(e) => handleDelete(e, client.id)}
                                className="btn btn-ghost btn-icon"
                                style={{ color: 'var(--color-danger)', width: '32px', height: '32px' }}
                                title="Delete Client"
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

export default Clients;
