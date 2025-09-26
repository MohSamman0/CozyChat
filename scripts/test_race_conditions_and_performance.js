#!/usr/bin/env node

/**
 * Test script for race conditions and performance improvements
 * This script tests the new match queue system and optimized matching algorithm
 */

const { createClient } = require('@supabase/supabase-js');
const { performance } = require('perf_hooks');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Test data
const testInterests = [
    ['music', 'movies', 'gaming'],
    ['sports', 'fitness', 'hiking'],
    ['cooking', 'travel', 'photography'],
    ['programming', 'ai', 'technology'],
    ['books', 'art', 'music'],
    ['fitness', 'yoga', 'meditation'],
    ['gaming', 'anime', 'comics'],
    ['travel', 'photography', 'nature']
];

class TestRunner {
    constructor() {
        this.results = {
            raceConditionTests: [],
            performanceTests: [],
            errors: []
        };
    }

    async runAllTests() {
        console.log('🚀 Starting Race Condition and Performance Tests\n');
        
        try {
            await this.cleanupTestData();
            await this.testRaceConditions();
            await this.testPerformanceImprovements();
            await this.testCompatibilityScoring();
            await this.testCachingSystem();
            await this.generateReport();
        } catch (error) {
            console.error('❌ Test suite failed:', error);
            this.results.errors.push(error.message);
        } finally {
            await this.cleanupTestData();
        }
    }

    async cleanupTestData() {
        console.log('🧹 Cleaning up test data...');
        
        // Clean up test users and sessions
        const { error: deleteError } = await supabase.rpc('cleanup_old_sessions');
        if (deleteError) {
            console.warn('Warning: Cleanup failed:', deleteError.message);
        }
        
        // Clean up match queue
        const { error: queueError } = await supabase
            .from('match_queue')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (queueError) {
            console.warn('Warning: Queue cleanup failed:', queueError.message);
        }
        
        console.log('✅ Cleanup completed\n');
    }

    async testRaceConditions() {
        console.log('🏁 Testing Race Conditions...');
        
        const concurrentUsers = 10;
        const promises = [];
        
        // Create multiple users simultaneously
        for (let i = 0; i < concurrentUsers; i++) {
            promises.push(this.createTestUser(i));
        }
        
        const startTime = performance.now();
        const results = await Promise.all(promises);
        const endTime = performance.now();
        
        // Analyze results
        const successfulMatches = results.filter(r => r.action === 'joined').length;
        const createdSessions = results.filter(r => r.action === 'created').length;
        const errors = results.filter(r => r.error).length;
        
        // Check for race conditions
        const duplicateSessions = this.findDuplicateSessions(results);
        const orphanedSessions = await this.findOrphanedSessions();
        
        const testResult = {
            testName: 'Race Condition Test',
            concurrentUsers,
            executionTime: endTime - startTime,
            successfulMatches,
            createdSessions,
            errors,
            duplicateSessions: duplicateSessions.length,
            orphanedSessions: orphanedSessions.length,
            passed: errors === 0 && duplicateSessions.length === 0 && orphanedSessions.length === 0
        };
        
        this.results.raceConditionTests.push(testResult);
        
        console.log(`   Concurrent Users: ${concurrentUsers}`);
        console.log(`   Execution Time: ${(endTime - startTime).toFixed(2)}ms`);
        console.log(`   Successful Matches: ${successfulMatches}`);
        console.log(`   Created Sessions: ${createdSessions}`);
        console.log(`   Errors: ${errors}`);
        console.log(`   Duplicate Sessions: ${duplicateSessions.length}`);
        console.log(`   Orphaned Sessions: ${orphanedSessions.length}`);
        console.log(`   Result: ${testResult.passed ? '✅ PASSED' : '❌ FAILED'}\n`);
    }

