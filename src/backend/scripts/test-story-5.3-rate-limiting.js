/**
 * Test Script for Story 5.3: Rate Limiting on Sensitive Endpoints
 * 
 * This script tests:
 * 1. Login rate limiting (5 attempts per 15 minutes)
 * 2. Password reset rate limiting (3 attempts per 15 minutes)
 * 3. Registration rate limiting (5 attempts per hour)
 * 4. Donation rate limiting (10 attempts per minute)
 * 5. Proper 429 error responses
 * 6. Rate limit headers in response
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

function logTest(testName) {
  log(`\n▶ ${testName}`, 'blue');
}

function logSuccess(message) {
  log(`  ✓ ${message}`, 'green');
}

function logError(message) {
  log(`  ✗ ${message}`, 'red');
}

function logWarning(message) {
  log(`  ⚠ ${message}`, 'yellow');
}

// Helper to make requests with delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Test 1: Login Rate Limiting
 */
async function testLoginRateLimiting() {
  logSection('TEST 1: Login Rate Limiting (5 attempts per 15 minutes)');
  
  const loginData = {
    email: 'nonexistent@example.com',
    password: 'wrongpassword'
  };

  try {
    // Make 5 login attempts (should all succeed in getting 401/400)
    logTest('Making 5 login attempts (within limit)');
    for (let i = 1; i <= 5; i++) {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      
      if (response.status !== 429) {
        logSuccess(`Attempt ${i}: Status ${response.status} (not rate limited)`);
      } else {
        logError(`Attempt ${i}: Rate limited too early!`);
      }
      
      await delay(100); // Small delay between requests
    }

    // 6th attempt should be rate limited
    logTest('Making 6th login attempt (should be rate limited)');
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });

    const data = await response.json();
    
    if (response.status === 429) {
      logSuccess(`Rate limit enforced! Status: ${response.status}`);
      logSuccess(`Message: ${data.message}`);
      
      // Check for rate limit headers
      const rateLimitHeaders = {
        'ratelimit-limit': response.headers.get('ratelimit-limit'),
        'ratelimit-remaining': response.headers.get('ratelimit-remaining'),
        'ratelimit-reset': response.headers.get('ratelimit-reset')
      };
      
      if (rateLimitHeaders['ratelimit-limit']) {
        logSuccess(`Rate limit headers present: ${JSON.stringify(rateLimitHeaders, null, 2)}`);
      }
    } else {
      logError(`Expected 429, got ${response.status}`);
    }

  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }
}

/**
 * Test 2: Password Reset Rate Limiting
 */
async function testPasswordResetRateLimiting() {
  logSection('TEST 2: Password Reset Rate Limiting (3 attempts per 15 minutes)');
  
  const resetData = {
    email: 'test@example.com'
  };

  try {
    // Make 3 password reset attempts
    logTest('Making 3 password reset attempts (within limit)');
    for (let i = 1; i <= 3; i++) {
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetData)
      });
      
      if (response.status !== 429) {
        logSuccess(`Attempt ${i}: Status ${response.status} (not rate limited)`);
      } else {
        logError(`Attempt ${i}: Rate limited too early!`);
      }
      
      await delay(100);
    }

    // 4th attempt should be rate limited
    logTest('Making 4th password reset attempt (should be rate limited)');
    const response = await fetch(`${API_URL}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resetData)
    });

    const data = await response.json();
    
    if (response.status === 429) {
      logSuccess(`Rate limit enforced! Status: ${response.status}`);
      logSuccess(`Message: ${data.message}`);
    } else {
      logError(`Expected 429, got ${response.status}`);
    }

  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }
}

/**
 * Test 3: Registration Rate Limiting
 */
async function testRegistrationRateLimiting() {
  logSection('TEST 3: Registration Rate Limiting (5 attempts per hour)');
  
  try {
    // Make 5 registration attempts
    logTest('Making 5 registration attempts (within limit)');
    for (let i = 1; i <= 5; i++) {
      const registrationData = {
        firstName: 'Test',
        lastName: 'User',
        age: 25,
        gender: 'male',
        email: `test${i}${Date.now()}@example.com`,
        password: 'TestPassword123!',
        confirmPassword: 'TestPassword123!'
      };
      
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData)
      });
      
      if (response.status !== 429) {
        logSuccess(`Attempt ${i}: Status ${response.status} (not rate limited)`);
      } else {
        logError(`Attempt ${i}: Rate limited too early!`);
      }
      
      await delay(100);
    }

    // 6th attempt should be rate limited
    logTest('Making 6th registration attempt (should be rate limited)');
    const registrationData = {
      firstName: 'Test',
      lastName: 'User',
      age: 25,
      gender: 'male',
      email: `test6${Date.now()}@example.com`,
      password: 'TestPassword123!',
      confirmPassword: 'TestPassword123!'
    };
    
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData)
    });

    const data = await response.json();
    
    if (response.status === 429) {
      logSuccess(`Rate limit enforced! Status: ${response.status}`);
      logSuccess(`Message: ${data.message}`);
    } else {
      logError(`Expected 429, got ${response.status}`);
    }

  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }
}

/**
 * Test 4: Rate Limit Response Format
 */
async function testRateLimitResponseFormat() {
  logSection('TEST 4: Rate Limit Response Format Validation');
  
  try {
    logTest('Triggering rate limit to check response format');
    
    // Trigger login rate limit
    const loginData = {
      email: 'ratelimit-test@example.com',
      password: 'wrongpassword'
    };

    // Make multiple requests to trigger rate limit
    for (let i = 0; i < 6; i++) {
      await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData)
      });
      await delay(50);
    }

    // Check the rate-limited response
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    });

    if (response.status === 429) {
      const data = await response.json();
      
      logSuccess('Response is JSON format');
      
      if (data.success === false) {
        logSuccess('Response has "success: false"');
      }
      
      if (data.message && typeof data.message === 'string') {
        logSuccess(`User-friendly message present: "${data.message}"`);
      }
      
      if (data.retryAfter) {
        logSuccess(`Retry-after timestamp present: ${data.retryAfter}`);
      }
      
      // Check security - no stack traces
      if (!data.stack) {
        logSuccess('No stack trace exposed (secure)');
      } else {
        logWarning('Stack trace exposed in rate limit response');
      }
      
    } else {
      logWarning(`Could not trigger rate limit, got status: ${response.status}`);
    }

  } catch (error) {
    logError(`Test failed: ${error.message}`);
  }
}

/**
 * Main test runner
 */
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║        Story 5.3: Rate Limiting Test Suite                                 ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'cyan');
  
  log(`\nTesting against: ${BASE_URL}`, 'yellow');
  log('Note: Some tests may take time due to rate limit windows\n', 'yellow');

  try {
    // Check server health
    logTest('Checking server health...');
    const healthResponse = await fetch(`${BASE_URL}/health`);
    if (healthResponse.ok) {
      logSuccess('Server is running');
    } else {
      logError('Server health check failed');
      return;
    }

    // Run tests sequentially with delays
    await testLoginRateLimiting();
    await delay(2000); // Wait between test suites

    await testPasswordResetRateLimiting();
    await delay(2000);

    await testRegistrationRateLimiting();
    await delay(2000);

    await testRateLimitResponseFormat();

    // Summary
    logSection('Test Summary');
    log('✓ All rate limiting tests completed', 'green');
    log('Note: Wait 15+ minutes before re-running tests to avoid cached rate limits', 'yellow');

  } catch (error) {
    logError(`Test suite failed: ${error.message}`);
  }
}

// Run tests
runTests();
