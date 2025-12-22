'use client';

import * as React from 'react';

export type ToastActionElement = React.ReactElement<{
  altText: string;
  onClick: () => void;
}>;

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: ToastActionElement;
  variant?: 'default' | 'destructive' | 'success';
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
  toast: (props: Omit<Toast, 'id'>) => void;
}

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

let toastCount = 0;

function genId() {
  toastCount = (toastCount + 1) % Number.MAX_VALUE;
  return toastCount.toString();
}

// Global state for toast outside of React context
const listeners = new Set<(toast: Toast) => void>();
const toastQueue: Toast[] = [];

function dispatchToast(toast: Omit<Toast, 'id'>) {
  const id = genId();
  const newToast = { ...toast, id };
  toastQueue.push(newToast);
  listeners.forEach((listener) => listener(newToast));
  return id;
}

export function toast(props: Omit<Toast, 'id'>) {
  return dispatchToast(props);
}

export function useToast() {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    const listener = (toast: Toast) => {
      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss after duration
      const duration = toast.duration || 5000;
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== toast.id));
      }, duration);
    };

    listeners.add(listener);

    // Process any queued toasts
    toastQueue.forEach(listener);
    toastQueue.length = 0;

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addToast = React.useCallback((toast: Omit<Toast, 'id'>) => {
    dispatchToast(toast);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    toast: addToast,
  };
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toastContext = useToast();

  return (
    <ToastContext.Provider value={toastContext}>
      {children}
    </ToastContext.Provider>
  );
}
