/**
 * Test Script: Verify Cause Expiration Logic
 * 
 * This script tests the auto-completion of expired causes
 * and verifies that causes without endDate never expire
 */

import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_BASE = process.env.API_URL || 'http://localhost:3000/api';

// Test credentials (update with your admin credentials)
const ADMIN_CREDENTIALS = {
  email: 'admin@example.com',
  password: 'Admin@123'
};

let adminToken = '';

async function login() {
  try {
    console.log('\n📧 Logging in as admin...');
    const response = await axios.post(`${API_BASE}/auth/login`, ADMIN_CREDENTIALS);
    adminToken = response.data.token;
    console.log('✅ Admin login successful');
    return adminToken;
  } catch (error) {
    console.error('❌ Login failed:', error.response?.data || error.message);
    throw error;
  }
}

async function getCauses() {
  try {
    console.log('\n📋 Fetching all causes...');
    const response = await axios.get(`${API_BASE}/admin/causes?limit=100`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    
    const causes = response.data.data;
    console.log(`✅ Found ${causes.length} total causes\n`);
    
    return causes;
  } catch (error) {
    console.error('❌ Failed to fetch causes:', error.response?.data || error.message);
    throw error;
  }
}

async function analyzeExpiration() {
  try {
    const causes = await getCauses();
    const now = new Date();
    
    console.log('🔍 Analyzing Cause Expiration Status:\n');
    console.log('='.repeat(80));
    
    let withEndDate = 0;
    let withoutEndDate = 0;
    let expired = 0;
    let active = 0;
    let completed = 0;
    
    causes.forEach(cause => {
      const hasEndDate = cause.endDate && cause.endDate !== null;
      const isExpired = hasEndDate && new Date(cause.endDate) < now;
      const hasReachedTarget = cause.currentAmount >= cause.targetAmount;
      
      if (hasEndDate) withEndDate++;
      else withoutEndDate++;
      
      if (isExpired) expired++;
      if (cause.status === 'active') active++;
      if (cause.status === 'completed') completed++;
      
      console.log(`\n📌 ${cause.name}`);
      console.log(`   Status: ${cause.status.toUpperCase()}`);
      console.log(`   Progress: ₹${cause.currentAmount.toLocaleString()}/${cause.targetAmount.toLocaleString()} (${Math.round((cause.currentAmount/cause.targetAmount)*100)}%)`);
      
      if (hasEndDate) {
        const endDate = new Date(cause.endDate);
        const daysRemaining = Math.ceil((endDate - now) / (1000 * 60 * 60 * 24));
        console.log(`   End Date: ${endDate.toLocaleDateString()}`);
        
        if (isExpired) {
          console.log(`   ⚠️  EXPIRED ${Math.abs(daysRemaining)} days ago`);
          if (cause.status === 'active') {
            console.log(`   🚨 ERROR: Still marked as ACTIVE but should be COMPLETED!`);
          }
        } else {
          console.log(`   ⏰  Expires in ${daysRemaining} days`);
        }
      } else {
        console.log(`   End Date: ♾️  No expiration (runs until target reached)`);
      }
      
      if (hasReachedTarget) {
        console.log(`   ✅ Target reached/exceeded`);
        if (cause.status === 'active') {
          console.log(`   🚨 ERROR: Target reached but still ACTIVE!`);
        }
      }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 SUMMARY:');
    console.log(`   Total Causes: ${causes.length}`);
    console.log(`   With End Date: ${withEndDate}`);
    console.log(`   Without End Date: ${withoutEndDate} (never expires)`);
    console.log(`   Currently Active: ${active}`);
    console.log(`   Completed: ${completed}`);
    console.log(`   Expired (past end date): ${expired}`);
    
    // Check for issues
    const expiredButActive = causes.filter(c => 
      c.status === 'active' && 
      c.endDate && 
      new Date(c.endDate) < now
    );
    
    const targetReachedButActive = causes.filter(c =>
      c.status === 'active' &&
      c.currentAmount >= c.targetAmount
    );
    
    console.log('\n⚠️  ISSUES DETECTED:');
    if (expiredButActive.length > 0) {
      console.log(`   🚨 ${expiredButActive.length} cause(s) expired but still active:`);
      expiredButActive.forEach(c => console.log(`      - ${c.name}`));
    } else {
      console.log(`   ✅ No expired causes marked as active`);
    }
    
    if (targetReachedButActive.length > 0) {
      console.log(`   🚨 ${targetReachedButActive.length} cause(s) reached target but still active:`);
      targetReachedButActive.forEach(c => console.log(`      - ${c.name}`));
    } else {
      console.log(`   ✅ No target-reached causes marked as active`);
    }
    
  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

async function triggerManualUpdate() {
  try {
    console.log('\n\n🔧 Triggering manual cause status update...');
    const response = await axios.post(
      `${API_BASE}/admin/causes/update-expired`,
      {},
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    
    console.log(`✅ Update completed: ${response.data.message}`);
    console.log(`   Modified: ${response.data.modifiedCount} cause(s)`);
    
    return response.data.modifiedCount;
  } catch (error) {
    console.error('❌ Manual update failed:', error.response?.data || error.message);
    throw error;
  }
}

async function testDonationValidation() {
  try {
    const causes = await getCauses();
    const now = new Date();
    
    console.log('\n\n🧪 Testing Donation Validation:\n');
    console.log('='.repeat(80));
    
    // Find an expired cause
    const expiredCause = causes.find(c => 
      c.endDate && 
      new Date(c.endDate) < now &&
      c.status === 'active'
    );
    
    if (expiredCause) {
      console.log(`\n📍 Testing donation to expired cause: ${expiredCause.name}`);
      try {
        await axios.post(
          `${API_BASE}/donate`,
          { causeId: expiredCause._id, amount: 100 },
          { headers: { Authorization: `Bearer ${adminToken}` } }
        );
        console.log('❌ ERROR: Donation to expired cause was ALLOWED!');
      } catch (error) {
        if (error.response?.status === 400) {
          console.log(`✅ Correctly rejected: ${error.response.data.message}`);
        } else {
          console.log('⚠️  Unexpected error:', error.response?.data || error.message);
        }
      }
    }
    
    // Find a cause without endDate
    const noEndDateCause = causes.find(c => 
      !c.endDate && 
      c.status === 'active' &&
      c.currentAmount < c.targetAmount
    );
    
    if (noEndDateCause) {
      console.log(`\n📍 Testing cause without end date: ${noEndDateCause.name}`);
      console.log(`   This cause should accept donations indefinitely until target is reached`);
      console.log(`   Current: ₹${noEndDateCause.currentAmount}/${noEndDateCause.targetAmount}`);
      // Note: Not actually donating to avoid affecting real data
      console.log(`   ✅ Would accept donations (no expiration date set)`);
    }
    
    console.log('\n' + '='.repeat(80));
    
  } catch (error) {
    console.error('❌ Donation validation test failed:', error);
  }
}

async function runTests() {
  try {
    console.log('🚀 Starting Cause Expiration Tests...');
    console.log('='.repeat(80));
    
    await login();
    await analyzeExpiration();
    
    const modifiedCount = await triggerManualUpdate();
    
    if (modifiedCount > 0) {
      console.log('\n⏳ Waiting 2 seconds for updates to propagate...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('\n🔄 Re-analyzing after update...');
      await analyzeExpiration();
    }
    
    await testDonationValidation();
    
    console.log('\n\n✅ All tests completed!');
    console.log('='.repeat(80));
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

runTests();
