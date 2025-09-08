# Changelog

All notable changes to Cozy Chat will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.1] - 2025-09-08

### Fixed
- **Chat Session Management**: Fixed automatic session creation after chat ends - users now have proper control over when to start new chats
- **Session Cleanup**: Improved session cleanup logic to properly disconnect both users when one ends the chat
- **User Controls**: Enhanced "New Chat" and "Go Home" button functionality after chat ends
- **Instant Connection Issue**: Resolved issue where users would connect instantly due to old waiting sessions in database
- **React Infinite Loops**: Fixed "Maximum update depth exceeded" error caused by circular dependencies in `useRealtimeChat` hook
- **Database Function Errors**: Fixed missing database function errors in close-session API

### Improved
- **Real-time Updates**: Enhanced session polling and real-time session status updates
- **Error Handling**: Better error handling and user feedback for session management
- **User Status Tracking**: Improved user active/inactive state management
- **Code Quality**: Fixed TypeScript and ESLint warnings
- **Session Matching**: Optimized session creation and user matching algorithms

### Technical Changes
- Updated `src/app/chat/page.tsx` to prevent automatic session creation after ended sessions
- Enhanced `src/hooks/useRealtimeChat.ts` to handle session updates and cleanup properly
- Improved `src/pages/api/chat/close-session.ts` with better session cleanup logic
- Added proper session cleanup in "New Chat" functionality
- Fixed circular dependencies in React hooks
- Added comprehensive error handling and logging

## [0.6.0] - 2025-09-06

### Added
- Initial release of Cozy Chat
- Anonymous user system with interest-based matching
- End-to-end encryption for all messages
- Real-time messaging with Supabase Realtime
- Beautiful, responsive UI with dark/light theme support
- Session management and user matching algorithms
- Comprehensive documentation and setup guides

### Features
- Anonymous chat without registration
- Interest-based user matching
- Real-time message delivery
- Session persistence and recovery
- Mobile-first responsive design
- Theme switching (light/dark mode)
- Connection health monitoring
- Rate limiting and security measures
