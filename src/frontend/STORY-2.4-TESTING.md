# Story 2.4: Frontend UI for Multi-Cause Donation - Testing Guide

## Overview
This document provides comprehensive testing procedures for Story 2.4, which implements an intuitive interface for donors to allocate a single donation amount across multiple causes in one transaction.

## Acceptance Criteria (AC) Verification

### AC1: Donors can select multiple causes and add them to a "donation basket"

**Test Steps:**
1. Login to the application
2. Navigate to `/donate/multi` (Multi-Cause Donation page)
3. View the list of available causes on the left side
4. Click "Add to Basket" on a cause
5. Verify the cause appears in the donation basket (right side)
6. Add 2-3 more causes to the basket
7. Try to add the same cause again

**Expected Results:**
- ✅ Available causes display with name, description, category, and progress bar
- ✅ "Add to Basket" button works correctly
- ✅ Cause appears in basket immediately after adding
- ✅ Button changes to "✓ Added to Basket" and is disabled for added causes
- ✅ Card gets green border when added to basket
- ✅ Error message appears if trying to add duplicate cause
- ✅ Can add multiple different causes to basket

**Accessibility Checks:**
- ✅ "Add to Basket" button has aria-label with cause name
- ✅ Button state communicated to screen readers
- ✅ Keyboard navigation works (Tab, Enter)

---

### AC2: UI allows the donor to specify a total donation amount

**Test Steps:**
1. Navigate to multi-cause donation page
2. Locate the "Total Donation Amount" input field
3. Enter various amounts (e.g., 100, 500.50, 1000)
4. Leave field empty and try to submit
5. Enter 0 or negative number

**Expected Results:**
- ✅ Total amount input field is clearly labeled with "₹" symbol
- ✅ Field accepts decimal values (e.g., 500.50)
- ✅ Field is marked as required with * indicator
- ✅ Validation error shows if empty when submitting
- ✅ Validation error shows if amount ≤ 0
- ✅ Amounts automatically update in basket when total changes

**Accessibility Checks:**
- ✅ Input has label "Total Donation Amount (₹) *"
- ✅ aria-required="true" attribute present
- ✅ aria-invalid set when validation fails
- ✅ Error message linked via aria-describedby

---

### AC3: Donor can allocate total amount across selected causes (percentage or fixed amount)

**Test Steps:**
1. Add 3 causes to basket
2. Enter total amount: 1000
3. Test **Percentage Mode**:
   - Verify "Percentage" button is selected by default
   - Enter 50% for first cause
   - Enter 30% for second cause
   - Enter 20% for third cause
   - Verify amounts auto-calculate (₹500, ₹300, ₹200)
4. Test **Fixed Amount Mode**:
   - Click "Fixed Amount" button
   - Enter ₹600 for first cause
   - Enter ₹250 for second cause
   - Enter ₹150 for third cause
   - Verify percentages auto-calculate (60%, 25%, 15%)
5. Test **Distribute Evenly** button:
   - Click "Distribute Evenly"
   - Verify all causes get equal allocation (33.33% each)
6. Change total amount and verify allocations adjust proportionally

**Expected Results:**
- ✅ Toggle between percentage and fixed amount modes works
- ✅ Percentage mode: entering % auto-calculates ₹ amount
- ✅ Fixed amount mode: entering ₹ auto-calculates % percentage
- ✅ Each cause in basket has its own allocation input
- ✅ Real-time calculation as values change
- ✅ "Distribute Evenly" button splits equally with rounding adjustment
- ✅ Changing total amount recalculates all allocations

**Accessibility Checks:**
- ✅ Allocation method toggle has role="group" and aria-label
- ✅ Each button has aria-pressed attribute
- ✅ Allocation inputs have descriptive labels
- ✅ Inputs have aria-label with cause name

---

### AC4: UI provides real-time validation to ensure allocations sum to 100% (or total amount)

**Test Steps:**
1. Add 2 causes to basket with total ₹1000
2. **Test under-allocation**:
   - Cause 1: 40% (₹400)
   - Cause 2: 30% (₹300)
   - Check summary section
3. **Test over-allocation**:
   - Cause 1: 60% (₹600)
   - Cause 2: 50% (₹500)
   - Check summary section
