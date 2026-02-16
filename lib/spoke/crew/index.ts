// =====================================================
// SPOKE - CREW MODULE EXPORTS
//
// Phone-based identity system for contractors
// =====================================================

// Phone registry
export {
  registerContractorPhone,
  updateContractorPhone,
  deactivateContractorPhone,
  getContractorPhones,
  getContractorPhoneById,
  findContractorByPhone,
  verifyContractorPhone,
  flagPhoneForReview,
  recordPhoneUsage,
  findInactivePhones,
  normalizePhoneNumber,
  type RegisterPhoneInput,
  type PhoneRegistryResult,
} from './phone-registry';

// Identity resolution
export {
  resolveCallerIdentity,
  resolveFromPhoneId,
  handleFirstTimeCaller,
  processNameSetup,
  processOwnerCrewResponse,
  isPhoneBlocked,
  blockPhoneNumber,
  type IdentityResolution,
  type FirstTimeCallerResult,
} from './identity-resolver';
