# Cozy Chat Database Documentation

This directory contains comprehensive SQL scripts to document and analyze your Cozy Chat database structure. These scripts are designed to be run one by one in the Supabase SQL Editor to give you a complete understanding of your database.

## 📋 Quick Start

**🚨 CRITICAL**: Your database has Row Level Security (RLS) disabled on all tables. This is a security vulnerability that needs immediate attention.

- **Quick Fix**: See [QUICK_ACTION_PLAN.md](./QUICK_ACTION_PLAN.md)
- **Full Analysis**: See [DATABASE_ANALYSIS_REPORT.md](./DATABASE_ANALYSIS_REPORT.md)
- **Schema Overview**: See [DATABASE_SCHEMA_DIAGRAM.md](./DATABASE_SCHEMA_DIAGRAM.md)

## 📊 Analysis Results

Based on the execution of the diagnostic scripts, here's what we found:

### ✅ What's Working Well
- **Database Structure**: Well-designed with proper relationships
- **Performance**: Good indexing strategy (25+ indexes)
- **Functions**: Comprehensive business logic (11 custom functions)
- **Data Integrity**: Proper constraints and foreign keys

### ⚠️ Critical Issues
- **RLS Disabled**: All tables have Row Level Security disabled
- **Security Risk**: Any authenticated user can access all data
- **Missing Policies**: `interest_matches` table has no RLS policies

### 📈 Database Summary
- **Tables**: 9 core tables
- **Indexes**: 25+ performance indexes
- **Functions**: 11 custom business logic functions
- **RLS Policies**: 27 policies (currently disabled)
- **Foreign Keys**: 11 relationship constraints

## 📋 Script Overview

### 1. `01_database_schema_overview.sql`
**Purpose**: High-level overview of your database structure
- Extensions and custom types
- Table relationships and foreign keys
- Table sizes and row counts
- Database version information

**Run this first** to get a general understanding of your database.

### 2. `02_table_structures.sql`
**Purpose**: Detailed table structure analysis
- Column definitions for all tables
- Data types, constraints, and defaults
- Primary keys and unique constraints
- Foreign key relationships with cascade rules

**Use this** to understand the exact structure of each table.

### 3. `03_indexes_and_performance.sql`
**Purpose**: Database performance and indexing analysis
- All indexes and their definitions
- Index usage statistics
- Performance metrics and recommendations
- Missing index suggestions

**Use this** to optimize database performance and identify bottlenecks.

### 4. `04_functions_and_procedures.sql`
**Purpose**: Custom functions and business logic documentation
- All custom functions with parameters
- Function dependencies and usage
- Trigger functions
- Security definer functions

**Use this** to understand the business logic implemented in your database.

### 5. `05_rls_policies_and_security.sql`
**Purpose**: Row Level Security and security model analysis
- RLS status for all tables
- All security policies
- Policy coverage analysis
- Security recommendations

**Use this** to understand and audit your security model.

### 6. `06_permissions_and_grants.sql`
**Purpose**: Database permissions and role management
- Role configurations
- Table and function permissions
- Permission gaps analysis
- Realtime permissions

**Use this** to understand access control and identify permission issues.

### 7. `07_data_analysis_queries.sql`
**Purpose**: Business intelligence and usage analytics
- User activity patterns
- Chat session statistics
- Interest matching effectiveness
- Real-time monitoring queries

**Use this** to analyze user behavior and application performance.

## 🚀 How to Use These Scripts

### Step 1: Access Supabase SQL Editor
1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Create a new query

### Step 2: Run Scripts Sequentially
1. Start with `01_database_schema_overview.sql`
2. Run each script in order (01 → 02 → 03 → etc.)
3. Review the results for each script
4. Take notes on any important findings

### Step 3: Analyze Results
- **Green results**: Everything looks good
- **Yellow results**: Worth investigating
- **Red results**: Need attention

## 📊 Key Database Tables

### Core Tables
- **`anonymous_users`**: Stores user sessions and interests
- **`chat_sessions`**: Manages chat room connections
- **`messages`**: Stores all chat messages
- **`message_reactions`**: Handles emoji reactions

### Management Tables
- **`reports`**: User reporting system
- **`banned_users`**: User moderation
- **`user_roles`**: Admin role management
- **`system_stats`**: Analytics data

