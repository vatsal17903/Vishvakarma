import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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

function ClientForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '',
        email: '',
        project_location: '',
        notes: ''
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);

    useEffect(() => {
        if (isEdit) {
            fetchClient();
        }
    }, [id]);

    const fetchClient = async () => {
        try {
            const response = await fetch(`${API_URL}/api/clients/${id}`, { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('Client not found');
            const data = await response.json();
            setFormData(data);
        } catch (error) {
            toast.error('Failed to load client');
            navigate('/clients');
        } finally {
            setFetching(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.name) {
            toast.error('Client name is required');
            return;
        }

        setLoading(true);
        try {
            const url = isEdit ? `/api/clients/${id}` : '/api/clients';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save client');
            }

            toast.success(isEdit ? 'Client updated!' : 'Client created!');
            navigate('/clients');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this client?')) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/clients/${id}`, { method: 'DELETE', headers: getAuthHeaders()
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete client');
            }

            toast.success('Client deleted!');
            navigate('/clients');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    if (fetching) {
        return (
            <div className="page">
                <div className="loading"><div className="spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => navigate(-1)} className="btn btn-ghost btn-icon">
                        ←
                    </button>
                    <h1 className="page-title">{isEdit ? 'Edit Client' : 'New Client'}</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card">
                <div className="form-group">
                    <label className="form-label">Client Name *</label>
                    <input
                        type="text"
                        name="name"
                        className="form-input"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="Enter client name"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                        type="tel"
                        name="phone"
                        className="form-input"
                        value={formData.phone}
                        onChange={handleChange}
                        placeholder="Enter phone number"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                        type="email"
                        name="email"
                        className="form-input"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="Enter email address"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Address</label>
                    <textarea
                        name="address"
                        className="form-textarea"
                        value={formData.address}
                        onChange={handleChange}
                        placeholder="Enter client address"
                        rows={3}
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Project Location</label>
                    <input
                        type="text"
                        name="project_location"
                        className="form-input"
                        value={formData.project_location}
                        onChange={handleChange}
                        placeholder="Enter project location"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Notes</label>
                    <textarea
                        name="notes"
                        className="form-textarea"
                        value={formData.notes}
                        onChange={handleChange}
                        placeholder="Additional notes..."
                        rows={3}
                    />
                </div>

                <div className="flex gap-md" style={{ marginTop: 'var(--space-lg)' }}>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                        {loading ? 'Saving...' : (isEdit ? 'Update Client' : 'Create Client')}
                    </button>
                    <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/clients')}>
                        Cancel
                    </button>
                </div>

                {isEdit && (
                    <button
                        type="button"
                        className="btn btn-danger btn-block mt-lg"
                        onClick={handleDelete}
                        disabled={loading}
                    >
                        Delete Client
                    </button>
                )}
            </form>
        </div>
    );
}

export default ClientForm;
