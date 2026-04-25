import axios from 'axios';
import { getStoredToken } from './tokenStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-nextjs-app.vercel.app';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});
