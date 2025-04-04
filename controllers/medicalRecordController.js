const MedicalRecord = require('../models/MedicalRecord');

// Get medical records for a patient
exports.getRecords = async (req, res) => {
  try {
    let query = {};
    
    // Patients can only see their own records
    if (req.user.role === 'patient') {
      query.patient = req.user._id;
    } 
    // Doctors can only see records they created or are shared with them
    else if (req.user.role === 'doctor') {
      // If patientId is specified, check if the doctor has permission for this patient
      if (req.query.patientId) {
        // TODO: Add logic to check if doctor has permission to view this patient's records
        query.patient = req.query.patientId;
      } else {
        query.doctor = req.user._id;
      }
    }
    
    // Record type filter
    if (req.query.recordType) {
      query.recordType = req.query.recordType;
    }
    
    // Date range filter
    if (req.query.startDate && req.query.endDate) {
      query.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }
    
    const records = await MedicalRecord.find(query)
      .populate('patient', 'name email')
      .populate('doctor', 'name specialization')
      .sort({ date: -1 });
    
    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get a single medical record
exports.getRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patient', 'name email')
      .populate('doctor', 'name specialization');
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    
    // Check if the user is authorized to view the record
    if (
      req.user.role === 'patient' && 
      record.patient._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this record'
      });
    }
    
    if (
      req.user.role === 'doctor' && 
      record.doctor && 
      record.doctor._id.toString() !== req.user._id.toString() &&
      record.isPrivate
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this private record'
      });
    }
    
    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Create a medical record
exports.createRecord = async (req, res) => {
  try {
    const { title, description, recordType, patientId, isPrivate, files } = req.body;
    
    // Validate required fields
    if (!title || !description || !recordType) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Determine the patient ID based on user role
    let patient;
    
    if (req.user.role === 'patient') {
      // Patients can only create records for themselves
      patient = req.user._id;
    } else if (req.user.role === 'doctor') {
      // Doctors need to specify the patient
      if (!patientId) {
        return res.status(400).json({
          success: false,
          message: 'Doctor must specify a patient ID'
        });
      }
      patient = patientId;
      
      // TODO: Add logic to check if doctor has permission to create records for this patient
    } else {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create medical records'
      });
    }
    
    // Create record
    const record = await MedicalRecord.create({
      patient,
      doctor: req.user.role === 'doctor' ? req.user._id : undefined,
      title,
      description,
      recordType,
      isPrivate: isPrivate || false,
      files: files || []
    });
    
    res.status(201).json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update a medical record
exports.updateRecord = async (req, res) => {
  try {
    const { title, description, recordType, isPrivate, files } = req.body;
    
    const record = await MedicalRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    
    // Check if the user is authorized to update the record
    if (
      req.user.role === 'patient' && 
      record.patient.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this record'
      });
    }
    
    if (
      req.user.role === 'doctor' && 
      record.doctor &&
      record.doctor.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this record'
      });
    }
    
    // Update fields
    if (title) record.title = title;
    if (description) record.description = description;
    if (recordType) record.recordType = recordType;
    if (isPrivate !== undefined) record.isPrivate = isPrivate;
    if (files) record.files = files;
    
    await record.save();
    
    res.status(200).json({
      success: true,
      data: record
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete a medical record
exports.deleteRecord = async (req, res) => {
  try {
    const record = await MedicalRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({
        success: false,
        message: 'Medical record not found'
      });
    }
    
    // Check if the user is authorized to delete the record
    if (
      req.user.role === 'patient' && 
      record.patient.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this record'
      });
    }
    
    if (
      req.user.role === 'doctor' && 
      record.doctor &&
      record.doctor.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this record'
      });
    }
    
    await record.remove();
    
    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get medical records for a patient
exports.getPatientRecords = async (req, res) => {
  try {
    const patientId = req.params.patientId;
    
    // Authorize - only allow access to:
    // 1. The patient themselves
    // 2. Doctors who have treated this patient
    // 3. Admin users
    if (
      req.user._id.toString() !== patientId && 
      req.user.role !== 'admin' &&
      req.user.role !== 'doctor'
    ) {
      // For doctors, verify they have an appointment with this patient
      if (req.user.role === 'doctor') {
        const appointment = await Appointment.findOne({
          doctor: req.user._id,
          patient: patientId,
          status: { $in: ['scheduled', 'completed'] }
        });
        
        if (!appointment) {
          return res.status(403).json({
            success: false,
            message: 'You do not have permission to view these medical records'
          });
        }
      } else {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view these medical records'
        });
      }
    }
    
    const records = await MedicalRecord.find({ patient: patientId })
      .sort({ createdAt: -1 });
      
    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (error) {
    console.error('Error fetching patient medical records:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};