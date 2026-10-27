import { apiRequest, jsonRequest, resetApiSecurityState } from '../../lib/api';
import type { User } from '../../types';

export interface Credentials {
  email: string;
  password: string;
}
export interface SignUpValues extends Credentials {
  nickname: string;
}

export const getMe = () => apiRequest<User>('/api/users/me', {}, { redirectOnUnauthorized: false });
export const login = (values: Credentials) =>
  apiRequest('/api/auth/login', jsonRequest('POST', values), { refreshOnUnauthorized: false });
export const signUp = (values: SignUpValues) =>
  apiRequest('/api/auth/sign-up', jsonRequest('POST', values), { refreshOnUnauthorized: false });
export async function logout() {
  try {
    await apiRequest<void>(
      '/api/auth/logout',
      { method: 'POST' },
      { refreshOnUnauthorized: false },
    );
  } finally {
    resetApiSecurityState();
  }
}