    async testPerformanceImprovements() {
        console.log('⚡ Testing Performance Improvements...');
        
        const testSizes = [10, 50, 100];
        
        for (const size of testSizes) {
            await this.cleanupTestData();
            
            // Create test users
            const users = [];
            for (let i = 0; i < size; i++) {
                users.push(await this.createTestUser(i));
            }
            
            // Test matching performance
            const startTime = performance.now();
            const matchResults = await this.performMatching(users);
            const endTime = performance.now();
            
            const testResult = {
                testName: `Performance Test - ${size} users`,
                userCount: size,
                executionTime: endTime - startTime,
                matchesFound: matchResults.length,
                averageTimePerMatch: (endTime - startTime) / matchResults.length,
                passed: (endTime - startTime) < (size * 10) // Should be under 10ms per user
            };
            
            this.results.performanceTests.push(testResult);
            
            console.log(`   Users: ${size}`);
            console.log(`   Execution Time: ${(endTime - startTime).toFixed(2)}ms`);
            console.log(`   Matches Found: ${matchResults.length}`);
            console.log(`   Avg Time/Match: ${((endTime - startTime) / matchResults.length).toFixed(2)}ms`);
            console.log(`   Result: ${testResult.passed ? '✅ PASSED' : '❌ FAILED'}\n`);
        }
    }

    async testCompatibilityScoring() {
        console.log('🎯 Testing Compatibility Scoring...');
        
        const testCases = [
            {
                interests1: ['music', 'movies'],
                interests2: ['music', 'gaming'],
                expectedScore: 15 // 10 (music=music) + 5 (movies=gaming, both entertainment)
            },
            {
                interests1: ['sports', 'fitness'],
                interests2: ['fitness', 'hiking'],
                expectedScore: 15 // 10 (fitness=fitness) + 5 (sports=hiking, both activities)
            },
            {
                interests1: ['programming', 'ai'],
                interests2: ['cooking', 'travel'],
                expectedScore: 2 // 1 + 1 (different categories)
            }
        ];
        
        for (const testCase of testCases) {
            const { data, error } = await supabase.rpc('calculate_compatibility_score', {
                user1_interests: testCase.interests1,
                user2_interests: testCase.interests2
            });
            
            const passed = !error && data === testCase.expectedScore;
            
            console.log(`   Interests 1: [${testCase.interests1.join(', ')}]`);
            console.log(`   Interests 2: [${testCase.interests2.join(', ')}]`);
            console.log(`   Expected Score: ${testCase.expectedScore}`);
            console.log(`   Actual Score: ${data || 'ERROR'}`);
            console.log(`   Result: ${passed ? '✅ PASSED' : '❌ FAILED'}\n`);
        }
    }

    async testCachingSystem() {
        console.log('💾 Testing Caching System...');
        
        const interests1 = ['music', 'movies', 'gaming'];
        const interests2 = ['music', 'sports', 'fitness'];
        
        // First calculation (should be slow)
        const start1 = performance.now();
        const { data: score1 } = await supabase.rpc('calculate_compatibility_score', {
            user1_interests: interests1,
            user2_interests: interests2
        });
        const end1 = performance.now();
        
        // Cache the score
        await supabase.rpc('cache_compatibility_score', {
            user1_id_param: '11111111-1111-1111-1111-111111111111',
            user2_id_param: '22222222-2222-2222-2222-222222222222',
            score: score1
        });
        
        // Second calculation (should be fast from cache)
        const start2 = performance.now();
        const { data: cachedScore } = await supabase.rpc('get_cached_compatibility_score', {
            user1_id_param: '11111111-1111-1111-1111-111111111111',
            user2_id_param: '22222222-2222-2222-2222-222222222222'
        });
        const end2 = performance.now();
        
        const firstTime = end1 - start1;
        const secondTime = end2 - start2;
        const speedup = firstTime / secondTime;
        
        console.log(`   First Calculation: ${firstTime.toFixed(2)}ms`);
        console.log(`   Cached Lookup: ${secondTime.toFixed(2)}ms`);
        console.log(`   Speedup: ${speedup.toFixed(2)}x`);
        console.log(`   Scores Match: ${score1 === cachedScore ? '✅ YES' : '❌ NO'}`);
        console.log(`   Result: ${speedup > 2 ? '✅ PASSED' : '❌ FAILED'}\n`);
    }

