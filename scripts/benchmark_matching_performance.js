#!/usr/bin/env node

/**
 * Benchmark script for matching performance improvements
 * Compares old vs new matching algorithms
 */

const { createClient } = require('@supabase/supabase-js');
const { performance } = require('perf_hooks');

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || 'your-service-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

class MatchingBenchmark {
    constructor() {
        this.results = {
            oldAlgorithm: [],
            newAlgorithm: [],
            improvements: []
        };
    }

    async runBenchmark() {
        console.log('🚀 Starting Matching Performance Benchmark\n');
        
        try {
            await this.cleanupTestData();
            await this.benchmarkOldAlgorithm();
            await this.benchmarkNewAlgorithm();
            await this.calculateImprovements();
            await this.generateReport();
        } catch (error) {
            console.error('❌ Benchmark failed:', error);
        } finally {
            await this.cleanupTestData();
        }
    }

    async cleanupTestData() {
        console.log('🧹 Cleaning up test data...');
        
        // Clean up all test data
        await supabase.rpc('cleanup_old_sessions');
        
        // Clean up match queue
        await supabase
            .from('match_queue')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000');
        
        // Clean up match cache
        await supabase
            .from('match_cache')
            .delete()
            .neq('user1_id', '00000000-0000-0000-0000-000000000000');
        
        console.log('✅ Cleanup completed\n');
    }

    async benchmarkOldAlgorithm() {
        console.log('📊 Benchmarking Old Algorithm (Array Intersection)...');
        
        const testSizes = [10, 25, 50, 100];
        
        for (const size of testSizes) {
            console.log(`   Testing with ${size} users...`);
            
            // Create test users
            const users = await this.createTestUsers(size);
            
            // Simulate old algorithm with array intersection
            const startTime = performance.now();
            const matches = await this.simulateOldMatching(users);
            const endTime = performance.now();
            
            const result = {
                userCount: size,
                executionTime: endTime - startTime,
                matchesFound: matches.length,
                averageTimePerUser: (endTime - startTime) / size,
                algorithm: 'old'
            };
            
            this.results.oldAlgorithm.push(result);
            
            console.log(`     Time: ${(endTime - startTime).toFixed(2)}ms`);
            console.log(`     Matches: ${matches.length}`);
            console.log(`     Avg/User: ${((endTime - startTime) / size).toFixed(2)}ms`);
        }
        
        console.log('');
    }

    async benchmarkNewAlgorithm() {
        console.log('⚡ Benchmarking New Algorithm (Pre-computed + Caching)...');
        
        const testSizes = [10, 25, 50, 100];
        
        for (const size of testSizes) {
            console.log(`   Testing with ${size} users...`);
            
            // Create test users
            const users = await this.createTestUsers(size);
            
            // Test new algorithm
            const startTime = performance.now();
            const matches = await this.simulateNewMatching(users);
            const endTime = performance.now();
            
            const result = {
                userCount: size,
                executionTime: endTime - startTime,
                matchesFound: matches.length,
                averageTimePerUser: (endTime - startTime) / size,
                algorithm: 'new'
            };
            
            this.results.newAlgorithm.push(result);
            
            console.log(`     Time: ${(endTime - startTime).toFixed(2)}ms`);
            console.log(`     Matches: ${matches.length}`);
            console.log(`     Avg/User: ${((endTime - startTime) / size).toFixed(2)}ms`);
        }
        
        console.log('');
    }

    async createTestUsers(count) {
        const users = [];
        const interests = [
            ['music', 'movies', 'gaming'],
            ['sports', 'fitness', 'hiking'],
            ['cooking', 'travel', 'photography'],
            ['programming', 'ai', 'technology'],
            ['books', 'art', 'music'],
            ['fitness', 'yoga', 'meditation'],
            ['gaming', 'anime', 'comics'],
            ['travel', 'photography', 'nature']
        ];
        
        for (let i = 0; i < count; i++) {
            const sessionId = `benchmark-${i}-${Date.now()}`;
            const userInterests = interests[i % interests.length];
            
            const { data: user, error } = await supabase
                .from('anonymous_users')
                .insert({
                    session_id: sessionId,
                    interests: userInterests,
                    is_active: true
                })
                .select()
                .single();
            
            if (!error) {
                users.push({
                    id: user.id,
                    interests: userInterests
                });
            }
        }
        
        return users;
    }

