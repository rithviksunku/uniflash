# Database Setup - Quick Start Guide

## ⚠️ IMPORTANT: Run These SQL Files in Order

If you're setting up the database for the first time or getting RLS errors, run these migrations in your Supabase SQL Editor:

### Step 1: Run ADD_FLAGGED_FLASHCARDS.sql
```sql
-- Copy and paste the contents of ADD_FLAGGED_FLASHCARDS.sql
-- This adds the is_flagged column to flashcards table
```

### Step 2: Run FIX_RLS_POLICIES.sql ⚠️ CRITICAL
```sql
-- Copy and paste the contents of FIX_RLS_POLICIES.sql
-- This fixes Row Level Security policies
-- WITHOUT THIS, you'll get errors creating sets!
```

---

## Common Errors and Solutions

### Error: "new row violates row-level security policy for table flashcard_sets"
**Cause:** RLS policies are too restrictive

**Solution:** Run `FIX_RLS_POLICIES.sql` in Supabase SQL Editor

---

### Error: "column 'is_flagged' does not exist"
**Cause:** Missing the flagged column

**Solution:** Run `ADD_FLAGGED_FLASHCARDS.sql` in Supabase SQL Editor

---

## How to Access Supabase SQL Editor

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Click "SQL Editor" in the left sidebar
4. Click "New Query"
5. Paste the SQL code
6. Click "Run" or press Cmd/Ctrl + Enter

---

## Verify Everything Worked

After running both migrations, verify in the Supabase Table Editor:

### Check flashcards table:
- Should have `is_flagged` column (boolean, default: false)

### Check flashcard_sets table:
- Should exist with all standard columns

### Check RLS policies:
- Both tables should have "Enable all operations" policies
- Should allow SELECT, INSERT, UPDATE, DELETE

---

## Quick Test

1. Try creating a flashcard set from the app
2. Flag a card in Practice Mode
3. Go to My Flashcards
4. Click "Create Set from Flagged Cards"
5. Should work without errors! ✅

---

## Still Having Issues?

Check the full documentation:
- `FLAGGED_CARDS_AND_AUTH_GUIDE.md` - Complete feature guide
- `FIXES_AND_IMPROVEMENTS.md` - Detailed fixes and improvements
- `DATABASE_SCHEMA.md` - Full database schema reference

---

## All SQL Migration Files

Run in this order:
1. `DATABASE_MIGRATION.sql` - Initial schema setup (if starting fresh)
2. `ADD_FLAGGED_FLASHCARDS.sql` - Add flagged functionality
3. `FIX_RLS_POLICIES.sql` - Fix permissions (REQUIRED!)

That's it! You're ready to go. 🚀
