import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { logger } from '../utils/logger.js';

// Load environment from backend folder
dotenv.config();

async function listUsers() {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'test' });
    const users = await User.find({}, 'email firstName lastName verified').lean();
    logger.info({ count: users.length }, 'Found users');
    await mongoose.disconnect();
  } catch (err) {
    logger.error({ err }, 'Error listing users');
    process.exit(1);
  }
}

listUsers();
