# Cozy Chat - Deployment & Setup Guide

## Overview

This guide provides comprehensive instructions for setting up, deploying, and maintaining the Cozy Chat application. The application consists of a Next.js frontend and a Supabase backend with real-time capabilities.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.0 or higher
- **npm**: Version 8.0 or higher
- **Git**: For version control
- **Supabase Account**: For backend services

### Development Tools
- **VS Code** (recommended) with extensions:
  - TypeScript and JavaScript Language Features
  - Tailwind CSS IntelliSense
  - ES7+ React/Redux/React-Native snippets
  - Prettier - Code formatter
  - ESLint

## Local Development Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Cozy-Chat
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development

# Admin Configuration (Optional)
ADMIN_API_KEY=your-secure-admin-key-here
```

### 4. Supabase Setup

#### Create a New Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and API keys

#### Run Database Migrations
Execute the migration files in order:

```bash
# Run migrations in Supabase SQL Editor
# Files to run in order:
# 1. supabase/migrations/001_initial_schema.sql
# 2. supabase/migrations/002_rls_policies.sql
# 3. supabase/migrations/003_functions.sql
# 4. supabase/migrations/004_session_context.sql
# 5. supabase/migrations/005_fix_service_role_policies.sql
# 6. supabase/migrations/006_disable_rls_temporarily.sql
# 7. supabase/migrations/007_grant_service_role_permissions.sql
# 8. supabase/migrations/008_grant_public_schema_usage.sql
# 9. supabase/migrations/009_fix_session_matching.sql
# 10. supabase/migrations/010_enable_realtime.sql
# 11. supabase/migrations/011_grant_anon_permissions.sql
```

#### Verify Database Setup
Run these queries in Supabase SQL Editor to verify setup:

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION';

-- Check Realtime publication
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
```

### 5. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Production Deployment

### 1. Vercel Deployment (Recommended)

#### Setup Vercel
1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Login to Vercel:
```bash
vercel login
```

#### Deploy to Vercel
1. In your project directory:
```bash
vercel
```

2. Follow the prompts:
   - Set up and deploy? `Y`
   - Which scope? Select your account
   - Link to existing project? `N`
   - Project name: `cozy-chat`
   - Directory: `./`
   - Override settings? `N`

#### Environment Variables
Set environment variables in Vercel dashboard:

```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_supabase_service_role_key
NEXT_PUBLIC_APP_URL=https://your-vercel-app.vercel.app
NODE_ENV=production
ADMIN_API_KEY=your-secure-admin-key-here
```

### 2. Alternative Deployment Options

#### Netlify Deployment
1. Build the project:
```bash
npm run build
```

2. Deploy to Netlify:
   - Connect your GitHub repository
   - Set build command: `npm run build`
   - Set publish directory: `.next`
   - Add environment variables

#### Docker Deployment
Create a `Dockerfile`:

```dockerfile
FROM node:18-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

Build and run:
```bash
docker build -t cozy-chat .
docker run -p 3000:3000 cozy-chat
```

## Database Management

### 1. Backup Strategy

#### Automated Backups
Supabase provides automated daily backups. For additional safety:

```sql
-- Create backup function
CREATE OR REPLACE FUNCTION create_backup()
RETURNS void AS $$
BEGIN
    -- Export sessions
    COPY (
        SELECT cs.*, 
               au1.interests as user1_interests,
               au2.interests as user2_interests
        FROM chat_sessions cs
        LEFT JOIN anonymous_users au1 ON cs.user1_id = au1.id
        LEFT JOIN anonymous_users au2 ON cs.user2_id = au2.id
    ) TO '/tmp/sessions_backup.csv' WITH CSV HEADER;
    
    -- Export messages (encrypted)
    COPY (
        SELECT m.*, cs.status as session_status
        FROM messages m
        JOIN chat_sessions cs ON m.session_id = cs.id
    ) TO '/tmp/messages_backup.csv' WITH CSV HEADER;
END;
$$ LANGUAGE plpgsql;
```

#### Manual Backup
```bash
# Using pg_dump
pg_dump -h your-supabase-host -U postgres -d postgres > backup.sql

# Using Supabase CLI
supabase db dump --file backup.sql
```

### 2. Database Monitoring

#### Health Check Queries
```sql
-- Check active sessions
SELECT COUNT(*) as active_sessions 
FROM chat_sessions 
WHERE status = 'active';

-- Check waiting users
SELECT COUNT(*) as waiting_users 
FROM chat_sessions 
WHERE status = 'waiting';

-- Check recent activity
SELECT COUNT(*) as recent_messages 
FROM messages 
WHERE created_at > now() - INTERVAL '1 hour';

