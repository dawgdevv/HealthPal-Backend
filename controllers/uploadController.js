const { cloudinary } = require('../config/cloudinary');
const Person = require('../models/Person');

// Upload profile image
exports.uploadProfileImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Get file path from Cloudinary
    const imageUrl = req.file.path;
    
    // Update user profile image
    await Person.findByIdAndUpdate(req.user._id, {
      profileImage: imageUrl
    });

    res.status(200).json({
      success: true,
      imageUrl,
      message: 'Profile image uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Upload medical document
exports.uploadMedicalDocument = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const documentUrl = req.file.path;
    
    res.status(200).json({
      success: true,
      documentUrl,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Simple file upload function for use with Firebase auth
exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const fileUrl = req.file.path;
    
    res.status(200).json({
      success: true,
      fileUrl,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete uploaded file
exports.deleteFile = async (req, res) => {
  try {
    const { public_id } = req.body;
    
    if (!public_id) {
      return res.status(400).json({
        success: false,
        message: 'No public_id provided'
      });
    }
    
    // Delete file from Cloudinary
    await cloudinary.uploader.destroy(public_id);
    
    res.status(200).json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};