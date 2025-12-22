// =====================================================
// SECURITY & AUTHENTICATION - MAIN EXPORTS
// Unified authentication and security module
// =====================================================

// Two-Factor Authentication
export {
  generateTOTPSecret,
  verifyTOTPSetup,
  verifyTOTP,
  disableTOTP,
  hasTOTPEnabled,
} from './totp';

export {
  sendSMS2FACode,
  verifySMS2FACode,
  setupSMS2FA,
  verifySMS2FASetup,
  disableSMS2FA,
  getSMSPhoneMasked,
  hasSMS2FAEnabled,
} from './sms-2fa';

export {
  sendEmail2FACode,
  verifyEmail2FACode,
  setupEmail2FA,
  verifyEmail2FASetup,
  disableEmail2FA,
  hasEmail2FAEnabled,
} from './email-2fa';

export {
  generateBackupCodes,
  verifyBackupCode,
  ensureBackupCodes,
  getRemainingBackupCodesCount,
  shouldWarnLowBackupCodes,
  regenerateBackupCodes,
  formatBackupCodesForDisplay,
} from './backup-codes';

export {
  getTwoFactorStatus,
  requiresTwoFactor,
  send2FACode,
  verify2FA,
  getAvailable2FAMethods,
  setPreferred2FAMethod,
  disableAll2FA,
  updateTwoFactorStatus,
  type TwoFactorMethod,
  type TwoFactorStatus,
  type TwoFactorVerifyResult,
} from './two-factor';

// PIN
export {
  setupPIN,
  verifyPIN,
  changePIN,
  disablePIN,
  getPINSettings,
  updatePINSettings,
  isPINRequiredFor,
  hasPINSetup,
  forceUnlockPIN,
  type PINSettings,
  type PINVerifyResult,
} from './pin';

// Sessions
export {
  createSession,
  validateSession,
  markSession2FAVerified,
  getUserSessions,
  revokeSession,
  revokeAllOtherSessions,
  revokeAllSessions,
  logout,
  getActiveSessionCount,
  extendSession,
  type Session,
  type CreateSessionOptions,
} from './sessions';

// Audit
export {
  logSecurityEvent,
  getUserSecurityEvents,
  getHighRiskEvents,
  getSecuritySummary,
  checkSuspiciousActivity,
  formatSecurityEventDescription,
  type SecurityEventType,
  type RiskLevel,
  type SecurityEvent,
} from './audit';

// Password
export {
  validatePassword,
  changePassword,
  isPasswordExpired,
  requirePasswordChange,
  recordFailedLogin,
  resetFailedLoginAttempts,
  isAccountLocked,
  unlockAccount,
  getStrengthColor,
  type PasswordPolicy,
  type PasswordValidationResult,
} from './password';
