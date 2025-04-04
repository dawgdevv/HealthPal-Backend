const MedicationReminder = require('../models/MedicationReminder');

// Get all reminders for a patient
exports.getReminders = async (req, res) => {
  try {
    const reminders = await MedicationReminder.find({ patient: req.user._id })
      .sort({ time: 1 });
    
    res.status(200).json({
      success: true,
      count: reminders.length,
      data: reminders
    });
  } catch (error) {
    console.error('Error fetching medication reminders:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create a new reminder
exports.createReminder = async (req, res) => {
  try {
    const { medicineName, dosage, frequency, time, notes, prescriptionId } = req.body;
    
    const reminderData = {
      patient: req.user._id,
      medicineName,
      dosage,
      frequency,
      time,
      notes
    };
    
    // Link to prescription if provided
    if (prescriptionId) {
      reminderData.prescriptionId = prescriptionId;
    }
    
    const reminder = await MedicationReminder.create(reminderData);
    
    res.status(201).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    console.error('Error creating medication reminder:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Mark a reminder as taken
exports.markTaken = async (req, res) => {
  try {
    const reminder = await MedicationReminder.findById(req.params.id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    if (reminder.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    reminder.lastTaken = new Date();
    await reminder.save();
    
    res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    console.error('Error marking reminder as taken:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Update a reminder
exports.updateReminder = async (req, res) => {
  try {
    let reminder = await MedicationReminder.findById(req.params.id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    if (reminder.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    reminder = await MedicationReminder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      data: reminder
    });
  } catch (error) {
    console.error('Error updating medication reminder:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a reminder
exports.deleteReminder = async (req, res) => {
  try {
    const reminder = await MedicationReminder.findById(req.params.id);
    
    if (!reminder) {
      return res.status(404).json({
        success: false,
        message: 'Reminder not found'
      });
    }
    
    if (reminder.patient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }
    
    await MedicationReminder.findByIdAndDelete(req.params.id);
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    console.error('Error deleting medication reminder:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
};