/**
 * Trades Captain Booking Widget v1.0.0
 * Embeddable booking widget for contractor websites.
 *
 * Usage:
 *   <div id="tc-booking-widget"></div>
 *   <script src="https://app.tradescaptain.com/widget/booking.js"></script>
 *   <script>
 *     TcBooking.init({ businessId: 'YOUR_BUSINESS_ID' });
 *   </script>
 */
(function() {
  'use strict';

  var WIDGET_VERSION = '1.0.0';
  var API_BASE = '';

  // Default configuration
  var defaultConfig = {
    businessId: '',
    container: 'tc-booking-widget',
    primaryColor: '#2563eb',
    showBranding: true,
    services: null
  };

  // Widget state
  var state = {
    step: 1,
    businessConfig: null,
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    customer: null,
    loading: false,
    error: null
  };

  var config = {};
  var shadowRoot = null;

  /**
   * Get API base URL from script src
   */
  function getApiBase() {
    var scripts = document.getElementsByTagName('script');
    for (var i = 0; i < scripts.length; i++) {
      var src = scripts[i].src;
      if (src && src.indexOf('booking.js') !== -1) {
        try {
          var url = new URL(src);
          return url.protocol + '//' + url.host;
        } catch (e) {
          break;
        }
      }
    }
    return window.location.origin;
  }

  /**
   * Initialize the widget
   */
  function init(userConfig) {
    config = Object.assign({}, defaultConfig, userConfig);

    if (!config.businessId) {
      console.error('[TcBooking] businessId is required');
      return;
    }

    API_BASE = getApiBase();

    var container = document.getElementById(config.container);
    if (!container) {
      console.error('[TcBooking] Container #' + config.container + ' not found');
      return;
    }

    // Create shadow DOM for style isolation
    shadowRoot = container.attachShadow({ mode: 'closed' });

    // Reset state
    state = {
      step: 1,
      businessConfig: null,
      selectedService: null,
      selectedDate: null,
      selectedTime: null,
      customer: null,
      loading: true,
      error: null
    };

    render();
    loadConfig();
  }

  /**
   * Load business configuration
   */
  function loadConfig() {
    state.loading = true;
    state.error = null;
    render();

    fetch(API_BASE + '/api/widget/config/' + config.businessId)
      .then(function(response) {
        if (!response.ok) throw new Error('Failed to load');
        return response.json();
      })
      .then(function(data) {
        state.businessConfig = data;
        state.loading = false;
        render();
      })
      .catch(function(error) {
        state.error = error.message || 'Failed to load';
        state.loading = false;
        render();
        if (config.onError) config.onError(state.error);
      });
  }

  /**
   * Render the widget
   */
  function render() {
    if (!shadowRoot) return;

    var html = '<style>' + getStyles() + '</style>';
    html += '<div class="tc-widget">';

    if (state.loading) {
      html += renderLoading();
    } else if (state.error) {
      html += renderError();
    } else {
      html += renderContent();
    }

    html += '</div>';
    shadowRoot.innerHTML = html;
    bindEvents();
  }

  function renderLoading() {
    return '<div class="tc-loading"><div class="tc-spinner"></div><p>Loading...</p></div>';
  }

  function renderError() {
    return '<div class="tc-error"><p>' + escapeHtml(state.error) + '</p>' +
           '<button class="tc-btn tc-btn-retry" data-action="retry">Try Again</button></div>';
  }

  function renderContent() {
    switch (state.step) {
      case 1: return renderServiceSelection();
      case 2: return renderDateTimeSelection();
      case 3: return renderCustomerForm();
      case 4: return renderConfirmation();
      default: return '';
    }
  }

  function renderServiceSelection() {
    var services = (state.businessConfig && state.businessConfig.services) || [];
    if (config.services) {
      services = services.filter(function(s) {
        return config.services.indexOf(s.id) !== -1;
      });
    }

    var html = '<div class="tc-step"><h3 class="tc-title">Select a Service</h3><div class="tc-services">';

    services.forEach(function(service) {
      html += '<button class="tc-service-btn" data-service-id="' + service.id + '">';
      html += '<span class="tc-service-name">' + escapeHtml(service.name) + '</span>';
      if (service.price) {
        html += '<span class="tc-service-price">$' + service.price + '</span>';
      }
      html += '<span class="tc-service-duration">' + service.duration_minutes + ' min</span>';
      html += '</button>';
    });

    html += '</div></div>';
    return html;
  }

  function renderDateTimeSelection() {
    var dates = getAvailableDates(new Date(), 14);
    var html = '<div class="tc-step">';
    html += '<button class="tc-back" data-action="back">&larr; Back</button>';
    html += '<h3 class="tc-title">Choose Date & Time</h3>';

    html += '<div class="tc-dates">';
    dates.forEach(function(date) {
      var selected = state.selectedDate === date.value ? ' tc-selected' : '';
      html += '<button class="tc-date-btn' + selected + '" data-date="' + date.value + '">';
      html += '<span class="tc-date-day">' + date.dayName + '</span>';
      html += '<span class="tc-date-num">' + date.dayNum + '</span>';
      html += '</button>';
    });
    html += '</div>';

    if (state.selectedDate) {
      var times = getAvailableTimes();
      html += '<div class="tc-times"><h4>Available Times</h4><div class="tc-time-grid">';
      times.forEach(function(time) {
        var selected = state.selectedTime === time ? ' tc-selected' : '';
        html += '<button class="tc-time-btn' + selected + '" data-time="' + time + '">' + time + '</button>';
      });
      html += '</div></div>';
    }

    if (state.selectedDate && state.selectedTime) {
      html += '<button class="tc-btn tc-btn-primary tc-continue" data-action="continue">Continue</button>';
    }

    html += '</div>';
    return html;
  }

  function renderCustomerForm() {
    var html = '<div class="tc-step">';
    html += '<button class="tc-back" data-action="back">&larr; Back</button>';
    html += '<h3 class="tc-title">Your Information</h3>';

    html += '<form class="tc-form" data-action="submit">';
    html += '<div class="tc-field"><label for="tc-name">Full Name *</label>';
    html += '<input type="text" id="tc-name" name="name" required placeholder="John Smith"></div>';

    html += '<div class="tc-field"><label for="tc-phone">Phone *</label>';
    html += '<input type="tel" id="tc-phone" name="phone" required placeholder="(555) 123-4567"></div>';

    html += '<div class="tc-field"><label for="tc-email">Email *</label>';
    html += '<input type="email" id="tc-email" name="email" required placeholder="john@example.com"></div>';

    html += '<div class="tc-field"><label for="tc-address">Service Address *</label>';
    html += '<input type="text" id="tc-address" name="address" required placeholder="123 Main St, City, ST 12345"></div>';

    html += '<div class="tc-field"><label for="tc-notes">Additional Notes</label>';
    html += '<textarea id="tc-notes" name="notes" rows="3" placeholder="Any special instructions..."></textarea></div>';

    html += '<button type="submit" class="tc-btn tc-btn-primary">Book Appointment</button>';
    html += '</form></div>';
    return html;
  }

  function renderConfirmation() {
    var service = null;
    var businessName = '';

    if (state.businessConfig) {
      businessName = state.businessConfig.business.name;
      state.businessConfig.services.forEach(function(s) {
        if (s.id === state.selectedService) service = s;
      });
    }

    var html = '<div class="tc-step tc-confirmation">';
    html += '<div class="tc-success-icon">✓</div>';
    html += '<h3 class="tc-title">Booking Confirmed!</h3>';

    html += '<div class="tc-booking-details">';
    html += '<p><strong>Service:</strong> ' + escapeHtml(service ? service.name : '') + '</p>';
    html += '<p><strong>Date:</strong> ' + formatDate(state.selectedDate) + '</p>';
    html += '<p><strong>Time:</strong> ' + state.selectedTime + '</p>';
    html += '<p><strong>Business:</strong> ' + escapeHtml(businessName) + '</p>';
    html += '</div>';

    html += '<p class="tc-confirm-text">You will receive a confirmation email shortly.</p>';
    html += '<button class="tc-btn tc-btn-secondary" data-action="new-booking">Book Another Appointment</button>';
    html += '</div>';

    if (config.showBranding) {
      html += '<div class="tc-branding">Powered by <a href="https://tradescaptain.com" target="_blank" rel="noopener">Trades Captain</a></div>';
    }

    return html;
  }

  function getAvailableDates(start, count) {
    var dates = [];
    var availability = (state.businessConfig && state.businessConfig.availability) || [];
    var availableDays = {};
    availability.forEach(function(a) { availableDays[a.day_of_week] = true; });
    var hasAvailability = Object.keys(availableDays).length > 0;

    var current = new Date(start);
    while (dates.length < count) {
      var dayOfWeek = current.getDay();
      if (!hasAvailability || availableDays[dayOfWeek]) {
        dates.push({
          value: current.toISOString().split('T')[0],
          dayName: current.toLocaleDateString('en-US', { weekday: 'short' }),
          dayNum: current.getDate().toString()
        });
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  function getAvailableTimes() {
    if (!state.selectedDate || !state.businessConfig) return [];

    var date = new Date(state.selectedDate);
    var dayOfWeek = date.getDay();
    var availability = null;

    state.businessConfig.availability.forEach(function(a) {
      if (a.day_of_week === dayOfWeek) availability = a;
    });

    if (!availability) {
      return generateTimeSlots('09:00', '17:00');
    }
    return generateTimeSlots(availability.start_time, availability.end_time);
  }

  function generateTimeSlots(start, end) {
    var slots = [];
    var startParts = start.split(':').map(Number);
    var endParts = end.split(':').map(Number);
    var hour = startParts[0];
    var min = startParts[1];
    var endHour = endParts[0];
    var endMin = endParts[1];

    while (hour < endHour || (hour === endHour && min < endMin)) {
      var time24 = padZero(hour) + ':' + padZero(min);
      slots.push(formatTime(time24));
      min += 30;
      if (min >= 60) { min = 0; hour++; }
    }
    return slots;
  }

  function formatTime(time24) {
    var parts = time24.split(':').map(Number);
    var hours = parts[0];
    var minutes = parts[1];
    var period = hours >= 12 ? 'PM' : 'AM';
    var hours12 = hours % 12 || 12;
    return hours12 + ':' + padZero(minutes) + ' ' + period;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
  }

  function padZero(n) { return n < 10 ? '0' + n : n.toString(); }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  function bindEvents() {
    if (!shadowRoot) return;

    // Service selection
    shadowRoot.querySelectorAll('.tc-service-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        state.selectedService = e.currentTarget.dataset.serviceId;
        state.step = 2;
        render();
      });
    });

    // Date selection
    shadowRoot.querySelectorAll('.tc-date-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        state.selectedDate = e.currentTarget.dataset.date;
        state.selectedTime = null;
        render();
      });
    });

    // Time selection
    shadowRoot.querySelectorAll('.tc-time-btn').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        state.selectedTime = e.currentTarget.dataset.time;
        render();
      });
    });

    // Continue button
    var continueBtn = shadowRoot.querySelector('[data-action="continue"]');
    if (continueBtn) {
      continueBtn.addEventListener('click', function() {
        state.step = 3;
        render();
      });
    }

    // Back button
    var backBtn = shadowRoot.querySelector('[data-action="back"]');
    if (backBtn) {
      backBtn.addEventListener('click', function() {
        state.step = Math.max(1, state.step - 1);
        render();
      });
    }

    // Form submission
    var form = shadowRoot.querySelector('.tc-form');
    if (form) {
      form.addEventListener('submit', handleSubmit);
    }

    // Retry button
    var retryBtn = shadowRoot.querySelector('[data-action="retry"]');
    if (retryBtn) {
      retryBtn.addEventListener('click', loadConfig);
    }

    // New booking button
    var newBookingBtn = shadowRoot.querySelector('[data-action="new-booking"]');
    if (newBookingBtn) {
      newBookingBtn.addEventListener('click', function() {
        state.step = 1;
        state.selectedService = null;
        state.selectedDate = null;
        state.selectedTime = null;
        state.customer = null;
        render();
      });
    }
  }

  function handleSubmit(e) {
    e.preventDefault();

    var form = e.target;
    var formData = new FormData(form);

    state.customer = {
      name: formData.get('name'),
      phone: formData.get('phone'),
      email: formData.get('email'),
      address: formData.get('address'),
      notes: formData.get('notes')
    };

    state.loading = true;
    render();

    var datetime = buildDateTime();

    fetch(API_BASE + '/api/widget/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessId: config.businessId,
        serviceId: state.selectedService,
        datetime: datetime,
        customer: state.customer,
        attribution: getAttribution()
      })
    })
    .then(function(response) { return response.json(); })
    .then(function(result) {
      state.loading = false;
      if (result.success) {
        state.step = 4;
        if (config.onBookingComplete) config.onBookingComplete(result);
      } else {
        state.error = result.error || 'Booking failed';
        if (config.onError) config.onError(state.error);
      }
      render();
    })
    .catch(function(error) {
      state.loading = false;
      state.error = error.message || 'Booking failed';
      if (config.onError) config.onError(state.error);
      render();
    });
  }

  function buildDateTime() {
    if (!state.selectedDate || !state.selectedTime) return '';

    var timeMatch = state.selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (!timeMatch) return '';

    var hours = parseInt(timeMatch[1], 10);
    var minutes = timeMatch[2];
    var period = timeMatch[3].toUpperCase();

    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;

    var time24 = padZero(hours) + ':' + minutes + ':00';
    return state.selectedDate + 'T' + time24;
  }

  function getAttribution() {
    var params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source'),
      utm_medium: params.get('utm_medium'),
      utm_campaign: params.get('utm_campaign'),
      utm_content: params.get('utm_content'),
      utm_term: params.get('utm_term'),
      referrer: document.referrer || null
    };
  }

  function getStyles() {
    var primary = config.primaryColor || '#2563eb';
    return '*{box-sizing:border-box;margin:0;padding:0}' +
      '.tc-widget{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;max-width:400px;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.1);padding:24px}' +
      '.tc-title{color:' + primary + ';font-size:1.25rem;font-weight:600;margin-bottom:16px}' +
      '.tc-loading{text-align:center;padding:40px}' +
      '.tc-spinner{width:32px;height:32px;border:3px solid #e5e7eb;border-top-color:' + primary + ';border-radius:50%;animation:tc-spin .8s linear infinite;margin:0 auto 16px}' +
      '@keyframes tc-spin{to{transform:rotate(360deg)}}' +
      '.tc-error{text-align:center;color:#dc2626;padding:20px}' +
      '.tc-back{background:none;border:none;color:#6b7280;cursor:pointer;font-size:.875rem;margin-bottom:12px;padding:0}' +
      '.tc-back:hover{color:' + primary + '}' +
      '.tc-services{display:flex;flex-direction:column;gap:8px}' +
      '.tc-service-btn{display:flex;align-items:center;gap:12px;width:100%;padding:16px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;text-align:left;transition:border-color .2s,box-shadow .2s}' +
      '.tc-service-btn:hover{border-color:' + primary + ';box-shadow:0 0 0 3px ' + primary + '22}' +
      '.tc-service-name{flex:1;font-weight:500}' +
      '.tc-service-price{font-weight:600;color:' + primary + '}' +
      '.tc-service-duration{color:#6b7280;font-size:.875rem}' +
      '.tc-dates{display:flex;gap:8px;overflow-x:auto;padding-bottom:8px;margin-bottom:16px}' +
      '.tc-date-btn{display:flex;flex-direction:column;align-items:center;min-width:56px;padding:8px 12px;background:#fff;border:1px solid #e5e7eb;border-radius:8px;cursor:pointer;transition:all .2s}' +
      '.tc-date-btn:hover,.tc-date-btn.tc-selected{border-color:' + primary + ';background:' + primary + '11}' +
      '.tc-date-btn.tc-selected{border-width:2px}' +
      '.tc-date-day{font-size:.75rem;color:#6b7280}' +
      '.tc-date-num{font-size:1.25rem;font-weight:600}' +
      '.tc-times h4{font-size:.875rem;color:#6b7280;margin-bottom:12px}' +
      '.tc-time-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:16px}' +
      '.tc-time-btn{padding:10px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;font-size:.875rem;transition:all .2s}' +
      '.tc-time-btn:hover,.tc-time-btn.tc-selected{border-color:' + primary + ';background:' + primary + '11}' +
      '.tc-time-btn.tc-selected{border-width:2px;font-weight:500}' +
      '.tc-btn{width:100%;padding:12px 20px;border:none;border-radius:8px;font-size:1rem;font-weight:500;cursor:pointer;transition:all .2s}' +
      '.tc-btn-primary{background:' + primary + ';color:#fff}' +
      '.tc-btn-primary:hover{filter:brightness(1.1)}' +
      '.tc-btn-secondary{background:#f3f4f6;color:#374151}' +
      '.tc-btn-secondary:hover{background:#e5e7eb}' +
      '.tc-btn-retry{background:#dc2626;color:#fff;margin-top:12px}' +
      '.tc-form{display:flex;flex-direction:column;gap:16px}' +
      '.tc-field{display:flex;flex-direction:column;gap:4px}' +
      '.tc-field label{font-size:.875rem;font-weight:500;color:#374151}' +
      '.tc-field input,.tc-field textarea{padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px;font-size:1rem;transition:border-color .2s,box-shadow .2s}' +
      '.tc-field input:focus,.tc-field textarea:focus{outline:none;border-color:' + primary + ';box-shadow:0 0 0 3px ' + primary + '22}' +
      '.tc-confirmation{text-align:center}' +
      '.tc-success-icon{width:64px;height:64px;background:#10b981;color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:2rem;margin:0 auto 16px}' +
      '.tc-booking-details{background:#f9fafb;border-radius:8px;padding:16px;margin:16px 0;text-align:left}' +
      '.tc-booking-details p{margin:4px 0;font-size:.875rem}' +
      '.tc-confirm-text{color:#6b7280;font-size:.875rem;margin-bottom:16px}' +
      '.tc-branding{text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:.75rem;color:#9ca3af}' +
      '.tc-branding a{color:#6b7280;text-decoration:none}' +
      '.tc-branding a:hover{color:' + primary + '}';
  }

  // Expose to window
  window.TcBooking = {
    init: init,
    version: WIDGET_VERSION
  };

})();
