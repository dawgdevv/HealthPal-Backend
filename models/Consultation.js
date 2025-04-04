const mongoose = require('mongoose');

const consultationSchema = new mongoose.Schema({
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
    required: true
  },
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  symptoms: {
    type: String,
    required: true
  },
  diagnosis: {
    type: String,
    required: true
  },
  notes: String,
  vitalSigns: {
    temperature: String, // in °C or °F
    bloodPressure: String, // systolic/diastolic
    heartRate: String, // beats per minute
    respiratoryRate: String, // breaths per minute
    oxygenSaturation: String // percentage
  },
  startTime: {
    type: Date,
    default: Date.now
  },
  endTime: {
    type: Date
  },
  followUpRequired: {
    type: Boolean,
    default: false
  },
  followUpDate: Date,
  attachments: [{
    title: String,
    fileUrl: String,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  prescriptions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Prescription'
  }]
}, {
  timestamps: true
});

const Consultation = mongoose.model('Consultation', consultationSchema);

module.exports = Consultation;