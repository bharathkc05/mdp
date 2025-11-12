/**
 * Story 4.3: Export Analytics Data as CSV
 * Utility functions for converting analytics data to CSV format
 */

/**
 * Convert array of objects to CSV string
 * @param {Array} data - Array of objects to convert
 * @param {Array} headers - Optional custom headers
 * @returns {string} CSV formatted string
 */
export const convertToCSV = (data, headers = null) => {
  if (!data || data.length === 0) {
    return '';
  }

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create header row
  const headerRow = csvHeaders.join(',');
  
  // Create data rows
  const dataRows = data.map(row => {
    return csvHeaders.map(header => {
      let cell = row[header];
      
      // Handle null/undefined
      if (cell === null || cell === undefined) {
        return '';
      }
      
      // Handle objects (convert to JSON string)
      if (typeof cell === 'object') {
        cell = JSON.stringify(cell);
      }
      
      // Convert to string and escape quotes
      cell = String(cell).replace(/"/g, '""');
      
      // Wrap in quotes if contains comma, newline, or quote
      if (cell.includes(',') || cell.includes('\n') || cell.includes('"')) {
        return `"${cell}"`;
      }
      
      return cell;
    }).join(',');
  });
  
  return [headerRow, ...dataRows].join('\n');
};

/**
 * Download CSV file
 * @param {string} csvContent - CSV formatted string
 * @param {string} filename - Name of the file to download
 */
export const downloadCSV = (csvContent, filename) => {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    // Create a link and trigger download
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

/**
 * Format analytics data for CSV export
 * @param {Object} analyticsData - Complete analytics data object
 * @param {string} dateRange - Selected date range
 * @returns {Object} Formatted data ready for CSV export
 */
export const formatAnalyticsForExport = (analyticsData, dateRange) => {
  const {
    aggregatedData,
    trendData,
    categoryData,
    topCauses,
    performanceMetrics
  } = analyticsData;

  // Format causes summary
  const causesSummary = aggregatedData?.causes?.map(cause => ({
    'Cause Name': cause.name,
    'Category': cause.category?.replace('-', ' ').toUpperCase() || 'N/A',
    'Status': cause.status?.toUpperCase() || 'N/A',
    'Target Amount': cause.targetAmount || 0,
    'Current Amount': cause.currentAmount || 0,
    'Percentage Achieved': `${cause.percentageAchieved || 0}%`,
    'Donor Count': cause.donorCount || 0,
    'Average Donation': cause.averageDonation || 0,
    'Remaining Amount': cause.remainingAmount || 0,
    'Days Remaining': cause.daysRemaining !== null ? cause.daysRemaining : 'N/A'
  })) || [];

  // Format donation trends
  const donationTrends = trendData?.map(trend => ({
    'Period': trend.period || trend._id,
    'Total Amount': trend.totalAmount || 0,
    'Donation Count': trend.donationCount || 0,
    'Unique Donors': trend.uniqueDonorCount || 0
  })) || [];

  // Format category breakdown
  const categories = categoryData?.map(cat => ({
    'Category': cat.category?.replace('-', ' ').toUpperCase() || 'N/A',
    'Total Causes': cat.totalCauses || 0,
    'Active Causes': cat.activeCauses || 0,
    'Completed Causes': cat.completedCauses || 0,
    'Total Donations': cat.totalDonations || 0,
    'Total Target': cat.totalTarget || 0,
    'Total Donors': cat.totalDonors || 0,
    'Average Completion': `${cat.averageCompletion || 0}%`
  })) || [];

  // Format top causes
  const topPerformers = topCauses?.map((cause, index) => ({
    'Rank': index + 1,
    'Cause Name': cause.name,
    'Category': cause.category?.replace('-', ' ').toUpperCase() || 'N/A',
    'Current Amount': cause.currentAmount || 0,
    'Target Amount': cause.targetAmount || 0,
    'Percentage': `${cause.percentageAchieved || 0}%`,
    'Donor Count': cause.donorCount || 0,
    'Status': cause.status?.toUpperCase() || 'N/A'
  })) || [];

  return {
    causesSummary,
    donationTrends,
    categories,
    topPerformers,
    metadata: {
      exportDate: new Date().toISOString(),
      dateRange,
      totalCauses: performanceMetrics?.causes?.totalCauses || 0,
      totalRaised: performanceMetrics?.donations?.totalAmount || 0,
      totalDonations: performanceMetrics?.donations?.totalDonations || 0
    }
  };
};

/**
 * Export complete analytics report as CSV
 * @param {Object} analyticsData - Complete analytics data
 * @param {string} dateRange - Selected date range
 * @param {string} trendPeriod - Selected trend period
 */
export const exportAnalyticsReport = (analyticsData, dateRange, trendPeriod) => {
  const formattedData = formatAnalyticsForExport(analyticsData, dateRange);
  const timestamp = new Date().toISOString().split('T')[0];
  
  // Export Summary Report (All Causes)
  if (formattedData.causesSummary.length > 0) {
    const summaryCSV = convertToCSV(formattedData.causesSummary);
    downloadCSV(summaryCSV, `donation-summary-${dateRange}days-${timestamp}.csv`);
  }
  
  return formattedData;
};

/**
 * Export individual data sections
 */
export const exportCausesSummary = (data, dateRange) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const csv = convertToCSV(data);
  downloadCSV(csv, `causes-summary-${dateRange}days-${timestamp}.csv`);
};

export const exportDonationTrends = (data, dateRange, period) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const csv = convertToCSV(data);
  downloadCSV(csv, `donation-trends-${period}-${dateRange}days-${timestamp}.csv`);
};

export const exportCategoryBreakdown = (data, dateRange) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const csv = convertToCSV(data);
  downloadCSV(csv, `category-breakdown-${dateRange}days-${timestamp}.csv`);
};

export const exportTopCauses = (data, dateRange) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const csv = convertToCSV(data);
  downloadCSV(csv, `top-causes-${dateRange}days-${timestamp}.csv`);
};
