import PlatformConfig from "../models/PlatformConfig.js";

export const getConfig = async () => {
  return await PlatformConfig.getConfig();
};

export const updateConfig = async (minimumDonation, currency, userId) => {
  return await PlatformConfig.updateConfig({ minimumDonation, currency }, userId);
};

export const getCurrencyPresets = () => {
  return [
    { code: 'USD', symbol: '$', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', name: 'US Dollar' },
    { code: 'EUR', symbol: '€', position: 'before', decimalPlaces: 2, thousandsSeparator: '.', decimalSeparator: ',', name: 'Euro' },
    { code: 'GBP', symbol: '£', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', name: 'British Pound' },
    { code: 'INR', symbol: '₹', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', name: 'Indian Rupee' },
    { code: 'CAD', symbol: 'CA$', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', name: 'Canadian Dollar' },
    { code: 'AUD', symbol: 'A$', position: 'before', decimalPlaces: 2, thousandsSeparator: ',', decimalSeparator: '.', name: 'Australian Dollar' },
    { code: 'JPY', symbol: '¥', position: 'before', decimalPlaces: 0, thousandsSeparator: ',', decimalSeparator: '.', name: 'Japanese Yen' }
  ];
};
