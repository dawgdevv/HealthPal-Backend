const Appointment = require("../models/Appointment");
const Doctor = require("../models/Doctor");
const Patient = require("../models/Patient");
const mongoose = require("mongoose");
const Availability = require("../models/Availability");
const MedicalRecord = require("../models/MedicalRecord");

// Create new appointment
exports.createAppointment = async (req, res) => {
  try {
    // Check if user is a doctor - they should not be able to book appointments
    if (req.user.role === "doctor") {
      return res.status(403).json({
        success: false,
        message:
          "Doctors cannot book appointments. Please use the staff booking interface to schedule appointments for patients.",
      });
    }

    // Fix the destructuring to include attachedRecords and reportFiles
    const { doctorId, date, time, type, reason, attachedRecords, reportFiles } = req.body;

    // Validate required fields
    if (!doctorId || !date || !time || !time.start || !time.end || !reason) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check if the time slot is available
    const appointmentDate = new Date(date);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check for existing appointments in the same time slot
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      $or: [
        {
          "time.start": { $lt: time.end },
          "time.end": { $gt: time.start },
        },
      ],
      status: { $ne: "cancelled" },
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    // Create appointment with attachedRecords included
    const appointment = await Appointment.create({
      patient: req.user._id,
      doctor: doctorId,
      date: appointmentDate,
      time,
      type: type || "in-person",
      reason,
      status: "scheduled",
      attachedRecords: attachedRecords || [] // Add this line
    });

    // If there are uploaded report files, create a medical record
    if (reportFiles && reportFiles.length > 0) {
      await MedicalRecord.create({
        patient: req.user._id,
        doctor: doctorId,
        title: `Documents for appointment on ${new Date(
          date
        ).toLocaleDateString()}`,
        description: `Medical reports uploaded for appointment with ${doctor.name}.\nReason: ${reason}`,
        recordType: "other",
        date: new Date(),
        files: reportFiles,
        appointment: appointment._id, // Reference to the appointment
      });
    }

    // Update availability to mark the slot as booked
    const availability = await Availability.findOne({
      doctor: doctorId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
    });

    if (availability) {
      // Find and mark the booked slot
      const slotIndex = availability.slots.findIndex(
        (slot) => slot.start === time.start && slot.end === time.end
      );

      if (slotIndex >= 0) {
        availability.slots[slotIndex].booked = true;
        await availability.save();
      }
    }

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Create appointment by staff or doctor
exports.createAppointmentByStaff = async (req, res) => {
  try {
    const { patientId, doctorId, date, time, type, reason, notes } = req.body;

    // Validate required fields
    if (
      !patientId ||
      !doctorId ||
      !date ||
      !time ||
      !time.start ||
      !time.end ||
      !reason
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    // Verify patient exists
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: "Patient not found",
      });
    }

    // Verify doctor exists
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // Check if the time slot is available
    const appointmentDate = new Date(date);
    const startOfDay = new Date(appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    // Check for existing appointments in the same time slot
    const existingAppointment = await Appointment.findOne({
      doctor: doctorId,
      date: {
        $gte: startOfDay,
        $lte: endOfDay,
      },
      $or: [
        {
          "time.start": { $lt: time.end },
          "time.end": { $gt: time.start },
        },
      ],
      status: { $ne: "cancelled" },
    });

    if (existingAppointment) {
      return res.status(400).json({
        success: false,
        message: "This time slot is already booked",
      });
    }

    // Create appointment
    const appointment = await Appointment.create({
      patient: patientId,
      doctor: doctorId,
      date: appointmentDate,
      time,
      type: type || "in-person",
      reason,
      notes,
      status: "scheduled",
    });

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get all appointments (admin only)
exports.getAppointments = async (req, res) => {
  try {
    console.log('Getting appointments with user:', req.user);
    
    let query = {};

    // Add role-based filters with improved debugging
    if (req.user.role === 'patient') {
      query.patient = req.user._id;
      console.log('Filtering as patient:', req.user._id);
    } else if (req.user.role === 'doctor') {
      query.doctor = req.user._id;
      console.log('Filtering as doctor:', req.user._id);
    }

    // Add status filter
    if (req.query.status) {
      if (req.query.status.includes(',')) {
        query.status = { $in: req.query.status.split(',') };
      } else {
        query.status = req.query.status;
      }
    }

    // Add specific patient filter for doctors
    if (req.user.role === 'doctor' && req.query.patientId) {
      query.patient = req.query.patientId;
    }

    console.log('Final query for appointments:', JSON.stringify(query));

    // Check if there are ANY appointments for this doctor (ignoring filters)
    if (req.user.role === 'doctor') {
      const totalCount = await Appointment.countDocuments({ doctor: req.user._id });
      console.log(`Total appointments for doctor ${req.user._id}: ${totalCount}`);
    }

    const appointments = await Appointment.find(query)
      .populate('doctor', 'name specialization profileImage')
      .populate('patient', 'name email phone profileImage')
      .sort({ date: 1, 'time.start': 1 });

    console.log(`Found ${appointments.length} appointments matching query`);

    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error('Error getting appointments:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Fix the getAppointment function that's causing 500 errors
exports.getAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'name specialization profileImage')
      .populate('patient', 'name email phone')
      .populate('attachedRecords'); // Add this line
      
    // Then check if it exists
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Check if the user is authorized to view the appointment
    if (
      req.user.role === "patient" &&
      appointment.patient._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this appointment",
      });
    }

    if (
      req.user.role === "doctor" &&
      appointment.doctor._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this appointment",
      });
    }

    res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error("Error fetching appointment:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Update appointment status
exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;

    if (!["scheduled", "completed", "cancelled", "no-show"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status value",
      });
    }

    // Find and fully populate the appointment to ensure doctor info is available
    const appointment = await Appointment.findById(req.params.id)
      .populate('doctor', 'name email')
      .populate('patient', 'name email');

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found",
      });
    }

    // Authorization checks remain unchanged
    if (
      req.user.role === "patient" &&
      appointment.patient._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this appointment",
      });
    }

    if (
      req.user.role === "doctor" &&
      appointment.doctor._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this appointment",
      });
    }

    // Patients can only cancel appointments
    if (req.user.role === "patient" && status !== "cancelled") {
      return res.status(403).json({
        success: false,
        message: "Patients can only cancel appointments",
      });
    }

    // Update status
    appointment.status = status;

    // Add any notes if provided
    if (req.body.notes) {
      appointment.notes = req.body.notes;
    }

    await appointment.save();
    
    // Send a notification to patient if doctor marks appointment as completed
    if (status === 'completed' && req.user.role === 'doctor' && appointment.type === 'in-person') {
      try {
        console.log('Attempting to send review notification to patient:', appointment.patient._id);
        
        // Import notification controller
        const notificationController = require('./notificationController');
        
        // Ensure we have the doctor name
        const doctorName = appointment.doctor.name || 'your doctor';
        
        // Send notification to patient with explicit type
        const notificationSent = await notificationController.sendNotification(
          appointment.patient._id, // Use _id explicitly
          `Appointment Completed - Review Your Doctor ${doctorName}`,
          `Your appointment with Dr. ${doctorName} has been marked as completed. Please take a moment to leave a review.`,
          {
            type: 'review_request',
            doctorId: appointment.doctor._id.toString(),
            appointmentId: appointment._id.toString()
          }
        );
        
        if (notificationSent) {
          console.log(`Review request notification sent to patient ${appointment.patient._id}`);
        } else {
          console.warn(`Failed to send review notification to patient ${appointment.patient._id}`);
        }
      } catch (notifError) {
        console.error('Error sending review request notification:', notifError);
        // Don't return error response, continue with appointment update
      }
    }

    return res.status(200).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    console.error('Error updating appointment status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Error updating appointment status',
    });
  }
};

