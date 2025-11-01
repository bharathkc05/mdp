/**
 * Setup script for creating test users (Donor and Admin)
 * This script should be run before executing TC-Sec-Access-01 test
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// Test user credentials
const testUsers = [
  {
    firstName: 'Test',
    lastName: 'Donor',
    age: 25,
    gender: 'other',
    email: 'donor@test.com',
    password: 'Donor123!',
    role: 'donor',
    verified: true
  },
  {
    firstName: 'Test',
    lastName: 'Admin',
    age: 30,
    gender: 'other',
    email: 'admin@test.com',
    password: 'Admin123!',
    role: 'admin',
    verified: true
  }
];

async function setupTestUsers() {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB');

    // Create or update test users
    for (const userData of testUsers) {
      const existing = await User.findOne({ email: userData.email });
      
      if (existing) {
        console.log(`✓ User ${userData.email} already exists`);
        
        // Update role if needed
        if (existing.role !== userData.role) {
          existing.role = userData.role;
          existing.verified = true;
          await existing.save();
          console.log(`  → Updated role to ${userData.role}`);
        }
      } else {
        // Create new user (password will be hashed by pre-save hook)
        await User.create(userData);
        console.log(`✓ Created ${userData.role} user: ${userData.email}`);
      }
    }

    console.log('\n✓ Test users setup completed successfully!');
    console.log('\nTest Credentials:');
    console.log('─────────────────────────────────────');
    testUsers.forEach(user => {
      console.log(`${user.role.toUpperCase()}:`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Password: ${user.password}`);
      console.log('');
    });

    await mongoose.disconnect();
    console.log('✓ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error setting up test users:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run setup
setupTestUsers();
