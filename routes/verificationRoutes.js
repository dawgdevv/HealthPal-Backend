const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { protect, authorize } = require('../middlewares/auth'); // Fixed path and import

// Protect all routes
router.use(protect);

// Routes for admins to manage verification
router.get('/admin/verification-requests', protect, authorize('admin'), verificationController.getAllVerificationRequests);
router.get('/admin/verification-requests/:id', protect, authorize('admin'), verificationController.getVerificationRequest);
router.post('/admin/verification-requests/:id/approve', protect, authorize('admin'), verificationController.approveVerification);
router.post('/admin/verification-requests/:id/reject', protect, authorize('admin'), verificationController.rejectVerification);
router.post('/admin/verification-requests/:id/request-documents', protect, authorize('admin'), verificationController.requestAdditionalDocuments);

// Routes for doctors to manage their verification
router.get('/doctors/verification-status', authorize('doctor'), verificationController.getMyVerificationStatus);
router.post('/doctors/verification-documents', authorize('doctor'), verificationController.submitVerificationDocuments);

module.exports = router;