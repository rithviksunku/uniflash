# Interactive Flashcard Editor - Complete Guide

## Overview

The Interactive Flashcard Editor is a new human-in-the-loop experience for creating flashcards from documents. It provides a side-by-side view of your source documents and generated flashcards, allowing you to edit, improve, and perfect your study materials with AI assistance.

---

## Key Features

### 1. **Split-Panel Interface**

```
┌─────────────────────────────────────────┐
│  📄 Source Document    │  🎴 Flashcards │
│                       │                │
│  • View all slides    │  • Edit cards  │
│  • Jump to sources    │  • AI assist   │
│  • Add cards          │  • Manage      │
└─────────────────────────────────────────┘
```

**Left Panel:** Source document with all slides
**Right Panel:** Generated flashcards with editing tools

### 2. **Document Context**

Every flashcard shows:
- ✅ Which slide it came from
- ✅ Quick link to jump to source
- ✅ Preview of source content
- ✅ Slide number reference

**Benefits:**
- Verify accuracy by checking source
- Add context from surrounding material
- Ensure comprehensive coverage

### 3. **AI-Assisted Editing**

#### Get Smart Suggestions
Click the 🤖 button on any card to:
- Clean up grammar
- Improve clarity
- Enhance medical terminology accuracy
- Make definitions more concise

#### Apply or Dismiss
Review AI suggestions and choose:
- ✓ **Apply** - Use the AI's improvement
- ✗ **Dismiss** - Keep your version

### 4. **Human-in-the-Loop Workflow**

```
1. AI Generates → 2. You Review → 3. You Edit → 4. You Approve → 5. Save
```

**You're in control** at every step:
- Select which cards to keep
- Edit any content
- Add new cards manually
- Delete irrelevant cards
- Get AI help when needed

### 5. **Source Highlighting**

Click **"📍 Slide X"** on any card to:
- Highlight the source slide
- Scroll it into view
- See the original context
- Verify the information

**Visual feedback:**
- Highlighted slide has colored border
- Smooth scroll animation
- Clear visual indication

---

## How to Use

### Starting a New Session

1. **Upload Document**
   - Go to "Upload Slides"
   - Choose PDF or PowerPoint
   - Wait for parsing

2. **Select Content**
   - Choose which slides to use
   - Select all or pick specific ones
   - Click "Generate Flashcards"

3. **Generate with AI**
   - Click "✨ Generate Flashcards"
   - AI analyzes your slides
   - Creates 2-3 cards per slide
   - Shows all cards for review

### Reviewing Generated Cards

#### Check the Card
- Read the question (front)
- Read the answer (back)
- Verify against source slide

#### Verify Source
- Click "📍 Slide X" to see original
- Confirm information is accurate
- Check for missing context

#### Make Decision
- ✓ Keep - Leave checkbox checked
- ✗ Remove - Uncheck the box

### Editing Cards

#### Manual Editing

**Front (Question):**
```
Before: What is ATP?
After:  What molecule does the mitochondria produce
        through cellular respiration?
```

**Back (Answer):**
```
Before: Energy
After:  ATP (Adenosine Triphosphate) - the primary
        energy currency of cells
```

#### AI-Assisted Editing

1. Click **🤖** button
2. Wait for AI suggestion (~2 seconds)
3. Review the improved version
4. Click **✓ Apply** or **✗ Dismiss**

**When to use AI assistance:**
- Grammar needs cleanup
- Wording is unclear
- Medical terms need precision
- Answer is too verbose
- Question is ambiguous

### Adding New Cards

#### From a Specific Slide

1. Find the slide in left panel
2. Click **"+ Add Card"** button
3. Fill in front and back
4. Card is linked to that slide

#### Manually (No Slide Reference)

1. Click **"+ Add Card Manually"**
2. Fill in content
3. Save without slide reference

**Use cases:**
- Cross-slide concepts
- Personal mnemonics
- Additional practice
- Related material

### Managing Cards

#### Select/Deselect

- **Individual:** Click checkbox on each card
- **All:** Use "Select All" checkbox at top
- **None:** Uncheck "Select All"

#### Delete Cards

- Click **🗑️** on any card
- Card is removed immediately
- Cannot be undone
- Deselected cards won't be saved anyway

#### Bulk Operations

- Select multiple cards
- Save only selected ones
- Delete unwanted cards
- Regenerate all if needed

---

## Comparison with Previous Experience

### Old Flow (Generate Flashcards)

```
Upload → Select Slides → Generate → Edit → Save
        └─────────────────────┘
           No document view
           No source reference
           No AI assistance
           Basic text fields
```

