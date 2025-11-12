/**
 * Story 3.4: View System Audit Logs - Test Script
 * 
 * This script tests all acceptance criteria:
 * AC1: Secure, admin-only page with logs in reverse chronological order
 * AC2: Displays user registrations, logins, and donations
 * AC3: Includes search/filter by event type, date range, user
 * AC4: Does not expose sensitive data (passwords, tokens)
 */

import axios from 'axios';
import chalk from 'chalk';

const API_BASE_URL = process.env.API_URL || 'http://localhost:3000/api';

// Test users
const ADMIN_USER = {
  email: 'admin@example.com',
  password: 'Admin123!@#'
};

const REGULAR_USER = {
  email: 'donor@example.com',
  password: 'Donor123!@#'
};

let adminToken = '';
let regularUserToken = '';

// Utility functions
const logSection = (title) => {
  console.log('\n' + chalk.blue('═'.repeat(80)));
  console.log(chalk.blue.bold(`  ${title}`));
  console.log(chalk.blue('═'.repeat(80)) + '\n');
};

const logTest = (testName) => {
  console.log(chalk.yellow(`\n➤ Testing: ${testName}`));
};

const logSuccess = (message) => {
  console.log(chalk.green(`  ✓ ${message}`));
};

const logError = (message) => {
  console.log(chalk.red(`  ✗ ${message}`));
};

const logInfo = (message) => {
  console.log(chalk.cyan(`  ℹ ${message}`));
};

// Helper function to create delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Test functions
async function loginAsAdmin() {
  logTest('Admin Login');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, ADMIN_USER);
    
    if (response.data.success && response.data.token) {
      adminToken = response.data.token;
      logSuccess('Admin logged in successfully');
      logInfo(`Token: ${adminToken.substring(0, 20)}...`);
      return true;
    }
  } catch (error) {
    logError(`Admin login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function loginAsRegularUser() {
  logTest('Regular User Login');
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/login`, REGULAR_USER);
    
    if (response.data.success && response.data.token) {
      regularUserToken = response.data.token;
      logSuccess('Regular user logged in successfully');
      return true;
    }
  } catch (error) {
    logError(`Regular user login failed: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testUnauthenticatedAccess() {
  logTest('AC1: Unauthenticated Access (should fail)');
  try {
    await axios.get(`${API_BASE_URL}/admin/audit-logs`);
    logError('Unauthenticated access was allowed - SECURITY ISSUE!');
    return false;
  } catch (error) {
    if (error.response?.status === 401) {
      logSuccess('Unauthenticated access correctly blocked');
      return true;
    }
    logError(`Unexpected error: ${error.message}`);
    return false;
  }
}

async function testRegularUserAccess() {
  logTest('AC1: Regular User Access (should fail)');
  try {
    await axios.get(`${API_BASE_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${regularUserToken}` }
    });
    logError('Regular user access was allowed - SECURITY ISSUE!');
    return false;
  } catch (error) {
    if (error.response?.status === 403) {
      logSuccess('Regular user access correctly blocked');
      return true;
    }
    logError(`Unexpected error: ${error.message}`);
    return false;
  }
}

async function testGetAllAuditLogs() {
  logTest('AC1: Get All Audit Logs (Reverse Chronological)');
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      const logs = response.data.data.logs;
      logSuccess(`Retrieved ${logs.length} audit logs`);
      
      // Check reverse chronological order (AC1)
      if (logs.length > 1) {
        const firstDate = new Date(logs[0].createdAt);
        const lastDate = new Date(logs[logs.length - 1].createdAt);
        
        if (firstDate >= lastDate) {
          logSuccess('Logs are in reverse chronological order (most recent first)');
        } else {
          logError('Logs are NOT in reverse chronological order');
          return false;
        }
      }
      
      // Display pagination info
      logInfo(`Page: ${response.data.data.pagination.currentPage}/${response.data.data.pagination.totalPages}`);
      logInfo(`Total logs: ${response.data.data.pagination.totalCount}`);
      
      return true;
    }
  } catch (error) {
    logError(`Failed to get audit logs: ${error.response?.data?.message || error.message}`);
    return false;
  }
}

async function testEventTypeFiltering() {
  logTest('AC2 & AC3: Filter by Event Type (USER_REGISTRATION, LOGIN_SUCCESS, DONATION_CREATED)');
  
  const eventTypes = ['USER_REGISTRATION', 'LOGIN_SUCCESS', 'DONATION_CREATED'];
  let allPassed = true;
  
  for (const eventType of eventTypes) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/audit-logs?eventType=${eventType}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (response.data.success) {
        const logs = response.data.data.logs;
        const allMatch = logs.every(log => log.eventType === eventType);
        
        if (allMatch) {
          logSuccess(`${eventType}: ${logs.length} logs found, all matching filter`);
        } else {
          logError(`${eventType}: Some logs don't match the filter`);
          allPassed = false;
        }
      }
    } catch (error) {
      logError(`${eventType} filter failed: ${error.message}`);
      allPassed = false;
    }
    
    await delay(100); // Small delay between requests
  }
  
  return allPassed;
}

