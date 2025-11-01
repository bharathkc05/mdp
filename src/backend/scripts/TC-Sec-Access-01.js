/**
 * Test Case: TC-Sec-Access-01
 * Story: 1.4 - Role-Based Access Control
 * Feature: MDPF-013
 * 
 * This test verifies that:
 * 1. API endpoints are protected and require authentication
 * 2. Admin endpoints return 403 for users with Donor role
 * 3. Donor endpoints are accessible to users with Donor role
 * 4. Admin endpoints are accessible to users with Admin role
 */

import fetch from 'node-fetch';

// Test Configuration
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_BASE = `${BASE_URL}/api`;

// Test Colors for Console Output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// Test Results Tracker
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// Helper function to print test results
function logTest(testName, passed, expected, actual) {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`${colors.green}✓${colors.reset} ${testName}`);
  } else {
    failedTests++;
    console.log(`${colors.red}✗${colors.reset} ${testName}`);
    console.log(`  Expected: ${expected}`);
    console.log(`  Actual: ${actual}`);
  }
}

function logSection(title) {
  console.log(`\n${colors.cyan}${colors.bright}=== ${title} ===${colors.reset}\n`);
}

function logInfo(message) {
  console.log(`${colors.blue}ℹ${colors.reset} ${message}`);
}

function logWarning(message) {
  console.log(`${colors.yellow}⚠${colors.reset} ${message}`);
}

// Test Credentials
let donorToken = null;
let adminToken = null;
let testCauseId = null;

// Test User Credentials (these should be created in your database first)
const DONOR_CREDENTIALS = {
  email: 'donor@test.com',
  password: 'Donor123!'
};

const ADMIN_CREDENTIALS = {
  email: 'admin@test.com',
  password: 'Admin123!'
};

// Helper function to make API requests
async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json().catch(() => null);
    return {
      status: response.status,
      data,
      ok: response.ok
    };
  } catch (error) {
    return {
      status: 0,
      data: { message: error.message },
      ok: false
    };
  }
}

// Test 1: Authenticate Users
async function testAuthentication() {
  logSection('Test 1: User Authentication');

  // Login as Donor
  logInfo('Attempting to login as Donor...');
  const donorLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(DONOR_CREDENTIALS)
  });

  logTest(
    'Donor login successful',
    donorLogin.ok && donorLogin.data?.token,
    'Status 200 with token',
    `Status ${donorLogin.status}`
  );

  if (donorLogin.data?.token) {
    donorToken = donorLogin.data.token;
    logInfo(`Donor token obtained: ${donorToken.substring(0, 20)}...`);
  } else {
    logWarning('Could not obtain donor token. Some tests will be skipped.');
    logWarning(`Response: ${JSON.stringify(donorLogin.data)}`);
  }

  // Login as Admin
  logInfo('Attempting to login as Admin...');
  const adminLogin = await apiRequest('/auth/login', {
    method: 'POST',
    body: JSON.stringify(ADMIN_CREDENTIALS)
  });

  logTest(
    'Admin login successful',
    adminLogin.ok && adminLogin.data?.token,
    'Status 200 with token',
    `Status ${adminLogin.status}`
  );

  if (adminLogin.data?.token) {
    adminToken = adminLogin.data.token;
    logInfo(`Admin token obtained: ${adminToken.substring(0, 20)}...`);
  } else {
    logWarning('Could not obtain admin token. Some tests will be skipped.');
    logWarning(`Response: ${JSON.stringify(adminLogin.data)}`);
  }
}

// Test 2: Protected Endpoints Require Authentication
async function testProtectedEndpoints() {
  logSection('Test 2: Protected Endpoints Require Authentication');

  // Test admin endpoint without auth
  const adminNoAuth = await apiRequest('/admin/causes', {
    method: 'GET'
  });

  logTest(
    'Admin endpoint returns 401 without authentication',
    adminNoAuth.status === 401,
    'Status 401',
    `Status ${adminNoAuth.status}`
  );

  // Test donation endpoint without auth
  const donateNoAuth = await apiRequest('/donate/causes', {
    method: 'GET'
  });

  logTest(
    'Donation endpoint returns 401 without authentication',
    donateNoAuth.status === 401,
    'Status 401',
    `Status ${donateNoAuth.status}`
  );

  // Test donate action without auth
  const donateActionNoAuth = await apiRequest('/donate', {
    method: 'POST',
    body: JSON.stringify({ causeId: 'test', amount: 10 })
  });

  logTest(
    'Donate action returns 401 without authentication',
    donateActionNoAuth.status === 401,
    'Status 401',
    `Status ${donateActionNoAuth.status}`
  );
}