**Limitations:**
- ❌ Can't see source while editing
- ❌ No reference to verify accuracy
- ❌ No AI help for improvements
- ❌ Hard to add context
- ❌ Can't jump between slide and card

### New Flow (Interactive Editor)

```
Upload → Select Slides → Interactive Editor → Save
                         ┌──────────────────────┐
                         │ • View document      │
                         │ • See references     │
                         │ • AI assistance      │
                         │ • Edit in context    │
                         │ • Jump to sources    │
                         └──────────────────────┘
```

**Advantages:**
- ✅ See document and cards together
- ✅ Click to see sources
- ✅ AI suggestions on demand
- ✅ Add context easily
- ✅ Verify accuracy quickly
- ✅ Better quality cards

---

## Document Storage and Referencing

### How Documents Are Stored

1. **Upload**: File stored in Supabase Storage
2. **Parse**: Content extracted to slides table
3. **Reference**: Each slide has unique ID
4. **Link**: Flashcards reference slide_id

### Accessing Stored Documents

#### Presentations Library

Go to **"📚 Presentations"** to see:
- All uploaded documents
- Upload date
- Number of slides
- File type (PDF/PPTX)

#### View and Generate

From Presentations Library:
1. Click **"View & Generate"**
2. See all slides in document
3. Select slides to use
4. Generate new flashcards

**Reuse documents:**
- Generate different card sets
- Focus on specific chapters
- Create targeted quizzes
- Review particular topics

### Flashcard-to-Document Linking

Every flashcard stores:
- `slide_id`: Link to source slide
- Preserved after editing
- Used for "Don't Understand" feature
- Enables context viewing

**Benefits:**
- Review source material
- Understand context
- Add more details
- Create related cards

---

## Best Practices

### 1. Review Before Editing

```
Generate → Review All → Edit Needed → Save
           └─────┘
         Quick pass first
```

**Why:**
- Get overview of quality
- Identify patterns
- Plan improvements
- Save time

### 2. Use Source References

**Always verify:**
- Medical terminology
- Specific numbers
- Complex processes
- Critical concepts

**How:**
- Click slide reference
- Read original context
- Confirm accuracy
- Add missing details

### 3. Leverage AI Assistance

**Good candidates for AI help:**
- Run-on sentences
- Grammar errors
- Unclear phrasing
- Technical terms
- Verbose answers

**Not needed for:**
- Already clear cards
- Simple definitions
- Personal mnemonics
- Specific formatting

### 4. Add Context from Source

**Example:**

**Original AI Card:**
```
Front: What is mitosis?
Back:  Cell division
```

**After checking source:**
```
Front: What is mitosis and when does it occur?
Back:  Cell division that produces two identical
       daughter cells. Occurs in somatic (body)
       cells for growth and repair.
```

### 5. Create Connections

**Link related concepts:**
- Reference previous cards
- Add cross-references
- Build concept maps
- Create series

**Example:**
```
Card 1: What is glycolysis?
Card 2: Where does glycolysis occur? (References Card 1)
Card 3: What are the products of glycolysis? (References Card 1)
```

---

## Workflow Examples

### Medical Student - Anatomy Lecture

**Scenario:** 50-slide PowerPoint on Cardiovascular System

**Workflow:**
1. Upload → Parse → 50 slides extracted
2. Select all slides
3. Generate → ~150 flashcards created
4. Review in batches:
   - Slides 1-10: Heart anatomy
   - Slides 11-20: Blood vessels
   - Etc.
5. For each card:
   - Check source slide
   - Verify diagram references
   - Add clinical correlations
   - Use AI to clean up
6. Save selected cards to "Cardio Exam 1" set

**Time saved:** 2-3 hours vs manual creation

### Study Group - Shared PDF

**Scenario:** Professor's PDF notes, creating shared study guide

**Workflow:**
1. Upload PDF → 30 pages parsed
2. Divide sections among group:
   - Person A: Pages 1-10
   - Person B: Pages 11-20
   - Person C: Pages 21-30
3. Each person:
   - Generates cards for their section
   - Edits for clarity
   - Adds professor's verbal context
   - Uses AI to improve wording
4. Combine into shared set
5. Group reviews together

**Collaboration:** Each edits their section

### Exam Prep - Targeted Review

**Scenario:** Focus on flagged "difficult" topics

**Workflow:**
1. Review flagged cards
2. Find source presentation
3. Select only relevant slides
4. Generate additional cards
5. Compare with existing cards
6. Add more detail/context
7. Save to "Exam Review" set

**Outcome:** Deeper understanding of weak areas

---

## Keyboard Shortcuts (Planned)

*Coming soon:*

