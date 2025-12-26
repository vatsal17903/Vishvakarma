import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
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

function BillView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [bill, setBill] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchBill();
    }, [id]);

    const fetchBill = async () => {
        try {
            const response = await fetch(`${API_URL}/api/bills/${id}`, { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('Bill not found');
            const data = await response.json();
            setBill(data);
        } catch (error) {
            toast.error('Failed to load bill');
            navigate('/bills');
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

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleDownloadPDF = () => {
        window.open(`${API_URL}/api/pdf/bill/${id}`, '_blank');
    };



    const handleCreateReceipt = () => {
        navigate(`/receipts/new?quotation=${bill.quotation_id}`);
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this bill?')) return;

        try {
            const response = await fetch(`${API_URL}/api/bills/${id}`, { method: 'DELETE', headers: getAuthHeaders()
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete bill');
            }

            toast.success('Bill deleted!');
            navigate('/bills');
        } catch (error) {
            toast.error(error.message);
        }
    };

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

    if (!bill) return null;

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => navigate('/bills')} className="btn btn-ghost btn-icon">
                        ←
                    </button>
                    <div>
                        <h1 className="page-title">{bill.bill_number}</h1>
                        <span className={`badge badge-${statusColors[bill.status]}`}>
                            {bill.status}
                        </span>
                    </div>
                </div>
            </div>

            {/* Client Info */}
            <div className="card mb-lg">
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Client Details</h3>
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                    <div><strong>{bill.client_name}</strong></div>
                    <div className="text-muted">{bill.client_address}</div>
                    <div className="text-muted">📞 {bill.client_phone}</div>
                    <div className="text-muted">📍 {bill.project_location}</div>
                </div>
            </div>

            {/* Bill Info */}
            <div className="card mb-lg">
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Invoice Details</h3>
                <div className="stat-grid" style={{ marginBottom: 0 }}>
                    <div>
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Date</div>
                        <div style={{ fontWeight: '500' }}>{formatDate(bill.date)}</div>
                    </div>
                    <div>
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Quotation</div>
                        <div style={{ fontWeight: '500' }}>{bill.quotation_number}</div>
                    </div>
                    <div>
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Sqft</div>
                        <div style={{ fontWeight: '500' }}>{bill.total_sqft || '-'}</div>
                    </div>
                    <div>
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Bedrooms</div>
                        <div style={{ fontWeight: '500' }}>{bill.bedroom_count} BHK</div>
                    </div>
                </div>
            </div>

            {/* Items */}
            {bill.items && bill.items.length > 0 && (
                <div className="card mb-lg">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Items</h3>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Item</th>
                                    <th>Room</th>
                                    <th>Qty</th>
                                    <th>Rate</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bill.items.map((item, index) => (
                                    <tr key={index}>
                                        <td>{index + 1}</td>
                                        <td>{item.item_name}</td>
                                        <td>{item.room_label || '-'}</td>
                                        <td>{item.quantity}</td>
                                        <td>{formatCurrency(item.rate)}</td>
                                        <td>{formatCurrency(item.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Summary */}
            <div className="card mb-lg" style={{ background: 'var(--bg-input)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Summary</h3>
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                    <div className="flex justify-between">
                        <span className="text-muted">Subtotal</span>
                        <span>{formatCurrency(bill.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">CGST ({bill.cgst_percent}%)</span>
                        <span>{formatCurrency(bill.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">SGST ({bill.sgst_percent}%)</span>
                        <span>{formatCurrency(bill.sgst_amount)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                        <div className="flex justify-between">
                            <span style={{ fontWeight: '600' }}>Grand Total</span>
                            <span style={{ fontWeight: '700', fontSize: 'var(--font-size-lg)' }}>
                                {formatCurrency(bill.grand_total)}
                            </span>
                        </div>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">Amount Paid</span>
                        <span className="text-success">{formatCurrency(bill.paid_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span style={{ fontWeight: '600', color: 'var(--color-warning-light)' }}>Balance Due</span>
                        <span style={{ fontWeight: '700', fontSize: 'var(--font-size-lg)', color: 'var(--color-warning-light)' }}>
                            {formatCurrency(bill.balance_amount)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Receipts */}
            {bill.receipts && bill.receipts.length > 0 && (
                <div className="card mb-lg">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Payment History</h3>
                    {bill.receipts.map(receipt => (
                        <div key={receipt.id} className="list-item">
                            <div className="list-item-content">
                                <div className="list-item-title">{receipt.receipt_number}</div>
                                <div className="list-item-subtitle">{formatDate(receipt.date)} • {receipt.payment_mode}</div>
                            </div>
                            <div className="list-item-value">{formatCurrency(receipt.amount)}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="card">
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Actions</h3>
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                    <button onClick={handleDownloadPDF} className="btn btn-primary btn-block">
                        📄 Download Invoice PDF
                    </button>

                    {bill.balance_amount > 0 && (
                        <button onClick={handleCreateReceipt} className="btn btn-secondary btn-block">
                            💰 Record Payment
                        </button>
                    )}
                    <Link to={`/quotations/${bill.quotation_id}`} className="btn btn-secondary btn-block">
                        📋 View Quotation
                    </Link>
                    <button onClick={handleDelete} className="btn btn-danger btn-block">
                        🗑️ Delete Bill
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BillView;
