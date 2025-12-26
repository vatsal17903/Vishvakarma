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
        payment_plan: '',
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

    const [milestones, setMilestones] = useState([
        { stage: 'Site visit and measurements', percent: 10, amount: 0 },
        { stage: '2D plan and section layout', percent: 30, amount: 0 },
        { stage: '3d plan of the work', percent: 60, amount: 0 }
    ]);

    const [formErrors, setFormErrors] = useState({});

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        calculateTotals();
    }, [formData.total_sqft, formData.rate_per_sqft, formData.discount_type, formData.discount_value, items]);

    // Recalculate milestone amounts when Grand Total changes
    useEffect(() => {
        if (calculations.grand_total > 0 && milestones.length > 0) {
            // Check if amounts match percentages, if not update them
            // Only update if the difference is significant to avoid rounding loops
            const needsUpdate = milestones.some(m => {
                const expected = (calculations.grand_total * (m.percent || 0)) / 100;
                return Math.abs((m.amount || 0) - expected) > 5;
            });

            if (needsUpdate) {
                setMilestones(prev => prev.map(m => ({
                    ...m,
                    amount: (calculations.grand_total * (m.percent || 0)) / 100
                })));
            }
        }
    }, [calculations.grand_total]);

    const fetchInitialData = async () => {
        try {
            const packagesRes = await fetch(`${API_URL}/api/packages`, { headers: getAuthHeaders() });
            setPackages(await packagesRes.json());

            if (isEdit) {
                const quotationRes = await fetch(`${API_URL}/api/quotations/${id}`, { headers: getAuthHeaders() });
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
                    payment_plan: quotation.payment_plan || '',
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

                if (quotation.payment_plan) {
                    try {
                        const parsed = JSON.parse(quotation.payment_plan);
                        if (Array.isArray(parsed)) setMilestones(parsed);
                    } catch (e) {
                        // Ignore plain text or invalid JSON
                    }
                }
            } else {
                // Fetch company defaults for new quotation
                try {
                    const companyRes = await fetch(`${API_URL}/api/company/current`, { headers: getAuthHeaders() });
                    if (companyRes.ok) {
                        const { company } = await companyRes.json();
                        if (company) {
                            setFormData(prev => ({
                                ...prev,
                                terms_conditions: company.default_terms_conditions || prev.terms_conditions,
                                payment_plan: company.default_payment_plan || prev.payment_plan
                            }));
                        }
                    }
                } catch (err) {
                    console.error('Failed to fetch company defaults', err);
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

        // Items calculation: Sum of all item amounts (only included items)
        const itemsAmount = items.reduce((sum, item) => sum + (item.is_included !== false ? (parseFloat(item.amount) || 0) : 0), 0);

        // Subtotal is Base + Items
        let subtotal = baseAmount + itemsAmount;

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
        // Clear error for this field when user types
        if (formErrors[name]) {
            setFormErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const handlePackageSelect = async (packageId) => {
        if (!packageId) {
            setFormData(prev => ({ ...prev, package_id: '', rate_per_sqft: '' }));
            return;
        }

        try {
            const response = await fetch(`${API_URL}/api/packages/${packageId}`, { headers: getAuthHeaders() });
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
            remarks: '',
            is_included: true
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

        // Validate required fields
        const errors = {};

        if (!formData.client_name?.trim()) {
            errors.client_name = 'Client name is required';
        }

        if (!formData.client_phone?.trim()) {
            errors.client_phone = 'Phone number is required';
        }

        if (!formData.client_project_location?.trim()) {
            errors.client_project_location = 'Project location is required';
        }

        // Validate discount limit (30%)
        const discountPercent = formData.discount_type === 'percentage'
            ? formData.discount_value
            : (formData.discount_value / calculations.subtotal) * 100;

        if (discountPercent > 30) {
            errors.discount_value = 'Discount cannot exceed 30%';
        }

        // If there are errors, set them and show toast
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            toast.error('Please fill in all required fields');
            return;
        }

        // Clear errors on successful validation
        setFormErrors({});

        setLoading(true);
        try {
            // 1. Create or Update Client
            let clientId = formData.client_id;
            const clientPayload = {
                name: formData.client_name,
                phone: formData.client_phone || '',
                email: formData.client_email || '',
                address: formData.client_address || '',
                project_location: formData.client_project_location || '',
                notes: '' // Ensure notes is present, even if empty
            };

            let clientRes;
            if (clientId) {
                clientRes = await fetch(`${API_URL}/api/clients/${clientId}`, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(clientPayload)
                });
            } else {
                clientRes = await fetch(`${API_URL}/api/clients`, {
                    method: 'POST',
                    headers: getAuthHeaders(),
                    body: JSON.stringify(clientPayload)
                });
            }

            if (!clientRes.ok) {
                const err = await clientRes.json();
                console.error('Client save error:', err);
                throw new Error(err.error || 'Failed to save client details');
            }

            const clientData = await clientRes.json();
            // Important: Update the local clientId variable with the ID from the response
            clientId = clientData.id;

            // Update state silently so subsequent saves use this ID
            setFormData(prev => ({ ...prev, client_id: clientId }));

            // 2. Save Quotation
            const url = isEdit ? `${API_URL}/api/quotations/${id}` : `${API_URL}/api/quotations`;
            const method = isEdit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...formData,
                    client_id: clientId,
                    bedroom_config: bedroomConfig,
                    items: items.filter(i => i.is_included !== false),
                    payment_plan: JSON.stringify(milestones)
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
                            <label className="form-label">Client Name <span className="required">*</span></label>
                            <input
                                type="text"
                                name="client_name"
                                className={`form-input ${formErrors.client_name ? 'input-error' : ''}`}
                                value={formData.client_name}
                                onChange={handleChange}
                                placeholder="Client name"
                            />
                            {formErrors.client_name && <div className="form-error">{formErrors.client_name}</div>}
                        </div>
                        <div className="form-group">
                            <label className="form-label">Phone <span className="required">*</span></label>
                            <input
                                type="tel"
                                name="client_phone"
                                className={`form-input ${formErrors.client_phone ? 'input-error' : ''}`}
                                value={formData.client_phone}
                                onChange={handleChange}
                                placeholder="Phone number"
                            />
                            {formErrors.client_phone && <div className="form-error">{formErrors.client_phone}</div>}
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
                            <label className="form-label">Project Location <span className="required">*</span></label>
                            <input
                                type="text"
                                name="client_project_location"
                                className={`form-input ${formErrors.client_project_location ? 'input-error' : ''}`}
                                value={formData.client_project_location}
                                onChange={handleChange}
                                placeholder="Project Site Location"
                            />
                            {formErrors.client_project_location && <div className="form-error">{formErrors.client_project_location}</div>}
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
                                onClick={async () => {
                                    setFormData(prev => ({ ...prev, quotation_type: 'sqft', package_id: '' }));
                                    try {
                                        if (items.length > 0 && !confirm('Replace existing items with Sqft defaults?')) return;

                                        const res = await fetch(`${API_URL}/api/quotations/defaults/sqft`, { headers: getAuthHeaders() });
                                        if (res.ok) {
                                            const data = await res.json();
                                            if (data.items) {
                                                setItems(data.items.map(i => ({ ...i, is_included: true })));
                                            }
                                        }
                                    } catch (err) {
                                        toast.error('Failed to load defaults');
                                    }
                                }}
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
                        <div>
                            {/* Group items by room_label */}
                            {Object.entries(items.reduce((acc, item, originalIndex) => {
                                const room = item.room_label || 'General Work';
                                // Store original index to update state correctly
                                if (!acc[room]) acc[room] = [];
                                acc[room].push({ ...item, originalIndex });
                                return acc;
                            }, {})).map(([room, roomItems]) => {
                                const roomTotal = roomItems.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
                                return (
                                    <div key={room} style={{ marginBottom: 'var(--space-lg)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', padding: 'var(--space-md)' }}>
                                        <div className="flex justify-between items-center mb-md">
                                            <h4 style={{ textTransform: 'uppercase', color: 'var(--color-primary)' }}>{room}</h4>
                                            <button type="button" className="btn btn-sm btn-secondary" onClick={() => addItem(room)}>+ Add Work Item</button>
                                        </div>

                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                            <thead>
                                                <tr style={{ background: 'var(--bg-hover)', textAlign: 'left' }}>
                                                    <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '30px' }}>Sel</th>
                                                    <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '40px' }}>No.</th>
                                                    <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Description</th>
                                                    <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '70px' }}>Unit</th>
                                                    <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '80px' }}>Quantity</th>
                                                    {formData.quotation_type !== 'sqft' && <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '150px' }}>MM</th>}
                                                    {formData.quotation_type !== 'sqft' && <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '90px' }}>Rate</th>}
                                                    {formData.quotation_type !== 'sqft' && <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '100px' }}>Amount</th>}
                                                    <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '40px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {roomItems.map((item, idx) => {
                                                    const index = item.originalIndex;
                                                    const isIncluded = item.is_included !== false;

                                                    return (
                                                        <tr key={index} style={{ borderBottom: '1px solid var(--border-color)', opacity: isIncluded ? 1 : 0.5, transition: 'opacity 0.2s' }}>
                                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                                <input
                                                                    type="checkbox"
                                                                    checked={isIncluded}
                                                                    onChange={(e) => {
                                                                        const newItems = [...items];
                                                                        newItems[index].is_included = e.target.checked;
                                                                        setItems(newItems);
                                                                    }}
                                                                    style={{ cursor: 'pointer', width: '16px', height: '16px' }}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                                                            <td style={{ padding: '8px' }}>
                                                                <input
                                                                    type="text"
                                                                    className="form-input"
                                                                    style={{ border: 'none', padding: '0', background: 'transparent' }}
                                                                    value={item.item_name}
                                                                    onChange={(e) => updateItem(index, 'item_name', e.target.value)}
                                                                    placeholder="Item Description"
                                                                    disabled={!isIncluded}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '8px' }}>
                                                                <input
                                                                    type="text"
                                                                    className="form-input"
                                                                    style={{ padding: '4px', textAlign: 'center' }}
                                                                    value={item.unit || 'Sq.ft'}
                                                                    onChange={(e) => updateItem(index, 'unit', e.target.value)}
                                                                    disabled={!isIncluded}
                                                                />
                                                            </td>
                                                            <td style={{ padding: '8px' }}>
                                                                <input
                                                                    type="number"
                                                                    className="form-input"
                                                                    style={{ padding: '4px', textAlign: 'center' }}
                                                                    value={item.quantity}
                                                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                                    disabled={!isIncluded}
                                                                />
                                                            </td>
                                                            {formData.quotation_type !== 'sqft' && (
                                                                <td style={{ padding: '8px' }}>
                                                                    <input
                                                                        type="text"
                                                                        className="form-input"
                                                                        style={{ padding: '4px' }}
                                                                        value={item.material || ''}
                                                                        onChange={(e) => updateItem(index, 'material', e.target.value)}
                                                                        placeholder="mm"
                                                                        disabled={!isIncluded}
                                                                    />
                                                                </td>
                                                            )}
                                                            {formData.quotation_type !== 'sqft' && (
                                                                <td style={{ padding: '8px' }}>
                                                                    <input
                                                                        type="number"
                                                                        className="form-input"
                                                                        style={{ padding: '4px', textAlign: 'center' }}
                                                                        value={item.rate}
                                                                        onChange={(e) => updateItem(index, 'rate', e.target.value)}
                                                                        disabled={!isIncluded}
                                                                    />
                                                                </td>
                                                            )}
                                                            {formData.quotation_type !== 'sqft' && (
                                                                <td style={{ padding: '8px', textAlign: 'right', fontWeight: 'bold' }}>
                                                                    {isIncluded ? formatCurrency(item.amount) : formatCurrency(0)}
                                                                </td>
                                                            )}
                                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost"
                                                                    onClick={() => removeItem(index)}
                                                                    style={{ color: 'var(--color-danger)', fontSize: '18px', padding: '0 4px', minHeight: 'auto' }}
                                                                >
                                                                    ×
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                                {formData.quotation_type !== 'sqft' && (
                                                    <tr style={{ background: 'var(--bg-hover)', fontWeight: 'bold' }}>
                                                        <td colSpan={7} style={{ padding: '12px', textAlign: 'right' }}>Component Total</td>
                                                        <td style={{ padding: '12px', textAlign: 'right' }}>
                                                            {formatCurrency(roomItems.reduce((sum, item) => sum + ((item.is_included !== false) ? (parseFloat(item.amount) || 0) : 0), 0))}
                                                        </td>
                                                        <td></td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            })}
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
                        <div className="flex justify-between items-center mb-sm">
                            <label className="form-label">Payment Plan & Milestone</label>
                            <button type="button" className="btn btn-sm btn-secondary" onClick={() => setMilestones([...milestones, { stage: '', percent: 0, amount: 0 }])}>+ Add Stage</button>
                        </div>
                        <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                <thead>
                                    <tr style={{ background: 'var(--bg-hover)', textAlign: 'left' }}>
                                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '40px' }}>Sr</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Stage / Milestone</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '100px' }}>%</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '150px' }}>Amount (₹)</th>
                                        <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {milestones.map((m, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>{i + 1}</td>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    type="text"
                                                    className="form-input"
                                                    style={{ border: 'none', background: 'transparent', padding: 0 }}
                                                    value={m.stage}
                                                    placeholder="Stage Name"
                                                    onChange={e => {
                                                        const newM = [...milestones];
                                                        newM[i].stage = e.target.value;
                                                        setMilestones(newM);
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ padding: '4px' }}
                                                    value={m.percent}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const newM = [...milestones];
                                                        newM[i].percent = val;
                                                        // Auto calc amount
                                                        if (calculations.grand_total) {
                                                            newM[i].amount = (calculations.grand_total * val) / 100;
                                                        }
                                                        setMilestones(newM);
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px' }}>
                                                <input
                                                    type="number"
                                                    className="form-input"
                                                    style={{ padding: '4px' }}
                                                    value={Math.round(m.amount)}
                                                    onChange={e => {
                                                        const val = parseFloat(e.target.value) || 0;
                                                        const newM = [...milestones];
                                                        newM[i].amount = val;
                                                        if (calculations.grand_total > 0) {
                                                            newM[i].percent = (val / calculations.grand_total) * 100;
                                                        }
                                                        setMilestones(newM);
                                                    }}
                                                />
                                            </td>
                                            <td style={{ padding: '8px', textAlign: 'center' }}>
                                                <button type="button" className="btn btn-ghost" onClick={() => setMilestones(milestones.filter((_, idx) => idx !== i))} style={{ color: 'var(--color-danger)' }}>×</button>
                                            </td>
                                        </tr>
                                    ))}
                                    <tr style={{ background: 'var(--bg-hover)', fontWeight: 'bold' }}>
                                        <td colSpan={2} style={{ padding: '8px', textAlign: 'right' }}>Total</td>
                                        <td style={{ padding: '8px' }}>{milestones.reduce((s, m) => s + (parseFloat(m.percent) || 0), 0).toFixed(0)}%</td>
                                        <td style={{ padding: '8px' }}>{formatCurrency(milestones.reduce((s, m) => s + (parseFloat(m.amount) || 0), 0))}</td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Terms and Condition of Company</label>
                        <textarea
                            name="terms_conditions"
                            className="form-textarea terms-conditions"
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
