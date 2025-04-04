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
      console.log('- User Role:', decoded.role);
      console.log('- Model Type:', decoded.modelType || 'Not specified');
      
      // Find user based on model type from token
      let user;
      
      if (decoded.modelType === 'Doctor') {
        user = await Doctor.findById(decoded.id);
      } else if (decoded.modelType === 'Patient') {
        user = await Patient.findById(decoded.id);
      } else {
        // If model type not specified, try all collections with role priority
        if (decoded.role === 'doctor') {
          user = await Doctor.findById(decoded.id);
        } else {
          user = await Patient.findById(decoded.id);
          
          if (!user) {
            user = await Person.findById(decoded.id);
          }
        }
      }
      
      // If no user found
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }
      
      // Add user and explicit role to request
      req.user = user;
      req.userRole = decoded.role; // Use role from token
      
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this route'
      });
    }
  } catch (error) {
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