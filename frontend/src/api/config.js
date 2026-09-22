// URL base del backend. En desarrollo apunta a tu servidor local en el
// puerto 8000 (el que configuramos en backend/.env con PORT=8000).
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
