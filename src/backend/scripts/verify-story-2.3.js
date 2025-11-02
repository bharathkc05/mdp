/**
 * Verification Script for Story 2.3 Implementation
 * Quick check to ensure all components are in place
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
};

console.log(`${colors.cyan}${colors.bright}
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║       Story 2.3: Implementation Verification Script          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}\n`);

let allChecks = true;

function checkFile(filePath, description) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    console.log(`${colors.green}✓${colors.reset} ${description}`);
    return true;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${description} - NOT FOUND`);
    allChecks = false;
    return false;
  }
}

function checkContent(filePath, searchString, description) {
  if (!fs.existsSync(filePath)) {
    console.log(`${colors.red}✗${colors.reset} ${description} - FILE NOT FOUND`);
    allChecks = false;
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  if (content.includes(searchString)) {
    console.log(`${colors.green}✓${colors.reset} ${description}`);
    return true;
  } else {
    console.log(`${colors.red}✗${colors.reset} ${description} - CONTENT NOT FOUND`);
    allChecks = false;
    return false;
  }
}

console.log(`${colors.cyan}Checking Modified Files...${colors.reset}\n`);

// Check main implementation file
checkFile(
  path.join(__dirname, 'routes', 'donationRoutes.js'),
  'Donation routes file exists'
);

checkContent(
  path.join(__dirname, 'routes', 'donationRoutes.js'),
  'mongoose.startSession',
  'MongoDB session support added'
);

checkContent(
  path.join(__dirname, 'routes', 'donationRoutes.js'),
  'session.startTransaction',
  'Transaction support implemented'
);

checkContent(
  path.join(__dirname, 'routes', 'donationRoutes.js'),
  'session.commitTransaction',
  'Transaction commit logic present'
);

checkContent(
  path.join(__dirname, 'routes', 'donationRoutes.js'),
  'session.abortTransaction',
  'Transaction rollback logic present'
);

console.log(`\n${colors.cyan}Checking Test Files...${colors.reset}\n`);

// Check test file
checkFile(
  path.join(__dirname, 'scripts', 'TC-Donate-04.js'),
  'Test case TC-Donate-04 exists'
);

checkContent(
  path.join(__dirname, 'scripts', 'TC-Donate-04.js'),
  'testSuccessfulAtomicTransaction',
  'AC1 test function implemented'
);

checkContent(
  path.join(__dirname, 'scripts', 'TC-Donate-04.js'),
  'testTransactionRollback',
  'AC2 test function implemented'
);

checkContent(
  path.join(__dirname, 'scripts', 'TC-Donate-04.js'),
  'testErrorLoggingAndResponse',
  'AC3 test function implemented'
);

console.log(`\n${colors.cyan}Checking Configuration...${colors.reset}\n`);

// Check package.json
checkFile(
  path.join(__dirname, 'package.json'),
  'Package.json exists'
);

checkContent(
  path.join(__dirname, 'package.json'),
  'test-donate',
  'Test script added to package.json'
);

console.log(`\n${colors.cyan}Checking Documentation...${colors.reset}\n`);

// Check documentation files
const docsPath = path.join(__dirname, '..', '..', 'docs');

checkFile(
  path.join(docsPath, 'Story-2.3-Atomic-Transactions.md'),
  'Technical documentation exists'
);

checkFile(
  path.join(docsPath, 'QUICKSTART-Story-2.3.md'),
  'Quick start guide exists'
);

checkFile(
  path.join(__dirname, '..', '..', 'README.md'),
  'README.md exists'
);

checkContent(
  path.join(__dirname, '..', '..', 'README.md'),
  'Story 2.3',
  'README updated with Story 2.3 info'
);

checkFile(
  path.join(__dirname, '..', '..', 'STORY-2.3-SUMMARY.md'),
  'Implementation summary exists'
);

checkFile(
  path.join(__dirname, '..', '..', 'CHANGELOG-Story-2.3.md'),
  'Changelog exists'
);

console.log(`\n${colors.cyan}Checking Dependencies...${colors.reset}\n`);

// Check if mongoose is installed
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
  if (packageJson.dependencies && packageJson.dependencies.mongoose) {
    console.log(`${colors.green}✓${colors.reset} Mongoose dependency present (${packageJson.dependencies.mongoose})`);
  } else {
    console.log(`${colors.red}✗${colors.reset} Mongoose dependency missing`);
    allChecks = false;
  }
}

console.log(`\n${colors.cyan}${colors.bright}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

if (allChecks) {
  console.log(`${colors.green}${colors.bright}✓ All verification checks passed!${colors.reset}\n`);
  console.log(`${colors.cyan}Next Steps:${colors.reset}`);
  console.log(`1. Ensure MongoDB is running as a replica set`);
  console.log(`2. Start the server: ${colors.yellow}npm run dev${colors.reset}`);
  console.log(`3. Run test suite: ${colors.yellow}npm run test-donate${colors.reset}\n`);
  console.log(`${colors.cyan}Documentation:${colors.reset}`);
  console.log(`- Technical: docs/Story-2.3-Atomic-Transactions.md`);
  console.log(`- Quick Start: docs/QUICKSTART-Story-2.3.md`);
  console.log(`- Summary: STORY-2.3-SUMMARY.md\n`);
} else {
  console.log(`${colors.red}${colors.bright}✗ Some verification checks failed!${colors.reset}`);
  console.log(`${colors.yellow}Please review the errors above and ensure all components are properly installed.${colors.reset}\n`);
}

console.log(`${colors.cyan}Story 2.3 Implementation Status:${colors.reset}`);
console.log(`- Feature: MDP-F-007`);
console.log(`- Test Case: TC-Donate-04`);
console.log(`- Status: ${allChecks ? colors.green + '✓ COMPLETE' : colors.red + '✗ INCOMPLETE'}${colors.reset}\n`);

process.exit(allChecks ? 0 : 1);
