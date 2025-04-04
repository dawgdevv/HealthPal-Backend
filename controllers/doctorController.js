const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const Availability = require('../models/Availability');
const Patient = require('../models/Patient');

// Get all doctors with optional filtering
exports.getDoctors = async (req, res) => {
  try {
    // Extract query parameters
    const { name, specialization, experience, gender, feeRange, location } = req.query;
    
    // Build query object
    const query = {};
    
    // Add filters if provided
    if (name) {
      query.name = { $regex: name, $options: 'i' }; // Case-insensitive search
    }
    
    if (specialization) {
      query.specialization = { $regex: specialization, $options: 'i' };
    }
    
    if (gender) {
      query.gender = gender;
    }
    
    // Handle experience ranges
    if (experience) {
      if (experience === '0-5') {
        query.experience = { $lte: 5 };
      } else if (experience === '5-10') {
        query.experience = { $gt: 5, $lte: 10 };
      } else if (experience === '10+') {
        query.experience = { $gt: 10 };
      }
    }
    
    // Handle fee ranges
    if (feeRange) {
      const [min, max] = feeRange.split('-');
      if (min && max) {
        query.consultationFee = { $gte: parseInt(min), $lte: parseInt(max) };
      } else if (min && min.includes('+')) {
        const minFee = parseInt(min.replace('+', ''));
        query.consultationFee = { $gte: minFee };
      }
    }
    
    // Add location filter if provided (hospital location)
    if (location) {
      query['hospital.name'] = { $regex: location, $options: 'i' };
    }
    
    console.log('Finding doctors with query:', JSON.stringify(query));
    
    const doctors = await Doctor.find(query)
      .select('-password -__v')
      .sort({ rating: -1, name: 1 });
    
    res.status(200).json({
      success: true,
      count: doctors.length,
      data: doctors
    });
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get single doctor
exports.getDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .select('-password');
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update doctor profile
exports.updateDoctor = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.user._id);
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'name', 'phone', 'specialization', 'experience',
      'consultationFee', 'bio', 'hospital',
      'workingHours', 'isAcceptingAppointments', 'profileImage'
    ];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        doctor[field] = req.body[field];
      }
    });
    
    await doctor.save();
    
    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update doctor availability
