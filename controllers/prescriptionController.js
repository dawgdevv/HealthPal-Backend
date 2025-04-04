const Prescription = require('../models/Prescription');
const Consultation = require('../models/Consultation');
const mongoose = require('mongoose');

// Create new prescription
exports.createPrescription = async (req, res) => {
  try {
    const { consultationId, medications, notes, expiryDate } = req.body;
    
    // Validate required fields
    if (!consultationId || !medications || !Array.isArray(medications) || medications.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide consultation ID and medications'
      });
    }
    
    // Verify consultation exists
    const consultation = await Consultation.findById(consultationId);
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }
    
    // Only doctor who conducted the consultation can create prescription
    if (consultation.doctor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create prescription for this consultation'
      });
    }
    
    // Create prescription
    const prescription = await Prescription.create({
      consultation: consultationId,
      patient: consultation.patient,
      doctor: consultation.doctor,
      medications,
      notes,
      expiryDate: expiryDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // Default 30 days
    });
    
    // Update consultation to reference this prescription
    await Consultation.findByIdAndUpdate(
      consultationId,
      { $push: { prescriptions: prescription._id } },
      { new: true }
    );
    
    // Populate relevant fields for response
    await prescription.populate([
      {
        path: 'patient',
        select: 'name email profileImage'
      },
      {
        path: 'doctor',
        select: 'name specialization profileImage'
      }
    ]);
    
    res.status(201).json({
      success: true,
      data: prescription
    });
  } catch (error) {
    console.error('Error creating prescription:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get prescription by ID
exports.getPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate({
        path: 'consultation'
      })
      .populate({
        path: 'patient',
        select: 'name email profileImage'
      })
      .populate({
        path: 'doctor',
        select: 'name specialization profileImage'
      });
      
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    // Only allow access by the doctor, patient, or admin
    const isDoctor = req.user._id.toString() === prescription.doctor._id.toString();
    const isPatient = req.user._id.toString() === prescription.patient._id.toString();
    
    if (!isDoctor && !isPatient && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this prescription'
      });
    }
    
    res.status(200).json({
      success: true,
      data: prescription
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update the getPatientPrescriptions function
exports.getPatientPrescriptions = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    console.log('Getting prescriptions for patient:', patientId);
    console.log('User making request:', req.user._id, 'Role:', req.user.role);
    
    // Convert both IDs to strings for comparison
    const requestedPatientId = patientId.toString();
    const currentUserId = req.user._id.toString();
    
    // Fix authorization logic with string comparison
    const isAuthorized = 
      currentUserId === requestedPatientId || 
      req.user.role === 'admin' || 
      req.user.role === 'doctor';
    
    if (!isAuthorized) {
      console.log('User not authorized to view these prescriptions');
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these prescriptions'
      });
    }
    
    // Use lean() for better performance
    const prescriptions = await Prescription.find({ patient: patientId })
      .populate({
        path: 'doctor',
        select: 'name specialization profileImage'
      })
      .populate({
        path: 'consultation',
        select: 'diagnosis symptoms' 
      })
      .sort({ createdAt: -1 })
      .lean();
    
    console.log(`Found ${prescriptions.length} prescriptions for patient ${patientId}`);
    
    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  } catch (error) {
    console.error('Error in getPatientPrescriptions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get all prescriptions
exports.getAllPrescriptions = async (req, res) => {
  try {
    // For doctors, only show prescriptions they've written
    let query = {};
    if (req.user.role === 'doctor') {
      query.doctor = req.user._id;
    }
    
    const prescriptions = await Prescription.find(query)
      .populate({
        path: 'patient',
        select: 'name email profileImage'
      })
      .populate({
        path: 'doctor',
        select: 'name specialization profileImage'
      })
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  } catch (error) {
    console.error('Error getting prescriptions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update prescription
exports.updatePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    const { medications, notes, expiryDate } = req.body;
    
    const prescription = await Prescription.findById(id);
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    // Only the doctor who created the prescription or an admin can update it
    if (prescription.doctor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this prescription'
      });
    }
    
    // Update the prescription
    const updatedPrescription = await Prescription.findByIdAndUpdate(
      id,
      { 
        medications: medications || prescription.medications,
        notes: notes !== undefined ? notes : prescription.notes,
        expiryDate: expiryDate || prescription.expiryDate
      },
      { new: true }
    ).populate([
      {
        path: 'patient',
        select: 'name email profileImage'
      },
      {
        path: 'doctor',
        select: 'name specialization profileImage'
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: updatedPrescription
    });
  } catch (error) {
    console.error('Error updating prescription:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete prescription
exports.deletePrescription = async (req, res) => {
  try {
    const { id } = req.params;
    
    const prescription = await Prescription.findById(id);
    
    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: 'Prescription not found'
      });
    }
    
    // Only the doctor who created the prescription or an admin can delete it
    if (prescription.doctor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this prescription'
      });
    }
    
    // Remove prescription reference from consultation
    await Consultation.findByIdAndUpdate(
      prescription.consultation,
      { $pull: { prescriptions: prescription._id } }
    );
    
    await Prescription.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Prescription deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting prescription:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this new controller method

// Get prescriptions created by a specific doctor
exports.getDoctorPrescriptions = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;
    console.log('Getting prescriptions for doctor:', doctorId);
    
    // Verify authorization - only the doctor themselves or an admin can access
    if (req.user.role !== 'admin' && req.user._id.toString() !== doctorId) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these prescriptions'
      });
    }
    
    // Find all prescriptions where the doctor is the authenticated user
    const prescriptions = await Prescription.find({ doctor: doctorId })
      .populate({
        path: 'patient',
        select: 'name email profileImage'
      })
      .populate({
        path: 'consultation',
        select: 'diagnosis symptoms'
      })
      .sort({ createdAt: -1 });
    
    console.log(`Found ${prescriptions.length} prescriptions created by doctor ${doctorId}`);
    
    res.status(200).json({
      success: true,
      count: prescriptions.length,
      data: prescriptions
    });
  } catch (error) {
    console.error('Error fetching doctor prescriptions:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};