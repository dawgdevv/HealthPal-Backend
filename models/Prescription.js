const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
  consultation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Consultation',
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
  medications: [{
    name: {
      type: String,
      required: true
    },
    dosage: {
      type: String,
      required: true
    },
    frequency: {
      type: String,
      required: true
    },
    duration: {
      type: String,
      required: true
    },
    instructions: String,
    quantity: String
  }],
  notes: String,
  isActive: {
    type: Boolean,
    default: true
  },
  expiryDate: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Prescription = mongoose.model('Prescription', prescriptionSchema);

module.exports = Prescription;