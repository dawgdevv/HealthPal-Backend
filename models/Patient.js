const mongoose = require('mongoose');
const Person = require('./Person');

const patientSchema = new mongoose.Schema({
  medicalHistory: {
    allergies: [String],
    chronicConditions: [String],
    surgeries: [{
      type: String,
      date: Date,
      description: String
    }],
    medications: [{
      name: String,
      dosage: String,
      frequency: String,
      startDate: Date,
      endDate: Date
    }]
  },
  medicalDocuments: [{
    title: String,
    description: String,
    fileUrl: String,
    fileType: String,
    uploadDate: {
      type: Date,
      default: Date.now
    }
  }],
  emergencyContact: {
    name: String,
    relationship: String,
    phone: String
  },
  insuranceInfo: {
    provider: String,
    policyNumber: String,
    groupNumber: String,
    expiryDate: Date
  },
  primaryDoctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor'
  }
});

const Patient = Person.discriminator('Patient', patientSchema);

module.exports = Patient;