# Stale Session Fix - Deployment Guide

## 🚀 Quick Deployment Steps

### 1. Deploy Database Changes

```bash
# Apply the migration
supabase db push

# Or if using local development
supabase db reset
```

### 2. Set Environment Variables

Add to your `.env.local` or production environment:

```env
# Required for cleanup API endpoint
ADMIN_API_KEY=your-secure-admin-key-here

# Existing variables (should already be set)
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Test the Implementation

```bash
# Run the test script
node scripts/test-stale-session-fix.js
```

### 4. Set Up Periodic Cleanup

```bash
# Set up cron job for automatic cleanup
./scripts/setup-cleanup-cron.sh
```

## 📋 What's Been Implemented

### ✅ Phase 1: Enhanced Session Matching
- **Session Age Limits**: Only match with sessions created within 5 minutes
- **Activity Checks**: Only match with users active within 2 minutes
- **Interest Matching**: Maintains existing interest-based matching
- **Backward Compatibility**: 100% compatible with existing functionality

### ✅ Phase 2: Performance Improvements
- **Optimized Indexes**: Faster session matching queries
- **Enhanced Cleanup**: Better session cleanup logic
- **Database Optimization**: Improved query performance

### ✅ Phase 3: Monitoring & Maintenance
- **Admin API**: Manual cleanup endpoint at `/api/admin/cleanup-sessions`
- **Cron Setup**: Automated cleanup every 5 minutes
- **Test Script**: Comprehensive testing suite

## 🔧 Manual Testing

### Test Session Creation
```bash
# Test with curl
curl -X POST "http://localhost:3000/api/chat/create-session" \
  -H "Content-Type: application/json" \
  -d '{"interests": ["technology", "programming"]}'
```

### Test Cleanup Function
```bash
# Manual cleanup (requires ADMIN_API_KEY)
curl -X POST "http://localhost:3000/api/admin/cleanup-sessions" \
  -H "x-api-key: your-admin-key"
```

## 📊 Monitoring

### Database Health Check
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

### Performance Monitoring
```sql
-- Check session creation performance
EXPLAIN ANALYZE 
SELECT cs.id, cs.user1_id
FROM chat_sessions cs
JOIN anonymous_users au ON cs.user1_id = au.id
WHERE cs.status = 'waiting' 
AND cs.user2_id IS NULL
AND au.is_active = true
AND au.last_seen > NOW() - INTERVAL '2 minutes'
AND cs.created_at > NOW() - INTERVAL '5 minutes'
ORDER BY cs.created_at ASC
LIMIT 1;
```

## 🛡️ Safety Measures

### Rollback Plan
If issues occur, you can quickly rollback by:

1. **Revert the migration**:
   ```bash
   supabase db reset --db-url your-database-url
   ```

2. **Or manually revert the function**:
   ```sql
   -- Restore previous function (copy from migration 014)
   CREATE OR REPLACE FUNCTION create_or_join_session_atomic(...)
   -- [Previous function code]
   ```

### Monitoring Checklist
- [ ] Session creation success rate > 95%
- [ ] Average wait time < 30 seconds
- [ ] No increase in "no match found" scenarios
- [ ] Database performance remains stable
- [ ] No errors in application logs

## 🎯 Expected Results

### Before Fix
- Users could connect to sessions from hours ago
- Poor user experience with abandoned matches
- Database accumulating old sessions
- Confusion about session status

### After Fix
- ✅ Users only connect to recent, active sessions (within 5 minutes)
- ✅ Better user experience with responsive matches
- ✅ Cleaner database with automatic cleanup
- ✅ Clear session status and expectations
- ✅ Improved performance with optimized indexes

## 🔍 Troubleshooting

### Common Issues

#### 1. "No matches found" increase
**Cause**: Stricter filtering may reduce available matches
**Solution**: Monitor for 24 hours, adjust timeouts if needed

#### 2. Cleanup API returns 401
**Cause**: Missing or incorrect ADMIN_API_KEY
**Solution**: Verify environment variable is set correctly

#### 3. Cron job not running
**Cause**: Incorrect setup or permissions
**Solution**: Check cron logs and verify script permissions

### Debug Commands
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

## 📈 Success Metrics

Track these metrics to measure the success of the fix:

1. **Session Success Rate**: % of users who successfully connect
2. **Average Wait Time**: Time from joining to finding a match
3. **Abandoned Sessions**: Sessions where one user leaves quickly
4. **Database Size**: Growth rate of old sessions
5. **User Satisfaction**: Feedback on connection quality

## 🎉 Deployment Complete!

The stale session fix is now deployed and should provide:
- Better user experience with faster, more reliable matches
- Cleaner database with automatic cleanup
- Improved performance with optimized queries
- Zero breaking changes to existing functionality

Monitor the system for 24-48 hours to ensure everything is working correctly, then enjoy the improved user experience!
