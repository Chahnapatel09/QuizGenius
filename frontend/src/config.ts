// In development: 'http://localhost:3001'
// In production (Docker/Nginx): empty string — Nginx proxies /api/ requests
const API_URL = import.meta.env.VITE_API_URL || '';

export default API_URL;
