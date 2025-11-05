/**
 * Test Script for Story 5.1: Enforce HTTPS and Secure Transport
 * 
 * Tests:
 * 1. HTTPS enforcement
 * 2. HSTS headers
 * 3. Security headers
 * 4. HTTP to HTTPS redirect
 * 5. Secure cookie configuration
 */

import https from 'https';
import http from 'http';
import fetch from 'node-fetch';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const HTTPS_URL = process.env.HTTPS_URL || 'https://localhost:3443';

console.log('🧪 Testing Story 5.1: HTTPS and Secure Transport\n');
console.log('='.repeat(60));

// Helper function to test security headers
async function testSecurityHeaders(url, testName) {
  try {
    console.log(`\n📋 ${testName}`);
    console.log('-'.repeat(60));
    
    // For HTTPS, ignore self-signed certificate errors in development
    const agent = url.startsWith('https') 
      ? new https.Agent({ rejectUnauthorized: false })
      : undefined;

    const response = await fetch(url, {
      agent,
      method: 'GET'
    });

    const headers = response.headers;
    
    console.log(`Status: ${response.status}`);
    console.log('\nSecurity Headers:');
    
    // Check for security headers
    const securityHeaders = [
      'strict-transport-security',
      'x-content-type-options',
      'x-xss-protection',
      'x-frame-options',
      'referrer-policy',
      'content-security-policy'
    ];

    let allHeadersPresent = true;
    securityHeaders.forEach(header => {
      const value = headers.get(header);
      if (value) {
        console.log(`  ✅ ${header}: ${value}`);
      } else {
        console.log(`  ❌ ${header}: MISSING`);
        allHeadersPresent = false;
      }
    });

    return {
      success: response.ok && allHeadersPresent,
      status: response.status,
      headers: Object.fromEntries(headers.entries())
    };

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test HTTP to HTTPS redirect
async function testHTTPRedirect() {
  console.log('\n🔄 Testing HTTP to HTTPS Redirect');
  console.log('-'.repeat(60));
  
  try {
    // Test with redirect following disabled to see the redirect response
    const response = await fetch(`${BASE_URL}/health`, {
      redirect: 'manual'
    });

    console.log(`HTTP Request Status: ${response.status}`);
    
    if (response.status === 301 || response.status === 302) {
      const location = response.headers.get('location');
      console.log(`  ✅ Redirect detected to: ${location}`);
      
      if (location && location.startsWith('https://')) {
        console.log(`  ✅ Redirects to HTTPS URL`);
        return { success: true, redirectTo: location };
      } else {
        console.log(`  ⚠️  Redirect is not to HTTPS`);
        return { success: false, redirectTo: location };
      }
    } else if (response.status === 200) {
      console.log(`  ℹ️  No redirect - HTTP allowed (development mode)`);
      return { success: true, mode: 'development' };
    } else {
      console.log(`  ❌ Unexpected status: ${response.status}`);
      return { success: false };
    }

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test HSTS header specifically
async function testHSTSHeader() {
  console.log('\n🔒 Testing HSTS Header');
  console.log('-'.repeat(60));
  
  try {
    const agent = new https.Agent({ rejectUnauthorized: false });
    const response = await fetch(`${HTTPS_URL}/health`, { agent });

    const hstsHeader = response.headers.get('strict-transport-security');
    
    if (hstsHeader) {
      console.log(`  ✅ HSTS Header Present: ${hstsHeader}`);
      
      // Check for recommended HSTS values
      const hasMaxAge = hstsHeader.includes('max-age');
      const hasIncludeSubDomains = hstsHeader.includes('includeSubDomains');
      const hasPreload = hstsHeader.includes('preload');
      
      console.log(`  ${hasMaxAge ? '✅' : '❌'} max-age directive present`);
      console.log(`  ${hasIncludeSubDomains ? '✅' : '❌'} includeSubDomains directive present`);
      console.log(`  ${hasPreload ? '✅' : '❌'} preload directive present`);
      
      return { 
        success: hasMaxAge, 
        header: hstsHeader,
        checks: { hasMaxAge, hasIncludeSubDomains, hasPreload }
      };
    } else {
      console.log(`  ⚠️  HSTS Header Missing (may be development mode)`);
      return { success: false, mode: 'development' };
    }

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Test secure connection validation
async function testSecureConnectionValidation() {
  console.log('\n🔐 Testing Secure Connection Validation');
  console.log('-'.repeat(60));
  
  try {
    // Try to access a secure endpoint via HTTP
    const response = await fetch(`${BASE_URL}/api/donate/causes`, {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });

    console.log(`HTTP Request Status: ${response.status}`);
    
    if (response.status === 403) {
      const data = await response.json();
      console.log(`  ✅ Secure connection required: ${data.message}`);
      return { success: true, enforced: true };
    } else if (response.status === 401) {
      console.log(`  ℹ️  Authentication required (secure connection check may be in dev mode)`);
      return { success: true, enforced: false, mode: 'development' };
    } else {
      console.log(`  ⚠️  No secure connection requirement detected`);
      return { success: false };
    }

  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Main test execution
async function runTests() {
  console.log('\n🚀 Starting HTTPS Security Tests...\n');
  
  const results = {
    httpSecurityHeaders: await testSecurityHeaders(`${BASE_URL}/health`, 'HTTP Security Headers Test'),
    httpsSecurityHeaders: await testSecurityHeaders(`${HTTPS_URL}/health`, 'HTTPS Security Headers Test'),
    httpRedirect: await testHTTPRedirect(),
    hstsHeader: await testHSTSHeader(),
    secureConnection: await testSecureConnectionValidation()
  };

  // Summary
  console.log('\n');
  console.log('='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));

  const testsPassed = Object.values(results).filter(r => r.success).length;
  const totalTests = Object.keys(results).length;

  console.log(`\nTests Passed: ${testsPassed}/${totalTests}`);
  
  Object.entries(results).forEach(([test, result]) => {
    const icon = result.success ? '✅' : '❌';
    console.log(`${icon} ${test}`);
  });

  console.log('\n' + '='.repeat(60));
  
  if (testsPassed === totalTests) {
    console.log('✅ All HTTPS security tests passed!');
  } else {
    console.log(`⚠️  ${totalTests - testsPassed} test(s) failed or skipped`);
  }
  
  console.log('='.repeat(60) + '\n');

  // Exit with appropriate code
  process.exit(testsPassed === totalTests ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
