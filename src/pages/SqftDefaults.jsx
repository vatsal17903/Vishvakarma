import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';

function SqftDefaults() {
    const navigate = useNavigate();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [items, setItems] = useState([]);
    const [sections, setSections] = useState([]);

    useEffect(() => {
        fetchDefaults();
    }, []);

    const fetchDefaults = async () => {
        try {
            const res = await fetch(`${API_URL}/api/sqft-defaults`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setItems(data.items || []);
                // Extract unique sections
                const uniqueSections = [...new Set(data.items.map(i => i.room_label))];
                setSections(uniqueSections);
            }
        } catch (error) {
            toast.error('Failed to load defaults');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch(`${API_URL}/api/sqft-defaults`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ items })
            });

            if (res.ok) {
                toast.success('Sq.Ft defaults saved!');
            } else {
                throw new Error('Failed to save');
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setSaving(false);
        }
    };

    const addItem = (sectionName) => {
        setItems([...items, {
            room_label: sectionName,
            item_name: '',
            unit: '-',
            quantity: 1,
            rate: 0,
            amount: 0
        }]);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index] = { ...newItems[index], [field]: value };
        setItems(newItems);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const addSection = () => {
        const name = prompt('Enter new section name:');
        if (name && name.trim()) {
            setSections([...sections, name.trim()]);
        }
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button onClick={() => navigate(-1)} className="btn btn-ghost btn-icon">
                        ←
                    </button>
                    <h1 className="page-title">Sq.Ft Default Items</h1>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={addSection} className="btn btn-secondary">
                        + Add Section
                    </button>
                    <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <p className="text-muted" style={{ marginBottom: 'var(--space-lg)' }}>
                Configure default items that appear when creating a Square Foot based quotation.
            </p>

            {sections.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📐</div>
                    <p>No sections yet. Add a section to get started.</p>
                </div>
            ) : (
                sections.map((section) => {
                    const sectionItems = items
                        .map((item, idx) => ({ ...item, originalIndex: idx }))
                        .filter(item => item.room_label === section);

                    return (
                        <div key={section} className="card mb-lg">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
                                <h3 style={{ color: 'var(--color-primary)', textTransform: 'uppercase' }}>{section}</h3>
                                <button type="button" className="btn btn-sm btn-secondary" onClick={() => addItem(section)}>
                                    + Add Item
                                </button>
                            </div>

                            {sectionItems.length === 0 ? (
                                <p className="text-muted">No items in this section.</p>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead>
                                        <tr style={{ background: 'var(--bg-hover)', textAlign: 'left' }}>
                                            <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '40px' }}>#</th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)' }}>Description</th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '80px' }}>Unit</th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '80px' }}>Qty</th>
                                            <th style={{ padding: '8px', borderBottom: '1px solid var(--border-color)', width: '40px' }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sectionItems.map((item, idx) => (
                                            <tr key={item.originalIndex} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>{idx + 1}</td>
                                                <td style={{ padding: '8px' }}>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        style={{ padding: '4px' }}
                                                        value={item.item_name}
                                                        onChange={(e) => updateItem(item.originalIndex, 'item_name', e.target.value)}
                                                        placeholder="Item description"
                                                    />
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <input
                                                        type="text"
                                                        className="form-input"
                                                        style={{ padding: '4px', textAlign: 'center' }}
                                                        value={item.unit}
                                                        onChange={(e) => updateItem(item.originalIndex, 'unit', e.target.value)}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px' }}>
                                                    <input
                                                        type="number"
                                                        className="form-input"
                                                        style={{ padding: '4px', textAlign: 'center' }}
                                                        value={item.quantity}
                                                        onChange={(e) => updateItem(item.originalIndex, 'quantity', e.target.value)}
                                                    />
                                                </td>
                                                <td style={{ padding: '8px', textAlign: 'center' }}>
                                                    <button
                                                        type="button"
                                                        className="btn btn-ghost"
                                                        onClick={() => removeItem(item.originalIndex)}
                                                        style={{ color: 'var(--color-danger)', fontSize: '18px', padding: '0 4px', minHeight: 'auto' }}
                                                    >
                                                        ×
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}

export default SqftDefaults;
