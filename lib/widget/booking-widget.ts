/**
 * Trades Captain Booking Widget
 *
 * Embeddable booking widget for contractor websites.
 * < 50kb, no external dependencies, sandboxed execution.
 *
 * This file is the source - it gets bundled into public/widget/booking.js
 */

// Widget version for cache busting
const WIDGET_VERSION = '1.0.0';

// API base URL - set during initialization
let API_BASE = '';

// Widget configuration interface
interface WidgetConfig {
  businessId: string;
  container?: string;
  primaryColor?: string;
  showBranding?: boolean;
  services?: string[]; // Filter to specific service IDs
  onBookingComplete?: (booking: BookingResult) => void;
  onError?: (error: string) => void;
}

// Business configuration from API
interface BusinessConfig {
  business: {
    id: string;
    name: string;
    timezone: string;
  };
  services: Array<{
    id: string;
    name: string;
    duration_minutes: number;
    price: number | null;
  }>;
  availability: Array<{
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>;
}

// Booking result
interface BookingResult {
  success: boolean;
  bookingId?: string;
  scheduledTime?: string;
  error?: string;
}

// Customer form data
interface CustomerData {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes?: string;
}

// Widget state
interface WidgetState {
  step: number;
  businessConfig: BusinessConfig | null;
  selectedService: string | null;
  selectedDate: string | null;
  selectedTime: string | null;
  customer: CustomerData | null;
  loading: boolean;
  error: string | null;
}

/**
 * Main widget class
 */
class TcBookingWidget {
  private config: WidgetConfig;
  private state: WidgetState;
  private shadowRoot: ShadowRoot | null = null;

  constructor() {
    this.config = {
      businessId: '',
      container: 'tc-booking-widget',
      primaryColor: '#2563eb',
      showBranding: true,
    };
    this.state = {
      step: 1,
      businessConfig: null,
      selectedService: null,
      selectedDate: null,
      selectedTime: null,
      customer: null,
      loading: false,
      error: null,
    };
  }

  /**
   * Initialize the widget
   */
  async init(config: Partial<WidgetConfig>): Promise<void> {
    // Merge config
    this.config = { ...this.config, ...config };

    if (!this.config.businessId) {
      console.error('[TcBooking] businessId is required');
      return;
    }

    // Determine API base from script src or current origin
    API_BASE = this.getApiBase();

    // Create container and shadow DOM
    const container = document.getElementById(this.config.container || 'tc-booking-widget');
    if (!container) {
      console.error(`[TcBooking] Container #${this.config.container} not found`);
      return;
    }

    // Create shadow DOM for style isolation
    this.shadowRoot = container.attachShadow({ mode: 'closed' });

    // Show loading state
    this.render();

    // Load business configuration
    await this.loadConfig();

    // Re-render with data
    this.render();
  }

  /**
   * Get API base URL
   */
  private getApiBase(): string {
    // Try to get from script src
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const src = scripts[i].src;
      if (src.includes('booking.js')) {
        const url = new URL(src);
        return `${url.protocol}//${url.host}`;
      }
    }
    // Fallback to current origin for development
    return window.location.origin;
  }

  /**
   * Load business configuration from API
   */
  private async loadConfig(): Promise<void> {
    this.state.loading = true;
    this.state.error = null;

    try {
      const response = await fetch(
        `${API_BASE}/api/widget/config/${this.config.businessId}`
      );

      if (!response.ok) {
        throw new Error('Failed to load business configuration');
      }

      this.state.businessConfig = await response.json();
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Failed to load';
      this.config.onError?.(this.state.error);
    } finally {
      this.state.loading = false;
    }
  }

  /**
   * Render the widget
   */
  private render(): void {
    if (!this.shadowRoot) return;

    this.shadowRoot.innerHTML = `
      <style>${this.getStyles()}</style>
      <div class="tc-widget">
        ${this.state.loading ? this.renderLoading() : ''}
        ${this.state.error ? this.renderError() : ''}
        ${!this.state.loading && !this.state.error ? this.renderContent() : ''}
      </div>
    `;

    this.bindEvents();
  }

