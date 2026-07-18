import mongoose from 'mongoose';
import User from './../models/User.js';

const uri = 'mongodb+srv://MICRODONATION:jOq58yauOA6Ihqy1@cluster0.gntn595.mongodb.net/mdp';

async function fetchAdmins() {
  try {
    console.log('Attempting to connect to MongoDB...');
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000
    });
    console.log('✅ Successfully connected to MongoDB!');
    
    // Fetch all admins
    const admins = await User.find({ role: 'admin' }).select('-password -donations -tokenBlacklist -backupCodes');
    
    if (admins.length === 0) {
      console.log('❌ No admin users found in the database.');
    } else {
      console.log(`✅ Found ${admins.length} admin user(s):`);
      admins.forEach((admin, index) => {
        console.log(`\nAdmin #${index + 1}:`);
        console.log(`Name:  ${admin.firstName} ${admin.lastName}`);
        console.log(`Email: ${admin.email}`);
        console.log(`ID:    ${admin._id}`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to fetch admins:');
    console.error(error);
    process.exit(1);
  }
}

fetchAdmins();