- `Ctrl/Cmd + S`: Save cards
- `Ctrl/Cmd + A`: Select all
- `Ctrl/Cmd + E`: Toggle edit mode
- `Tab`: Next card
- `Shift + Tab`: Previous card
- `Ctrl/Cmd + K`: AI suggest
- `Escape`: Dismiss AI suggestion

---

## Troubleshooting

### Cards Don't Show Source Reference

**Problem:** "Source: No slide reference"

**Causes:**
- Card created manually
- Document deleted
- Database migration issue

**Solution:**
- Manual cards won't have references (expected)
- Re-generate from document if needed
- Check database integrity

### AI Suggestions Not Working

**Problem:** 🤖 button shows error

**Causes:**
- OpenAI API key missing
- API rate limit reached
- Network connection issue
- Invalid API key

**Solutions:**
1. Check environment variable
2. Verify API key in .env
3. Check OpenAI dashboard usage
4. Test network connection

### Can't See Document Panel

**Problem:** Only flashcards visible

**Causes:**
- Narrow screen (mobile)
- Browser zoom level
- CSS not loaded

**Solutions:**
1. On mobile: Panels stack vertically
2. Reset zoom to 100%
3. Refresh page
4. Check console for errors

### Slides Don't Highlight

**Problem:** Click source but nothing happens

**Causes:**
- Slide not in view
- JavaScript error
- ID mismatch

**Solutions:**
1. Scroll to see if it worked
2. Check browser console
3. Refresh and try again
4. Report bug if persists

---

## Technical Details

### How It Works

#### Component Structure

```
InteractiveFlashcardEditor
├── Document Panel
│   ├── Slides Viewer
│   ├── Add Card Buttons
│   └── Source Highlighting
└── Flashcards Panel
    ├── Generation Controls
    ├── Card Editors
    ├── AI Suggestion System
    └── Selection Management
```

#### Data Flow

```
1. Fetch slides from database
   ↓
2. Generate flashcards with AI
   ↓
3. User edits/AI suggests
   ↓
4. Filter selected cards
   ↓
5. Save to database with references
```

#### Database Schema

**Flashcards:**
```sql
{
  id: UUID,
  front: TEXT,
  back: TEXT,
  slide_id: UUID,  ← Reference to source
  set_id: UUID,
  is_flagged: BOOLEAN,
  created_at: TIMESTAMP
}
```

**Slides:**
```sql
{
  id: UUID,
  presentation_id: UUID,
  slide_number: INTEGER,
  title: TEXT,
  content: TEXT,
  created_at: TIMESTAMP
}
```

### Performance Optimizations

- ✅ Lazy loading of slides
- ✅ Debounced editing
- ✅ Memoized components
- ✅ Virtual scrolling (for 100+ cards)
- ✅ Optimistic UI updates

---

## Future Enhancements

### Planned Features

1. **Bulk AI Improvement**
   - Select multiple cards
   - AI improves all at once
   - Review changes as batch

2. **Smart Suggestions**
   - AI suggests cards you're missing
   - Based on slide content
   - Highlights gaps in coverage

3. **Collaborative Editing**
   - Share sessions with study group
   - Real-time co-editing
   - Comments and suggestions

4. **Version History**
   - Track card changes
   - Revert to previous versions
   - See who edited what

5. **Export Options**
   - Export as Anki deck
   - Print as study guide
   - Share as PDF

---

## Summary

### Key Takeaways

✨ **Interactive:** See documents while editing
🎯 **Contextual:** Jump to sources instantly
🤖 **AI-Powered:** Get smart suggestions
✏️ **Editable:** Full control over content
🔗 **Referenced:** Cards link back to sources
📚 **Reusable:** Access documents anytime

### Best Use Cases

1. **Creating from lectures** - See slides while making cards
2. **Verifying accuracy** - Check source material easily
3. **Adding context** - Include details from document
4. **Improving quality** - Use AI to enhance wording
5. **Studying together** - Share documents and cards

### Migration Path

**Current users:**
- Old "Generate Flashcards" still works
- New editor is now default
- Both save to same database
- Same flashcard experience
- No data loss

**Recommendation:**
- Try interactive editor
- Compare experiences
- Use what works for you
- Provide feedback

---

## Getting Started

Ready to try it?

1. Go to **"Upload Slides"**
2. Upload a PDF or PowerPoint
3. Select slides
4. Click **"Generate Flashcards"**
5. Experience the new interactive editor!

**Questions?** See [COMPLETE_FEATURE_SUMMARY.md](COMPLETE_FEATURE_SUMMARY.md)

**Issues?** Check [TROUBLESHOOTING.md](TROUBLESHOOTING.md)

**Deploying?** See [VERCEL_DEPLOYMENT_GUIDE.md](VERCEL_DEPLOYMENT_GUIDE.md)

---

Happy studying! 📚✨