  /**
   * Render loading state
   */
  private renderLoading(): string {
    return `
      <div class="tc-loading">
        <div class="tc-spinner"></div>
        <p>Loading...</p>
      </div>
    `;
  }

  /**
   * Render error state
   */
  private renderError(): string {
    return `
      <div class="tc-error">
        <p>${this.state.error}</p>
        <button class="tc-btn tc-btn-retry" data-action="retry">Try Again</button>
      </div>
    `;
  }

  /**
   * Render main content based on current step
   */
  private renderContent(): string {
    switch (this.state.step) {
      case 1:
        return this.renderServiceSelection();
      case 2:
        return this.renderDateTimeSelection();
      case 3:
        return this.renderCustomerForm();
      case 4:
        return this.renderConfirmation();
      default:
        return '';
    }
  }

  /**
   * Step 1: Service Selection
   */
  private renderServiceSelection(): string {
    const services = this.state.businessConfig?.services || [];
    const filteredServices = this.config.services
      ? services.filter((s) => this.config.services!.includes(s.id))
      : services;

    return `
      <div class="tc-step">
        <h3 class="tc-title">Select a Service</h3>
        <div class="tc-services">
          ${filteredServices
            .map(
              (service) => `
            <button class="tc-service-btn" data-service-id="${service.id}">
              <span class="tc-service-name">${this.escapeHtml(service.name)}</span>
              ${
                service.price
                  ? `<span class="tc-service-price">$${service.price}</span>`
                  : ''
              }
              <span class="tc-service-duration">${service.duration_minutes} min</span>
            </button>
          `
            )
            .join('')}
        </div>
      </div>
    `;
  }