4. **Test exact allocation**:
   - Cause 1: 70% (₹700)
   - Cause 2: 30% (₹300)
   - Verify green checkmark in summary
5. **Test empty allocations**:
   - Leave one cause at 0%
   - Try to submit
6. Try to submit with various invalid states

**Expected Results:**
- ✅ Summary section shows:
  - Number of causes
  - Total percentage (red if ≠ 100%, green if = 100%)
  - Total amount (red if ≠ total, green if = total)
- ✅ Validation errors appear below summary:
  - "Allocations must sum to 100%" if percentage ≠ 100%
  - "Allocated amounts must equal total" if amounts don't match
  - "All causes must have allocation > 0" if any is 0
- ✅ Submit button disabled when validation fails
- ✅ Real-time updates as user types
- ✅ Tolerance of 0.01 for floating point precision

**Validation Messages:**
- ❌ "Allocations must sum to 100% (currently X%)"
- ❌ "Allocated amounts must equal total amount (currently ₹X of ₹Y)"
- ❌ "All causes must have an allocation greater than 0"
- ❌ "Please enter a total donation amount greater than 0"
- ❌ "Please add at least one cause to your donation basket"

**Accessibility Checks:**
- ✅ Error messages use role="alert"
- ✅ aria-live="assertive" for critical errors
- ✅ Color not sole indicator (text + icons used)
- ✅ Summary values color-coded (green/red) with text

---

### AC5: Interface conforms to WCAG 2.1 Level AA standards

**Responsive Design Tests:**

**Desktop (1920×1080):**
- ✅ 2-column layout: Causes (66%) | Basket (33%)
- ✅ Sticky basket sidebar scrolls independently
- ✅ All content readable and well-spaced

**Tablet (768×1024):**
- ✅ 2-column layout maintained
- ✅ Causes grid switches to 2 columns
- ✅ Touch targets ≥ 44×44 pixels

**Mobile (375×667):**
- ✅ 1-column stacked layout
- ✅ Basket appears below causes
- ✅ Causes in single column
- ✅ All text readable without zooming
- ✅ Touch-friendly buttons and inputs

---

## WCAG 2.1 Level AA Compliance Checklist

### Perceivable

**1.1 Text Alternatives:**
- ✅ Icons have aria-hidden="true" or aria-label
- ✅ Empty basket icon is decorative
- ✅ Loading spinner has sr-only text
- ✅ Remove buttons have aria-label

**1.3 Adaptable:**
- ✅ Semantic HTML (header, section, article, form elements)
- ✅ Proper heading hierarchy (h1 → h2 → h3)
- ✅ Form inputs have associated labels
- ✅ Toggle buttons use role="group"

**1.4 Distinguishable:**
- ✅ Color contrast meets 4.5:1 for normal text
- ✅ Color contrast meets 3:1 for large text
- ✅ Focus indicators visible (2px ring)
- ✅ Not relying on color alone (red/green + text)

**Color Contrast Tests:**
| Element | Foreground | Background | Ratio | Pass |
|---------|-----------|------------|-------|------|
| Body text | #4B5563 | #FFFFFF | 7.0:1 | ✅ |
| Headings | #111827 | #FFFFFF | 16.1:1 | ✅ |
| Primary button | #FFFFFF | #2563EB | 8.6:1 | ✅ |
| Success (green) | #047857 | #ECFDF5 | 7.8:1 | ✅ |
| Error (red) | #991B1B | #FEF2F2 | 8.2:1 | ✅ |

### Operable

**2.1 Keyboard Accessible:**
- ✅ All interactive elements reachable via Tab
- ✅ Add to Basket buttons focusable
- ✅ Remove from Basket buttons focusable
- ✅ Allocation inputs keyboard navigable
- ✅ Toggle buttons keyboard operable
- ✅ Submit button keyboard accessible
- ✅ No keyboard traps

**Keyboard Navigation Test:**
1. Press Tab through all elements
2. Use Enter to activate buttons
3. Use Arrow keys in number inputs
4. Shift+Tab to go backwards
5. Verify focus order is logical

**2.4 Navigable:**
- ✅ Page has descriptive title
- ✅ Focus order follows visual order
- ✅ Link/button purpose clear from text
- ✅ Section headings descriptive
- ✅ aria-label used for context

