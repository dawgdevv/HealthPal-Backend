const { RtcTokenBuilder, RtcRole } = require('agora-access-token');
const Appointment = require('../models/Appointment');

exports.generateToken = async (req, res) => {
  try {
    console.log('Generate token request:', req.body);
    const { channelName, uid, role, appointmentId } = req.body;
    
    // Support multiple ways to specify the channel
    let effectiveChannelName = channelName;
    
    // If appointment ID was passed instead of channel name, create one
    if (appointmentId && !effectiveChannelName) {
      effectiveChannelName = `healthpal_${appointmentId}`;
      console.log(`Creating channel name from appointment ID: ${effectiveChannelName}`);
    }
    
    if (!effectiveChannelName) {
      console.error('Missing channel name in token request');
      return res.status(400).json({
        success: false,
        message: 'Channel name or appointment ID is required'
      });
    }
    
    // Get the app ID and certificate from environment variables
    const appID = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    
    console.log('Agora credentials check:');
    console.log('- App ID present:', !!appID);
    console.log('- App Certificate present:', !!appCertificate);
    console.log('- Channel name:', effectiveChannelName);
    
    if (!appID || !appCertificate) {
      console.error('Missing Agora credentials');
      return res.status(500).json({
        success: false,
        message: 'Agora credentials not configured'
      });
    }
    
    // Set expiration time (1 hour)
    const expirationTimeInSeconds = 3600;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;
    
    // Build token
    const effectiveUid = uid || 0;
    const tokenRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    
    console.log(`Generating token for channel: ${effectiveChannelName}, uid: ${effectiveUid}, role: ${role || 'publisher'}`);
    
    const token = RtcTokenBuilder.buildTokenWithUid(
      appID, appCertificate, effectiveChannelName, effectiveUid, tokenRole, privilegeExpiredTs
    );
    
    console.log('Token generated successfully');
    
    // Return token to client
    res.status(200).json({
      success: true,
      token,
      channelName: effectiveChannelName,
      appId: appID
    });
  } catch (error) {
    console.error('Error generating Agora token:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

exports.getCallDetails = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    
    if (!appointmentId) {
      return res.status(400).json({ 
        success: false,
        message: 'Appointment ID is required' 
      });
    }
    
    // Find appointment and create a unique channel name
    const appointment = await Appointment.findById(appointmentId)
      .populate('doctor', 'name')
      .populate('patient', 'name');
    
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }
    
    // Generate unique channel name using appointment ID
    const channelName = `healthpal_${appointmentId}`;
    
    res.status(200).json({
      success: true,
      channelName,
      appointment: {
        id: appointment._id,
        date: appointment.date,
        time: appointment.time,
        type: appointment.type,
        patient: appointment.patient,
        doctor: appointment.doctor
      }
    });
  } catch (error) {
    console.error('Error getting call details:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
