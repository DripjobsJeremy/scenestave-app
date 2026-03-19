# Cost Field Fix: Immediate Updates + Deferred Saves

## Problem
When typing in the Cost field, each keystroke might trigger a full save to the database, which could cause the input field to reset or re-render, making typing feel sluggish or broken.

## Solution
Split the update logic into two functions:

### 1. `handleUpdatePropImmediate` (for typing)
- Updates the React state **immediately**
- Does NOT save to the database
- Used for `onInput` and `onChange` events on the Cost field
- Makes typing feel instant and responsive
- Budget Summary updates in real-time as you type

### 2. `handleUpdatePropAndSave` (for saving)
- Updates React state AND saves to database
- Used for `onBlur` (when you Tab or click away)
- Ensures data persists between page refreshes
- Used for all other fields (name, description, category, character, status)

## How It Works

```
User types "4" in Cost field
        ↓
onInput fires
        ↓
handleUpdatePropImmediate called
        ↓
React state updated immediately
        ↓
Input shows "4" instantly
        ↓
No database call yet
```

```
User tabs/clicks away
        ↓
onBlur fires
        ↓
Value formatted to "4.00"
        ↓
handleUpdatePropAndSave called
        ↓
React state updated
        ↓
Database saved via productionsService
        ↓
Budget Summary reflects final value
```

## Implementation Details

### handleUpdatePropImmediate
```javascript
const handleUpdatePropImmediate = (actIndex, sceneIndex, propId, field, value) => {
  // Update prop in local state
  const updatedActs = [...production.acts];
  // Find and update the prop
  props[propIndex] = { ...props[propIndex], [field]: value };
  
  // Notify parent component (SceneBuilder) to update its state
  if (typeof onUpdateScene === 'function') {
    onUpdateScene(actIndex, { ...production.acts[actIndex], scenes: updatedActs[actIndex].scenes });
  }
  // No DB save happens here
};
```

### handleUpdatePropAndSave
```javascript
const handleUpdatePropAndSave = (actIndex, sceneIndex, propId, field, value) => {
  // Update prop in local state (same as immediate)
  const updatedActs = [...production.acts];
  props[propIndex] = { ...props[propIndex], [field]: value };
  
  // Save to database
  window.productionsService.updateProduction(production.id, { acts: updatedActs });
  
  // Notify parent component
  if (typeof onUpdateScene === 'function') {
    onUpdateScene(actIndex, { ...production.acts[actIndex], scenes: updatedActs[actIndex].scenes });
  }
};
```

## Cost Field Behavior

### During Typing (onInput/onChange)
- Uses `handleUpdatePropImmediate`
- React state updates immediately
- Budget Summary updates in real-time
- User sees each keystroke instantly
- No database calls

### When Done (onBlur)
- Uses `handleUpdatePropAndSave`
- Value formatted to 2 decimal places
- Saved to database
- Persists across page refreshes

### Example Flow
```
User types "45.99" in empty Cost field:

Keystroke 1 - "4":
  onInput → handleUpdatePropImmediate → React updates → shows "4"
  
Keystroke 2 - "5":
  onInput → handleUpdatePropImmediate → React updates → shows "45"
  
Keystroke 3 - ".":
  onInput → handleUpdatePropImmediate → React updates → shows "45."
  
Keystroke 4 - "9":
  onInput → handleUpdatePropImmediate → React updates → shows "45.9"
  
Keystroke 5 - "9":
  onInput → handleUpdatePropImmediate → React updates → shows "45.99"
  
[User presses Tab]
  onBlur → handleUpdatePropAndSave → React updates → formats to "45.99"
  → Database saved → Budget Summary updates with final value
```

## Other Fields

All other fields (Name, Description, Category, Character, Status) use `handleUpdatePropAndSave` on `onChange`, meaning they:
- Update React state immediately
- Save to database immediately
- Show changes instantly

This is appropriate for these fields because they're typically shorter edits.

## Console Logging

When testing, you'll see:

**While typing in Cost field:**
```
onInput triggered: 4
handleUpdatePropImmediate: {actIndex: 0, sceneIndex: 0, propId: '...', field: 'cost', value: '4'}
onInput triggered: 45
handleUpdatePropImmediate: {actIndex: 0, sceneIndex: 0, propId: '...', field: 'cost', value: '45'}
```

**When leaving Cost field:**
```
Input blur, value: 45.99
handleUpdatePropAndSave: {actIndex: 0, sceneIndex: 0, propId: '...', field: 'cost', value: '45.99'}
Production saved to productionsService
```

## Testing Checklist

- [ ] Click into Cost field
- [ ] Type "45.99" - each keystroke visible immediately
- [ ] Tab out - value formats and saves
- [ ] Budget Summary shows updated total
- [ ] Cost badge appears with correct color
- [ ] Refresh page - cost persists as "45.99"
- [ ] Edit the value again - same process works
- [ ] Try other fields (Name, Description) - they save immediately
- [ ] No console errors

## Benefits

1. **Responsive Input** - Typing feels instant, no lag
2. **Real-time Feedback** - Budget updates as you type
3. **No Premature Saves** - Database only saved when done
4. **Graceful Degradation** - Works even if parent component slow
5. **Clear Semantics** - Two functions for two different purposes
