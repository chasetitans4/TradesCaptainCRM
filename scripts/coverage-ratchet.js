/**
 * Coverage Ratchet Script
 *
 * This script ensures coverage thresholds only increase over time.
 * Run after generating coverage to update the baseline.
 *
 * Usage: npm run coverage:ratchet
 */

const fs = require('fs');
const path = require('path');

const summaryPath = path.join(__dirname, '../coverage/coverage-summary.json');
const thresholdsPath = path.join(__dirname, '../.coverage-baseline.json');

// Default baseline (matches current jest.coverage.config.js globals)
const defaultBaseline = {
  branches: 75,
  functions: 80,
  lines: 80,
  statements: 80,
};

try {
  // Check if coverage summary exists
  if (!fs.existsSync(summaryPath)) {
    console.error('Error: coverage-summary.json not found.');
    console.error('Run "npm run test:coverage" first to generate coverage data.');
    process.exit(1);
  }

  // Read current coverage
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const current = summary.total;

  if (!current) {
    console.error('Error: No coverage data found in summary.');
    process.exit(1);
  }

  // Load or initialize baseline
  let baseline = { ...defaultBaseline };
  if (fs.existsSync(thresholdsPath)) {
    baseline = JSON.parse(fs.readFileSync(thresholdsPath, 'utf8'));
    console.log('Loaded existing baseline:', baseline);
  } else {
    console.log('No baseline found, using defaults:', baseline);
  }

  // Current coverage percentages
  const currentPct = {
    branches: current.branches?.pct ?? 0,
    functions: current.functions?.pct ?? 0,
    lines: current.lines?.pct ?? 0,
    statements: current.statements?.pct ?? 0,
  };

  console.log('\nCurrent coverage:');
  console.log(`  Branches:   ${currentPct.branches.toFixed(2)}%`);
  console.log(`  Functions:  ${currentPct.functions.toFixed(2)}%`);
  console.log(`  Lines:      ${currentPct.lines.toFixed(2)}%`);
  console.log(`  Statements: ${currentPct.statements.toFixed(2)}%`);

  // Ratchet: only allow increases (floor to avoid flaky failures)
  const updated = {
    branches: Math.max(baseline.branches, Math.floor(currentPct.branches)),
    functions: Math.max(baseline.functions, Math.floor(currentPct.functions)),
    lines: Math.max(baseline.lines, Math.floor(currentPct.lines)),
    statements: Math.max(baseline.statements, Math.floor(currentPct.statements)),
  };

  // Check for improvements
  const improved = [];
  if (updated.branches > baseline.branches) improved.push(`branches: ${baseline.branches}% -> ${updated.branches}%`);
  if (updated.functions > baseline.functions) improved.push(`functions: ${baseline.functions}% -> ${updated.functions}%`);
  if (updated.lines > baseline.lines) improved.push(`lines: ${baseline.lines}% -> ${updated.lines}%`);
  if (updated.statements > baseline.statements) improved.push(`statements: ${baseline.statements}% -> ${updated.statements}%`);

  if (improved.length > 0) {
    console.log('\nCoverage improved:');
    improved.forEach(i => console.log(`  ${i}`));
  } else {
    console.log('\nNo coverage improvements detected.');
  }

  // Write updated baseline
  fs.writeFileSync(thresholdsPath, JSON.stringify(updated, null, 2) + '\n');
  console.log('\nBaseline updated:', thresholdsPath);
  console.log('New thresholds:', updated);

} catch (error) {
  console.error('Error running coverage ratchet:', error.message);
  process.exit(1);
}
