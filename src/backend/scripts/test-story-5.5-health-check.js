/**
 * Test Script for Story 5.5: System Health Check Endpoint
 * 
 * This script verifies that the health check endpoint:
 * 1. Is publicly accessible via GET /health
 * 2. Returns correct JSON response with status and database connection info
 * 3. Does not expose any secrets or sensitive configuration details
 * 
 * Usage:
 *   node src/backend/scripts/test-story-5.5-health-check.js
 */

import axios from 'axios';
import chalk from 'chalk';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const HEALTH_ENDPOINT = `${BASE_URL}/health`;

// Helper function to log test results
function logTest(testName, passed, details = '') {
  if (passed) {
    console.log(chalk.green(`✓ ${testName}`));
    if (details) console.log(chalk.gray(`  ${details}`));
  } else {
    console.log(chalk.red(`✗ ${testName}`));
    if (details) console.log(chalk.red(`  ${details}`));
  }
}

function logSection(title) {
  console.log('\n' + chalk.bold.cyan(`${'='.repeat(60)}`));
  console.log(chalk.bold.cyan(title));
  console.log(chalk.bold.cyan(`${'='.repeat(60)}`));
}

function logInfo(message) {
  console.log(chalk.blue('ℹ ' + message));
}

function logSuccess(message) {
  console.log(chalk.green('✓ ' + message));
}

function logError(message) {
  console.log(chalk.red('✗ ' + message));
}

async function testHealthCheckEndpoint() {
  logSection('Story 5.5: System Health Check Endpoint Tests');
  console.log();
  
  let allTestsPassed = true;

  try {
    // Test 1: Health endpoint is accessible via GET
    logInfo('Test 1: Testing GET /health endpoint accessibility...');
    try {
      const response = await axios.get(HEALTH_ENDPOINT);
      logTest(
        'AC1: Health endpoint is publicly accessible',
        response.status === 200,
        `Status Code: ${response.status}`
      );
      
      if (response.status !== 200) {
        allTestsPassed = false;
      }

      // Test 2: Response format validation
      logInfo('\nTest 2: Validating response format...');
      const data = response.data;
      
      // Check for required fields
      const hasStatus = 'status' in data;
      logTest(
        'Response contains "status" field',
        hasStatus,
        hasStatus ? `status: ${data.status}` : 'Missing status field'
      );
      if (!hasStatus) allTestsPassed = false;

      const hasTimestamp = 'timestamp' in data;
      logTest(
        'Response contains "timestamp" field',
        hasTimestamp,
        hasTimestamp ? `timestamp: ${data.timestamp}` : 'Missing timestamp field'
      );
      if (!hasTimestamp) allTestsPassed = false;

      const hasUptime = 'uptime' in data;
      logTest(
        'Response contains "uptime" field',
        hasUptime,
        hasUptime ? `uptime: ${data.uptime}s` : 'Missing uptime field'
      );
      if (!hasUptime) allTestsPassed = false;

      const hasDatabase = 'database' in data;
      logTest(
        'Response contains "database" field',
        hasDatabase,
        hasDatabase ? `database.status: ${data.database?.status}` : 'Missing database field'
      );
      if (!hasDatabase) allTestsPassed = false;

      // Test 3: Database connection status
      logInfo('\nTest 3: Validating database connection status...');
      const dbStatus = data.database?.status;
      const validDbStatuses = ['connected', 'disconnected', 'error'];
      const isValidDbStatus = validDbStatuses.includes(dbStatus);
      logTest(
        'AC2: Database status is reported correctly',
        isValidDbStatus,
        `Database status: ${dbStatus}`
      );
      if (!isValidDbStatus) allTestsPassed = false;

      if (dbStatus === 'connected' && data.database?.responseTime) {
        logTest(
          'Database response time is reported',
          true,
          `Response time: ${data.database.responseTime}`
        );
      }

      // Test 4: Check for sensitive information (AC3)
      logInfo('\nTest 4: Checking for sensitive information exposure...');
      const responseStr = JSON.stringify(data).toLowerCase();
      
      const sensitiveKeywords = [
        'password', 'secret', 'key', 'token', 'mongodb://', 
        'connectionstring', 'apikey', 'api_key', 'credentials'
      ];
      
      let foundSensitive = [];
      sensitiveKeywords.forEach(keyword => {
        if (responseStr.includes(keyword)) {
          foundSensitive.push(keyword);
        }
      });

      logTest(
        'AC3: No secrets or sensitive configuration exposed',
        foundSensitive.length === 0,
        foundSensitive.length > 0 
          ? `Found sensitive keywords: ${foundSensitive.join(', ')}` 
          : 'No sensitive information detected'
      );
      if (foundSensitive.length > 0) allTestsPassed = false;

      // Test 5: Overall status validation
      logInfo('\nTest 5: Validating overall status...');
      const validStatuses = ['UP', 'DOWN'];
      const isValidStatus = validStatuses.includes(data.status);
      logTest(
        'Status value is either "UP" or "DOWN"',
        isValidStatus,
        `Status: ${data.status}`
      );
      if (!isValidStatus) allTestsPassed = false;

      // Display the full response
      logInfo('\nFull Health Check Response:');
      console.log(chalk.gray(JSON.stringify(data, null, 2)));

    } catch (error) {
      logError(`Failed to call health endpoint: ${error.message}`);
      if (error.response) {
        console.log(chalk.red(`  Status: ${error.response.status}`));
        console.log(chalk.red(`  Response: ${JSON.stringify(error.response.data, null, 2)}`));
      }
      allTestsPassed = false;
    }

    // Test 6: Verify endpoint doesn't require authentication
    logInfo('\nTest 6: Testing public accessibility (no authentication required)...');
    try {
      // Make a request without any authentication headers
      const unauthResponse = await axios.get(HEALTH_ENDPOINT, {
        headers: {} // Explicitly no auth headers
      });
      logTest(
        'Health endpoint accessible without authentication',
        unauthResponse.status === 200,
        'Endpoint is public as required'
      );
    } catch (error) {
      logTest(
        'Health endpoint accessible without authentication',
        false,
        `Failed with status: ${error.response?.status || 'unknown'}`
      );
      allTestsPassed = false;
    }

    // Final Summary
    logSection('Test Summary');
    if (allTestsPassed) {
      logSuccess('All tests passed! ✓');
      console.log(chalk.green('\nStory 5.5 acceptance criteria verified:'));
      console.log(chalk.green('  ✓ AC1: Public GET endpoint /health is created'));
      console.log(chalk.green('  ✓ AC2: Returns JSON with status and database connection'));
      console.log(chalk.green('  ✓ AC3: No secrets or sensitive details exposed'));
    } else {
      logError('Some tests failed. Please review the output above.');
      process.exit(1);
    }

  } catch (error) {
    logError(`Unexpected error: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// Run tests
console.log(chalk.bold.yellow('\n🏥 Starting Health Check Endpoint Tests...'));
console.log(chalk.yellow(`Base URL: ${BASE_URL}`));
console.log(chalk.yellow(`Health Endpoint: ${HEALTH_ENDPOINT}\n`));

testHealthCheckEndpoint();
