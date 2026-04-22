import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach JWT token to every request (from localStorage)
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ll_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.detail || error.message || 'Something went wrong';
    console.error('API Error:', message);

    // Auto-logout on 401
    if (error.response?.status === 401) {
      localStorage.removeItem('ll_token');
      localStorage.removeItem('ll_user');
    }

    return Promise.reject(error);
  }
);

// ============================================================
// AUTH API
// ============================================================
export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  signup: (email, password, full_name) => api.post('/auth/signup', { email, password, full_name }),
};

// ============================================================
// PROJECT API
// ============================================================
export const projectsApi = {
  create: (data) => api.post('/projects', data),
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
};

// ============================================================
// DATASET API
// ============================================================
export const datasetsApi = {
  upload: (projectId, formData) =>
    api.post(`/datasets/${projectId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  list: (projectId) => api.get(`/datasets/${projectId}`),
  delete: (id) => api.delete(`/datasets/${id}`),
};

// ============================================================
// TRAINING API
// ============================================================
export const trainingApi = {
  start: (data) => api.post('/train', data),
  getMetrics: (jobId) => api.get(`/metrics/${jobId}`),
  listJobs: (projectId) => api.get(`/training/jobs/${projectId}`),
};

// ============================================================
// DEPLOYMENT API
// ============================================================
export const deploymentApi = {
  deploy: (data) => api.post('/deploy', data),
  list: () => api.get('/deployments'),
  predict: (modelId, data, apiKey) =>
    api.post(`/predict/${modelId}`, data, {
      headers: { 'X-API-Key': apiKey },
    }),
};

export default api;
