/**
 * Test Script for Story 1.5: Two-Factor Authentication (2FA) for Admins
 * 
 * This script tests:
 * 1. Admin can enable 2FA in their account settings
 * 2. Login requires both password and valid 2FA code when enabled
 * 3. System provides recovery codes for lost 2FA device
 * 
 * Prerequisites:
 * - Backend server running on http://localhost:3001
 * - Test admin user created (or will be created by script)
 */

import axios from 'axios';
import readline from 'readline';

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  success: (msg) => console.log(`${colors.green}✓ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}✗ ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}⚠ ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.cyan}▶ ${msg}${colors.reset}`)
};

// Test data
const testAdmin = {
  firstName: 'Test',
  lastName: 'Admin',
  age: 30,
  gender: 'other',
  email: `admin.2fa.test.${Date.now()}@example.com`,
  password: 'SecurePass123!',
  confirmPassword: 'SecurePass123!',
  role: 'admin'
};

let authToken = '';
let qrCodeSecret = '';
let backupCodes = [];

// Helper function to prompt user input
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Test 1: Register a new admin user
async function test1_RegisterAdmin() {
  log.step('Test 1: Registering new admin user...');
  try {
    const response = await axios.post(`${API_URL}/api/auth/register`, testAdmin);
    log.success(`Admin registered: ${testAdmin.email}`);
    
    // Auto-verify the user for testing
    if (response.data.verificationToken) {
      await axios.get(`${API_URL}/api/auth/verify?token=${response.data.verificationToken}`);
      log.success('Admin account verified');
    }
    
    return true;
  } catch (error) {
    if (error.response?.data?.message?.includes('already registered')) {
      log.warn('Admin already exists, attempting to login instead');
      return true;
    }
    log.error(`Registration failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 2: Login as admin
async function test2_LoginAdmin() {
  log.step('Test 2: Logging in as admin...');
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: testAdmin.email,
      password: testAdmin.password
    });
    
    authToken = response.data.token;
    log.success(`Login successful, token received`);
    log.info(`Role: ${response.data.role || 'Not specified'}`);
    return true;
  } catch (error) {
    log.error(`Login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 3: Check initial 2FA status (should be disabled)
async function test3_Check2FAStatus() {
  log.step('Test 3: Checking initial 2FA status...');
  try {
    const response = await axios.get(`${API_URL}/api/2fa/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    const enabled = response.data.data.twoFactorEnabled;
    if (enabled === false) {
      log.success('2FA is initially disabled (as expected)');
      return true;
    } else {
      log.warn('2FA is already enabled for this account');
      return true;
    }
  } catch (error) {
    log.error(`Failed to check 2FA status: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 4: Setup 2FA - Generate QR code
async function test4_Setup2FA() {
  log.step('Test 4: Setting up 2FA (generating QR code)...');
  try {
    const response = await axios.post(`${API_URL}/api/2fa/setup`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    qrCodeSecret = response.data.data.secret;
    log.success('2FA setup initiated');
    log.info(`Secret: ${qrCodeSecret}`);
    log.info('QR Code received (base64 data)');
    
    if (response.data.data.qrCode) {
      log.info(`QR Code length: ${response.data.data.qrCode.length} characters`);
    }
    
    return true;
  } catch (error) {
    log.error(`2FA setup failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 5: Verify 2FA setup with TOTP code (manual input required)
async function test5_Verify2FASetup() {
  log.step('Test 5: Verifying 2FA setup...');
  
  log.warn('MANUAL STEP REQUIRED:');
  console.log(`
${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
Please scan the QR code using your authenticator app
(Google Authenticator, Authy, Microsoft Authenticator, etc.)

OR manually enter this secret: ${colors.cyan}${qrCodeSecret}${colors.reset}

Then enter the 6-digit code from your authenticator app below.
${colors.yellow}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}
  `);
  
  const totpCode = await promptUser('Enter 6-digit TOTP code: ');
  
  try {
    const response = await axios.post(`${API_URL}/api/2fa/verify-setup`, {
      token: totpCode
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    backupCodes = response.data.data.backupCodes;
    log.success('2FA enabled successfully!');
    log.success(`Received ${backupCodes.length} backup codes`);
    
    console.log(`\n${colors.cyan}━━━ Backup Codes (SAVE THESE!) ━━━${colors.reset}`);
    backupCodes.forEach((code, index) => {
      console.log(`  ${index + 1}. ${code}`);
    });
    console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
    
    return true;
  } catch (error) {
    log.error(`2FA verification failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 6: Logout to test 2FA login flow
async function test6_Logout() {
  log.step('Test 6: Logging out...');
  try {
    await axios.post(`${API_URL}/api/auth/logout`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    authToken = '';
    log.success('Logged out successfully');
    return true;
  } catch (error) {
    log.error(`Logout failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 7: Login with 2FA - First attempt (should request 2FA code)
async function test7_LoginRequires2FA() {
  log.step('Test 7: Testing login with 2FA enabled (should prompt for code)...');
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: testAdmin.email,
      password: testAdmin.password
    });
    
    if (response.data.requiresTwoFactor) {
      log.success('Login correctly requires 2FA code');
      return true;
    } else {
      log.error('Login did not require 2FA (expected it to)');
      return false;
    }
  } catch (error) {
    log.error(`Login attempt failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 8: Complete login with TOTP code
async function test8_LoginWith2FA() {
  log.step('Test 8: Completing login with TOTP code...');
  
  const totpCode = await promptUser('Enter current 6-digit TOTP code: ');
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: testAdmin.email,
      password: testAdmin.password,
      twoFactorCode: totpCode
    });
    
    if (response.data.token) {
      authToken = response.data.token;
      log.success('Login with 2FA successful!');
      log.success('Received authentication token');
      return true;
    } else {
      log.error('Login response missing token');
      return false;
    }
  } catch (error) {
    log.error(`2FA login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 9: Test backup code login
async function test9_LoginWithBackupCode() {
  log.step('Test 9: Testing login with backup code...');
  
  // Logout first
  await axios.post(`${API_URL}/api/auth/logout`, {}, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  authToken = '';
  
  if (backupCodes.length === 0) {
    log.warn('No backup codes available for testing');
    return false;
  }
  
  const backupCode = backupCodes[0];
  log.info(`Using backup code: ${backupCode}`);
  
  try {
    const response = await axios.post(`${API_URL}/api/auth/login`, {
      email: testAdmin.email,
      password: testAdmin.password,
      backupCode: backupCode
    });
    
    if (response.data.token) {
      authToken = response.data.token;
      log.success('Login with backup code successful!');
      log.info('This backup code should now be marked as used');
      return true;
    } else {
      log.error('Login response missing token');
      return false;
    }
  } catch (error) {
    log.error(`Backup code login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 10: Verify backup code can't be reused
async function test10_BackupCodeReuse() {
  log.step('Test 10: Verifying backup codes cannot be reused...');
  
  // Logout first
  await axios.post(`${API_URL}/api/auth/logout`, {}, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  authToken = '';
  
  const usedBackupCode = backupCodes[0];
  
  try {
    await axios.post(`${API_URL}/api/auth/login`, {
      email: testAdmin.email,
      password: testAdmin.password,
      backupCode: usedBackupCode
    });
    
    log.error('Backup code was accepted again (should have been rejected)');
    return false;
  } catch (error) {
    if (error.response?.data?.message?.includes('Invalid') || 
        error.response?.data?.message?.includes('used')) {
      log.success('Used backup code correctly rejected');
      return true;
    } else {
      log.error(`Unexpected error: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }
}

// Test 11: Disable 2FA
async function test11_Disable2FA() {
  log.step('Test 11: Disabling 2FA...');
  
  // Login first with TOTP to get token
  const totpCode = await promptUser('Enter current TOTP code to proceed: ');
  const loginResponse = await axios.post(`${API_URL}/api/auth/login`, {
    email: testAdmin.email,
    password: testAdmin.password,
    twoFactorCode: totpCode
  });
  authToken = loginResponse.data.token;
  
  try {
    await axios.post(`${API_URL}/api/2fa/disable`, {
      password: testAdmin.password
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    log.success('2FA disabled successfully');
    
    // Verify it's disabled
    const statusResponse = await axios.get(`${API_URL}/api/2fa/status`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (statusResponse.data.data.twoFactorEnabled === false) {
      log.success('Verified 2FA is now disabled');
      return true;
    } else {
      log.error('2FA still appears to be enabled');
      return false;
    }
  } catch (error) {
    log.error(`Failed to disable 2FA: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║  Story 1.5: Two-Factor Authentication Test Suite          ║
║  Testing 2FA for Admin Users                               ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
  `);

  const tests = [
    { name: 'Register Admin', fn: test1_RegisterAdmin },
    { name: 'Login Admin', fn: test2_LoginAdmin },
    { name: 'Check 2FA Status', fn: test3_Check2FAStatus },
    { name: 'Setup 2FA', fn: test4_Setup2FA },
    { name: 'Verify 2FA Setup', fn: test5_Verify2FASetup },
    { name: 'Logout', fn: test6_Logout },
    { name: 'Login Requires 2FA', fn: test7_LoginRequires2FA },
    { name: 'Login With 2FA', fn: test8_LoginWith2FA },
    { name: 'Login With Backup Code', fn: test9_LoginWithBackupCode },
    { name: 'Backup Code Reuse Prevention', fn: test10_BackupCodeReuse },
    { name: 'Disable 2FA', fn: test11_Disable2FA }
  ];

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < tests.length; i++) {
    console.log(`\n${colors.yellow}[${i + 1}/${tests.length}] ${tests[i].name}${colors.reset}`);
    try {
      const result = await tests[i].fn();
      if (result) {
        passed++;
      } else {
        failed++;
        log.warn('Test failed but continuing...');
      }
    } catch (error) {
      failed++;
      log.error(`Test threw exception: ${error.message}`);
    }
  }

  // Summary
  console.log(`
${colors.cyan}╔════════════════════════════════════════════════════════════╗
║  Test Summary                                              ║
╚════════════════════════════════════════════════════════════╝${colors.reset}
  `);
  console.log(`Total Tests: ${tests.length}`);
  console.log(`${colors.green}Passed: ${passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failed}${colors.reset}`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed! Story 1.5 implementation is working correctly.${colors.reset}\n`);
  } else {
    console.log(`\n${colors.red}⚠️  Some tests failed. Please review the errors above.${colors.reset}\n`);
  }
}

// Run the tests
runTests().catch(error => {
  log.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
