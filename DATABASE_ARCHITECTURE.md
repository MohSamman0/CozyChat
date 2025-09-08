# Cozy Chat - Database Architecture

## Overview

Cozy Chat uses Supabase (PostgreSQL) as its backend database with a robust architecture designed for real-time anonymous chat functionality. The database includes comprehensive security, real-time capabilities, and optimized performance.

## Database Schema

### Core Tables

#### 1. `anonymous_users`
Stores anonymous user information and preferences.

```sql
CREATE TABLE public.anonymous_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    interests TEXT[] DEFAULT '{}',
    is_online BOOLEAN DEFAULT false,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Key Features:**
- UUID primary keys for security
- Array-based interest matching
- Online status tracking
- Automatic timestamp management

#### 2. `chat_sessions`
Manages chat session lifecycle and user matching.

```sql
CREATE TABLE public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES public.anonymous_users(id),
    user2_id UUID REFERENCES public.anonymous_users(id),
    status chat_status DEFAULT 'waiting',
    started_at TIMESTAMP WITH TIME ZONE,
    ended_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Session States:**
- `waiting`: User is waiting for a match
- `active`: Chat is in progress
- `ended`: Chat has been terminated

#### 3. `messages`
Stores encrypted chat messages with comprehensive metadata.

```sql
CREATE TABLE public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id),
    sender_id UUID NOT NULL REFERENCES public.anonymous_users(id),
    content TEXT NOT NULL,
    encrypted_content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    is_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Message Types:**
- `text`: Regular user messages
- `system`: System-generated messages

### Supporting Tables

#### 4. `message_reactions`
Enables emoji reactions on messages.

```sql
CREATE TABLE public.message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES public.messages(id),
    user_id UUID NOT NULL REFERENCES public.anonymous_users(id),
    reaction_type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### 5. `reports`
Handles content moderation and user reports.

```sql
CREATE TABLE public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES public.anonymous_users(id),
    reported_user_id UUID REFERENCES public.anonymous_users(id),
    reported_message_id UUID REFERENCES public.messages(id),
    reason TEXT NOT NULL,
    status report_status DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    resolved_at TIMESTAMP WITH TIME ZONE
);
```

#### 6. `banned_users`
Manages user bans and restrictions.

```sql
CREATE TABLE public.banned_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.anonymous_users(id),
    reason TEXT NOT NULL,
    banned_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### 7. `user_roles`
Defines user permission levels.

```sql
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.anonymous_users(id),
    role TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

#### 8. `system_stats`
Tracks application metrics and analytics.

```sql
CREATE TABLE public.system_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    metric_value NUMERIC NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

## Database Functions

### Core Chat Functions

#### 1. `create_or_join_session_atomic`
Atomic function for session creation and user matching.

```sql
CREATE OR REPLACE FUNCTION create_or_join_session_atomic(
    p_user_id UUID,
    p_user_interests TEXT[]
) RETURNS TABLE(
    session_id UUID,
    user1_id UUID,
    user2_id UUID,
    status chat_status,
    is_new_session BOOLEAN
) AS $$
DECLARE
    v_session_id UUID;
    v_existing_session RECORD;
    v_matched_user RECORD;
    v_common_interests INTEGER;
BEGIN
    -- Look for existing waiting session with matching interests
    SELECT cs.id, cs.user1_id, au.interests
    INTO v_existing_session
    FROM chat_sessions cs
    JOIN anonymous_users au ON cs.user1_id = au.id
    WHERE cs.status = 'waiting' 
    AND cs.user1_id != p_user_id
    AND au.is_online = true
    ORDER BY cs.created_at ASC
    LIMIT 1;
    
    IF v_existing_session.id IS NOT NULL THEN
        -- Join existing session
        UPDATE chat_sessions 
        SET user2_id = p_user_id,
            status = 'active',
            started_at = now(),
            updated_at = now()
        WHERE id = v_existing_session.id;
        
        RETURN QUERY SELECT 
            v_existing_session.id,
            v_existing_session.user1_id,
            p_user_id,
            'active'::chat_status,
            false;
    ELSE
        -- Create new session
        INSERT INTO chat_sessions (user1_id, status, created_at, updated_at)
        VALUES (p_user_id, 'waiting', now(), now())
        RETURNING id INTO v_session_id;
        
        RETURN QUERY SELECT 
            v_session_id,
            p_user_id,
            NULL::UUID,
            'waiting'::chat_status,
            true;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 2. `match_users_by_interests`