-- Check system health
SELECT 
    (SELECT COUNT(*) FROM chat_sessions WHERE status = 'active') as active_sessions,
    (SELECT COUNT(*) FROM chat_sessions WHERE status = 'waiting') as waiting_sessions,
    (SELECT COUNT(*) FROM messages WHERE created_at > now() - INTERVAL '1 hour') as recent_messages,
    (SELECT COUNT(*) FROM anonymous_users WHERE is_online = true) as online_users;
```

#### Performance Monitoring
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check table sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### 3. Database Maintenance

#### Regular Maintenance Tasks
```sql
-- Update statistics
ANALYZE;

-- Vacuum tables
VACUUM ANALYZE;

-- Reindex if needed
REINDEX DATABASE postgres;
```

#### Cleanup Old Data
```sql
-- Clean up old sessions (older than 24 hours)
UPDATE chat_sessions 
SET status = 'ended', ended_at = NOW() 
WHERE status IN ('waiting', 'active') 
AND created_at < NOW() - INTERVAL '24 hours';

-- Clean up old messages (older than 30 days)
DELETE FROM messages 
WHERE created_at < NOW() - INTERVAL '30 days';

-- Clean up old anonymous users (inactive for 7 days)
UPDATE anonymous_users 
SET is_online = false 
WHERE last_seen_at < NOW() - INTERVAL '7 days';
```

## Security Configuration

### 1. Environment Security

#### Production Environment Variables
```env
# Use strong, unique keys
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# Production settings
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production
```

#### Security Headers
Add to `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co wss://*.supabase.co;",
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

### 2. Database Security

#### Row Level Security (RLS)
For production, enable RLS with proper policies:

```sql
-- Enable RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anonymous_users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view messages in their sessions" ON public.messages
    FOR SELECT USING (
        session_id IN (
            SELECT id FROM chat_sessions 
            WHERE user1_id = auth.uid() OR user2_id = auth.uid()
        )
    );

CREATE POLICY "Users can view their sessions" ON public.chat_sessions
    FOR SELECT USING (
        user1_id = auth.uid() OR user2_id = auth.uid()
    );
```

#### API Rate Limiting
Implement rate limiting in API routes:

```typescript
// lib/rate-limit.ts
import { NextApiRequest, NextApiResponse } from 'next';

const rateLimitMap = new Map();

export const rateLimit = (maxRequests: number, windowMs: number) => {
  return (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    if (!rateLimitMap.has(ip)) {
      rateLimitMap.set(ip, []);
    }
    
    const requests = rateLimitMap.get(ip).filter((time: number) => time > windowStart);
    
    if (requests.length >= maxRequests) {
      return res.status(429).json({ error: 'Too many requests' });
    }
    
    requests.push(now);
    rateLimitMap.set(ip, requests);
    next();
  };
};
```

## Monitoring & Analytics

### 1. Application Monitoring

#### Error Tracking
Integrate with Sentry for error tracking:

```bash
npm install @sentry/nextjs
```

```javascript
// sentry.client.config.js
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
});
```

#### Performance Monitoring
```typescript
// lib/analytics.ts
export const trackEvent = (event: string, properties?: Record<string, any>) => {
  if (typeof window !== 'undefined') {
    // Google Analytics, Mixpanel, etc.
    gtag('event', event, properties);
  }
};

// Usage
trackEvent('chat_session_started', {
  user_id: userId,
  interests: interests.length
});
```

### 2. Database Monitoring

#### Custom Metrics
```sql
-- Create metrics table
CREATE TABLE IF NOT EXISTS public.system_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Function to record metrics
CREATE OR REPLACE FUNCTION record_metric(
    p_metric_name TEXT,
    p_metric_value NUMERIC
) RETURNS void AS $$
BEGIN
    INSERT INTO public.system_metrics (metric_name, metric_value)
    VALUES (p_metric_name, p_metric_value);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Automated metrics collection
CREATE OR REPLACE FUNCTION collect_system_metrics()
RETURNS void AS $$
BEGIN
    -- Active sessions
    PERFORM record_metric('active_sessions', 
        (SELECT COUNT(*) FROM chat_sessions WHERE status = 'active'));
    
    -- Waiting users
    PERFORM record_metric('waiting_users', 
        (SELECT COUNT(*) FROM chat_sessions WHERE status = 'waiting'));
    
    -- Online users
    PERFORM record_metric('online_users', 
        (SELECT COUNT(*) FROM anonymous_users WHERE is_online = true));
    
    -- Messages in last hour
    PERFORM record_metric('messages_last_hour', 
        (SELECT COUNT(*) FROM messages WHERE created_at > now() - INTERVAL '1 hour'));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Troubleshooting

### 1. Common Issues

#### Realtime Connection Issues
```typescript
// Debug Realtime connection
const debugRealtime = () => {
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('Anon Key:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...');
  
  // Test connection
  supabase.from('messages').select('count').then(console.log);
};
```

#### Database Connection Issues
```sql
-- Check database connectivity
SELECT version();

