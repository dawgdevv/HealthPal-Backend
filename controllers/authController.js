const Person = require('../models/Person');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const jwt = require('jsonwebtoken');
const admin = require('../config/firebase-admin');
const bcrypt = require('bcryptjs');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });
};

// Register user with Firebase
exports.register = async (req, res) => {
  try {
    const { name, email, firebaseUid, role, phone, dateOfBirth, gender } = req.body;
    
    // Check if user already exists
    const userExists = await Person.findOne({ $or: [{ email }, { firebaseUid }] });
    if (userExists) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }
    
    let user;
    
    // Create user based on role
    if (role === 'patient') {
      user = await Patient.create({
        name,
        email,
        firebaseUid,
        phone,
        dateOfBirth,
        gender,
        role
      });
    } else if (role === 'doctor') {
      // For doctors, additional information is required
      const { specialization, licenseNumber, consultationFee } = req.body;
      
      if (!specialization || !licenseNumber || !consultationFee) {
        return res.status(400).json({
          success: false,
          message: 'Please provide all required doctor information'
        });
      }
      
      // Create doctor with pending verification status
      user = await Doctor.create({
        name,
        email,
        firebaseUid,
        phone,
        dateOfBirth,
        gender,
        role,
        specialization,
        licenseNumber,
        consultationFee,
        verificationStatus: 'pending' // Set initial status as pending
      });
      
      // Create verification request
      const VerificationRequest = require('../models/VerificationRequest');
      await VerificationRequest.create({
        doctor: user._id,
        status: 'pending',
        adminNotes: `Initial verification request. License Number: ${licenseNumber}`
      });
      
      // Send notification to admins about new doctor registration
      try {
        const notificationController = require('./notificationController');
        await notificationController.sendNotificationToAdmins(
          'New Doctor Registration',
          `Dr. ${name} has registered and is awaiting verification. License: ${licenseNumber}`,
          {
            type: 'doctor_verification',
            doctorId: user._id.toString()
          }
        );
      } catch (notifError) {
        console.error('Error sending admin notification:', notifError);
      }
    } else {
      // Default to patient if invalid role
      user = await Patient.create({
        name,
        email,
        firebaseUid,
        phone,
        dateOfBirth,
        gender,
        role: 'patient'
      });
    }
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Register Google user
exports.registerGoogle = async (req, res) => {
  try {
    const { name, email, firebaseUid, profileImage } = req.body;
    
    // Check if user already exists
    let user = await Person.findOne({ firebaseUid });
    
    if (user) {
      // User already exists, return existing user
      const token = generateToken(user._id);
      
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }
    
    // Create new user as patient
    user = await Patient.create({
      name,
      email,
      firebaseUid,
      profileImage,
      role: 'patient'
    });
    
    // Generate token
    const token = generateToken(user._id);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Authenticate with Firebase token
exports.authenticateWithFirebase = async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'No ID token provided'
      });
    }
    
    // Verify the Firebase token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Find or create a user in our database based on the Firebase UID
    let user = await Person.findOne({ firebaseUid: uid });
    
    if (!user) {
      // If user doesn't exist in our database, return an error
      // Client should handle this by redirecting to complete registration
      return res.status(404).json({
        success: false,
        message: 'User not found in database. Registration needed.',
        firebaseUser: {
          uid,
          email: decodedToken.email,
          name: decodedToken.name || '',
          picture: decodedToken.picture || ''
        }
      });
    }
    
    // Generate token for our API
    const token = generateToken(user._id);
    
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Firebase authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
};

// Update this function to use Person model instead of User
exports.authenticateFirebase = async (req, res) => {
  try {
    const { idToken } = req.body;
    
    if (!idToken) {
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Find user in your database
    let user = await Person.findOne({ firebaseUid: uid });
    
    if (!user) {
      // If user doesn't exist, return information for registration
      return res.status(404).json({
        success: false,
        message: 'User not found in database. Registration needed.',
        firebaseUser: {
          uid,
          email: decodedToken.email,
          name: decodedToken.name || '',
          picture: decodedToken.picture || ''
        }
      });
    }
    
    // Generate JWT token for your own auth system
    const token = generateToken(user._id);
    
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        profileImage: user.profileImage || null
      }
    });
  } catch (error) {
    console.error('Firebase authentication error:', error);
    res.status(401).json({
      success: false,
      message: 'Invalid token or authentication failed',
      error: error.message
    });
  }
};

