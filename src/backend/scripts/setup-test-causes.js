/**
 * Script to create test causes for testing donation functionality
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Cause from '../models/Cause.js';
import User from '../models/User.js';

dotenv.config();

const createTestCauses = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Find admin user
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('✗ No admin user found. Please run setup-test-users first.');
      process.exit(1);
    }

    const testCauses = [
      {
        name: 'Education for All',
        description: 'Supporting underprivileged children with quality education, school supplies, and learning resources.',
        category: 'education',
        targetAmount: 5000,
        currentAmount: 0,
        status: 'active',
        createdBy: admin._id,
        donorCount: 0
      },
      {
        name: 'Healthcare Initiative',
        description: 'Providing medical care and health services to communities in need.',
        category: 'healthcare',
        targetAmount: 10000,
        currentAmount: 0,
        status: 'active',
        createdBy: admin._id,
        donorCount: 0
      },
      {
        name: 'Clean Water Project',
        description: 'Building wells and water purification systems for rural communities.',
        category: 'environment',
        targetAmount: 7500,
        currentAmount: 0,
        status: 'active',
        createdBy: admin._id,
        donorCount: 0
      }
    ];

    console.log('Creating test causes...\n');

    for (const causeData of testCauses) {
      const existingCause = await Cause.findOne({ name: causeData.name });
      if (existingCause) {
        console.log(`✓ Cause "${causeData.name}" already exists`);
      } else {
        const cause = new Cause(causeData);
        await cause.save();
        console.log(`✓ Created cause: ${causeData.name}`);
      }
    }

    console.log('\n✓ Test causes setup completed successfully!\n');
    console.log('Test Causes:');
    console.log('─────────────────────────────────────');
    const allCauses = await Cause.find({ status: 'active' });
    allCauses.forEach(cause => {
      console.log(`  Name: ${cause.name}`);
      console.log(`  Category: ${cause.category}`);
      console.log(`  Target: $${cause.targetAmount}`);
      console.log(`  Current: $${cause.currentAmount}`);
      console.log(`  Status: ${cause.status}\n`);
    });

    console.log('✓ Disconnected from MongoDB');
    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
};

createTestCauses();
