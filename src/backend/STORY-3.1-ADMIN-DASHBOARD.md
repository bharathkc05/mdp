# Story 3.1: Admin Dashboard for Cause Management

## Overview
This feature implements a comprehensive admin dashboard for managing all causes on the platform, providing full CRUD functionality with pagination, search, and filtering capabilities.

## User Story
**As an admin**, I want a dashboard to view and manage all causes, so that I can maintain the platform's content.

## Acceptance Criteria
✅ **AC1**: An admin-only dashboard displays a paginated table of all causes (active and archived)  
✅ **AC2**: The table shows key information like cause title, category, and status  
✅ **AC3**: The dashboard provides options to create a new cause, and edit or archive existing ones  
✅ **AC4**: The interface conforms to WCAG 2.1 Level AA standards

## Implementation Details

### Backend Implementation

#### 1. Enhanced Admin Routes (`src/backend/routes/adminRoutes.js`)

**GET `/api/admin/causes`** - Fetch all causes with pagination, search, and filters
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `search`: Search term for name/description
  - `category`: Filter by category
  - `status`: Filter by status (supports 'archived' for cancelled/paused/completed)
  
- **Response**:
  ```json
  {
    "success": true,
    "count": 10,
    "total": 45,
    "page": 1,
    "totalPages": 5,
    "data": [/* cause objects */]
  }
  ```

**PATCH `/api/admin/causes/:id/archive`** - Archive/unarchive a cause
- **Functionality**: Toggles cause status between active and cancelled
- **Response**: Returns updated cause with success message

**Other existing endpoints**:
- `POST /api/admin/causes` - Create new cause
- `GET /api/admin/causes/:id` - Get single cause
- `PUT /api/admin/causes/:id` - Update cause
- `DELETE /api/admin/causes/:id` - Delete cause (only if no donations)

#### 2. Security
- All admin routes protected by `protect` and `authorize('admin')` middleware
- Role-based access control enforced at route level
- JWT token validation required

### Frontend Implementation

#### 1. Admin Cause Dashboard Component (`src/frontend/src/pages/AdminCauseDashboard.jsx`)

**Features**:
- **Responsive Table**: Displays cause information in a clean, accessible table
- **Pagination**: Client-controlled pagination with page navigation
- **Search**: Real-time search across cause names and descriptions
- **Filtering**: Filter by category and status
- **CRUD Operations**:
  - ✅ Create new causes via modal form
  - ✅ Edit existing causes via modal form
  - ✅ Archive/unarchive causes with single click
  - ✅ Delete causes (disabled if donations received)

**Table Columns**:
1. **Cause Details**: Name, description, and image thumbnail
2. **Category**: Categorization with readable labels
3. **Funding**: Current amount, target amount, and progress bar
4. **Status**: Color-coded status badges
5. **Created**: Formatted creation date
6. **Actions**: Edit, Archive, Delete buttons

**WCAG 2.1 Level AA Compliance**:
- ✅ Semantic HTML with proper heading hierarchy
- ✅ ARIA labels and roles for accessibility
- ✅ Keyboard navigation support
- ✅ Screen reader compatible table headers
- ✅ Focus indicators on interactive elements
- ✅ Color contrast ratios meeting AA standards
- ✅ Form labels properly associated
- ✅ Progress bars with ARIA attributes

#### 2. Route Protection (`src/frontend/src/App.jsx`)

**AdminRoute Component**:
```jsx
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  if (!token) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/dashboard" replace />;
  
  return children;
};
```

**Route Configuration**:
```jsx
<Route path="/admin/causes" element={
  <AdminRoute>
    <AdminCauseDashboard />
  </AdminRoute>
} />
```

#### 3. API Integration (`src/frontend/src/api.js`)

**Admin API Functions**:
```javascript
export const adminAPI = {
  getCauses: (params) => API.get("/admin/causes", { params }),
  getCause: (id) => API.get(`/admin/causes/${id}`),
  createCause: (data) => API.post("/admin/causes", data),
  updateCause: (id, data) => API.put(`/admin/causes/${id}`, data),
  deleteCause: (id) => API.delete(`/admin/causes/${id}`),
  archiveCause: (id) => API.patch(`/admin/causes/${id}/archive`),
};
```

#### 4. Navigation Updates

