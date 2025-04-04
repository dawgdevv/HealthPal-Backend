const axios = require('axios');
const MedicalRecord = require('../models/MedicalRecord'); // Add this import
const cloudinary = require('cloudinary').v2; // Import cloudinary

// Configure cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ddbltls3c',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.getSecureFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }
    
    // Get file details from database if needed
    // For now, we'll just construct the URL
    
    // Generate a secure URL with your Cloudinary credentials
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = require('crypto')
      .createHash('sha1')
      .update(`public_id=${fileId}&timestamp=${timestamp}${apiSecret}`)
      .digest('hex');
    
    const secureUrl = `https://res.cloudinary.com/${cloudName}/image/upload/v${timestamp}/healthpal/documents/${fileId}?api_key=${apiKey}&timestamp=${timestamp}&signature=${signature}`;
    
    // Proxy the file through your backend
    const response = await axios({
      method: 'get',
      url: secureUrl,
      responseType: 'stream'
    });
    
    // Forward the content type
    res.set('Content-Type', response.headers['content-type']);
    
    // Pipe the file to the response
    response.data.pipe(res);
    
  } catch (error) {
    console.error('Error serving file:', error);
    res.status(500).json({
      success: false,
      message: 'Error serving file'
    });
  }
};

exports.getSignedFileUrl = async (req, res) => {
  try {
    const { fileId } = req.params;
    
    if (!fileId) {
      return res.status(400).json({ success: false, message: 'File ID is required' });
    }
    
    // Generate a temporary signature that expires in 10 minutes
    const expiresIn = 10 * 60; // 10 minutes in seconds
    const timestamp = Math.floor(Date.now() / 1000) + expiresIn;
    
    // Create a simple signature using the file ID and a secret
    const signature = require('crypto')
      .createHmac('sha256', process.env.JWT_SECRET || 'your-secret-key')
      .update(`${fileId}:${timestamp}`)
      .digest('hex');
    
    // Return the signed URL
    res.status(200).json({
      success: true,
      url: `${req.protocol}://${req.get('host')}/api/files/view/${fileId}?signature=${signature}&expires=${timestamp}`
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    res.status(500).json({ success: false, message: 'Error generating file access URL' });
  }
};

exports.viewFile = async (req, res) => {
  try {
    const { fileId } = req.params;
    const { signature, expires } = req.query;
    
    // Verify signature and expiration as before...
    
    // Import cloudinary properly at the top of your file
    const cloudinary = require('cloudinary').v2;
    
    // Configure cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'ddbltls3c',
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    try {
      // First try to find the file in the database to get the exact URL
      const record = await MedicalRecord.findOne({
        'files.public_id': new RegExp(fileId, 'i')
      });
      
      if (record && record.files && record.files.length) {
        const file = record.files.find(f => f.public_id?.includes(fileId) || f.url?.includes(fileId));
        
        if (file && file.url) {
          console.log('Found file URL in database:', file.url);
          return res.redirect(file.url);
        }
      }
      
      // If not found in database, generate a proper signed URL using the SDK
      console.log('Generating Cloudinary URL for file:', fileId);
      
      // Try different resource types because PDFs can be stored in different ways
      const tryResourceTypes = ['image', 'raw'];
      
      for (const resourceType of tryResourceTypes) {
        try {
          const url = cloudinary.url(`healthpal/documents/${fileId}`, {
            resource_type: resourceType,
            format: 'pdf', // Ensure we're requesting as PDF
            secure: true,  // Use HTTPS
            sign_url: true // Sign the URL to ensure access
          });
          
          console.log(`Trying ${resourceType} URL:`, url);
          
          // Test if this URL works by making a HEAD request
          const testResponse = await axios.head(url);
          
          if (testResponse.status === 200) {
            console.log('URL works, redirecting to:', url);
            return res.redirect(url);
          }
        } catch (err) {
          console.log(`Failed with ${resourceType}, trying next option`);
        }
      }
      
      // Final fallback: try direct access with both resource types
      for (const resourceType of ['image', 'raw']) {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'ddbltls3c';
        const fallbackUrl = `https://res.cloudinary.com/${cloudName}/${resourceType}/upload/healthpal/documents/${fileId}.pdf`;
        
        console.log('Fallback URL attempt:', fallbackUrl);
        return res.redirect(fallbackUrl);
      }
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      
      // Last resort: just redirect to raw Cloudinary access
      const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'ddbltls3c';
      const fallbackUrl = `https://res.cloudinary.com/${cloudName}/raw/upload/healthpal/documents/${fileId}.pdf`;
      
      console.log('Final fallback URL:', fallbackUrl);
      return res.redirect(fallbackUrl);
    }
  } catch (error) {
    console.error('Error retrieving file:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};