import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
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

function CompanySelect() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selecting, setSelecting] = useState(false);
    const { selectCompany, logout } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            const response = await fetch(`${API_URL}/api/company`, { headers: getAuthHeaders() });
            const data = await response.json();
            setCompanies(data);
        } catch (error) {
            toast.error('Failed to load companies');
        } finally {
            setLoading(false);
        }
    };

    const handleSelect = async (companyId) => {
        setSelecting(true);
        try {
            await selectCompany(companyId);
            toast.success('Company selected!');
            navigate('/dashboard');
        } catch (error) {
            toast.error(error.message || 'Selection failed');
        } finally {
            setSelecting(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    return (
        <div className="company-select-page">
            <div className="company-select-container">
                <div className="company-select-header">
                    <h1>Select Company</h1>
                    <p>Choose a company to continue</p>
                </div>

                <div className="company-cards">
                    {companies.map((company) => (
                        <div
                            key={company.id}
                            className="company-card"
                            onClick={() => !selecting && handleSelect(company.id)}
                        >
                            <div className="company-card-icon">
                                {company.code === 'AARTI' ? '🏗️' : '🏠'}
                            </div>
                            <h3>{company.name}</h3>
                            <p>{company.address}</p>
                            <span className="company-card-code">{company.code}</span>
                        </div>
                    ))}
                </div>

                <button onClick={handleLogout} className="btn btn-ghost btn-block mt-lg">
                    Logout
                </button>
            </div>

            <style>{`
        .company-select-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-lg);
          background: linear-gradient(135deg, var(--bg-darker) 0%, var(--bg-dark) 50%, #1a1a3e 100%);
        }

        .company-select-container {
          width: 100%;
          max-width: 500px;
        }

        .company-select-header {
          text-align: center;
          margin-bottom: var(--space-2xl);
        }

        .company-select-header h1 {
          font-size: var(--font-size-2xl);
          margin-bottom: var(--space-sm);
        }

        .company-select-header p {
          color: var(--text-muted);
          margin: 0;
        }

        .company-cards {
          display: grid;
          gap: var(--space-lg);
        }

        .company-card {
          background: var(--gradient-card);
          border: 2px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: var(--space-xl);
          text-align: center;
          cursor: pointer;
          transition: all var(--transition-base);
          position: relative;
          overflow: hidden;
        }

        .company-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: var(--gradient-primary);
          transform: scaleX(0);
          transition: transform var(--transition-base);
        }

        .company-card:hover {
          border-color: var(--color-primary);
          transform: translateY(-4px);
          box-shadow: var(--shadow-glow);
        }

        .company-card:hover::before {
          transform: scaleX(1);
        }

        .company-card-icon {
          font-size: 48px;
          margin-bottom: var(--space-md);
        }

        .company-card h3 {
          font-size: var(--font-size-lg);
          margin-bottom: var(--space-sm);
        }

        .company-card p {
          font-size: var(--font-size-sm);
          color: var(--text-muted);
          margin-bottom: var(--space-md);
        }

        .company-card-code {
          display: inline-block;
          padding: var(--space-xs) var(--space-md);
          background: var(--color-primary-glow);
          color: var(--color-primary-light);
          border-radius: var(--radius-full);
          font-size: var(--font-size-xs);
          font-weight: 600;
        }
      `}</style>
        </div>
    );
}

export default CompanySelect;