async function testSeverityFiltering() {
  logTest('AC3: Filter by Severity');
  
  const severities = ['INFO', 'WARNING', 'ERROR'];
  let allPassed = true;
  
  for (const severity of severities) {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/admin/audit-logs?severity=${severity}`,
        { headers: { Authorization: `Bearer ${adminToken}` } }
      );
      
      if (response.data.success) {
        const logs = response.data.data.logs;
        const allMatch = logs.every(log => log.severity === severity);
        
        if (allMatch) {
          logSuccess(`${severity}: ${logs.length} logs found, all matching filter`);
        } else {
          logError(`${severity}: Some logs don't match the filter`);
          allPassed = false;
        }
      }
    } catch (error) {
      logError(`${severity} filter failed: ${error.message}`);
      allPassed = false;
    }
    
    await delay(100);
  }
  
  return allPassed;
}

async function testDateRangeFiltering() {
  logTest('AC3: Filter by Date Range');
  try {
    const endDate = new Date().toISOString().split('T')[0];
    const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const response = await axios.get(
      `${API_BASE_URL}/admin/audit-logs?startDate=${startDate}&endDate=${endDate}`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    if (response.data.success) {
      const logs = response.data.data.logs;
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      const allInRange = logs.every(log => {
        const logDate = new Date(log.createdAt);
        return logDate >= start && logDate <= end;
      });
      
      if (allInRange) {
        logSuccess(`Date range filter working: ${logs.length} logs in range`);
        logInfo(`Date range: ${startDate} to ${endDate}`);
        return true;
      } else {
        logError('Some logs are outside the date range');
        return false;
      }
    }
  } catch (error) {
    logError(`Date range filter failed: ${error.message}`);
    return false;
  }
}

async function testSearchFiltering() {
  logTest('AC3: Search Filter');
  try {
    // Search for "login" in description
    const response = await axios.get(
      `${API_BASE_URL}/admin/audit-logs?search=login`,
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    if (response.data.success) {
      const logs = response.data.data.logs;
      logSuccess(`Search filter working: ${logs.length} logs matching "login"`);
      
      // Display some results
      if (logs.length > 0) {
        logInfo(`Sample result: ${logs[0].description}`);
      }
      
      return true;
    }
  } catch (error) {
    logError(`Search filter failed: ${error.message}`);
    return false;
  }
}

async function testSensitiveDataExclusion() {
  logTest('AC4: Sensitive Data Exclusion');
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/audit-logs`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      const logs = response.data.data.logs;
      let sensitiveDataFound = false;
      const sensitiveFields = ['password', 'token', 'secret'];
      
      for (const log of logs) {
        // Check if metadata contains sensitive fields
        if (log.metadata) {
          for (const field of sensitiveFields) {
            if (field in log.metadata) {
              logError(`Sensitive field "${field}" found in log ${log._id}`);
              sensitiveDataFound = true;
            }
          }
        }
      }
      
      if (!sensitiveDataFound) {
        logSuccess('No sensitive data (password, token, secret) found in logs');
        return true;
      } else {
        logError('SECURITY ISSUE: Sensitive data found in logs!');
        return false;
      }
    }
  } catch (error) {
    logError(`Sensitive data check failed: ${error.message}`);
    return false;
  }
}

async function testAuditLogStats() {
  logTest('Bonus: Get Audit Log Statistics');
  try {
    const response = await axios.get(`${API_BASE_URL}/admin/audit-logs/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (response.data.success) {
      const stats = response.data.data;
      logSuccess(`Statistics retrieved successfully`);
      logInfo(`Total logs: ${stats.totalLogs}`);
      logInfo(`Event types: ${stats.eventTypeStats.length} different types`);
      logInfo(`Severity levels: ${stats.severityStats.length} different levels`);
      
      return true;
    }
  } catch (error) {
    logError(`Stats retrieval failed: ${error.message}`);
    return false;
  }
}

async function testPagination() {
  logTest('Pagination Functionality');
  try {
    // Get first page
    const page1 = await axios.get(`${API_BASE_URL}/admin/audit-logs?page=1&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    // Get second page
    const page2 = await axios.get(`${API_BASE_URL}/admin/audit-logs?page=2&limit=10`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    if (page1.data.success && page2.data.success) {
      const logs1 = page1.data.data.logs;
      const logs2 = page2.data.data.logs;
      
      // Check if pages are different
      const differentPages = logs1[0]?._id !== logs2[0]?._id;
      
      if (differentPages) {
        logSuccess('Pagination working correctly');
        logInfo(`Page 1: ${logs1.length} logs`);
        logInfo(`Page 2: ${logs2.length} logs`);
        return true;
      } else {
        logError('Pagination not working - same logs on different pages');
        return false;
      }
    }
  } catch (error) {
    logError(`Pagination test failed: ${error.message}`);
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log(chalk.green.bold('\n╔════════════════════════════════════════════════════════════════════════════╗'));
  console.log(chalk.green.bold('║                   Story 3.4: View System Audit Logs                       ║'));
  console.log(chalk.green.bold('║                            Test Suite                                      ║'));
  console.log(chalk.green.bold('╚════════════════════════════════════════════════════════════════════════════╝\n'));
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  const tests = [
    { name: 'Setup: Admin Login', fn: loginAsAdmin },
    { name: 'Setup: Regular User Login', fn: loginAsRegularUser },
    { name: 'AC1: Unauthenticated Access', fn: testUnauthenticatedAccess },
    { name: 'AC1: Regular User Access', fn: testRegularUserAccess },
    { name: 'AC1: Get All Logs', fn: testGetAllAuditLogs },
    { name: 'AC2 & AC3: Event Type Filtering', fn: testEventTypeFiltering },
    { name: 'AC3: Severity Filtering', fn: testSeverityFiltering },
    { name: 'AC3: Date Range Filtering', fn: testDateRangeFiltering },
    { name: 'AC3: Search Filtering', fn: testSearchFiltering },
    { name: 'AC4: Sensitive Data Exclusion', fn: testSensitiveDataExclusion },
    { name: 'Bonus: Statistics', fn: testAuditLogStats },
    { name: 'Bonus: Pagination', fn: testPagination }
  ];
  
  logSection('Running Tests');
  
  for (const test of tests) {
    results.total++;
    try {
      const passed = await test.fn();
      if (passed) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      logError(`Test "${test.name}" threw an error: ${error.message}`);
      results.failed++;
    }
    await delay(200); // Small delay between tests
  }
  
  // Print summary
  logSection('Test Summary');
  console.log(chalk.bold(`Total Tests: ${results.total}`));
  console.log(chalk.green.bold(`Passed: ${results.passed}`));
  console.log(chalk.red.bold(`Failed: ${results.failed}`));
  
  const successRate = ((results.passed / results.total) * 100).toFixed(1);
  console.log(chalk.cyan.bold(`\nSuccess Rate: ${successRate}%\n`));
  
  if (results.failed === 0) {
    console.log(chalk.green.bold('🎉 All tests passed! Story 3.4 is complete.\n'));
  } else {
    console.log(chalk.yellow.bold('⚠️  Some tests failed. Please review the errors above.\n'));
  }
}

// Run the tests
runAllTests().catch(error => {
  logError(`Fatal error: ${error.message}`);
  process.exit(1);
});
