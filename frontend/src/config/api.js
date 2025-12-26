// API Configuration
const API_URL = import.meta.env.VITE_API_URL || '';

// For production: use full backend URL
// For development: use empty string (Vite proxy handles it)
export const getApiUrl = (endpoint) => {
    // In production, VITE_API_URL will be set (e.g., https://api.yourdomain.com)
    // In development, it will be empty and use Vite's proxy
    return `${API_URL}${endpoint}`;
};

export default API_URL;