exports.updateAvailability = async (req, res) => {
  try {
    const { availability } = req.body;
    
    // Check if the doctor exists
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    // Check if the logged-in user is the doctor
    if (req.user._id.toString() !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this doctor\'s availability'
      });
    }
    
    // Validate availability format
    if (!Array.isArray(availability)) {
      return res.status(400).json({
        success: false,
        message: 'Availability must be an array'
      });
    }
    
    // Update doctor availability
    doctor.availability = availability;
    await doctor.save();
    
    res.status(200).json({
      success: true,
      data: doctor.availability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get doctor's appointments
exports.getDoctorAppointments = async (req, res) => {
  try {
    // Get doctor ID from authenticated user rather than param
    const doctorId = req.user._id;
    console.log(`Fetching appointments for doctor: ${doctorId}`);
    
    // Get query parameters
    const { status, startDate, endDate } = req.query;
    
    // Build query object
    let query = { doctor: doctorId };
    
    // Add status filter if provided
    if (status) {
      if (status.includes(',')) {
        query.status = { $in: status.split(',') };
      } else {
        query.status = status;
      }
    }
    
    // Add date range filter if provided
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    
    console.log('Query:', JSON.stringify(query));
    
    const appointments = await Appointment.find(query)
      .populate({
        path: 'patient',
        select: 'name email phone profileImage'
      })
      .sort({ date: 1, 'time.start': 1 });
    
    console.log(`Found ${appointments.length} appointments for doctor ${doctorId}`);
    
    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error('Error getting doctor appointments:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add doctor review
exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }
    
    // Check if doctor exists
    const doctor = await Doctor.findById(req.params.id);
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    // Check if patient has had an appointment with this doctor
    const appointment = await Appointment.findOne({
      doctor: req.params.id,
      patient: req.user._id,
      status: 'completed'
    });
    
    if (!appointment && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You must have a completed appointment with this doctor to leave a review'
      });
    }
    
    // Check if patient has already reviewed this doctor
    const existingReviewIndex = doctor.reviews.findIndex(
      review => review.patient.toString() === req.user._id.toString()
    );
    
    if (existingReviewIndex !== -1) {
      // Update existing review
      doctor.reviews[existingReviewIndex].rating = rating;
      doctor.reviews[existingReviewIndex].comment = comment;
      doctor.reviews[existingReviewIndex].date = Date.now();
    } else {
      // Add new review
      doctor.reviews.push({
        patient: req.user._id,
        rating,
        comment,
        date: Date.now()
      });
    }
    
    // Calculate new average rating
    const totalRating = doctor.reviews.reduce((sum, review) => sum + review.rating, 0);
    doctor.rating = totalRating / doctor.reviews.length;
    
    await doctor.save();
    
    res.status(200).json({
      success: true,
      data: {
        rating: doctor.rating,
        reviews: doctor.reviews
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get current doctor's profile
exports.getDoctorProfile = async (req, res) => {
  try {
    console.log('Getting doctor profile for:', req.user._id);
    
    // Find doctor with proper error handling
    const doctor = await Doctor.findById(req.user._id)
      .select('-password')
      .lean(); // Using lean() for better performance
    
    if (!doctor) {
      console.log('Doctor not found in database');
      return res.status(404).json({
        success: false,
        message: 'Doctor profile not found'
      });
    }
    
    // Initialize any potentially undefined nested objects
    doctor.qualifications = doctor.qualifications || [];
    doctor.reviews = doctor.reviews || [];
    doctor.hospital = doctor.hospital || { name: '', address: '' };
    doctor.notificationSettings = doctor.notificationSettings || {
      emailNotifications: true,
      appointmentReminders: true,
      medicationReminders: true,
      newsletterUpdates: false
    };
    
    res.status(200).json({
      success: true,
      data: doctor
    });
  } catch (error) {
    console.error('Error fetching doctor profile:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching doctor profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get available dates for the current doctor
exports.getAvailableDates = async (req, res) => {
  try {
    const availabilityRecords = await Availability.find({ doctor: req.user._id });
    
    // Extract unique dates and format them as YYYY-MM-DD
    const dates = availabilityRecords.map(record => {
      const date = new Date(record.date);
      return date.toISOString().split('T')[0];
    });
    
    res.status(200).json({
      success: true,
      dates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get time slots for a specific date
exports.getTimeSlots = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }
    
    // Find availability for the requested date
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const availability = await Availability.findOne({
      doctor: req.user._id,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    if (!availability) {
      return res.status(200).json({
        success: true,
        slots: []
      });
    }
    
    res.status(200).json({
      success: true,
      slots: availability.slots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Save time slots for a specific date
exports.saveTimeSlots = async (req, res) => {
  try {
    const { date, slots } = req.body;
    
    if (!date || !slots) {
      return res.status(400).json({
        success: false,
        message: 'Date and slots are required'
      });
    }
    
    // Format the date
    const slotDate = new Date(date);
    slotDate.setHours(0, 0, 0, 0);
    
    // Find existing availability or create new one
    let availability = await Availability.findOne({
      doctor: req.user._id,
      date: {
        $gte: slotDate,
        $lte: new Date(slotDate.getTime() + 24 * 60 * 60 * 1000 - 1)
      }
    });
    
    if (availability) {
      // Preserve booked slots
      const bookedSlots = availability.slots.filter(slot => slot.booked);
      
      // Ensure all booked slots are included in new slots
      bookedSlots.forEach(bookedSlot => {
        if (!slots.some(s => s.start === bookedSlot.start && s.end === bookedSlot.end)) {
          slots.push(bookedSlot);
        }
      });
      
      availability.slots = slots;
      await availability.save();
    } else {
      // Create new availability record
      availability = await Availability.create({
        doctor: req.user._id,
        date: slotDate,
        slots
      });
    }
    
    res.status(200).json({
      success: true,
      data: availability
    });
  } catch (error) {
    console.error('Error saving time slots:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Save recurring time slots for multiple weeks
exports.saveRecurringTimeSlots = async (req, res) => {
  try {
    const { date, slots, weeks } = req.body;
    
    if (!date || !slots || !weeks) {
      return res.status(400).json({
        success: false,
        message: 'Date, slots, and weeks are required'
      });
    }
    
    // Base date
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);
    
    const savedDates = [];
    const errors = [];
    
    // Save slots for each week
    for (let i = 0; i < weeks; i++) {
      const currentDate = new Date(baseDate);
      currentDate.setDate(currentDate.getDate() + (i * 7));
      
      try {
        // Find or create availability for this date
        let availability = await Availability.findOne({
          doctor: req.user._id,
          date: {
            $gte: currentDate,
            $lte: new Date(currentDate.getTime() + 24 * 60 * 60 * 1000 - 1)
          }
        });
        
        if (availability) {
          // Preserve booked slots
          const bookedSlots = availability.slots.filter(slot => slot.booked);
          
          // Ensure all booked slots are included
          const updatedSlots = [...slots];
          bookedSlots.forEach(bookedSlot => {
            if (!updatedSlots.some(s => s.start === bookedSlot.start && s.end === bookedSlot.end)) {
              updatedSlots.push(bookedSlot);
            }
          });
          
          availability.slots = updatedSlots;
          await availability.save();
        } else {
          // Create new availability
          availability = await Availability.create({
            doctor: req.user._id,
            date: currentDate,
            slots: [...slots]
          });
        }
        
        savedDates.push(currentDate.toISOString().split('T')[0]);
      } catch (err) {
        errors.push({
          date: currentDate.toISOString().split('T')[0],
          error: err.message
        });
      }
    }
    
    res.status(200).json({
      success: true,
      savedDates,
      errors: errors.length > 0 ? errors : undefined
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete availability for a specific date
exports.deleteAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }
    
    // Format the date
    const slotDate = new Date(date);
    slotDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(slotDate);
    endDate.setHours(23, 59, 59, 999);
    
    // Check if there are any booked appointments for this date
    const availability = await Availability.findOne({
      doctor: req.user._id,
      date: {
        $gte: slotDate,
        $lte: endDate
      }
    });
    
    if (!availability) {
      return res.status(404).json({
        success: false,
        message: 'No availability found for this date'
      });
    }
    
    // Check if there are any booked slots
    const bookedSlots = availability.slots.filter(slot => slot.booked);
    if (bookedSlots.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete availability with booked appointments',
        bookedSlots
      });
    }
    
    // Delete the availability
    await Availability.deleteOne({
      doctor: req.user._id,
      date: {
        $gte: slotDate,
        $lte: endDate
      }
    });
    
    res.status(200).json({
      success: true,
      message: 'Availability deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get availability for a specific doctor (for patients to view)
exports.getDoctorAvailability = async (req, res) => {
  try {
    const { date } = req.query;
    const doctorId = req.params.id;
    
    if (!date) {
      return res.status(400).json({
        success: false,
        message: 'Date parameter is required'
      });
    }
    
    // Find doctor availability
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const availability = await Availability.findOne({
      doctor: doctorId,
      date: {
        $gte: startDate,
        $lte: endDate
      }
    });
    
    if (!availability) {
      return res.status(200).json({
        success: true,
        slots: []
      });
    }
    
    // Filter out booked slots for patients
    const availableSlots = availability.slots.filter(slot => !slot.booked);
    
    res.status(200).json({
      success: true,
      slots: availableSlots
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get available dates for a specific doctor (for patients)
exports.getDoctorAvailableDates = async (req, res) => {
  try {
    const doctorId = req.params.id;
    
    // Check if doctor exists and is accepting appointments
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    if (doctor.isAcceptingAppointments === false) {
      return res.status(200).json({
        success: true,
        isAcceptingAppointments: false,
        dates: []
      });
    }
    
    // Get availability records for this doctor
    const availabilityRecords = await Availability.find({ doctor: doctorId });
    
    // Extract dates with at least one available slot
    const dates = [];
    
    for (const record of availabilityRecords) {
      // Only include dates with at least one non-booked slot
      const hasAvailableSlot = record.slots.some(slot => !slot.booked);
      
      if (hasAvailableSlot) {
        const date = new Date(record.date);
        // Only include today or future dates
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (date >= today) {
          dates.push(date.toISOString().split('T')[0]);
        }
      }
    }
    
    res.status(200).json({
      success: true,
      isAcceptingAppointments: true,
      dates
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this new method to handle partial updates
exports.updateDoctorPartial = async (req, res) => {
  try {
    const doctor = await Doctor.findById(req.user._id);
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }

    // Update only the fields included in the request
    const updateFields = Object.keys(req.body);
    
    // Only allow certain fields to be updated via PATCH
    const allowedUpdates = [
      'isAcceptingAppointments', 'workingHours', 'phone', 'bio', 
      'hospital', 'profileImage'
    ];
    
    // Validate fields
    for (const field of updateFields) {
      if (!allowedUpdates.includes(field)) {
        return res.status(400).json({
          success: false,
          message: `Field "${field}" is not allowed to be updated via PATCH`
        });
      }
      
      // Update the field
      doctor[field] = req.body[field];
    }
    
    await doctor.save();
    
    res.status(200).json({
      success: true,
      data: doctor,
      message: 'Doctor profile updated successfully'
    });
  } catch (error) {
    console.error('Error updating doctor profile:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get patients for a doctor
exports.getDoctorPatients = async (req, res) => {
  try {
    console.log('Getting patients for doctor:', req.user);
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }
    
    const doctorId = req.user._id;
    
    // Find all COMPLETED appointments for this doctor
    const appointments = await Appointment.find({ 
      doctor: doctorId,
      status: 'completed'  // Only include completed appointments
    }).populate({
      path: 'patient',
      select: 'name email phone profileImage gender dateOfBirth'
    });
    
    console.log(`Found ${appointments.length} completed appointments`);
    
    // Create a map to store unique patients with their latest visit
    const patientMap = new Map();
    
    appointments.forEach(appointment => {
      if (!appointment.patient) return;
      
      const patientId = appointment.patient._id.toString();
      const currentPatient = patientMap.get(patientId);
      
      // If patient not in map or this appointment is more recent
      if (!currentPatient || new Date(appointment.date) > new Date(currentPatient.lastVisit)) {
        patientMap.set(patientId, {
          ...appointment.patient.toObject(),
          lastVisit: appointment.date,
          appointmentCount: currentPatient ? currentPatient.appointmentCount + 1 : 1
        });
      } else if (currentPatient) {
        // Update appointment count even if not the most recent visit
        patientMap.set(patientId, {
          ...currentPatient,
          appointmentCount: currentPatient.appointmentCount + 1
        });
      }
    });
    
    // Convert map to array
    const patients = Array.from(patientMap.values());
    
    console.log(`Returning ${patients.length} unique patients`);
    
    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (error) {
    console.error('Error getting doctor patients:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this controller method

// Get recent patients for a doctor (for dashboard)
exports.getRecentPatients = async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    // Find all COMPLETED appointments for this doctor, limit to recent ones
    const appointments = await Appointment.find({ 
      doctor: doctorId,
      status: 'completed'
    })
    .sort({ date: -1 })
    .limit(10)
    .populate({
      path: 'patient',
      select: 'name email phone profileImage gender dateOfBirth'
    });
    
    // Create a map to store unique patients with their latest visit
    const patientMap = new Map();
    
    appointments.forEach(appointment => {
      if (!appointment.patient) return;
      
      const patientId = appointment.patient._id.toString();
      
      // Only add if not already in the map (ensures most recent visit)
      if (!patientMap.has(patientId)) {
        patientMap.set(patientId, {
          ...appointment.patient.toObject(),
          lastVisit: appointment.date
        });
      }
    });
    
    // Convert map to array and return only the most recent patients
    const patients = Array.from(patientMap.values());
    
    res.status(200).json({
      success: true,
      count: patients.length,
      data: patients
    });
  } catch (error) {
    console.error('Error getting recent patients:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this function at the end of your controller

// Get a specific patient for a doctor
exports.getDoctorPatientById = async (req, res) => {
  try {
    const doctorId = req.user._id;
    const patientId = req.params.patientId;
    
    // First check if this doctor has ever treated this patient
    const appointmentExists = await Appointment.findOne({
      doctor: doctorId,
      patient: patientId,
      // Allow access even if appointment is just scheduled (not only completed)
      status: { $in: ['scheduled', 'completed'] }
    });
    
    if (!appointmentExists) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to view this patient data'
      });
    }
    
    // Get patient details
    const patient = await Patient.findById(patientId)
      .select('name email phone profileImage gender dateOfBirth');
      
    if (!patient) {
      return res.status(404).json({
        success: false,
        message: 'Patient not found'
      });
    }
    
    // Add last visit info
    const lastAppointment = await Appointment.findOne({
      doctor: doctorId,
      patient: patientId,
      status: 'completed'
    }).sort({ date: -1 });
    
    const patientData = {
      ...patient.toObject(),
      lastVisit: lastAppointment ? lastAppointment.date : null
    };
    
    res.status(200).json({
      success: true,
      data: patientData
    });
  } catch (error) {
    console.error('Error getting patient details:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this function if it's missing

// Get appointments for the currently logged-in doctor
exports.getMyAppointments = async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    // Get query parameters
    const { status } = req.query;
    
    // Build query
    let query = { doctor: doctorId };
    
    // Add status filter if provided
    if (status) {
      if (status.includes(',')) {
        // Multiple statuses
        query.status = { $in: status.split(',') };
      } else {
        // Single status
        query.status = status;
      }
    }
    
    console.log('Doctor appointments query:', query);
    
    // Find appointments
    const appointments = await Appointment.find(query)
      .populate({
        path: 'patient',
        select: 'name email phone profileImage'
      })
      .sort({ date: -1, 'time.start': -1 });
    
    console.log(`Found ${appointments.length} appointments for doctor ${doctorId}`);
    
    res.status(200).json({
      success: true,
      count: appointments.length,
      data: appointments
    });
  } catch (error) {
    console.error('Error getting doctor appointments:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Add this new method

// Get available dates for the current doctor (their own dates)
exports.getDoctorOwnAvailableDates = async (req, res) => {
  try {
    const doctorId = req.user._id;
    
    // Check if doctor exists and is accepting appointments
    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    // Get availability records for this doctor
    const availabilityRecords = await Availability.find({ doctor: doctorId });
    
    // Extract all dates (not just available ones, since this is for the doctor's own view)
    const dates = availabilityRecords.map(record => {
      const date = new Date(record.date);
      return date.toISOString().split('T')[0];
    });
    
    res.status(200).json({
      success: true,
      isAcceptingAppointments: doctor.isAcceptingAppointments !== false,
      dates
    });
  } catch (error) {
    console.error('Error getting doctor available dates:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};