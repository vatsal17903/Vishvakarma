import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';

// Pages
import Login from './pages/Login';
import CompanySelect from './pages/CompanySelect';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import ClientForm from './pages/ClientForm';
import Packages from './pages/Packages';
import PackageForm from './pages/PackageForm';
import Quotations from './pages/Quotations';
import QuotationForm from './pages/QuotationForm';
import QuotationView from './pages/QuotationView';
import Receipts from './pages/Receipts';
import ReceiptForm from './pages/ReceiptForm';
import Bills from './pages/Bills';
import BillView from './pages/BillView';
import Reports from './pages/Reports';
import Settings from './pages/Settings';

// Layout
import Layout from './components/Layout';

// Protected Route Component
function ProtectedRoute({ children, requireCompany = true }) {
    const { isAuthenticated, hasCompany, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requireCompany && !hasCompany) {
        return <Navigate to="/select-company" replace />;
    }

    return children;
}

// Public Route Component (redirect if already logged in)
function PublicRoute({ children }) {
    const { isAuthenticated, hasCompany, loading } = useAuth();

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
            </div>
        );
    }

    if (isAuthenticated && hasCompany) {
        return <Navigate to="/dashboard" replace />;
    }

    if (isAuthenticated && !hasCompany) {
        return <Navigate to="/select-company" replace />;
    }

    return children;
}

function AppRoutes() {
    return (
        <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
                <PublicRoute><Login /></PublicRoute>
            } />

            {/* Company Selection (after login, before dashboard) */}
            <Route path="/select-company" element={
                <ProtectedRoute requireCompany={false}>
                    <CompanySelect />
                </ProtectedRoute>
            } />

            {/* Protected Routes with Layout */}
            <Route path="/" element={
                <ProtectedRoute><Layout /></ProtectedRoute>
            }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />

                {/* Clients */}
                <Route path="clients" element={<Clients />} />
                <Route path="clients/new" element={<ClientForm />} />
                <Route path="clients/:id/edit" element={<ClientForm />} />

                {/* Packages */}
                <Route path="packages" element={<Packages />} />
                <Route path="packages/new" element={<PackageForm />} />
                <Route path="packages/:id/edit" element={<PackageForm />} />

                {/* Quotations */}
                <Route path="quotations" element={<Quotations />} />
                <Route path="quotations/new" element={<QuotationForm />} />
                <Route path="quotations/:id" element={<QuotationView />} />
                <Route path="quotations/:id/edit" element={<QuotationForm />} />

                {/* Receipts */}
                <Route path="receipts" element={<Receipts />} />
                <Route path="receipts/new" element={<ReceiptForm />} />
                <Route path="receipts/:id/edit" element={<ReceiptForm />} />

                {/* Bills */}
                <Route path="bills" element={<Bills />} />
                <Route path="bills/:id" element={<BillView />} />

                {/* Reports */}
                <Route path="reports" element={<Reports />} />

                {/* Settings */}
                <Route path="settings" element={<Settings />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ToastProvider>
                    <AppRoutes />
                </ToastProvider>
            </AuthProvider>
        </BrowserRouter>
    );
}

export default App;
