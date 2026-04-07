import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:3000'
});

// Axios Request Interceptor
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Axios Response Interceptor (Global Error Handling)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // Handle global 401 Unauthorized
        if (error.response && error.response.status === 401) {
            // Dispatch a custom event so the AuthContext can pick it up and clear state
            window.dispatchEvent(new Event('auth:logout'));
        }
        return Promise.reject(error);
    }
);

export default api;
