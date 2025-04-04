const express = require('express');
const router = express.Router();
const {
  getAppointments,
  getAppointment,
  createAppointment,
  createAppointmentByStaff,
  updateAppointmentStatus,
  cancelAppointment
} = require('../controllers/appointmentController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect); // All appointment routes are protected

// Get all appointments based on user role
router.get('/', getAppointments);

// Get single appointment
router.get('/:id', getAppointment);

// Create appointment (patients only)
router.post('/', authorize('patient'), createAppointment);

// Create appointment on behalf of patient (doctors and staff)
router.post('/admin', authorize('doctor', 'admin'), createAppointmentByStaff);

// Update appointment status
router.patch('/:id/status', updateAppointmentStatus);

// Add this route with other appointment routes
router.put('/:id/cancel', protect, cancelAppointment);

module.exports = router;