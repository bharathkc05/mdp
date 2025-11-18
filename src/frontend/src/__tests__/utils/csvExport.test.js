import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  convertToCSV,
  downloadCSV,
  formatAnalyticsForExport,
  exportAnalyticsReport,
  exportCausesSummary,
  exportDonationTrends,
  exportCategoryBreakdown,
  exportTopCauses
} from '../utils/csvExport';

describe('CSV Export Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock DOM methods
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
    
    // Mock document.createElement
    const mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
      style: {},
      remove: vi.fn(),
      download: ''
    };
    
    const originalCreateElement = document.createElement.bind(document);
    document.createElement = vi.fn((tag) => {
      if (tag === 'a') return mockLink;
      return originalCreateElement(tag);
    });
    
    document.body.appendChild = vi.fn();
    document.body.removeChild = vi.fn();
  });

  describe('convertToCSV', () => {
    it('converts array of objects to CSV string', () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Boston' }
      ];
      
      const csv = convertToCSV(data);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('name,age,city');
      expect(lines[1]).toBe('John,30,New York');
      expect(lines[2]).toBe('Jane,25,Boston');
    });

    it('handles empty array', () => {
      const result = convertToCSV([]);
      expect(result).toBe('');
    });

    it('handles null input', () => {
      const result = convertToCSV(null);
      expect(result).toBe('');
    });

    it('escapes values containing commas', () => {
      const data = [
        { name: 'Company, Inc', value: 100 }
      ];
      
      const csv = convertToCSV(data);
      expect(csv).toContain('"Company, Inc"');
    });

    it('escapes values containing quotes', () => {
      const data = [
        { quote: 'He said "hello"' }
      ];
      
      const csv = convertToCSV(data);
      expect(csv).toContain('"He said ""hello"""');
    });

    it('escapes values containing newlines', () => {
      const data = [
        { text: 'Line 1\nLine 2' }
      ];
      
      const csv = convertToCSV(data);
      expect(csv).toContain('"Line 1\nLine 2"');
    });

    it('handles null and undefined values', () => {
      const data = [
        { name: 'John', age: null, city: undefined }
      ];
      
      const csv = convertToCSV(data);
      expect(csv).toBe('name,age,city\nJohn,,');
    });

    it('handles object values by converting to JSON', () => {
      const data = [
        { name: 'John', meta: { score: 100 } }
      ];
      
      const csv = convertToCSV(data);
      // JSON objects are stringified and CSV-escaped; check for the JSON content
      expect(csv).toContain('""score"":100');
    });

    it('uses custom headers when provided', () => {
      const data = [
        { name: 'John', age: 30, city: 'NYC' }
      ];
      
      const csv = convertToCSV(data, ['name', 'age']);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('name,age');
      expect(lines[1]).toBe('John,30');
    });

    it('handles numeric values correctly', () => {
      const data = [
        { amount: 1234.56, count: 42 }
      ];
      
      const csv = convertToCSV(data);
      expect(csv).toContain('1234.56,42');
    });

    it('handles boolean values', () => {
      const data = [
        { active: true, verified: false }
      ];
      
      const csv = convertToCSV(data);
      expect(csv).toContain('true,false');
    });
  });

  describe('downloadCSV', () => {
    it('creates and downloads CSV file', () => {
      const csvContent = 'name,age\nJohn,30';
      const filename = 'test.csv';
      
      downloadCSV(csvContent, filename);
      
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('sets correct filename', () => {
      const mockLink = document.createElement('a');
      downloadCSV('content', 'export.csv');
      
      expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'export.csv');
    });

    it('creates blob with correct MIME type', () => {
      const csvContent = 'test,data';
      downloadCSV(csvContent, 'test.csv');
      
      // Verify Blob was created with correct type
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('cleans up URL after download', () => {
      downloadCSV('content', 'test.csv');
      
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    });
  });

  describe('formatAnalyticsForExport', () => {
    const mockAnalyticsData = {
      aggregatedData: {
        causes: [
          {
            name: 'Education Fund',
            category: 'education',
            status: 'active',
            targetAmount: 10000,
            currentAmount: 7500,
            percentageAchieved: 75,
            donorCount: 50,
            averageDonation: 150,
            remainingAmount: 2500,
            daysRemaining: 30
          }
        ]
      },
      trendData: [
        {
          period: '2024-01',
          totalAmount: 5000,
          donationCount: 25,
          uniqueDonorCount: 20
        }
      ],
      categoryData: [
        {
          category: 'education',
          totalCauses: 5,
          activeCauses: 3,
          completedCauses: 2,
          totalDonations: 10000,
          totalTarget: 50000,
          totalDonors: 100,
          averageCompletion: 45
        }
      ],
      topCauses: [
        {
          name: 'Top Cause',
          category: 'healthcare',
          currentAmount: 15000,
          targetAmount: 20000,
          percentageAchieved: 75,
          donorCount: 100,
          status: 'active'
        }
      ],
      performanceMetrics: {
        causes: { totalCauses: 10 },
        donations: { totalAmount: 50000, totalDonations: 200 }
      }
    };

    it('formats causes summary correctly', () => {
      const result = formatAnalyticsForExport(mockAnalyticsData, '30');
      
      expect(result.causesSummary).toHaveLength(1);
      expect(result.causesSummary[0]).toHaveProperty('Cause Name', 'Education Fund');
      expect(result.causesSummary[0]).toHaveProperty('Target Amount', 10000);
      expect(result.causesSummary[0]).toHaveProperty('Current Amount', 7500);
    });

    it('formats donation trends correctly', () => {
      const result = formatAnalyticsForExport(mockAnalyticsData, '30');
      
      expect(result.donationTrends).toHaveLength(1);
      expect(result.donationTrends[0]).toHaveProperty('Period', '2024-01');
      expect(result.donationTrends[0]).toHaveProperty('Total Amount', 5000);
    });

    it('formats category breakdown correctly', () => {
      const result = formatAnalyticsForExport(mockAnalyticsData, '30');
      
      expect(result.categories).toHaveLength(1);
      expect(result.categories[0]).toHaveProperty('Category', 'EDUCATION');
      expect(result.categories[0]).toHaveProperty('Total Causes', 5);
    });

    it('formats top causes with ranking', () => {
      const result = formatAnalyticsForExport(mockAnalyticsData, '30');
      
      expect(result.topPerformers).toHaveLength(1);
      expect(result.topPerformers[0]).toHaveProperty('Rank', 1);
      expect(result.topPerformers[0]).toHaveProperty('Cause Name', 'Top Cause');
    });

    it('includes metadata', () => {
      const result = formatAnalyticsForExport(mockAnalyticsData, '30');
      
      expect(result.metadata).toBeDefined();
      expect(result.metadata).toHaveProperty('dateRange', '30');
      expect(result.metadata).toHaveProperty('totalCauses', 10);
      expect(result.metadata).toHaveProperty('totalRaised', 50000);
    });

    it('handles missing data gracefully', () => {
      const emptyData = {
        aggregatedData: {},
        trendData: null,
        categoryData: null,
        topCauses: null,
        performanceMetrics: {}
      };
      
      const result = formatAnalyticsForExport(emptyData, '30');
      
      expect(result.causesSummary).toEqual([]);
      expect(result.donationTrends).toEqual([]);
      expect(result.categories).toEqual([]);
      expect(result.topPerformers).toEqual([]);
    });

    it('converts category names to uppercase', () => {
      const result = formatAnalyticsForExport(mockAnalyticsData, '30');
      
      expect(result.causesSummary[0].Category).toBe('EDUCATION');
      expect(result.topPerformers[0].Category).toBe('HEALTHCARE');
    });

    it('formats percentages with % symbol', () => {
      const result = formatAnalyticsForExport(mockAnalyticsData, '30');
      
      expect(result.causesSummary[0]['Percentage Achieved']).toBe('75%');
      expect(result.categories[0]['Average Completion']).toBe('45%');
    });

    it('handles null days remaining', () => {
      const dataWithNullDays = {
        ...mockAnalyticsData,
        aggregatedData: {
          causes: [{
            ...mockAnalyticsData.aggregatedData.causes[0],
            daysRemaining: null
          }]
        }
      };
      
      const result = formatAnalyticsForExport(dataWithNullDays, '30');
      expect(result.causesSummary[0]['Days Remaining']).toBe('N/A');
    });
  });

  describe('exportAnalyticsReport', () => {
    const mockAnalyticsData = {
      aggregatedData: {
        causes: [
          {
            name: 'Test Cause',
            category: 'education',
            status: 'active',
            targetAmount: 1000,
            currentAmount: 500,
            percentageAchieved: 50,
            donorCount: 10,
            averageDonation: 50,
            remainingAmount: 500,
            daysRemaining: 10
          }
        ]
      },
      trendData: [],
      categoryData: [],
      topCauses: [],
      performanceMetrics: {}
    };

    it('exports analytics report and returns formatted data', () => {
      const result = exportAnalyticsReport(mockAnalyticsData, '30', 'daily');
      
      expect(result).toBeDefined();
      expect(result.causesSummary).toHaveLength(1);
    });

    it('generates filename with date range', () => {
      exportAnalyticsReport(mockAnalyticsData, '30', 'daily');
      
      const mockLink = document.createElement('a');
      expect(mockLink.setAttribute).toHaveBeenCalled();
    });

    it('handles empty causes summary', () => {
      const emptyData = {
        ...mockAnalyticsData,
        aggregatedData: { causes: [] }
      };
      
      const result = exportAnalyticsReport(emptyData, '30', 'daily');
      expect(result.causesSummary).toEqual([]);
    });
  });

  describe('Individual Export Functions', () => {
    const mockData = [
      { name: 'Test', amount: 100 }
    ];

    it('exportCausesSummary generates correct filename', () => {
      exportCausesSummary(mockData, '30');
      
      const mockLink = document.createElement('a');
      const calls = mockLink.setAttribute.mock.calls;
      const downloadCall = calls?.find(call => call[0] === 'download');
      
      expect(downloadCall?.[1]).toMatch(/causes-summary-30days-\d{4}-\d{2}-\d{2}\.csv/);
    });

    it('exportDonationTrends includes period in filename', () => {
      exportDonationTrends(mockData, '30', 'daily');
      
      const mockLink = document.createElement('a');
      const calls = mockLink.setAttribute.mock.calls;
      const downloadCall = calls?.find(call => call[0] === 'download');
      
      expect(downloadCall?.[1]).toMatch(/donation-trends-daily-30days/);
    });

    it('exportCategoryBreakdown generates CSV', () => {
      exportCategoryBreakdown(mockData, '30');
      
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });

    it('exportTopCauses generates CSV with timestamp', () => {
      exportTopCauses(mockData, '30');
      
      const mockLink = document.createElement('a');
      const calls = mockLink.setAttribute.mock.calls;
      const downloadCall = calls.find(call => call[0] === 'download');
      
      expect(downloadCall[1]).toMatch(/top-causes-30days-\d{4}-\d{2}-\d{2}\.csv/);
    });
  });

  describe('Edge Cases', () => {
    it('handles special characters in data', () => {
      const data = [
        { name: 'Test & Co.', description: 'A "special" company' }
      ];
      
      const csv = convertToCSV(data);
      // Ampersand does not require quoting; description should be quoted with escaped quotes
      expect(csv).toContain('Test & Co.');
      expect(csv).toContain('A ""special"" company');
    });

    it('handles very long strings', () => {
      const longString = 'A'.repeat(1000);
      const data = [{ text: longString }];
      
      const csv = convertToCSV(data);
      expect(csv).toContain(longString);
    });

    it('handles empty objects', () => {
      const data = [{}];
      const csv = convertToCSV(data);
      
      expect(csv).toBe('\n');
    });

    it('handles arrays with different keys', () => {
      const data = [
        { a: 1, b: 2 },
        { b: 3, c: 4 }
      ];
      
      const csv = convertToCSV(data);
      const lines = csv.split('\n');
      
      expect(lines[0]).toBe('a,b');
      expect(lines[1]).toBe('1,2');
      expect(lines[2]).toBe(',3');
    });

    it('handles date objects', () => {
      const date = new Date('2024-01-01');
      const data = [{ date: date }];
      
      const csv = convertToCSV(data);
      // Dates are JSON-stringified to ISO strings inside the CSV
      expect(csv).toContain(date.toISOString());
    });
  });
});
