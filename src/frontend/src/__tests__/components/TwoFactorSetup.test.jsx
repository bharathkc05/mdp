import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TwoFactorSetup from '../components/TwoFactorSetup';
import { API } from '../api';

vi.mock('../../api', () => ({
  API: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe('TwoFactorSetup Component', () => {
  const mockQRCode = 'data:image/png;base64,mockQRCode';
  const mockSecret = 'JBSWY3DPEHPK3PXP';
  const mockBackupCodes = [
    'AAAA-AAAA-AAAA',
    'BBBB-BBBB-BBBB',
    'CCCC-CCCC-CCCC',
    'DDDD-DDDD-DDDD',
    'EEEE-EEEE-EEEE',
    'FFFF-FFFF-FFFF',
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock 2FA status check
    API.get.mockResolvedValue({
      data: {
        data: {
          twoFactorEnabled: false
        }
      }
    });
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Initial State - 2FA Disabled', () => {
    it('renders initial setup screen when 2FA is disabled', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByText('Two-Factor Authentication (2FA)')).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Add an extra layer of security/)).toBeInTheDocument();
      expect(screen.getByText(/currently disabled/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
    });

    it('checks 2FA status on mount', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(API.get).toHaveBeenCalledWith('/2fa/status');
      });
    });

    it('enables 2FA setup when button clicked', async () => {
      API.post.mockResolvedValue({
        data: {
          data: {
            qrCode: mockQRCode,
            secret: mockSecret
          }
        }
      });
      
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      const enableButton = screen.getByRole('button', { name: /Enable 2FA/i });
      fireEvent.click(enableButton);
      
      await waitFor(() => {
        expect(API.post).toHaveBeenCalledWith('/2fa/setup', {});
      });
    });
  });

  describe('Setup Step - QR Code Display', () => {
    beforeEach(async () => {
      API.post.mockResolvedValue({
        data: {
          data: {
            qrCode: mockQRCode,
            secret: mockSecret
          }
        }
      });
    });

    it('displays QR code after setup initiated', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Step 1: Scan QR Code')).toBeInTheDocument();
      });
      
      const qrImage = screen.getByAltText('2FA QR Code');
      expect(qrImage).toBeInTheDocument();
      expect(qrImage).toHaveAttribute('src', mockQRCode);
    });

    it('displays manual entry code', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Manual Entry Code:')).toBeInTheDocument();
        expect(screen.getByText(mockSecret)).toBeInTheDocument();
      });
    });

    it('shows success message after QR code generated', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/QR code generated!/)).toBeInTheDocument();
      });
    });

    it('displays verification code input', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByText('Step 2: Verify Code')).toBeInTheDocument();
      });
      
      const codeInput = screen.getByLabelText(/Enter 6-digit code/i);
      expect(codeInput).toBeInTheDocument();
      expect(codeInput).toHaveAttribute('maxLength', '6');
      expect(codeInput).toHaveAttribute('pattern', '[0-9]{6}');
    });
  });

  describe('Verification Step', () => {
    beforeEach(async () => {
      API.post.mockResolvedValueOnce({
        data: {
          data: {
            qrCode: mockQRCode,
            secret: mockSecret
          }
        }
      });
    });

    it('accepts 6-digit verification code', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Enter 6-digit code/i)).toBeInTheDocument();
      });
      
      const codeInput = screen.getByLabelText(/Enter 6-digit code/i);
      await userEvent.type(codeInput, '123456');
      
      expect(codeInput.value).toBe('123456');
    });

    it('enables verify button when code length is 6', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Enter 6-digit code/i)).toBeInTheDocument();
      });
      
      const codeInput = screen.getByLabelText(/Enter 6-digit code/i);
      const verifyButton = screen.getByRole('button', { name: /Verify and Enable 2FA/i });
      
      expect(verifyButton).toBeDisabled();
      
      await userEvent.type(codeInput, '123456');
      
      expect(verifyButton).not.toBeDisabled();
    });

    it('verifies setup successfully and shows backup codes', async () => {
      API.post.mockResolvedValueOnce({
        data: {
          data: {
            qrCode: mockQRCode,
            secret: mockSecret
          }
        }
      }).mockResolvedValueOnce({
        data: {
          data: {
            backupCodes: mockBackupCodes
          }
        }
      });
      
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Enter 6-digit code/i)).toBeInTheDocument();
      });
      
      const codeInput = screen.getByLabelText(/Enter 6-digit code/i);
      await userEvent.type(codeInput, '123456');
      
      const verifyButton = screen.getByRole('button', { name: /Verify and Enable 2FA/i });
      fireEvent.click(verifyButton);
      
      await waitFor(() => {
        expect(API.post).toHaveBeenCalledWith('/2fa/verify-setup', { token: '123456' });
      });
      
      await waitFor(() => {
        expect(screen.getByText(/2FA enabled successfully!/)).toBeInTheDocument();
      });
      
      // Check backup codes are displayed
      mockBackupCodes.forEach(code => {
        expect(screen.getByText(code)).toBeInTheDocument();
      });
    });

    it('displays error for invalid verification code', async () => {
      API.post.mockResolvedValueOnce({
        data: {
          data: {
            qrCode: mockQRCode,
            secret: mockSecret
          }
        }
      }).mockRejectedValueOnce({
        response: {
          data: {
            message: 'Invalid verification code'
          }
        }
      });
      
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Enter 6-digit code/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/Enter 6-digit code/i), '000000');
      fireEvent.click(screen.getByRole('button', { name: /Verify and Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Invalid verification code/)).toBeInTheDocument();
      });
    });
  });

  describe('Backup Codes', () => {
    beforeEach(async () => {
      API.post.mockResolvedValueOnce({
        data: {
          data: {
            qrCode: mockQRCode,
            secret: mockSecret
          }
        }
      }).mockResolvedValueOnce({
        data: {
          data: {
            backupCodes: mockBackupCodes
          }
        }
      });
    });

    it('displays all backup codes', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Enter 6-digit code/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/Enter 6-digit code/i), '123456');
      fireEvent.click(screen.getByRole('button', { name: /Verify and Enable 2FA/i }));
      
      await waitFor(() => {
        mockBackupCodes.forEach(code => {
          expect(screen.getByText(code)).toBeInTheDocument();
        });
      });
    });

    it('allows downloading backup codes', async () => {
      const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
      const mockRevokeObjectURL = vi.fn();
      global.URL.createObjectURL = mockCreateObjectURL;
      global.URL.revokeObjectURL = mockRevokeObjectURL;
      
      // Mock document.createElement and click
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
        remove: vi.fn(),
        style: {}
      };
      const originalCreateElement = document.createElement.bind(document);
      document.createElement = vi.fn((tag) => {
        if (tag === 'a') return mockLink;
        return originalCreateElement(tag);
      });
      
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Enter 6-digit code/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/Enter 6-digit code/i), '123456');
      fireEvent.click(screen.getByRole('button', { name: /Verify and Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Download Backup Codes/)).toBeInTheDocument();
      });
      
      const downloadButton = screen.getByText(/Download Backup Codes/);
      fireEvent.click(downloadButton);
      
      expect(mockLink.click).toHaveBeenCalled();
      expect(mockLink.download).toBe('mdp-2fa-backup-codes.txt');
    });

    it('shows warning message about saving backup codes', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Enter 6-digit code/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/Enter 6-digit code/i), '123456');
      fireEvent.click(screen.getByRole('button', { name: /Verify and Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Important: Save Your Backup Codes/)).toBeInTheDocument();
      });
    });
  });

  describe('Enabled State', () => {
    beforeEach(() => {
      API.get.mockResolvedValue({
        data: {
          data: {
            twoFactorEnabled: true
          }
        }
      });
    });

    it('shows enabled state when 2FA is active', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByText(/Two-factor authentication is enabled/)).toBeInTheDocument();
      });
      
      expect(screen.getByText(/Your account is protected/)).toBeInTheDocument();
    });

    it('displays disable 2FA form', async () => {
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByText('Disable 2FA')).toBeInTheDocument();
      });
      
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Disable 2FA/i })).toBeInTheDocument();
    });

    it('disables 2FA with correct password', async () => {
      API.post.mockResolvedValue({
        data: { success: true }
      });
      
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      });
      
      const passwordInput = screen.getByLabelText(/Password/i);
      await userEvent.type(passwordInput, 'SecurePassword123!');
      
      const disableButton = screen.getByRole('button', { name: /Disable 2FA/i });
      fireEvent.click(disableButton);
      
      await waitFor(() => {
        expect(API.post).toHaveBeenCalledWith('/2fa/disable', { password: 'SecurePassword123!' });
      });
    });

    it('shows error for incorrect password', async () => {
      API.post.mockRejectedValue({
        response: {
          data: {
            message: 'Incorrect password'
          }
        }
      });
      
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      });
      
      await userEvent.type(screen.getByLabelText(/Password/i), 'WrongPassword');
      fireEvent.click(screen.getByRole('button', { name: /Disable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Incorrect password/)).toBeInTheDocument();
      });
    });

    it('clears password field after disabling', async () => {
      API.post.mockResolvedValue({
        data: { success: true }
      });
      
      // Mock to return disabled state after disable
      API.get.mockResolvedValueOnce({
        data: { data: { twoFactorEnabled: true } }
      });
      
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      });
      
      const passwordInput = screen.getByLabelText(/Password/i);
      await userEvent.type(passwordInput, 'Password123!');
      
      fireEvent.click(screen.getByRole('button', { name: /Disable 2FA/i }));
      
      await waitFor(() => {
        expect(API.post).toHaveBeenCalledWith('/2fa/disable', { password: 'Password123!' });
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state when enabling 2FA', async () => {
      API.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { data: { qrCode: mockQRCode, secret: mockSecret } }
        }), 100))
      );
      
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Setting up.../)).toBeInTheDocument();
      });
    });

    it('disables button during setup', async () => {
      API.post.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { data: { qrCode: mockQRCode, secret: mockSecret } }
        }), 100))
      );
      
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      const button = screen.getByRole('button', { name: /Enable 2FA/i });
      fireEvent.click(button);
      
      await waitFor(() => {
        expect(button).toBeDisabled();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles setup errors gracefully', async () => {
      API.post.mockRejectedValue({
        response: {
          data: {
            message: 'Setup failed'
          }
        }
      });
      
      render(<TwoFactorSetup />);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
      });
      
      fireEvent.click(screen.getByRole('button', { name: /Enable 2FA/i }));
      
      await waitFor(() => {
        expect(screen.getByText(/Setup failed/)).toBeInTheDocument();
      });
    });

    it('handles network errors during status check', async () => {
      API.get.mockRejectedValue(new Error('Network error'));
      
      // Should not throw
      expect(() => render(<TwoFactorSetup />)).not.toThrow();
    });
  });
});
