import { create } from 'zustand';
import type { User } from '../types';

interface Toast {
  id: number;
  message: string;
  tone: 'success' | 'error';
}

interface UiState {
  toast?: Toast;
  showToast: (message: string, tone?: Toast['tone']) => void;
  clearToast: () => void;
}

interface AuthState {
  user?: User;
  status: 'loading' | 'ready' | 'error';
  setUser: (user?: User) => void;
  setReady: () => void;
  setSessionError: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  showToast: (message, tone = 'success') => set({ toast: { id: Date.now(), message, tone } }),
  clearToast: () => set({ toast: undefined }),
}));

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  setUser: (user) => set({ user, status: 'ready' }),
  setReady: () => set({ status: 'ready' }),
  setSessionError: () => set({ user: undefined, status: 'error' }),
}));
