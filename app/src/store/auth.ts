/** Сессия: текущий пользователь. Данные приложения — НЕ здесь, а в кэше api/db.ts */
import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  setUser: (u: User | null) => void;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
}));
