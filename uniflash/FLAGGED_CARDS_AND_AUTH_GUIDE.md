# Flagged Cards & Password Protection Implementation Guide

## Overview
This guide covers two new features added to Uniflash:
1. **Flagged Flashcards** - Flag difficult cards and create study sets from them
2. **Password Protection** - Secure the app with password authentication

---

## Feature 1: Flagged Flashcards

### What It Does
Users can now flag flashcards as "difficult" during practice or review sessions, then create a dedicated study set from all flagged cards.

### How to Use

#### 1. Flagging Cards During Study
- **In Practice Mode** (`/flashcards/practice`):
  - Click the flag button below the flashcard
  - Toggle between "🏳️ Flag" and "🚩 Flagged"

- **In Review Mode** (`/review`):
  - After revealing the answer, click "🏳️ Flag as Difficult"
  - Located in the secondary actions area

#### 2. Managing Flagged Cards
Go to **My Flashcards** (`/flashcards`):
- See a banner showing count of flagged cards
- Filter view to show only flagged cards using dropdown: "🚩 Flagged Cards"
- Flagged cards show a "🚩 Flagged" badge
- **Unflag cards** by clicking the "🚩 Unflag" button on any flagged card

#### 3. Creating a Set from Flagged Cards
1. Go to **My Flashcards** page
2. If you have flagged cards, you'll see a red banner
3. Click "Create Set from Flagged Cards"
4. Enter a name for your new set (default: "Difficult Cards")
5. Choose whether to unflag cards after adding to set
6. New set is created with all flagged cards assigned to it

### Database Changes
Run these SQL migrations in your Supabase SQL Editor:

**Step 1: Add flagged column**
```sql
-- Add is_flagged column to flashcards table
ALTER TABLE flashcards
ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT false;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_flashcards_is_flagged ON flashcards(is_flagged);
```

Or run the complete migration file: `ADD_FLAGGED_FLASHCARDS.sql`

**Step 2: Fix RLS Policies (IMPORTANT!)**
```sql
-- Fix RLS policies to allow creating sets and updating flags
-- Run this file: FIX_RLS_POLICIES.sql
```

Without fixing the RLS policies, you'll get an error when trying to create sets from flagged cards.

### Files Modified
- `/src/pages/PracticeMode.jsx` - Added flag toggle button
- `/src/pages/Review.jsx` - Added flag toggle button
- `/src/pages/FlashcardList.jsx` - Added filter, badge, and set creation
- `/src/styles/App.css` - Added flag button and badge styles

---

## Feature 2: Password Protection

### What It Does
The entire app is now protected by a password. Users must login before accessing any features.

### Password
```
unicorn_mara_poptart_1234!!
```

### How It Works
1. App loads → Shows login page
2. User enters password
3. If correct → Stores auth in sessionStorage → Shows main app
4. If incorrect → Shows error message
5. User can logout using the logout button in navigation

### User Experience
- **Login persists** during browser session (sessionStorage)
- **Logout button** in navigation sidebar (bottom)
- **Automatic redirect** to login if not authenticated
- **Session-based** - Password required again after closing browser

### Files Created
- `/src/pages/Login.jsx` - Login page component
- `/src/styles/Login.css` - Login page styles

### Files Modified
- `/src/App.jsx` - Added authentication state and login check
- `/src/components/Navigation.jsx` - Added logout button
- `/src/styles/App.css` - Added logout button styles

### Security Notes
⚠️ **This is basic protection suitable for hosting demos/personal use**
- Password is stored in client-side code
- Not suitable for production or sensitive data
- Consider implementing proper authentication (Supabase Auth) for production

---

## Setup Instructions

### 1. Database Migration
```bash
# Open Supabase SQL Editor
# Run the ADD_FLAGGED_FLASHCARDS.sql file
```

### 2. Install Dependencies (if needed)
```bash
npm install
```

### 3. Run the App
```bash
npm run dev
```

### 4. Test the Features

#### Test Password Protection
1. Open app in browser
2. Should see login screen
3. Enter incorrect password → See error
4. Enter correct password: `unicorn_mara_poptart_1234!!`
5. Should access dashboard
6. Click logout → Returns to login

