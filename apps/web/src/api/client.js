import axios from 'axios';
import { getToken } from '../lib/session';

const newCorrelationId = () =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `web-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['X-Correlation-Id'] = newCorrelationId();
  return config;
});

/** Normalises any axios failure into a plain, serialisable error object. */
export function toApiError(error) {
  if (error?.isApiError) return error;
  const response = error?.response;
  if (!response) {
    return {
      isApiError: true,
      status: 0,
      message: error?.code === 'ECONNABORTED' ? 'The request timed out. Please retry.' : 'Network error. Check your connection.',
      errors: [],
    };
  }
  const body = response.data ?? {};
  const errors = Array.isArray(body.errors) ? body.errors : [];
  return {
    isApiError: true,
    status: response.status,
    message: errors[0]?.message ?? 'Something went wrong. Please try again.',
    errors,
    correlationId: body.meta?.correlationId ?? response.headers?.['x-correlation-id'],
  };
}

/** Performs a request and resolves with the API envelope { success, data, meta, errors }. */
export async function request(config) {
  try {
    const response = await http.request(config);
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}
