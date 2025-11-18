import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AdminPlatformConfig from '../pages/AdminPlatformConfig';
import { configAPI } from '../api';
import userEvent from '@testing-library/user-event';

vi.mock('../../api', () => ({
  configAPI: {
    getConfig: vi.fn(),
    updateConfig: vi.fn(),
    getCurrencyPresets: vi.fn(),
  },
}));

vi.mock('../../utils/currencyFormatter', () => ({
  formatCurrencySync: vi.fn((amount) => `$${amount}`),
  invalidateConfigCache: vi.fn(),
}));

const mockConfig = {
  currency: 'USD',
  minimumDonation: 10,
  platformFee: 0.05,
  maxDonationAmount: 10000,
};

describe('AdminPlatformConfig Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderAdminPlatformConfig = () => {
    return render(
      <BrowserRouter>
        <AdminPlatformConfig />
      </BrowserRouter>
    );
  };

  it('should display loading state', () => {
    configAPI.getConfig.mockImplementation(() => new Promise(() => {}));
    configAPI.getCurrencyPresets.mockResolvedValue({ data: { data: [] } });
    renderAdminPlatformConfig();
    
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should fetch and display config', async () => {
    configAPI.getConfig.mockResolvedValueOnce({
      data: { data: mockConfig },
    });
    configAPI.getCurrencyPresets.mockResolvedValue({ data: { data: [] } });

    renderAdminPlatformConfig();
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('USD')).toBeInTheDocument();
    });
  });

  it('should update currency', async () => {
    const user = userEvent.setup();
    configAPI.getConfig.mockResolvedValue({
      data: { data: mockConfig },
    });
    configAPI.getCurrencyPresets.mockResolvedValue({ data: { data: [] } });
    configAPI.updateConfig.mockResolvedValueOnce({ data: {} });

    renderAdminPlatformConfig();
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('USD')).toBeInTheDocument();
    });

    const currencySelect = screen.getByLabelText(/currency/i);
    await user.selectOptions(currencySelect, 'EUR');
    
    const saveButton = screen.getByText(/save/i);
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(configAPI.updateConfig).toHaveBeenCalled();
    });
  });

  it('should update minimum donation', async () => {
    const user = userEvent.setup();
    configAPI.getConfig.mockResolvedValue({
      data: { data: mockConfig },
    });
    configAPI.getCurrencyPresets.mockResolvedValue({ data: { data: [] } });
    configAPI.updateConfig.mockResolvedValueOnce({ data: {} });

    renderAdminPlatformConfig();
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    const minDonationInput = screen.getByLabelText(/minimum donation/i);
    await user.clear(minDonationInput);
    await user.type(minDonationInput, '20');
    
    const saveButton = screen.getByText(/save/i);
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(configAPI.updateConfig).toHaveBeenCalled();
    });
  });

  it('should validate minimum donation', async () => {
    const user = userEvent.setup();
    configAPI.getConfig.mockResolvedValue({
      data: { data: mockConfig },
    });
    configAPI.getCurrencyPresets.mockResolvedValue({ data: { data: [] } });

    renderAdminPlatformConfig();
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('10')).toBeInTheDocument();
    });

    const minDonationInput = screen.getByLabelText(/minimum donation/i);
    await user.clear(minDonationInput);
    await user.type(minDonationInput, '-5');
    
    const saveButton = screen.getByText(/save/i);
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/must be positive/i)).toBeInTheDocument();
    });
  });

  it('should handle cancel', async () => {
    const user = userEvent.setup();
    configAPI.getConfig.mockResolvedValue({
      data: { data: mockConfig },
    });
    configAPI.getCurrencyPresets.mockResolvedValue({ data: { data: [] } });

    renderAdminPlatformConfig();
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('USD')).toBeInTheDocument();
    });

    const currencySelect = screen.getByLabelText(/currency/i);
    await user.selectOptions(currencySelect, 'EUR');
    
    const cancelButton = screen.getByText(/cancel/i);
    await user.click(cancelButton);
    
    expect(screen.getByDisplayValue('USD')).toBeInTheDocument();
  });

  it('should handle error', async () => {
    configAPI.getConfig.mockRejectedValue(new Error('Failed'));
    configAPI.getCurrencyPresets.mockResolvedValue({ data: { data: [] } });

    renderAdminPlatformConfig();
    
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  it('should display success message', async () => {
    const user = userEvent.setup();
    configAPI.getConfig.mockResolvedValue({
      data: { data: mockConfig },
    });
    configAPI.getCurrencyPresets.mockResolvedValue({ data: { data: [] } });
    configAPI.updateConfig.mockResolvedValueOnce({ data: {} });

    renderAdminPlatformConfig();
    
    await waitFor(() => {
      expect(screen.getByDisplayValue('USD')).toBeInTheDocument();
    });

    const saveButton = screen.getByText(/save/i);
    await user.click(saveButton);
    
    await waitFor(() => {
      expect(screen.getByText(/saved successfully/i)).toBeInTheDocument();
    });
  });
});
