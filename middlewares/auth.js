const jwt = require('jsonwebtoken');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Person = require('../models/Person');

// Protect routes
exports.protect = async (req, res, next) => {
  try {
    let token;
    
    // Get token from Authorization header
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
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Log decoded token information
      console.log('Token verification successful:');
      console.log('- User ID:', decoded.id);
      console.log('- User Role:', decoded.role || 'undefined');
      
      // Find user based on decoded ID
      let user;
      
      // If role is in token, use it to determine model
      if (decoded.role === 'doctor') {
        user = await Doctor.findById(decoded.id);
        
        // Check verification status for doctors
        if (user && user.verificationStatus !== 'approved') {
          return res.status(403).json({
            success: false,
            message: 'Account pending verification. Please wait for admin approval.',
            pendingVerification: true
          });
        }
      } else if (decoded.role === 'patient') {
        user = await Patient.findById(decoded.id);
      } else {
        // Try all models if role not in token or is unknown
        user = await Doctor.findById(decoded.id);
        
        if (!user) {
          user = await Patient.findById(decoded.id);
        }
        
        if (!user) {
          user = await Person.findById(decoded.id);
        }
      }
      
      // If user doesn't exist, return unauthorized
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found with this ID'
        });
      }
      
      // Set user in request
      req.user = user;
      req.userRole = decoded.role || user.role; // Maintain role from token or user
      next();
    } catch (jwtError) {
      console.error('JWT verification error:', jwtError);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error in authentication'
    });
  }
};

// Role authorization
exports.authorize = (...roles) => {
  return (req, res, next) => {
    // Use explicit role from token, fallback to user model
    const userRole = req.userRole || req.user.role;
    
    if (!roles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Role ${userRole} is not authorized to access this route`
      });
    }
    next();
  };
};