  /**
   * Step 2: Date/Time Selection
   */
  private renderDateTimeSelection(): string {
    const today = new Date();
    const dates = this.getAvailableDates(today, 14); // Next 14 days

    return `
      <div class="tc-step">
        <button class="tc-back" data-action="back">&larr; Back</button>
        <h3 class="tc-title">Choose Date & Time</h3>

        <div class="tc-dates">
          ${dates
            .map(
              (date) => `
            <button class="tc-date-btn ${
              this.state.selectedDate === date.value ? 'tc-selected' : ''
            }"
                    data-date="${date.value}">
              <span class="tc-date-day">${date.dayName}</span>
              <span class="tc-date-num">${date.dayNum}</span>
            </button>
          `
            )
            .join('')}
        </div>

        ${
          this.state.selectedDate
            ? `
          <div class="tc-times">
            <h4>Available Times</h4>
            <div class="tc-time-grid">
              ${this.getAvailableTimes()
                .map(
                  (time) => `
                <button class="tc-time-btn ${
                  this.state.selectedTime === time ? 'tc-selected' : ''
                }"
                        data-time="${time}">
                  ${time}
                </button>
              `
                )
                .join('')}
            </div>
          </div>
        `
            : ''
        }

        ${
          this.state.selectedDate && this.state.selectedTime
            ? `
          <button class="tc-btn tc-btn-primary tc-continue" data-action="continue">
            Continue
          </button>
        `
            : ''
        }
      </div>
    `;
  }

  /**
   * Step 3: Customer Information Form
   */
  private renderCustomerForm(): string {
    return `
      <div class="tc-step">
        <button class="tc-back" data-action="back">&larr; Back</button>
        <h3 class="tc-title">Your Information</h3>

        <form class="tc-form" data-action="submit">
          <div class="tc-field">
            <label for="tc-name">Full Name *</label>
            <input type="text" id="tc-name" name="name" required placeholder="John Smith">
          </div>

          <div class="tc-field">
            <label for="tc-phone">Phone *</label>
            <input type="tel" id="tc-phone" name="phone" required placeholder="(555) 123-4567">
          </div>

          <div class="tc-field">
            <label for="tc-email">Email *</label>
            <input type="email" id="tc-email" name="email" required placeholder="john@example.com">
          </div>

          <div class="tc-field">
            <label for="tc-address">Service Address *</label>
            <input type="text" id="tc-address" name="address" required placeholder="123 Main St, City, ST 12345">
          </div>

          <div class="tc-field">
            <label for="tc-notes">Additional Notes</label>
            <textarea id="tc-notes" name="notes" rows="3" placeholder="Any special instructions..."></textarea>
          </div>

          <button type="submit" class="tc-btn tc-btn-primary">
            Book Appointment
          </button>
        </form>
      </div>
    `;
  }

  /**
   * Step 4: Confirmation
   */
  private renderConfirmation(): string {
    const service = this.state.businessConfig?.services.find(
      (s) => s.id === this.state.selectedService
    );
    const businessName = this.state.businessConfig?.business.name || '';

    return `
      <div class="tc-step tc-confirmation">
        <div class="tc-success-icon">✓</div>
        <h3 class="tc-title">Booking Confirmed!</h3>

        <div class="tc-booking-details">
          <p><strong>Service:</strong> ${this.escapeHtml(service?.name || '')}</p>
          <p><strong>Date:</strong> ${this.formatDate(this.state.selectedDate || '')}</p>
          <p><strong>Time:</strong> ${this.state.selectedTime}</p>
          <p><strong>Business:</strong> ${this.escapeHtml(businessName)}</p>
        </div>

        <p class="tc-confirm-text">
          You will receive a confirmation email shortly with all the details.
        </p>

        <button class="tc-btn tc-btn-secondary" data-action="new-booking">
          Book Another Appointment
        </button>
      </div>
      ${this.config.showBranding ? this.renderBranding() : ''}
    `;
  }

  /**
   * Render branding footer
   */
  private renderBranding(): string {
    return `
      <div class="tc-branding">
        Powered by <a href="https://tradescaptain.com" target="_blank" rel="noopener">Trades Captain</a>
      </div>
    `;
  }

  /**
   * Get available dates
   */
  private getAvailableDates(
    start: Date,
    count: number
  ): Array<{ value: string; dayName: string; dayNum: string }> {
    const dates: Array<{ value: string; dayName: string; dayNum: string }> = [];
    const availability = this.state.businessConfig?.availability || [];
    const availableDays = new Set(availability.map((a) => a.day_of_week));

    let current = new Date(start);
    while (dates.length < count) {
      const dayOfWeek = current.getDay();
      if (availableDays.size === 0 || availableDays.has(dayOfWeek)) {
        dates.push({
          value: current.toISOString().split('T')[0],
          dayName: current.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNum: current.getDate().toString(),
        });
      }
      current.setDate(current.getDate() + 1);
    }

    return dates;
  }

  /**
   * Get available times for selected date
   */
  private getAvailableTimes(): string[] {
    if (!this.state.selectedDate || !this.state.businessConfig) {
      return [];
    }

    const date = new Date(this.state.selectedDate);
    const dayOfWeek = date.getDay();
    const availability = this.state.businessConfig.availability.find(
      (a) => a.day_of_week === dayOfWeek
    );

    if (!availability) {
      // Default 9 AM - 5 PM
      return this.generateTimeSlots('09:00', '17:00');
    }

    return this.generateTimeSlots(availability.start_time, availability.end_time);
  }

  /**
   * Generate time slots between start and end
   */
  private generateTimeSlots(start: string, end: string): string[] {
    const slots: string[] = [];
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);

    let hour = startHour;
    let min = startMin;

    while (hour < endHour || (hour === endHour && min < endMin)) {
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const displayTime = this.formatTime(time);
      slots.push(displayTime);

      min += 30;
      if (min >= 60) {
        min = 0;
        hour += 1;
      }
    }

    return slots;
  }

  /**
   * Format time to 12-hour format
   */
  private formatTime(time24: string): string {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  /**
   * Format date for display
   */
  private formatDate(dateStr: string): string {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Bind event handlers
   */
  private bindEvents(): void {
    if (!this.shadowRoot) return;

    // Service selection
    this.shadowRoot.querySelectorAll('.tc-service-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const serviceId = (e.currentTarget as HTMLElement).dataset.serviceId;
        if (serviceId) {
          this.state.selectedService = serviceId;
          this.state.step = 2;
          this.render();
        }
      });
    });

    // Date selection
    this.shadowRoot.querySelectorAll('.tc-date-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const date = (e.currentTarget as HTMLElement).dataset.date;
        if (date) {
          this.state.selectedDate = date;
          this.state.selectedTime = null;
          this.render();
        }
      });
    });

    // Time selection
    this.shadowRoot.querySelectorAll('.tc-time-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        const time = (e.currentTarget as HTMLElement).dataset.time;
        if (time) {
          this.state.selectedTime = time;
          this.render();
        }
      });
    });

    // Continue button
    const continueBtn = this.shadowRoot.querySelector('[data-action="continue"]');
    continueBtn?.addEventListener('click', () => {
      this.state.step = 3;
      this.render();
    });

    // Back button
    const backBtn = this.shadowRoot.querySelector('[data-action="back"]');
    backBtn?.addEventListener('click', () => {
      this.state.step = Math.max(1, this.state.step - 1);
      this.render();
    });

    // Form submission
    const form = this.shadowRoot.querySelector('.tc-form');
    form?.addEventListener('submit', (e) => this.handleSubmit(e));

    // Retry button
    const retryBtn = this.shadowRoot.querySelector('[data-action="retry"]');
    retryBtn?.addEventListener('click', async () => {
      await this.loadConfig();
      this.render();
    });

    // New booking button
    const newBookingBtn = this.shadowRoot.querySelector('[data-action="new-booking"]');
    newBookingBtn?.addEventListener('click', () => {
      this.state = {
        step: 1,
        businessConfig: this.state.businessConfig,
        selectedService: null,
        selectedDate: null,
        selectedTime: null,
        customer: null,
        loading: false,
        error: null,
      };
      this.render();
    });
  }

  /**
   * Handle form submission
   */
  private async handleSubmit(e: Event): Promise<void> {
    e.preventDefault();

    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    this.state.customer = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string,
      email: formData.get('email') as string,
      address: formData.get('address') as string,
      notes: formData.get('notes') as string,
    };

    // Show loading
    this.state.loading = true;
    this.render();

    try {
      const response = await fetch(`${API_BASE}/api/widget/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: this.config.businessId,
          serviceId: this.state.selectedService,
          datetime: this.buildDateTime(),
          customer: this.state.customer,
          attribution: this.getAttribution(),
        }),
      });

      const result: BookingResult = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Booking failed');
      }

      // Success
      this.state.step = 4;
      this.config.onBookingComplete?.(result);
    } catch (error) {
      this.state.error = error instanceof Error ? error.message : 'Booking failed';
      this.config.onError?.(this.state.error);
    } finally {
      this.state.loading = false;
      this.render();
    }
  }

  /**
   * Build ISO datetime from selected date and time
   */
  private buildDateTime(): string {
    if (!this.state.selectedDate || !this.state.selectedTime) {
      return '';
    }

    // Parse the 12-hour time
    const timeMatch = this.state.selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return '';

    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const period = timeMatch[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    const time24 = `${hours.toString().padStart(2, '0')}:${minutes}:00`;
    return `${this.state.selectedDate}T${time24}`;
  }

  /**
   * Get attribution data from URL params
   */
  private getAttribution(): Record<string, string | null> {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
      referrer: document.referrer || null,
    };
  }

  /**
   * Get widget styles
   */
  private getStyles(): string {
    const primary = this.config.primaryColor || '#2563eb';

    return `
      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
      }

      .tc-widget {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
        max-width: 400px;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        padding: 24px;
      }

      .tc-title {
        color: ${primary};
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 16px;
      }

      .tc-loading {
        text-align: center;
        padding: 40px;
      }

      .tc-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e5e7eb;
        border-top-color: ${primary};
        border-radius: 50%;
        animation: tc-spin 0.8s linear infinite;
        margin: 0 auto 16px;
      }

      @keyframes tc-spin {
        to { transform: rotate(360deg); }
      }

      .tc-error {
        text-align: center;
        color: #dc2626;
        padding: 20px;
      }

      .tc-back {
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        font-size: 0.875rem;
        margin-bottom: 12px;
        padding: 0;
      }

      .tc-back:hover {
        color: ${primary};
      }

      .tc-services {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .tc-service-btn {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        padding: 16px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        text-align: left;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .tc-service-btn:hover {
        border-color: ${primary};
        box-shadow: 0 0 0 3px ${primary}22;
      }

      .tc-service-name {
        flex: 1;
        font-weight: 500;
      }

      .tc-service-price {
        font-weight: 600;
        color: ${primary};
      }

      .tc-service-duration {
        color: #6b7280;
        font-size: 0.875rem;
      }

      .tc-dates {
        display: flex;
        gap: 8px;
        overflow-x: auto;
        padding-bottom: 8px;
        margin-bottom: 16px;
      }

      .tc-date-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        min-width: 56px;
        padding: 8px 12px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .tc-date-btn:hover,
      .tc-date-btn.tc-selected {
        border-color: ${primary};
        background: ${primary}11;
      }

      .tc-date-btn.tc-selected {
        border-width: 2px;
      }

      .tc-date-day {
        font-size: 0.75rem;
        color: #6b7280;
      }

      .tc-date-num {
        font-size: 1.25rem;
        font-weight: 600;
      }

      .tc-times h4 {
        font-size: 0.875rem;
        color: #6b7280;
        margin-bottom: 12px;
      }

      .tc-time-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        margin-bottom: 16px;
      }

      .tc-time-btn {
        padding: 10px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s;
      }

      .tc-time-btn:hover,
      .tc-time-btn.tc-selected {
        border-color: ${primary};
        background: ${primary}11;
      }

      .tc-time-btn.tc-selected {
        border-width: 2px;
        font-weight: 500;
      }

      .tc-btn {
        width: 100%;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }

      .tc-btn-primary {
        background: ${primary};
        color: #fff;
      }

      .tc-btn-primary:hover {
        filter: brightness(1.1);
      }

      .tc-btn-secondary {
        background: #f3f4f6;
        color: #374151;
      }

      .tc-btn-secondary:hover {
        background: #e5e7eb;
      }

      .tc-btn-retry {
        background: #dc2626;
        color: #fff;
        margin-top: 12px;
      }

      .tc-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }

      .tc-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }

      .tc-field label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #374151;
      }

      .tc-field input,
      .tc-field textarea {
        padding: 10px 12px;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        font-size: 1rem;
        transition: border-color 0.2s, box-shadow 0.2s;
      }

      .tc-field input:focus,
      .tc-field textarea:focus {
        outline: none;
        border-color: ${primary};
        box-shadow: 0 0 0 3px ${primary}22;
      }

      .tc-confirmation {
        text-align: center;
      }

      .tc-success-icon {
        width: 64px;
        height: 64px;
        background: #10b981;
        color: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 2rem;
        margin: 0 auto 16px;
      }

      .tc-booking-details {
        background: #f9fafb;
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        text-align: left;
      }

      .tc-booking-details p {
        margin: 4px 0;
        font-size: 0.875rem;
      }

      .tc-confirm-text {
        color: #6b7280;
        font-size: 0.875rem;
        margin-bottom: 16px;
      }

      .tc-branding {
        text-align: center;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #e5e7eb;
        font-size: 0.75rem;
        color: #9ca3af;
      }

      .tc-branding a {
        color: #6b7280;
        text-decoration: none;
      }

      .tc-branding a:hover {
        color: ${primary};
      }
    `;
  }
}

// Export for bundling
export { TcBookingWidget };
export type { WidgetConfig, BookingResult };
