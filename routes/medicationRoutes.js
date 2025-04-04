const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const {
  getReminders,
  createReminder,
  updateReminder,
  deleteReminder,
  markTaken
} = require('../controllers/medicationController');

// Apply protection to all routes
router.use(protect);

// Routes
router.get('/reminders', getReminders);
router.post('/reminders', createReminder);
router.put('/reminders/:id', updateReminder);
router.delete('/reminders/:id', deleteReminder);
router.post('/reminders/:id/taken', markTaken);

module.exports = router;