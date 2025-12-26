import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

function QuotationView() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [quotation, setQuotation] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchQuotation();
    }, [id]);

    const fetchQuotation = async () => {
        try {
            const response = await fetch(`https://apivkq.softodoor.com/api/quotations/${id}`, { credentials: 'include' });
            if (!response.ok) throw new Error('Quotation not found');
            const data = await response.json();
            setQuotation(data);
        } catch (error) {
            toast.error('Failed to load quotation');
            navigate('/quotations');
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
        window.open(`/api/pdf/quotation/${id}`, '_blank');
    };



    const handleCreateReceipt = () => {
        navigate(`/receipts/new?quotation=${id}`);
    };

    const handleCreateBill = async () => {
        try {
            const response = await fetch(`${API_URL}/api/bills`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ quotation_id: id })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create bill');
            }

            const bill = await response.json();
            toast.success('Bill created!');
            navigate(`/bills/${bill.id}`);
        } catch (error) {
            toast.error(error.message);
        }
    };

    const handleDelete = async () => {
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

            toast.success('Quotation deleted!');
            navigate('/quotations');
        } catch (error) {
            toast.error(error.message);
        }
    };

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

    if (!quotation) return null;

    return (
        <div className="page">
            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => navigate('/quotations')} className="btn btn-ghost btn-icon">
                        ←
                    </button>
                    <div>
                        <h1 className="page-title">{quotation.quotation_number}</h1>
                        <span className={`badge badge-${statusColors[quotation.status]}`}>
                            {quotation.status}
                        </span>
                    </div>
                </div>
                <Link to={`/quotations/${id}/edit`} className="btn btn-secondary">
                    Edit
                </Link>
            </div>

            {/* Client Info */}
            <div className="card mb-lg">
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Client Details</h3>
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                    <div><strong>{quotation.client_name}</strong></div>
                    <div className="text-muted">{quotation.client_address}</div>
                    <div className="text-muted">📞 {quotation.client_phone}</div>
                    <div className="text-muted">📍 {quotation.project_location}</div>
                </div>
            </div>

            {/* Project Info */}
            <div className="card mb-lg">
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Project Details</h3>
                <div className="stat-grid" style={{ marginBottom: 0 }}>
                    <div>
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Date</div>
                        <div style={{ fontWeight: '500' }}>{formatDate(quotation.date)}</div>
                    </div>
                    <div>
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Sqft</div>
                        <div style={{ fontWeight: '500' }}>{quotation.total_sqft || '-'}</div>
                    </div>
                    <div>
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Rate/Sqft</div>
                        <div style={{ fontWeight: '500' }}>{formatCurrency(quotation.rate_per_sqft)}</div>
                    </div>
                    <div>
                        <div className="text-muted" style={{ fontSize: 'var(--font-size-xs)' }}>Bedrooms</div>
                        <div style={{ fontWeight: '500' }}>{quotation.bedroom_count} BHK</div>
                    </div>
                </div>
            </div>

            {/* Items */}
            {quotation.items && quotation.items.length > 0 && (
                <div className="card mb-lg">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Items</h3>

                    {Object.entries(quotation.items.reduce((acc, item) => {
                        const room = item.room_label || 'General';
                        if (!acc[room]) acc[room] = [];
                        acc[room].push(item);
                        return acc;
                    }, {})).map(([room, items]) => (
                        <div key={room} style={{ marginBottom: '24px', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                            <div style={{
                                background: 'var(--bg-hover)',
                                padding: '12px 16px',
                                borderBottom: '1px solid var(--border-color)',
                                fontWeight: '700',
                                color: 'var(--text-color)',
                                fontSize: '1.1em'
                            }}>
                                {room.toUpperCase()}
                            </div>
                            <div className="table-container" style={{ margin: 0, boxShadow: 'none' }}>
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '50px' }}>#</th>
                                            <th>Description</th>
                                            <th style={{ width: '80px' }}>Unit</th>
                                            <th style={{ width: '80px', textAlign: 'right' }}>Qty</th>
                                            {!(quotation?.rate_per_sqft > 0) && <th style={{ width: '80px', textAlign: 'center' }}>MM</th>}
                                            {!(quotation?.rate_per_sqft > 0) && <th style={{ width: '120px', textAlign: 'right' }}>Rate</th>}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {items.map((item, index) => (
                                            <tr key={index}>
                                                <td>{index + 1}</td>
                                                <td>
                                                    <div style={{ fontWeight: '500' }}>{item.item_name}</div>
                                                    {item.description && <div className="text-muted" style={{ fontSize: '0.9em' }}>{item.description}</div>}
                                                    {item.brand && <div className="text-muted" style={{ fontSize: '0.9em' }}>Make: {item.brand}</div>}
                                                </td>
                                                <td>{item.unit}</td>
                                                <td style={{ textAlign: 'right' }}>{item.quantity}</td>
                                                {!(quotation?.rate_per_sqft > 0) && <td style={{ textAlign: 'center' }}>{item.material}</td>}
                                                {!(quotation?.rate_per_sqft > 0) && <td style={{ textAlign: 'right' }}>{formatCurrency(item.rate)}</td>}
                                            </tr>
                                        ))}
                                        {!(quotation?.rate_per_sqft > 0) && (
                                            <tr style={{ background: 'var(--bg-surface)', fontWeight: 'bold' }}>
                                                <td colSpan={5} style={{ textAlign: 'right', paddingRight: '16px' }}>Component Total</td>
                                                <td style={{ textAlign: 'right' }}>{formatCurrency(items.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0))}</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Summary */}
            <div className="card mb-lg" style={{ background: 'var(--bg-input)' }}>
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Summary</h3>
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                    <div className="flex justify-between">
                        <span className="text-muted">Subtotal</span>
                        <span>{formatCurrency(quotation.subtotal)}</span>
                    </div>
                    {quotation.discount_amount > 0 && (
                        <div className="flex justify-between">
                            <span className="text-muted">
                                Discount ({quotation.discount_type === 'percentage' ? `${quotation.discount_value}%` : 'Flat'})
                            </span>
                            <span className="text-danger">-{formatCurrency(quotation.discount_amount)}</span>
                        </div>
                    )}
                    <div className="flex justify-between">
                        <span className="text-muted">CGST ({quotation.cgst_percent}%)</span>
                        <span>{formatCurrency(quotation.cgst_amount)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted">SGST ({quotation.sgst_percent}%)</span>
                        <span>{formatCurrency(quotation.sgst_amount)}</span>
                    </div>
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                        <div className="flex justify-between">
                            <span style={{ fontWeight: '600', fontSize: 'var(--font-size-lg)' }}>Grand Total</span>
                            <span style={{ fontWeight: '700', fontSize: 'var(--font-size-xl)', color: 'var(--color-success-light)' }}>
                                {formatCurrency(quotation.grand_total)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Related Documents */}
            {(quotation.receipts?.length > 0 || quotation.bill) && (
                <div className="card mb-lg">
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Related Documents</h3>

                    {quotation.receipts?.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-md)' }}>
                            <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                                Receipts ({quotation.receipts.length})
                            </h4>
                            {quotation.receipts.map(receipt => (
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

                    {quotation.bill && (
                        <div>
                            <h4 style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginBottom: 'var(--space-sm)' }}>
                                Bill
                            </h4>
                            <Link to={`/bills/${quotation.bill.id}`} className="list-item" style={{ textDecoration: 'none' }}>
                                <div className="list-item-content">
                                    <div className="list-item-title">{quotation.bill.bill_number}</div>
                                    <div className="list-item-subtitle">
                                        {formatDate(quotation.bill.date)} •
                                        <span className={`badge badge-${quotation.bill.status === 'paid' ? 'success' : quotation.bill.status === 'partial' ? 'warning' : 'danger'}`} style={{ marginLeft: '8px' }}>
                                            {quotation.bill.status}
                                        </span>
                                    </div>
                                </div>
                                <div className="list-item-value">{formatCurrency(quotation.bill.grand_total)}</div>
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Actions */}
            <div className="card">
                <h3 style={{ marginBottom: 'var(--space-md)' }}>Actions</h3>
                <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                    <button onClick={handleDownloadPDF} className="btn btn-primary btn-block">
                        📄 Download PDF
                    </button>

                    <button onClick={handleCreateReceipt} className="btn btn-secondary btn-block">
                        💰 Create Receipt
                    </button>
                    {!quotation.bill && (
                        <button onClick={handleCreateBill} className="btn btn-secondary btn-block">
                            📑 Convert to Bill
                        </button>
                    )}
                    <button onClick={handleDelete} className="btn btn-danger btn-block">
                        🗑️ Delete Quotation
                    </button>
                </div>
            </div>
        </div>
    );
}

export default QuotationView;
