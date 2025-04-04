const express = require('express');
const router = express.Router();
const {
  getPatient,
  updatePatient,
  getPatientAppointments,
  addMedicalDocument
} = require('../controllers/patientController');
const { protect, authorize } = require('../controllers/authController');

router.get('/:id', protect, getPatient);
router.put('/:id', protect, updatePatient);
router.get('/:id/appointments', protect, getPatientAppointments);
router.post('/:id/medical-documents', protect, addMedicalDocument);

module.exports = router;