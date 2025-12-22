'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Search,
  Send,
  Loader2,
  User,
  Phone,
  MessageSquare,
  X,
} from 'lucide-react';
import { createClient, getCurrentUserProfile } from '@/lib/supabase/client';
import { formatPhoneNumber } from '@/lib/utils';
import type { UserWithBusiness, Customer } from '@/types';

export default function NewMessagePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserWithBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [message, setMessage] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(true);

  useEffect(() => {
    async function loadUser() {
      const profile = await getCurrentUserProfile();
      if (!profile) {
        router.push('/login');
        return;
      }
      setUser(profile as UserWithBusiness);
      setLoading(false);
    }
    loadUser();
  }, [router]);

  // Search customers
  useEffect(() => {
    if (!user || !searchQuery.trim()) {
      setCustomers([]);
      return;
    }

    const searchCustomers = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('customers')
        .select('id, name, phone, email')
        .eq('business_id', user.business_id)
        .or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
        .limit(10);

      setCustomers(data || []);
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [user, searchQuery]);

  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPhoneNumber(customer.phone || '');
    setShowCustomerSearch(false);
    setSearchQuery('');
    setCustomers([]);
  };

  const handleClearSelection = () => {
    setSelectedCustomer(null);
    setPhoneNumber('');
    setShowCustomerSearch(true);
  };

  const handleSend = async () => {
    if (!phoneNumber.trim() || !message.trim()) return;

    setSending(true);
    try {
      const response = await fetch('/api/sms/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: phoneNumber,
          message: message.trim(),
          customerId: selectedCustomer?.id,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        // Navigate to the conversation
        if (data.conversationId) {
          router.push(`/messages/${data.conversationId}`);
        } else {
          router.push('/messages');
        }
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border sticky top-0 z-10">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold">New Message</h1>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Recipient Selection */}
        <div className="bg-card rounded-xl border border-border p-4">
          <label className="text-sm font-medium text-muted-foreground block mb-2">
            To:
          </label>

          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{selectedCustomer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPhoneNumber(selectedCustomer.phone || '')}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearSelection}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          ) : showCustomerSearch ? (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customers or enter phone number..."
                  className="w-full pl-10 pr-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Customer search results */}
              {customers.length > 0 && (
                <div className="mt-2 border border-border rounded-lg divide-y divide-border max-h-60 overflow-y-auto">
                  {customers.map((customer) => (
                    <button
                      key={customer.id}
                      onClick={() => handleSelectCustomer(customer)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-muted transition-colors text-left"
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatPhoneNumber(customer.phone || '')}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* New number option */}
              {searchQuery && customers.length === 0 && (
                <button
                  onClick={() => {
                    setPhoneNumber(searchQuery);
                    setShowCustomerSearch(false);
                  }}
                  className="mt-2 w-full flex items-center gap-3 p-3 border border-dashed border-primary/50 rounded-lg hover:bg-primary/5 transition-colors text-left"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Phone className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-primary">Send to new number</p>
                    <p className="text-sm text-muted-foreground">{searchQuery}</p>
                  </div>
                </button>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">New Contact</p>
                  <p className="text-sm text-muted-foreground">
                    {formatPhoneNumber(phoneNumber)}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClearSelection}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Message Input */}
        {(selectedCustomer || phoneNumber) && (
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-muted-foreground">
                Message
              </label>
              <span className="text-xs text-muted-foreground">
                {message.length} chars
                {message.length > 160 && (
                  <span className="text-amber-500 ml-1">
                    ({Math.ceil(message.length / 160)} SMS)
                  </span>
                )}
              </span>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full h-32 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />

            <button
              onClick={handleSend}
              disabled={sending || !message.trim()}
              className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {sending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {sending ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        )}

        {/* Tips */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-1">Messaging Tips</p>
              <ul className="space-y-1 text-xs">
                <li>Keep messages under 160 characters for single SMS</li>
                <li>Messages over 160 characters will be sent as multiple segments</li>
                <li>Replies will appear in your Messages inbox</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
