// =====================================================
// NYLAS INTEGRATION - EXPORTS
// =====================================================

// Client
export { nylas, nylasConfig, CALENDAR_PROVIDERS, type NylasProvider } from './client';

// Authentication
export { getAuthUrl, exchangeCodeForGrant, revokeGrant } from './auth';

// Calendar Operations
export {
  getCalendarConnection,
  listCalendars,
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from './calendar';

// Job Sync
export {
  syncJobToCalendar,
  onJobCreated,
  onJobUpdated,
  onJobDeleted,
} from './sync';
