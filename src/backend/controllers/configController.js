import { sendResponse } from "../utils/response.js";
import * as configService from "../services/configService.js";
import { logConfigUpdated } from "../services/auditLogService.js";

export const getConfig = async (req, res) => {
  try {
    const config = await configService.getConfig();
    res.json({
      success: true,
      data: {
        minimumDonation: config.minimumDonation,
        currency: config.currency
      }
    });
  } catch (error) {
    console.error('Error fetching platform config:', error);
    sendResponse(res, 500, false, 'Server error while fetching configuration' );
  }
};

export const updateConfig = async (req, res) => {
  try {
    const { minimumDonation, currency } = req.body;
    
    if (minimumDonation) {
      if (minimumDonation.amount !== undefined && (typeof minimumDonation.amount !== 'number' || minimumDonation.amount < 0.01)) {
        return sendResponse(res, 400, false, 'Minimum donation amount must be at least 0.01' );
      }
      if (minimumDonation.enabled !== undefined && typeof minimumDonation.enabled !== 'boolean') {
        return sendResponse(res, 400, false, 'Minimum donation enabled must be a boolean' );
      }
    }
    
    if (currency) {
      const validCurrencyCodes = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY'];
      if (currency.code && !validCurrencyCodes.includes(currency.code)) {
        return res.status(400).json({ success: false, message: `Currency code must be one of: ${validCurrencyCodes.join(', ')}` });
      }
      if (currency.position && !['before', 'after'].includes(currency.position)) {
        return sendResponse(res, 400, false, 'Currency position must be "before" or "after"' );
      }
      if (currency.decimalPlaces !== undefined && (typeof currency.decimalPlaces !== 'number' || currency.decimalPlaces < 0 || currency.decimalPlaces > 4)) {
        return sendResponse(res, 400, false, 'Decimal places must be between 0 and 4' );
      }
    }
    
    const updatedConfig = await configService.updateConfig(minimumDonation, currency, req.user._id);
    await logConfigUpdated(req.user._id, { minimumDonation, currency });
    
    res.json({
      success: true,
      message: 'Platform configuration updated successfully',
      data: {
        minimumDonation: updatedConfig.minimumDonation,
        currency: updatedConfig.currency
      }
    });
  } catch (error) {
    console.error('Error updating platform config:', error);
    sendResponse(res, 500, false, 'Server error while updating configuration' );
  }
};

export const getCurrencyPresets = (req, res) => {
  const presets = configService.getCurrencyPresets();
  sendResponse(res, 200, true, 'Success', presets );
};
