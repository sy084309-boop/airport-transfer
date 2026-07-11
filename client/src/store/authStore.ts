import { create } from 'zustand';
import api from '../services/api';

interface User {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: string;
}

export interface SavedAddress {
  label: string;
  lat: number;
  lng: number;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  recentAddresses: SavedAddress[];
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
  fetchRecentAddresses: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  recentAddresses: [],

  login: async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    set({ user: { id: data.user.id, email: data.user.email, fullName: data.user.fullName, phone: data.user.phone || '', role: data.user.role } });
  },

  register: async (formData) => {
    const { data } = await api.post('/auth/register', formData);
    localStorage.setItem('accessToken', data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    // register returns snake_case, normalize to camelCase
    set({ user: { id: data.user.id, email: data.user.email, fullName: data.user.full_name || '', phone: data.user.phone || '', role: data.user.role } });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    set({ user: null, recentAddresses: [] });
  },

  fetchMe: async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) return set({ loading: false });
      const { data } = await api.get('/auth/me');
      set({
        user: { id: data.id, email: data.email, fullName: data.full_name || '', phone: data.phone || '', role: data.role },
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  fetchRecentAddresses: async () => {
    try {
      const { data } = await api.get('/bookings/recent-addresses');
      set({ recentAddresses: data.addresses || [] });
    } catch { /* silently fail */ }
  },
}));
