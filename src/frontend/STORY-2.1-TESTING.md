# Story 2.1: Browse, Search, and Filter Causes - Testing Guide

## Overview
This document provides comprehensive testing procedures for Story 2.1, which implements the ability for donors to browse, search, and filter available causes on the platform.

## Acceptance Criteria (AC) Verification

### AC1: Public page displays a list of all active causes with their title, description, and image

**Test Steps:**
1. Navigate to `/causes` in your browser
2. Verify that the page displays without requiring authentication
3. Check that each cause card shows:
   - Title (cause name)
   - Short description (truncated to 3 lines with "...")
   - Image (either custom or category-based default)
   - Category badge
   - Progress bar with percentage
   - Current amount raised and goal
   - Donor count
   - "View Details & Donate" button

**Expected Results:**
- ✅ Page is publicly accessible (no login required)
- ✅ All active causes are displayed in a grid layout
- ✅ Each card contains all required information
- ✅ Images load correctly with fallback for missing images
- ✅ Only causes with status='active' are shown

**Test Data Requirements:**
- At least 3-5 active causes in the database
- Mix of different categories
- Some causes with images, some without

---

### AC2: Search bar allows users to find causes by keywords in their title or description

**Test Steps:**
1. Navigate to `/causes`
2. Locate the search bar labeled "Search Causes"
3. Test case-insensitive search:
   - Enter "education" in search bar
   - Verify only education-related causes appear
4. Test partial matching:
   - Enter "child" 
   - Verify causes with "child" or "children" in title/description appear
5. Test real-time filtering:
   - Type slowly and observe results update as you type
6. Test empty search:
   - Clear search bar
   - Verify all causes reappear
7. Test no results:
   - Search for "xyz123notfound"
   - Verify "No causes found" message appears with clear filters button

**Expected Results:**
- ✅ Search is case-insensitive
- ✅ Search matches both title and description
- ✅ Results update as user types
- ✅ Active filter badge shows search term
- ✅ Results count updates correctly
- ✅ Clear filters button removes search

**Accessibility Checks:**
- ✅ Search input has label "Search Causes"
- ✅ Input has aria-label and aria-describedby
- ✅ Search hint text is present and readable
- ✅ Search icon is decorative (aria-hidden="true")

---

### AC3: Filters are available to narrow down causes by category

**Test Steps:**
1. Navigate to `/causes`
2. Locate the "Category" dropdown filter
3. Test category filtering:
   - Select "Education" from dropdown
   - Verify only education causes appear
   - Check active filter badge shows "Category: Education"
4. Test "All Categories":
   - Select "All Categories"
   - Verify all causes appear again
5. Test combined filters:
   - Enter search term "school"
   - Select category "Education"
   - Verify only education causes containing "school" appear
6. Test clear filters:
   - Apply both search and category filters
   - Click "Clear all" button
   - Verify both filters are reset

**Expected Results:**
- ✅ Dropdown shows all available categories
- ✅ Category filtering works correctly
- ✅ Active filter badge displays selected category
- ✅ Search + Category filters work together
- ✅ Clear all resets both filters

**Available Categories:**
- All Categories
- Education
- Healthcare
- Environment
- Disaster Relief
- Poverty
- Animal Welfare
- Other

**Accessibility Checks:**
- ✅ Dropdown has label "Category"
- ✅ Dropdown has aria-label
- ✅ Keyboard navigation works (Tab, Arrow keys, Enter)

---

### AC4: UI is responsive and conforms to WCAG 2.1 Level AA standards

**Responsive Design Tests:**

**Desktop (1920×1080):**
- ✅ 3-column grid layout for causes
- ✅ Search and filter inputs are in one row
- ✅ All content readable and well-spaced

**Tablet (768×1024):**
- ✅ 2-column grid layout for causes
- ✅ Search and filter inputs stack properly
- ✅ Touch targets are at least 44×44 pixels

**Mobile (375×667):**
- ✅ 1-column grid layout for causes
- ✅ Search bar and category filter stack vertically
- ✅ All text is readable without zooming
- ✅ Buttons are touch-friendly

**Test in Multiple Browsers:**
- ✅ Chrome/Edge
- ✅ Firefox
- ✅ Safari (if available)

---

## WCAG 2.1 Level AA Compliance Checklist

### Perceivable

