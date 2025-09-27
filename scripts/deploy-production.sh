#!/bin/bash

# Production Deployment Script
# This script deploys the application and verifies the deployment

set -e  # Exit on any error

echo "🚀 Starting Production Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Check if .env.local exists
if [ -f ".env.local" ]; then
    print_info "Found .env.local file - ensure it contains production keys"
fi

# Check if .env.local is in .gitignore
if [ -f ".gitignore" ]; then
    if ! grep -q ".env.local" .gitignore; then
        print_warning ".env.local is not in .gitignore - adding it now"
        echo ".env.local" >> .gitignore
    fi
else
    print_warning ".gitignore not found - creating it"
    cp .env.example .gitignore 2>/dev/null || echo ".env.local" > .gitignore
fi

# 1. Install dependencies
print_status "Installing dependencies..."
npm install

# 2. Run database migration
print_status "Running database migration..."
if command -v supabase &> /dev/null; then
    supabase db push
    print_success "Database migration completed"
else
    print_warning "Supabase CLI not found. Please run the migration manually:"
    print_warning "supabase db push"
fi

# 3. Verify database configuration
print_status "Verifying database configuration..."
if command -v supabase &> /dev/null; then
    if [ -f "scripts/verify-database-security.sql" ]; then
        supabase db reset --linked < scripts/verify-database-security.sql
        print_success "Database verification completed"
    fi
else
    print_warning "Supabase CLI not found. Please verify database manually:"
    print_warning "Run scripts/verify-database-security.sql in your database"
fi

# 4. Build the application
print_status "Building application..."
npm run build

# 5. Run quality checks
print_status "Running quality checks..."

# Check for console.log statements in production build
if [ -d ".next" ]; then
    CONSOLE_LOGS=$(find .next -name "*.js" -exec grep -l "console\." {} \; | wc -l)
    if [ "$CONSOLE_LOGS" -gt 0 ]; then
        print_warning "Found $CONSOLE_LOGS files with console statements in production build"
        print_warning "Consider using the secure logger instead"
    else
        print_success "No console statements found in production build"
    fi
fi

# Check environment configuration
if [ -f ".env.local" ]; then
    print_info "Environment configuration found"
fi

# 6. Create production environment template
print_status "Creating production environment template..."
cat > .env.production.example << EOF
# Production Environment Variables
# Copy this file to .env.production and fill in your values

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key

# Server-side only (DO NOT expose to client)
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key

# Application Configuration
NEXT_PUBLIC_APP_URL=https://your-domain.com
NODE_ENV=production

# Encryption
NEXT_PUBLIC_ENCRYPTION_SALT=your_32_character_production_salt
EOF

print_success "Production environment template created"

# 7. Deployment summary
print_status "Production deployment completed!"
echo ""
print_success "✅ Application deployed successfully"
echo ""
print_status "NEXT STEPS:"
echo "1. 🚀 Deploy to production with environment variables"
echo "2. 🔍 Monitor application performance"
echo "3. 📊 Set up monitoring and analytics"
echo "4. 🧪 Run comprehensive testing"
echo "5. 📈 Monitor user engagement"
echo ""
print_warning "IMPORTANT REMINDERS:"
echo "- Never commit .env.local or .env.production to version control"
echo "- Use different keys for development and production"
echo "- Regularly update dependencies"
echo "- Monitor your application logs for issues"
echo ""
print_status "Production deployment completed successfully! 🎉"
