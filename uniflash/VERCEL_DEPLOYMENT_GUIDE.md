# Vercel Deployment Guide for Uniflash

## 🚀 Quick Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/rithviksunku/uniflash)

---

## Prerequisites

Before deploying, ensure you have:

1. ✅ **GitHub Account** - Your code is already on GitHub
2. ✅ **Vercel Account** - Sign up at [vercel.com](https://vercel.com) (free)
3. ✅ **Supabase Project** - Your database is set up
4. ✅ **OpenAI API Key** - For flashcard generation
5. ✅ **Environment Variables** - Ready to configure

---

## Step-by-Step Deployment

### Step 1: Connect to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **"Add New Project"**
3. Select **"Import Git Repository"**
4. Choose your repository: `rithviksunku/uniflash`
5. Click **"Import"**

### Step 2: Configure Project

Vercel will auto-detect that this is a Vite project. Verify these settings:

- **Framework Preset:** Vite
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### Step 3: Add Environment Variables

Click on **"Environment Variables"** and add these:

| Key | Value | Where to Find |
|-----|-------|---------------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL | Supabase → Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anon Key | Supabase → Settings → API → anon/public |
| `VITE_OPENAI_API_KEY` | Your OpenAI API Key | OpenAI → API Keys |

**Important:** Make sure variable names start with `VITE_` (Vite requirement)

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait 2-3 minutes for build to complete
3. Vercel will provide your live URL: `https://uniflash-xxxxx.vercel.app`

---

## Post-Deployment Checklist

After deployment, verify:

- [ ] Site loads without errors
- [ ] Login works (password: `unicorn_mara_poptart_1234!!`)
- [ ] Can navigate between pages
- [ ] Can upload PDF/PowerPoint files
- [ ] Can generate flashcards with AI
- [ ] Can create manual flashcards
- [ ] Can flag/unflag cards
- [ ] Can create sets
- [ ] PDF parsing works
- [ ] Quiz generation works

---

## Database Setup for Production

### Required SQL Migrations

Run these in your Supabase SQL Editor (in order):

1. **ADD_FLAGGED_FLASHCARDS.sql**
   - Adds is_flagged column
   - Required for flagging feature

2. **FIX_RLS_POLICIES.sql**
   - Fixes permission errors
   - CRITICAL for set creation

### Verify Database

Check that these tables exist:
- ✅ presentations
- ✅ slides
- ✅ flashcards
- ✅ flashcard_sets
- ✅ quizzes
- ✅ quiz_questions
- ✅ review_sessions

---

## Custom Domain (Optional)

### Add Your Own Domain

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Click **"Add Domain"**
3. Enter your domain (e.g., `uniflash.yourdomain.com`)
4. Follow DNS configuration instructions
5. Wait for DNS propagation (5-10 minutes)

### Example DNS Records

For `uniflash.yourdomain.com`:

```
Type: CNAME
Name: uniflash
Value: cname.vercel-dns.com
```

---

## Environment Variables Management

### Adding New Variables

```bash
# Using Vercel CLI
vercel env add VITE_NEW_VARIABLE

# Or via Dashboard
# Vercel → Project → Settings → Environment Variables
```

### Updating Variables

1. Go to Settings → Environment Variables
2. Click **"Edit"** next to variable
3. Update value
4. Click **"Save"**
5. **Redeploy** for changes to take effect

### Important Notes

⚠️ **Variables must start with `VITE_`** for Vite to include them
⚠️ **Redeploy after changing** environment variables
⚠️ **Never commit .env** files to Git (already in .gitignore)

---

## Continuous Deployment

Vercel automatically deploys when you push to GitHub:

### Main Branch (Production)

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel will automatically:
1. Detect the push
2. Build your project
3. Deploy to production
4. Update your live site

### Preview Deployments

Every branch and pull request gets a preview URL:

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and push
git push origin feature/new-feature

# Vercel creates preview at:
# https://uniflash-xxxxx-username.vercel.app
```

---

## Performance Optimization

### Already Configured

✅ **Asset Caching** - Static files cached for 1 year
✅ **Code Splitting** - Separate chunks for better loading
✅ **Tree Shaking** - Removes unused code
✅ **Minification** - Compressed JavaScript and CSS
✅ **Lazy Loading** - Routes loaded on demand

### Additional Optimizations

#### 1. Enable Analytics

```bash
# Install Vercel Analytics
npm install @vercel/analytics

# Add to src/main.jsx
import { Analytics } from '@vercel/analytics/react';

<Analytics />
```

#### 2. Enable Speed Insights

```bash
npm install @vercel/speed-insights

# Add to src/main.jsx
import { SpeedInsights } from '@vercel/speed-insights/react';

<SpeedInsights />
```

---

## Monitoring and Logs

### View Deployment Logs

1. Go to Vercel Dashboard
2. Click on your deployment
3. View **"Build Logs"** tab
4. Check for errors or warnings

### Runtime Logs

1. Click **"Functions"** tab
2. View function execution logs
3. Debug API errors

### Analytics

1. Enable analytics in project settings
2. View visitor stats
3. Track performance metrics

---

## Troubleshooting

### Build Fails

**Error:** `Command "npm run build" exited with 1`

**Solutions:**
1. Check build logs for specific error
2. Run `npm run build` locally to test
3. Verify all dependencies in package.json
4. Check for TypeScript errors
5. Ensure environment variables are set

### Environment Variables Not Working

**Error:** `API key not found` or `undefined`

**Solutions:**
1. Verify variable names start with `VITE_`
2. Check spelling matches code exactly
3. Redeploy after adding variables
4. Clear cache: `vercel env pull`

### PDF Parsing Fails

**Error:** `PDF worker failed to load`

**Solutions:**
1. Check browser console for CORS errors
2. Verify CDN is accessible (jsdelivr.net)
3. Check network tab for 404s on worker file
4. Try clearing browser cache

### 404 on Page Refresh

**Error:** Page works on navigation but not on direct URL

**Solution:**
- Verify `vercel.json` has rewrite rules
- Should already be configured correctly
- If missing, add:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

### Database Connection Issues

**Error:** `Failed to fetch from Supabase`

**Solutions:**
1. Verify Supabase URL is correct
2. Check anon key is valid
3. Verify RLS policies are set up
4. Check Supabase project is active
5. Test connection locally first

---

## Security Best Practices

### Environment Variables

✅ **DO:**
- Use environment variables for secrets
- Keep .env in .gitignore
- Rotate API keys regularly
- Use different keys for dev/prod

❌ **DON'T:**
- Commit .env files
- Share secrets in code
- Use same keys across environments
- Hardcode sensitive data

### Password Protection

Current implementation:
- Password is hardcoded (demo/personal use only)
- Suitable for hosting privately
- NOT suitable for public production

For production:
```javascript
// Use Supabase Auth instead
import { supabase } from './services/supabase';

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'userpassword'
});
```

### API Key Security

⚠️ **OpenAI API Key** is exposed in browser
- Only suitable for trusted users
- Consider moving to serverless function
- Implement rate limiting
- Monitor usage on OpenAI dashboard

---

## Scaling and Costs

### Vercel Free Tier

Perfect for personal/demo use:
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Custom domains
- ✅ Preview deployments

**Limits:**
- 100 GB bandwidth
- 6,000 build minutes/month
- 100 GB-hours serverless function execution

### Upgrade When

Consider Pro plan ($20/month) if you need:
- More bandwidth (1 TB)
- Password protection
- Analytics
- Team collaboration
- Priority support

### Cost Monitoring

**OpenAI Costs:**
- GPT-3.5-Turbo: ~$0.001/request
- Set usage limits in OpenAI dashboard
- Monitor API usage regularly

**Supabase Costs:**
- Free tier: 500 MB database
- Upgrade at $25/month for 8 GB

---

## Backup and Recovery

### Database Backups

1. Go to Supabase Dashboard → Database → Backups
2. Enable daily automatic backups
3. Download manual backup before major changes

### Code Backups

Your code is already backed up on GitHub:
- Every commit is saved
- Can revert to any previous version
- Use branches for experimental features

---

## Advanced Configuration

### Custom Build Scripts

Edit `package.json`:

```json
{
  "scripts": {
    "build": "vite build",
    "build:production": "vite build --mode production",
    "preview": "vite preview"
  }
}
```

### Serverless Functions

Create API routes in `/api` folder:

```javascript
// api/hello.js
export default function handler(req, res) {
  res.status(200).json({ message: 'Hello from API!' });
}
```

Access at: `https://your-app.vercel.app/api/hello`