**Navbar** (`src/frontend/src/components/Navbar.jsx`):
- Added admin-only link: `👑 Admin`
- Conditional rendering based on user role

**Dashboard** (`src/frontend/src/pages/Dashboard.jsx`):
- Added "Admin Tools" section for admins
- "Manage Causes" button linking to admin dashboard

## User Interface

### Admin Dashboard Layout

```
┌─────────────────────────────────────────────────────────────┐
│ Admin Cause Management                                       │
│ Manage all causes on the platform                            │
├─────────────────────────────────────────────────────────────┤
│ Controls Section:                                            │
│ [Search...] [Category ▼] [Status ▼] [+ Create New Cause]   │
├─────────────────────────────────────────────────────────────┤
│ Table:                                                        │
│ ┌────────┬──────────┬─────────┬────────┬─────────┬────────┐ │
│ │Details │Category  │Funding  │Status  │Created  │Actions │ │
│ ├────────┼──────────┼─────────┼────────┼─────────┼────────┤ │
│ │[Img]   │Education │₹5K/₹10K │Active  │Nov 10   │E│A│D  │ │
│ │ Name   │          │[=====>] │        │         │        │ │
│ │ Desc   │          │         │        │         │        │ │
│ └────────┴──────────┴─────────┴────────┴─────────┴────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Pagination: [← Prev] [1] [2] [3] ... [Next →]              │
└─────────────────────────────────────────────────────────────┘
```

### Modal Forms
- **Create/Edit Modals**: Centered overlay with form fields
- **Fields**: Name, Description, Category, Target Amount, Image URL, End Date
- **Validation**: Required fields, minimum values, URL format
- **Actions**: Submit or Cancel

## Testing Guide

### Manual Testing Steps

#### 1. Access Control Testing
```bash
# Test 1: Login as admin
1. Navigate to http://localhost:5173/login
2. Login with admin credentials (admin@mdp.local / Admin@123)
3. Verify "👑 Admin" link appears in navbar
4. Click "Manage Causes" button in dashboard

# Test 2: Verify non-admin access is blocked
1. Login as regular donor
2. Try to access /admin/causes directly
3. Should redirect to /dashboard
```

#### 2. Pagination Testing
```bash
# Test 3: Pagination works correctly
1. Access admin dashboard
2. Verify causes are displayed in pages of 10
3. Click "Next" button
4. Verify page number updates
5. Click specific page number
6. Verify correct causes are displayed
```

#### 3. Search and Filter Testing
```bash
# Test 4: Search functionality
1. Enter search term in search box
2. Verify causes are filtered in real-time
3. Verify "No causes found" message when no matches

# Test 5: Category filter
1. Select category from dropdown
2. Verify only causes in that category are shown
3. Select "All Categories"
4. Verify all causes are shown again

# Test 6: Status filter
1. Select "Archived" from status filter
2. Verify only archived causes are shown
3. Select "Active"
4. Verify only active causes are shown
```

#### 4. CRUD Operations Testing
```bash
# Test 7: Create new cause
1. Click "+ Create New Cause" button
2. Fill in all required fields
3. Click "Create Cause"
4. Verify success message
5. Verify new cause appears in table

# Test 8: Edit cause
1. Click "Edit" on any cause
2. Modify fields
3. Click "Update Cause"
4. Verify changes are saved
5. Verify updated data in table

# Test 9: Archive cause
1. Click "Archive" on active cause
2. Confirm action
3. Verify cause status changes to "Cancelled"
4. Click "Unarchive" on cancelled cause
5. Verify status changes back to "Active"

# Test 10: Delete cause
1. Click "Delete" on cause with no donations
2. Confirm deletion
3. Verify cause is removed
4. Try to delete cause with donations
5. Verify delete is disabled/shows error
```

#### 5. Accessibility Testing
```bash
# Test 11: Keyboard navigation
1. Tab through all interactive elements
2. Verify focus indicators are visible
3. Use Enter/Space to activate buttons
4. Navigate table with arrow keys

# Test 12: Screen reader compatibility
1. Enable screen reader (NVDA/JAWS)
2. Navigate through table
3. Verify headers are announced
4. Verify row/column information is clear

# Test 13: Color contrast
1. Use browser developer tools
2. Check contrast ratios for all text
3. Verify status badges meet AA standards
4. Check button colors meet requirements
```

