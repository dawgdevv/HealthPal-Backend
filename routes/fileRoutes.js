const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');
const { protect } = require('../middlewares/auth');

// Protected route to get a signed URL (requires authentication)
router.get('/signed-url/:fileId', protect, fileController.getSignedFileUrl);

// Public route to view a file with a valid signature
router.get('/view/:fileId', fileController.viewFile);

// Keep your existing route
router.get('/:fileId', protect, fileController.getSecureFile);

module.exports = router;