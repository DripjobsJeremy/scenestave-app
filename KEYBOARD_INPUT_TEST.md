# Cost Field Keyboard Input Testing Guide

## What Was Changed

The Cost field now has **comprehensive keyboard input handling** with multiple layers of event capture:

1. **onInput** - Primary handler for all text input changes
2. **onChange** - Backup handler (both handlers do the same thing)
3. **onKeyDown** - Captures all key presses, logs them, prevents invalid keys
4. **onMouseDown** - Stops propagation to prevent parent interference
5. **onClick** - Stops propagation and ensures focus
6. **onFocus** - Stops propagation and selects all text

The field now explicitly allows:
- Numbers 0-9
- Decimal point (.)
- Backspace, Delete
- Arrow keys, Tab, Escape, Enter
- Ctrl/Cmd + C, V, A, X (copy, paste, select all, cut)

All other keys are blocked with `preventDefault()`.

---

## Pre-Test Setup

1. **Hard refresh browser**: `Cmd+Shift+R` (Mac) or `Ctrl+Shift+R` (Windows)
2. **Open browser DevTools**: Press `F12`
3. **Go to Console tab**: Click the "Console" tab
4. **Navigate to Productions**: Select a production and go to Props tab

---

## Test Sequence

### Test 1: Click Into Cost Field
**Action:** Click on an empty Cost field

**Expected Console Output:**
```
Input clicked
Input mousedown
Input focused
```

**Expected UI:**
- Field is highlighted with purple focus ring
- Cursor is blinking in the field
- Any existing text is selected

---

### Test 2: Type Single Digit
**Action:** Type `5`

**Expected Console Output:**
```
Key pressed: 5 Code: 53
onInput triggered: 5
onChange triggered: 5
```

**Expected UI:**
- Value shows: `5`
- No errors

---

### Test 3: Type Multiple Digits
**Action:** Continue typing `0`

**Expected Console Output:**
```
Key pressed: 0 Code: 48
onInput triggered: 50
onChange triggered: 50
```

**Expected UI:**
- Value shows: `50`

---

### Test 4: Type Decimal Point
**Action:** Type `.`

**Expected Console Output:**
```
Key pressed: . Code: 190
onInput triggered: 50.
onChange triggered: 50.
```

**Expected UI:**
- Value shows: `50.`

---

### Test 5: Type Decimal Digits
**Action:** Type `9` then `9`

**Expected Console Output:**
```
Key pressed: 9 Code: 57
onInput triggered: 50.9
onChange triggered: 50.9

Key pressed: 9 Code: 57
onInput triggered: 50.99
onChange triggered: 50.99
```

**Expected UI:**
- Value shows: `50.99`

---

### Test 6: Try Invalid Character
**Action:** Try typing `@` or `A` or any letter

**Expected Console Output:**
```
Key pressed: @ Code: 50    [or whatever the key is]
[No onInput or onChange - key was prevented]
```

