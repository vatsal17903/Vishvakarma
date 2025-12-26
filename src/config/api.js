// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'https://apivkq.softodoor.com';

// For production: use full backend URL
// For development: use empty string (Vite proxy handles it)
export const getApiUrl = (endpoint) => {
    return `${API_URL}${endpoint}`;
};

export { API_URL };
export default API_URL;
