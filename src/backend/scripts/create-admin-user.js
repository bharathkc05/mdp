import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

async function createAdminUser() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://MICRODONATION:jOq58yauOA6Ihqy1@cluster0.gntn595.mongodb.net/microdonation?retryWrites=true&w=majority';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Admin user details - using admin@mdp.local as per user requirement
    const adminData = {
      firstName: 'Admin',
      lastName: 'User',
      age: 30,
      gender: 'other',
      email: 'admin@mdp.local',
      password: 'Admin@123',
      role: 'admin',
      verified: true
    };

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminData.email });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists with email:', adminData.email);
      console.log('Updating to ensure admin role...');
      
      existingAdmin.role = 'admin';
      existingAdmin.verified = true;
      await existingAdmin.save();
      
      console.log('✅ Admin user updated successfully!');
    } else {
      // Hash password
      const salt = await bcrypt.genSalt(10);
      adminData.password = await bcrypt.hash(adminData.password, salt);

      // Create admin user
      const admin = await User.create(adminData);
      console.log('✅ Admin user created successfully!');
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 ADMIN USER CREDENTIALS:');
    console.log('='.repeat(60));
    console.log(`Email:    ${adminData.email}`);
    console.log(`Password: Admin@123`);
    console.log('='.repeat(60));
    console.log('\n📝 NEXT STEPS:');
    console.log('1. Start backend server: cd src/backend && npm start');
    console.log('2. Start frontend: cd src/frontend && npm run dev');
    console.log('3. Go to: http://localhost:5173/login');
    console.log('4. Login with credentials above');
    console.log('5. Click "👑 Admin" in navbar or go to: http://localhost:5173/admin');
    console.log('='.repeat(60));

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createAdminUser();
