import axios from 'axios';
import { getStoredToken } from './tokenStore';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://your-nextjs-app.vercel.app';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20_000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(async (config) => {
  const token = await getStoredToken();
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  // Daily AI allowances reset at the user's own midnight, not UTC's.
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) config.headers['x-timezone'] = tz;
  } catch {}
  return config;
});
