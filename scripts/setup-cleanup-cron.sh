#!/bin/bash

# Setup script for periodic cleanup of stale sessions
# This script sets up a cron job to call the cleanup API endpoint every 5 minutes

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Setting up periodic cleanup for Cozy Chat...${NC}"

# Check if required environment variables are set
if [ -z "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    echo -e "${RED}Error: NEXT_PUBLIC_SUPABASE_URL environment variable is not set${NC}"
    exit 1
fi

if [ -z "$ADMIN_API_KEY" ]; then
    echo -e "${RED}Error: ADMIN_API_KEY environment variable is not set${NC}"
    echo -e "${YELLOW}Please set ADMIN_API_KEY in your environment or .env file${NC}"
    exit 1
fi

# Extract the domain from the Supabase URL
DOMAIN=$(echo $NEXT_PUBLIC_SUPABASE_URL | sed 's|https://||' | sed 's|\.supabase\.co.*||')
APP_URL="https://${DOMAIN}.supabase.co"

# Create the cron job entry
CRON_ENTRY="*/5 * * * * curl -X POST -H 'x-api-key: $ADMIN_API_KEY' $APP_URL/api/admin/cleanup-sessions >/dev/null 2>&1"

# Check if cron job already exists
if crontab -l 2>/dev/null | grep -q "cleanup-sessions"; then
    echo -e "${YELLOW}Cron job for cleanup-sessions already exists${NC}"
    echo -e "${YELLOW}Current cron jobs:${NC}"
    crontab -l | grep cleanup-sessions
else
    # Add the cron job
    (crontab -l 2>/dev/null; echo "$CRON_ENTRY") | crontab -
    echo -e "${GREEN}✓ Cron job added successfully${NC}"
    echo -e "${GREEN}Cleanup will run every 5 minutes${NC}"
fi

echo -e "${GREEN}Setup complete!${NC}"
echo -e "${YELLOW}To test the cleanup manually, run:${NC}"
echo -e "curl -X POST -H 'x-api-key: $ADMIN_API_KEY' $APP_URL/api/admin/cleanup-sessions"
echo -e ""
echo -e "${YELLOW}To view current cron jobs:${NC}"
echo -e "crontab -l"
echo -e ""
echo -e "${YELLOW}To remove the cron job:${NC}"
echo -e "crontab -e  # Then delete the line with cleanup-sessions"
