import User from "../models/User.js";

export const getAllUsers = async () => {
  return await User.find()
    .select('-password -resetToken -resetTokenExpiry')
    .sort({ createdAt: -1 })
    .lean(); // Optimization
};

export const getUserById = async (id) => {
  return await User.findById(id)
    .select('-password -resetToken -resetTokenExpiry')
    .lean(); // Optimization
};

export const updateUserRole = async (id, role, currentUserId) => {
  if (id === currentUserId.toString()) {
    throw new Error('You cannot change your own role');
  }

  const user = await User.findById(id).select('-password -resetToken -resetTokenExpiry');
  if (!user) {
    throw new Error('User not found');
  }

  const oldRole = user.role;
  user.role = role;
  await user.save();

  return { user, oldRole };
};

export const updateUserProfile = async (userId, profileData) => {
  const { firstName, lastName, age, gender, profile } = profileData;
  const user = await User.findById(userId);

  if (!user) throw new Error('User not found');

  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (age) user.age = age;
  if (gender) user.gender = gender;

  if (profile) {
    if (!user.profile) user.profile = {};
    if (profile.phoneNumber !== undefined) user.profile.phoneNumber = profile.phoneNumber;
    if (profile.address !== undefined) user.profile.address = profile.address;
    if (profile.preferredCauses !== undefined) user.profile.preferredCauses = profile.preferredCauses;
  }

  await user.save();
  return user;
};
