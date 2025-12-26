import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

function ReceiptForm() {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const toast = useToast();
    const isEdit = !!id;

    const [quotations, setQuotations] = useState([]);
    const [selectedQuotation, setSelectedQuotation] = useState(null);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState({
        quotation_id: searchParams.get('quotation') || '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_mode: 'Cash',
        transaction_reference: '',
        notes: ''
    });

    const paymentModes = ['Cash', 'Bank', 'UPI'];

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (formData.quotation_id) {
            fetchQuotationDetails(formData.quotation_id);
        }
    }, [formData.quotation_id]);

    const fetchInitialData = async () => {
        try {
            const quotationsRes = await fetch('/api/quotations', { credentials: 'include' });
            const quotationsData = await quotationsRes.json();
            setQuotations(quotationsData.filter(q => q.status !== 'draft'));

            if (isEdit) {
                const receiptRes = await fetch(`/api/receipts/${id}`, { credentials: 'include' });
                if (!receiptRes.ok) throw new Error('Receipt not found');
                const receipt = await receiptRes.json();

                setFormData({
                    quotation_id: receipt.quotation_id,
                    date: receipt.date,
                    amount: receipt.amount,
                    payment_mode: receipt.payment_mode,
                    transaction_reference: receipt.transaction_reference || '',
                    notes: receipt.notes || ''
                });
            }
        } catch (error) {
            toast.error('Failed to load data');
            if (isEdit) navigate('/receipts');
        } finally {
            setFetching(false);
        }
    };

    const fetchQuotationDetails = async (quotationId) => {
        try {
            const response = await fetch(`/api/receipts/quotation/${quotationId}`, { credentials: 'include' });
            const data = await response.json();

            const quotation = quotations.find(q => q.id === parseInt(quotationId));
            setSelectedQuotation({
                ...quotation,
                totalReceived: data.totalReceived,
                balance: data.balance
            });
        } catch (error) {
            console.error('Failed to fetch quotation details:', error);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.quotation_id || !formData.amount) {
            toast.error('Please select quotation and enter amount');
            return;
        }

        setLoading(true);
        try {
            const url = isEdit ? `/api/receipts/${id}` : '/api/receipts';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    amount: parseFloat(formData.amount)
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save receipt');
            }

            toast.success(isEdit ? 'Receipt updated!' : 'Receipt created!');
            navigate('/receipts');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadPDF = () => {
        if (id) {
            window.open(`/api/pdf/receipt/${id}`, '_blank');
        }
    };



    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this receipt?')) return;

        setLoading(true);
        try {
            const response = await fetch(`/api/receipts/${id}`, {
                method: 'DELETE',
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete receipt');
            }

            toast.success('Receipt deleted!');
            navigate('/receipts');
        } catch (error) {
            toast.error(error.message);
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
                    <h1 className="page-title">{isEdit ? 'Edit Receipt' : 'New Receipt'}</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="card mb-lg">
                    <div className="form-group">
                        <label className="form-label">Quotation *</label>
                        <select
                            name="quotation_id"
                            className="form-select"
                            value={formData.quotation_id}
                            onChange={handleChange}
                            disabled={isEdit}
                        >
                            <option value="">Select Quotation</option>
                            {quotations.map(q => (
                                <option key={q.id} value={q.id}>
                                    {q.quotation_number} - {q.client_name} ({formatCurrency(q.grand_total)})
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedQuotation && (
                        <div style={{
                            background: 'var(--bg-input)',
                            borderRadius: 'var(--radius-md)',
                            padding: 'var(--space-md)',
                            marginBottom: 'var(--space-lg)'
                        }}>
                            <div className="flex justify-between mb-sm">
                                <span className="text-muted">Total Amount</span>
                                <span>{formatCurrency(selectedQuotation.grand_total)}</span>
                            </div>
                            <div className="flex justify-between mb-sm">
                                <span className="text-muted">Already Received</span>
                                <span className="text-success">{formatCurrency(selectedQuotation.totalReceived)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted" style={{ fontWeight: '600' }}>Balance Due</span>
                                <span style={{ fontWeight: '600', color: 'var(--color-warning-light)' }}>
                                    {formatCurrency(selectedQuotation.balance)}
                                </span>
                            </div>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Date</label>
                            <input
                                type="date"
                                name="date"
                                className="form-input"
                                value={formData.date}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Amount (₹) *</label>
                            <input
                                type="number"
                                name="amount"
                                className="form-input"
                                value={formData.amount}
                                onChange={handleChange}
                                placeholder="Enter amount"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Payment Mode</label>
                            <select
                                name="payment_mode"
                                className="form-select"
                                value={formData.payment_mode}
                                onChange={handleChange}
                            >
                                {paymentModes.map(mode => (
                                    <option key={mode} value={mode}>{mode}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Transaction Reference</label>
                            <input
                                type="text"
                                name="transaction_reference"
                                className="form-input"
                                value={formData.transaction_reference}
                                onChange={handleChange}
                                placeholder="e.g., UPI ID, Cheque No."
                            />
                        </div>
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
                </div>

                <div className="flex gap-md">
                    <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                        {loading ? 'Saving...' : (isEdit ? 'Update Receipt' : 'Create Receipt')}
                    </button>
                    <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/receipts')}>
                        Cancel
                    </button>
                </div>

                {isEdit && (
                    <div className="card mt-lg">
                        <h3 style={{ marginBottom: 'var(--space-md)' }}>Actions</h3>
                        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                            <button type="button" onClick={handleDownloadPDF} className="btn btn-secondary btn-block">
                                📄 Download PDF
                            </button>

                            <button type="button" onClick={handleDelete} className="btn btn-danger btn-block">
                                🗑️ Delete Receipt
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}

export default ReceiptForm;
