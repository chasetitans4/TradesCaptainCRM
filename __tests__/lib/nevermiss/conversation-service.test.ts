import { describe, it, expect, jest } from '@jest/globals';

function makeSupabase(resolvers: {
  single?: (table: string, state: any) => Promise<{ data: any; error?: any } | { data: any; error?: any }>;
  insertSingle?: (table: string, state: any) => Promise<{ data: any; error?: any }>;
  upsert?: (table: string, payload: any, options?: any) => { error?: any };
  updateAwait?: (table: string, state: any) => { error?: any };
  insertResult?: (table: string, state: any) => { error?: any };
}) {
  return {
    from(table: string) {
      const state: any = { table, payload: null, updates: null };
      const chain: any = {
        select() { return chain; },
        eq() { return chain; },
        in() { return chain; },
        order() { return chain; },
        limit() { return chain; },
        insert(payload: any) { state.payload = payload; return chain; },
        update(payload: any) { state.updates = payload; return chain; },
        upsert(payload: any, options?: any) { return resolvers.upsert ? resolvers.upsert(table, payload, options) : { error: null }; },
        async single() {
          if (state.payload && resolvers.insertSingle) {
            return resolvers.insertSingle(table, state);
          }
          if (resolvers.single) {
            const res = await resolvers.single(table, state);
            return res;
          }
          return { data: null, error: { message: 'not found' } };
        },
        then(resolve: (v: any) => any, reject?: (e: any) => any) {
          if (state.payload && resolvers.insertResult) {
            const res = resolvers.insertResult(table, state);
            return resolve(res);
          }
          const res = resolvers.updateAwait ? resolvers.updateAwait(table, state) : { error: null };
          return resolve(res);
        },
      };
      return chain;
    },
  };
}

