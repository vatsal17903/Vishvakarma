// API Configuration
// Temporary hardcoded fix - Vite env not working
const API_URL = 'https://apivkq.softodoor.com';

// For production: use full backend URL
// For development: use empty string (Vite proxy handles it)
export const getApiUrl = (endpoint) => {
    // In production, VITE_API_URL will be set (e.g., https://api.yourdomain.com)
    // In development, it will be empty and use Vite's proxy
    return `${API_URL}${endpoint}`;
};

export default API_URL;
