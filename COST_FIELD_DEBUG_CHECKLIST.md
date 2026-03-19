# Cost Field Debug Checklist

## Prerequisites
1. Hard refresh your browser: **Cmd+Shift+R** (Mac) or **Ctrl+Shift+R** (Windows/Linux)
2. Open browser Developer Tools: **F12**
3. Go to the **Console** tab (not Network, Sources, or Elements)

## Testing Steps

### Step 1: Navigate to Props Manager
- [ ] Go to your application's Productions section
- [ ] Select a production
- [ ] Click on the **Props** tab

### Step 2: Click on Cost Field
- [ ] Find a prop card in the list
- [ ] **Look in browser console** - you should immediately see: `"Cost field clicked"`
- [ ] Click on the Cost field input
- [ ] **Look in browser console** - you should see: `"Cost field focused"`
- [ ] **Look in browser console** - you should see text being selected (if field had a value)

### Step 3: Type a Simple Number
- [ ] Type: **45**
- [ ] **Check console** - you should see:
  - `"Cost field onChange triggered: 45"`
  - `"Saving clean value: 45"`
  - `"handleUpdateProp called: {actIndex: X, sceneIndex: X, propId: '...', field: 'cost', value: '45'}"`
  - `"Updating prop: [PropName] field: cost new value: 45"`
  - `"Production updated successfully"`

### Step 4: Type Decimal Value
- [ ] Continue typing: **.99**
- [ ] **Check console** for each keystroke showing:
  - `"Cost field onChange triggered: 45.9"`
  - `"Cost field onChange triggered: 45.99"`
  - Each one should show corresponding `handleUpdateProp` calls

### Step 5: Blur (Leave) the Field
- [ ] Press **Tab** or click elsewhere to leave the Cost field
- [ ] **Check console** - you should see:
  - `"Cost field onBlur: 45.99"`
  - `"Formatting to: 45.99"`
  - Final `handleUpdateProp` call with formatted value
  - `"Production updated successfully"`

### Step 6: Verify Persistence
- [ ] The Cost field should now show: **$45.99**
- [ ] Refresh the page (Cmd+R or Ctrl+R - normal refresh)
- [ ] Go back to Props section
- [ ] The Cost field value should still be: **$45.99**
- [ ] **Check console** - should see no errors related to Cost field

### Step 7: Test Edge Cases

#### Test 7a: Multiple Decimals
- [ ] In a fresh Cost field, try typing: **45.9.9**
- [ ] **Check console** - should show cleaned value: `"Saving clean value: 45.99"`
- [ ] The field should display: **$45.99**

#### Test 7b: Non-numeric Characters
- [ ] In a fresh Cost field, try typing: **$50abc**
- [ ] **Check console** - should show cleaned value: `"Saving clean value: 50"`
- [ ] The field should display: **$50.00** (after blur)

#### Test 7c: Empty/Zero
- [ ] In a fresh Cost field, try typing: **0**
- [ ] Blur the field
- [ ] **Check console** - field should be saved as empty or "0.00"
- [ ] The field should handle this gracefully

## Expected Console Output Example

```javascript
// Clicking field:
"Cost field clicked"

// Focusing field:
"Cost field focused"

// Typing "45":
"Cost field onChange triggered: 45"
"Saving clean value: 45"
"handleUpdateProp called: {actIndex: 0, sceneIndex: 2, propId: 'prop-123', field: 'cost', value: '45'}"
"Updating prop: Sword field: cost new value: 45"
"Production updated successfully"

// Typing ".99":
"Cost field onChange triggered: 45.9"
"Saving clean value: 45.9"
"handleUpdateProp called: {actIndex: 0, sceneIndex: 2, propId: 'prop-123', field: 'cost', value: '45.9'}"
"Updating prop: Sword field: cost new value: 45.9"
"Production updated successfully"
[repeat for 45.99]

// Blurring field:
"Cost field onBlur: 45.99"
"Formatting to: 45.99"
"handleUpdateProp called: {actIndex: 0, sceneIndex: 2, propId: 'prop-123', field: 'cost', value: '45.99'}"
"Updating prop: Sword field: cost new value: 45.99"
"Production updated successfully"
```

## Troubleshooting

### ❌ If you see: `"productionsService not available!"`
**Action:** The window.productionsService is not loaded. Check:
- Is the app properly initialized?
- Are you using the correct application URL?
- Check if other fields (Name, Description, Category) work - if they do, service is available

### ❌ If you see: `"Prop not found: ..."`
**Action:** The prop ID doesn't match. Check:
- Is the scene/act index correct?
- Does the prop still exist in the list?
- Try refreshing the page

### ❌ If you see NO console messages when clicking field
**Action:** The change might not have deployed. Try:
1. Hard refresh again: **Cmd+Shift+R** or **Ctrl+Shift+R**
2. Check your network tab to ensure new files are loaded
3. Clear localStorage: Open console and run: `localStorage.clear()`
4. Reload page

### ❌ If field is visible but looks inactive (grayed out)
**Action:** The field might be read-only or disabled. Check:
- Browser console for any errors
- Try clicking on other Cost fields
- Try editing other prop fields (Name, Description) - if they work, Cost should too
- Check that `readOnly: false` and `disabled: false` are set in code

## Success Criteria ✅

You'll know it's working when:
- [ ] Console shows all expected log messages when interacting with Cost field
- [ ] Cost value updates in real-time as you type
- [ ] Value is formatted to 2 decimals when you leave the field
- [ ] Value persists after page refresh
- [ ] Budget Summary Card and cost badges update based on entered costs
- [ ] No JavaScript errors in console

## Copy-Paste Console Test

Run this in the browser console to verify the element exists:
```javascript
document.querySelector('[data-testid="cost-input"]')
```

**Expected result:** Should show an `<input>` element (not null/undefined)

---

**When you've completed testing, share the console output with the exact messages you see.**
