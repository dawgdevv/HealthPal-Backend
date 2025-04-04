const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const mongoose = require('mongoose');

// Create new consultation
exports.createConsultation = async (req, res) => {
  try {
    const {
      appointmentId,
      symptoms,
      diagnosis,
      notes,
      vitalSigns,
      followUpRequired,
      followUpDate
    } = req.body;
    
    // Validate required fields
    if (!appointmentId || !symptoms || !diagnosis) {
      return res.status(400).json({
        success: false,
        message: 'Please provide appointment ID, symptoms and diagnosis'
      });
    }
    
    // Verify appointment exists
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    // Only doctor assigned to appointment can create consultation
    if (appointment.doctor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create consultation for this appointment'
      });
    }
    
    // Create consultation
    const consultation = await Consultation.create({
      appointment: appointmentId,
      patient: appointment.patient,
      doctor: appointment.doctor,
      symptoms,
      diagnosis,
      notes,
      vitalSigns: vitalSigns || {},
      followUpRequired: followUpRequired || false,
      followUpDate: followUpDate || null
    });
    
    // Update appointment status to completed
    appointment.status = 'completed';
    await appointment.save();
    
    // Populate relevant fields for response
    await consultation.populate([
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
      data: consultation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get consultation by ID
exports.getConsultation = async (req, res) => {
  try {
    const consultation = await Consultation.findById(req.params.id)
      .populate({
        path: 'appointment'
      })
      .populate({
        path: 'patient',
        select: 'name email profileImage'
      })
      .populate({
        path: 'doctor',
        select: 'name specialization profileImage'
      });
      
    if (!consultation) {
      return res.status(404).json({
        success: false,
        message: 'Consultation not found'
      });
    }
    
    // Only allow access by the doctor, patient, or admin
    const isDoctor = req.user._id.toString() === consultation.doctor._id.toString();
    const isPatient = req.user._id.toString() === consultation.patient._id.toString();
    
    if (!isDoctor && !isPatient && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this consultation'
      });
    }
    
    res.status(200).json({
      success: true,
      data: consultation
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get consultations for a patient
exports.getPatientConsultations = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    // Only allow patients to view their own consultations or doctors who treated them
    if (
      req.user._id.toString() !== patientId &&
      req.user.role !== 'admin' &&
      req.user.role !== 'doctor'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view these consultations'
      });
    }
    
    const consultations = await Consultation.find({
      patient: patientId
    })
    .populate({
      path: 'doctor',
      select: 'name specialization profileImage'
    })
    .sort({ startTime: -1 });
    
    res.status(200).json({
      success: true,
      count: consultations.length,
      data: consultations
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};