/**
 * Test Script for Story 4.1: Backend Aggregation of Donation Data
 * 
 * Tests:
 * 1. Aggregated donations per cause
 * 2. Dashboard performance metrics
 * 3. Category breakdown
 * 4. Top causes
 * 5. Donation trends
 * 6. Response time validation
 */

import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
let authToken = '';

console.log('🧪 Testing Story 4.1: Backend Aggregation of Donation Data\n');
console.log('='.repeat(70));

// Helper function to authenticate
async function authenticate() {
  try {
    console.log('\n🔐 Authenticating...');
    
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'donor@test.com',
        password: 'Donor123!'
      })
    });

    if (response.ok) {
      const data = await response.json();
      authToken = data.token;
      console.log('  ✅ Authentication successful');
      return true;
    } else {
      console.log('  ❌ Authentication failed');
      console.log('  ℹ️  Please ensure test users are created (run setupTestUsers.js)');
      return false;
    }
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return false;
  }
}

// Test aggregated donations endpoint
async function testAggregatedDonations() {
  console.log('\n📊 Testing Aggregated Donations Endpoint');
  console.log('-'.repeat(70));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/dashboard/aggregated-donations`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`Status: ${response.status}`);
    console.log(`Response Time: ${responseTime}ms`);

    if (response.ok) {
      const data = await response.json();
      
      console.log('\n  ✅ Endpoint accessible');
      console.log(`  ✅ Found ${data.data.causes.length} causes`);
      console.log('\n  📈 Statistics:');
      console.log(`     Total Causes: ${data.data.statistics.totalCauses}`);
      console.log(`     Total Donations: $${data.data.statistics.totalDonationsCollected}`);
      console.log(`     Total Target: $${data.data.statistics.totalTargetAmount}`);
      console.log(`     Total Donors: ${data.data.statistics.totalDonors}`);
      console.log(`     Active Causes: ${data.data.statistics.activeCauses}`);
      console.log(`     Completed Causes: ${data.data.statistics.completedCauses}`);
      console.log(`     Avg Completion Rate: ${data.data.statistics.averageCompletionRate}%`);

      // Check if data includes pre-calculated fields
      if (data.data.causes.length > 0) {
        const sampleCause = data.data.causes[0];
        console.log('\n  🔍 Sample Cause Data:');
        console.log(`     Name: ${sampleCause.name}`);
        console.log(`     Category: ${sampleCause.category}`);
        console.log(`     Current Amount: $${sampleCause.currentAmount}`);
        console.log(`     Target: $${sampleCause.targetAmount}`);
        
        const hasPreCalculated = 
          'percentageAchieved' in sampleCause &&
          'remainingAmount' in sampleCause &&
          'averageDonation' in sampleCause;

        if (hasPreCalculated) {
          console.log(`     ✅ Percentage Achieved: ${sampleCause.percentageAchieved}%`);
          console.log(`     ✅ Remaining Amount: $${sampleCause.remainingAmount}`);
          console.log(`     ✅ Average Donation: $${sampleCause.averageDonation}`);
          console.log(`     ✅ Donor Count: ${sampleCause.donorCount}`);
        } else {
          console.log('     ❌ Missing pre-calculated fields');
        }
      }

      return {
        success: true,
        responseTime,
        causesCount: data.data.causes.length,
        statistics: data.data.statistics
      };
    } else {
      console.log(`  ❌ Request failed: ${response.status}`);
      return { success: false };
    }

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test category breakdown
async function testCategoryBreakdown() {
  console.log('\n📂 Testing Category Breakdown');
  console.log('-'.repeat(70));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/dashboard/category-breakdown`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`Status: ${response.status}`);
    console.log(`Response Time: ${responseTime}ms`);

    if (response.ok) {
      const data = await response.json();
      
      console.log(`  ✅ Found ${data.data.length} categories`);
      
      data.data.forEach(cat => {
        console.log(`\n  📁 ${cat.category}:`);
        console.log(`     Total Causes: ${cat.totalCauses}`);
        console.log(`     Total Donations: $${cat.totalDonations}`);
        console.log(`     Total Target: $${cat.totalTarget}`);
        console.log(`     Donors: ${cat.totalDonors}`);
        console.log(`     Completion Rate: ${cat.averageCompletion}%`);
      });

      return {
        success: true,
        responseTime,
        categoriesCount: data.data.length
      };
    } else {
      console.log(`  ❌ Request failed`);
      return { success: false };
    }

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test top causes
async function testTopCauses() {
  console.log('\n🏆 Testing Top Causes');
  console.log('-'.repeat(70));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(
      `${BASE_URL}/api/dashboard/top-causes?metric=currentAmount&limit=5`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`Status: ${response.status}`);
    console.log(`Response Time: ${responseTime}ms`);

    if (response.ok) {
      const data = await response.json();
      
      console.log(`  ✅ Retrieved top ${data.data.topCauses.length} causes`);
      
      data.data.topCauses.forEach((cause, idx) => {
        console.log(`\n  ${idx + 1}. ${cause.name}`);
        console.log(`     Category: ${cause.category}`);
        console.log(`     Amount Raised: $${cause.currentAmount}`);
        console.log(`     Target: $${cause.targetAmount}`);
        console.log(`     Donors: ${cause.donorCount}`);
        console.log(`     Completion: ${cause.percentageAchieved}%`);
      });

      return {
        success: true,
        responseTime,
        topCausesCount: data.data.topCauses.length
      };
    } else {
      console.log(`  ❌ Request failed`);
      return { success: false };
    }

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test performance metrics
async function testPerformanceMetrics() {
  console.log('\n⚡ Testing Performance Metrics');
  console.log('-'.repeat(70));
  
  try {
    const startTime = Date.now();
    
    const response = await fetch(`${BASE_URL}/api/dashboard/performance-metrics`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    console.log(`Status: ${response.status}`);
    console.log(`Response Time: ${responseTime}ms`);

    if (response.ok) {
      const data = await response.json();
      
      console.log('\n  ✅ Performance Metrics Retrieved');
      console.log('\n  📊 Causes:');
      console.log(`     Total: ${data.data.causes.totalCauses}`);
      console.log(`     Active: ${data.data.causes.activeCauses}`);
      console.log(`     Completed: ${data.data.causes.completedCauses}`);
      console.log(`     Total Raised: $${data.data.causes.totalRaised}`);
      console.log(`     Total Target: $${data.data.causes.totalTarget}`);
      console.log(`     Completion Rate: ${data.data.causes.completionRate}%`);

      console.log('\n  💰 Donations:');
      console.log(`     Total: ${data.data.donations.totalDonations}`);
      console.log(`     Total Amount: $${data.data.donations.totalAmount}`);
      console.log(`     Average: $${data.data.donations.averageDonation.toFixed(2)}`);

      console.log('\n  👥 Users:');
      console.log(`     Donors: ${data.data.users.donor || 0}`);
      console.log(`     Admins: ${data.data.users.admin || 0}`);

      // Performance check
      const performanceGood = responseTime < 1000; // Should respond in under 1 second
      console.log(`\n  ${performanceGood ? '✅' : '⚠️'} Response time: ${responseTime}ms ${performanceGood ? '(Good)' : '(Slow)'}`);

      return {
        success: true,
        responseTime,
        performanceGood,
        metrics: data.data
      };
    } else {
      console.log(`  ❌ Request failed`);
      return { success: false };
    }

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test with filters and sorting
async function testFilteringAndSorting() {
  console.log('\n🔍 Testing Filtering and Sorting');
  console.log('-'.repeat(70));
  
  try {
    const tests = [
      { name: 'Filter by Active Status', url: '/api/dashboard/aggregated-donations?status=active' },
      { name: 'Filter by Category', url: '/api/dashboard/aggregated-donations?category=education' },
      { name: 'Sort by Donors', url: '/api/dashboard/aggregated-donations?sortBy=donorCount&order=desc' },
      { name: 'Sort by Target', url: '/api/dashboard/aggregated-donations?sortBy=targetAmount&order=asc' }
    ];

    let allPassed = true;

    for (const test of tests) {
      const response = await fetch(`${BASE_URL}${test.url}`, {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`  ✅ ${test.name}: ${data.data.causes.length} causes`);
      } else {
        console.log(`  ❌ ${test.name}: Failed`);
        allPassed = false;
      }
    }

    return { success: allPassed };

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main test execution
async function runTests() {
  console.log('\n🚀 Starting Dashboard Aggregation Tests...\n');
  
  // Authenticate first
  const authenticated = await authenticate();
  if (!authenticated) {
    console.log('\n❌ Cannot proceed without authentication');
    process.exit(1);
  }

  const results = {
    aggregatedDonations: await testAggregatedDonations(),
    categoryBreakdown: await testCategoryBreakdown(),
    topCauses: await testTopCauses(),
    performanceMetrics: await testPerformanceMetrics(),
    filteringAndSorting: await testFilteringAndSorting()
  };

  // Summary
  console.log('\n');
  console.log('='.repeat(70));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(70));

  const testsPassed = Object.values(results).filter(r => r.success).length;
  const totalTests = Object.keys(results).length;

  console.log(`\nTests Passed: ${testsPassed}/${totalTests}`);
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${test}${result.responseTime ? ` (${result.responseTime}ms)` : ''}`);
  });

  // Performance summary
  console.log('\n⚡ Performance Summary:');
  const responseTimes = Object.values(results)
    .filter(r => r.responseTime)
    .map(r => r.responseTime);
  
  if (responseTimes.length > 0) {
    const avgResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    const maxResponseTime = Math.max(...responseTimes);
    console.log(`  Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
    console.log(`  Maximum Response Time: ${maxResponseTime}ms`);
    
    const performanceGood = avgResponseTime < 500 && maxResponseTime < 1000;
    console.log(`  ${performanceGood ? '✅' : '⚠️'} Performance: ${performanceGood ? 'Good' : 'Needs Optimization'}`);
  }

  console.log('\n' + '='.repeat(70));
  
  if (testsPassed === totalTests) {
    console.log('✅ All dashboard aggregation tests passed!');
  } else {
    console.log(`⚠️  ${totalTests - testsPassed} test(s) failed`);
  }
  
  console.log('='.repeat(70) + '\n');

  // Exit with appropriate code
  process.exit(testsPassed === totalTests ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
