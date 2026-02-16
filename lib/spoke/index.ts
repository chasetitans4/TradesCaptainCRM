// =====================================================
// SPOKE - MODULE EXPORTS
//
// Voice-first CRM updates via natural contractor speech
// Core Principle: "Speak once, structured data appears"
// =====================================================

// Types
export * from './types';

// Configuration
export * from './config';

// Audio Quality
export * from './audio/quality';

// Parser
export * from './parser';

// Prompts
export { extractFromTranscript, generateClarification } from './prompts/extraction-prompt';

// Matching
export * from './matching';

// Crew (phone-based identity)
export * from './crew';

// Confirmation & Edit flow
export * from './confirmation';
