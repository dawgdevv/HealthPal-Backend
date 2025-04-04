const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middlewares/auth');

router.use(protect); // Ensure all payment routes are protected

// Create payment intent
router.post('/create-payment-intent', paymentController.createPaymentIntent);

// Confirm payment
router.post('/confirm-payment', paymentController.confirmPayment);

module.exports = router;