// Test 3: Admin Endpoints Return 403 for Donor Role
async function testDonorAccessToAdminEndpoints() {
  logSection('Test 3: Admin Endpoints Return 403 for Donor Role');

  if (!donorToken) {
    logWarning('Skipping: No donor token available');
    return;
  }

  // Test GET /admin/causes
  const getCauses = await apiRequest('/admin/causes', {
    method: 'GET',
    headers: { Authorization: `Bearer ${donorToken}` }
  });

  logTest(
    'GET /admin/causes returns 403 for Donor',
    getCauses.status === 403,
    'Status 403',
    `Status ${getCauses.status}`
  );

  // Test POST /admin/causes
  const createCause = await apiRequest('/admin/causes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({
      name: 'Test Cause',
      description: 'Test Description',
      targetAmount: 1000
    })
  });

  logTest(
    'POST /admin/causes returns 403 for Donor',
    createCause.status === 403,
    'Status 403',
    `Status ${createCause.status}`
  );

  // Test GET /admin/users
  const getUsers = await apiRequest('/admin/users', {
    method: 'GET',
    headers: { Authorization: `Bearer ${donorToken}` }
  });

  logTest(
    'GET /admin/users returns 403 for Donor',
    getUsers.status === 403,
    'Status 403',
    `Status ${getUsers.status}`
  );

  // Test GET /admin/dashboard/stats
  const getStats = await apiRequest('/admin/dashboard/stats', {
    method: 'GET',
    headers: { Authorization: `Bearer ${donorToken}` }
  });

  logTest(
    'GET /admin/dashboard/stats returns 403 for Donor',
    getStats.status === 403,
    'Status 403',
    `Status ${getStats.status}`
  );
}

// Test 4: Donor Endpoints Are Accessible to Donor Role
async function testDonorAccessToDonorEndpoints() {
  logSection('Test 4: Donor Endpoints Are Accessible to Donor Role');

  if (!donorToken) {
    logWarning('Skipping: No donor token available');
    return;
  }

  // Test GET /donate/causes
  const getCauses = await apiRequest('/donate/causes', {
    method: 'GET',
    headers: { Authorization: `Bearer ${donorToken}` }
  });

  logTest(
    'GET /donate/causes accessible to Donor (200 or 404 if no causes)',
    getCauses.status === 200 || getCauses.status === 404,
    'Status 200 or 404',
    `Status ${getCauses.status}`
  );

  // Test GET /donate/history
  const getHistory = await apiRequest('/donate/history', {
    method: 'GET',
    headers: { Authorization: `Bearer ${donorToken}` }
  });

  logTest(
    'GET /donate/history accessible to Donor',
    getHistory.status === 200,
    'Status 200',
    `Status ${getHistory.status}`
  );

  // Test GET /donate/stats
  const getStats = await apiRequest('/donate/stats', {
    method: 'GET',
    headers: { Authorization: `Bearer ${donorToken}` }
  });

  logTest(
    'GET /donate/stats accessible to Donor',
    getStats.status === 200,
    'Status 200',
    `Status ${getStats.status}`
  );

  // Test GET /donate/categories
  const getCategories = await apiRequest('/donate/categories', {
    method: 'GET',
    headers: { Authorization: `Bearer ${donorToken}` }
  });

  logTest(
    'GET /donate/categories accessible to Donor',
    getCategories.status === 200,
    'Status 200',
    `Status ${getCategories.status}`
  );
}

// Test 5: Admin Endpoints Are Accessible to Admin Role
async function testAdminAccessToAdminEndpoints() {
  logSection('Test 5: Admin Endpoints Are Accessible to Admin Role');

  if (!adminToken) {
    logWarning('Skipping: No admin token available');
    return;
  }

  // Test GET /admin/causes
  const getCauses = await apiRequest('/admin/causes', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  logTest(
    'GET /admin/causes accessible to Admin',
    getCauses.status === 200,
    'Status 200',
    `Status ${getCauses.status}`
  );

  // Test POST /admin/causes (create a test cause)
  const createCause = await apiRequest('/admin/causes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      name: `Test Cause ${Date.now()}`,
      description: 'Automated test cause for role-based access control',
      category: 'education',
      targetAmount: 5000
    })
  });

  logTest(
    'POST /admin/causes accessible to Admin',
    createCause.status === 201,
    'Status 201',
    `Status ${createCause.status}`
  );

  if (createCause.ok && createCause.data?.data?._id) {
    testCauseId = createCause.data.data._id;
    logInfo(`Test cause created with ID: ${testCauseId}`);
  }

  // Test GET /admin/users
  const getUsers = await apiRequest('/admin/users', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  logTest(
    'GET /admin/users accessible to Admin',
    getUsers.status === 200,
    'Status 200',
    `Status ${getUsers.status}`
  );

  // Test GET /admin/dashboard/stats
  const getStats = await apiRequest('/admin/dashboard/stats', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  logTest(
    'GET /admin/dashboard/stats accessible to Admin',
    getStats.status === 200,
    'Status 200',
    `Status ${getStats.status}`
  );

  // Test GET specific cause
  if (testCauseId) {
    const getCause = await apiRequest(`/admin/causes/${testCauseId}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    logTest(
      'GET /admin/causes/:id accessible to Admin',
      getCause.status === 200,
      'Status 200',
      `Status ${getCause.status}`
    );

    // Test PUT (update cause)
    const updateCause = await apiRequest(`/admin/causes/${testCauseId}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        description: 'Updated description for testing'
      })
    });

    logTest(
      'PUT /admin/causes/:id accessible to Admin',
      updateCause.status === 200,
      'Status 200',
      `Status ${updateCause.status}`
    );
  }
}

