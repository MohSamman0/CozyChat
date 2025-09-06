# CozyChat Production Deployment Guide 🚀

Complete guide for deploying CozyChat to production with Vercel and Supabase.

## Overview

CozyChat is designed for seamless production deployment using:
- **Vercel** - Frontend hosting and serverless functions
- **Supabase** - PostgreSQL database with real-time capabilities  
- **GitHub** - Version control and CI/CD integration
- **Custom Domain** - Professional branding and SSL

## Prerequisites

### Required Accounts
- [GitHub Account](https://github.com) - Code repository and CI/CD
- [Vercel Account](https://vercel.com) - Frontend deployment 
- [Supabase Account](https://supabase.com) - Database and backend services
- **Domain Provider** - Custom domain (optional but recommended)

### Required Software
- Node.js 18+ (for local testing)
- Git (for version control)
- Supabase CLI (for database management)

## Step-by-Step Deployment

### 1. Repository Setup

**Push Code to GitHub:**
```bash
# Initialize git repository (if not already done)
git init
git add .
git commit -m "Initial CozyChat implementation"

# Add GitHub remote and push
git remote add origin https://github.com/yourusername/cozy-chat.git
git branch -M main
git push -u origin main
```

**Create Production Branch:**
```bash
# Create and switch to production branch
git checkout -b production
git push -u origin production
```

### 2. Supabase Production Setup

**Create Production Project:**

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"  
3. Configure production settings:
   - **Name**: CozyChat Production
   - **Database Password**: Use strong password (save securely!)
   - **Region**: Choose region closest to your users
   - **Plan**: Pro recommended for production features
4. Wait for project creation (2-3 minutes)

**Configure Production Database:**

1. Get your production credentials:
   - Go to Project Settings → API
   - Copy **Project URL** and **API Keys**
   - Save **Database Password** from creation

2. Update database settings:
   - Go to Project Settings → Database
   - Configure connection pooling for production load
   - Enable Point-in-Time Recovery (Pro plan)
   - Set up daily backups

**Deploy Database Schema:**
```bash
# Link to production project
supabase link --project-ref your_production_project_id

# Push database migrations to production
supabase db push

# Verify deployment
supabase db diff
```

**Configure Production Security:**

1. **API Settings** (Settings → API):
   - Enable RLS on all tables ✅
   - Configure rate limiting
   - Set CORS origins to your domain

2. **Authentication** (Authentication → Settings):
   - Disable email signups (anonymous-only platform)  
   - Configure admin email domains
   - Set session timeout to 2 hours
   - Enable captcha protection

3. **Database Settings**:
   - Enable connection pooling
   - Set max connections (100-200 for Pro plan)
   - Configure statement timeout (30s)

### 3. Environment Variables Setup

**Create Production Environment Files:**

Create `.env.production`:
```bash
# Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
NEXT_PUBLIC_APP_URL=https://your-domain.com
ENCRYPTION_KEY=your_production_32_character_encryption_key
ADMIN_EMAIL_DOMAINS=yourdomain.com,admin.com
CONTENT_MODERATION_API_KEY=your_moderation_service_key
RATE_LIMIT_REQUESTS=1000
RATE_LIMIT_WINDOW_MS=60000
```

**Security Checklist:**
- ✅ Use different encryption keys for production
- ✅ Rotate API keys regularly  
- ✅ Never commit production credentials to git
- ✅ Use strong, unique passwords
- ✅ Enable two-factor authentication on all accounts

### 4. Vercel Deployment

**Connect Repository:**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import from GitHub:
   - Select your CozyChat repository
   - Choose `production` branch for production deployments
   - Choose `main` branch for staging deployments

**Configure Build Settings:**

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

**Environment Variables in Vercel:**

1. Go to Project Settings → Environment Variables
2. Add all production environment variables:
   - Set environment: **Production**
   - Add each variable from `.env.production`
   - Mark sensitive variables as "Sensitive"

**Production Environment Variables:**
```
NODE_ENV=production
NEXT_PUBLIC_SUPABASE_URL=https://your-production-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (Sensitive)
NEXT_PUBLIC_APP_URL=https://your-domain.com
ENCRYPTION_KEY=your_32_char_key (Sensitive)
ADMIN_EMAIL_DOMAINS=yourdomain.com
CONTENT_MODERATION_API_KEY=your_key (Sensitive)
```

**Staging Environment Setup:**
```
NODE_ENV=staging
NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=staging_anon_key
NEXT_PUBLIC_APP_URL=https://your-staging-deployment.vercel.app
```

**Deploy:**

1. Click "Deploy" in Vercel dashboard
2. Monitor build progress
3. Test deployment at `https://your-project.vercel.app`

### 5. Custom Domain Setup

**Add Custom Domain:**

1. In Vercel project settings, go to Domains
2. Add your custom domain (e.g., `cozychat.com`)
3. Configure DNS settings at your domain provider:

```
Type: CNAME
Name: @ (or www)
Value: cname.vercel-dns.com
```

**SSL Certificate:**
- Vercel automatically provisions SSL certificates
- Certificates auto-renew
- HTTPS redirects are automatic

**Domain Configuration:**
```
Production: https://cozychat.com
Staging: https://staging-cozychat.vercel.app
Development: http://localhost:3000
```

### 6. CI/CD Pipeline Setup

**Automatic Deployments:**

Vercel automatically deploys:
- `production` branch → Production domain
- `main` branch → Staging preview
- Pull requests → Preview deployments

**GitHub Actions (Optional Enhanced CI/CD):**

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [production]
  pull_request:
    branches: [production]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run type checking
        run: npm run type-check
      
      - name: Run linting  
        run: npm run lint
      
      - name: Run tests
        run: npm test
      
      - name: Build application
        run: npm run build

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/production'
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: ./
```

### 7. Production Monitoring

**Set Up Error Tracking:**

Install Sentry or similar:
```bash
npm install @sentry/nextjs
```

Configure in `next.config.js`:
```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const nextConfig = {
  // Your existing config
  sentry: {
    hideSourceMaps: true,
  },
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: 'your-org',
  project: 'cozy-chat',
});
```

**Performance Monitoring:**

1. **Vercel Analytics**: Enable in project settings
2. **Core Web Vitals**: Monitor via Vercel dashboard
3. **Real User Monitoring**: Track performance metrics
4. **Database Performance**: Monitor via Supabase dashboard

**Alerting Setup:**
```javascript
// Add to your API routes for critical alerts
if (errorRate > 0.1) { // 10% error rate threshold
  await sendSlackAlert('High error rate detected in CozyChat');
}

if (responseTime > 2000) { // 2 second response time threshold
  await sendEmailAlert('CozyChat performance degraded');
}
```

### 8. Security Configuration

**Content Security Policy (CSP):**

Add to `next.config.js`:
```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: `
      default-src 'self';
      script-src 'self' 'unsafe-eval' 'unsafe-inline' *.supabase.co;
      style-src 'self' 'unsafe-inline';
      img-src 'self' blob: data: https:;
      font-src 'self';
      connect-src 'self' *.supabase.co wss://*.supabase.co;
      frame-ancestors 'none';
    `.replace(/\s{2,}/g, ' ').trim()
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};
```

**Rate Limiting:**

Configure in Vercel (Enterprise) or use middleware:
```javascript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Implement rate limiting logic
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0] ?? 'unknown';
  
  // Check rate limit for IP
  if (isRateLimited(ip)) {
    return new Response('Too Many Requests', { status: 429 });
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
```

**Database Security:**

1. **Row Level Security**: Enabled and tested ✅
2. **Connection Security**: SSL enforced ✅  
3. **API Key Rotation**: Scheduled every 90 days
4. **Admin Access**: Limited to specific email domains
5. **Backup Encryption**: Enabled in Supabase Pro ✅

### 9. Performance Optimization

**Next.js Production Optimizations:**

```javascript
// next.config.js
module.exports = {
  // Enable experimental features for performance
  experimental: {
    optimizePackageImports: ['@supabase/supabase-js', 'framer-motion'],
  },
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    minimumCacheTTL: 60,
  },
  
  // Compression and caching
  compress: true,
  
  // Bundle analysis
  ...(process.env.ANALYZE === 'true' && {
    webpack: (config) => {
      config.plugins.push(new BundleAnalyzerPlugin());
      return config;
    },
  }),
};
```

**Database Query Optimization:**

1. **Connection Pooling**: Configured in Supabase
2. **Query Optimization**: Use EXPLAIN ANALYZE for slow queries
3. **Index Monitoring**: Regular index usage analysis
4. **Connection Limits**: Proper connection pool sizing

**CDN and Caching:**

1. **Static Assets**: Automatically cached by Vercel CDN
2. **API Responses**: Cache static data with appropriate TTL
3. **Database Queries**: Use React Query for client-side caching
4. **Edge Functions**: Deploy time-sensitive functions to edge

### 10. Testing Production

**Pre-deployment Testing:**

```bash
# Build and test locally
npm run build
npm start

