const admin = require('../config/firebase-admin');
const Person = require('../models/Person');
const MedicationReminder = require('../models/MedicationReminder');
const Appointment = require('../models/Appointment');
const Notification = require('../models/Notification');

// Register device token - updated to handle different roles
exports.registerDevice = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    // Update user with FCM token
    const user = await Person.findByIdAndUpdate(
      req.user._id,
      { $addToSet: { fcmTokens: token } }, // Use addToSet to avoid duplicates
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Device registered for notifications'
    });
  } catch (error) {
    console.error('Error registering device token:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Send notification to a specific user
exports.sendNotification = async (userId, title, body, data = {}) => {
  try {
    // First, save to database
    await Notification.create({
      recipient: userId,
      title,
      message: body,
      type: data.type || 'general',
      data,
      read: false
    });
    
    // Then, send via FCM
    const user = await Person.findById(userId);
    
    if (!user || !user.fcmTokens || user.fcmTokens.length === 0) {
      console.log('No FCM tokens found for user:', userId);
      return false;
    }
    
    const message = {
      notification: {
        title,
        body
      },
      data,
      tokens: user.fcmTokens
    };
    
    // Send the notification
    const response = await admin.messaging().sendMulticast(message);
    console.log(`Successfully sent notifications: ${response.successCount}/${user.fcmTokens.length}`);
    
    // Handle failed tokens
    if (response.failureCount > 0) {
      const failedTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          failedTokens.push(user.fcmTokens[idx]);
        }
      });
      
      // Remove failed tokens
      if (failedTokens.length > 0) {
        await Person.findByIdAndUpdate(userId, {
          $pull: { fcmTokens: { $in: failedTokens } }
        });
      }
    }
    
    return response.successCount > 0;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

// Send notifications for appointments to both patient and doctor
exports.sendAppointmentNotifications = async (appointment) => {
  try {
    if (!appointment.patient || !appointment.doctor) {
      console.log('Missing patient or doctor in appointment');
      return false;
    }
    
    // Notify patient
    await exports.sendNotification(
      appointment.patient._id || appointment.patient,
      'Appointment Reminder',
      `Your appointment is scheduled for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time.start}`,
      {
        type: 'appointment',
        appointmentId: appointment._id.toString()
      }
    );
    
    // Notify doctor
    await exports.sendNotification(
      appointment.doctor._id || appointment.doctor,
      'Upcoming Appointment',
      `You have an appointment scheduled for ${new Date(appointment.date).toLocaleDateString()} at ${appointment.time.start}`,
      {
        type: 'appointment',
        appointmentId: appointment._id.toString()
      }
    );
    
    return true;
  } catch (error) {
    console.error('Error sending appointment notifications:', error);
    return false;
  }
};

// Schedule medication reminders
exports.scheduleMedicationReminders = async () => {
  try {
    // Get all active medication reminders
    const reminders = await MedicationReminder.find()
      .populate('patient');
    
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`Checking medication reminders at ${currentHour}:${currentMinute}`);
    
    // Process each reminder
    for (const reminder of reminders) {
      try {
        if (!reminder.time) continue;
        
        // Parse reminder time
        const [reminderHour, reminderMinute] = reminder.time.split(':').map(Number);
        
        // Check if it's time for this reminder
        if (reminderHour === currentHour && reminderMinute === currentMinute) {
          console.log(`Sending medication reminder for: ${reminder.medicineName}`);
          
          await exports.sendNotification(
            reminder.patient._id,
            'Medication Reminder',
            `Time to take ${reminder.medicineName} (${reminder.dosage})`,
            {
              type: 'medication',
              reminderId: reminder._id.toString()
            }
          );
        }
      } catch (err) {
        console.error(`Error processing reminder ${reminder._id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error scheduling medication reminders:', error);
  }
};

// Schedule appointment reminders - update to notify both patient and doctor
exports.scheduleAppointmentReminders = async () => {
  try {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
    
    // Find appointments for tomorrow
    const appointments = await Appointment.find({
      date: {
        $gte: tomorrow.toISOString().split('T')[0],
        $lt: dayAfterTomorrow.toISOString().split('T')[0]
      },
      status: 'scheduled'
    }).populate('patient doctor');
    
    console.log(`Found ${appointments.length} upcoming appointments for reminder`);
    
    // Send reminder for each appointment
    for (const appointment of appointments) {
      try {
        const doctorName = appointment.doctor?.name || 'your doctor';
        const patientName = appointment.patient?.name || 'your patient';
        const appointmentTime = appointment.time?.start || 'scheduled time';
        
        // Send notification at 9 AM for appointments the next day
        const currentHour = new Date().getHours();
        if (currentHour === 9) {
          // Notify patient
          await exports.sendNotification(
            appointment.patient._id,
            'Appointment Tomorrow',
            `You have an appointment with Dr. ${doctorName} tomorrow at ${appointmentTime}`,
            {
              type: 'appointment',
              appointmentId: appointment._id.toString()
            }
          );
          
          // Notify doctor
          await exports.sendNotification(
            appointment.doctor._id,
            'Appointment Tomorrow',
            `You have an appointment with ${patientName} tomorrow at ${appointmentTime}`,
            {
              type: 'appointment',
              appointmentId: appointment._id.toString()
            }
          );
        }
      } catch (err) {
        console.error(`Error processing appointment reminder: ${err.message}`);
      }
    }
  } catch (error) {
    console.error('Error scheduling appointment reminders:', error);
  }
};

// Initialize notification scheduling
exports.initializeNotificationScheduling = () => {
  // Schedule medication and appointment reminders to run every minute
  setInterval(() => {
    exports.scheduleMedicationReminders();
  }, 60 * 1000); // Every minute
  
  // Schedule appointment reminders to run every hour
  setInterval(() => {
    exports.scheduleAppointmentReminders();
  }, 60 * 60 * 1000); // Every hour
  
  console.log('Notification scheduling initialized');
};

// Add these new controller methods to handle notifications list

// Get all notifications for a user
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ 
      recipient: req.user._id 
    }).sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: notifications.length,
      data: notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Check ownership
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    notification.read = true;
    await notification.save();
    
    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Mark all notifications as read
exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id },
      { read: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a notification
exports.deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }
    
    // Check ownership
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    await notification.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this function to your notification controller

// Send notification to all admin users
exports.sendNotificationToAdmins = async (title, message, data = {}) => {
  try {
    const User = require('../models/User');
    const admins = await User.find({ role: 'admin' });
    
    for (const admin of admins) {
      await exports.sendNotification(
        admin._id,
        title,
        message,
        data
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error sending admin notifications:', error);
    return false;
  }
};






