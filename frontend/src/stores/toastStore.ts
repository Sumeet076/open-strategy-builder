import { create } from 'zustand'

export type ToastType = 'success' | 'error' | 'info' | 'default'

export interface Toast {
  id: string
  type: ToastType
  title?: string
  message?: string
  duration?: number
}

interface ToastState {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, 'id'>) => string
  dismiss: (id: string) => void
  dismissAll: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  addToast: (toast) => {
    const id = Math.random().toString(36).substring(2, 9)
    const newToast = { ...toast, id }

    set((state) => ({ toasts: [...state.toasts, newToast] }))

    // Auto dismiss
    if (toast.duration !== 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
      }, toast.duration || 4000)
    }

    return id
  },

  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),

  dismissAll: () => set({ toasts: [] }),
}))

// Helper functions
export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'success', title, message }),

  error: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'error', title, message }),

  info: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'info', title, message }),

  default: (title: string, message?: string) =>
    useToastStore.getState().addToast({ type: 'default', title, message }),
}