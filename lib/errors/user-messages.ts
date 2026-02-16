/**
 * Plain Language Error Messages
 *
 * Per Design Constitution Section 3.11.3 - Error Message Standards:
 *
 * Structure:
 * 1. What happened (plain language)
 * 2. Why it matters (if not obvious)
 * 3. What to do next (specific action)
 *
 * Rule: Never show error codes to users. Translate every error to
 * plain language with a recovery path.
 */

export interface UserFriendlyError {
  /** Short title for the error */
  title: string;
  /** Detailed message explaining what happened */
  message: string;
  /** Suggested action to recover */
  action?: string;
  /** Action button label */
  actionLabel?: string;
  /** Whether this error is recoverable */
  recoverable: boolean;
  /** Severity level */
  severity: 'info' | 'warning' | 'error';
}

/**
 * Common error codes and their user-friendly translations
 */
const ERROR_TRANSLATIONS: Record<string, UserFriendlyError> = {
  // Network Errors
  NETWORK_ERROR: {
    title: "Can't connect",
    message: "We couldn't reach our servers. Check your internet connection.",
    action: "Your changes are saved locally and will sync when you're back online.",
    actionLabel: 'Try Again',
    recoverable: true,
    severity: 'warning',
  },
  OFFLINE: {
    title: "You're offline",
    message: 'No internet connection detected.',
    action: "Don't worry - your work is saved locally and will sync automatically when you reconnect.",
    recoverable: true,
    severity: 'info',
  },
  TIMEOUT: {
    title: 'Request timed out',
    message: 'The server took too long to respond.',
    action: "This might be due to a slow connection. Your changes are saved locally.",
    actionLabel: 'Try Again',
    recoverable: true,
    severity: 'warning',
  },

  // Authentication Errors
  UNAUTHORIZED: {
    title: 'Session expired',
    message: 'You need to log in again.',
    action: 'Your work is saved. Please log in to continue.',
    actionLabel: 'Log In',
    recoverable: true,
    severity: 'warning',
  },
  FORBIDDEN: {
    title: "Access denied",
    message: "You don't have permission to do this.",
    action: 'Contact your administrator if you need access.',
    recoverable: false,
    severity: 'error',
  },

  // Validation Errors
  VALIDATION_ERROR: {
    title: 'Please check your input',
    message: 'Some information needs to be corrected.',
    recoverable: true,
    severity: 'warning',
  },
  INVALID_PHONE: {
    title: 'Invalid phone number',
    message: 'This phone number looks incomplete.',
    action: 'US numbers need 10 digits.',
    recoverable: true,
    severity: 'warning',
  },
  INVALID_EMAIL: {
    title: 'Invalid email',
    message: 'Please enter a valid email address.',
    recoverable: true,
    severity: 'warning',
  },

  // Database Errors
  NOT_FOUND: {
    title: 'Not found',
    message: "We couldn't find what you're looking for.",
    action: "It may have been deleted or moved.",
    actionLabel: 'Go Back',
    recoverable: true,
    severity: 'warning',
  },
  CONFLICT: {
    title: 'Update conflict',
    message: 'Someone else updated this at the same time.',
    action: 'Review the current version and try again.',
    actionLabel: 'Refresh',
    recoverable: true,
    severity: 'warning',
  },
  DUPLICATE: {
    title: 'Already exists',
    message: 'This item already exists.',
    action: 'Try a different name or find the existing one.',
    recoverable: true,
    severity: 'warning',
  },

  // Payment Errors
  PAYMENT_FAILED: {
    title: "Payment couldn't be processed",
    message: 'The payment was declined.',
    action: 'Please check your card details or try a different payment method.',
    actionLabel: 'Try Another Card',
    recoverable: true,
    severity: 'error',
  },
  CARD_EXPIRED: {
    title: 'Card expired',
    message: 'This card has expired.',
    action: 'Please use a different card or update your payment method.',
    actionLabel: 'Update Payment',
    recoverable: true,
    severity: 'warning',
  },

  // File/Upload Errors
  FILE_TOO_LARGE: {
    title: 'File too large',
    message: 'This file is too big to upload.',
    action: 'Try a smaller file or compress it first.',
    recoverable: true,
    severity: 'warning',
  },
  UNSUPPORTED_FILE: {
    title: 'Unsupported file type',
    message: "We can't accept this type of file.",
    action: 'Please use a supported format (JPEG, PNG, PDF).',
    recoverable: true,
    severity: 'warning',
  },
  UPLOAD_FAILED: {
    title: "Couldn't upload",
    message: 'The upload failed.',
    action: "It'll retry automatically when possible.",
    actionLabel: 'Try Again',
    recoverable: true,
    severity: 'warning',
  },

  // SMS/Communication Errors
  SMS_FAILED: {
    title: "Couldn't send message",
    message: 'The text message failed to send.',
    action: 'Check the phone number and try again.',
    actionLabel: 'Try Again',
    recoverable: true,
    severity: 'warning',
  },
  INVALID_RECIPIENT: {
    title: 'Invalid phone number',
    message: "We can't send messages to this number.",
    action: 'Please verify the phone number is correct.',
    recoverable: true,
    severity: 'warning',
  },

  // Invoice Errors
  INVOICE_ALREADY_PAID: {
    title: 'Already paid',
    message: 'This invoice has already been paid.',
    recoverable: false,
    severity: 'info',
  },
  INVOICE_SEND_FAILED: {
    title: "Couldn't send invoice",
    message: "The invoice couldn't be delivered.",
    action: "Check the customer's contact info and try again.",
    actionLabel: 'Try Again',
    recoverable: true,
    severity: 'warning',
  },

  // Job Errors
  JOB_IN_PROGRESS: {
    title: 'Job already started',
    message: 'This job is already in progress.',
    action: 'Complete the current work first.',
    recoverable: false,
    severity: 'info',
  },
  JOB_ALREADY_COMPLETE: {
    title: 'Job already completed',
    message: 'This job has already been marked complete.',
    recoverable: false,
    severity: 'info',
  },

  // Generic Errors
  UNKNOWN_ERROR: {
    title: 'Something went wrong',
    message: "We're not sure what happened.",
    action: 'Please try again. If the problem persists, contact support.',
    actionLabel: 'Try Again',
    recoverable: true,
    severity: 'error',
  },
  SERVER_ERROR: {
    title: 'Server error',
    message: "Something went wrong on our end.",
    action: "We're working on it. Please try again in a moment.",
    actionLabel: 'Try Again',
    recoverable: true,
    severity: 'error',
  },
};

