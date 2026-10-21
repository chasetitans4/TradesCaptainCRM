/**
 * capture_screenshots.js
 *
 * Automated screenshot capture using Playwright.
 * Captures 15 screens × 2 themes (light + dark) = 30 screenshots.
 *
 * Prerequisites:
 *   npm install -D @playwright/test
 *   npx playwright install chromium
 *   Dev server running: npm run dev
 *   Demo data seeded: node scripts/seed_demo_screenshots.js
 *
 * Usage: node scripts/capture_screenshots.js
 */

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// ─── Config ──────────────────────────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const SCREENSHOTS_DIR = path.join(__dirname, '..', 'public', 'screenshots-preview');
const LOGIN_EMAIL = process.env.DEMO_EMAIL;
const LOGIN_PASSWORD = process.env.DEMO_PASSWORD;

// Known IDs from seed script
const SARAH_CUSTOMER_ID = '22222222-2222-2222-2222-222222222201';
const INVOICE_ID = '44444444-4444-4444-4444-444444444401';
const CONVO_ID = '77777777-7777-7777-7777-777777777701';

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1440, height: 900 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function login(context) {
  const page = await context.newPage();
  console.log('  🔑 Navigating to login page...');
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });

  // Wait for the form inputs to be visible and interactive
  await page.waitForSelector('#email', { state: 'visible', timeout: 15000 });
  await page.waitForSelector('#password', { state: 'visible', timeout: 5000 });
  console.log('  🔑 Login form ready, filling credentials...');

  // Fill login form
  await page.waitForTimeout(500); // Wait a bit for hydration
  await page.fill('#email', LOGIN_EMAIL);
  await page.fill('#password', LOGIN_PASSWORD);
  
  // Verify values
  const emailVal = await page.inputValue('#email');
  if (!emailVal) {
      console.log('  ⚠️  Email field empty, retrying fill...');
      await page.fill('#email', LOGIN_EMAIL);
  }

  await page.click('button[type="submit"]');

  // Wait for navigation away from /login (could go to /dashboard, /onboarding, etc.)
  console.log('  🔑 Submitted, waiting for redirect...');
  try {
    await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30000 });
  } catch (e) {
    // Capture debug info if login fails
    const currentUrl = page.url();
    const pageContent = await page.textContent('body').catch(() => '(could not read body)');
    const hasError = pageContent.includes('error') || pageContent.includes('Error') || pageContent.includes('Invalid');
    console.error(`  ❌ Login failed. Still at: ${currentUrl}`);
    if (hasError) {
      // Look for error alert text
      const alertText = await page.textContent('[role="alert"]').catch(() => null);
      console.error(`  ❌ Error on page: ${alertText || '(check page manually)'}`);
    }
    throw new Error(`Login failed — stuck at ${currentUrl}. Is the seed data loaded? (npm run seed:demo)`);
  }

  const finalUrl = page.url();
  console.log(`  🔑 Logged in — redirected to: ${finalUrl}`);

  // If redirected to onboarding, the business doesn't have onboarding_completed=true
  if (finalUrl.includes('/onboarding')) {
    console.error('  ⚠️  Redirected to /onboarding — business.onboarding_completed may be false.');
    console.error('  ⚠️  Re-run: npm run seed:demo');
  }

  // Wait for page to settle
  await page.waitForTimeout(1500);
  await page.close();
}

