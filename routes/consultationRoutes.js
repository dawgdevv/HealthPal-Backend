const express = require('express');
const router = express.Router();
const {
  createConsultation,
  getConsultation,
  getPatientConsultations
} = require('../controllers/consultationController');
const { protect, authorize } = require('../controllers/authController');

router.use(protect); // All consultation routes are protected

// Create consultation (doctors only)
router.post('/', authorize('doctor', 'admin'), createConsultation);

// Get consultation by ID
router.get('/:id', getConsultation);

// Get patient's consultations
router.get('/patient/:patientId', getPatientConsultations);

module.exports = router;