/**
 * Translate an error to a user-friendly message
 *
 * @param error - Error to translate (string code, Error object, or HTTP status)
 * @param context - Optional context for more specific messages
 */
export function translateError(
  error: string | Error | number | unknown,
  context?: string
): UserFriendlyError {
  // Handle HTTP status codes
  if (typeof error === 'number') {
    return translateHttpStatus(error);
  }

  // Handle error codes as strings
  if (typeof error === 'string') {
    const upperCode = error.toUpperCase().replace(/[^A-Z_]/g, '_');
    if (ERROR_TRANSLATIONS[upperCode]) {
      return ERROR_TRANSLATIONS[upperCode];
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    // Check for common error messages
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('fetch')) {
      return ERROR_TRANSLATIONS.NETWORK_ERROR;
    }
    if (message.includes('timeout')) {
      return ERROR_TRANSLATIONS.TIMEOUT;
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return ERROR_TRANSLATIONS.UNAUTHORIZED;
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return ERROR_TRANSLATIONS.FORBIDDEN;
    }
    if (message.includes('not found') || message.includes('404')) {
      return ERROR_TRANSLATIONS.NOT_FOUND;
    }
  }

  // Default to unknown error
  return ERROR_TRANSLATIONS.UNKNOWN_ERROR;
}

/**
 * Translate HTTP status code to user-friendly message
 */
function translateHttpStatus(status: number): UserFriendlyError {
  switch (status) {
    case 400:
      return ERROR_TRANSLATIONS.VALIDATION_ERROR;
    case 401:
      return ERROR_TRANSLATIONS.UNAUTHORIZED;
    case 403:
      return ERROR_TRANSLATIONS.FORBIDDEN;
    case 404:
      return ERROR_TRANSLATIONS.NOT_FOUND;
    case 408:
      return ERROR_TRANSLATIONS.TIMEOUT;
    case 409:
      return ERROR_TRANSLATIONS.CONFLICT;
    case 413:
      return ERROR_TRANSLATIONS.FILE_TOO_LARGE;
    case 429:
      return {
        title: 'Too many requests',
        message: "You're making requests too quickly.",
        action: 'Please wait a moment and try again.',
        actionLabel: 'Try Again',
        recoverable: true,
        severity: 'warning',
      };
    case 500:
    case 502:
    case 503:
    case 504:
      return ERROR_TRANSLATIONS.SERVER_ERROR;
    default:
      return ERROR_TRANSLATIONS.UNKNOWN_ERROR;
  }
}

/**
 * Get a specific error translation by code
 */
export function getErrorByCode(code: string): UserFriendlyError {
  return ERROR_TRANSLATIONS[code.toUpperCase()] || ERROR_TRANSLATIONS.UNKNOWN_ERROR;
}

/**
 * Create a custom user-friendly error
 */
export function createUserError(
  title: string,
  message: string,
  options?: Partial<Omit<UserFriendlyError, 'title' | 'message'>>
): UserFriendlyError {
  return {
    title,
    message,
    recoverable: true,
    severity: 'error',
    ...options,
  };
}
