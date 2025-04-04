const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const videoController = require('../controllers/videoController');

// Generate token for video calls
router.post('/token', protect, videoController.generateToken);

// Get call details for an appointment
router.get('/call/:appointmentId', protect, videoController.getCallDetails);

module.exports = router;