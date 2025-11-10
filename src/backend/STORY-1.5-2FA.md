# Story 1.5: Two-Factor Authentication (2FA) for Admins

## Overview
This feature implements TOTP-based Two-Factor Authentication (2FA) for administrator accounts, providing an additional layer of security for administrative functions.

## User Story
**As an administrator**, I want to enable two-factor authentication for my account, so that administrative functions are protected by an additional layer of security.

## Acceptance Criteria
✅ **AC1**: An admin user can enable 2FA in their account settings (using a TOTP app like Google Authenticator)  
✅ **AC2**: Once enabled, login requires both the password and a valid 2FA code  
✅ **AC3**: The system provides recovery codes in case the 2FA device is lost

## Implementation Details

### Backend Implementation

#### 1. User Model Updates (`src/backend/models/User.js`)
Added fields to support 2FA:
```javascript
{
  twoFactorSecret: String,           // TOTP secret key
  twoFactorEnabled: Boolean,         // 2FA status flag
  backupCodes: [{                    // Recovery codes
    code: String,
    used: Boolean
  }]
}
```

#### 2. 2FA Routes (`src/backend/routes/twoFactorRoutes.js`)
**Admin-only endpoints** (require authentication + admin role):

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/2fa/setup` | POST | Generate QR code and secret for 2FA enrollment |
| `/api/2fa/verify-setup` | POST | Verify TOTP code and enable 2FA |
| `/api/2fa/disable` | POST | Disable 2FA (requires password confirmation) |
| `/api/2fa/status` | GET | Check if 2FA is enabled |

#### 3. Modified Login Flow (`src/backend/routes/authRoutes.js`)
- After password validation, checks if admin has 2FA enabled
- If enabled, responds with `requiresTwoFactor: true`
- Accepts `twoFactorCode` or `backupCode` for second authentication factor
- Validates TOTP codes with 2-step time window for clock skew

#### 4. Dependencies
```json
{
  "speakeasy": "^2.0.0",  // TOTP generation and verification
  "qrcode": "^1.5.3"      // QR code generation
}
```

### Frontend Implementation

#### 1. TwoFactorSetup Component (`src/frontend/src/components/TwoFactorSetup.jsx`)
**Admin Dashboard Component** for managing 2FA:

**Features:**
- ✅ Check current 2FA status
- ✅ Enable 2FA with QR code display
- ✅ Manual secret entry option
- ✅ Verify TOTP code during setup
- ✅ Display and download backup codes
- ✅ Disable 2FA with password confirmation

**UI States:**
1. **Initial**: 2FA disabled, shows "Enable 2FA" button
2. **Setup**: Displays QR code and secret for scanning
3. **Verify**: Shows backup codes after successful verification
4. **Enabled**: Shows status and "Disable 2FA" option

#### 2. Updated Login Page (`src/frontend/src/pages/Login.jsx`)
**Enhanced login flow:**
- Regular email/password fields
- If 2FA required, displays additional code input field
- Toggle between TOTP code and backup code entry
- Clear visual feedback for 2FA requirement

#### 3. Updated Dashboard (`src/frontend/src/pages/Dashboard.jsx`)
- Displays 2FA setup component for admin users only
- Shows admin badge in user profile section

## Security Features

### 1. TOTP Implementation
- **Algorithm**: Time-based One-Time Password (RFC 6238)
- **Secret Length**: 32 characters (base32 encoded)
- **Time Window**: 30 seconds
- **Clock Skew Tolerance**: ±2 steps (±60 seconds)
- **Code Format**: 6 digits

### 2. Backup Codes
- **Quantity**: 10 codes generated per enrollment
- **Format**: 8-character hexadecimal (uppercase)
- **Single-use**: Each code can only be used once
- **Secure Storage**: Marked as "used" after authentication

### 3. Security Best Practices
- ✅ 2FA secrets stored encrypted in database
- ✅ Admin-only access to 2FA endpoints
- ✅ Password required to disable 2FA
- ✅ Rate limiting on login endpoint
- ✅ Backup codes for device loss recovery
- ✅ Clear audit trail of 2FA actions

## Testing

### Automated Test Script
**Location**: `src/backend/scripts/test-story-1.5-2fa.js`

**Test Coverage:**
1. ✅ Admin registration and verification
2. ✅ Initial 2FA status check
3. ✅ 2FA setup (QR code generation)
4. ✅ 2FA verification and enablement
5. ✅ Backup code generation
6. ✅ Login with 2FA requirement
7. ✅ Login with TOTP code
8. ✅ Login with backup code
9. ✅ Backup code single-use verification
10. ✅ 2FA disable functionality

**Run Tests:**
```bash
cd src/backend
node scripts/test-story-1.5-2fa.js
```

### Manual Testing

#### Test 1: Enable 2FA
1. Login as admin user
2. Navigate to Dashboard
3. Click "Enable 2FA"
4. Scan QR code with authenticator app
5. Enter 6-digit code
6. Save backup codes

#### Test 2: Login with 2FA
1. Logout
2. Login with email/password
3. System prompts for 2FA code
4. Enter code from authenticator app
5. Successfully logged in

#### Test 3: Use Backup Code
1. Logout
2. Login with email/password
3. Click "Use backup code"
4. Enter one of the backup codes
5. Successfully logged in
6. Verify same code cannot be reused

#### Test 4: Disable 2FA
1. Login as admin
2. Navigate to Dashboard
3. Scroll to 2FA section
4. Enter password
5. Click "Disable 2FA"
6. Verify 2FA is disabled

## Supported Authenticator Apps

| App | Platform | Download |
|-----|----------|----------|
| Google Authenticator | iOS, Android | App Store, Google Play |
| Microsoft Authenticator | iOS, Android | App Store, Google Play |
| Authy | iOS, Android, Desktop | authy.com |
| 1Password | Cross-platform | 1password.com |
| Bitwarden | Cross-platform | bitwarden.com |

## User Documentation

### For Administrators

#### Enabling 2FA
1. Login to your admin account
2. Go to Dashboard
3. Find "Two-Factor Authentication (2FA)" section
4. Click "Enable 2FA"
5. Download an authenticator app (if you don't have one)
6. Scan the QR code with your app
7. Enter the 6-digit code shown in your app
8. **IMPORTANT**: Save the backup codes in a secure location
9. You're all set! Next login will require 2FA

#### Using 2FA
1. Enter your email and password as usual
2. You'll see a prompt for your 2FA code
3. Open your authenticator app
4. Enter the 6-digit code
5. Click Login

#### Using Backup Codes
If you lose access to your authenticator app:
1. During login, click "Use backup code"
2. Enter one of your saved backup codes
3. Each code can only be used once
4. After logging in, set up 2FA again with a new device

#### Disabling 2FA
1. Login to your account (with 2FA)
2. Go to Dashboard
3. Find "Two-Factor Authentication (2FA)" section
4. Enter your password
5. Click "Disable 2FA"

## API Documentation

### POST /api/2fa/setup
**Description**: Generate QR code for 2FA enrollment  
**Authentication**: Required (Admin only)  
**Request Body**: None  
**Response**:
```json
{
  "success": true,
  "message": "Scan this QR code with your authenticator app",
  "data": {
    "qrCode": "data:image/png;base64,...",
    "secret": "JBSWY3DPEHPK3PXP",
    "otpauthUrl": "otpauth://totp/..."
  }
}
```

### POST /api/2fa/verify-setup
**Description**: Verify TOTP code and enable 2FA  
**Authentication**: Required (Admin only)  
**Request Body**:
```json
{
  "token": "123456"
}
```
**Response**:
```json
{
  "success": true,
  "message": "2FA enabled successfully!",
  "data": {
    "backupCodes": ["ABCD1234", "EFGH5678", ...]
  }
}
```

### POST /api/2fa/disable
**Description**: Disable 2FA  
**Authentication**: Required (Admin only)  
**Request Body**:
```json
{
  "password": "user_password"
}
```
**Response**:
```json
{
  "success": true,
  "message": "2FA has been disabled for your account"
}
```

### GET /api/2fa/status
**Description**: Check 2FA status  
**Authentication**: Required (Admin only)  
**Response**:
```json
{
  "success": true,
  "data": {
    "twoFactorEnabled": true
  }
}
```

### POST /api/auth/login (Enhanced)
**Description**: Login with optional 2FA  
**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "password123",
  "twoFactorCode": "123456",      // Optional: TOTP code
  "backupCode": "ABCD1234"        // Optional: Backup code
}
```

