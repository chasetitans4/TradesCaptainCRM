import { toast } from 'sonner';

/**
 * Toast utility wrapper for consistent notifications across the app
 */

// Success messages
export const showSuccess = (message: string) => {
  toast.success(message);
};

// Error messages
export const showError = (message: string) => {
  toast.error(message);
};

// Warning messages
export const showWarning = (message: string) => {
  toast.warning(message);
};

// Info messages
export const showInfo = (message: string) => {
  toast.info(message);
};

// Loading toast that returns a promise
export const showLoading = (message: string) => {
  return toast.loading(message);
};

// Dismiss a specific toast
export const dismissToast = (id: string | number) => {
  toast.dismiss(id);
};

// Promise-based toast for async operations
export const showPromise = <T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) => {
  return toast.promise(promise, messages);
};

// Common action toasts
export const toasts = {
  saved: () => showSuccess('Changes saved successfully'),
  deleted: () => showSuccess('Deleted successfully'),
  copied: () => showSuccess('Copied to clipboard'),
  created: () => showSuccess('Created successfully'),
  updated: () => showSuccess('Updated successfully'),

  saveError: () => showError('Failed to save changes'),
  deleteError: () => showError('Failed to delete'),
  loadError: () => showError('Failed to load data'),
  networkError: () => showError('Network error. Please try again.'),
  unauthorized: () => showError('You are not authorized to perform this action'),

  // Form-specific
  invalidForm: () => showError('Please fix the form errors'),
  passwordMismatch: () => showError('Passwords do not match'),
  passwordChanged: () => showSuccess('Password changed successfully'),
  profileUpdated: () => showSuccess('Profile updated successfully'),

  // Clipboard
  copyFailed: () => showError('Failed to copy to clipboard'),
};

export { toast };
