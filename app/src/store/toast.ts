/** Тосты: короткие сообщения об успехе и ошибке (Zustand — только для UI-мелочей) */
import { create } from 'zustand';

export interface ToastItem {
  id: number;
  kind: 'success' | 'error' | 'info';
  text: string;
}

interface ToastState {
  items: ToastItem[];
  push: (kind: ToastItem['kind'], text: string) => void;
  remove: (id: number) => void;
}

let next = 1;
export const useToasts = create<ToastState>((set) => ({
  items: [],
  push: (kind, text) => {
    const id = next++;
    set((s) => ({ items: [...s.items, { id, kind, text }] }));
    setTimeout(() => set((s) => ({ items: s.items.filter((t) => t.id !== id) })), kind === 'error' ? 6000 : 3500);
  },
  remove: (id) => set((s) => ({ items: s.items.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (text: string) => useToasts.getState().push('success', text),
  error: (text: string) => useToasts.getState().push('error', text),
  info: (text: string) => useToasts.getState().push('info', text),
};