describe('NeverMiss conversation-service', () => {
  it('getBusinessSettings merges business and plan features', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          single: async (table) => {
            if (table === 'nevermiss_settings') {
              return { data: {
                business_name: 'BizCo',
                owner_name: 'Owner',
                services_offered: ['Plumbing'],
                service_area: 'Area',
                phone_number: '111',
                forward_to: '222',
                ai_tone: 'friendly',
                greeting_message: 'Hello',
                custom_prompt: 'x',
                business_hours_start: '09:00',
                business_hours_end: '17:00',
                business_days: [1,2,3,4,5],
                quiet_hours_start: '21:00',
                quiet_hours_end: '06:00',
                timezone: 'UTC',
                emergency_always_notify: true,
                notify_sms: true,
                notify_email: true,
                notify_push: true,
              } };
            }
            if (table === 'businesses') {
              return { data: { name: 'Biz LLC', owner_name: 'Bob', plan_type: 'gold' } };
            }
            if (table === 'plan_nevermiss_features') {
              return { data: { can_book_calendar: true, includes_crm: true } };
            }
            return { data: null, error: { message: 'none' } };
          },
        }),
      }));
      const { getBusinessSettings } = require('@/lib/nevermiss/conversation-service');
      const settings = await getBusinessSettings('b1');
      expect(settings?.businessName).toBe('BizCo');
      expect(settings?.ownerName).toBe('Bob');
      expect(settings?.calendarBookingEnabled).toBe(true);
      expect(settings?.crmIntegrationEnabled).toBe(true);
    });
  });

  it('updateConversation throws on database error', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          single: async (table) => {
            if (table === 'nevermiss_conversations') {
              return { data: { metadata: {} } };
            }
            return { data: null };
          },
          updateAwait: () => ({ error: { message: 'update failed' } }),
        }),
      }));
      const { updateConversation } = require('@/lib/nevermiss/conversation-service');
      await expect(updateConversation('conv', { state: 'active' })).rejects.toThrow();
    });
  });

  it('saveMessage throws when insert fails', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          insertSingle: async () => ({ data: null, error: { message: 'insert failed' } }),
        }),
      }));
      const { saveMessage } = require('@/lib/nevermiss/conversation-service');
      const conv = { businessId: 'b1', id: 'c1', aiModel: 'model' };
      await expect(saveMessage(conv as any, { role: 'assistant', content: 'Hi' })).rejects.toThrow();
    });
  });

  it('add/remove suppression list throw on db errors', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          upsert: () => ({ error: { message: 'upsert failed' } }),
          updateAwait: () => ({ error: { message: 'update failed' } }),
        }),
      }));
      const { addToSuppressionList, removeFromSuppressionList } = require('@/lib/nevermiss/conversation-service');
      await expect(addToSuppressionList('b1', '111', 'spam')).rejects.toThrow();
      await expect(removeFromSuppressionList('b1', '111')).rejects.toThrow();
    });
  });

  it('createJobFromLead returns null on insert error', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          insertSingle: async () => ({ data: null, error: { message: 'insert failed' } }),
        }),
      }));
      const { createJobFromLead } = require('@/lib/nevermiss/conversation-service');
      const res = await createJobFromLead({
        leadId: 'l3',
        businessId: 'b1',
        capturedAt: new Date(),
        source: 'missed_call',
        customer: { phone: '+1', name: 'Bob', optedOut: false, existingCustomerId: 'c1' },
        serviceRequest: { serviceNeeded: 'Drain', address: { raw: '123', street: null, city: null, state: null, zip: null }, urgency: 'high', urgencyReason: 'leak', preferredTime: 'tomorrow', additionalNotes: undefined },
        conversation: { id: 'conv', messageCount: 2, durationSeconds: 60, smsCount: 1, startedAt: new Date(), endedAt: new Date(), messages: [] },
        status: 'new',
        ownerNotificationMethod: [],
      }, { autoCreateJobs: true } as any);
      expect(res).toBeNull();
    });
  });

  it('markEventProcessed logs error and does not throw on update error', async () => {
    await jest.isolateModulesAsync(async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          updateAwait: () => ({ error: { message: 'update failed' } }),
        }),
      }));
      const { markEventProcessed } = require('@/lib/nevermiss/conversation-service');
      await markEventProcessed('sid', 'delivered');
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });
  it('getBusinessSettings returns null when settings not found', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          single: async () => ({ data: null, error: { message: 'not found' } }),
        }),
      }));
      const { getBusinessSettings } = require('@/lib/nevermiss/conversation-service');
      const s = await getBusinessSettings('b1');
      expect(s).toBeNull();
    });
  });

  it('findOrCreateConversation loads existing with messages and creates new when none', async () => {
    await jest.isolateModulesAsync(async () => {
      const now = new Date().toISOString();
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          single: async (table) => {
            if (table === 'nevermiss_conversations') {
              return { data: {
                id: 'conv1',
                business_id: 'b1',
                customer_id: 'c1',
                customer_phone: '111',
                business_phone: '222',
                state: 'active',
                metadata: { service_needed: 'Leak', address: '123 Main St, Austin, TX 78701', urgency: 'high' },
                created_at: now,
                message_count: 3,
              } };
            }
            return { data: null, error: { message: 'none' } };
          },
          updateAwait: (table) => {
            if (table === 'nevermiss_messages') {
              return { data: [
                { id: 'm1', direction: 'inbound', content: 'Hello', created_at: now, twilio_sid: 's2', status: 'delivered' },
                { id: 'm2', direction: 'outbound', content: 'Hi', created_at: now, twilio_sid: 's1', status: 'sent' },
              ] };
            }
            return { error: null };
          },
        }),
      }));
      const { findOrCreateConversation } = require('@/lib/nevermiss/conversation-service');
      const settings = { timezone: 'UTC', businessDays: [1,2,3,4,5], businessHoursStart: '09:00', businessHoursEnd: '17:00' };
      const resExisting = await findOrCreateConversation('b1', '111', '222', settings);
      expect(resExisting.isNew).toBe(false);
      expect(resExisting.conversation.messages.length).toBe(2);
      expect(resExisting.conversation.aiMessagesSinceResponse).toBe(1);
      expect(resExisting.conversation.extracted.serviceNeeded).toBe('Leak');
    });

    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          single: async () => ({ data: null, error: { message: 'none' } }),
          insertSingle: async (table, state) => {
            if (table === 'nevermiss_conversations') {
              return { data: { id: 'new1', ...state.payload, created_at: new Date().toISOString() } };
            }
            return { data: null };
          },
        }),
      }));
      const { findOrCreateConversation } = require('@/lib/nevermiss/conversation-service');
      const settings = { timezone: 'UTC', businessDays: [1,2,3,4,5], businessHoursStart: '09:00', businessHoursEnd: '17:00' };
      const resNew = await findOrCreateConversation('b1', '111', '222', settings);
      expect(resNew.isNew).toBe(true);
      expect(resNew.conversation.state).toBe('active');
    });
  });

  it('isPhoneSuppressed returns true/false based on list', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          single: async (table) => {
            if (table === 'sms_suppression_list') {
              return { data: { id: 'x' } };
            }
            return { data: null };
          },
        }),
      }));
      const { isPhoneSuppressed } = require('@/lib/nevermiss/conversation-service');
      expect(await isPhoneSuppressed('b1', '+15551234567')).toBe(true);
    });

    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          single: async (table) => {
            return { data: null, error: { message: 'none' } };
          },
        }),
      }));
      const { isPhoneSuppressed } = require('@/lib/nevermiss/conversation-service');
      expect(await isPhoneSuppressed('b1', '+15551234567')).toBe(false);
    });
  });

  it('logWebhookEvent returns isNew false on duplicate and true on success', async () => {
    await jest.isolateModulesAsync(async () => {
      let duplicate = true;
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          insertResult: () => (duplicate ? { error: { code: '23505' } } : { error: null }),
          single: async () => ({ data: null }),
        }),
      }));
      const { logWebhookEvent } = require('@/lib/nevermiss/conversation-service');
      const dup = await logWebhookEvent('b1', 'sid', 'delivered');
      expect(dup.isNew).toBe(false);
      duplicate = false;
      const ok = await logWebhookEvent('b1', 'sid2', 'delivered');
      expect(ok.isNew).toBe(true);
    });
  });

  it('logWebhookEvent throws and logs on non-duplicate insert error', async () => {
    await jest.isolateModulesAsync(async () => {
      const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          insertResult: () => ({ error: { code: '42P01', message: 'insert failed' } }),
          single: async () => ({ data: null }),
        }),
      }));
      const { logWebhookEvent } = require('@/lib/nevermiss/conversation-service');
      await expect(logWebhookEvent('b1', 'sid3', 'delivered')).rejects.toEqual(expect.objectContaining({ code: '42P01' }));
      expect(errSpy).toHaveBeenCalled();
      errSpy.mockRestore();
    });
  });

  it('markEventProcessed handles optional status and awaits update', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          updateAwait: () => ({ error: null }),
        }),
      }));
      const { markEventProcessed } = require('@/lib/nevermiss/conversation-service');
      await markEventProcessed('sid', 'delivered');
      await markEventProcessed('sid', 'failed', 'failed', 'note');
    });
  });

  it('updateConversation merges metadata and updates fields', async () => {
    await jest.isolateModulesAsync(async () => {
      let lastUpdate: any = null;
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          single: async (table) => {
            if (table === 'nevermiss_conversations') {
              return { data: { metadata: { existing: 'yes' } } };
            }
            return { data: null };
          },
          updateAwait: (_table, state) => {
            lastUpdate = state.updates;
            return { error: null };
          },
        }),
      }));
      const { updateConversation } = require('@/lib/nevermiss/conversation-service');
      await updateConversation('conv', {
        state: 'awaiting_owner',
        messageCount: 5,
        lastCustomerMessageAt: new Date('2020-01-01T00:00:00Z'),
        extracted: { serviceNeeded: 'Leak', address: '123 Main', urgency: 'high', urgencyReason: 'asap', preferredTime: null, customerName: 'Alice', additionalNotes: null },
        isEmergency: true,
        ownerNotified: true,
        ownerNotifiedAt: new Date('2020-01-02T00:00:00Z'),
      });
      expect(lastUpdate.state).toBe('awaiting_owner');
      expect(lastUpdate.message_count).toBe(5);
      expect(lastUpdate.metadata.service_needed).toBe('Leak');
      expect(lastUpdate.metadata.is_emergency).toBe(true);
      expect(lastUpdate.metadata.owner_notified).toBe(true);
    });
  });

  it('findCustomerByPhone returns name or null', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          single: async (table) => {
            if (table === 'customers') {
              return { data: { id: 'c1', first_name: 'Alice', last_name: 'Jones' } };
            }
            return { data: null };
          },
        }),
      }));
      const { findCustomerByPhone } = require('@/lib/nevermiss/conversation-service');
      const res = await findCustomerByPhone('b1', '+15550001111');
      expect(res?.name).toBe('Alice Jones');
    });

    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          single: async () => ({ data: null, error: { message: 'none' } }),
        }),
      }));
      const { findCustomerByPhone } = require('@/lib/nevermiss/conversation-service');
      const res = await findCustomerByPhone('b1', '+15550001111');
      expect(res).toBeNull();
    });
  });

  it('createJobFromLead returns id when autoCreateJobs enabled', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          insertSingle: async (table) => {
            if (table === 'jobs') {
              return { data: { id: 'j1' } };
            }
            return { data: null };
          },
        }),
      }));
      const { createJobFromLead } = require('@/lib/nevermiss/conversation-service');
      const res = await createJobFromLead({
        leadId: 'l1',
        businessId: 'b1',
        capturedAt: new Date(),
        source: 'missed_call',
        customer: { phone: '+1', name: 'Bob', optedOut: false, existingCustomerId: 'c1' },
        serviceRequest: { serviceNeeded: 'Drain', address: { raw: '123 Main St, Austin, TX 78701', street: null, city: null, state: null, zip: null }, urgency: 'high', urgencyReason: 'leak', preferredTime: 'tomorrow', additionalNotes: undefined },
        conversation: { id: 'conv', messageCount: 2, durationSeconds: 60, smsCount: 1, startedAt: new Date(), endedAt: new Date(), messages: [] },
        status: 'new',
        ownerNotificationMethod: [],
      }, { autoCreateJobs: true } as any);
      expect(res).toBe('j1');
    });

    await jest.isolateModulesAsync(async () => {
      const { createJobFromLead } = require('@/lib/nevermiss/conversation-service');
      const res = await createJobFromLead({
        leadId: 'l2',
        businessId: 'b1',
        capturedAt: new Date(),
        source: 'missed_call',
        customer: { phone: '+1', name: 'Bob', optedOut: false, existingCustomerId: 'c1' },
        serviceRequest: { serviceNeeded: 'Drain', address: { raw: '123 Main St', street: null, city: null, state: null, zip: null }, urgency: 'medium', urgencyReason: undefined, preferredTime: undefined, additionalNotes: undefined },
        conversation: { id: 'conv', messageCount: 0, durationSeconds: 0, smsCount: 0, startedAt: new Date(), endedAt: new Date(), messages: [] },
        status: 'new',
        ownerNotificationMethod: [],
      }, { autoCreateJobs: false } as any);
      expect(res).toBeNull();
    });
  });

  it('saveMessage inserts and returns message', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          insertSingle: async (table, state) => {
            if (table === 'nevermiss_messages') {
              return { data: { id: 'm1', created_at: new Date().toISOString(), twilio_sid: state.payload.twilio_sid, status: state.payload.status } };
            }
            return { data: null };
          },
        }),
      }));
      const { saveMessage } = require('@/lib/nevermiss/conversation-service');
      const conv = { businessId: 'b1', id: 'c1', aiModel: 'model' };
      const msg = await saveMessage(conv as any, { role: 'assistant', content: 'Hi' }, 'sid', '222', '111');
      expect(msg.role).toBe('assistant');
      expect(msg.twilioSid).toBe('sid');
    });
  });

  it('addToSuppressionList and removeFromSuppressionList handle upsert/update', async () => {
    await jest.isolateModulesAsync(async () => {
      jest.doMock('@/lib/supabase/server', () => ({
        createClient: async () => makeSupabase({
          upsert: () => ({ error: null }),
          updateAwait: () => ({ error: null }),
        }),
      }));
      const { addToSuppressionList, removeFromSuppressionList } = require('@/lib/nevermiss/conversation-service');
      await addToSuppressionList('b1', '111', 'opt_out');
      await removeFromSuppressionList('b1', '111');
    });
  });

  it('createCapturedLead parses address parts', async () => {
    await jest.isolateModulesAsync(async () => {
      const { createCapturedLead } = require('@/lib/nevermiss/conversation-service');
      const conv = {
        id: 'c1',
        businessId: 'b1',
        customerPhone: '111',
        businessPhone: '222',
        state: 'active',
        previousStates: [],
        extracted: { serviceNeeded: 'Leak', address: '123 Main St, Austin, TX 78701', urgency: 'high', urgencyReason: null, preferredTime: null, customerName: 'Alice', additionalNotes: null },
        messages: [],
        messageCount: 2,
        aiMessagesSinceResponse: 0,
        startedAt: new Date(),
        isAfterHours: false,
        isEmergency: false,
        ownerNotified: false,
        aiModel: 'x',
      };
      const lead = await createCapturedLead(conv as any, {} as any);
      expect(lead.serviceRequest.address.city).toBe('Austin');
      expect(lead.serviceRequest.address.state).toBe('TX');
      expect(lead.serviceRequest.address.zip).toBe('78701');
    });
  });
});
