const API_BASE_URL = window.API_BASE_URL || "/api";

export const apiUrl = (path) => `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