**Expected UI:**
- Value stays the same (key doesn't appear)
- No error messages

---

### Test 7: Try Backspace
**Action:** Press `Backspace` to delete the last digit

**Expected Console Output:**
```
Key pressed: Backspace Code: 8
onInput triggered: 50.9
onChange triggered: 50.9
```

**Expected UI:**
- Value shows: `50.9`

---

### Test 8: Try Delete
**Action:** Position cursor at start, press `Delete`

**Expected Console Output:**
```
Key pressed: Delete Code: 46
onInput triggered: 0.9    [or similar depending on cursor position]
onChange triggered: 0.9
```

**Expected UI:**
- Character at cursor position is deleted

---

### Test 9: Try Ctrl+A (Select All)
**Action:** Press `Ctrl+A` (or `Cmd+A` on Mac)

**Expected Console Output:**
```
Key pressed: a Code: 65    [shows lowercase 'a']
[No preventDefault because Ctrl/Cmd is pressed]
```

**Expected UI:**
- All text in field is selected (highlighted)

---

### Test 10: Try Ctrl+C (Copy)
**Action:** Make sure field has value, press `Ctrl+C` (or `Cmd+C`)

**Expected Console Output:**
```
Key pressed: c Code: 67
[No preventDefault because Ctrl/Cmd is pressed]
```

**Expected UI:**
- Value is copied to clipboard
- No visual change to field

---

### Test 11: Try Ctrl+V (Paste)
**Action:** Press `Ctrl+V` (or `Cmd+V`)

**Expected Console Output:**
```
Key pressed: v Code: 86
[No preventDefault because Ctrl/Cmd is pressed]
onInput triggered: [pasted value]
onChange triggered: [pasted value]
```

**Expected UI:**
- Pasted text appears (non-numeric characters are filtered out)
- Budget totals update

---

### Test 12: Tab Out (Blur)
**Action:** Press `Tab` to leave the field

**Expected Console Output:**
```
Key pressed: Tab Code: 9
Input blur, value: 50.99
handleUpdateProp called: {actIndex: X, sceneIndex: X, propId: '...', field: 'cost', value: '50.99'}
Updating prop: [PropName] field: cost new value: 50.99
Production updated successfully
```

**Expected UI:**
- Field value is formatted to 2 decimals: `$50.99`
- Focus moves to next field
- Budget Summary Card updates with new total

---

### Test 13: Verify Persistence
**Action:** Refresh the page

**Expected Console Output:**
- No Cost field errors
- No "productionsService not available" messages

**Expected UI:**
- Cost field still shows: `$50.99`
- All other props retain their costs

---

## Comprehensive Test Session

### Full Workflow Test
1. Open an empty Cost field
2. Type: `125.50`
3. Tab out
4. Verify value is: `$125.50`
5. Click back in
6. Select all with `Ctrl+A` / `Cmd+A`
7. Type: `99.99`
8. Tab out
9. Verify value is: `$99.99`
10. Refresh page
11. Verify value persists as: `$99.99`

**All of this should produce ZERO console errors.**

---

## Expected vs Actual Console Behavior

### ✅ GOOD Signs (Things Should Work)
```javascript
Input clicked
Input mousedown
Input focused
Key pressed: 5 Code: 53
onInput triggered: 5
onChange triggered: 5
handleUpdateProp called: {...}
Updating prop: Sword field: cost new value: 5
Production updated successfully
```

### ❌ BAD Signs (Something Wrong)
```javascript
// Missing Input clicked/focused:
// -> Element not receiving clicks properly
// 
// No onInput after typing:
// -> Keyboard input not reaching the handler
// 
// handleUpdateProp called but not "Production updated":
// -> Service available but update failed
// 
// "productionsService not available!":
// -> Service not initialized
// 
// "Prop not found: xxx":
// -> Wrong ID being passed
```

---

## Quick Diagnostic Checks

### Check 1: Element Exists
Open browser console and run:
```javascript
document.querySelector('[data-testid="cost-input"]')
```
**Expected:** Shows an `<input>` element (not null/undefined)

### Check 2: Element Is Enabled
```javascript
const input = document.querySelector('[data-testid="cost-input"]');
console.log('readOnly:', input.readOnly);
console.log('disabled:', input.disabled);
console.log('type:', input.type);
```
**Expected:**
```
readOnly: false
disabled: false
type: text
```

### Check 3: Element Can Be Focused
```javascript
const input = document.querySelector('[data-testid="cost-input"]');
input.focus();
console.log('focused:', document.activeElement === input);
```
**Expected:** Should log `true`

### Check 4: Service Available
```javascript
console.log('Service available:', !!window.productionsService?.updateProduction);
```
**Expected:** Should log `true`

---

## Troubleshooting Flow

### Issue: No "Input clicked" in console
1. Check element exists: `document.querySelector('[data-testid="cost-input"]')`
2. Try clicking directly on the $ symbol area
3. Try clicking on the input border
4. Try clicking slightly to the right of the $

### Issue: "Input clicked" appears but no "Input focused"
1. Element might be click-receiving but focus-prevented
2. Try pressing Tab to tab into the field instead
3. Check if `e.preventDefault()` is being called somewhere

### Issue: Key presses not showing in console
1. Verify input is focused (blue ring around field)
2. Try clicking field again with single click
3. Try typing number keys specifically (0-9)
4. Check that NumLock is on if using numeric keypad

### Issue: onInput/onChange not firing
1. Key presses ARE being captured (Key pressed: X shown in console)
2. But onInput/onChange missing
3. This suggests `preventDefault()` is blocking the input
4. Check the onKeyDown logic - might be too restrictive

### Issue: Value appears but doesn't persist after refresh
1. Check budget totals update (they should if value was saved)
2. Open Network tab, check if PUT/POST requests happen
3. Look for "Production updated successfully" in console
4. If you see updates but not persistence, it's a backend issue

---

## Information to Share If Still Broken

When reporting issues, include:

1. **Full console output** - Copy everything from when you click the field to when you blur it
2. **Browser/OS info** - "Chrome 120 on Mac" or "Firefox 121 on Windows"
3. **Exact steps** - What did you click, type, press?
4. **What you expected vs what happened**

Example report:
```
When I click the Cost field:
- Input clicked ✅
- Input mousedown ✅  
- Input focused ✅

When I type "5":
- Key pressed: 5 Code: 53 ✅
- onInput triggered: 5 ❌ MISSING
- onChange triggered: 5 ❌ MISSING

The value doesn't appear in the field.
Browser: Chrome 120 on macOS
```

---

## Success Checklist ✅

You'll know everything is working when:

- [ ] Can click into Cost field without issues
- [ ] Can type numbers and see them appear
- [ ] Can use decimal point
- [ ] Can use backspace/delete
- [ ] Cannot type letters or special characters
- [ ] Can copy/paste with Ctrl+C/V or Cmd+C/V
- [ ] Value updates in real-time (onInput/onChange fires)
- [ ] Value formats to 2 decimals on blur
- [ ] Budget Summary updates with new costs
- [ ] Cost badges change color based on amount
- [ ] Value persists after page refresh
- [ ] ZERO JavaScript errors in console related to Cost field
