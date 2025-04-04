const mongoose = require('mongoose');

const verificationRequestSchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'additional_info_requested'],
    default: 'pending'
  },
  
  adminNotes: String,
  
  additionalDocumentsRequested: [{
    documentType: String,
    description: String,
    isRequired: {
      type: Boolean,
      default: true
    },
    isProvided: {
      type: Boolean,
      default: false
    }
  }],
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

verificationRequestSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const VerificationRequest = mongoose.model('VerificationRequest', verificationRequestSchema);
module.exports = VerificationRequest;