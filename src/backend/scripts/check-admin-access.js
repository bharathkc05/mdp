import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

async function checkAdminAccess() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://MICRODONATION:jOq58yauOA6Ihqy1@cluster0.gntn595.mongodb.net/microdonation?retryWrites=true&w=majority';
    
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all admin users
    const adminUsers = await User.find({ role: 'admin' }).select('firstName lastName email role');
    
    console.log('\n👑 ADMIN USERS IN DATABASE:');
    console.log('=' .repeat(50));
    
    if (adminUsers.length === 0) {
      console.log('❌ NO ADMIN USERS FOUND!');
      console.log('\nYou need to create an admin user or change an existing user to admin role.');
      
      // Show all users
      const allUsers = await User.find().select('firstName lastName email role');
      console.log('\n📋 ALL USERS:');
      allUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName} (${user.email}) - Role: ${user.role}`);
      });
      
    } else {
      adminUsers.forEach((user, index) => {
        console.log(`${index + 1}. ${user.firstName} ${user.lastName}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log('');
      });
      
      console.log(`\n✅ Found ${adminUsers.length} admin user(s)`);
      console.log('\n📝 TO ACCESS ADMIN DASHBOARD:');
      console.log('1. Make sure backend is running (npm start in backend folder)');
      console.log('2. Make sure frontend is running (npm run dev in frontend folder)');
      console.log('3. Login with one of the admin emails above');
      console.log('4. Navigate to http://localhost:5173/admin');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

checkAdminAccess();
