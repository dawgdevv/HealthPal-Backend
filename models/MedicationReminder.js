const mongoose = require('mongoose');

const medicationReminderSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  medicineName: {
    type: String,
    required: true
  },
  dosage: {
    type: String,
    required: true
  },
  frequency: {
    type: String,
    enum: ['once_daily', 'twice_daily', 'three_times_daily', 'every_other_day', 'weekly'],
    default: 'once_daily'
  },
  time: {
    type: String, // Format: "HH:MM"
    required: true
  },
  notes: {
    type: String
  },
  lastTaken: {
    type: Date
  },
  prescriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription',
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const MedicationReminder = mongoose.model('MedicationReminder', medicationReminderSchema);

module.exports = MedicationReminder;