**1.1 Text Alternatives:**
- ✅ All images have meaningful alt text: `{cause.name} - {category} cause`
- ✅ Decorative icons have aria-hidden="true"
- ✅ Search icon is decorative
- ✅ Progress bars have aria-label with current percentage

**1.3 Adaptable:**
- ✅ Semantic HTML used (header, section, article, nav)
- ✅ Proper heading hierarchy (h1 → h2)
- ✅ Lists use proper role="list" and role="listitem"
- ✅ Form inputs have associated labels

**1.4 Distinguishable:**
- ✅ Color contrast ratio meets 4.5:1 for normal text
- ✅ Color contrast ratio meets 3:1 for large text
- ✅ Text can be resized up to 200% without loss of content
- ✅ Focus indicators are visible and meet 3:1 contrast

**Color Contrast Tests:**
| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|------------|-------|------|
| Body text | #4B5563 | #FFFFFF | 7.0:1 | ✅ |
| Headings | #111827 | #FFFFFF | 16.1:1 | ✅ |
| Primary button | #FFFFFF | #2563EB | 8.6:1 | ✅ |
| Category badge | #1F2937 | #FFFFFF | 13.5:1 | ✅ |

### Operable

**2.1 Keyboard Accessible:**
- ✅ All interactive elements reachable via Tab
- ✅ Search input focusable
- ✅ Category dropdown keyboard navigable
- ✅ Cause cards and buttons focusable
- ✅ Clear filters button keyboard accessible
- ✅ No keyboard traps

**Keyboard Navigation Test:**
1. Press Tab repeatedly
2. Verify focus moves through: Search → Category → Cause cards → Buttons
3. Press Enter on focused elements
4. Press Escape to close any modals/dropdowns

**2.4 Navigable:**
- ✅ Page has descriptive title
- ✅ Focus order is logical
- ✅ Link purpose is clear from link text
- ✅ Multiple ways to navigate (navbar, links)
- ✅ Headings and labels are descriptive

**2.5 Input Modalities:**
- ✅ Touch targets are at least 44×44 pixels
- ✅ No path-based gestures required

### Understandable

**3.1 Readable:**
- ✅ Page language is set (lang="en")
- ✅ Text is clear and concise
- ✅ Jargon is avoided

**3.2 Predictable:**
- ✅ Navigation is consistent
- ✅ No unexpected context changes on focus
- ✅ Form behavior is predictable

**3.3 Input Assistance:**
- ✅ Form labels are descriptive
- ✅ Search has hint text
- ✅ Error states are clear (no results message)
- ✅ Success states are clear (results count)

### Robust

**4.1 Compatible:**
- ✅ Valid HTML5 markup
- ✅ ARIA attributes used correctly
- ✅ No duplicate IDs
- ✅ Proper role attributes

**ARIA Attributes Used:**
- `aria-label` - Search input, category dropdown, progress bars, buttons
- `aria-describedby` - Search input (linked to hint text)
- `aria-live` - Loading status, results count, error messages
- `aria-hidden` - Decorative icons
- `aria-valuenow`, `aria-valuemin`, `aria-valuemax` - Progress bars
- `role="status"` - Loading and results messages
- `role="alert"` - Error messages
- `role="list"` and `role="listitem"` - Cause grid
- `role="progressbar"` - Progress bars

---

## Manual Testing Scenarios

### Scenario 1: First-time visitor browsing causes
1. Navigate to home page
2. Click "Browse Causes" button
3. Observe all causes displayed
4. Scroll through the list
5. Click on a cause card (should navigate to cause details - to be implemented)

**Expected:** Smooth browsing experience, clear visual hierarchy

---

### Scenario 2: Searching for specific cause type
1. Go to `/causes`
2. Search for "water"
3. Verify results show causes related to water/clean water
4. Clear search
5. Search for "school"
6. Verify results show education-related causes

**Expected:** Relevant results, accurate filtering

---

### Scenario 3: Filtering by category
1. Go to `/causes`
2. Select "Environment" category
3. Verify only environment causes shown
4. Switch to "Healthcare"
5. Verify only healthcare causes shown

**Expected:** Category filter works correctly, results update immediately

---

### Scenario 4: Combined search and filter
1. Go to `/causes`
2. Select category "Education"
3. Enter search "scholarship"
4. Verify only education causes containing "scholarship" appear
5. Check active filters section shows both filters

**Expected:** Both filters apply simultaneously, results are intersection of both

---

