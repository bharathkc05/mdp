import * as causeService from "../services/causeService.js";
import { sendResponse } from "../utils/response.js";
import { 
  logCauseCreated, 
  logCauseUpdated, 
  logCauseDeleted, 
  logCauseArchived 
} from "../services/auditLogService.js";

export const getPublicCauses = async (req, res) => {
  try {
    const { search, category } = req.query;
    let query = { status: 'active' }; 
    
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }
    
    if (category && category.trim() && category !== 'all') {
      query.category = category.toLowerCase();
    }
    
    const causes = await causeService.getCauses(query);
    
    const causesWithPercentage = causes.map(cause => ({
      ...cause,
      percentageAchieved: cause.targetAmount > 0 
        ? Math.round((cause.currentAmount / cause.targetAmount) * 100) 
        : 0
    }));
    
    sendResponse(res, 200, true, 'Causes fetched successfully', causesWithPercentage);
  } catch (error) {
    console.error('Error fetching causes:', error);
    sendResponse(res, 500, false, 'Failed to fetch causes', { error: error.message });
  }
};

export const getPublicCauseById = async (req, res) => {
  try {
    const cause = await causeService.getCauseById(req.params.id);
    if (!cause) return sendResponse(res, 404, false, 'Cause not found');
    
    const percentageAchieved = cause.targetAmount > 0
      ? Math.round((cause.currentAmount / cause.targetAmount) * 100)
      : 0;
    sendResponse(res, 200, true, 'Cause fetched successfully', { ...cause, percentageAchieved });
  } catch (error) {
    console.error('Error fetching cause:', error);
    sendResponse(res, 500, false, 'Failed to fetch cause', { error: error.message });
  }
};

export const getAdminCauses = async (req, res) => {
  try {
    const causes = await causeService.getCauses({});
    sendResponse(res, 200, true, 'Admin causes fetched successfully', causes);
  } catch (error) {
    console.error('Error fetching admin causes:', error);
    sendResponse(res, 500, false, 'Server error while fetching causes');
  }
};

export const getAdminCauseById = async (req, res) => {
  try {
    const cause = await causeService.getCauseById(req.params.id);
    if (!cause) return sendResponse(res, 404, false, 'Cause not found');
    
    sendResponse(res, 200, true, 'Success', cause);
  } catch (error) {
    console.error('Error fetching cause:', error);
    sendResponse(res, 500, false, 'Server error while fetching cause');
  }
};

export const createCause = async (req, res) => {
  try {
    const { name, description, category, targetAmount, endDate } = req.body;
    
    if (!name || !description || !category || !targetAmount || !endDate) {
      return sendResponse(res, 400, false, 'Please provide all required fields');
    }
    
    if (targetAmount <= 0) return sendResponse(res, 400, false, 'Target amount must be greater than 0');

    const cause = await causeService.createCause(req.body, req.user._id);
    await logCauseCreated(req, cause);

    sendResponse(res, 201, true, 'Cause created successfully', cause);
  } catch (error) {
    console.error('Error creating cause:', error);
    sendResponse(res, 500, false, 'Server error while creating cause');
  }
};

export const updateCause = async (req, res) => {
  try {
    const updatedCause = await causeService.updateCause(req.params.id, req.body);
    await logCauseUpdated(req, updatedCause, req.body);

    sendResponse(res, 200, true, 'Cause updated successfully', updatedCause);
  } catch (error) {
    if (error.message === 'Cause not found') return sendResponse(res, 404, false, 'Cause not found');
    if (error.message === 'Target amount must be greater than 0') return sendResponse(res, 400, false, 'Target amount must be greater than 0');
    
    console.error('Error updating cause:', error);
    sendResponse(res, 500, false, 'Server error while updating cause');
  }
};

export const deleteCause = async (req, res) => {
  try {
    const cause = await causeService.deleteCause(req.params.id);
    await logCauseDeleted(req, cause);

    sendResponse(res, 200, true, 'Cause deleted successfully');
  } catch (error) {
    if (error.message === 'Cause not found') return sendResponse(res, 404, false, 'Cause not found');
    if (error.message.includes('Cannot delete')) return sendResponse(res, 400, false, error.message);
    
    console.error('Error deleting cause:', error);
    sendResponse(res, 500, false, 'Server error while deleting cause');
  }
};

export const archiveCause = async (req, res) => {
  try {
    const updatedCause = await causeService.toggleArchiveCause(req.params.id);
    await logCauseArchived(req, updatedCause);

    sendResponse(res, 200, true, `Cause ${updatedCause.status === 'cancelled' ? 'archived' : 'unarchived'} successfully`, updatedCause);
  } catch (error) {
    if (error.message === 'Cause not found') return sendResponse(res, 404, false, 'Cause not found');
    
    console.error('Error archiving cause:', error);
    sendResponse(res, 500, false, 'Server error while archiving cause');
  }
};

export const updateExpiredCauses = async (req, res) => {
  try {
    const count = await causeService.updateExpiredCauses();
    sendResponse(res, 200, true, 'Expired causes updated successfully', { updatedCount: count });
  } catch (error) {
    console.error('Error updating expired causes manually:', error);
    sendResponse(res, 500, false, 'Failed to update expired causes');
  }
};

export const getCategories = (req, res) => {
  const categories = [
    { value: 'education', label: 'Education' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'environment', label: 'Environment' },
    { value: 'disaster-relief', label: 'Disaster Relief' },
    { value: 'poverty', label: 'Poverty' },
    { value: 'animal-welfare', label: 'Animal Welfare' },
    { value: 'other', label: 'Other' }
  ];
  res.json({ success: true, categories });
};
