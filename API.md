# CozyChat API Documentation 📡

Complete API reference for CozyChat's backend endpoints and real-time functionality.

## Overview

CozyChat uses a hybrid approach combining:
- **Next.js API Routes** for custom server logic
- **Supabase Client** for real-time data operations  
- **Supabase Real-time** for live chat functionality

## Base URLs

- **Development**: `http://localhost:3000`
- **Production**: `https://your-domain.com`

## Authentication

### Authentication Types

1. **Anonymous Users**: Temporary session-based authentication
2. **Admin Users**: Full authentication with role-based access control

### Headers

```typescript
// Anonymous requests
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <supabase_anon_key>"
}

// Admin requests  
{
  "Content-Type": "application/json",
  "Authorization": "Bearer <user_session_token>"
}
```

## API Endpoints

### System & Health

#### `GET /api/test-db`
Test database connectivity and system health.

**Response:**
```json
{
  "success": true,
  "message": "CozyChat database is fully connected! 🎉",
  "details": {
    "connection": "Working ✅",
    "tables": "Accessible ✅", 
    "functions": "Working ✅",
    "readyForChat": true
  }
}
```

**Status Codes:**
- `200` - System healthy
- `500` - Database connection failed

---

### User Management

#### `POST /api/auth/anonymous`
Create a new anonymous user session.

**Request Body:**
```json
{
  "nickname": "string (optional)",
  "interests": ["string", "array", "optional"]  
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "session_id": "uuid", 
    "nickname": "Anonymous_123",
    "interests": ["gaming", "music"],
    "created_at": "2024-01-01T00:00:00Z",
    "expires_at": "2024-01-01T02:00:00Z"
  }
}
```

#### `DELETE /api/auth/logout`
End anonymous user session and cleanup data.

**Headers:** `Authorization: Bearer <session_token>`

**Response:**
```json
{
  "success": true,
  "message": "Session ended successfully"
}
```

---

### Chat System

#### `POST /api/chat/find-match`
Find or create a chat session with another user.

**Headers:** `Authorization: Bearer <session_token>`

**Request Body:**
```json
{
  "interests": ["string", "array", "optional"],
  "exclude_users": ["uuid", "array", "optional"]
}
```

**Response:**
```json
{
  "success": true,
  "chat_session": {
    "id": "uuid",
    "status": "active",
    "participants": [
      {
        "user_id": "uuid",
        "nickname": "Anonymous_123",
        "joined_at": "2024-01-01T00:00:00Z"
      }
    ],
    "created_at": "2024-01-01T00:00:00Z",
    "match_quality": 0.85
  }
}
```

**Status Codes:**
- `200` - Match found
- `202` - Added to queue, waiting for match
- `429` - Rate limited

#### `POST /api/chat/send-message`
Send a message in an active chat session.

**Headers:** `Authorization: Bearer <session_token>`

**Request Body:**
```json
{
  "chat_session_id": "uuid",
  "content": "string",
  "type": "text" // "text" | "reaction"
}
```

**Response:**
```json
{
  "success": true,
  "message": {
    "id": "uuid",
    "chat_session_id": "uuid",
    "sender_id": "uuid",
    "content": "Hello! 👋",
    "type": "text",
    "created_at": "2024-01-01T00:00:00Z",
    "delivered": true
  }
}
```

#### `POST /api/chat/end-session`
End the current chat session.

**Headers:** `Authorization: Bearer <session_token>`

**Request Body:**
```json
{
  "chat_session_id": "uuid",
  "reason": "user_left" // "user_left" | "user_skipped" | "inactivity" | "violation"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Chat session ended",
  "session_summary": {
    "duration_minutes": 12,
    "message_count": 47,
    "ended_reason": "user_left"
  }
}
```

#### `POST /api/chat/typing`
Send typing indicator to other user.

**Headers:** `Authorization: Bearer <session_token>`

**Request Body:**
```json
{
  "chat_session_id": "uuid",
  "is_typing": true
}
```

**Response:**
```json
{
  "success": true,
  "delivered": true
}
```

---

### Moderation

#### `POST /api/moderation/report`
Report inappropriate behavior or content.

**Headers:** `Authorization: Bearer <session_token>`

**Request Body:**
```json
{
  "chat_session_id": "uuid",
  "reported_user_id": "uuid",
  "reason": "spam", // "spam" | "harassment" | "inappropriate" | "abuse" | "other"
  "description": "string (optional)",
  "message_ids": ["uuid", "array", "optional"]
}
```

**Response:**
```json
{
  "success": true,
  "report": {
    "id": "uuid",
    "status": "submitted",
    "ticket_number": "CR-2024-001234",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

---

### Admin APIs

#### `GET /api/admin/dashboard/stats`
Get real-time platform statistics.

**Headers:** `Authorization: Bearer <admin_session_token>`

**Response:**
```json
{
  "success": true,
  "stats": {
    "active_users": 1250,
    "active_chats": 625,
    "total_messages_today": 45000,
    "reports_pending": 3,
    "system_health": "healthy",
    "uptime_percentage": 99.9
  }
}
```

#### `GET /api/admin/users`
List users with filtering and pagination.

**Headers:** `Authorization: Bearer <admin_session_token>`

**Query Parameters:**
- `page` - Page number (default: 1)
- `limit` - Items per page (default: 20, max: 100)
- `status` - Filter by status: "active" | "banned" | "all"
- `search` - Search by nickname or ID

**Response:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid",
      "nickname": "Anonymous_123", 
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "last_active": "2024-01-01T01:30:00Z",
      "total_messages": 150,
      "reports_received": 0,
      "reports_made": 1
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1250,
    "pages": 63
  }
}
```

