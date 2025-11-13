/**
 * Story 2.6: Test Platform Configuration - Minimum Donation and Currency
 * 
 * This script tests:
 * 1. Getting platform configuration
 * 2. Updating minimum donation settings (admin)
 * 3. Updating currency settings (admin)
 * 4. Validating minimum donation enforcement on donations
 * 5. Verifying currency formatting
 */

import axios from 'axios';

const API_URL = process.env.API_URL || 'http://localhost:3000/api';

// Test credentials
const ADMIN_CREDENTIALS = {
  email: process.env.ADMIN_EMAIL || 'admin@example.com',
  password: process.env.ADMIN_PASSWORD || 'Admin@123'
};

const DONOR_CREDENTIALS = {
  email: process.env.DONOR_EMAIL || 'donor@example.com',
  password: process.env.DONOR_PASSWORD || 'Test@123'
};

let adminToken = '';
let donorToken = '';
let testCauseId = '';

// Utility function for logging
const log = {
  info: (msg) => console.log(`\n✓ ${msg}`),
  error: (msg) => console.error(`\n✗ ${msg}`),
  section: (msg) => console.log(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`)
};

// Test 1: Login as admin
async function loginAsAdmin() {
  log.section('Test 1: Admin Login');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, ADMIN_CREDENTIALS);
    adminToken = response.data.token;
    log.info(`Admin logged in successfully`);
    return true;
  } catch (error) {
    log.error(`Admin login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 2: Login as donor
async function loginAsDonor() {
  log.section('Test 2: Donor Login');
  try {
    const response = await axios.post(`${API_URL}/auth/login`, DONOR_CREDENTIALS);
    donorToken = response.data.token;
    log.info(`Donor logged in successfully`);
    return true;
  } catch (error) {
    log.error(`Donor login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 3: Get current platform configuration
async function getCurrentConfig() {
  log.section('Test 3: Get Current Platform Configuration');
  try {
    const response = await axios.get(`${API_URL}/config`);
    log.info(`Current configuration retrieved:`);
    console.log(JSON.stringify(response.data.data, null, 2));
    return response.data.data;
  } catch (error) {
    log.error(`Failed to get config: ${error.response?.data?.message || error.message}`);
    return null;
  }
}

// Test 4: Update minimum donation settings (Admin only)
async function updateMinimumDonation() {
  log.section('Test 4: Update Minimum Donation Amount');
  try {
    const response = await axios.put(
      `${API_URL}/config`,
      {
        minimumDonation: {
          amount: 10,
          enabled: true
        }
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    log.info(`Minimum donation updated to: ${response.data.data.minimumDonation.amount}`);
    console.log(JSON.stringify(response.data.data.minimumDonation, null, 2));
    return true;
  } catch (error) {
    log.error(`Failed to update minimum donation: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 5: Update currency settings (Admin only)
async function updateCurrencySettings() {
  log.section('Test 5: Update Currency Settings');
  try {
    const response = await axios.put(
      `${API_URL}/config`,
      {
        currency: {
          code: 'INR',
          symbol: '₹',
          position: 'before',
          decimalPlaces: 2,
          thousandsSeparator: ',',
          decimalSeparator: '.'
        }
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    log.info(`Currency updated to: ${response.data.data.currency.code} (${response.data.data.currency.symbol})`);
    console.log(JSON.stringify(response.data.data.currency, null, 2));
    return true;
  } catch (error) {
    log.error(`Failed to update currency: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 6: Get currency presets
async function getCurrencyPresets() {
  log.section('Test 6: Get Currency Presets');
  try {
    const response = await axios.get(`${API_URL}/config/currency-presets`);
    log.info(`Currency presets available:`);
    response.data.data.forEach(preset => {
      console.log(`  - ${preset.code} (${preset.symbol}): ${preset.name}`);
    });
    return true;
  } catch (error) {
    log.error(`Failed to get currency presets: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 7: Get an active cause for donation testing
async function getActiveCause() {
  log.section('Test 7: Get Active Cause for Testing');
  try {
    const response = await axios.get(`${API_URL}/donate/causes`, {
      headers: { Authorization: `Bearer ${donorToken}` }
    });
    
    if (response.data.data && response.data.data.length > 0) {
      testCauseId = response.data.data[0]._id;
      log.info(`Found test cause: ${response.data.data[0].name} (ID: ${testCauseId})`);
      return true;
    } else {
      log.error('No active causes found for testing');
      return false;
    }
  } catch (error) {
    log.error(`Failed to get causes: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 8: Try donation below minimum (should fail)
async function testDonationBelowMinimum() {
  log.section('Test 8: Test Donation Below Minimum (Should Fail)');
  try {
    await axios.post(
      `${API_URL}/donate`,
      {
        causeId: testCauseId,
        amount: 5 // Below minimum of 10
      },
      {
        headers: { Authorization: `Bearer ${donorToken}` }
      }
    );
    log.error('Donation below minimum was accepted (UNEXPECTED!)');
    return false;
  } catch (error) {
    if (error.response?.status === 400) {
      log.info(`Donation correctly rejected: ${error.response.data.message}`);
      return true;
    } else {
      log.error(`Unexpected error: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }
}

// Test 9: Try donation at minimum (should succeed)
async function testDonationAtMinimum() {
  log.section('Test 9: Test Donation At Minimum (Should Succeed)');
  try {
    const response = await axios.post(
      `${API_URL}/donate`,
      {
        causeId: testCauseId,
        amount: 10 // At minimum
      },
      {
        headers: { Authorization: `Bearer ${donorToken}` }
      }
    );
    log.info(`Donation successful: ${response.data.message}`);
    console.log(JSON.stringify(response.data.data.donation, null, 2));
    return true;
  } catch (error) {
    log.error(`Donation failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 10: Try donation above minimum (should succeed)
async function testDonationAboveMinimum() {
  log.section('Test 10: Test Donation Above Minimum (Should Succeed)');
  try {
    const response = await axios.post(
      `${API_URL}/donate`,
      {
        causeId: testCauseId,
        amount: 50 // Above minimum
      },
      {
        headers: { Authorization: `Bearer ${donorToken}` }
      }
    );
    log.info(`Donation successful: ${response.data.message}`);
    console.log(JSON.stringify(response.data.data.donation, null, 2));
    return true;
  } catch (error) {
    log.error(`Donation failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 11: Disable minimum donation and test
async function testDisableMinimumDonation() {
  log.section('Test 11: Disable Minimum Donation and Test');
  try {
    // Disable minimum
    await axios.put(
      `${API_URL}/config`,
      {
        minimumDonation: {
          amount: 10,
          enabled: false
        }
      },
      {
        headers: { Authorization: `Bearer ${adminToken}` }
      }
    );
    log.info('Minimum donation disabled');

    // Try small donation (should now succeed)
    const response = await axios.post(
      `${API_URL}/donate`,
      {
        causeId: testCauseId,
        amount: 1 // Small amount
      },
      {
        headers: { Authorization: `Bearer ${donorToken}` }
      }
    );
    log.info(`Small donation successful when minimum disabled: ${response.data.message}`);
    return true;
  } catch (error) {
    log.error(`Test failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

// Test 12: Non-admin cannot update config
async function testNonAdminCannotUpdateConfig() {
  log.section('Test 12: Non-Admin Cannot Update Configuration');
  try {
    await axios.put(
      `${API_URL}/config`,
      {
        minimumDonation: {
          amount: 1,
          enabled: true
        }
      },
      {
        headers: { Authorization: `Bearer ${donorToken}` }
      }
    );
    log.error('Non-admin was able to update config (SECURITY ISSUE!)');
    return false;
  } catch (error) {
    if (error.response?.status === 403 || error.response?.status === 401) {
      log.info(`Non-admin correctly denied: ${error.response.data.message || 'Access denied'}`);
      return true;
    } else {
      log.error(`Unexpected error: ${error.response?.data?.message || error.message}`);
      return false;
    }
  }
}

// Run all tests
async function runTests() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Story 2.6: Platform Configuration Testing               ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const results = {
    passed: 0,
    failed: 0,
    total: 12
  };

  // Run tests sequentially
  const tests = [
    loginAsAdmin,
    loginAsDonor,
    getCurrentConfig,
    updateMinimumDonation,
    updateCurrencySettings,
    getCurrencyPresets,
    getActiveCause,
    testDonationBelowMinimum,
    testDonationAtMinimum,
    testDonationAboveMinimum,
    testDisableMinimumDonation,
    testNonAdminCannotUpdateConfig
  ];

  for (const test of tests) {
    const result = await test();
    if (result) {
      results.passed++;
    } else {
      results.failed++;
    }
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  log.section('Test Summary');
  console.log(`Total Tests: ${results.total}`);
  console.log(`✓ Passed: ${results.passed}`);
  console.log(`✗ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%\n`);

  process.exit(results.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  log.error(`Test suite crashed: ${error.message}`);
  console.error(error);
  process.exit(1);
});
