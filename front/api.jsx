import axios from 'axios';

const API_URL = 'http://localhost:5000/api/';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Перехватчик запросов для добавления токена
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Функции для работы с API
export const login = (email, password) => api.post('auth/login', { email, password });
export const register = (email, password) => api.post('auth/register', { email, password });
export const getMe = () => api.get('auth/me');

export const getAccounts = () => api.get('accounts');
export const createAccount = (data) => api.post('accounts', data);
export const updateAccount = (id, data) => api.put(`accounts/${id}`, data);
export const deleteAccount = (id) => api.delete(`accounts/${id}`);
export const toggleAccountStatus = (id) => api.patch(`accounts/${id}/toggle`);

export const getScheduledTasks = () => api.get('tasks/scheduled');
export const createScheduledTask = (data) => api.post('tasks/scheduled', data);
export const updateScheduledTask = (id, data) => api.put(`tasks/scheduled/${id}`, data);
export const deleteScheduledTask = (id) => api.delete(`tasks/scheduled/${id}`);
export const toggleScheduledTaskStatus = (id) => api.patch(`tasks/scheduled/${id}/toggle`);
export const clearScheduledTaskHistory = (id) => api.delete(`tasks/scheduled/${id}/clear-history`);

export const getLiveTasks = () => api.get('tasks/live');
export const createLiveTask = (data) => api.post('tasks/live', data);
export const updateLiveTask = (id, data) => api.put(`tasks/live/${id}`, data);
export const deleteLiveTask = (id) => api.delete(`tasks/live/${id}`);
export const toggleLiveTaskStatus = (id) => api.patch(`tasks/live/${id}/toggle`);

export const getTemplates = () => api.get('tasks/templates');
export const createTemplate = (data) => api.post('tasks/templates', data);
export const updateTemplate = (id, data) => api.put(`tasks/templates/${id}`, data);
export const deleteTemplate = (id) => api.delete(`tasks/templates/${id}`);

export const getWpTerms = (accountId) => api.get(`wordpress/${accountId}/terms`);
export const getTemplatePreview = (accountId, templateId, platform = 'telegram') => api.post('wordpress/preview', { accountId, templateId, platform });
export const getTemplatePreviewByContent = (accountId, content, platform = 'telegram') => api.post('wordpress/preview', { accountId, content, platform });

export const getLogs = (filters) => api.get('logs', { params: filters });
export const getTaskLogs = (taskId) => api.get(`logs/task/${taskId}`);

export const getStats = () => api.get('stats');

export const getUserSettings = () => api.get('auth/settings');
export const updateUserSettings = (settings) => api.put('auth/settings', settings);
export const updateUserProfile = (profile) => api.put('auth/profile', profile);
export const updateUserPassword = (passwords) => api.put('auth/password', passwords);

export default api; 