#### `POST /api/admin/moderation/review`
Review and act on moderation reports.

**Headers:** `Authorization: Bearer <admin_session_token>`

**Request Body:**
```json
{
  "report_id": "uuid",
  "action": "dismiss", // "dismiss" | "warn" | "ban" | "escalate"
  "admin_notes": "string (optional)",
  "ban_duration_hours": 24 // required if action is "ban"
}
```

**Response:**
```json
{
  "success": true,
  "action_taken": "ban",
  "affected_user": "uuid",
  "message": "User banned for 24 hours"
}
```

---

## Real-time Events (Supabase Realtime)

CozyChat uses Supabase Realtime for live functionality. Subscribe to these channels:

### Chat Messages Channel
**Channel**: `chat_session:{session_id}`

**Events:**
```typescript
// New message received
{
  event: 'INSERT',
  table: 'messages',
  payload: {
    id: 'uuid',
    chat_session_id: 'uuid',
    sender_id: 'uuid',
    content: 'Hello!',
    type: 'text',
    created_at: '2024-01-01T00:00:00Z'
  }
}

// User typing indicator
{
  event: 'UPDATE', 
  table: 'chat_sessions',
  payload: {
    id: 'uuid',
    typing_user_id: 'uuid',
    typing_expires_at: '2024-01-01T00:00:30Z'
  }
}

// Session ended
{
  event: 'UPDATE',
  table: 'chat_sessions', 
  payload: {
    id: 'uuid',
    status: 'ended',
    ended_at: '2024-01-01T00:30:00Z',
    ended_reason: 'user_left'
  }
}
```

### User Presence Channel
**Channel**: `presence:lobby`

**Events:**
```typescript
// User joined waiting queue
{
  event: 'presence', 
  payload: {
    user_id: 'uuid',
    status: 'waiting',
    interests: ['gaming', 'music'],
    joined_at: '2024-01-01T00:00:00Z'
  }
}

// User left queue/matched
{
  event: 'presence',
  payload: {
    user_id: 'uuid', 
    status: 'offline'
  }
}
```

---

## Error Handling

### Standard Error Response
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": {
      "field": "content",
      "issue": "Message cannot be empty"
    }
  },
  "timestamp": "2024-01-01T00:00:00Z"
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request data |
| `UNAUTHORIZED` | 401 | Invalid or missing authentication |
| `FORBIDDEN` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `RATE_LIMITED` | 429 | Too many requests |
| `SESSION_EXPIRED` | 401 | User session has expired |
| `CHAT_ENDED` | 410 | Chat session is no longer active |
| `USER_BANNED` | 403 | User is temporarily banned |
| `SYSTEM_ERROR` | 500 | Internal server error |

---

## Rate Limiting

### Limits per User Session

| Endpoint | Limit | Window |
|----------|-------|---------|
| `/api/chat/send-message` | 30 requests | 1 minute |
| `/api/chat/find-match` | 5 requests | 1 minute |
| `/api/moderation/report` | 3 requests | 10 minutes |
| `/api/auth/anonymous` | 10 requests | 1 hour |

### Headers
Rate limit information is returned in response headers:
```
X-RateLimit-Limit: 30
X-RateLimit-Remaining: 25  
X-RateLimit-Reset: 1704067200
```

---

## WebSocket Connection (Supabase Realtime)

### Connection Setup
```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, anonKey, {
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  }
})

// Subscribe to chat messages
const channel = supabase
  .channel(`chat_session:${sessionId}`)
  .on('postgres_changes', 
    { 
      event: 'INSERT', 
      schema: 'public', 
      table: 'messages',
      filter: `chat_session_id=eq.${sessionId}`
    }, 
    (payload) => {
      console.log('New message:', payload.new)
    }
  )
  .subscribe()
```

### Connection States
- `CONNECTING` - Establishing connection
- `OPEN` - Connected and ready
- `CLOSING` - Connection closing
- `CLOSED` - Connection closed

---

## Examples

### Complete Chat Flow

```typescript
// 1. Create anonymous user
const authResponse = await fetch('/api/auth/anonymous', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    nickname: 'ChatLover123',
    interests: ['movies', 'technology'] 
  })
})

const { user, token } = await authResponse.json()

// 2. Find chat match
const matchResponse = await fetch('/api/chat/find-match', {
  method: 'POST', 
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    interests: user.interests
  })
})

const { chat_session } = await matchResponse.json()

// 3. Subscribe to real-time messages
const channel = supabase
  .channel(`chat_session:${chat_session.id}`)
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public', 
    table: 'messages'
  }, handleNewMessage)
  .subscribe()

// 4. Send a message
await fetch('/api/chat/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json', 
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    chat_session_id: chat_session.id,
    content: 'Hello! How are you today?',
    type: 'text'
  })
})
```

---

## Security Considerations

### Data Protection
- All messages are encrypted before database storage
- Personal data is automatically deleted after session ends
- IP addresses are hashed for abuse detection, not stored in plain text

### Abuse Prevention  
- Rate limiting on all endpoints
- Real-time content moderation using AI
- User reporting system with admin review
- Automatic session termination for policy violations

### Authentication Security
- Session tokens expire after 2 hours of inactivity
- Anonymous user data is never linked to permanent identities
- Admin access uses role-based permissions with audit logging

---

Ready to build amazing chat experiences? Start with `/api/auth/anonymous` and explore the real-time capabilities! 🚀
