import Cause from "../models/Cause.js";
import { updateExpiredCauses as updateExpired } from "../jobs/causeStatusUpdater.js";

export const getCauses = async (query = {}) => {
  return await Cause.find(query)
    .select('name description category imageUrl targetAmount currentAmount donorCount createdAt status endDate createdBy')
    .sort({ createdAt: -1 })
    .lean();
};

export const getCauseById = async (id) => {
  return await Cause.findById(id)
    .populate('createdBy', 'firstName lastName email')
    .lean();
};

export const createCause = async (causeData, userId) => {
  const cause = new Cause({
    ...causeData,
    createdBy: userId
  });
  await cause.save();
  return cause;
};

export const updateCause = async (id, updateData) => {
  const cause = await Cause.findById(id);
  if (!cause) throw new Error('Cause not found');

  const { name, description, category, targetAmount, status, imageUrl, endDate } = updateData;

  if (name) cause.name = name;
  if (description) cause.description = description;
  if (category) cause.category = category;
  if (targetAmount !== undefined) {
    if (targetAmount <= 0) throw new Error('Target amount must be greater than 0');
    cause.targetAmount = targetAmount;
  }
  if (status) cause.status = status;
  if (imageUrl !== undefined) cause.imageUrl = imageUrl;
  if (endDate !== undefined) cause.endDate = endDate;

  await cause.save();

  return await Cause.findById(cause._id)
    .populate('createdBy', 'firstName lastName email')
    .lean();
};

export const deleteCause = async (id) => {
  const cause = await Cause.findById(id);
  if (!cause) throw new Error('Cause not found');
  if (cause.currentAmount > 0) {
    throw new Error('Cannot delete a cause that has received donations. Consider marking it as cancelled instead.');
  }

  await Cause.findByIdAndDelete(id);
  return cause;
};

export const toggleArchiveCause = async (id) => {
  const cause = await Cause.findById(id);
  if (!cause) throw new Error('Cause not found');

  if (cause.status === 'active') {
    cause.status = 'cancelled';
  } else if (cause.status === 'cancelled') {
    cause.status = 'active';
  } else {
    cause.status = 'cancelled';
  }

  await cause.save();

  return await Cause.findById(cause._id)
    .populate('createdBy', 'firstName lastName email')
    .lean();
};

export const updateExpiredCauses = async () => {
  return await updateExpired();
};
