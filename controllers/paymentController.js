const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');

// Create payment intent for appointment booking
exports.createPaymentIntent = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    
    console.log(`Creating payment intent for appointment: ${appointmentId}`);
    
    if (!appointmentId) {
      return res.status(400).json({
        success: false,
        message: 'Appointment ID is required'
      });
    }
    
    // Find appointment
    const appointment = await Appointment.findById(appointmentId);
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    // Get doctor details
    const doctor = await Doctor.findById(appointment.doctor);
    
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: 'Doctor not found'
      });
    }
    
    // Check if consultation fee exists
    if (!doctor.consultationFee) {
      console.error(`Doctor ${doctor._id} has no consultation fee set`);
      // Set a default fee of $50 if no fee is defined
      doctor.consultationFee = 50;
      await doctor.save();
    }
    
    // Get doctor's consultation fee (convert to cents for Stripe)
    const amount = Math.round(doctor.consultationFee * 100);
    
    console.log(`Creating Stripe payment intent for $${amount/100} (${amount} cents)`);
    
    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        appointmentId: appointmentId,
        doctorId: appointment.doctor.toString(),
        patientId: appointment.patient.toString()
      }
    });
    
    console.log(`Payment intent created: ${paymentIntent.id}`);
    
    res.status(200).json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      amount
    });
  } catch (error) {
    console.error('Payment intent error details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create payment intent: ' + (error.message || 'Unknown error')
    });
  }
};

// Confirm appointment payment
exports.confirmPayment = async (req, res) => {
  try {
    const { appointmentId, paymentIntentId } = req.body;
    
    // Verify the payment with Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status !== 'succeeded') {
      return res.status(400).json({
        success: false,
        message: 'Payment has not been completed'
      });
    }
    
    // Update appointment with payment information
    const appointment = await Appointment.findByIdAndUpdate(
      appointmentId,
      {
        isPaid: true,
        paymentId: paymentIntentId,
        paymentStatus: 'completed'
      },
      { new: true }
    );
    
    res.status(200).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to confirm payment'
    });
  }
};