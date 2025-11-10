import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Cause from '../models/Cause.js';
import User from '../models/User.js';

dotenv.config();

const checkAndAddCauses = async () => {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Check existing causes
    const existingCauses = await Cause.find({});
    console.log(`Found ${existingCauses.length} existing causes in database`);
    
    if (existingCauses.length > 0) {
      console.log('\nExisting causes:');
      existingCauses.forEach((cause, index) => {
        console.log(`${index + 1}. ${cause.name} (${cause.category}) - Status: ${cause.status}`);
      });
      
      const activeCauses = await Cause.find({ status: 'active' });
      console.log(`\n${activeCauses.length} active causes`);
      
      process.exit(0);
    }

    console.log('\nNo causes found. Creating test causes...');

    // Find or create an admin user
    let admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.log('No admin found. Creating default admin...');
      admin = await User.create({
        name: 'Admin User',
        email: 'admin@mdp.com',
        password: 'Admin@123', // This will be hashed by the model
        role: 'admin',
        isVerified: true
      });
      console.log('✓ Admin user created');
    }

    const testCauses = [
      {
        name: 'Education for All',
        description: 'Supporting underprivileged children with quality education, school supplies, and learning resources to build a brighter future.',
        category: 'education',
        targetAmount: 50000,
        currentAmount: 15000,
        status: 'active',
        createdBy: admin._id,
        donorCount: 25
      },
      {
        name: 'Healthcare Initiative',
        description: 'Providing essential medical care, medicines, and health services to communities lacking access to proper healthcare facilities.',
        category: 'healthcare',
        targetAmount: 100000,
        currentAmount: 45000,
        status: 'active',
        createdBy: admin._id,
        donorCount: 67
      },
      {
        name: 'Clean Water Project',
        description: 'Building wells and water purification systems to provide safe drinking water to rural communities.',
        category: 'environment',
        targetAmount: 75000,
        currentAmount: 30000,
        status: 'active',
        createdBy: admin._id,
        donorCount: 42
      },
      {
        name: 'Feed the Hungry',
        description: 'Distributing nutritious meals and food supplies to homeless individuals and families in need.',
        category: 'hunger',
        targetAmount: 60000,
        currentAmount: 55000,
        status: 'active',
        createdBy: admin._id,
        donorCount: 120
      },
      {
        name: 'Animal Shelter Support',
        description: 'Supporting local animal shelters with food, medical care, and facilities for abandoned and rescued animals.',
        category: 'animals',
        targetAmount: 40000,
        currentAmount: 18000,
        status: 'active',
        createdBy: admin._id,
        donorCount: 35
      },
      {
        name: 'Disaster Relief Fund',
        description: 'Emergency response and recovery assistance for communities affected by natural disasters.',
        category: 'disaster',
        targetAmount: 150000,
        currentAmount: 90000,
        status: 'active',
        createdBy: admin._id,
        donorCount: 200
      },
      {
        name: 'Women Empowerment',
        description: 'Skills training and entrepreneurship programs to empower women and promote gender equality.',
        category: 'women',
        targetAmount: 80000,
        currentAmount: 25000,
        status: 'active',
        createdBy: admin._id,
        donorCount: 48
      },
      {
        name: 'Reforestation Drive',
        description: 'Planting trees and restoring forest ecosystems to combat climate change and preserve biodiversity.',
        category: 'environment',
        targetAmount: 55000,
        currentAmount: 12000,
        status: 'active',
        createdBy: admin._id,
        donorCount: 28
      }
    ];

    const createdCauses = await Cause.insertMany(testCauses);
    console.log(`✓ Created ${createdCauses.length} test causes\n`);
    
    console.log('Test causes created:');
    createdCauses.forEach((cause, index) => {
      console.log(`${index + 1}. ${cause.name} - ₹${cause.currentAmount}/₹${cause.targetAmount}`);
    });

    console.log('\n✓ Setup complete! You can now browse causes in the frontend.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✓ Database connection closed');
  }
};

checkAndAddCauses();