// Test 6: Admin Can Access Donor Endpoints
async function testAdminAccessToDonorEndpoints() {
  logSection('Test 6: Admin Can Also Access Donor Endpoints');

  if (!adminToken) {
    logWarning('Skipping: No admin token available');
    return;
  }

  // Test GET /donate/causes
  const getCauses = await apiRequest('/donate/causes', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  logTest(
    'GET /donate/causes accessible to Admin',
    getCauses.status === 200,
    'Status 200',
    `Status ${getCauses.status}`
  );

  // Test GET /donate/history
  const getHistory = await apiRequest('/donate/history', {
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  logTest(
    'GET /donate/history accessible to Admin',
    getHistory.status === 200,
    'Status 200',
    `Status ${getHistory.status}`
  );
}

// Test 7: Test Donation Flow for Donor
async function testDonationFlow() {
  logSection('Test 7: Complete Donation Flow for Donor');

  if (!donorToken || !testCauseId) {
    logWarning('Skipping: No donor token or test cause available');
    return;
  }

  // Test making a donation
  const makeDonation = await apiRequest('/donate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${donorToken}` },
    body: JSON.stringify({
      causeId: testCauseId,
      amount: 100
    })
  });

  logTest(
    'POST /donate allows Donor to make donation',
    makeDonation.status === 201,
    'Status 201',
    `Status ${makeDonation.status}`
  );

  // Verify donation appears in history
  const getHistory = await apiRequest('/donate/history', {
    method: 'GET',
    headers: { Authorization: `Bearer ${donorToken}` }
  });

  const hasDonation = getHistory.ok && 
    getHistory.data?.data?.donations?.length > 0;

  logTest(
    'Donation appears in donor history',
    hasDonation,
    'At least one donation in history',
    hasDonation ? 'Donations found' : 'No donations found'
  );
}

// Cleanup: Delete test cause
async function cleanup() {
  logSection('Cleanup: Removing Test Data');

  if (!adminToken || !testCauseId) {
    logInfo('No cleanup needed');
    return;
  }

  const deleteCause = await apiRequest(`/admin/causes/${testCauseId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  if (deleteCause.ok) {
    logInfo(`Test cause ${testCauseId} deleted successfully`);
  } else {
    logWarning(`Could not delete test cause: ${deleteCause.data?.message || 'Unknown error'}`);
  }
}

// Print Summary
function printSummary() {
  logSection('Test Summary');
  
  console.log(`Total Tests: ${totalTests}`);
  console.log(`${colors.green}Passed: ${passedTests}${colors.reset}`);
  console.log(`${colors.red}Failed: ${failedTests}${colors.reset}`);
  console.log(`Success Rate: ${totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(2) : 0}%`);
  
  if (failedTests === 0) {
    console.log(`\n${colors.green}${colors.bright}✓ All tests passed!${colors.reset}`);
  } else {
    console.log(`\n${colors.red}${colors.bright}✗ Some tests failed${colors.reset}`);
  }
}

// Main Test Runner
async function runTests() {
  console.log(`${colors.bright}${colors.cyan}`);
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   Role-Based Access Control Test Suite                    ║');
  console.log('║   Test Case: TC-Sec-Access-01                              ║');
  console.log('║   Story: 1.4 - MDPF-013                                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(colors.reset);
  
  logInfo(`Testing API at: ${API_BASE}`);
  logInfo('Make sure the server is running and test users are created');
  console.log('');
  
  try {
    await testAuthentication();
    await testProtectedEndpoints();
    await testDonorAccessToAdminEndpoints();
    await testDonorAccessToDonorEndpoints();
    await testAdminAccessToAdminEndpoints();
    await testAdminAccessToDonorEndpoints();
    await testDonationFlow();
    await cleanup();
    printSummary();
    
    // Exit with appropriate code
    process.exit(failedTests > 0 ? 1 : 0);
  } catch (error) {
    console.error(`\n${colors.red}Fatal error during testing:${colors.reset}`, error);
    process.exit(1);
  }
}

// Run the tests
runTests();
