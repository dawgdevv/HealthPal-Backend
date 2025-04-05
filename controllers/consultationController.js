const Consultation = require('../models/Consultation');
const Appointment = require('../models/Appointment');
const mongoose = require('mongoose');

// Create new consultation
exports.createConsultation = async (req, res) => {
  try {
    const { appointmentId, symptoms, diagnosis, notes, vitalSigns, followUpRequired, followUpDate } = req.body;
    
    // Validate required fields
    if (!appointmentId || !symptoms || !diagnosis) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    console.log('Creating consultation for appointment:', appointmentId);
    
    // Find the appointment
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      console.error('Appointment not found:', appointmentId);
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    // Check for existing consultation
    const existingConsultation = await Consultation.findOne({ appointment: appointmentId });
    if (existingConsultation) {
      console.log('Consultation already exists for this appointment, returning existing one');
      // Instead of error, return the existing consultation
      await existingConsultation.populate([
        { path: 'patient', select: 'name email profileImage' },
        { path: 'doctor', select: 'name specialization profileImage' }
      ]);
      
      return res.status(200).json({
        success: true,
        data: existingConsultation
      });
    }
    
    // Only doctors or authorized staff can create consultations
    if (req.user.role !== 'doctor' && req.user.role !== 'admin') {
      console.error('Unauthorized user tried to create consultation:', req.user._id);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create consultation'
      });
    }
    
    // Check doctor authorization for this appointment
    if (req.user.role === 'doctor' && appointment.doctor.toString() !== req.user._id.toString()) {
      console.error('Doctor not assigned to this appointment:', req.user._id);
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
    
    // Populate relevant fields for response
    await consultation.populate([
      { path: 'patient', select: 'name email profileImage' },
      { path: 'doctor', select: 'name specialization profileImage' }
    ]);
    
    res.status(201).json({
      success: true,
      data: consultation
    });
  } catch (error) {
    console.error('Error creating consultation:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Error creating consultation'
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
