/**
 * Customer Components
 *
 * Per CIL Spec:
 * - Section 3.1: Quiet Customer flag for re-engagement
 * - Section 4.1: Maintenance Agreement Tracker
 */

export {
  QuietCustomerFlag,
  QuietCustomerBadge,
  useQuietCustomerStatus
} from './quiet-customer-flag';

export {
  MaintenanceAgreementTracker,
  MaintenanceAgreementBadge,
  useCustomerAgreement
} from './maintenance-agreement-tracker';
