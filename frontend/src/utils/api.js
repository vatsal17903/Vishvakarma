/**
 * API Utility Functions
 * Handles API calls with proper URL configuration for both development and production
 */

const API_URL = import.meta.env.VITE_API_URL || '';

/**
 * Make a fetch request to the API
 * @param {string} endpoint - API endpoint (e.g., '/api/auth/login')
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @returns {Promise} - Fetch promise
 */
export const apiFetch = async (endpoint, options = {}) => {
    const url = `${API_URL}${endpoint}`;

    const defaultOptions = {
        credentials: 'include', // Always include cookies for sessions
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    };

    const config = { ...defaultOptions, ...options };

    return fetch(url, config);
};

/**
 * GET request
 */
export const apiGet = (endpoint) => {
    return apiFetch(endpoint, { method: 'GET' });
};

/**
 * POST request
 */
export const apiPost = (endpoint, data) => {
    return apiFetch(endpoint, {
        method: 'POST',
        body: JSON.stringify(data),
    });
};

/**
 * PUT request
 */
export const apiPut = (endpoint, data) => {
    return apiFetch(endpoint, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
};

/**
 * DELETE request
 */
export const apiDelete = (endpoint) => {
    return apiFetch(endpoint, { method: 'DELETE' });
};

export default apiFetch;
