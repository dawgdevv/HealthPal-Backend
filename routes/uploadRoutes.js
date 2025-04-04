const express = require('express');
const router = express.Router();
const { uploadProfile, uploadDocument } = require('../config/cloudinary');
const { uploadProfileImage, uploadMedicalDocument, uploadFile, deleteFile } = require('../controllers/uploadController');
const { protect } = require('../controllers/authController');

// Profile image upload routes
router.post('/profile', protect, uploadProfile.single('image'), uploadProfileImage);

// Medical document upload routes
router.post('/document', protect, uploadDocument.single('document'), uploadMedicalDocument);

// Generic file upload (for testing)
router.post('/file', protect, uploadDocument.single('file'), uploadFile);

// Delete file
router.delete('/file', protect, deleteFile);

module.exports = router;