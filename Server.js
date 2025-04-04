require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const admin = require('./config/firebase-admin');
const { protect, authorize } = require('./middlewares/auth');
const app = express();
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;

// Import routes
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const consultationRoutes = require('./routes/consultationRoutes');
const patientRoutes = require('./routes/patientRoutes');
const reminderRoutes = require('./routes/reminderRoutes');
const fileRoutes = require('./routes/fileRoutes');
const medicationRoutes = require('./routes/medicationRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const notificationController = require('./controllers/notificationController');
const verificationRoutes = require('./routes/verificationRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const videoRoutes = require('./routes/videoRoutes');

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Single CORS configuration 
app.use(cors({
  origin: [
    'https://health-pal-frontend.vercel.app',  // Production frontend
    'http://localhost:5173',                // Vite dev server
    'http://localhost:3000',                // Alternative local port
    'http://127.0.0.1:5173',                // Alternative local address
    'https://healthpal.vercel.app',         // If you use this domain
    '*'                                     // Allow all origins for testing (remove in production)
  ],
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Add a development route handler to log attempts to access routes that don't exist
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    // If no route matched, log the attempt for debugging
    console.warn(`Route not found: ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Verify Firebase is working
try {
  admin.app();
  console.log('Firebase Admin initialized successfully');
} catch (error) {
  console.error('Firebase Admin initialization error:', error);
  process.exit(1);
}

// Default route
app.get('/', (req, res) => {
  res.send('HealthPal API is running...');
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/medical-records', medicalRecordRoutes);
app.use('/api/prescriptions', prescriptionRoutes);
app.use('/api/consultations', consultationRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/reminders', reminderRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/medications', medicationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api', verificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/video', videoRoutes);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  
  // Join a consultation room
  socket.on('join-consultation', (consultationId) => {
    console.log(`User ${socket.id} joined consultation: ${consultationId}`);
    socket.join(`consultation-${consultationId}`);
  });
  
  // Leave a consultation room
  socket.on('leave-consultation', (consultationId) => {
    console.log(`User ${socket.id} left consultation: ${consultationId}`);
    socket.leave(`consultation-${consultationId}`);
  });
  
  // Handle chat messages
  socket.on('send-message', (data) => {
    console.log(`Message in consultation ${data.consultationId} from ${socket.id}:`, data.message);
    
    // Broadcast to everyone in the room except the sender
    socket.to(`consultation-${data.consultationId}`).emit('receive-message', data.message);
  });
  
  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`Error processing ${req.method} ${req.originalUrl}:`, err);
  
  // Handle Firebase-specific errors
  if (err.codePrefix === 'auth') {
    return res.status(401).json({
      success: false,
      message: 'Firebase Authentication Error',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Authentication failed'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    
    // Start notification system
    notificationController.initializeNotificationScheduling();
    
    // Start server only after successful DB connection
    server.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });
