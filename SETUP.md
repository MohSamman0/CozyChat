# CozyChat Setup Guide 🚀

Complete setup guide for developers getting started with CozyChat.

## Prerequisites

### Required Software
- **Node.js 18+** (LTS recommended) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js) or **yarn**
- **Git** - [Download](https://git-scm.com/)
- **VS Code** (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter

### Accounts You'll Need
- **Supabase Account** - [Sign up](https://supabase.com/)
- **GitHub Account** (for version control)
- **Vercel Account** (for deployment, optional)

## Step-by-Step Setup

### 1. Project Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd Cozy-Chat

# Install dependencies
npm install

# Verify installation
npm run dev --version
```

### 2. Supabase Project Setup

**Create New Supabase Project:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Choose organization and fill details:
   - **Name**: CozyChat
   - **Database Password**: Save this securely!
   - **Region**: Choose closest to your users
4. Wait for project creation (2-3 minutes)

**Get Your Project Credentials:**
1. Go to Project Settings → API
2. Copy these values:
   - **Project URL** (starts with `https://`)
   - **Anon (public) key**
   - **Service Role key** (keep secret!)

### 3. Environment Variables Setup

Create `.env.local` in your project root:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
NEXT_PUBLIC_APP_URL=http://localhost:3000
ENCRYPTION_KEY=your_32_character_encryption_key_here
NODE_ENV=development
```

**⚠️ Important Notes:**
- Replace `your-project-id` with your actual Supabase project ID
- The `NEXT_PUBLIC_SUPABASE_URL` must be the HTTPS URL, not the PostgreSQL connection string
- Generate a 32-character encryption key: `openssl rand -hex 16`
- Never commit `.env.local` to version control

### 4. Database Setup

**Install Supabase CLI:**
```bash
# macOS (using Homebrew)
brew tap supabase/tap
brew install supabase

# Windows/Linux (using npm)
npm install -g supabase
```

**Link Your Project:**
```bash
# Initialize Supabase in your project (if not already done)
supabase init

# Link to your cloud project
supabase link --project-ref your_project_id

# Push database migrations
supabase db push
```

**Verify Database Setup:**
```bash
# Test database connection
npm run dev
# Then visit: http://localhost:3000/api/test-db
```

### 5. Start Development

```bash
# Start the development server
npm run dev

# Open your browser
open http://localhost:3000
```

You should see the beautiful CozyChat homepage! 🎉

## Development Workflow

### Daily Development Commands

```bash
# Start development server
npm run dev

# Run linting
npm run lint

# Format code
npm run format

# Type checking
npx tsc --noEmit

# Build for production (testing)
npm run build
```

### Database Workflow

```bash
# Pull latest database changes
supabase db pull

# Push local changes to cloud
supabase db push

# Reset database (⚠️ destructive)
supabase db reset

# Generate TypeScript types
supabase gen types typescript --project-id your_project_id > src/types/database.ts
```

## Troubleshooting

### Common Issues

**1. Webpack Module Errors**
```bash
# Clear Next.js cache
rm -rf .next
rm -rf node_modules/.cache
npm run dev
```

**2. Environment Variables Not Loading**
```bash
# Restart development server
# Ensure .env.local has correct format
# Check for typos in variable names
```

**3. Database Connection Issues**
- Verify your Supabase URL format (should start with `https://`)
- Check that your project is not paused in Supabase dashboard
- Ensure your API keys are correct and active

**4. TypeScript Errors**
```bash
# Regenerate types
supabase gen types typescript --project-id your_project_id > src/types/database.ts

# Clear TypeScript cache
rm -rf .next
npm run dev
```

**5. Port Already in Use**
```bash
# Kill processes on port 3000
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- --port 3001
```

### Getting Help

**Check Logs:**
- Browser DevTools Console (F12)
- Terminal output where `npm run dev` is running
- Supabase Dashboard → Logs

**Resources:**
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

## Advanced Setup (Optional)

### VS Code Configuration

Create `.vscode/settings.json`:
```json
{
  "typescript.preferences.includePackageJsonAutoImports": "on",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "tailwindCSS.includeLanguages": {
    "typescript": "typescript",
    "typescriptreact": "typescriptreact"
  }
}
```

### Git Hooks (Pre-commit Formatting)

```bash
# Install husky for git hooks
npm install --save-dev husky
npx husky install

# Add pre-commit hook
npx husky add .husky/pre-commit "npm run lint && npm run format"
```

### Environment-Specific Configuration

**Development (.env.local):**
```bash
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Production (.env.production):**
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## 🔧 Troubleshooting Common Issues

### Real-time Chat Not Working

**Problem**: Users can create accounts but chat doesn't connect or messages don't appear.

**Root Cause**: Row Level Security (RLS) policies blocking anonymous users from real-time events.

**Quick Fix (Development)**:
```sql
-- In Supabase SQL Editor, run:
ALTER TABLE chat_sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
```

**Production Fix**:
```sql
-- Enable RLS with anonymous-friendly policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create policies that allow anonymous access
CREATE POLICY "Anonymous users can access chat sessions" 
ON chat_sessions FOR ALL USING (true);

CREATE POLICY "Anonymous users can access messages" 
ON messages FOR ALL USING (true);
```

### Supabase Real-time Not Enabled

**Problem**: No real-time events received despite successful database operations.

**Solution**: 
1. Go to Supabase Dashboard → Database → Publications
2. Find `supabase_realtime` publication  
3. Ensure `chat_sessions` and `messages` tables are enabled
4. If missing, run:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
```

### React Strict Mode Issues

**Problem**: Duplicate users or sessions created in development.

**Solution**: The codebase includes sessionStorage prevention patterns, but you can also disable strict mode temporarily in `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disable for development only
}
```

### Database Connection Issues

**Problem**: "Failed to connect to database" errors.

**Solutions**:
1. **Check Environment Variables**: Ensure all Supabase credentials are correct
2. **Verify Project Status**: Check if your Supabase project is active
3. **Network Issues**: Try connecting from a different network
4. **Reset Database Password**: Go to Supabase → Settings → Database and reset password

## ✅ Testing Your Setup

### 1. Basic Functionality Test
```bash
# Test database connection
curl http://localhost:3000/api/test-db

# Should return: {"message": "Database connection successful!"}
```

### 2. Real-time Chat Test
1. Open two browser tabs to `http://localhost:3000/chat`
2. Both should connect and show "Connected!" status
3. Send a message in one tab - it should appear in both tabs instantly
4. Check browser console for real-time logs: `🔄 Session status changed: waiting → active`

### 3. Development Console Checks
**Expected logs when working**:
```
✅ Anonymous user created: [user-id]
✅ Session created/joined: [session-id] 
✅ Successfully subscribed to real-time channel!
🔄 Session status changed: waiting → active
```

## Next Steps

Once your setup is complete, you're ready to:

1. **Test Real-time Chat** - Open multiple tabs and verify full functionality
2. **Explore the Codebase** - Check out the Redux store, real-time hooks, and UI components
3. **Customize Features** - Modify components in `/src/components/` 
4. **Read Documentation** - Check out `API.md`, `DATABASE.md`, and `DEPLOYMENT.md`
5. **Plan Next Phase** - Review the roadmap for Phase 2 features

**Your CozyChat is now fully functional with real-time anonymous messaging! 🎉**

---

**Need help?** Open an issue or check the troubleshooting section above.
