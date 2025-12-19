import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const toast = useToast();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!username || !password) {
            toast.error('Please enter username and password');
            return;
        }

        setLoading(true);
        try {
            await login(username, password);
            toast.success('Login successful!');
            navigate('/select-company');
        } catch (error) {
            toast.error(error.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-container">
                <div className="login-header">
                    <div className="login-logo">🏗️</div>
                    <h1>CRM</h1>
                    <p>Construction & Interior Business</p>
                </div>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label className="form-label">Username</label>
                        <input
                            type="text"
                            className="form-input"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Password</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="btn btn-primary btn-lg btn-block"
                        disabled={loading}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    <p className="text-muted" style={{ fontSize: '12px' }}>
                        Default: admin / admin123
                    </p>
                </div>
            </div>

            <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-lg);
          background: linear-gradient(135deg, var(--bg-darker) 0%, var(--bg-dark) 50%, #1a1a3e 100%);
        }

        .login-container {
          width: 100%;
          max-width: 400px;
        }

        .login-header {
          text-align: center;
          margin-bottom: var(--space-2xl);
        }

        .login-logo {
          font-size: 64px;
          margin-bottom: var(--space-md);
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .login-header h1 {
          font-size: var(--font-size-4xl);
          font-weight: 800;
          background: var(--gradient-primary);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          margin-bottom: var(--space-xs);
        }

        .login-header p {
          color: var(--text-muted);
          margin: 0;
        }

        .login-form {
          background: var(--gradient-card);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-xl);
          padding: var(--space-xl);
        }

        .login-footer {
          text-align: center;
          margin-top: var(--space-lg);
        }
      `}</style>
        </div>
    );
}

export default Login;
