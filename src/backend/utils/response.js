/**
 * Standardized API Response formatter
 * 
 * @param {Object} res - Express response object
 * @param {number} statusCode - HTTP status code
 * @param {boolean} success - Boolean indicating success or failure
 * @param {string} message - Descriptive message
 * @param {Object} [data=null] - Optional data payload
 */
export const sendResponse = (res, statusCode, success, message, data = null) => {
  const responsePayload = {
    success,
    message
  };
  
  if (data !== null) {
    responsePayload.data = data;
  }
  
  return res.status(statusCode).json(responsePayload);
};
