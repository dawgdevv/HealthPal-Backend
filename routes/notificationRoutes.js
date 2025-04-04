const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const notificationController = require('../controllers/notificationController');

// Apply protection to all routes
router.use(protect);

// Register device token for notifications
router.post('/register-device', notificationController.registerDevice);

// Get all notifications for current user
router.get('/', notificationController.getNotifications);

// Mark notification as read
router.put('/:id/read', notificationController.markAsRead);

// Mark all notifications as read
router.put('/read-all', notificationController.markAllAsRead);

// Delete a notification
router.delete('/:id', notificationController.deleteNotification);

module.exports = router;