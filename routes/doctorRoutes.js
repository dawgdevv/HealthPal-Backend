const express = require('express');
const router = express.Router();
const doctorController = require('../controllers/doctorController');
const { protect, authorize } = require('../middlewares/auth');

// Add this route at the beginning of the file (before any parameter-based routes)

// Public route for getting all doctors (with filtering)
router.get('/', doctorController.getDoctors);

// IMPORTANT: Define these specific routes BEFORE any parameter-based routes
// Doctor's own data routes
router.get('/profile', protect, authorize('doctor'), doctorController.getDoctorProfile);
router.put('/profile', protect, authorize('doctor'), doctorController.updateDoctor);
router.patch('/profile', protect, authorize('doctor'), doctorController.updateDoctorPartial);
router.get('/my-appointments', protect, authorize('doctor'), doctorController.getDoctorAppointments);
router.get('/available-dates', protect, authorize('doctor'), doctorController.getDoctorOwnAvailableDates);
router.get('/time-slots', protect, authorize('doctor'), doctorController.getTimeSlots);

// Patient management routes
router.get('/patients', protect, authorize('doctor'), doctorController.getDoctorPatients);
router.get('/patients/recent', protect, authorize('doctor'), doctorController.getRecentPatients);
router.get('/patients/:patientId', protect, authorize('doctor'), doctorController.getDoctorPatientById);

// Availability management routes
router.post('/time-slots', protect, authorize('doctor'), doctorController.saveTimeSlots);
router.post('/time-slots/recurring', protect, authorize('doctor'), doctorController.saveRecurringTimeSlots);
router.delete('/time-slots', protect, authorize('doctor'), doctorController.deleteAvailability);
router.patch('/availability-status', protect, authorize('doctor'), doctorController.updateDoctorPartial);

// Add this route for doctor reviews - place it BEFORE any parameter routes
router.post('/:id/reviews', protect, doctorController.addReview);

// AFTER all specific routes, define parameter-based routes
router.get('/:id', protect, (req, res, next) => {
  if (req.user.role === 'doctor' && req.user._id.toString() !== req.params.id) {
    return res.status(403).json({
      success: false,
      message: 'Doctors can only view their own profile'
    });
  }
  next();
}, doctorController.getDoctor);

// All other parameter-based routes
router.get('/:id/available-dates', protect, doctorController.getDoctorAvailableDates);
router.get('/:id/time-slots', protect, doctorController.getDoctorAvailability);
router.put('/:id', protect, doctorController.updateDoctor);
router.put('/:id/availability', protect, authorize('doctor'), doctorController.updateAvailability);

module.exports = router;