async function setTheme(page, theme) {
  await page.evaluate((t) => {
    if (t === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', t);
  }, theme);
  // Wait for CSS transitions
  await page.waitForTimeout(400);
}

async function capture(page, name) {
  const filepath = path.join(SCREENSHOTS_DIR, `${name}.png`);
  await page.screenshot({ path: filepath, fullPage: false });
  console.log(`  ✅ ${name}.png`);
}

async function waitForContent(page, timeout = 10000) {
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch (e) {
    // Ignore networkidle timeout, just proceed
  }
  
  // Hide Next.js dev tools and error overlays
  await page.addStyleTag({
    content: `
      nextjs-portal,
      #next-route-announcer,
      [data-nextjs-dialog-overlay],
      [data-nextjs-dialog],
      [data-nextjs-toast],
      #__next-build-indicator,
      #__next-build-watcher,
      div[class*="nextjs-toast-errors-parent"],
      div[class*="ReactDevOverlay"] {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        z-index: -9999 !important;
      }
    `
  });
  
  // Aggressively remove elements from DOM to be sure
  await page.evaluate(() => {
    const removeNodes = () => {
        const selectors = [
            'nextjs-portal', 
            '#__next-build-indicator',
            '#__next-build-watcher',
            '[data-nextjs-toast]',
            '[data-nextjs-dialog]',
            '[data-nextjs-dialog-overlay]'
        ];
        selectors.forEach(s => {
            document.querySelectorAll(s).forEach(el => el.remove());
        });
    };
    removeNodes();
    // Keep trying for a bit in case they are mounted late
    // We can't use setInterval indefinitely because we need to return
    // But we can run it once more after a delay
    setTimeout(removeNodes, 500);
    setTimeout(removeNodes, 1000);
  });

  // Extra wait for client-side rendering
  await page.waitForTimeout(2000);

  // Wait for logo to load if present
  const logo = page.locator('header img[alt="Logo"], header img[alt="Trades Captain"]');
  if (await logo.count() > 0) {
      await logo.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
      // Wait a tiny bit more for the image to actually decode/paint
      await page.waitForTimeout(500);
  }
}

// ─── Mobile Screenshots ─────────────────────────────────────────────────────

async function captureMyDay(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/my-day`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for active job card to appear
  try {
    await page.waitForSelector('[class*="animate-slide-up"]', { timeout: 8000 });
  } catch {
    // Fallback — just wait for any card content
    await page.waitForTimeout(2000);
  }

  await capture(page, `01-my-day-active-job-${theme}`);
  await page.close();
}

async function captureMyDayExpanded(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/my-day`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Try to expand the active job details
  try {
    const detailsButton = page.locator('text=Show Details').first();
    if (await detailsButton.isVisible({ timeout: 3000 })) {
      await detailsButton.click();
      await page.waitForTimeout(500);
    }
  } catch {
    // Details button may not be present
  }

  // Scroll down slightly to show customer info
  await page.evaluate(() => window.scrollBy(0, 200));
  await page.waitForTimeout(300);

  await capture(page, `04-job-detail-expanded-${theme}`);
  await page.close();
}

async function captureInvoiceDetail(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/invoices/${INVOICE_ID}`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for invoice content to render
  try {
    await page.waitForSelector('text=Invoice', { timeout: 8000 });
  } catch {
    await page.waitForTimeout(2000);
  }

  await capture(page, `02-invoice-detail-${theme}`);
  await page.close();
}

async function captureMoreMenu(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/my-day`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Click the "More" tab in the bottom navigation
  try {
    const moreTab = page.locator('text=More').last();
    if (await moreTab.isVisible({ timeout: 5000 })) {
      await moreTab.click();
      await page.waitForTimeout(800); // Wait for bottom sheet animation
    }
  } catch {
    console.log('  ⚠️  Could not open More menu');
  }

  await capture(page, `03-more-menu-${theme}`);
  await page.close();
}

// ─── Desktop Screenshots ────────────────────────────────────────────────────

async function captureDashboard(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for stat cards to render
  try {
    await page.waitForSelector('text=Revenue', { timeout: 8000 });
  } catch {
    await page.waitForTimeout(2000);
  }

  // Determine suffix based on viewport
  const viewport = page.viewportSize();
  const deviceType = viewport.width < 1000 ? 'tablet' : 'desktop';
  // If desktop, filename is just "05-dashboard-{theme}" (backward compat)
  // But wait, the previous code just used `capture(page, '05-dashboard-' + theme)`.
  // The caller passes the name? No, the function generates it.
  // I need to update the function to accept a suffix or detect viewport.
  // Actually, I can just change the caller to pass the full name, or handle it here.
  
  // Let's modify the function signature to accept 'name' or 'suffix'
  // But to minimize changes, I'll detect viewport width.
  
  let name = `05-dashboard-${theme}`;
  if (viewport.width < 1000) {
      name = `05-dashboard-tablet-${theme}`;
  }
  
  await capture(page, name);
  await page.close();
}

async function captureLeadsKanban(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Try to switch to Kanban view
  try {
    // Look for the grid/kanban toggle button (LayoutGrid icon)
    const kanbanBtn = page.locator('button').filter({ has: page.locator('[class*="lucide-layout-grid"], [class*="LayoutGrid"]') }).first();
    if (await kanbanBtn.isVisible({ timeout: 3000 })) {
      await kanbanBtn.click();
      await page.waitForTimeout(1000);
    }
  } catch {
    // May already be in kanban view or toggle not found
    // Try text-based approach
    try {
      const btn = page.locator('button[title*="Board"], button[aria-label*="Board"], button[aria-label*="Kanban"]').first();
      if (await btn.isVisible({ timeout: 2000 })) {
        await btn.click();
        await page.waitForTimeout(1000);
      }
    } catch {
      console.log('  ⚠️  Could not switch to Kanban view — capturing current view');
    }
  }

  const viewport = page.viewportSize();
  let name = `06-leads-kanban-${theme}`;
  if (viewport.width < 1000) {
      name = `06-leads-kanban-tablet-${theme}`;
  }

  await capture(page, name);
  await page.close();
}

async function captureCustomerDetail(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/customers/${SARAH_CUSTOMER_ID}`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for customer name to appear
  try {
    await page.waitForSelector('text=Sarah Johnson', { timeout: 8000 });
  } catch {
    await page.waitForTimeout(2000);
  }

  const viewport = page.viewportSize();
  let name = `07-customer-detail-${theme}`;
  if (viewport.width < 1000) {
      name = `07-customer-detail-tablet-${theme}`;
  }

  await capture(page, name);
  await page.close();
}

async function captureCalendar(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/calendar`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for calendar events to render
  await page.waitForTimeout(2000);

  const viewport = page.viewportSize();
  let name = `08-calendar-${theme}`;
  if (viewport.width < 1000) {
      name = `08-calendar-tablet-${theme}`;
  }

  await capture(page, name);
  await page.close();
}

// ─── Additional Desktop Screenshots ─────────────────────────────────────────

async function captureJobsList(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/jobs`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for jobs table to render
  try {
    await page.waitForSelector('table, [role="table"], text=Status', { timeout: 8000 });
  } catch {
    await page.waitForTimeout(2000);
  }

  await capture(page, `09-jobs-list-${theme}`);
  await page.close();
}

async function captureInvoicesList(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/invoices`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for invoices to render
  try {
    await page.waitForSelector('table, [role="table"], text=Amount', { timeout: 8000 });
  } catch {
    await page.waitForTimeout(2000);
  }

  await capture(page, `10-invoices-list-${theme}`);
  await page.close();
}

async function captureMessages(context, theme) {
  const page = await context.newPage();
  // Conversation 1 = Sarah Johnson emergency thread with AI responses
  await page.goto(`${BASE_URL}/messages/${CONVO_ID}`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for messages to render
  try {
    await page.waitForSelector('text=AI Response', { timeout: 8000 });
  } catch {
    try {
      await page.waitForSelector('text=Sarah', { timeout: 5000 });
    } catch {
      await page.waitForTimeout(2000);
    }
  }

  // Scroll to bottom to show the most recent messages (Mike's reply + escalation)
  await page.evaluate(() => {
    const container = document.querySelector('[class*="overflow-y-auto"]') || document.querySelector('main');
    if (container) container.scrollTop = container.scrollHeight;
  });
  await page.waitForTimeout(500);

  await capture(page, `11-messages-${theme}`);
  await page.close();
}

async function captureQuotesList(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/quotes`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for quotes to render
  try {
    await page.waitForSelector('table, [role="table"], text=Amount', { timeout: 8000 });
  } catch {
    await page.waitForTimeout(2000);
  }

  await capture(page, `12-quotes-list-${theme}`);
  await page.close();
}

// ─── Voice & Dispatch Screenshots ────────────────────────────────────────────

async function captureVoiceDashboard(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/voice`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for voice stats cards or call list to render
  try {
    await page.waitForSelector('text=Total Calls', { timeout: 8000 });
  } catch {
    try {
      await page.waitForSelector('text=AI Handled', { timeout: 5000 });
    } catch {
      await page.waitForTimeout(2000);
    }
  }

  await capture(page, `13-voice-dashboard-${theme}`);
  await page.close();
}

async function captureDispatchBoard(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/dispatch`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for technician columns or job cards to render
  try {
    await page.waitForSelector('text=Mike Reynolds', { timeout: 8000 });
  } catch {
    try {
      await page.waitForSelector('text=Dispatch', { timeout: 5000 });
    } catch {
      await page.waitForTimeout(2000);
    }
  }

  await capture(page, `14-dispatch-board-${theme}`);
  await page.close();
}

async function captureRouteSummary(context, theme) {
  const page = await context.newPage();
  await page.goto(`${BASE_URL}/dispatch/routes`, { waitUntil: 'domcontentloaded' });
  await waitForContent(page);
  await setTheme(page, theme);

  // Wait for route summary stats to render
  try {
    await page.waitForSelector('text=Total Miles', { timeout: 8000 });
  } catch {
    try {
      await page.waitForSelector('text=Route', { timeout: 5000 });
    } catch {
      await page.waitForTimeout(2000);
    }
  }

  // Try to expand the first technician's route details
  try {
    const expandBtn = page.locator('[class*="chevron"], button:has-text("Mike")').first();
    if (await expandBtn.isVisible({ timeout: 2000 })) {
      await expandBtn.click();
      await page.waitForTimeout(600);
    }
  } catch {
    // Expansion not available
  }

  await capture(page, `15-route-summary-${theme}`);
  await page.close();
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  if (!LOGIN_EMAIL || !LOGIN_PASSWORD) throw new Error('Set DEMO_EMAIL and DEMO_PASSWORD for the isolated demo account.');
  console.log('╔══════════════════════════════════════╗');
  console.log('║  SCREENSHOT CAPTURE — PLAYWRIGHT     ║');
  console.log('╚══════════════════════════════════════╝');
  console.log('');

  // Ensure screenshots directory exists
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  for (const theme of ['light', 'dark']) {
    console.log(`\n── ${theme.toUpperCase()} MODE ──────────────────────────`);

    // ── Mobile Screenshots ──
    console.log('\n📱 Mobile (390×844, 3x):');
    const mobileContext = await browser.newContext({
      viewport: VIEWPORTS.mobile,
      deviceScaleFactor: 3,
    });
    await login(mobileContext);

    await captureMyDay(mobileContext, theme);
    await captureInvoiceDetail(mobileContext, theme);
    await captureMoreMenu(mobileContext, theme);
    await captureMyDayExpanded(mobileContext, theme);

    await mobileContext.close();

    // ── Desktop Screenshots ──
    console.log('\n🖥️  Desktop (1440×900, 2x):');
    const desktopContext = await browser.newContext({
      viewport: VIEWPORTS.desktop,
      deviceScaleFactor: 2,
    });
    await login(desktopContext);

    await captureDashboard(desktopContext, theme);
    await captureLeadsKanban(desktopContext, theme);
    await captureCustomerDetail(desktopContext, theme);
    await captureCalendar(desktopContext, theme);
    await captureJobsList(desktopContext, theme);
    await captureInvoicesList(desktopContext, theme);
    await captureMessages(desktopContext, theme);
    await captureQuotesList(desktopContext, theme);
    await captureVoiceDashboard(desktopContext, theme);
    await captureDispatchBoard(desktopContext, theme);
    await captureRouteSummary(desktopContext, theme);

    await desktopContext.close();
  }

  await browser.close();

  console.log('\n═══════════════════════════════════════');
  console.log(`Done! ${fs.readdirSync(SCREENSHOTS_DIR).filter(f => f.endsWith('.png')).length} screenshots saved to ./public/screenshots-preview/`);
  console.log('═══════════════════════════════════════');
}

main().catch((err) => {
  console.error('Screenshot capture failed:', err);
  process.exit(1);
});
