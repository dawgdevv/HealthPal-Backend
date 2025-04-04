const { RtcTokenBuilder, RtcRole } = require('agora-access-token');

exports.generateToken = async (req, res) => {
  try {
    const { channelName, uid, role } = req.body;
    
    if (!channelName) {
      return res.status(400).json({
        success: false,
        message: 'Channel name is required'
      });
    }
    
    // Get the app ID and certificate from environment variables
    const appID = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    
    if (!appID || !appCertificate) {
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
    const tokenRole = role === 'publisher' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
    const token = RtcTokenBuilder.buildTokenWithUid(
      appID, appCertificate, channelName, uid || 0, tokenRole, privilegeExpiredTs
    );
    
    // Return token to client
    res.status(200).json({
      success: true,
      token,
      channelName
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
    const appointment = await Appointment.findById(appointmentId);
    
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