    async createTestUser(index) {
        try {
            const sessionId = `test-session-${index}-${Date.now()}`;
            const interests = testInterests[index % testInterests.length];
            
            // Create anonymous user
            const { data: user, error: userError } = await supabase
                .from('anonymous_users')
                .insert({
                    session_id: sessionId,
                    interests: interests,
                    is_active: true
                })
                .select()
                .single();
            
            if (userError) throw userError;
            
            // Try to create or join session
            const { data: sessionResult, error: sessionError } = await supabase.rpc(
                'create_or_join_session_atomic',
                {
                    user_id_param: user.id,
                    user_interests: interests
                }
            );
            
            if (sessionError) throw sessionError;
            
            return {
                userId: user.id,
                sessionId: sessionResult[0].session_id,
                action: sessionResult[0].action,
                message: sessionResult[0].message
            };
        } catch (error) {
            return { error: error.message };
        }
    }

    async performMatching(users) {
        const results = [];
        
        for (const user of users) {
            if (user.error) continue;
            
            try {
                const { data, error } = await supabase.rpc('find_best_match_from_queue', {
                    user_id_param: user.userId,
                    user_interests: testInterests[0]
                });
                
                if (!error && data) {
                    results.push({ userId: user.userId, matchId: data });
                }
            } catch (error) {
                console.warn(`Matching failed for user ${user.userId}:`, error.message);
            }
        }
        
        return results;
    }

    findDuplicateSessions(results) {
        const sessionIds = results
            .filter(r => !r.error && r.sessionId)
            .map(r => r.sessionId);
        
        const duplicates = [];
        const seen = new Set();
        
        for (const sessionId of sessionIds) {
            if (seen.has(sessionId)) {
                duplicates.push(sessionId);
            } else {
                seen.add(sessionId);
            }
        }
        
        return duplicates;
    }

    async findOrphanedSessions() {
        const { data: sessions, error } = await supabase
            .from('chat_sessions')
            .select('id, user1_id, user2_id, status')
            .eq('status', 'waiting');
        
        if (error) return [];
        
        const orphaned = [];
        
        for (const session of sessions) {
            // Check if user1 exists and is active
            const { data: user1 } = await supabase
                .from('anonymous_users')
                .select('id, is_active')
                .eq('id', session.user1_id)
                .single();
            
            if (!user1 || !user1.is_active) {
                orphaned.push(session.id);
            }
        }
        
        return orphaned;
    }

    async generateReport() {
        console.log('📊 Test Report Summary\n');
        console.log('='.repeat(50));
        
        // Race condition results
        console.log('\n🏁 Race Condition Tests:');
        this.results.raceConditionTests.forEach(test => {
            console.log(`   ${test.testName}: ${test.passed ? '✅ PASSED' : '❌ FAILED'}`);
            if (!test.passed) {
                console.log(`     - Errors: ${test.errors}`);
                console.log(`     - Duplicates: ${test.duplicateSessions}`);
                console.log(`     - Orphaned: ${test.orphanedSessions}`);
            }
        });
        
        // Performance results
        console.log('\n⚡ Performance Tests:');
        this.results.performanceTests.forEach(test => {
            console.log(`   ${test.testName}: ${test.passed ? '✅ PASSED' : '❌ FAILED'}`);
            console.log(`     - Time: ${test.executionTime.toFixed(2)}ms`);
            console.log(`     - Avg/Match: ${test.averageTimePerMatch.toFixed(2)}ms`);
        });
        
        // Overall result
        const allPassed = [
            ...this.results.raceConditionTests,
            ...this.results.performanceTests
        ].every(test => test.passed);
        
        console.log('\n' + '='.repeat(50));
        console.log(`Overall Result: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
        
        if (this.results.errors.length > 0) {
            console.log('\nErrors encountered:');
            this.results.errors.forEach(error => {
                console.log(`   - ${error}`);
            });
        }
    }
}

// Run tests if this script is executed directly
if (require.main === module) {
    const runner = new TestRunner();
    runner.runAllTests().catch(console.error);
}

module.exports = TestRunner;
