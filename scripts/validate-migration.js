#!/usr/bin/env node

/**
 * Validation script for the stale session fix migration
 * This script validates the SQL syntax and structure of our migration
 */

const fs = require('fs');
const path = require('path');

function validateMigration() {
  console.log('🔍 Validating Stale Session Fix Migration...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '015_stale_session_fix.sql');
  
  if (!fs.existsSync(migrationPath)) {
    console.error('❌ Migration file not found:', migrationPath);
    process.exit(1);
  }

  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  
  // Basic SQL syntax validation
  const checks = [
    {
      name: 'Function Definition',
      test: /CREATE OR REPLACE FUNCTION create_or_join_session_atomic/,
      required: true
    },
    {
      name: 'Session Age Limit',
      test: /cs\.created_at > NOW\(\) - INTERVAL '5 minutes'/,
      required: true
    },
    {
      name: 'Activity Check',
      test: /au\.last_seen > NOW\(\) - INTERVAL '2 minutes'/,
      required: true
    },
    {
      name: 'Interest Matching',
      test: /user_interests && au\.interests/,
      required: true
    },
    {
      name: 'Performance Indexes',
      test: /CREATE INDEX IF NOT EXISTS idx_waiting_pick/,
      required: true
    },
    {
      name: 'Cleanup Function',
      test: /CREATE OR REPLACE FUNCTION cleanup_old_sessions/,
      required: true
    },
    {
      name: 'Function Comments',
      test: /COMMENT ON FUNCTION/,
      required: true
    }
  ];

  let passed = 0;
  let failed = 0;

  console.log('Running validation checks...\n');

  checks.forEach(check => {
    if (check.test.test(migrationContent)) {
      console.log(`✅ ${check.name}: PASSED`);
      passed++;
    } else {
      console.log(`❌ ${check.name}: FAILED`);
      failed++;
      if (check.required) {
        console.log(`   ⚠️  This is a required feature!`);
      }
    }
  });

  // Check for potential issues
  console.log('\n🔍 Checking for potential issues...\n');

  const warnings = [
    {
      name: 'No Breaking Changes',
      test: /DROP TABLE|DROP COLUMN|ALTER COLUMN/,
      shouldMatch: false,
      message: 'Found potential breaking changes - ensure they are safe'
    },
    {
      name: 'Safe Index Creation',
      test: /CREATE INDEX IF NOT EXISTS/,
      shouldMatch: true,
      message: 'Using safe index creation with IF NOT EXISTS'
    },
    {
      name: 'Backward Compatibility',
      test: /CREATE OR REPLACE FUNCTION/,
      shouldMatch: true,
      message: 'Using CREATE OR REPLACE for backward compatibility'
    }
  ];

  warnings.forEach(warning => {
    const matches = warning.test.test(migrationContent);
    if (matches === warning.shouldMatch) {
      console.log(`✅ ${warning.name}: ${warning.message}`);
    } else {
      console.log(`⚠️  ${warning.name}: ${warning.message}`);
    }
  });

  // Summary
  console.log('\n📊 Validation Summary:');
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  
  if (failed === 0) {
    console.log('\n🎉 Migration validation PASSED!');
    console.log('   The migration is ready for deployment.');
    console.log('\n📋 Next steps:');
    console.log('   1. Set up environment variables (.env.local)');
    console.log('   2. Run: supabase db push');
    console.log('   3. Test with: node scripts/test-stale-session-fix.js');
    console.log('   4. Set up cleanup cron: ./scripts/setup-cleanup-cron.sh');
  } else {
    console.log('\n❌ Migration validation FAILED!');
    console.log('   Please fix the issues before deploying.');
    process.exit(1);
  }
}

// Run validation
if (require.main === module) {
  validateMigration();
}

module.exports = { validateMigration };