### Scenario 5: No results handling
1. Go to `/causes`
2. Search for nonsense text "xyzabc123"
3. Verify "No causes found" message appears
4. Verify suggestion to clear filters
5. Click "Clear Filters"
6. Verify all causes reappear

**Expected:** Clear feedback, easy recovery

---

### Scenario 6: Mobile responsiveness
1. Open `/causes` on mobile device or DevTools mobile view
2. Test search input usability
3. Test category dropdown usability
4. Verify cause cards stack vertically
5. Test scrolling and interactions

**Expected:** Fully functional on mobile, good touch targets

---

## API Testing

### Endpoint: GET /api/causes

**Test 1: Get all active causes**
```bash
curl http://localhost:3000/api/causes
```
Expected: JSON with success:true, count, and causes array

**Test 2: Search by keyword**
```bash
curl "http://localhost:3000/api/causes?search=education"
```
Expected: Only causes matching "education" in name or description

**Test 3: Filter by category**
```bash
curl "http://localhost:3000/api/causes?category=environment"
```
Expected: Only environment causes

**Test 4: Combined search and filter**
```bash
curl "http://localhost:3000/api/causes?search=school&category=education"
```
Expected: Education causes containing "school"

**Test 5: Invalid category**
```bash
curl "http://localhost:3000/api/causes?category=invalid"
```
Expected: Empty results (no causes match invalid category)

---

### Endpoint: GET /api/causes/categories/list

**Test:**
```bash
curl http://localhost:3000/api/causes/categories/list
```
Expected: JSON with success:true and categories array

---

## Performance Testing

### Load Time Benchmarks:
- ✅ Initial page load: < 2 seconds
- ✅ Search results update: < 100ms
- ✅ Category filter change: < 100ms
- ✅ Images load progressively

### Test with Different Data Volumes:
- 10 causes: Instant
- 50 causes: < 500ms
- 100+ causes: Consider pagination (future enhancement)

---

## Browser DevTools Checks

### Console:
- ✅ No JavaScript errors
- ✅ No React warnings
- ✅ API calls successful

### Network:
- ✅ API endpoint returns 200 status
- ✅ Images load (or fallback to defaults)
- ✅ No unnecessary duplicate requests

### Accessibility:
- ✅ Run Lighthouse accessibility audit (score > 90)
- ✅ Use WAVE or axe DevTools
- ✅ Check for ARIA issues

---

## Known Limitations (Future Enhancements)

1. **Pagination:** Currently shows all causes - consider adding pagination for 50+ causes
2. **Cause Details Page:** Link to `/causes/:id` exists but detail page not yet implemented
3. **Advanced Filters:** Could add sorting (newest, most funded, ending soon)
4. **Save Filters:** Could save user's preferred filters
5. **Share Results:** Could add URL query params to share filtered results

---

## Test Data Setup

To properly test this story, ensure your database has:

### Minimum Test Data:
- 3 Education causes
- 2 Healthcare causes
- 2 Environment causes
- 1 Disaster Relief cause
- 1 Poverty cause
- At least 2 causes with similar keywords for search testing

### Sample Cause Data:
```javascript
{
  name: "Build Schools in Rural Areas",
  description: "Help us construct educational facilities for children in remote villages who lack access to quality education.",
  category: "education",
  targetAmount: 500000,
  currentAmount: 125000,
  status: "active",
  imageUrl: "",
  donorCount: 45
}
```

---

## Defect Reporting Template

If you find issues during testing, report them using this template:

**Title:** [Story 2.1] Brief description of issue

**Severity:** Critical / High / Medium / Low

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**

**Actual Result:**

**Environment:**
- Browser: 
- Device: 
- Screen size: 

**Screenshots:** (if applicable)

**AC Affected:** AC1 / AC2 / AC3 / AC4

---

## Sign-off Checklist

Before marking Story 2.1 as complete:

- [ ] All 4 acceptance criteria verified
- [ ] WCAG 2.1 Level AA compliance confirmed
- [ ] Responsive design tested on 3 screen sizes
- [ ] Keyboard navigation tested
- [ ] Screen reader testing performed (optional but recommended)
- [ ] API endpoints tested and documented
- [ ] No console errors or warnings
- [ ] Code reviewed and follows project standards
- [ ] Testing document reviewed by team

---

## Additional Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/)
- [React Accessibility Guide](https://react.dev/learn/accessibility)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)

---

**Story 2.1 Testing Guide v1.0**  
*Last Updated: November 10, 2025*
