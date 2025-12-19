import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

function QuotationForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const isEdit = !!id;

    const [packages, setPackages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    const [formData, setFormData] = useState({
        client_id: '',
        client_name: '',
        client_phone: '',
        client_email: '',
        client_address: '',
        client_project_location: '',
        date: new Date().toISOString().split('T')[0],
        total_sqft: '',
        rate_per_sqft: '',
        quotation_type: 'package', // 'package' or 'sqft'
        package_id: '',
        bedroom_count: 2,
        discount_type: 'percentage',
        discount_value: 0,
        cgst_percent: 9,
        sgst_percent: 9,
        terms_conditions: 'Work will be completed within the agreed timeline.\nPayment terms as per agreement.\nAll materials will be of specified quality.',
        notes: '',
        status: 'draft'
    });

    const [bedroomConfig, setBedroomConfig] = useState([
        { label: 'Master Bedroom', items: [] },
        { label: 'Bedroom 2', items: [] }
    ]);

    const [items, setItems] = useState([]);
    const [calculations, setCalculations] = useState({
        subtotal: 0,
        discount_amount: 0,
        taxable_amount: 0,
        cgst_amount: 0,
        sgst_amount: 0,
        total_tax: 0,
        grand_total: 0
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        calculateTotals();
    }, [formData.total_sqft, formData.rate_per_sqft, formData.discount_type, formData.discount_value, items]);

    const fetchInitialData = async () => {
        try {
            const packagesRes = await fetch('/api/packages', { credentials: 'include' });
            setPackages(await packagesRes.json());

            if (isEdit) {
                const quotationRes = await fetch(`/api/quotations/${id}`, { credentials: 'include' });
                if (!quotationRes.ok) throw new Error('Quotation not found');
                const quotation = await quotationRes.json();

                setFormData({
                    client_id: quotation.client_id,
                    client_name: quotation.client_name || '',
                    client_phone: quotation.client_phone || '',
                    client_email: quotation.client_email || '',
                    client_address: quotation.client_address || '',
                    client_project_location: quotation.project_location || '',
                    date: quotation.date,
                    total_sqft: quotation.total_sqft || '',
                    rate_per_sqft: quotation.rate_per_sqft || '',
                    quotation_type: quotation.package_id ? 'package' : 'sqft',
                    package_id: quotation.package_id || '',
                    bedroom_count: quotation.bedroom_count || 2,
                    discount_type: quotation.discount_type || 'percentage',
                    discount_value: quotation.discount_value || 0,
                    cgst_percent: quotation.cgst_percent || 9,
                    sgst_percent: quotation.sgst_percent || 9,
                    terms_conditions: quotation.terms_conditions || '',
                    notes: quotation.notes || '',
                    status: quotation.status || 'draft'
                });

                if (quotation.bedroom_config) {
                    try {
                        setBedroomConfig(JSON.parse(quotation.bedroom_config));
                    } catch (e) { }
                }

                if (quotation.items) {
                    setItems(quotation.items);
                }
            }
        } catch (error) {
            toast.error('Failed to load data');
            if (isEdit) navigate('/quotations');
        } finally {
            setFetching(false);
        }
    };

    const calculateTotals = async () => {
        // Base calculation: Area * Rate
        const baseAmount = (parseFloat(formData.total_sqft) || 0) * (parseFloat(formData.rate_per_sqft) || 0);

        // Items calculation: Sum of all item amounts
        const itemsAmount = items.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);

        // Subtotal is Base + Items
        subtotal = baseAmount + itemsAmount;

        let discount_amount = 0;
        if (formData.discount_type === 'percentage') {
            discount_amount = (subtotal * (formData.discount_value || 0)) / 100;
        } else {
            discount_amount = formData.discount_value || 0;
        }

        const taxable_amount = subtotal - discount_amount;
        const cgst_amount = (taxable_amount * (formData.cgst_percent || 9)) / 100;
        const sgst_amount = (taxable_amount * (formData.sgst_percent || 9)) / 100;
        const total_tax = cgst_amount + sgst_amount;
        const grand_total = taxable_amount + total_tax;

        setCalculations({
            subtotal,
            discount_amount,
            taxable_amount,
            cgst_amount,
            sgst_amount,
            total_tax,
            grand_total
        });
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handlePackageSelect = async (packageId) => {
        if (!packageId) {
            setFormData(prev => ({ ...prev, package_id: '', rate_per_sqft: '' }));
            return;
        }

        try {
            const response = await fetch(`/api/packages/${packageId}`, { credentials: 'include' });
            if (!response.ok) throw new Error('Failed to load package details');

            const pkg = await response.json();

            setFormData(prev => ({
                ...prev,
                package_id: packageId,
                rate_per_sqft: pkg.base_rate_sqft
            }));

            // Populate items from package if items list is empty or user confirms
            if (pkg.items && pkg.items.length > 0) {
                if (items.length === 0 || confirm('Replace existing items with package items?')) {
                    const packageItems = pkg.items.map(item => ({
                        room_label: item.room_type || '', // Map room_type to room_label (or empty for General)
                        item_name: item.item_name || item.description, // Use description as item_name if name is missing
                        description: item.description,
                        material: '',
                        brand: '',
                        unit: item.unit || 'Sq. ft',
                        quantity: item.quantity || 1,
                        rate: 0, // Package items usually included in base rate, so rate 0
                        amount: 0,
                        remarks: ''
                    }));
                    setItems(packageItems);
                }
            }
        } catch (error) {
            toast.error('Error loading package items');
            console.error(error);
        }
    };

    const handleBedroomCountChange = (count) => {
        const newCount = parseInt(count) || 1;
        setFormData(prev => ({ ...prev, bedroom_count: newCount }));

        const newConfig = [];
        for (let i = 0; i < newCount; i++) {
            if (bedroomConfig[i]) {
                newConfig.push(bedroomConfig[i]);
            } else {
                newConfig.push({ label: i === 0 ? 'Master Bedroom' : `Bedroom ${i + 1}`, items: [] });
            }
        }
        setBedroomConfig(newConfig);
    };

    const handleBedroomLabelChange = (index, label) => {
        const newConfig = [...bedroomConfig];
        newConfig[index].label = label;
        setBedroomConfig(newConfig);
    };

    const addItem = (roomLabel = '') => {
        setItems([...items, {
            room_label: roomLabel,
            item_name: '',
            description: '',
            material: '',
            brand: '',
            unit: 'Sqft',
            quantity: 1,
            rate: 0,
            amount: 0,
            remarks: ''
        }]);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;

        if (field === 'quantity' || field === 'rate') {
            const qty = parseFloat(newItems[index].quantity) || 0;
            const rate = parseFloat(newItems[index].rate) || 0;
            newItems[index].amount = qty * rate;
        }

        setItems(newItems);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.client_name) {
            toast.error('Client name is required');
            return;
        }

        // Validate discount limit (30%)
        const discountPercent = formData.discount_type === 'percentage'
            ? formData.discount_value
            : (formData.discount_value / calculations.subtotal) * 100;

        if (discountPercent > 30) {
            toast.error('Discount cannot exceed 30%');
            return;
        }

        setLoading(true);
        try {
            // 1. Create or Update Client
            let clientId = formData.client_id;
            const clientPayload = {
                name: formData.client_name,
                phone: formData.client_phone,
                email: formData.client_email,
                address: formData.client_address,
                project_location: formData.client_project_location
            };

            let clientRes;
            if (clientId) {
                clientRes = await fetch(`/api/clients/${clientId}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(clientPayload)
                });
            } else {
                clientRes = await fetch('/api/clients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify(clientPayload)
                });
            }

            if (!clientRes.ok) {
                const err = await clientRes.json();
                throw new Error(err.error || 'Failed to save client details');
            }

            const clientData = await clientRes.json();
            clientId = clientData.id;

            // 2. Save Quotation
            const url = isEdit ? `/api/quotations/${id}` : '/api/quotations';
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    ...formData,
                    client_id: clientId,
                    bedroom_config: bedroomConfig,
                    items
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save quotation');
            }

            const result = await response.json();
            toast.success(isEdit ? 'Quotation updated!' : 'Quotation created!');
            navigate(`/quotations/${result.id}`);
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
                    <h1 className="page-title">{isEdit ? 'Edit Quotation' : 'New Quotation'}</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Basic Details */}
                <div className="card mb-lg">
                    <h3 style={{ marginBottom: 'var(--space-lg)' }}>Basic Details</h3>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Client Name *</label>
                            <input
                                type="text"
                                name="client_name"
                                className="form-input"
                                value={formData.client_name}
                                onChange={handleChange}
                                placeholder="Client name"
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone</label>
                            <input
                                type="tel"
                                name="client_phone"
                                className="form-input"
                                value={formData.client_phone}
                                onChange={handleChange}
                                placeholder="Phone number"
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input
                                type="email"
                                name="client_email"
                                className="form-input"
                                value={formData.client_email}
                                onChange={handleChange}
                                placeholder="Email address"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Project Location</label>
                            <input
                                type="text"
                                name="client_project_location"
                                className="form-input"
                                value={formData.client_project_location}
                                onChange={handleChange}
                                placeholder="Project Site Location"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Address</label>
                        <textarea
                            name="client_address"
                            className="form-textarea"
                            value={formData.client_address}
                            onChange={handleChange}
                            rows={2}
                            placeholder="Billing/Permanent Address"
                        />
                    </div>

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
                            <label className="form-label">Status</label>
                            <select
                                name="status"
                                className="form-select"
                                value={formData.status}
                                onChange={handleChange}
                            >
                                <option value="draft">Draft</option>
                                <option value="confirmed">Confirmed</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Project Details */}
                <div className="card mb-lg">
                    <h3 style={{ marginBottom: 'var(--space-lg)' }}>Project Details</h3>

                    <div className="form-group">
                        <label className="form-label">Quotation Basis</label>
                        <div className="flex gap-md">
                            <button
                                type="button"
                                className={`btn ${formData.quotation_type === 'package' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFormData(prev => ({ ...prev, quotation_type: 'package' }))}
                                style={{ flex: 1 }}
                            >
                                Package Based
                            </button>
                            <button
                                type="button"
                                className={`btn ${formData.quotation_type === 'sqft' ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFormData(prev => ({ ...prev, quotation_type: 'sqft', package_id: '' }))}
                                style={{ flex: 1 }}
                            >
                                Square Foot Based (Custom)
                            </button>
                        </div>
                    </div>

                    {formData.quotation_type === 'package' && (
                        <div className="form-group">
                            <label className="form-label">Select Package</label>
                            <select
                                name="package_id"
                                className="form-select"
                                value={formData.package_id}
                                onChange={(e) => handlePackageSelect(e.target.value)}
                            >
                                <option value="">-- Choose a Package --</option>
                                {packages.map(pkg => (
                                    <option key={pkg.id} value={pkg.id}>{pkg.name} - {formatCurrency(pkg.base_rate_sqft)}/sqft</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Total Sqft</label>
                            <input
                                type="number"
                                name="total_sqft"
                                className="form-input"
                                value={formData.total_sqft}
                                onChange={handleChange}
                                placeholder="Enter area in sqft"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Rate per Sqft (₹)</label>
                            <input
                                type="number"
                                name="rate_per_sqft"
                                className="form-input"
                                value={formData.rate_per_sqft}
                                onChange={handleChange}
                                placeholder="Rate"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Number of Bedrooms</label>
                        <select
                            className="form-select"
                            value={formData.bedroom_count}
                            onChange={(e) => handleBedroomCountChange(e.target.value)}
                        >
                            {[1, 2, 3, 4, 5, 6].map(n => (
                                <option key={n} value={n}>{n} BHK</option>
                            ))}
                        </select>
                    </div>

                    {/* Bedroom Labels */}
                    <div style={{ marginTop: 'var(--space-md)' }}>
                        <label className="form-label">Bedroom Labels</label>
                        <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                            {bedroomConfig.map((room, idx) => (
                                <input
                                    key={idx}
                                    type="text"
                                    className="form-input"
                                    value={room.label}
                                    onChange={(e) => handleBedroomLabelChange(idx, e.target.value)}
                                    placeholder={`Bedroom ${idx + 1} Name`}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Items */}
                <div className="card mb-lg">
                    <div className="flex justify-between items-center mb-md">
                        <h3>Line Items</h3>
                        <button type="button" className="btn btn-secondary" onClick={() => addItem()}>
                            + Add Item
                        </button>
                    </div>

                    {items.length === 0 ? (
                        <div className="empty-state" style={{ padding: 'var(--space-lg)' }}>
                            <p>No items added. Add items for detailed breakdown.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gap: 'var(--space-md)' }}>
                            {items.map((item, index) => (
                                <div key={index} style={{
                                    background: 'var(--bg-input)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-md)'
                                }}>
                                    <div className="form-row">
                                        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={item.item_name}
                                                onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                                                placeholder="Item Name"
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                            <select
                                                className="form-select"
                                                value={item.room_label}
                                                onChange={(e) => updateItem(index, 'room_label', e.target.value)}
                                            >
                                                <option value="">General</option>
                                                {bedroomConfig.map((room, idx) => (
                                                    <option key={idx} value={room.label}>{room.label}</option>
                                                ))}
                                                <option value="Living Room">Living Room</option>
                                                <option value="Kitchen">Kitchen</option>
                                                <option value="Bathroom">Bathroom</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={item.quantity}
                                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                placeholder="Qty"
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                            <input
                                                type="number"
                                                className="form-input"
                                                value={item.rate}
                                                onChange={(e) => updateItem(index, 'rate', e.target.value)}
                                                placeholder="Rate"
                                            />
                                        </div>
                                        <div className="form-group" style={{ marginBottom: 'var(--space-sm)' }}>
                                            <input
                                                type="text"
                                                className="form-input"
                                                value={formatCurrency(item.amount)}
                                                readOnly
                                                style={{ background: 'var(--bg-card)' }}
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        className="btn btn-ghost"
                                        onClick={() => removeItem(index)}
                                        style={{ color: 'var(--color-danger)', padding: '4px 8px', minHeight: 'auto' }}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Discount & Tax */}
                <div className="card mb-lg">
                    <h3 style={{ marginBottom: 'var(--space-lg)' }}>Discount & Tax</h3>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">Discount Type</label>
                            <select
                                name="discount_type"
                                className="form-select"
                                value={formData.discount_type}
                                onChange={handleChange}
                            >
                                <option value="percentage">Percentage (%)</option>
                                <option value="flat">Flat Amount (₹)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label className="form-label">
                                Discount Value {formData.discount_type === 'percentage' ? '(Max 30%)' : ''}
                            </label>
                            <input
                                type="number"
                                name="discount_value"
                                className="form-input"
                                value={formData.discount_value}
                                onChange={handleChange}
                                placeholder="0"
                                max={formData.discount_type === 'percentage' ? 30 : undefined}
                            />
                        </div>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">CGST (%)</label>
                            <input
                                type="number"
                                name="cgst_percent"
                                className="form-input"
                                value={formData.cgst_percent}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">SGST (%)</label>
                            <input
                                type="number"
                                name="sgst_percent"
                                className="form-input"
                                value={formData.sgst_percent}
                                onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="card mb-lg" style={{ background: 'var(--bg-input)' }}>
                    <h3 style={{ marginBottom: 'var(--space-md)' }}>Summary</h3>

                    <div style={{ display: 'grid', gap: 'var(--space-sm)' }}>
                        <div className="flex justify-between">
                            <span className="text-muted">Subtotal</span>
                            <span>{formatCurrency(calculations.subtotal)}</span>
                        </div>
                        {calculations.discount_amount > 0 && (
                            <div className="flex justify-between">
                                <span className="text-muted">Discount</span>
                                <span className="text-danger">-{formatCurrency(calculations.discount_amount)}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted">Taxable Amount</span>
                            <span>{formatCurrency(calculations.taxable_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">CGST ({formData.cgst_percent}%)</span>
                            <span>{formatCurrency(calculations.cgst_amount)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted">SGST ({formData.sgst_percent}%)</span>
                            <span>{formatCurrency(calculations.sgst_amount)}</span>
                        </div>
                        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 'var(--space-sm)', marginTop: 'var(--space-sm)' }}>
                            <div className="flex justify-between">
                                <span style={{ fontWeight: '600', fontSize: 'var(--font-size-lg)' }}>Grand Total</span>
                                <span style={{ fontWeight: '700', fontSize: 'var(--font-size-xl)', color: 'var(--color-success-light)' }}>
                                    {formatCurrency(calculations.grand_total)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Terms */}
                <div className="card mb-lg">
                    <div className="form-group">
                        <label className="form-label">Terms & Conditions</label>
                        <textarea
                            name="terms_conditions"
                            className="form-textarea"
                            value={formData.terms_conditions}
                            onChange={handleChange}
                            rows={4}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Notes</label>
                        <textarea
                            name="notes"
                            className="form-textarea"
                            value={formData.notes}
                            onChange={handleChange}
                            placeholder="Internal notes..."
                            rows={2}
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-md">
                    <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                        {loading ? 'Saving...' : (isEdit ? 'Update Quotation' : 'Create Quotation')}
                    </button>
                    <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/quotations')}>
                        Cancel
                    </button>
                </div>
            </form>
        </div>
    );
}

export default QuotationForm;