**2.5 Input Modalities:**
- ✅ Touch targets ≥ 44×44 pixels
- ✅ No path-based gestures required
- ✅ Click and touch both supported

### Understandable

**3.1 Readable:**
- ✅ Page language set (lang="en")
- ✅ Clear, concise language
- ✅ Financial terms explained with symbols (₹, %)

**3.2 Predictable:**
- ✅ Navigation consistent
- ✅ No unexpected context changes
- ✅ Form behavior predictable
- ✅ Real-time calculations expected

**3.3 Input Assistance:**
- ✅ All form fields have labels
- ✅ Required fields marked with *
- ✅ Error messages specific and helpful
- ✅ Success feedback clear
- ✅ Input format guidance provided

### Robust

**4.1 Compatible:**
- ✅ Valid HTML5 markup
- ✅ ARIA attributes used correctly
- ✅ No duplicate IDs
- ✅ Proper role attributes

**ARIA Attributes Used:**
- `aria-label` - Buttons, inputs, sections
- `aria-required` - Required form fields
- `aria-invalid` - Fields with validation errors
- `aria-describedby` - Error message associations
- `aria-pressed` - Toggle button states
- `aria-live="assertive"` - Error alerts
- `aria-hidden="true"` - Decorative elements
- `role="alert"` - Error messages
- `role="group"` - Toggle button group

---

## Manual Testing Scenarios

### Scenario 1: New user making first multi-cause donation
1. Login as new donor
2. Navigate to Multi-Cause Donation
3. Add 3 causes: Education, Healthcare, Environment
4. Enter total: ₹1500
5. Use "Distribute Evenly" button
6. Verify each gets ₹500 (33.33%)
7. Submit donation
8. Verify success message and redirect

**Expected:** Smooth onboarding, clear instructions, successful donation

---

### Scenario 2: Power user with custom allocations
1. Login as experienced donor
2. Add 5 causes to basket
3. Enter total: ₹10,000
4. **Custom percentage allocations:**
   - Education: 35% (₹3,500)
   - Healthcare: 25% (₹2,500)
   - Environment: 20% (₹2,000)
   - Poverty: 15% (₹1,500)
   - Animal Welfare: 5% (₹500)
5. Verify summary shows 100% / ₹10,000 in green
6. Submit donation
7. Check dashboard for transaction history

**Expected:** Precise control, accurate calculations, successful multi-donation

---

### Scenario 3: Error recovery
1. Add 2 causes
2. Enter total: ₹1000
3. Allocate 40% and 40% (under-allocated)
4. See validation error
5. Adjust to 60% and 40%
6. Error clears
7. Change to 70% and 50% (over-allocated)
8. See validation error
9. Correct to 50% and 50%
10. Submit successfully

**Expected:** Clear error messages, easy correction, validation feedback

---

### Scenario 4: Switching allocation modes
1. Add 3 causes, total ₹3000
2. Start in percentage mode:
   - Cause 1: 50% → sees ₹1500
   - Cause 2: 30% → sees ₹900
   - Cause 3: 20% → sees ₹600
3. Switch to fixed amount mode:
   - Values preserve: ₹1500, ₹900, ₹600
   - Percentages shown: 50%, 30%, 20%
4. Modify in fixed mode:
   - Cause 1: ₹2000 → sees 66.67%
   - Cause 2: ₹500 → sees 16.67%
   - Cause 3: ₹500 → sees 16.67%
5. Switch back to percentage
6. Verify values maintained

**Expected:** Seamless mode switching, values preserved, accurate conversions

---

### Scenario 5: Basket management
1. Add 5 causes to basket
2. Allocate amounts to all
3. Remove 2 causes from basket
4. Verify allocations for remaining 3 causes stay intact
5. Re-add one removed cause
6. Verify it starts at 0% allocation
7. Adjust allocations to reach 100%
8. Submit

**Expected:** Easy basket management, allocations preserved, no data loss

---

## Backend API Testing

### Endpoint: POST /api/donate/multi

