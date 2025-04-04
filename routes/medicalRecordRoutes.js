const express = require('express');
const router = express.Router();
const {
  getRecords,
  getRecord,
  createRecord,
  updateRecord,
  deleteRecord,
  getPatientRecords
} = require('../controllers/medicalRecordController');
const { protect, authorize } = require('../controllers/authController');

router.use(protect); // All medical record routes are protected

// Get all medical records for the user
router.get('/', getRecords);

// Get single medical record
router.get('/:id', getRecord);

// Get medical records for a specific patient
router.get('/patient/:patientId', protect, getPatientRecords);

// Create medical record
router.post('/', createRecord);

// Update medical record
router.put('/:id', updateRecord);

// Delete medical record
router.delete('/:id', deleteRecord);

module.exports = router;