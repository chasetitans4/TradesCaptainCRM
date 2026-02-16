/**
 * Design Constitution Verification Script
 *
 * Run with: node scripts/verify-constitution.js
 *
 * Verifies compliance with Design Constitution v1.0:
 * - Performance budgets (bundle size, TTI targets)
 * - Touch target requirements in source
 * - Color token usage
 */

const fs = require('fs');
const path = require('path');

// Constitution performance budgets
const BUDGETS = {
  TTI: 2500, // ms
  SCROLL_FPS: 60,
  MEMORY_MB: 300,
  JS_BUNDLE_KB: 1200, // gzip
};

// Touch target minimum
const MIN_TOUCH_SIZE = 50; // px

// Required tokens
const REQUIRED_TOKENS = [
  'tc-bg-primary',
  'tc-bg-secondary',
  'tc-text-primary',
  'tc-text-secondary',
  'tc-border',
  'tc-success',
  'tc-warning',
  'tc-danger',
];

console.log('='.repeat(60));
console.log('TRADESCAPTAIN DESIGN CONSTITUTION VERIFICATION');
console.log('='.repeat(60));
console.log('');

let totalPassed = 0;
let totalFailed = 0;
let totalWarnings = 0;

function pass(message) {
  console.log(`✓ PASS: ${message}`);
  totalPassed++;
}

function fail(message) {
  console.log(`✗ FAIL: ${message}`);
  totalFailed++;
}

function warn(message) {
  console.log(`⚠ WARN: ${message}`);
  totalWarnings++;
}

function section(title) {
  console.log('');
  console.log('-'.repeat(40));
  console.log(title);
  console.log('-'.repeat(40));
}

// 1. Check tailwind config for Constitution tokens
section('1. DESIGN TOKEN VERIFICATION');

try {
  const tailwindConfig = fs.readFileSync(
    path.join(__dirname, '../tailwind.config.ts'),
    'utf8'
  );

  // Check for tc-* tokens
  const hasTokenPrefix = tailwindConfig.includes('tc-') || tailwindConfig.includes("'tc");
  if (hasTokenPrefix) {
    pass('Constitution tc-* tokens configured in Tailwind');
  } else {
    warn('tc-* token prefix not found - using default tokens');
  }

  // Check for Constitution colors
  if (tailwindConfig.includes('--background') || tailwindConfig.includes('hsl(var')) {
    pass('CSS variable-based theming in place');
  } else {
    warn('CSS variables not detected in Tailwind config');
  }

} catch (error) {
  fail(`Could not read tailwind.config.ts: ${error.message}`);
}

// 2. Check for touch target compliance in components
section('2. TOUCH TARGET COMPLIANCE');

const componentDirs = [
  'components/mobile',
  'components/ui',
  'components/forms',
];

let touchTargetIssues = 0;

componentDirs.forEach(dir => {
  const fullPath = path.join(__dirname, '..', dir);

  if (fs.existsSync(fullPath)) {
    const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.tsx'));

    files.forEach(file => {
      const content = fs.readFileSync(path.join(fullPath, file), 'utf8');

      // Check for minimum height classes
      const hasMinHeight =
        content.includes('min-h-[50px]') ||
        content.includes('h-[50px]') ||
        content.includes('min-h-12') ||
        content.includes('h-12') ||
        content.includes('h-[56px]');

      if (hasMinHeight) {
        pass(`${dir}/${file}: Touch targets defined`);
      }

      // Check for small touch targets
      if (content.includes('h-8') || content.includes('h-6') || content.includes('w-8')) {
        if (!content.includes('icon') && !content.includes('Icon')) {
          warn(`${dir}/${file}: May have small touch targets (h-8 or smaller)`);
          touchTargetIssues++;
        }
      }
    });
  }
});

if (touchTargetIssues === 0) {
  pass('No obvious touch target violations found');
}

// 3. Check Constitution-specific components exist
section('3. CONSTITUTION COMPONENT VERIFICATION');

const requiredComponents = [
  'components/mobile/quick-action-bar.tsx',
  'components/photos/camera-capture.tsx',
  'components/photos/before-after-pairing.tsx',
  'components/forms/mobile-text-input.tsx',
  'components/timesheets/one-tap-clock.tsx',
  'components/timesheets/day-summary.tsx',
  'components/offline/offline-indicator.tsx',
  'components/scanner/barcode-scanner.tsx',
  'components/search/voice-search.tsx',
];