**Test 1: Valid multi-cause donation**
```bash
curl -X POST http://localhost:3000/api/donate/multi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "totalAmount": 1000,
    "causes": [
      {"causeId": "CAUSE_ID_1", "amount": 600},
      {"causeId": "CAUSE_ID_2", "amount": 400}
    ],
    "paymentMethod": "manual"
  }'
```
Expected: 201 Created, success message, donation records

**Test 2: Mismatched total**
```bash
curl -X POST http://localhost:3000/api/donate/multi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "totalAmount": 1000,
    "causes": [
      {"causeId": "CAUSE_ID_1", "amount": 600},
      {"causeId": "CAUSE_ID_2", "amount": 300}
    ]
  }'
```
Expected: 400 Bad Request, "Allocated amounts must equal total amount"

**Test 3: Invalid cause ID**
```bash
curl -X POST http://localhost:3000/api/donate/multi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "totalAmount": 1000,
    "causes": [
      {"causeId": "INVALID_ID", "amount": 1000}
    ]
  }'
```
Expected: 404 Not Found, "One or more causes not found"

**Test 4: Empty causes array**
```bash
curl -X POST http://localhost:3000/api/donate/multi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "totalAmount": 1000,
    "causes": []
  }'
```
Expected: 400 Bad Request, "At least one cause must be selected"

**Test 5: Negative amount**
```bash
curl -X POST http://localhost:3000/api/donate/multi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "totalAmount": 1000,
    "causes": [
      {"causeId": "CAUSE_ID_1", "amount": -500},
      {"causeId": "CAUSE_ID_2", "amount": 1500}
    ]
  }'
```
Expected: 400 Bad Request, "Each cause allocation must be greater than 0"

---

## Browser DevTools Checks

### Console:
- ✅ No JavaScript errors
- ✅ No React warnings
- ✅ API calls successful (200/201 status)
- ✅ Proper logging for debugging

### Network:
- ✅ GET /api/causes returns causes
- ✅ POST /api/donate/multi submits correctly
- ✅ No unnecessary duplicate requests
- ✅ Proper error handling for failed requests

### Accessibility:
- ✅ Run Lighthouse accessibility audit (score > 90)
- ✅ Use axe DevTools or WAVE
- ✅ Check for ARIA issues
- ✅ Validate keyboard navigation

---

## Performance Testing

### Load Time Benchmarks:
- ✅ Initial page load: < 2 seconds
- ✅ Add to basket: < 50ms
- ✅ Allocation calculation: < 10ms (real-time)
- ✅ Form submission: < 1 second (network dependent)

### Calculation Performance:
- Test with 10 causes in basket
- Test with 20 causes in basket
- Verify calculations remain instant

---

## User Model Schema Update

Verify that the User model's `donations` array supports the `isMultiCause` flag:

```javascript
{
  amount: Number,
  cause: String,
  causeId: ObjectId,
  paymentId: String,
  paymentMethod: String,
  status: String,
  date: Date,
  isMultiCause: Boolean // NEW: Indicates multi-cause donation
}
```

---

## Known Limitations (Future Enhancements)

1. **Saved Baskets:** Could allow users to save basket configurations
2. **Recurring Multi-Cause:** Could enable recurring multi-cause donations
3. **Suggested Allocations:** Could suggest allocations based on cause urgency
4. **Gift Multi-Donation:** Could allow gifting multi-cause donations
5. **Export Allocation:** Could export allocation plan as PDF/CSV

---

## Defect Reporting Template

**Title:** [Story 2.4] Brief description

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

**AC Affected:** AC1 / AC2 / AC3 / AC4 / AC5

---

## Sign-off Checklist

Before marking Story 2.4 as complete:

- [ ] All 5 acceptance criteria verified
- [ ] Donation basket functionality tested
- [ ] Percentage and fixed amount modes tested
- [ ] Real-time validation working correctly
- [ ] WCAG 2.1 Level AA compliance confirmed
- [ ] Responsive design tested on 3 screen sizes
- [ ] Keyboard navigation tested
- [ ] Backend API endpoint tested
- [ ] Multi-cause transactions atomic
- [ ] Error handling comprehensive
- [ ] Success flows verified
- [ ] No console errors or warnings
- [ ] Testing document reviewed by team

---

**Story 2.4 Testing Guide v1.0**  
*Last Updated: November 10, 2025*