    async simulateOldMatching(users) {
        const matches = [];
        
        // Simulate the old array intersection approach
        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                const user1 = users[i];
                const user2 = users[j];
                
                // Simulate expensive array intersection
                const intersection = this.arrayIntersection(user1.interests, user2.interests);
                const matchScore = intersection.length;
                
                if (matchScore > 0) {
                    matches.push({
                        user1: user1.id,
                        user2: user2.id,
                        score: matchScore
                    });
                }
            }
        }
        
        return matches;
    }

    async simulateNewMatching(users) {
        const matches = [];
        
        // Simulate the new pre-computed approach
        for (let i = 0; i < users.length; i++) {
            for (let j = i + 1; j < users.length; j++) {
                const user1 = users[i];
                const user2 = users[j];
                
                // Use the new compatibility scoring function
                const { data: score } = await supabase.rpc('calculate_compatibility_score', {
                    user1_interests: user1.interests,
                    user2_interests: user2.interests
                });
                
                if (score > 0) {
                    matches.push({
                        user1: user1.id,
                        user2: user2.id,
                        score: score
                    });
                }
            }
        }
        
        return matches;
    }

    arrayIntersection(arr1, arr2) {
        // Simulate the expensive array intersection operation
        const set1 = new Set(arr1);
        const set2 = new Set(arr2);
        const intersection = [];
        
        for (const item of set1) {
            if (set2.has(item)) {
                intersection.push(item);
            }
        }
        
        return intersection;
    }

    calculateImprovements() {
        console.log('📈 Calculating Performance Improvements...\n');
        
        for (let i = 0; i < this.results.oldAlgorithm.length; i++) {
            const oldResult = this.results.oldAlgorithm[i];
            const newResult = this.results.newAlgorithm[i];
            
            const timeImprovement = ((oldResult.executionTime - newResult.executionTime) / oldResult.executionTime) * 100;
            const speedup = oldResult.executionTime / newResult.executionTime;
            
            const improvement = {
                userCount: oldResult.userCount,
                oldTime: oldResult.executionTime,
                newTime: newResult.executionTime,
                timeImprovement: timeImprovement,
                speedup: speedup,
                oldMatches: oldResult.matchesFound,
                newMatches: newResult.matchesFound
            };
            
            this.results.improvements.push(improvement);
            
            console.log(`   ${oldResult.userCount} users:`);
            console.log(`     Old Time: ${oldResult.executionTime.toFixed(2)}ms`);
            console.log(`     New Time: ${newResult.executionTime.toFixed(2)}ms`);
            console.log(`     Improvement: ${timeImprovement.toFixed(1)}%`);
            console.log(`     Speedup: ${speedup.toFixed(2)}x`);
            console.log(`     Matches: ${oldResult.matchesFound} → ${newResult.matchesFound}`);
            console.log('');
        }
    }

    async generateReport() {
        console.log('📊 Benchmark Report Summary\n');
        console.log('='.repeat(60));
        
        // Summary statistics
        const avgTimeImprovement = this.results.improvements.reduce((sum, imp) => sum + imp.timeImprovement, 0) / this.results.improvements.length;
        const avgSpeedup = this.results.improvements.reduce((sum, imp) => sum + imp.speedup, 0) / this.results.improvements.length;
        const maxSpeedup = Math.max(...this.results.improvements.map(imp => imp.speedup));
        
        console.log('\n🎯 Key Metrics:');
        console.log(`   Average Time Improvement: ${avgTimeImprovement.toFixed(1)}%`);
        console.log(`   Average Speedup: ${avgSpeedup.toFixed(2)}x`);
        console.log(`   Maximum Speedup: ${maxSpeedup.toFixed(2)}x`);
        
        // Detailed results table
        console.log('\n📋 Detailed Results:');
        console.log('Users | Old Time | New Time | Improvement | Speedup | Matches');
        console.log('-'.repeat(60));
        
        this.results.improvements.forEach(imp => {
            console.log(
                `${imp.userCount.toString().padStart(5)} | ` +
                `${imp.oldTime.toFixed(1).padStart(8)}ms | ` +
                `${imp.newTime.toFixed(1).padStart(8)}ms | ` +
                `${imp.timeImprovement.toFixed(1).padStart(10)}% | ` +
                `${imp.speedup.toFixed(2).padStart(7)}x | ` +
                `${imp.oldMatches} → ${imp.newMatches}`
            );
        });
        
        // Performance analysis
        console.log('\n🔍 Performance Analysis:');
        
        if (avgTimeImprovement > 50) {
            console.log('   ✅ Excellent improvement - 50%+ faster');
        } else if (avgTimeImprovement > 25) {
            console.log('   ✅ Good improvement - 25%+ faster');
        } else if (avgTimeImprovement > 10) {
            console.log('   ⚠️  Moderate improvement - 10%+ faster');
        } else {
            console.log('   ❌ Minimal improvement - less than 10% faster');
        }
        
        if (avgSpeedup > 2) {
            console.log('   ✅ Significant speedup achieved');
        } else if (avgSpeedup > 1.5) {
            console.log('   ✅ Noticeable speedup achieved');
        } else {
            console.log('   ⚠️  Limited speedup achieved');
        }
        
        // Scalability analysis
        console.log('\n📈 Scalability Analysis:');
        const largeUserTest = this.results.improvements.find(imp => imp.userCount >= 100);
        if (largeUserTest) {
            if (largeUserTest.speedup > 3) {
                console.log('   ✅ Excellent scalability - maintains performance at scale');
            } else if (largeUserTest.speedup > 2) {
                console.log('   ✅ Good scalability - good performance at scale');
            } else {
                console.log('   ⚠️  Limited scalability - performance may degrade at scale');
            }
        }
        
        console.log('\n' + '='.repeat(60));
        console.log('Benchmark completed successfully! 🎉');
    }
}

// Run benchmark if this script is executed directly
if (require.main === module) {
    const benchmark = new MatchingBenchmark();
    benchmark.runBenchmark().catch(console.error);
}

module.exports = MatchingBenchmark;
