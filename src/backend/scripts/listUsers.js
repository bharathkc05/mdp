import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment from backend folder
dotenv.config();

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'test' });
    const users = await User.find({}, 'email firstName lastName verified').lean();
    console.log('Found users:', users);
    await mongoose.disconnect();
  } catch (err) {
    console.error('Error listing users', err);
    process.exit(1);
  }
}

listUsers();
