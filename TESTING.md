# 🧪 Testing CozyChat

This guide will help you test the CozyChat website locally.

## Prerequisites

- Node.js 18+ installed
- A Supabase account and project
- Git (if cloning from repository)

## Step 1: Environment Setup

### 1.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the project to be ready (usually 2-3 minutes)
3. Go to **Settings > API** in your Supabase dashboard
4. Copy your project URL and keys

### 1.2 Configure Environment Variables

1. Copy the example environment file:
```bash
cp .env.local.example .env.local
```

2. Edit `.env.local` and fill in your Supabase credentials:
```env
# Replace with your actual Supabase project details
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_from_supabase_dashboard
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_from_supabase_dashboard

# Keep these as they are for local testing
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Generate a random 32+ character string for encryption
NEXT_PUBLIC_ENCRYPTION_SALT=randomly_generated_32_character_string_here
```

## Step 2: Database Setup

### 2.1 Install Supabase CLI (if not already installed)

```bash
npm install -g supabase
```

### 2.2 Run Database Migrations

```bash
# Link to your Supabase project
npx supabase link --project-ref your_project_id

# Push database schema to Supabase
npx supabase db push
```

## Step 3: Install Dependencies & Start Development Server

```bash
# Install all dependencies
npm install

# Start the development server
npm run dev
```

## Step 4: Test the Website

### 4.1 Open Your Browser

Navigate to: **http://localhost:3000**

### 4.2 Test Basic Functionality

1. **Home Page**: You should see the CozyChat landing page
2. **Start Chat**: Click "Start Chatting" to go to `/chat`
3. **Anonymous User**: The app automatically creates an anonymous user
4. **Chat Interface**: You should see the chat interface with:
   - Connection status indicator
   - Message area
   - Input field
   - Chat controls

### 4.3 Test Real-time Features (Advanced)

To fully test real-time features, you'll need two browser windows:

1. **Open two browser tabs**: Both pointing to `http://localhost:3000/chat`
2. **Wait for matching**: The system should pair the two users
3. **Send messages**: Type in one tab, see it appear in the other
4. **Test typing indicators**: Type in one tab, see typing indicator in the other
5. **Test disconnection**: Close one tab, see the other show disconnection

## Step 5: Monitor Development

### 5.1 Check Browser Console

Open Developer Tools (F12) to monitor:
- Any JavaScript errors
- Network requests to API endpoints
- Real-time connection status

### 5.2 Check Terminal Output

Monitor the terminal running `npm run dev` for:
- API request logs
- Any server errors
- Build warnings

## Troubleshooting

### Common Issues

**1. "Failed to create user" error**
- Check your `.env.local` file has correct Supabase credentials
- Verify your Supabase project is active
- Check database migrations ran successfully

**2. "Connection failed" in chat**
- Verify Supabase Realtime is enabled in your project
- Check browser console for WebSocket errors
- Ensure your API keys have correct permissions

**3. TypeScript/Build errors**
- Run `npm run type-check` to see detailed errors
- Check that all dependencies are installed: `npm install`
- Clear Next.js cache: `rm -rf .next`

**4. Database connection issues**
- Verify your service role key in `.env.local`
- Check Supabase project status
- Ensure database migrations completed: `npx supabase db push`

### Useful Commands

```bash
# Check for linting issues
npm run lint

# Type check without building
npm run type-check

# Build for production testing
npm run build

# Check database status
npx supabase status

# View database in browser
npx supabase start
# Then visit: http://localhost:54323
```

## Features to Test

### ✅ Core Features
- [x] Anonymous user creation
- [x] Chat session creation and joining
- [x] Real-time message sending/receiving
- [x] Typing indicators
- [x] Connection quality monitoring
- [x] Auto-reconnection
- [x] Message encryption/decryption
- [x] Rate limiting (try sending many messages quickly)

### 🔄 Expected Behavior
- **Fast connection**: Should connect within 2-3 seconds
- **Real-time sync**: Messages appear instantly in both windows  
- **Smooth typing**: Typing indicators appear/disappear smoothly
- **Graceful errors**: Connection issues show user-friendly messages
- **Auto-recovery**: Dropped connections automatically reconnect

## Performance Testing

### Local Performance
- **First Load**: Should load under 3 seconds
- **Message Latency**: Under 200ms for local testing
- **Memory Usage**: Monitor browser memory, should stay stable

### Network Testing
- Test with slow network connection (throttling in DevTools)
- Test connection drops (disable/enable WiFi)
- Test with multiple browser tabs open

---

**🎉 Congratulations!** If everything works, you have a fully functional real-time chat application!

Next steps: Continue with [Phase 2 development](./README.md#phase-2-core-chat-functionality-tasks-5-8) to add more features.