## Error Handling

| Error | Status | Message |
|-------|--------|---------|
| 2FA already enabled | 400 | "2FA is already enabled for your account" |
| Invalid verification code | 400 | "Invalid verification code. Please try again." |
| No 2FA secret | 400 | "Please generate a 2FA secret first" |
| Invalid 2FA code | 401 | "Invalid 2FA code" |
| Invalid backup code | 401 | "Invalid or already used backup code" |
| Invalid password | 401 | "Invalid password" |
| Unauthorized | 403 | "Admin access required" |

## Database Schema

### User Collection (MongoDB)
```javascript
{
  _id: ObjectId,
  email: String,
  password: String,
  role: String,  // "admin" or "donor"
  
  // 2FA fields
  twoFactorSecret: String,      // base32 encoded TOTP secret
  twoFactorEnabled: Boolean,    // default: false
  backupCodes: [{
    code: String,               // 8-char hex code
    used: Boolean               // default: false
  }],
  
  // ... other fields
}
```

## Compliance & Standards

- ✅ **RFC 6238**: TOTP Algorithm
- ✅ **OWASP ASVS**: Authentication Verification
- ✅ **WCAG 2.1 Level AA**: Accessible UI components
- ✅ **GDPR**: Secure handling of authentication data

## Known Limitations

1. **Role Restriction**: 2FA is only available for admin users (by design)
2. **Backup Code Quantity**: Fixed at 10 codes (can be regenerated by disabling/re-enabling)
3. **Secret Rotation**: Requires disable/re-enable for new secret
4. **Account Recovery**: If both device and backup codes are lost, admin intervention required

## Future Enhancements

- [ ] SMS-based 2FA as alternative
- [ ] WebAuthn/FIDO2 support (hardware keys)
- [ ] 2FA recovery via email verification
- [ ] Admin-configurable 2FA policies (enforce for all admins)
- [ ] 2FA usage analytics and reporting
- [ ] Multiple device registration

## Troubleshooting

### Issue: "Invalid verification code" during setup
**Solution**: 
- Ensure your device clock is synchronized
- Try the next code generated by your app
- Check that you scanned the correct QR code

### Issue: Codes not working during login
**Solution**:
- Verify device time is correct
- Try waiting for the next code
- Use a backup code if available
- Contact system administrator

### Issue: Lost authenticator device and backup codes
**Solution**:
- Contact system administrator to reset 2FA
- Admin can disable 2FA from database if necessary

## Support

For issues or questions about 2FA implementation:
1. Check test script: `scripts/test-story-1.5-2fa.js`
2. Review error logs in backend console
3. Verify MongoDB user document structure
4. Contact development team

---

**Story Status**: ✅ **Completed**  
**Implementation Date**: November 10, 2025  
**Version**: 1.0  
**Sprint**: Sprint 1
