const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema({
  doctor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Doctor',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  slots: [{
    start: {
      type: String,  // Format: "HH:MM" in 24hr
      required: true
    },
    end: {
      type: String,  // Format: "HH:MM" in 24hr
      required: true
    },
    booked: {
      type: Boolean,
      default: false
    }
  }]
}, { timestamps: true });

// Compound index to ensure uniqueness of doctor + date combinations
availabilitySchema.index({ doctor: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Availability', availabilitySchema);