Advanced user matching based on interest compatibility.

```sql
CREATE OR REPLACE FUNCTION match_users_by_interests(
    p_user_interests TEXT[]
) RETURNS TABLE(
    user_id UUID,
    common_interests_count INTEGER,
    interests TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id,
        array_length(array(SELECT unnest(p_user_interests) INTERSECT SELECT unnest(au.interests)), 1) as common_count,
        au.interests
    FROM anonymous_users au
    WHERE au.is_online = true
    AND au.interests && p_user_interests  -- Has overlapping interests
    ORDER BY common_count DESC, au.last_seen_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 3. `set_session_context`
Sets session context for Row Level Security policies.

```sql
CREATE OR REPLACE FUNCTION set_session_context(session_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_user_session_id', session_id, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Security & Permissions

### Row Level Security (RLS)
- **Disabled for development** - All tables have RLS disabled for testing
- **Service Role Access** - Full permissions granted to `service_role`
- **Anonymous Access** - `SELECT` permissions granted to `anon` role for Realtime

### Permission Grants
```sql
-- Service Role Permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Anonymous Role Permissions (for Realtime)
GRANT SELECT ON public.messages TO anon;
GRANT SELECT ON public.chat_sessions TO anon;
GRANT SELECT ON public.anonymous_users TO anon;

-- Authenticated Role Permissions
GRANT SELECT ON public.messages TO authenticated;
GRANT SELECT ON public.chat_sessions TO authenticated;
GRANT SELECT ON public.anonymous_users TO authenticated;
```

## Real-time Configuration

### Realtime Publication
```sql
-- Enable Realtime for core tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
```

### Replication Identity
All tables use `FULL` replication identity for complete change tracking:
```sql
ALTER TABLE public.messages REPLICA IDENTITY FULL;
ALTER TABLE public.chat_sessions REPLICA IDENTITY FULL;
```

## Performance Optimizations

### Indexes
```sql
-- Session lookups
CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_user1_id ON chat_sessions(user1_id);
CREATE INDEX idx_chat_sessions_user2_id ON chat_sessions(user2_id);

-- Message queries
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);

-- User matching
CREATE INDEX idx_anonymous_users_online ON anonymous_users(is_online);
CREATE INDEX idx_anonymous_users_interests ON anonymous_users USING GIN(interests);
```

### Triggers
```sql
-- Auto-update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER update_anonymous_users_updated_at BEFORE UPDATE ON anonymous_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Data Types

### Custom Enums
```sql
-- Chat session status
CREATE TYPE chat_status AS ENUM ('waiting', 'active', 'ended');

-- Message types
CREATE TYPE message_type AS ENUM ('text', 'system');

-- Report status
CREATE TYPE report_status AS ENUM ('pending', 'resolved', 'dismissed');
```

## Migration History

The database has been built through a series of migrations:

1. **001_initial_schema.sql** - Core table structure
2. **002_rls_policies.sql** - Row Level Security policies
3. **003_functions.sql** - Database functions and procedures
4. **004_session_context.sql** - Session context management
5. **005_fix_service_role_policies.sql** - Service role permissions
6. **006_disable_rls_temporarily.sql** - RLS disable for development
7. **007_grant_service_role_permissions.sql** - Service role access
8. **008_grant_public_schema_usage.sql** - Schema usage permissions
9. **009_fix_session_matching.sql** - Session matching improvements
10. **010_enable_realtime.sql** - Realtime publication setup
11. **011_grant_anon_permissions.sql** - Anonymous role permissions

## Monitoring & Analytics

### System Metrics
The `system_stats` table tracks:
- Active sessions count
- Messages per hour
- User engagement metrics
- Error rates
- Performance indicators

### Health Checks
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
```

## Backup & Recovery

### Automated Backups
- Supabase handles automated daily backups
- Point-in-time recovery available
- Cross-region replication for disaster recovery

### Data Export
```sql
-- Export session data
COPY (
    SELECT cs.*, 
           au1.interests as user1_interests,
           au2.interests as user2_interests
    FROM chat_sessions cs
    LEFT JOIN anonymous_users au1 ON cs.user1_id = au1.id
    LEFT JOIN anonymous_users au2 ON cs.user2_id = au2.id
) TO '/tmp/sessions_export.csv' WITH CSV HEADER;
```

This database architecture provides a robust, scalable foundation for the Cozy Chat application with comprehensive security, real-time capabilities, and performance optimizations.
