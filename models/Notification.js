const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Person',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['general', 'appointment', 'medication', 'message'],
    default: 'general'
  },
  read: {
    type: Boolean,
    default: false
  },
  data: {
    type: Object,
    default: {}
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Notification', NotificationSchema);