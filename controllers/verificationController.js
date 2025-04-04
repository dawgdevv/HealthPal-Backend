const VerificationRequest = require('../models/VerificationRequest');
const Doctor = require('../models/Doctor');
const Person = require('../models/Person'); // Changed from User to Person

// Get all verification requests (admin only)
exports.getAllVerificationRequests = async (req, res) => {
  try {
    // Admin-only endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access verification requests'
      });
    }
    
    const requests = await VerificationRequest.find()
      .populate({
        path: 'doctor',
        select: 'name email phone specialization licenseNumber consultationFee verificationDocuments verificationStatus'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get verification request by ID
exports.getVerificationRequest = async (req, res) => {
  try {
    const request = await VerificationRequest.findById(req.params.id)
      .populate({
        path: 'doctor',
        select: 'name email phone specialization licenseNumber consultationFee verificationDocuments verificationStatus profileImage'
      });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }
    
    // Only admin or the doctor themselves can view
    if (
      req.user.role !== 'admin' && 
      req.user._id.toString() !== request.doctor._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this verification request'
      });
    }
    
    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Approve doctor verification
exports.approveVerification = async (req, res) => {
  try {
    // Admin-only endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve verification requests'
      });
    }
    
    const request = await VerificationRequest.findById(req.params.id)
      .populate('doctor');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }
    
    // Update request status
    request.status = 'approved';
    request.adminNotes = req.body.adminNotes || 'Approved by administrator';
    await request.save();
    
    // Update doctor verification status
    await Doctor.findByIdAndUpdate(request.doctor._id, {
      verificationStatus: 'approved'
    });
    
    // Send notification to doctor
    try {
      const notificationController = require('./notificationController');
      await notificationController.sendNotification(
        request.doctor._id,
        'Account Verification Approved',
        'Your account has been verified. You can now start accepting appointments.',
        { type: 'verification_update' }
      );
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }
    
    res.status(200).json({
      success: true,
      message: 'Doctor verified successfully',
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Reject doctor verification
exports.rejectVerification = async (req, res) => {
  try {
    // Admin-only endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject verification requests'
      });
    }
    
    const { rejectionReason } = req.body;
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a reason for rejection'
      });
    }
    
    const request = await VerificationRequest.findById(req.params.id)
      .populate('doctor');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }
    
    // Update request status
    request.status = 'rejected';
    request.adminNotes = rejectionReason;
    await request.save();
    
    // Update doctor verification status
    await Doctor.findByIdAndUpdate(request.doctor._id, {
      verificationStatus: 'rejected',
      rejectionReason: rejectionReason
    });
    
    // Send notification to doctor
    try {
      const notificationController = require('./notificationController');
      await notificationController.sendNotification(
        request.doctor._id,
        'Account Verification Rejected',
        `Your account verification was rejected: ${rejectionReason}`,
        { type: 'verification_update' }
      );
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }
    
    res.status(200).json({
      success: true,
      message: 'Doctor verification rejected',
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Request additional documents
exports.requestAdditionalDocuments = async (req, res) => {
  try {
    // Admin-only endpoint
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to request additional documents'
      });
    }
    
    const { documents, adminNotes } = req.body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please specify required documents'
      });
    }
    
    const request = await VerificationRequest.findById(req.params.id)
      .populate('doctor');
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'Verification request not found'
      });
    }
    
    // Update request status
    request.status = 'additional_info_requested';
    request.adminNotes = adminNotes || 'Additional documents required for verification';
    request.additionalDocumentsRequested = documents;
    await request.save();
    
    // Send notification to doctor
    try {
      const notificationController = require('./notificationController');
      await notificationController.sendNotification(
        request.doctor._id,
        'Additional Documents Required',
        'Please provide additional documents for your account verification.',
        { 
          type: 'verification_documents_requested',
          requestId: request._id.toString()
        }
      );
    } catch (notifError) {
      console.error('Error sending notification:', notifError);
    }
    
    res.status(200).json({
      success: true,
      message: 'Additional documents requested',
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Submit verification documents (for doctors)
exports.submitVerificationDocuments = async (req, res) => {
  try {
    const { documents } = req.body;
    
    if (!documents || !Array.isArray(documents) || documents.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide document details'
      });
    }
    
    // Find the verification request
    const request = await VerificationRequest.findOne({ 
      doctor: req.user._id,
      status: { $in: ['pending', 'additional_info_requested'] }
    });
    
    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'No active verification request found'
      });
    }
    
    // Update doctor with new documents
    const doctor = await Doctor.findById(req.user._id);
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    // Add new documents to doctor's document array
    doctor.verificationDocuments = [
      ...doctor.verificationDocuments,
      ...documents
    ];
    
    await doctor.save();
    
    // Update verification request status back to pending
    request.status = 'pending';
    request.updatedAt = Date.now();
    
    // Mark requested documents as provided
    if (request.additionalDocumentsRequested && request.additionalDocumentsRequested.length > 0) {
      request.additionalDocumentsRequested = request.additionalDocumentsRequested.map(doc => {
        return { ...doc, isProvided: true };
      });
    }
    
    await request.save();
    
    // Send notification to admins
    try {
      const notificationController = require('./notificationController');
      await notificationController.sendNotificationToAdmins(
        'Verification Documents Submitted',
        `Dr. ${doctor.name} has submitted verification documents`,
        { 
          type: 'verification_documents_submitted',
          doctorId: doctor._id.toString(),
          requestId: request._id.toString()
        }
      );
    } catch (notifError) {
      console.error('Error sending admin notification:', notifError);
    }
    
    res.status(200).json({
      success: true,
      message: 'Verification documents submitted successfully',
      data: request
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get current doctor's verification status
exports.getMyVerificationStatus = async (req, res) => {
  try {
    // Only for doctors
    if (req.user.role !== 'doctor') {
      return res.status(403).json({
        success: false,
        message: 'This endpoint is only for doctors'
      });
    }
    
    const doctor = await Doctor.findById(req.user._id)
      .select('verificationStatus rejectionReason verificationDocuments');
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    // Get active verification request if exists
    const request = await VerificationRequest.findOne({ 
      doctor: req.user._id,
      status: { $in: ['pending', 'additional_info_requested'] }
    });
    
    res.status(200).json({
      success: true,
      data: {
        status: doctor.verificationStatus,
        rejectionReason: doctor.rejectionReason,
        documents: doctor.verificationDocuments,
        request: request || null
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Function to send notifications to all admins
exports.sendNotificationToAdmins = async (title, message, data = {}) => {
  try {
    const notificationController = require('./notificationController');
    const admins = await Person.find({ role: 'admin' }); // Changed from User to Person
    
    for (const admin of admins) {
      await notificationController.sendNotification(
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