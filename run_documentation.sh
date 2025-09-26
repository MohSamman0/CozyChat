#!/bin/bash

# Cozy Chat Database Documentation Runner
# This script runs all the documentation queries and saves the results

echo "🚀 Starting Cozy Chat Database Documentation Collection..."
echo "=================================================="

# Create results directory
mkdir -p database-documentation/results
cd database-documentation

# Function to run a query and save results
run_query() {
    local script_name=$1
    local description=$2
    
    echo "📊 Running: $description"
    echo "Script: $script_name"
    
    # Run the query and save to results file
    supabase db query --file "$script_name" > "results/${script_name%.sql}_results.txt" 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully collected data from $script_name"
    else
        echo "❌ Failed to run $script_name"
    fi
    echo "---"
}

# Run all documentation scripts
run_query "01_database_schema_overview.sql" "Database Schema Overview"
run_query "02_table_structures.sql" "Table Structures Analysis"
run_query "03_indexes_and_performance.sql" "Indexes and Performance Analysis"
run_query "04_functions_and_procedures.sql" "Functions and Procedures Documentation"
run_query "05_rls_policies_and_security.sql" "RLS Policies and Security Analysis"
run_query "06_permissions_and_grants.sql" "Permissions and Grants Analysis"
run_query "07_data_analysis_queries.sql" "Data Analysis and Insights"

echo "🎉 Documentation collection complete!"
echo "📁 Results saved in: database-documentation/results/"
echo ""
echo "📋 Generated files:"
ls -la results/

echo ""
echo "🔍 To view results, you can:"
echo "   cat results/01_database_schema_overview_results.txt"
echo "   cat results/02_table_structures_results.txt"
echo "   # ... and so on for each file"