#### Test Flagged Cards
1. Login to app
2. Go to Practice Mode or Review
3. Flag 2-3 cards by clicking flag button
4. Go to "My Flashcards"
5. Should see banner: "🚩 You have X flagged card(s)"
6. Click "Create Set from Flagged Cards"
7. Name the set (e.g., "Test Difficult Cards")
8. Choose to unflag or keep flagged
9. Verify new set appears in sets list
10. Verify cards are in the new set

---

## Workflow Example

### Student Study Workflow
```
Day 1: Review Session
├─ Review 20 flashcards
├─ Flag 5 difficult cards (click flag button)
└─ Continue studying

Day 2: Manage Difficult Cards
├─ Go to "My Flashcards"
├─ See "🚩 You have 5 flagged card(s)"
├─ Click "Create Set from Flagged Cards"
├─ Name: "Week 1 - Hard Concepts"
└─ Set created with 5 cards

Day 3: Extra Practice
├─ Go to Practice Mode
├─ Select "🚩 Week 1 - Hard Concepts" set
├─ Practice only difficult cards
└─ Master the material
```

---

## Customization Options

### Change Password
Edit `/src/pages/Login.jsx` line 13:
```javascript
if (password === 'YOUR_NEW_PASSWORD_HERE') {
```

### Change Flag Colors
Edit `/src/styles/App.css` search for `#ef4444` and replace with your color.

### Auto-Unflag After Set Creation
Edit `/src/pages/FlashcardList.jsx` line 318 to automatically unflag:
```javascript
// Remove the confirm dialog and always unflag
await supabase
  .from('flashcards')
  .update({ is_flagged: false })
  .eq('set_id', newSet.id);
```

---

## Troubleshooting

### Issue: Can't Login
- **Check:** Password is exactly `unicorn_mara_poptart_1234!!` (case-sensitive)
- **Solution:** Clear browser cache and sessionStorage

### Issue: Flag Button Not Showing
- **Check:** Database migration completed
- **Solution:** Run `ADD_FLAGGED_FLASHCARDS.sql` in Supabase

### Issue: Flagged Cards Not Filtering
- **Check:** Cards have `is_flagged` column
- **Solution:** Refresh flashcard list or reload page

### Issue: Can't Create Set from Flagged Cards
- **Check:** You have at least 1 flagged card
- **Check:** Flashcard sets table exists (from previous migration)
- **Solution:** Flag some cards first

---

## API Reference

### Toggle Flag Function
```javascript
const toggleFlag = async (cardId, currentFlagStatus) => {
  const { error } = await supabase
    .from('flashcards')
    .update({ is_flagged: !currentFlagStatus })
    .eq('id', cardId);
};
```

### Create Set from Flagged
```javascript
const createSetFromFlagged = async () => {
  // 1. Create new set
  const { data: newSet } = await supabase
    .from('flashcard_sets')
    .insert([{ name, description, color, icon }])
    .select()
    .single();

  // 2. Assign flagged cards to set
  await supabase
    .from('flashcards')
    .update({ set_id: newSet.id })
    .eq('is_flagged', true);
};
```

---

## Next Steps

### Recommended Enhancements
1. **Bulk flag operations** - Flag multiple cards at once
2. **Flag statistics** - Track most flagged topics
3. **Auto-create sets** - Automatically create weekly "difficult cards" sets
4. **Better authentication** - Use Supabase Auth for production
5. **Flag history** - Track when cards were flagged/unflagged

### Alternative Workflows
- Create multiple difficulty levels (easy/medium/hard flags)
- Auto-flag cards marked "Again" more than 3 times
- Export only flagged cards to Anki
- Share flagged card sets with study groups

---

## Summary

### What You Can Now Do
✅ Flag difficult flashcards during study sessions
✅ View all flagged cards in one place
✅ Create dedicated study sets from flagged cards
✅ Protect your app with password authentication
✅ Logout to secure your session

### Benefits
- Focus extra study time on difficult material
- Organize challenging concepts into review sets
- Keep your study app private with password
- Track which cards need more attention
- Improve retention on weak areas

Enjoy your enhanced Uniflash experience! 🦄📚
