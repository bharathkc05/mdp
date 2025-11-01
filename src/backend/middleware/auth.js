import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
  try {
    let token;
    
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({ message: 'Not authorized to access this route' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      // Check if token is blacklisted (user logged out)
      const isBlacklisted = user.tokenBlacklist?.some(
        item => item.token === token && item.expiresAt > Date.now()
      );
      
      if (isBlacklisted) {
        return res.status(401).json({ message: 'Token has been invalidated. Please login again.' });
      }

      // Check for session timeout (30 minutes of inactivity)
      const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds
      if (user.lastActivity && (Date.now() - user.lastActivity.getTime() > INACTIVITY_TIMEOUT)) {
        return res.status(401).json({ 
          message: 'Session expired due to inactivity. Please login again.' 
        });
      }

      // Update last activity timestamp
      user.lastActivity = Date.now();
      await user.save();

      req.user = user;
      req.token = token; // Store token for potential logout
      next();
    } catch (error) {
      return res.status(401).json({ message: 'Token is invalid or expired' });
    }
  } catch (error) {
    next(error);
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `User role ${req.user.role} is not authorized to access this route` 
      });
    }
    next();
  };
};