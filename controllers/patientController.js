const Patient = require('../models/Patient');
const Appointment = require('../models/Appointment');
const mongoose = require('mongoose');

// Get patient profile
exports.getPatient = async (req, res) => {
  try {
    // Only allow patients to view their own profile or admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this profile'
      });
    }
    
    const patient = await Patient.findById(req.params.id)
      .select('-password -__v')
      .populate({
        path: 'primaryDoctor',
        select: 'name specialization profileImage consultationFee'
      });
      
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update patient profile
exports.updatePatient = async (req, res) => {
  try {
    // Prevent updating critical fields
    const { firebaseUid, role, password, ...updateData } = req.body;
    
    // Only allow patients to update their own profile or admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile'
      });
    }
    
    const patient = await Patient.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password -__v');
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: patient
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get patient's appointments
exports.getPatientAppointments = async (req, res) => {
  try {
    // Only allow patients to view their own appointments or admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these appointments'
      });
    }
    
    const appointments = await Appointment.find({
      patient: req.params.id
    }).populate({
      path: 'doctor',
      select: 'name specialization profileImage consultationFee'
    }).sort({ date: -1 });
    
    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add medical document
exports.addMedicalDocument = async (req, res) => {
  try {
    const { title, description, fileUrl, fileType } = req.body;
    
    // Validate required fields
    if (!title || !fileUrl || !fileType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide title, fileUrl and fileType'
      });
    }
    
    // Only allow patients to add to their own records or admin
    if (req.user.role !== 'admin' && req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add documents to this patient'
      });
    }
    
    const patient = await Patient.findById(req.params.id);
    
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Add new medical document
    patient.medicalDocuments.push({
      title,
      description,
      fileUrl,
      fileType,
      uploadDate: Date.now()
    });
    
    await patient.save();
    
    res.status(200).json({
      success: true,
      data: patient.medicalDocuments[patient.medicalDocuments.length - 1],
      message: 'Medical document added successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};