// Replace or modify the login function to fix the password comparison issue
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    console.log(`Authentication attempt for email: ${email}`);
    
    // Check DOCTOR model FIRST with explicit role assignment
    let user = await Doctor.findOne({ email }).select('+password');
    let userRole = 'doctor';
    
    // If not found in Doctor collection, try Patient collection
    if (!user) {
      user = await Patient.findOne({ email }).select('+password');
      userRole = 'patient';
      
      // If still not found, check Person collection as last resort
      if (!user) {
        user = await Person.findOne({ email }).select('+password');
        userRole = user?.role || 'patient';
      }
    }
    
    // If no user found with this email
    if (!user) {
      console.log(`No user found for email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // CRITICAL FIX: Use bcrypt.compare directly instead of using a method that might not exist
    const bcrypt = require('bcryptjs');
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log(`Password mismatch for email: ${email}`);
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Log successful authentication
    console.log(`User authenticated successfully:`);
    console.log(`- ID: ${user._id}`);
    console.log(`- Email: ${user.email}`);
    console.log(`- Role: ${userRole}`);
    
    // Create JWT with explicit role information
    const token = generateToken(user._id);

    // Include verification status for doctors
    const userData = {
      _id: user._id,
      id: user._id, // For compatibility
      name: user.name,
      email: user.email,
      role: userRole,
      profileImage: user.profileImage || null
    };

    // Add verification status for doctors
    if (userRole === 'doctor') {
      userData.verificationStatus = user.verificationStatus;
    }

    res.status(200).json({
      success: true,
      token,
      user: userData
    });
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Get current logged in user
exports.getMe = async (req, res) => {
  try {
    let user;
    
    // Fetch detailed user data based on role
    if (req.user.role === 'patient') {
      user = await Patient.findById(req.user._id).select('-password');
    } else if (req.user.role === 'doctor') {
      user = await Doctor.findById(req.user._id).select('-password');
    } else {
      user = await Person.findById(req.user._id).select('-password');
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Updated auth middleware to verify Firebase tokens
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Check if token exists in headers
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    
    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
    
    try {
      // First try to verify as Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      const firebaseUid = decodedToken.uid;
      
      // Find user by Firebase UID - check Doctor model first
      let user = await Doctor.findOne({ firebaseUid });
      
      // If not found in Doctor model, check Patient model
      if (!user) {
        user = await Patient.findOne({ firebaseUid });
      }
      
      // If still not found, check generic Person model
      if (!user) {
        user = await Person.findOne({ firebaseUid });
      }
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found with this Firebase account'
        });
      }
      
      req.user = user;
      next();
    } catch (firebaseError) {
      // If not a valid Firebase token, try as JWT
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Find user by MongoDB ID - check specialized models
        let user = await Doctor.findById(decoded.id);
        
        if (!user) {
          user = await Patient.findById(decoded.id);
        }
        
        if (!user) {
          user = await Person.findById(decoded.id);
        }
        
        if (!user) {
          return res.status(401).json({
            success: false,
            message: 'User not found with this token'
          });
        }
        
        req.user = user;
        next();
      } catch (jwtError) {
        return res.status(401).json({
          success: false,
          message: 'Invalid token'
        });
      }
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Server error during authentication'
    });
  }
};

// Role authorization middleware
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user.role} is not authorized to access this route`
      });
    }
    next();
  };
};

// Add this function to your controller
exports.verifyToken = async (req, res) => {
  try {
    // If the request reaches here, it means the token is valid
    // because the protect middleware has already verified it
    res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (error) {
    console.error('Error verifying token:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add these functions to your authController.js file

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    // Extract allowed fields from request body
    const { name, email, phone, gender, dateOfBirth, bio } = req.body;
    
    // Find the user by ID
    const user = await Person.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Update only the fields provided in the request
    if (name) user.name = name;
    if (phone) user.phone = phone;
    if (gender) user.gender = gender;
    if (dateOfBirth) user.dateOfBirth = dateOfBirth;
    if (bio) user.bio = bio;
    
    // Handle email updates separately if included (might require verification)
    if (email && email !== user.email) {
      // For security, email changes should be verified
      // Here you could implement a verification flow
      // For now, just update it directly
      user.email = email;
    }
    
    // Save the updated user
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        name: user.name,
        email: user.email,
        phone: user.phone,
        gender: user.gender,
        dateOfBirth: user.dateOfBirth,
        bio: user.bio,
        profileImage: user.profileImage,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating profile'
    });
  }
};

