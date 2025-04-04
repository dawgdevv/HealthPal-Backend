// Create a dedicated middleware for role-based access control

const roleAuth = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // If roles is a string, convert it to array
    const allowedRoles = typeof roles === 'string' ? [roles] : roles;

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action'
      });
    }
    
    next();
  };
};

module.exports = roleAuth;