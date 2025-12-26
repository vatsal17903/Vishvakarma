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

const Modal = ({ isOpen, onClose, title, children, footer }) => {
    if (!isOpen) return null;
    return (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
            <div className="modal">
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button type="button" className="modal-close" onClick={onClose}>×</button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
                {footer && <div className="modal-footer">{footer}</div>}
            </div>
        </div>
    );
};

function PackageForm() {
    const { id } = useParams();
    const navigate = useNavigate();
    const toast = useToast();
    const isEdit = !!id;

    const [formData, setFormData] = useState({
        name: '',
        bhk_type: '2 BHK',
        tier: 'Silver',
        base_rate_sqft: '',
        description: ''
    });
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(isEdit);

    const bhkTypes = ['1 BHK', '2 BHK', '3 BHK', '4 BHK', '5 BHK'];
    const tiers = ['Silver', 'Gold', 'Platinum'];

    const [customRooms, setCustomRooms] = useState([]);
    const [hiddenSections, setHiddenSections] = useState([]); // To track removed standard sections

    // Modal State
    const [modal, setModal] = useState({ isOpen: false, type: null, data: null });
    const [inputValue, setInputValue] = useState('');

    useEffect(() => {
        if (isEdit) {
            fetchPackage();
        }
    }, [id]);

    const calculateStandardRooms = (bhkType) => {
        const bhk = parseInt((bhkType || '').split(' ')[0]) || 1;
        const rooms = ['General', 'Living Room', 'Kitchen', 'Master Bedroom'];
        for (let i = 2; i <= bhk; i++) {
            rooms.push(`Bedroom ${i}`);
        }
        return rooms;
    };

    const fetchPackage = async () => {
        try {
            const response = await fetch(`${API_URL}/api/packages/${id}`, { headers: getAuthHeaders() });
            if (!response.ok) throw new Error('Package not found');
            const data = await response.json();

            // Extract custom rooms from items
            const standardRooms = calculateStandardRooms(data.bhk_type);
            const itemRooms = [...new Set(data.items.map(i => i.room_type || 'General'))];
            const extraRooms = itemRooms.filter(r => !standardRooms.includes(r));

            setCustomRooms(extraRooms);
            setHiddenSections([]); // Reset hidden sections on load
            setFormData(data);
            setItems(data.items || []);
        } catch (error) {
            toast.error('Failed to load package');
            navigate('/packages');
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

        if (!formData.name || !formData.base_rate_sqft) {
            toast.error('Name and rate are required');
            return;
        }

        setLoading(true);
        try {
            const url = isEdit ? `${API_URL}/api/packages/${id}` : `${API_URL}/api/packages`;
            const method = isEdit ? 'PUT' : 'POST';

            // Ensure item_name is populated
            const processedItems = items.map(item => ({
                ...item,
                item_name: item.description || 'Item', // Schema requires item_name
                room_type: item.room_type || 'General'
            }));

            const response = await fetch(url, {
                method,
                headers: getAuthHeaders(),
                body: JSON.stringify({
                    ...formData,
                    base_rate_sqft: parseFloat(formData.base_rate_sqft),
                    items: processedItems
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to save package');
            }

            toast.success(isEdit ? 'Package updated!' : 'Package created!');
            navigate('/packages');
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    const getAllRooms = () => {
        const standard = calculateStandardRooms(formData.bhk_type);
        // Filter out hidden standard sections
        const visibleStandard = standard.filter(r => !hiddenSections.includes(r));
        return [...new Set([...visibleStandard, ...customRooms])];
    };

    // Modal Actions
    const openAddModal = () => {
        setInputValue('');
        setModal({ isOpen: true, type: 'add', data: null });
    };

    const openRenameModal = (roomName) => {
        setInputValue(roomName);
        setModal({ isOpen: true, type: 'rename', data: roomName });
    };

    const openDeleteModal = (roomName) => {
        setModal({ isOpen: true, type: 'delete', data: roomName });
    };

    const closeModal = () => {
        setModal({ isOpen: false, type: null, data: null });
        setInputValue('');
    };

    const handleModalSubmit = () => {
        if (modal.type === 'add') {
            const name = inputValue.trim();
            if (!name) return;
            if (getAllRooms().includes(name)) {
                toast.error('Section already exists');
                return;
            }
            setCustomRooms([...customRooms, name]);
            toast.success('Section added');
        } else if (modal.type === 'rename') {
            const oldName = modal.data;
            const newName = inputValue.trim();
            if (!newName || newName === oldName) {
                closeModal();
                return;
            };

            if (getAllRooms().includes(newName)) {
                toast.error('Section name already exists');
                return;
            }

            // 1. Update items
            setItems(prev => prev.map(item => item.room_type === oldName ? { ...item, room_type: newName } : item));

            // 2. Update room lists
            const standard = calculateStandardRooms(formData.bhk_type);

            if (customRooms.includes(oldName)) {
                setCustomRooms(prev => prev.map(r => r === oldName ? newName : r));
            } else if (standard.includes(oldName)) {
                setHiddenSections(prev => [...prev, oldName]);
                setCustomRooms(prev => [...prev, newName]);
            }
            toast.success('Section renamed');
        } else if (modal.type === 'delete') {
            const roomToRemove = modal.data;
            // Remove items
            setItems(prev => prev.filter(item => item.room_type !== roomToRemove));

            const standard = calculateStandardRooms(formData.bhk_type);
            if (standard.includes(roomToRemove)) {
                setHiddenSections(prev => [...prev, roomToRemove]);
            } else {
                setCustomRooms(prev => prev.filter(r => r !== roomToRemove));
            }
            toast.success('Section removed');
        }
        closeModal();
    };

    const deleteRoom = (roomToRemove) => {
        if (!confirm(`Are you sure you want to remove the "${roomToRemove}" section? This will remove all items in it.`)) return;

        // Remove items belonging to this room
        setItems(prev => prev.filter(item => item.room_type !== roomToRemove));

        const standard = calculateStandardRooms(formData.bhk_type);
        if (standard.includes(roomToRemove)) {
            // If standard, hide it
            setHiddenSections(prev => [...prev, roomToRemove]);
        } else {
            // If custom, remove it
            setCustomRooms(prev => prev.filter(r => r !== roomToRemove));
        }
    };

    const renameRoom = (oldName) => {
        const newName = prompt("Enter new name:", oldName);
        if (!newName || newName.trim() === "" || newName === oldName) return;

        const trimmedNewName = newName.trim();

        if (getAllRooms().includes(trimmedNewName)) {
            toast.error('Section name already exists');
            return;
        }

        // 1. Update items
        setItems(prev => prev.map(item => item.room_type === oldName ? { ...item, room_type: trimmedNewName } : item));

        // 2. Update room lists
        const standard = calculateStandardRooms(formData.bhk_type);

        if (customRooms.includes(oldName)) {
            // Just rename in custom rooms
            setCustomRooms(prev => prev.map(r => r === oldName ? trimmedNewName : r));
        } else if (standard.includes(oldName)) {
            // It was a standard room. Hide the old standard room, add new custom room.
            setHiddenSections(prev => [...prev, oldName]);
            setCustomRooms(prev => [...prev, trimmedNewName]);
        }
    };

    const addItem = (roomType = 'General') => {
        setItems([...items, {
            description: '',
            unit: 'NO.',
            quantity: 1,
            mm: '',
            status: '',
            room_type: roomType
        }]);
    };

    const updateItem = (index, field, value) => {
        const newItems = [...items];
        newItems[index][field] = value;
        setItems(newItems);
    };

    const removeItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this package?')) return;

        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/packages/${id}`, { method: 'DELETE', headers: getAuthHeaders()
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to delete package');
            }

            toast.success('Package deleted!');
            navigate('/packages');
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
                    <h1 className="page-title">{isEdit ? 'Edit Package' : 'New Package'}</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="card">
                <div className="form-group">
                    <label className="form-label">Package Name *</label>
                    <input
                        type="text"
                        name="name"
                        className="form-input"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="e.g., 2 BHK Gold Package"
                    />
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">BHK Type</label>
                        <select
                            name="bhk_type"
                            className="form-select"
                            value={formData.bhk_type}
                            onChange={handleChange}
                        >
                            {bhkTypes.map(type => (
                                <option key={type} value={type}>{type}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label className="form-label">Tier</label>
                        <select
                            name="tier"
                            className="form-select"
                            value={formData.tier}
                            onChange={handleChange}
                        >
                            {tiers.map(tier => (
                                <option key={tier} value={tier}>{tier}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label className="form-label">Base Rate per Sqft (₹) *</label>
                    <input
                        type="number"
                        name="base_rate_sqft"
                        className="form-input"
                        value={formData.base_rate_sqft}
                        onChange={handleChange}
                        placeholder="Enter rate per sqft"
                        step="0.01"
                    />
                </div>

                <div className="form-group">
                    <label className="form-label">Description</label>
                    <textarea
                        name="description"
                        className="form-textarea"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Package description..."
                        rows={3}
                    />
                </div>

                <div className="card mb-lg" style={{ marginTop: 'var(--space-lg)' }}>
                    <div className="flex justify-between items-center mb-lg">
                        <h3 style={{ margin: 0 }}>Package Items</h3>
                        <button type="button" className="btn btn-primary" onClick={openAddModal}>
                            + Add New Section
                        </button>
                    </div>

                    <div style={{ display: 'grid', gap: 'var(--space-xl)' }}>
                        {getAllRooms().map((room, roomIndex) => {
                            const isCustom = !calculateStandardRooms(formData.bhk_type).includes(room);

                            return (
                                <div key={room} style={{
                                    paddingBottom: roomIndex !== getAllRooms().length - 1 ? 'var(--space-xl)' : 0,
                                    borderBottom: roomIndex !== getAllRooms().length - 1 ? '1px solid var(--border-color)' : 'none'
                                }}>
                                    <div className="flex justify-between items-center mb-md">
                                        <h4 style={{ fontSize: '1.1rem', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span style={{ width: '4px', height: '16px', background: 'var(--color-primary)', borderRadius: '2px', display: 'inline-block' }}></span>
                                            {room}
                                            <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-icon btn-sm"
                                                    style={{ color: 'var(--color-primary)' }}
                                                    onClick={() => openRenameModal(room)}
                                                    title="Rename Section"
                                                >
                                                    ✎
                                                </button>
                                                <button
                                                    type="button"
                                                    className="btn btn-ghost btn-icon btn-sm"
                                                    style={{ color: 'var(--color-danger)' }}
                                                    onClick={() => openDeleteModal(room)}
                                                    title="Remove Section"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </h4>
                                        <button type="button" className="btn btn-sm btn-secondary" onClick={() => addItem(room)}>
                                            + Add to {room}
                                        </button>
                                    </div>

                                    <div className="table-container">
                                        <table className="table">
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '50px' }}>No.</th>
                                                    <th>Description</th>
                                                    <th style={{ width: '100px' }}>Unit</th>
                                                    <th style={{ width: '100px' }}>Quantity</th>
                                                    <th style={{ width: '150px' }}>mm</th>
                                                    <th style={{ width: '150px' }}>Status</th>
                                                    <th style={{ width: '50px' }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {items
                                                    .map((item, index) => ({ ...item, originalIndex: index }))
                                                    .filter(item => (item.room_type || 'General') === room)
                                                    .map((item, filteredIndex) => (
                                                        <tr key={item.originalIndex}>
                                                            <td>{filteredIndex + 1}</td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="form-input"
                                                                    value={item.description}
                                                                    onChange={(e) => updateItem(item.originalIndex, 'description', e.target.value)}
                                                                    placeholder="Item Description"
                                                                />
                                                            </td>
                                                            <td>
                                                                <select
                                                                    className="form-select"
                                                                    value={item.unit}
                                                                    onChange={(e) => updateItem(item.originalIndex, 'unit', e.target.value)}
                                                                    style={{ padding: '4px' }}
                                                                >
                                                                    <option value="NO.">NO.</option>
                                                                    <option value="L/S">L/S</option>
                                                                    <option value="Sq. ft">Sq. ft</option>
                                                                    <option value="R. ft">R. ft</option>
                                                                    <option value="C. ft">C. ft</option>
                                                                </select>
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="number"
                                                                    className="form-input"
                                                                    value={item.quantity}
                                                                    onChange={(e) => updateItem(item.originalIndex, 'quantity', e.target.value)}
                                                                    placeholder="Qty"
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="form-input"
                                                                    value={item.mm || ''}
                                                                    onChange={(e) => updateItem(item.originalIndex, 'mm', e.target.value)}
                                                                    placeholder="mm"
                                                                />
                                                            </td>
                                                            <td>
                                                                <input
                                                                    type="text"
                                                                    className="form-input"
                                                                    value={item.status || ''}
                                                                    onChange={(e) => updateItem(item.originalIndex, 'status', e.target.value)}
                                                                    placeholder="Status"
                                                                />
                                                            </td>
                                                            <td>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-ghost"
                                                                    onClick={() => removeItem(item.originalIndex)}
                                                                    style={{ color: 'var(--color-danger)', padding: '4px' }}
                                                                >
                                                                    ×
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                {items.filter(item => (item.room_type || 'General') === room).length === 0 && (
                                                    <tr>
                                                        <td colSpan="6" className="text-center text-muted" style={{ padding: 'var(--space-md)' }}>
                                                            No items added for {room}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="flex gap-md" style={{ marginTop: 'var(--space-lg)' }}>
                    <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                        {loading ? 'Saving...' : (isEdit ? 'Update Package' : 'Create Package')}
                    </button>
                    <button type="button" className="btn btn-secondary btn-lg" onClick={() => navigate('/packages')}>
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
                        Delete Package
                    </button>
                )}

                {/* Reusable Modal */}
                <Modal
                    isOpen={modal.isOpen}
                    onClose={closeModal}
                    title={
                        modal.type === 'add' ? 'Add New Section' :
                            modal.type === 'rename' ? 'Rename Section' :
                                modal.type === 'delete' ? 'Confirm Deletion' : ''
                    }
                    footer={
                        <>
                            <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                            <button
                                type="button"
                                className={`btn ${modal.type === 'delete' ? 'btn-danger' : 'btn-primary'}`}
                                onClick={handleModalSubmit}
                            >
                                {modal.type === 'delete' ? 'Delete' : 'Save'}
                            </button>
                        </>
                    }
                >
                    {modal.type === 'delete' ? (
                        <p>Are you sure you want to delete the section <strong>{modal.data}</strong>? This will remove all items in it.</p>
                    ) : (
                        <div className="form-group">
                            <label className="form-label">Section Name</label>
                            <input
                                type="text"
                                className="form-input"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder="Enter section name"
                                autoFocus
                                onKeyDown={(e) => e.key === 'Enter' && handleModalSubmit()}
                            />
                        </div>
                    )}
                </Modal>
            </form>
        </div>
    );
}

export default PackageForm;
