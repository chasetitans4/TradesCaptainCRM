// Mock messages for demo mode
// Realistic AI conversation thread for water heater issue

function getRelativeDate(daysFromNow: number, hour: number = 9, minute: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(hour, minute, 0, 0);
  return date;
}

export interface MockMessage {
  id: string;
  sender: 'customer' | 'ai' | 'business';
  content: string;
  timestamp: Date;
  read: boolean;
  is_demo: true;
}

export const mockMessages: MockMessage[] = [
  {
    id: 'demo-msg-1',
    sender: 'customer',
    content: "Hi, I'm having an issue with my water heater. The hot water isn't getting as hot as it used to and sometimes it's lukewarm at best. It's a Rheem tank water heater that's about 8 years old.",
    timestamp: getRelativeDate(-3, 8, 15),
    read: true,
    is_demo: true,
  },
  {
    id: 'demo-msg-2',
    sender: 'ai',
    content: "Hi! I'm sorry to hear you're having trouble with your water heater. Based on what you're describing - inconsistent or reduced hot water temperature on an 8-year-old Rheem tank heater - this could be caused by a few things:\n\n1. **Faulty thermostat** - may need recalibration or replacement\n2. **Sediment buildup** - common in older tanks, reduces efficiency\n3. **Failing heating element** - especially if it's an electric model\n\nWould you like to schedule a service call? Our technicians can diagnose the exact issue and provide repair options. I have availability as early as today or tomorrow.",
    timestamp: getRelativeDate(-3, 8, 16),
    read: true,
    is_demo: true,
  },
  {
    id: 'demo-msg-3',
    sender: 'customer',
    content: "Yes, I'd like to schedule someone to come take a look. It is electric. What times do you have available tomorrow afternoon?",
    timestamp: getRelativeDate(-3, 8, 22),
    read: true,
    is_demo: true,
  },
  {
    id: 'demo-msg-4',
    sender: 'ai',
    content: "Great! Here are the available time slots for tomorrow afternoon:\n\n- **1:00 PM - 3:00 PM**\n- **2:00 PM - 4:00 PM** ✓ Recommended\n- **3:00 PM - 5:00 PM**\n\nThe 2:00 PM slot works well as it gives the technician enough time to complete a thorough diagnosis and most common repairs in a single visit.\n\nWhich time works best for you?",
    timestamp: getRelativeDate(-3, 8, 23),
    read: true,
    is_demo: true,
  },
  {
    id: 'demo-msg-5',
    sender: 'customer',
    content: "The 2:00-4:00 slot works for me. I'll be working from home so I'll be here.",
    timestamp: getRelativeDate(-3, 8, 30),
    read: true,
    is_demo: true,
  },
  {
    id: 'demo-msg-6',
    sender: 'ai',
    content: "I've scheduled your water heater service appointment:\n\n📅 **Tomorrow, 2:00 PM - 4:00 PM**\n👤 **Technician:** James Rodriguez\n📍 **Address:** 1234 Oak Street, Springfield, IL 62701\n\nJames is one of our senior plumbing technicians with 12 years of experience. He'll call you 30 minutes before arrival.\n\n**Service call fee:** $30 (waived if repairs are performed)\n\nYou'll receive a reminder via text and email tomorrow morning. Is there anything else you need help with?",
    timestamp: getRelativeDate(-3, 8, 31),
    read: true,
    is_demo: true,
  },
  {
    id: 'demo-msg-7',
    sender: 'customer',
    content: "That's all for now, thank you!",
    timestamp: getRelativeDate(-3, 8, 35),
    read: true,
    is_demo: true,
  },
  {
    id: 'demo-msg-8',
    sender: 'ai',
    content: "🔔 **Appointment Reminder**\n\nHi! Just a friendly reminder that you have a water heater service appointment scheduled for today:\n\n⏰ **2:00 PM - 4:00 PM**\n👤 **Technician:** James Rodriguez\n📞 **(555) 234-5678**\n\nJames will call you about 30 minutes before arrival. Please ensure access to your water heater (basement area).\n\nReply to this message if you need to reschedule.",
    timestamp: getRelativeDate(-2, 8, 0),
    read: true,
    is_demo: true,
  },
  {
    id: 'demo-msg-9',
    sender: 'customer',
    content: "Thanks for the reminder! I'll be ready.",
    timestamp: getRelativeDate(-2, 8, 45),
    read: true,
    is_demo: true,
  },
];

/**
 * Get unread message count
 */
export function getUnreadMockMessageCount(): number {
  return mockMessages.filter((msg) => !msg.read && msg.sender !== 'customer').length;
}

/**
 * Get the last message in the conversation
 */
export function getLastMockMessage(): MockMessage | undefined {
  return mockMessages[mockMessages.length - 1];
}

/**
 * Get messages grouped by date
 */
export function getMockMessagesByDate(): Map<string, MockMessage[]> {
  const grouped = new Map<string, MockMessage[]>();

  mockMessages.forEach((msg) => {
    const dateKey = msg.timestamp.toLocaleDateString();
    const existing = grouped.get(dateKey) || [];
    grouped.set(dateKey, [...existing, msg]);
  });

  return grouped;
}