# Run full test suite
npm test
npm run test:e2e

# Performance testing
npm run lighthouse

# Security scanning
npm audit
npm run security-scan
```

**Production Smoke Tests:**

```javascript
// tests/production.test.js
describe('Production Health Checks', () => {
  test('Homepage loads correctly', async () => {
    const response = await fetch('https://cozychat.com');
    expect(response.status).toBe(200);
  });

  test('Database connection works', async () => {
    const response = await fetch('https://cozychat.com/api/test-db');
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('Real-time connection establishes', async () => {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const channel = supabase.channel('test');
    await channel.subscribe();
    expect(channel.state).toBe('SUBSCRIBED');
  });
});
```

## Post-Deployment Checklist

### ✅ Deployment Verification

- [ ] Homepage loads correctly
- [ ] Database connection working
- [ ] Real-time messaging functional
- [ ] API endpoints responding
- [ ] SSL certificate valid
- [ ] Custom domain pointing correctly
- [ ] All environment variables set
- [ ] Error tracking active
- [ ] Performance monitoring enabled

### ✅ Security Verification

- [ ] RLS policies enforced
- [ ] Admin access restricted
- [ ] API keys secured
- [ ] Rate limiting active  
- [ ] HTTPS redirects working
- [ ] CSP headers configured
- [ ] No sensitive data exposed in client
- [ ] Encryption keys rotated for production

### ✅ Performance Verification

- [ ] Page load time < 2s
- [ ] Core Web Vitals pass
- [ ] Database queries optimized
- [ ] CDN caching active
- [ ] Image optimization enabled
- [ ] Bundle size optimized
- [ ] Real-time latency < 100ms

### ✅ Monitoring Setup

- [ ] Error tracking configured
- [ ] Performance monitoring active
- [ ] Database metrics monitored
- [ ] Uptime monitoring enabled
- [ ] Alert thresholds configured
- [ ] Backup verification scheduled
- [ ] Log aggregation working

## Maintenance and Updates

### Regular Maintenance Tasks

**Weekly:**
- Monitor error rates and performance metrics
- Review user reports and moderation queue
- Check database performance and query patterns
- Verify backup integrity

**Monthly:**
- Update dependencies and security patches
- Rotate API keys and encryption keys
- Review and optimize database queries
- Analyze user engagement metrics
- Security audit and vulnerability scan

**Quarterly:**
- Full security penetration testing
- Performance optimization review
- Infrastructure cost analysis
- Disaster recovery testing
- Feature usage analysis and planning

### Update Deployment Process

**Development Updates:**
```bash
# 1. Create feature branch
git checkout -b feature/new-feature
git commit -m "Add new feature"
git push origin feature/new-feature

# 2. Create pull request to main (staging)
# 3. Test in staging environment
# 4. Merge to main, then merge main to production

# 5. Deploy to production
git checkout production
git merge main
git push origin production
```

**Hot Fixes:**
```bash
# Emergency fixes bypass normal flow
git checkout production
git checkout -b hotfix/critical-fix
# Make minimal fix
git commit -m "Fix critical issue"
git push origin hotfix/critical-fix

# Merge directly to production after testing
git checkout production
git merge hotfix/critical-fix
git push origin production
```

### Scaling Considerations

**User Growth Scaling:**
- **< 1,000 concurrent users**: Current setup sufficient
- **1,000-10,000 users**: Upgrade Supabase plan, enable edge functions
- **10,000+ users**: Consider database read replicas and additional CDN
- **100,000+ users**: Implement microservices architecture

**Database Scaling:**
```sql
-- Monitor key metrics
SELECT 
    schemaname,
    tablename,
    n_tup_ins + n_tup_upd + n_tup_del as total_writes,
    n_tup_ins as inserts,
    seq_scan,
    idx_scan
FROM pg_stat_user_tables 
ORDER BY total_writes DESC;

-- Optimize based on usage patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_messages_recent 
ON messages(created_at DESC) 
WHERE created_at > NOW() - INTERVAL '24 hours';
```

## Troubleshooting Production Issues

### Common Issues and Solutions

**1. Database Connection Timeouts**
```bash
# Check connection pool status in Supabase dashboard
# Increase connection pool size
# Optimize long-running queries
# Implement connection retry logic
```

**2. Real-time Connection Issues**
```javascript
// Add connection monitoring and reconnection
const channel = supabase.channel('chat')
  .on('presence', { event: 'sync' }, () => {
    console.log('Online users:', channel.presenceState());
  })
  .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, 
    (payload) => handleMessage(payload)
  )
  .subscribe((status) => {
    if (status === 'CLOSED') {
      // Implement reconnection logic
      setTimeout(() => channel.subscribe(), 1000);
    }
  });
```

**3. High Error Rates**
```bash
# Check Vercel function logs
vercel logs your-deployment-url

# Check Supabase logs
# Monitor API response times
# Review error tracking dashboard
```

**4. Performance Degradation**
```javascript
// Add performance monitoring
const startTime = Date.now();
const result = await supabase.from('messages').select('*');
const duration = Date.now() - startTime;

if (duration > 1000) {
  console.warn(`Slow query detected: ${duration}ms`);
  // Send alert to monitoring system
}
```

### Emergency Procedures

**Database Emergency:**
1. Check Supabase dashboard for outages
2. Enable maintenance mode if needed
3. Switch to backup database (if configured)
4. Contact Supabase support for critical issues

**Application Emergency:**
1. Monitor Vercel deployment status
2. Rollback to previous deployment if needed:
   ```bash
   vercel rollback your-deployment-url
   ```
3. Enable maintenance page
4. Fix issue and redeploy

**Security Incident:**
1. Immediately rotate all API keys
2. Review access logs for suspicious activity
3. Enable additional monitoring
4. Notify users if data potentially compromised

## Cost Optimization

### Supabase Costs
- **Database**: $25/month (Pro plan)
- **Bandwidth**: $0.09/GB
- **Storage**: $0.125/GB/month
- **Realtime**: Included in Pro plan

### Vercel Costs
- **Pro Plan**: $20/month per user
- **Bandwidth**: 100GB/month included
- **Edge Functions**: 500GB-hours/month included
- **Additional usage**: Pay-as-you-go

### Cost Monitoring
```sql
-- Monitor database storage usage
SELECT 
    pg_size_pretty(pg_database_size('postgres')) as db_size,
    pg_size_pretty(pg_total_relation_size('messages')) as messages_size,
    COUNT(*) as total_messages
FROM messages;

-- Track daily message volume for cost projection
SELECT 
    DATE(created_at) as date,
    COUNT(*) as daily_messages,
    COUNT(DISTINCT sender_id) as unique_users
FROM messages 
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

---

## Quick Reference Commands

**Deployment Commands:**
```bash
# Build and deploy
npm run build
vercel --prod

# Database operations
supabase link --project-ref prod-id
supabase db push
supabase db diff

# Monitoring
vercel logs
npm run analyze
```

**Emergency Commands:**
```bash
# Rollback deployment
vercel rollback

# Switch to maintenance mode  
vercel env add MAINTENANCE_MODE true

# Rotate API keys (in Supabase dashboard)
# Update environment variables (in Vercel dashboard)
```

Your CozyChat is now ready for production! 🎉 Monitor performance, user feedback, and scale as needed. The architecture supports growth from hundreds to thousands of concurrent users with minimal changes.

For ongoing support, refer to:
- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs) 
- [Next.js Production Documentation](https://nextjs.org/docs/deployment)

Happy chatting! 💬