// Replace the updatePassword function with this implementation

exports.updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Input validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Both current and new password are required'
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }
    
    // Get user with password
    const user = await Person.findById(req.user._id).select('+password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Since we know the model is using plain text comparison currently
    const isMatch = (currentPassword === user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash the new password
    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update user password
    user.password = hashedPassword;
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Password update error:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating your password'
    });
  }
};

// Add this function for notification settings
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { emailNotifications, appointmentReminders, medicationReminders, newsletterUpdates } = req.body;
    
    const user = await Person.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Initialize notification settings object if it doesn't exist
    if (!user.notificationSettings) {
      user.notificationSettings = {};
    }
    
    // Update notification settings
    user.notificationSettings = {
      emailNotifications: emailNotifications !== undefined ? emailNotifications : user.notificationSettings.emailNotifications,
      appointmentReminders: appointmentReminders !== undefined ? appointmentReminders : user.notificationSettings.appointmentReminders,
      medicationReminders: medicationReminders !== undefined ? medicationReminders : user.notificationSettings.medicationReminders,
      newsletterUpdates: newsletterUpdates !== undefined ? newsletterUpdates : user.notificationSettings.newsletterUpdates
    };
    
    await user.save();
    
    return res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: user.notificationSettings
    });
  } catch (error) {
    console.error('Error updating notification settings:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating notification settings'
    });
  }
};

// Replace or update the Google authentication function

exports.googleAuth = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    console.log('Processing Google authentication token');
    
    // Verify with Firebase Admin SDK
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (!decodedToken) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    const { email, name, picture, uid } = decodedToken;
    console.log('Decoded token for email:', email);
    
    // First try to find user in Doctor collection
    let user = await Doctor.findOne({ email });
    let userRole = 'patient'; // Default role
    
    if (user) {
      console.log('Found doctor account:', user._id);
      userRole = 'doctor';
    } else {
      // Try to find in Patient collection
      user = await Patient.findOne({ email });
      
      if (!user) {
        // If no user exists, create a new patient
        console.log('Creating new patient account for:', email);
        user = await Patient.create({
          name: name || email.split('@')[0],
          email,
          firebaseUid: uid,
          profileImage: picture || ''
        });
      }
    }
    
    // Update Firebase UID if not already set
    if (!user.firebaseUid) {
      user.firebaseUid = uid;
      await user.save();
    }
    
    // Generate JWT token
    const jwtToken = jwt.sign(
      { id: user._id, role: userRole },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    console.log(`Authenticated as ${userRole}`);
    
    // Return successful response
    return res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: userRole,
        profileImage: user.profileImage || null
      }
    });
  } catch (error) {
    console.error('Google authentication error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'An unexpected error occurred'
    });
  }
};

// Add this new controller method

// Admin login endpoint - fix the implementation
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Always prioritize environment variable admin
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      // Find or create the admin
      let admin = await Person.findOne({ email: process.env.ADMIN_EMAIL, role: 'admin' });
      
      if (!admin) {
        admin = await Person.create({
          name: 'System Admin',
          email: process.env.ADMIN_EMAIL,
          password: process.env.ADMIN_PASSWORD, // Store password as plain text
          role: 'admin',
          isActive: true
        });
      }
      
      const token = generateToken(admin._id);
      
      return res.status(200).json({
        success: true,
        token,
        user: {
          id: admin._id,
          name: admin.name || 'System Admin',
          email: admin.email,
          role: 'admin'
        }
      });
    }
    
    return res.status(401).json({
      success: false,
      message: 'Invalid admin credentials'
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during admin authentication'
    });
  }
};
