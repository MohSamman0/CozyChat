-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create custom types
CREATE TYPE chat_status AS ENUM ('waiting', 'active', 'ended');
CREATE TYPE message_type AS ENUM ('text', 'system');
CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
CREATE TYPE user_role AS ENUM ('admin', 'moderator');

-- Anonymous Users Table
CREATE TABLE anonymous_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT UNIQUE NOT NULL,
    interests TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    connected_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Sessions Table
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
    user2_id UUID REFERENCES anonymous_users(id) ON DELETE CASCADE,
    status chat_status DEFAULT 'waiting',
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages Table
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    encrypted_content TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    is_flagged BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Message Reactions Table
CREATE TABLE message_reactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
    reaction TEXT NOT NULL CHECK (reaction IN ('❤️', '😊', '👍', '😢', '😮', '😡')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Reports Table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
    reported_user_id UUID NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
    session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    description TEXT,
    status report_status DEFAULT 'pending',
    admin_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Banned Users Table
CREATE TABLE banned_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES anonymous_users(id) ON DELETE CASCADE,
    banned_by UUID NOT NULL,
    reason TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles Table (for admins)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    role user_role NOT NULL,
    assigned_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, role)
);

-- System Stats Table (for analytics)
CREATE TABLE system_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    active_users INTEGER NOT NULL DEFAULT 0,
    total_sessions INTEGER NOT NULL DEFAULT 0,
    total_messages INTEGER NOT NULL DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_anonymous_users_session_id ON anonymous_users(session_id);
CREATE INDEX idx_anonymous_users_active ON anonymous_users(is_active) WHERE is_active = true;
CREATE INDEX idx_anonymous_users_interests ON anonymous_users USING gin(interests);
CREATE INDEX idx_anonymous_users_last_seen ON anonymous_users(last_seen);

CREATE INDEX idx_chat_sessions_status ON chat_sessions(status);
CREATE INDEX idx_chat_sessions_user1 ON chat_sessions(user1_id);
CREATE INDEX idx_chat_sessions_user2 ON chat_sessions(user2_id) WHERE user2_id IS NOT NULL;
CREATE INDEX idx_chat_sessions_active ON chat_sessions(status, created_at) WHERE status IN ('waiting', 'active');

CREATE INDEX idx_messages_session ON messages(session_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_flagged ON messages(is_flagged) WHERE is_flagged = true;
CREATE INDEX idx_messages_content_search ON messages USING gin(to_tsvector('english', content));

CREATE INDEX idx_message_reactions_message ON message_reactions(message_id);
CREATE INDEX idx_message_reactions_user ON message_reactions(user_id);

CREATE INDEX idx_reports_status ON reports(status, created_at) WHERE status = 'pending';
CREATE INDEX idx_reports_session ON reports(session_id);

CREATE INDEX idx_banned_users_user ON banned_users(user_id);
CREATE INDEX idx_banned_users_expires ON banned_users(expires_at) WHERE expires_at IS NOT NULL;

CREATE INDEX idx_user_roles_user ON user_roles(user_id);
CREATE INDEX idx_system_stats_recorded ON system_stats(recorded_at);

-- Update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_anonymous_users_updated_at BEFORE UPDATE ON anonymous_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable real-time replication for tables that need real-time updates
ALTER TABLE chat_sessions REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE anonymous_users REPLICA IDENTITY FULL;
