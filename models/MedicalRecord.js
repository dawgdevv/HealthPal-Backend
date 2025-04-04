const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema({
  patient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true
  },
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  recordType: {
    type: String,
    enum: ['lab_result', 'prescription', 'diagnosis', 'imaging', 'vaccination', 'other'],
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  files: [{
    url: String,
    name: String,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  appointment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment'
  }
}, {
  timestamps: true
});

const MedicalRecord = mongoose.model('MedicalRecord', medicalRecordSchema);

module.exports = MedicalRecord;