### Headers and Redirects

Already configured in `vercel.json`:

```json
{
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## Getting Help

### Vercel Support

- [Documentation](https://vercel.com/docs)
- [Community Forum](https://github.com/vercel/vercel/discussions)
- [Discord](https://vercel.com/discord)

### Project Issues

- [GitHub Issues](https://github.com/rithviksunku/uniflash/issues)
- Check COMPLETE_FEATURE_SUMMARY.md
- Review troubleshooting docs

---

## Summary

### What You've Deployed

✨ **Features:**
- Password-protected flashcard app
- PDF and PowerPoint upload
- AI-powered flashcard generation
- Interactive flashcard editor with document context
- Spaced repetition system
- Quiz generation
- Flagged cards and sets
- Mobile responsive

🔒 **Security:**
- Environment variables
- Row Level Security (Supabase)
- HTTPS by default

📊 **Performance:**
- CDN-cached assets
- Code splitting
- Optimized builds
- Fast global delivery

### Next Steps

1. ✅ Deploy to Vercel
2. ✅ Configure environment variables
3. ✅ Run database migrations
4. ✅ Test all features
5. 🎉 Share with users!

---

**Your app is now live at:** `https://your-app.vercel.app`

**Login with:** `unicorn_mara_poptart_1234!!`

**Enjoy studying! 📚🎉**
