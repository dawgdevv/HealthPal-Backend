const express = require('express');
const router = express.Router();
const prescriptionController = require('../controllers/prescriptionController');
const { protect, authorize } = require('../middlewares/auth');

// Apply protection to all routes
router.use(protect);

// Get all prescriptions (for doctors and admins)
router.get('/', prescriptionController.getAllPrescriptions);

// IMPORTANT: More specific routes must come BEFORE generic parameter routes
// Get patient's prescriptions
router.get('/patient/:patientId', prescriptionController.getPatientPrescriptions);

// Add this new route for doctor's prescriptions
router.get('/doctor/:doctorId', prescriptionController.getDoctorPrescriptions);

// Get prescription by ID - generic parameter route comes AFTER specific routes
router.get('/:id', prescriptionController.getPrescription);

// Create prescription (doctors only)
router.post('/', authorize('doctor', 'admin'), prescriptionController.createPrescription);

// Update prescription (doctors only)
router.put('/:id', authorize('doctor', 'admin'), prescriptionController.updatePrescription);

// Delete prescription (doctors only)
router.delete('/:id', authorize('doctor', 'admin'), prescriptionController.deletePrescription);

module.exports = router;