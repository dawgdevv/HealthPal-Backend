require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Configure MongoDB connection
const connectDB = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('Database connection error:', err.message);
    process.exit(1);
  }
};

// Create Admin user
const createAdmin = async () => {
  try {
    // Import Person model
    const Person = require('../models/Person');

    // Admin details - customize as needed
    const adminDetails = {
      name: process.argv[2] || "Admin User",
      email: process.argv[3] || "admin@healthpal.com",
      password: process.argv[4] || "admin123456", // You should change this
      role: "admin",
      isActive: true,
      createdAt: new Date()
    };

    // Check if admin with this email already exists
    const existingAdmin = await Person.findOne({ email: adminDetails.email });
    if (existingAdmin) {
      console.log(`Admin with email ${adminDetails.email} already exists`);
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminDetails.password, salt);
    adminDetails.password = hashedPassword;

    // Create admin user
    const admin = await Person.create(adminDetails);
    
    console.log('Admin user created successfully:');
    console.log(`- ID: ${admin._id}`);
    console.log(`- Name: ${admin.name}`);
    console.log(`- Email: ${admin.email}`);
    console.log(`- Role: ${admin.role}`);
    console.log('\nYou can now login with these credentials.');

  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    // Disconnect from database
    mongoose.disconnect();
    console.log('Database connection closed');
  }
};

// Run script
(async () => {
  // Display usage information
  if (process.argv.includes('--help')) {
    console.log('Usage: node createAdmin.js [name] [email] [password]');
    console.log('Example: node createAdmin.js "System Admin" admin@healthpal.com securepassword123');
    process.exit(0);
  }

  await connectDB();
  await createAdmin();
})();