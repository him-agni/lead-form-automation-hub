import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
});

export const fetchEvents = (page = 1) =>
  api.get(`/events?page=${page}&limit=20`).then(r => r.data);

export const fetchStats = () =>
  api.get('/events/stats').then(r => r.data);

export const retryEvent = (id) =>
  api.post(`/events/${id}/retry`).then(r => r.data);

export const simulateSubmission = (data) =>
  api.post('/webhooks/simulate', data).then(r => r.data);