-- Check Realtime publication
SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime';

-- Check table permissions
SELECT grantee, privilege_type 
FROM information_schema.table_privileges 
WHERE table_name = 'messages' AND table_schema = 'public';
```

#### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Clear node_modules
rm -rf node_modules package-lock.json
npm install

# Check TypeScript errors
npm run type-check
```

### 2. Performance Issues

#### Database Performance
```sql
-- Check slow queries
SELECT query, mean_time, calls, total_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Check index usage
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

#### Frontend Performance
```bash
# Analyze bundle size
npm run analyze

# Check Lighthouse scores
npm run lighthouse

# Profile React components
npm run profile
```

## Maintenance Schedule

### Daily Tasks
- [ ] Monitor active sessions and user activity
- [ ] Check error logs and resolve issues
- [ ] Verify backup completion

### Weekly Tasks
- [ ] Review performance metrics
- [ ] Update dependencies if needed
- [ ] Clean up old data
- [ ] Security audit

### Monthly Tasks
- [ ] Full system backup
- [ ] Performance optimization review
- [ ] Security updates
- [ ] Capacity planning

## Support & Resources

### Documentation
- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)

### Community
- [Next.js Discord](https://discord.gg/nextjs)
- [Supabase Discord](https://discord.supabase.com)
- [GitHub Issues](https://github.com/your-repo/issues)

### Professional Support
For enterprise support and custom development:
- Email: support@cozychat.com
- Documentation: https://docs.cozychat.com
- Status Page: https://status.cozychat.com

## Stale Session Fix Deployment

### Quick Deployment Steps

#### 1. Deploy Database Changes
```bash
# Apply the migration
supabase db push

# Or if using local development
supabase db reset
```

#### 2. Set Environment Variables
Add to your `.env.local` or production environment:
```env
# Required for cleanup API endpoint
ADMIN_API_KEY=your-secure-admin-key-here

# Existing variables (should already be set)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

#### 3. Test the Implementation
```bash
# Run the test script
node scripts/test-stale-session-fix.js
```

#### 4. Set Up Periodic Cleanup
```bash
# Set up cron job for automatic cleanup
./scripts/setup-cleanup-cron.sh
```

### What's Been Implemented

#### ✅ Enhanced Session Matching
- **Session Age Limits**: Only match with sessions created within 5 minutes
- **Activity Checks**: Only match with users active within 2 minutes
- **Interest Matching**: Maintains existing interest-based matching
- **Backward Compatibility**: 100% compatible with existing functionality

#### ✅ Performance Improvements
- **Optimized Indexes**: Faster session matching queries
- **Enhanced Cleanup**: Better session cleanup logic
- **Database Optimization**: Improved query performance

#### ✅ Monitoring & Maintenance
- **Admin API**: Manual cleanup endpoint at `/api/admin/cleanup-sessions`
- **Cron Setup**: Automated cleanup every 5 minutes
- **Test Script**: Comprehensive testing suite

### Manual Testing

#### Test Session Creation
```bash
# Test with curl
curl -X POST "http://localhost:3000/api/chat/create-session" \
  -H "Content-Type: application/json" \
  -d '{"interests": ["technology", "programming"]}'
```

#### Test Cleanup Function
```bash
# Manual cleanup (requires ADMIN_API_KEY)
curl -X POST "http://localhost:3000/api/admin/cleanup-sessions" \
  -H "x-api-key: your-admin-key"
```

### Monitoring

#### Database Health Check
```sql
-- Check active sessions
SELECT COUNT(*) as active_sessions 
FROM chat_sessions 
WHERE status = 'active';

-- Check waiting sessions
SELECT COUNT(*) as waiting_sessions 
FROM chat_sessions 
WHERE status = 'waiting';

-- Check recent activity
SELECT COUNT(*) as recent_messages 
FROM messages 
WHERE created_at > now() - INTERVAL '1 hour';
```

### Troubleshooting

#### Common Issues

**1. "No matches found" increase**
- **Cause**: Stricter filtering may reduce available matches
- **Solution**: Monitor for 24 hours, adjust timeouts if needed

**2. Cleanup API returns 401**
- **Cause**: Missing or incorrect ADMIN_API_KEY
- **Solution**: Verify environment variable is set correctly

**3. Cron job not running**
- **Cause**: Incorrect setup or permissions
- **Solution**: Check cron logs and verify script permissions

#### Debug Commands
```bash
# Check cron jobs
crontab -l

# Test cleanup manually
curl -X POST "http://localhost:3000/api/admin/cleanup-sessions" \
  -H "x-api-key: your-admin-key" \
  -v

# Check database state
psql your-database-url -c "SELECT COUNT(*) FROM chat_sessions WHERE status = 'waiting';"
```

This comprehensive deployment and setup guide ensures a smooth development and production experience for the Cozy Chat application.
