import * as userService from "../services/userService.js";
import { sendResponse } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import { logUserRoleChanged } from "../services/auditLogService.js";

export const getMyProfile = async (req, res) => {
  try {
    const user = req.user;
    sendResponse(res, 200, true, 'Profile fetched successfully', {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      age: user.age,
      gender: user.gender,
      role: user.role,
      profile: user.profile,
      twoFactorEnabled: user.twoFactorEnabled
    });
  } catch (err) {
    return sendResponse(res, 500, false, 'Server error');
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const user = await userService.updateUserProfile(req.user._id, req.body);
    sendResponse(res, 200, true, 'Profile updated successfully', {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        age: user.age,
        gender: user.gender,
        role: user.role,
        profile: user.profile,
        twoFactorEnabled: user.twoFactorEnabled
    });
  } catch (err) {
    if (err.message === 'User not found') return sendResponse(res, 404, false, 'User not found');
    console.error('Profile update error:', err);
    return sendResponse(res, 500, false, 'Server error while updating profile');
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await userService.getAllUsers();
    res.json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    sendResponse(res, 500, false, 'Server error while fetching users');
  }
};

export const getUserById = async (req, res) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return sendResponse(res, 404, false, 'User not found');
    
    sendResponse(res, 200, true, 'Success', user
    );
  } catch (error) {
    console.error('Error fetching user:', error);
    sendResponse(res, 500, false, 'Server error while fetching user');
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    if (!role || !['donor', 'admin'].includes(role)) {
      return sendResponse(res, 400, false, 'Valid role (donor or admin) is required');
    }

    const { user, oldRole } = await userService.updateUserRole(req.params.id, role, req.user._id);
    
    await logUserRoleChanged(req, user, oldRole, role);

    sendResponse(res, 200, true, `User role updated to ${role}`, user
    );
  } catch (error) {
    if (error.message === 'You cannot change your own role') return sendResponse(res, 400, false, 'You cannot change your own role');
    if (error.message === 'User not found') return sendResponse(res, 404, false, 'User not found');
    
    console.error('Error updating user role:', error);
    sendResponse(res, 500, false, 'Server error while updating user role');
  }
};
