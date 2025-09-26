# Cozy Chat Database Schema Diagram

## 🏗️ Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                                COZY CHAT DATABASE                              │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────┐
│  anonymous_users    │ ◄─── Primary Entity
│  ─────────────────  │
│  id (PK)            │
│  session_id (UK)    │
│  interests[]        │
│  is_active          │
│  last_seen          │
│  created_at         │
│  updated_at         │
└─────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐
│   chat_sessions     │
│  ─────────────────  │
│  id (PK)            │
│  user1_id (FK) ─────┼───┐
│  user2_id (FK) ─────┼───┼───┐
│  status             │   │   │
│  started_at         │   │   │
│  ended_at           │   │   │
│  created_at         │   │   │
│  updated_at         │   │   │
└─────────────────────┘   │   │
           │               │   │
           │ 1:N           │   │
           ▼               │   │
┌─────────────────────┐    │   │
│     messages        │    │   │
│  ─────────────────  │    │   │
│  id (PK)            │    │   │
│  session_id (FK) ───┼────┘   │
│  sender_id (FK) ────┼────────┘
│  content            │
│  encrypted_content  │
│  message_type       │
│  is_flagged         │
│  created_at         │
│  updated_at         │
└─────────────────────┘
           │
           │ 1:N
           ▼
┌─────────────────────┐
│ message_reactions   │
│  ─────────────────  │
│  id (PK)            │
│  message_id (FK) ───┼───┐
│  user_id (FK) ──────┼───┼───┐
│  reaction           │   │   │
│  created_at         │   │   │
└─────────────────────┘   │   │
                          │   │
                          │   │
┌─────────────────────┐   │   │
│      reports        │   │   │
│  ─────────────────  │   │   │
│  id (PK)            │   │   │
│  reporter_id (FK) ──┼───┘   │
│  reported_user_id   │       │
│  session_id (FK) ───┼───────┘
│  reason             │
│  description        │
│  status             │
│  admin_notes        │
│  created_at         │
│  updated_at         │
└─────────────────────┘

┌─────────────────────┐
│   banned_users      │
│  ─────────────────  │
│  id (PK)            │
│  user_id (FK) ──────┼───┐
│  banned_by (FK) ────┼───┼───┐
│  reason             │   │   │
│  expires_at         │   │   │
│  created_at         │   │   │
└─────────────────────┘   │   │
                          │   │
┌─────────────────────┐   │   │
│    user_roles       │   │   │
│  ─────────────────  │   │   │
│  id (PK)            │   │   │
│  user_id (FK) ──────┼───┘   │
│  role               │       │
│  created_at         │       │
└─────────────────────┘       │
                              │
┌─────────────────────┐       │
│   system_stats      │       │
│  ─────────────────  │       │
│  id (PK)            │       │
│  active_users       │       │
│  total_sessions     │       │
│  total_messages     │       │
│  recorded_at        │       │
└─────────────────────┘       │
                              │
┌─────────────────────┐       │
│  interest_matches   │       │
│  ─────────────────  │       │
│  id (PK)            │       │
│  session_id (FK) ───┼───────┘
│  user1_interests[]  │
│  user2_interests[]  │
│  common_interests[] │
│  match_score        │
│  created_at         │
└─────────────────────┘
```

## 🔗 Relationship Summary

### Primary Relationships
1. **anonymous_users** → **chat_sessions** (1:N)
   - One user can have multiple sessions
   - Each session has exactly one user1, optionally one user2

2. **chat_sessions** → **messages** (1:N)
   - One session can have many messages
   - Each message belongs to exactly one session

3. **messages** → **message_reactions** (1:N)
   - One message can have many reactions
   - Each reaction belongs to exactly one message

4. **anonymous_users** → **reports** (1:N)
   - One user can make many reports
   - One user can be reported many times

### Secondary Relationships
- **anonymous_users** → **banned_users** (1:N)
- **anonymous_users** → **user_roles** (1:N)
- **chat_sessions** → **interest_matches** (1:1)

## 📊 Data Flow

```
User Session → anonymous_users → chat_sessions → messages → message_reactions
     ↓              ↓               ↓            ↓
  Reports ←─────── banned_users ←───┘            ↓
     ↓              ↓                           ↓
  user_roles    system_stats ←──────────────────┘
```

## 🎯 Key Design Patterns

### 1. Session-Based Architecture
- Users are identified by browser session_id
- No permanent user accounts
- Temporary data with automatic cleanup

### 2. Interest Matching
- Users specify interests as text arrays
- Matching algorithm finds common interests
- Fallback to random matching if no interests match

### 3. Real-time Communication
- Messages stored with encryption
- Reactions for user engagement
- Session status tracking (waiting/active/ended)

### 4. Moderation System
- User reporting mechanism
- Admin role management
- Banned users tracking
- Message flagging system

## 🔧 Technical Features

### Data Types
- **UUIDs**: Primary keys for all entities
- **Arrays**: Interest lists and common interests
- **Enums**: Status types (chat_status, message_type, report_status, user_role)
- **Timestamps**: Created/updated tracking with timezone support

### Constraints
- **Foreign Keys**: All relationships properly constrained
- **Unique Constraints**: Session IDs, user-role combinations
- **Check Constraints**: Reaction emoji validation
- **Default Values**: Timestamps, status defaults

### Indexes
- **Primary Keys**: All tables have UUID primary keys
- **Foreign Keys**: Indexed for join performance
- **Partial Indexes**: Active users, waiting sessions
- **GIN Indexes**: Array operations, full-text search
- **Composite Indexes**: Common query patterns

## 🛡️ Security Model

### Row Level Security (RLS)
- **Session-based isolation**: Users only see their own data
- **Role-based access**: Admins and service roles have elevated permissions
- **Context functions**: `set_session_context()` for RLS context
- **Security definer functions**: Controlled access to sensitive operations

### Access Patterns
1. **Anonymous Users**: Can only access their own session data
2. **Service Role**: Full access for system operations
3. **Admin Role**: Elevated permissions for moderation
4. **Context-based**: Uses `app.current_user_session_id` for isolation

---

**Note**: This schema supports a real-time anonymous chat application with interest-based matching, moderation capabilities, and comprehensive analytics.