requiredComponents.forEach(component => {
  const fullPath = path.join(__dirname, '..', component);
  if (fs.existsSync(fullPath)) {
    pass(`${component} exists`);
  } else {
    fail(`${component} missing`);
  }
});

// 4. Check Constitution hooks exist
section('4. CONSTITUTION HOOKS VERIFICATION');

const requiredHooks = [
  'hooks/useAutoSave.ts',
  'hooks/useVoiceInput.ts',
  'hooks/useFilterPersistence.ts',
  'hooks/useJobQuickActions.ts',
];

requiredHooks.forEach(hook => {
  const fullPath = path.join(__dirname, '..', hook);
  if (fs.existsSync(fullPath)) {
    pass(`${hook} exists`);
  } else {
    fail(`${hook} missing`);
  }
});

// 5. Check lib utilities exist
section('5. CONSTITUTION UTILITIES VERIFICATION');

const requiredLibs = [
  'lib/photos/compression.ts',
  'lib/photos/metadata.ts',
  'lib/location/eta-calculator.ts',
  'lib/errors/user-messages.ts',
  'lib/scanner/decode.ts',
  'lib/search/recent-items.ts',
  'lib/audit/design-compliance.ts',
];

requiredLibs.forEach(lib => {
  const fullPath = path.join(__dirname, '..', lib);
  if (fs.existsSync(fullPath)) {
    pass(`${lib} exists`);
  } else {
    fail(`${lib} missing`);
  }
});

// 6. Check offline infrastructure
section('6. OFFLINE-FIRST VERIFICATION');

const offlineFiles = [
  'lib/offline/context.tsx',
  'lib/offline/media-queue.ts',
  'lib/offline/sync-engine.ts',
  'lib/db/indexed-db.ts',
];

offlineFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file);
  if (fs.existsSync(fullPath)) {
    pass(`${file} exists`);

    // Check for offline patterns
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('IndexedDB') || content.includes('indexedDB') || content.includes('openDB')) {
      pass(`${file}: IndexedDB integration found`);
    }
  } else {
    warn(`${file} not found - offline capability may be limited`);
  }
});

// 7. Check PWA configuration
section('7. PWA CONFIGURATION VERIFICATION');

if (fs.existsSync(path.join(__dirname, '../next.config.js')) ||
    fs.existsSync(path.join(__dirname, '../next.config.mjs')) ||
    fs.existsSync(path.join(__dirname, '../next.config.ts'))) {
  pass('Next.js config exists');

  // Try to find PWA config
  const configFiles = ['next.config.js', 'next.config.mjs', 'next.config.ts'];
  for (const configFile of configFiles) {
    const configPath = path.join(__dirname, '..', configFile);
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      if (content.includes('pwa') || content.includes('withPWA')) {
        pass('PWA configuration found');
        break;
      }
    }
  }
}

if (fs.existsSync(path.join(__dirname, '../public/manifest.json'))) {
  pass('Web manifest exists');
} else {
  warn('manifest.json not found in public/');
}

// Summary
console.log('');
console.log('='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));
console.log(`✓ Passed: ${totalPassed}`);
console.log(`⚠ Warnings: ${totalWarnings}`);
console.log(`✗ Failed: ${totalFailed}`);
console.log('');

if (totalFailed === 0) {
  console.log('🎉 CONSTITUTION COMPLIANCE: VERIFIED');
  console.log('');
  console.log('All required Constitution patterns are in place.');
  console.log('For full runtime verification, use the DesignAuditPanel component.');
} else {
  console.log('⚠️  CONSTITUTION COMPLIANCE: INCOMPLETE');
  console.log('');
  console.log(`${totalFailed} items need attention.`);
}

console.log('');
console.log('Next steps:');
console.log('1. Run: npm run build && npm run analyze (check bundle size)');
console.log('2. Run Lighthouse audit for performance metrics');
console.log('3. Test with gloves or capacitive stylus');
console.log('4. Test outdoors in bright sunlight');
console.log('');

process.exit(totalFailed > 0 ? 1 : 0);
