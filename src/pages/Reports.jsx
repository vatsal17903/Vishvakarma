import React, { useState, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

function Reports() {
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        end: new Date().toISOString().split('T')[0]
    });

    const [summary, setSummary] = useState(null);
    const [bedroomStats, setBedroomStats] = useState([]);
    const [projectStats, setProjectStats] = useState([]);
    const [monthlyTrend, setMonthlyTrend] = useState({ year: new Date().getFullYear(), trend: [] });
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('summary');

    const toast = useToast();

    useEffect(() => {
        fetchReports();
    }, [dateRange]);

    useEffect(() => {
        fetchTrends();
    }, []);

    const fetchReports = async () => {
        setLoading(true);
        try {
            const query = `start_date=${dateRange.start}&end_date=${dateRange.end}`;

            const [summaryRes, bedroomRes, projectRes] = await Promise.all([
                fetch(`https://apivkq.softodoor.com/api/reports/summary?${query}`, { credentials: 'include' }),
                fetch(`https://apivkq.softodoor.com/api/reports/bedroom-wise?${query}`, { credentials: 'include' }),
                fetch(`https://apivkq.softodoor.com/api/reports/project-wise?${query}`, { credentials: 'include' })
            ]);

            setSummary(await summaryRes.json());
            setBedroomStats(await bedroomRes.json());
            setProjectStats(await projectRes.json());
        } catch (error) {
            toast.error('Failed to load reports');
        } finally {
            setLoading(false);
        }
    };

    const fetchTrends = async () => {
        try {
            const response = await fetch(`${API_URL}/api/reports/monthly-trend`, { credentials: 'include' });
            setMonthlyTrend(await response.json());
        } catch (error) {
            console.error('Failed to load trends');
        }
    };

    const handleDateChange = (type, value) => {
        setDateRange(prev => ({ ...prev, [type]: value }));
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    if (loading && !summary) {
        return (
            <div className="page">
                <div className="loading"><div className="spinner"></div></div>
            </div>
        );
    }

    return (
        <div className="page">
            <div className="page-header">
                <h1 className="page-title">Reports</h1>
            </div>

            {/* Date Filter */}
            <div className="card mb-lg">
                <div className="form-row">
                    <div className="form-group mb-0">
                        <label className="form-label">Start Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={dateRange.start}
                            onChange={(e) => handleDateChange('start', e.target.value)}
                        />
                    </div>
                    <div className="form-group mb-0">
                        <label className="form-label">End Date</label>
                        <input
                            type="date"
                            className="form-input"
                            value={dateRange.end}
                            onChange={(e) => handleDateChange('end', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="tabs">
                <button
                    className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => setActiveTab('summary')}
                >
                    Summary
                </button>
                <button
                    className={`tab ${activeTab === 'projects' ? 'active' : ''}`}
                    onClick={() => setActiveTab('projects')}
                >
                    Project Wise
                </button>
                <button
                    className={`tab ${activeTab === 'bedroom' ? 'active' : ''}`}
                    onClick={() => setActiveTab('bedroom')}
                >
                    Bedroom Wise
                </button>
            </div>

            {activeTab === 'summary' && summary && (
                <>
                    <div className="stat-grid">
                        <div className="stat-card">
                            <div className="stat-value">{formatCurrency(summary.quotations.total_value)}</div>
                            <div className="stat-label">Total Quotations ({summary.quotations.count})</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value text-success">{formatCurrency(summary.receipts.total_received)}</div>
                            <div className="stat-label">Total Received ({summary.receipts.count})</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value text-warning">{formatCurrency(summary.bills.total_pending)}</div>
                            <div className="stat-label">Pending Payments</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-value">{formatCurrency(summary.quotations.total_tax)}</div>
                            <div className="stat-label">Total Tax Liability</div>
                        </div>
                    </div>

                    <div className="card mt-lg">
                        <h3 className="mb-md">Payment Details</h3>
                        <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
                            <div>
                                <div className="text-muted text-sm">Cash</div>
                                <div className="font-bold text-lg">{formatCurrency(summary.receipts.cash_total)}</div>
                            </div>
                            <div>
                                <div className="text-muted text-sm">Bank Transfer</div>
                                <div className="font-bold text-lg">{formatCurrency(summary.receipts.bank_total)}</div>
                            </div>
                            <div>
                                <div className="text-muted text-sm">UPI</div>
                                <div className="font-bold text-lg">{formatCurrency(summary.receipts.upi_total)}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card mt-lg">
                        <h3 className="mb-md">Monthly Trend ({monthlyTrend.year})</h3>
                        <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '8px', paddingBottom: '20px' }}>
                            {monthlyTrend.trend.map((month, idx) => {
                                const maxVal = Math.max(...monthlyTrend.trend.map(m => m.quotation_value));
                                const height = maxVal > 0 ? (month.quotation_value / maxVal) * 100 : 0;

                                return (
                                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                        <div style={{
                                            width: '100%',
                                            height: `${Math.max(height, 2)}%`,
                                            background: 'var(--color-primary)',
                                            borderRadius: '4px 4px 0 0',
                                            opacity: height > 0 ? 1 : 0.2,
                                            transition: 'height 0.3s ease'
                                        }}></div>
                                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{month.month}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'projects' && (
                <div className="card">
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Project / Client</th>
                                    <th>Quotation</th>
                                    <th>Billed</th>
                                    <th>Received</th>
                                    <th>Pending</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projectStats.length === 0 ? (
                                    <tr><td colSpan="6" className="text-center">No data found</td></tr>
                                ) : (
                                    projectStats.map((proj, idx) => (
                                        <tr key={idx}>
                                            <td>
                                                <div className="font-bold">{proj.client_name}</div>
                                                <div className="text-muted text-xs">{proj.project_location}</div>
                                            </td>
                                            <td>{formatCurrency(proj.quotation_value)}</td>
                                            <td>{formatCurrency(proj.billed_value)}</td>
                                            <td className="text-success">{formatCurrency(proj.paid_amount)}</td>
                                            <td className="text-warning">{formatCurrency(proj.pending_amount)}</td>
                                            <td>
                                                <span className={`badge badge-${proj.status === 'paid' ? 'success' : proj.status === 'partial' ? 'warning' : 'danger'}`}>
                                                    {proj.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'bedroom' && (
                <div className="card">
                    <h3 className="mb-md">Bedroom Configuration Analysis</h3>
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Configuration</th>
                                    <th>Count</th>
                                    <th>Total Value</th>
                                    <th>Avg. Value</th>
                                    <th>Share</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bedroomStats.map((stat, idx) => {
                                    const total = bedroomStats.reduce((sum, s) => sum + s.total_value, 0);
                                    const percentage = total > 0 ? (stat.total_value / total) * 100 : 0;

                                    return (
                                        <tr key={idx}>
                                            <td className="font-bold">{stat.bedroom_count} BHK</td>
                                            <td>{stat.count} Projects</td>
                                            <td>{formatCurrency(stat.total_value)}</td>
                                            <td>{formatCurrency(stat.avg_value)}</td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                    <div style={{ width: '50px', height: '4px', background: 'var(--bg-dark)', borderRadius: '2px' }}>
                                                        <div style={{ width: `${percentage}%`, height: '100%', background: 'var(--color-primary)', borderRadius: '2px' }}></div>
                                                    </div>
                                                    <span className="text-xs">{percentage.toFixed(1)}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Reports;
