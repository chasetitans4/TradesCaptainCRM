import { describe, it, expect, jest } from '@jest/globals';

describe('LeadsCaptain owner notifications formatting', () => {
  it('generates SMS body for emergency vs normal', async () => {
    await jest.isolateModulesAsync(async () => {
      const { generateSmsNotificationBody } = require('@/lib/leads-captain/notifications');
      const leadBase = {
        leadId: 'L1',
        businessId: 'B1',
        capturedAt: new Date(),
        source: 'inbound_sms',
        customer: {
          phone: '+15551234567',
          name: 'Alice',
          optedOut: false,
        },
        serviceRequest: {
          serviceNeeded: 'Water heater leaking',
          address: { raw: '123 Main St, Springfield, IL', street: '123 Main St', city: 'Springfield', state: 'IL', zip: '62701' },
          urgency: 'high',
          urgencyReason: 'today if possible',
          preferredTime: 'Tomorrow morning',
          additionalNotes: null,
        },
        conversation: {
          id: 'C1',
          messageCount: 2,
          durationSeconds: 120,
          smsCount: 2,
          startedAt: new Date(),
          endedAt: new Date(),
          messages: [
            { id: 'm1', role: 'customer', content: 'My water heater is leaking', timestamp: new Date(), twilioSid: undefined, status: 'sent' },
            { id: 'm2', role: 'assistant', content: 'Sorry to hear that! Let\'s get more details.', timestamp: new Date(), twilioSid: undefined, status: 'sent' },
          ],
        },
        status: 'new',
        ownerNotificationMethod: ['sms'],
      };

      const normalBody = generateSmsNotificationBody(leadBase, false);
      expect(normalBody).toContain('Leads Captain Lead');
      expect(normalBody).toContain('(555) 123-4567');
      expect(normalBody).toContain('Tomorrow morning');

      const emergencyLead = { ...leadBase, serviceRequest: { ...leadBase.serviceRequest, urgency: 'emergency', urgencyReason: 'burst pipe' } };
      const emergencyBody = generateSmsNotificationBody(emergencyLead, true);
      expect(emergencyBody).toContain('EMERGENCY');
      expect(emergencyBody).toContain('CALL THEM NOW');
    });
  });

  it('generates Email and Push notifications', async () => {
    await jest.isolateModulesAsync(async () => {
      process.env.NEXT_PUBLIC_APP_URL = 'http://app.example.com';
      const { generateEmailNotification, generatePushNotification } = require('@/lib/leads-captain/notifications');
      const lead = {
        leadId: 'L2',
        businessId: 'B1',
        capturedAt: new Date(),
        source: 'inbound_sms',
        customer: {
          phone: '+15557654321',
          name: null,
          optedOut: false,
        },
        serviceRequest: {
          serviceNeeded: 'AC not cooling',
          address: { raw: '44 Elm St, Metropolis, NY', street: '44 Elm St', city: 'Metropolis', state: 'NY', zip: '10001' },
          urgency: 'low',
          urgencyReason: null,
          preferredTime: null,
          additionalNotes: null,
        },
        conversation: {
          id: 'C2',
          messageCount: 1,
          durationSeconds: 60,
          smsCount: 1,
          startedAt: new Date(),
          endedAt: new Date(),
          messages: [{ id: 'm1', role: 'customer', content: 'AC is not cooling well', timestamp: new Date(), twilioSid: undefined, status: 'sent' }],
        },
        status: 'new',
        ownerNotificationMethod: ['sms', 'email', 'push'],
      };

      const settings = {
        businessId: 'B1',
        businessName: 'BizCo',
        ownerName: 'Bob',
        servicesOffered: ['HVAC'],
        serviceArea: 'Metro',
        phoneNumber: '+15550001111',
        forwardTo: '+15550002222',
        tone: 'friendly',
        greetingStyle: 'direct',
        greetingMessage: 'Hello',
        useOwnerName: true,
        maxMessages: 10,
        businessHoursStart: '09:00',
        businessHoursEnd: '17:00',
        businessDays: [1, 2, 3, 4, 5],
        quietHoursStart: '22:00',
        quietHoursEnd: '07:00',
        timezone: 'UTC',
        afterHoursEnabled: true,
        afterHoursMessage: 'We will contact you',
        emergencyKeywords: ['burst pipe'],
        emergencyAlwaysNotify: true,
        afterHoursNotify: true,
        notifySms: true,
        notifyEmail: true,
        notifyPush: true,
        calendarBookingEnabled: true,
        crmIntegrationEnabled: true,
        autoCreateJobs: false,
      };

      const email = generateEmailNotification(lead, settings);
      expect(email.subject).toContain('New Lead');
      expect(email.body).toContain('CONVERSATION TRANSCRIPT');
      expect(email.html).toContain('View Details');
      expect(email.html).toContain(lead.conversation.id);

      const pushNormal = generatePushNotification(lead, false);
      expect(pushNormal.title).toContain('Leads Captain');
      expect(pushNormal.data.type).toBe('leads_captain_lead');

      const pushEmerg = generatePushNotification({ ...lead, serviceRequest: { ...lead.serviceRequest, urgency: 'emergency' } }, true);
      expect(pushEmerg.title).toContain('EMERGENCY');
      expect(pushEmerg.data.type).toBe('leads_captain_emergency');
    });
  });
});
