const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const personSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  // Add firebaseUid field
  firebaseUid: {
    type: String,
    unique: true,
    sparse: true // Allows null values but ensures uniqueness for non-null values
  },
  password: {
    type: String,
    minlength: 6,
    select: false
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', '']
  },
  role: {
    type: String,
    enum: ['patient', 'doctor', 'admin'],
    default: 'patient'
  },
  profileImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String
  },
  notificationSettings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    appointmentReminders: {
      type: Boolean,
      default: true
    },
    medicationReminders: {
      type: Boolean,
      default: true
    },
    newsletterUpdates: {
      type: Boolean,
      default: false
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  // Add this field to the personSchema
  fcmTokens: {
    type: [String],
    default: []
  }
}, { 
  discriminatorKey: 'personType',
  timestamps: true
});

// Password hashing middleware (only used for non-Firebase auth)
personSchema.pre('save', async function(next) {
  // Skip if password is not modified or if using Firebase auth
  if (!this.isModified('password') || this.firebaseUid) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(10);
    // Hash password with salt
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password (only used for non-Firebase auth)
personSchema.methods.comparePassword = async function(enteredPassword) {
  try {
    // If using bcrypt:
    return await bcrypt.compare(enteredPassword, this.password);
    
    // If using simple comparison (not recommended for production):
    // return enteredPassword === this.password;
  } catch (error) {
    console.error("Password comparison error:", error);
    throw new Error("Password comparison failed");
  }
};

// Add this method to your Person schema

personSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    // Use proper bcrypt comparison for production
    const bcrypt = require('bcryptjs');
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    console.error("Password comparison error:", error);
    throw new Error("Password verification failed");
  }
};

const Person = mongoose.model('Person', personSchema);

module.exports = Person;