// Add this controller method

// Cancel appointment
exports.cancelAppointment = async (req, res) => {
  try {
    const { reason } = req.body;
    const appointment = await Appointment.findById(req.params.id);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found"
      });
    }
    
    // Check if user is authorized to cancel this appointment
    const isAuthorized = 
      (req.user.role === 'patient' && appointment.patient.toString() === req.user._id.toString()) ||
      (req.user.role === 'doctor' && appointment.doctor.toString() === req.user._id.toString()) ||
      req.user.role === 'admin';
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this appointment"
      });
    }
    
    // Only allow cancellation of scheduled appointments
    if (appointment.status !== 'scheduled') {
      return res.status(400).json({
        success: false, 
        message: "Only scheduled appointments can be cancelled"
      });
    }
    
    // Update appointment status and add cancellation reason
    appointment.status = 'cancelled';
    appointment.cancellationReason = reason || 'No reason provided';
    
    // Add who cancelled the appointment
    appointment.cancelledBy = req.user._id;
    
    await appointment.save();
    
    // If this appointment had a booked time slot, free it up
    if (appointment.type !== 'video') {
      try {
        const startOfDay = new Date(appointment.date);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(appointment.date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const availability = await Availability.findOne({
          doctor: appointment.doctor,
          date: {
            $gte: startOfDay,
            $lte: endOfDay
          }
        });
        
        if (availability) {
          // Find the booked slot and mark it as available
          const slotIndex = availability.slots.findIndex(slot => 
            slot.start === appointment.time.start && 
            slot.end === appointment.time.end
          );
          
          if (slotIndex >= 0) {
            availability.slots[slotIndex].booked = false;
            await availability.save();
          }
        }
      } catch (slotError) {
        console.error("Error freeing up time slot:", slotError);
        // Continue with appointment cancellation even if slot update fails
      }
    }
    
    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error("Error cancelling appointment:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