### Automated Testing (Future)
```javascript
// Example test cases to implement
describe('Admin Cause Dashboard', () => {
  it('should display paginated causes', async () => {});
  it('should filter causes by search term', async () => {});
  it('should create new cause successfully', async () => {});
  it('should update existing cause', async () => {});
  it('should archive/unarchive cause', async () => {});
  it('should prevent deletion of causes with donations', async () => {});
  it('should be keyboard accessible', async () => {});
});
```

## API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/admin/causes` | Get all causes (paginated) | Admin |
| GET | `/api/admin/causes/:id` | Get single cause | Admin |
| POST | `/api/admin/causes` | Create new cause | Admin |
| PUT | `/api/admin/causes/:id` | Update cause | Admin |
| DELETE | `/api/admin/causes/:id` | Delete cause | Admin |
| PATCH | `/api/admin/causes/:id/archive` | Archive/unarchive cause | Admin |

## File Changes Summary

### Modified Files
1. `src/backend/routes/adminRoutes.js` - Added pagination, search, filter, archive endpoint
2. `src/frontend/src/App.jsx` - Added AdminRoute and route configuration
3. `src/frontend/src/api.js` - Added adminAPI functions
4. `src/frontend/src/components/Navbar.jsx` - Added admin link
5. `src/frontend/src/pages/Dashboard.jsx` - Added admin tools section

### New Files
1. `src/frontend/src/pages/AdminCauseDashboard.jsx` - Complete admin dashboard component

## Security Considerations

1. **Authorization**: All endpoints require admin role
2. **Input Validation**: Form validation on both client and server
3. **XSS Protection**: React escapes output by default
4. **CSRF Protection**: Token-based authentication
5. **Rate Limiting**: Existing middleware applied to admin routes

## Performance Considerations

1. **Pagination**: Reduces data transfer and rendering time
2. **Lazy Loading**: Table data loaded on demand
3. **Debouncing**: Search input should be debounced (future enhancement)
4. **Caching**: Consider implementing query caching (future enhancement)

## Known Limitations

1. Delete is disabled for causes with donations (by design)
2. No bulk operations (future enhancement)
3. No cause analytics dashboard (future story)
4. No audit log for admin actions (future story)

## Future Enhancements

1. **Bulk Operations**: Select multiple causes for archive/delete
2. **Export Data**: CSV/Excel export of cause data
3. **Advanced Filters**: Date ranges, funding ranges, donor count
4. **Cause Analytics**: Charts and statistics for each cause
5. **Audit Trail**: Log all admin actions
6. **Image Upload**: Direct image upload instead of URL only
7. **Rich Text Editor**: WYSIWYG editor for descriptions
8. **Drag-and-Drop**: Reorder causes for display priority

## Compliance

### WCAG 2.1 Level AA Checklist
- ✅ **1.1.1 Non-text Content**: Images have alt attributes
- ✅ **1.3.1 Info and Relationships**: Semantic HTML used
- ✅ **1.3.2 Meaningful Sequence**: Logical tab order
- ✅ **1.4.3 Contrast**: Minimum 4.5:1 ratio for normal text
- ✅ **2.1.1 Keyboard**: All functionality keyboard accessible
- ✅ **2.4.6 Headings and Labels**: Descriptive labels provided
- ✅ **3.3.1 Error Identification**: Errors clearly identified
- ✅ **3.3.2 Labels or Instructions**: Form inputs labeled
- ✅ **4.1.2 Name, Role, Value**: ARIA attributes used correctly

## Troubleshooting

### Common Issues

**Issue**: "You don't have permission to access this page"
- **Solution**: Ensure user has admin role in database

**Issue**: Causes not loading
- **Solution**: Check backend server is running, verify API endpoint, check browser console

**Issue**: Pagination not working
- **Solution**: Verify query parameters are being sent correctly

**Issue**: Delete button disabled
- **Solution**: This is expected if cause has received donations

**Issue**: Modal not closing
- **Solution**: Check for JavaScript errors in console

## Support

For issues or questions:
1. Check browser console for errors
2. Verify backend logs for API errors
3. Ensure user has correct permissions
4. Review this documentation

---

**Implements**: MDP-F-011 (Cause Management)  
**Test Case**: TC-Admin-01  
**Priority**: Medium  
**Story Points**: 3  
**Status**: ✅ Complete
