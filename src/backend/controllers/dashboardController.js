import * as dashboardService from "../services/dashboardService.js";
import { sendResponse } from "../utils/response.js";

export const getAggregatedDonations = async (req, res) => {
  try {
    const { status, category, sortBy = 'currentAmount', order = 'desc' } = req.query;
    const result = await dashboardService.getAggregatedDonations(status, category, sortBy, order);
    
    res.json({
      success: true,
      message: 'Aggregated donation data retrieved successfully',
      data: {
        causes: result.causes,
        statistics: result.statistics,
        filters: { status: status || 'all', category: category || 'all', sortBy, order }
      }
    });
  } catch (error) {
    console.error('Error fetching aggregated donations:', error);
    sendResponse(res, 500, false, 'Server error while fetching aggregated donation data');
  }
};

export const getDonationTrends = async (req, res) => {
  try {
    const { period = 'daily', limit = 30 } = req.query;
    const trends = await dashboardService.getDonationTrends(period, limit);
    
    res.json({
      success: true,
      data: { trends, period, limit: parseInt(limit) }
    });
  } catch (error) {
    console.error('Error fetching donation trends:', error);
    sendResponse(res, 500, false, 'Server error while fetching donation trends');
  }
};

export const getCategoryBreakdown = async (req, res) => {
  try {
    const categoryStats = await dashboardService.getCategoryBreakdown();
    sendResponse(res, 200, true, 'Success', categoryStats );
  } catch (error) {
    console.error('Error fetching category breakdown:', error);
    sendResponse(res, 500, false, 'Server error while fetching category breakdown');
  }
};

export const getTopCauses = async (req, res) => {
  try {
    const { limit = 5, sortBy = 'currentAmount' } = req.query;
    const topCauses = await dashboardService.getTopCauses(limit, sortBy);
    sendResponse(res, 200, true, 'Success', topCauses );
  } catch (error) {
    console.error('Error fetching top causes:', error);
    sendResponse(res, 500, false, 'Server error while fetching top causes');
  }
};

export const getDonorInsights = async (req, res) => {
  try {
    const donorInsights = await dashboardService.getDonorInsights();
    sendResponse(res, 200, true, 'Success', donorInsights );
  } catch (error) {
    console.error('Error fetching donor insights:', error);
    sendResponse(res, 500, false, 'Server error while fetching donor insights');
  }
};

export const getPerformanceMetrics = async (req, res) => {
  try {
    const metrics = await dashboardService.getPerformanceMetrics();
    sendResponse(res, 200, true, 'Success', metrics );
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    sendResponse(res, 500, false, 'Server error while fetching performance metrics');
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const stats = await dashboardService.getDashboardStats();
    sendResponse(res, 200, true, 'Success', stats );
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    sendResponse(res, 500, false, 'Server error while fetching dashboard statistics');
  }
};
