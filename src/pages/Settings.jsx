import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function Settings() {
    const { company, user, logout } = useAuth();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState('company');
    const [companyForm, setCompanyForm] = useState({
        name: company?.name || '',
        address: company?.address || '',
        phone: company?.phone || '',
        email: company?.email || '',
        gst_number: company?.gst_number || '',
        bank_details: company?.bank_details || ''
    });

    const [passwordForm, setPasswordForm] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [loading, setLoading] = useState(false);

    // Load latest company details
    React.useEffect(() => {
        if (activeTab === 'company') {
            fetchCompanyDetails();
        }
    }, [activeTab]);

    const fetchCompanyDetails = async () => {
        try {
            const response = await fetch('/api/company/current', { credentials: 'include' });
            const data = await response.json();
            if (data.company) {
                setCompanyForm(data.company);
            }
        } catch (error) {
            console.error('Failed to load company details');
        }
    };

    const handleCompanyUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await fetch(`/api/company/${companyForm.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(companyForm)
            });

            if (!response.ok) throw new Error('Update failed');

            toast.success('Company details updated');
        } catch (error) {
            toast.error('Failed to update details');
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        setLoading(true);

        try {
            const response = await fetch('/api/auth/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    currentPassword: passwordForm.currentPassword,
                    newPassword: passwordForm.newPassword
                })
            });

            const data = await response.json();

            if (!response.ok) throw new Error(data.error || 'Password change failed');

            toast.success('Password changed successfully');
            setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Settings</h1>
            </div>

            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'company' ? 'active' : ''}`}
                    onClick={() => setActiveTab('company')}
                >
                    Company Profile
                </button>
                <button
                    className={`tab ${activeTab === 'security' ? 'active' : ''}`}
                    onClick={() => setActiveTab('security')}
                >
                    Security
                </button>
            </div>

            {activeTab === 'company' && (
                <form onSubmit={handleCompanyUpdate} className="card">
                    <h3 className="mb-lg">Company Details</h3>

                    <div className="form-group">
                        <label className="form-label">Company Name</label>
                        <input
                            type="text"
                            className="form-input"
                            value={companyForm.name}
                            onChange={e => setCompanyForm({ ...companyForm, name: e.target.value })}
                            readOnly // Name usually shouldn't change
                            style={{ opacity: 0.7 }}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <textarea
                            className="form-textarea"
                            value={companyForm.address}
                            onChange={e => setCompanyForm({ ...companyForm, address: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input
                                type="text"
                                className="form-input"
                                value={companyForm.phone}
                                onChange={e => setCompanyForm({ ...companyForm, phone: e.target.value })}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                className="form-input"
                                value={companyForm.email}
                                onChange={e => setCompanyForm({ ...companyForm, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">GST Number</label>
                        <input
                            type="text"
                            className="form-input"
                            value={companyForm.gst_number}
                            onChange={e => setCompanyForm({ ...companyForm, gst_number: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Bank Account Details Of Company</label>
                        <textarea
                            className="form-textarea"
                            value={companyForm.bank_details}
                            onChange={e => setCompanyForm({ ...companyForm, bank_details: e.target.value })}
                            rows={4}
                            placeholder="Bank Name, Account Number, IFSC, Branch, etc."
                        />
                    </div>

                    <button type="submit" className="btn btn-primary mt-md" disabled={loading}>
                        {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                </form>
            )}

            {activeTab === 'security' && (
                <div className="card">
                    <h3 className="mb-lg">Change Password</h3>
                    <div className="mb-lg p-md bg-input rounded">
                        <strong>Current User:</strong> {user?.username}
                    </div>

                    <form onSubmit={handlePasswordChange}>
                        <div className="form-group">
                            <label className="form-label">Current Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwordForm.currentPassword}
                                onChange={e => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">New Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwordForm.newPassword}
                                onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                required
                                minLength={6}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Confirm New Password</label>
                            <input
                                type="password"
                                className="form-input"
                                value={passwordForm.confirmPassword}
                                onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary mt-md" disabled={loading}>
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>

                    <div className="mt-xl pt-lg border-t border-color">
                        <button onClick={logout} className="btn btn-danger btn-block">
                            Sign Out
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Settings;
