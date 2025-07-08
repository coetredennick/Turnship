#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function runCommand(command, workspace = null) {
  try {
    const cmd = workspace ? `${command} --workspace=${workspace}` : command;
    log(`Running: ${cmd}`, colors.cyan);
    const output = execSync(cmd, { 
      encoding: 'utf8', 
      stdio: ['inherit', 'pipe', 'pipe'],
      cwd: process.cwd()
    });
    return output;
  } catch (error) {
    log(`Error running command: ${error.message}`, colors.red);
    throw error;
  }
}

function readCoverageReport(workspace) {
  const coveragePath = path.join(process.cwd(), workspace, 'coverage', 'coverage-summary.json');
  if (fs.existsSync(coveragePath)) {
    return JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  }
  return null;
}

function displayCoverageReport(workspace, coverage) {
  if (!coverage) {
    log(`No coverage report found for ${workspace}`, colors.yellow);
    return;
  }

  const total = coverage.total;
  log(`\n${colors.bold}Coverage Report for ${workspace.toUpperCase()}:${colors.reset}`);
  log(`Lines: ${total.lines.pct}% (${total.lines.covered}/${total.lines.total})`);
  log(`Statements: ${total.statements.pct}% (${total.statements.covered}/${total.statements.total})`);
  log(`Functions: ${total.functions.pct}% (${total.functions.covered}/${total.functions.total})`);
  log(`Branches: ${total.branches.pct}% (${total.branches.covered}/${total.branches.total})`);

  // Check if coverage meets thresholds (80%)
  const threshold = 80;
  const meetsThreshold = 
    total.lines.pct >= threshold &&
    total.statements.pct >= threshold &&
    total.functions.pct >= threshold &&
    total.branches.pct >= threshold;

  if (meetsThreshold) {
    log(`✅ Coverage meets 80% threshold!`, colors.green);
  } else {
    log(`❌ Coverage below 80% threshold`, colors.red);
  }
}

async function main() {
  log(`${colors.bold}🧪 Running Turnship Test Coverage Report${colors.reset}\n`);

  try {
    // Install dependencies if needed
    log('Ensuring dependencies are installed...', colors.blue);
    runCommand('npm install');

    // Run server tests with coverage
    log('\n📊 Running server tests with coverage...', colors.blue);
    runCommand('npm run test:coverage', 'server');
    
    // Run client tests with coverage
    log('\n📊 Running client tests with coverage...', colors.blue);
    runCommand('npm run test:coverage', 'client');

    // Display coverage reports
    log('\n📈 Coverage Summary:', colors.bold);
    
    const serverCoverage = readCoverageReport('server');
    displayCoverageReport('server', serverCoverage);
    
    const clientCoverage = readCoverageReport('client');
    displayCoverageReport('client', clientCoverage);

    // Open coverage reports
    log('\n🌐 Coverage reports generated:', colors.blue);
    log(`Server: file://${path.join(process.cwd(), 'server', 'coverage', 'lcov-report', 'index.html')}`);
    log(`Client: file://${path.join(process.cwd(), 'client', 'coverage', 'lcov-report', 'index.html')}`);

    log('\n✅ Test coverage analysis complete!', colors.green);

  } catch (error) {
    log(`\n❌ Test coverage failed: ${error.message}`, colors.red);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main, readCoverageReport, displayCoverageReport };