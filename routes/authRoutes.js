const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middlewares/auth');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Person = require('../models/Person');
const admin = require('../config/firebase-admin');
const jwt = require('jsonwebtoken');

// Public routes
router.post('/register', authController.register);
router.post('/register-google', authController.registerGoogle);
// Make sure this route is BEFORE the protect middleware
router.post('/admin-login', authController.adminLogin);

// Fix the email/password login route
router.post('/login', async (req, res) => {
  try {
    const { email, token } = req.body;
    
    if (!email || !token) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and token'
      });
    }
    
    console.log(`Processing login for email: ${email}`);
    
    try {
      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      
      // Verify email matches token
      if (decodedToken.email !== email) {
        return res.status(401).json({
          success: false,
          message: 'Email does not match token'
        });
      }
      
      // IMPORTANT: Check Doctor model FIRST
      let user = await Doctor.findOne({ email });
      let userRole = 'doctor';
      
      // Only if not found as doctor, check patient
      if (!user) {
        user = await Patient.findOne({ email });
        userRole = 'patient';
        
        // If still not found, check generic Person model
        if (!user) {
          user = await Person.findOne({ email });
          userRole = user?.role || 'patient';
        }
      }
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found with this email'
        });
      }
      
      // Ensure Firebase UID is updated
      if (!user.firebaseUid || user.firebaseUid !== decodedToken.uid) {
        user.firebaseUid = decodedToken.uid;
        await user.save();
      }
      
      // Generate JWT with correct role
      const jwtToken = jwt.sign(
        { id: user._id, role: userRole },
        process.env.JWT_SECRET,
        { expiresIn: '30d' }
      );
      
      console.log(`Authenticated user as ${userRole}`);
      
      return res.status(200).json({
        success: true,
        token: jwtToken,
        user: {
          _id: user._id,
          id: user._id,
          name: user.name,
          email: user.email,
          role: userRole,
          profileImage: user.profileImage || null,
          specialization: user.specialization
        }
      });
      
    } catch (error) {
      console.error('Token verification error:', error);
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Fix Google authentication route
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'No token provided'
      });
    }
    
    // Verify Google token
    const decodedToken = await admin.auth().verifyIdToken(token);
    const { email, name, picture, uid } = decodedToken;
    
    // IMPORTANT: Check Doctor model FIRST
    let user = await Doctor.findOne({ email });
    let userRole = 'doctor';
    
    // Only if not found as doctor, check patient
    if (!user) {
      user = await Patient.findOne({ email });
      userRole = 'patient';
      
      if (!user) {
        user = await Person.findOne({ email });
        userRole = user?.role || 'patient';
        
        // If still no user, create a new patient
        if (!user) {
          user = await Patient.create({
            name: name || email.split('@')[0],
            email,
            firebaseUid: uid,
            profileImage: picture || '',
            role: 'patient'
          });
          userRole = 'patient';
        }
      }
    }
    
    // Update Firebase UID if needed
    if (!user.firebaseUid || user.firebaseUid !== uid) {
      user.firebaseUid = uid;
      await user.save();
    }
    
    // Generate JWT with correct role - FIX: rename token to jwtToken
    const jwtToken = jwt.sign(
      { id: user._id, role: userRole },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    
    return res.status(200).json({
      success: true,
      token: jwtToken,
      user: {
        _id: user._id,
        id: user._id,
        name: user.name,
        email: user.email,
        role: userRole,
        profileImage: user.profileImage || null,
        specialization: user.specialization
      }
    });
  } catch (error) {
    console.error('Google auth error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
});

// Add or verify this line BEFORE the protect middleware
router.post('/admin-login', authController.adminLogin);

// Protected routes should be after this
router.use(protect);
router.get('/me', authController.getMe);
router.get('/verify', authController.verifyToken);
router.put('/profile', authController.updateProfile);
router.put('/password', authController.updatePassword);
router.put('/notification-settings', authController.updateNotificationSettings);

module.exports = router;