### Optional Tables
- **`interest_matches`**: Interest matching analytics (if enabled)

## 🔧 Key Functions

### Session Management
- `create_or_join_session_atomic()`: Main matching algorithm
- `end_chat_session()`: Session termination
- `cleanup_old_sessions()`: Maintenance function

### User Management
- `match_users_by_interests()`: Interest-based matching
- `report_user()`: User reporting
- `get_active_users_count()`: Activity monitoring

### Security
- `set_session_context()`: RLS context setting
- `is_admin()`: Admin role checking

## 🛡️ Security Model

### Row Level Security (RLS)
- **Enabled on all tables** for data isolation
- **Session-based access control** using `app.current_user_session_id`
- **Role-based permissions** for admins and service roles

### Key Security Features
- Anonymous users can only access their own data
- Service role has full access for system operations
- Admin role has elevated permissions for moderation
- All functions use SECURITY DEFINER for controlled access

## 📈 Performance Considerations

### Indexes
- **GIN indexes** for array operations (interests)
- **Partial indexes** for active users and waiting sessions
- **Composite indexes** for common query patterns

### Optimization
- **Interest matching** uses array intersection
- **Session cleanup** runs automatically
- **Real-time updates** enabled for active tables

## 🔍 Monitoring Queries

### Real-time Monitoring
```sql
-- Current active sessions
SELECT COUNT(*) FROM chat_sessions WHERE status = 'active';

-- Users waiting for matches
SELECT COUNT(*) FROM chat_sessions WHERE status = 'waiting' AND user2_id IS NULL;

-- Recent activity
SELECT COUNT(*) FROM chat_sessions WHERE created_at >= NOW() - INTERVAL '5 minutes';
```

### Daily Analytics
```sql
-- Daily session statistics
SELECT DATE(created_at), COUNT(*) as sessions
FROM chat_sessions 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY DATE(created_at) DESC;
```

## 🚨 Troubleshooting

### Common Issues
1. **RLS blocking queries**: Check if `set_session_context()` is called
2. **Permission denied**: Verify role permissions in script 06
3. **Slow queries**: Check index usage in script 03
4. **Missing data**: Verify RLS policies in script 05

### Performance Issues
1. Run script 03 to identify slow queries
2. Check for missing indexes
3. Review table statistics and vacuum status
4. Monitor function execution times

## 📝 Maintenance Tasks

### Daily
- Monitor active sessions and user counts
- Check for stuck sessions
- Review error logs

### Weekly
- Run cleanup functions
- Review performance metrics
- Check for permission issues

### Monthly
- Analyze usage patterns
- Review and update RLS policies
- Optimize indexes based on usage

## 🔄 Migration History

Your database has evolved through 15 migrations:
1. **001-004**: Initial schema and core functions
2. **005-008**: RLS and permission fixes
3. **009-012**: Session matching improvements
4. **013-015**: Interest matching and stale session fixes

## 📞 Support

If you encounter issues:
1. Run the relevant diagnostic script
2. Check the troubleshooting section
3. Review the migration history
4. Consult the Supabase documentation

---

## 📚 Additional Documentation

### Analysis Reports
- **[DATABASE_ANALYSIS_REPORT.md](./DATABASE_ANALYSIS_REPORT.md)** - Comprehensive analysis of all database components
- **[QUICK_ACTION_PLAN.md](./QUICK_ACTION_PLAN.md)** - Immediate action items and critical fixes
- **[DATABASE_SCHEMA_DIAGRAM.md](./DATABASE_SCHEMA_DIAGRAM.md)** - Visual schema representation and relationships

### Original Script Results
- **[01_database_schema_overview_Result.md](./01_database_schema_overview_Result.md)** - Schema overview results
- **[02_table_structures.md](./02_table_structures.md)** - Table structure analysis results
- **[03_indexes_and_performance.md](./03_indexes_and_performance.md)** - Performance analysis results
- **[04_functions_and_procedures.md](./04_functions_and_procedures.md)** - Function analysis results
- **[05_rls_policies_and_security.md](./05_rls_policies_and_security.md)** - Security analysis results

---

**Note**: These scripts are read-only and safe to run. They only query information and don't modify your database structure or data.
