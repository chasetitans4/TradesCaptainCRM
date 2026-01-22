// ==============================================
// JEST SETUP FILE
// Global test configuration and mocks
// ==============================================

require('openai/shims/node');

require('@testing-library/jest-dom');

global.Request = class {};
global.Response = class {
  constructor(body, init) {
    this.body = body;
    this.status = init && init.status ? init.status : 200;
    this.headers = new global.Headers(init && init.headers ? init.headers : {});
  }
  static json(data, init) {
    const headers = Object.assign({ 'content-type': 'application/json' }, (init && init.headers) || {});
    return new global.Response(JSON.stringify(data), { status: init && init.status ? init.status : 200, headers });
  }
};
global.Headers = class {
  constructor(init) {
    this._map = new Map();
    if (init && typeof init === 'object') {
      if (init instanceof global.Headers) {
        for (const [k, v] of init.entries()) this.set(k, v);
      } else if (Array.isArray(init)) {
        for (const [k, v] of init) this.set(k, v);
      } else {
        for (const k of Object.keys(init)) this.set(k, init[k]);
      }
    }
  }
  get(name) {
    const v = this._map.get(String(name).toLowerCase());
    if (Array.isArray(v)) return v[0];
    return v;
  }
  set(name, value) {
    this._map.set(String(name).toLowerCase(), String(value));
  }
  append(name, value) {
    const key = String(name).toLowerCase();
    const cur = this._map.get(key);
    if (cur === undefined) {
      this._map.set(key, String(value));
    } else if (Array.isArray(cur)) {
      cur.push(String(value));
      this._map.set(key, cur);
    } else {
      this._map.set(key, [cur, String(value)]);
    }
  }
  getSetCookie() {
    const v = this._map.get('set-cookie');
    if (!v) return [];
    return Array.isArray(v) ? v : [v];
  }
  entries() {
    return this._map.entries();
  }
};

// Provide default secrets for tests
process.env.JWT_SECRET = process.env.JWT_SECRET || '0123456789abcdef0123456789abcdef';
process.env.ADMIN_IMPERSONATION_SECRET = process.env.ADMIN_IMPERSONATION_SECRET || process.env.JWT_SECRET;

jest.mock('jose', () => ({
  jwtVerify: jest.fn(async () => {
    throw new Error('jwtVerify mock');
  }),
}));

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
  }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

jest.mock('next/headers', () => ({
  cookies: jest.fn(async () => ({
    getAll: jest.fn(() => []),
    set: jest.fn(),
    setAll: jest.fn(),
  })),
  headers: jest.fn(() => ({})),
}));

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock Next.js Link component
jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children }) => children,
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
});

// Mock Supabase client
jest.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      signIn: jest.fn(),
      signOut: jest.fn(),
    },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
    }),
  }),
}));

jest.mock('ioredis', () => {
  const instance = {
    ping: jest.fn().mockResolvedValue('PONG'),
    quit: jest.fn().mockResolvedValue(undefined),
    info: jest.fn().mockResolvedValue('used_memory:0\r\nused_memory_peak:0\r\nmaxmemory:0'),
    on: jest.fn(),
  };
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => instance),
  };
});

// Suppress console errors in tests (optional)
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render is no longer supported') ||
       args[0].includes('Redis connection error'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});

// Global test utilities
global.testUtils = {
  // Wait for async operations
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),

  // Create mock user
  createMockUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    role: 'owner',
    ...overrides,
  }),

  // Create mock business
  createMockBusiness: (overrides = {}) => ({
    id: 'test-business-id',
    name: 'Test Business',
    plan_tier: 'pro',
    ...overrides,
  }),
};
