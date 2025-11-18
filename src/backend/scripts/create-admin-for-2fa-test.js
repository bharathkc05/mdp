/**
 * Quick script to create an admin user for testing 2FA
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/mdp-auth';

const adminUser = {
  firstName: 'Admin',
  lastName: 'User',
  age: 30,
  gender: 'other',
  email: 'admin@mdp.local',
  password: 'Admin@123',
  role: 'admin',
  verified: true
};

async function createAdminUser() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });
    if (existingAdmin) {
      console.log(`⚠️  Admin user already exists: ${adminUser.email}`);
      console.log(`   Role: ${existingAdmin.role}`);
      console.log(`   2FA Enabled: ${existingAdmin.twoFactorEnabled || false}`);
      
      if (existingAdmin.role !== 'admin') {
        console.log('\n🔧 Updating user role to admin...');
        existingAdmin.role = 'admin';
        existingAdmin.verified = true;
        await existingAdmin.save();
        console.log('✅ User role updated to admin');
      }
    } else {
      // Create new admin user
      const admin = await User.create(adminUser);
      console.log('\n✅ Admin user created successfully!');
      console.log(`   Email: ${admin.email}`);
      console.log(`   Role: ${admin.role}`);
    }

    console.log('\n📋 Login Credentials:');
    console.log('   Email: admin@mdp.local');
    console.log('   Password: Admin@123');
    console.log('\n🎯 Next Steps:');
    console.log('   1. Go to http://localhost:5173/login');
    console.log('   2. Login with the credentials above');
    console.log('   3. Go to Dashboard');
    console.log('   4. You should see the "Two-Factor Authentication (2FA)" section');
    console.log('   5. Click "Enable 2FA" to test the feature');
    console.log('');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
