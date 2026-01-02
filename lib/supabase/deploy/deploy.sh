#!/bin/bash
# =====================================================
# TRADESCAPTAIN SUPABASE DEPLOYMENT SCRIPT
# Deploy complete database schema to Supabase
# =====================================================

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Print header
echo -e "${BLUE}"
echo "======================================================"
echo "  TRADESCAPTAIN DATABASE DEPLOYMENT"
echo "  Supabase PostgreSQL Schema Deployment"
echo "======================================================"
echo -e "${NC}"

# Check for required environment variables
check_env() {
    echo -e "${YELLOW}Checking environment...${NC}"

    if [ -z "$SUPABASE_PROJECT_REF" ]; then
        echo -e "${RED}Error: SUPABASE_PROJECT_REF is not set${NC}"
        echo "Please set it: export SUPABASE_PROJECT_REF=your-project-ref"
        exit 1
    fi

    if [ -z "$DATABASE_URL" ]; then
        echo -e "${YELLOW}Warning: DATABASE_URL is not set${NC}"
        echo "You can get this from Supabase Dashboard > Settings > Database"
        echo ""
    fi

    echo -e "${GREEN}Environment check passed${NC}"
}

# Check for Supabase CLI
check_cli() {
    echo -e "${YELLOW}Checking Supabase CLI...${NC}"

    if ! command -v supabase &> /dev/null; then
        echo -e "${RED}Error: Supabase CLI is not installed${NC}"
        echo ""
        echo "Install with:"
        echo "  npm install -g supabase"
        echo "  # or"
        echo "  brew install supabase/tap/supabase"
        exit 1
    fi

    echo -e "${GREEN}Supabase CLI found: $(supabase --version)${NC}"
}

# Link to Supabase project
link_project() {
    echo ""
    echo -e "${BLUE}Step 1: Linking to Supabase project...${NC}"

    supabase link --project-ref "$SUPABASE_PROJECT_REF"

    echo -e "${GREEN}Project linked successfully${NC}"
}

# Deploy main schema
deploy_schema() {
    echo ""
    echo -e "${BLUE}Step 2: Deploying main schema...${NC}"
    echo "This will create all tables, indexes, functions, and triggers."

    if [ -n "$DATABASE_URL" ]; then
        # Direct SQL execution
        psql "$DATABASE_URL" -f "$SCRIPT_DIR/001_complete_schema.sql"
    else
        # Use supabase db push (reads from supabase/migrations)
        echo -e "${YELLOW}Using supabase db push...${NC}"
        supabase db push
    fi

    echo -e "${GREEN}Schema deployed successfully${NC}"
}

# Apply RLS policies
apply_rls() {
    echo ""
    echo -e "${BLUE}Step 3: Applying RLS policies...${NC}"
    echo "Setting up agent data isolation policies."

    if [ -n "$DATABASE_URL" ]; then
        psql "$DATABASE_URL" -f "$SCRIPT_DIR/002_rls_policies.sql"
        echo -e "${GREEN}RLS policies applied successfully${NC}"
    else
        echo -e "${YELLOW}Skipping RLS - DATABASE_URL not set${NC}"
        echo "Run manually: psql \$DATABASE_URL -f 002_rls_policies.sql"
    fi
}

# Generate TypeScript types
generate_types() {
    echo ""
    echo -e "${BLUE}Step 4: Generating TypeScript types...${NC}"

    TYPES_FILE="$SCRIPT_DIR/../database.types.ts"

    supabase gen types typescript --project-id "$SUPABASE_PROJECT_REF" > "$TYPES_FILE"

    echo -e "${GREEN}Types generated: $TYPES_FILE${NC}"
}

# Verify deployment
verify_deployment() {
    echo ""
    echo -e "${BLUE}Step 5: Verifying deployment...${NC}"

    if [ -n "$DATABASE_URL" ]; then
        echo "Checking table count..."
        TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
        echo -e "  Tables created: ${GREEN}${TABLE_COUNT}${NC}"

        echo "Checking RLS enabled tables..."
        RLS_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = true;")
        echo -e "  RLS enabled: ${GREEN}${RLS_COUNT}${NC}"

        echo "Checking policies..."
        POLICY_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public';")
        echo -e "  Policies: ${GREEN}${POLICY_COUNT}${NC}"

        echo "Checking functions..."
        FUNC_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.routines WHERE routine_schema = 'public';")
        echo -e "  Functions: ${GREEN}${FUNC_COUNT}${NC}"
    else
        echo -e "${YELLOW}Skipping verification - DATABASE_URL not set${NC}"
    fi
}

# Main deployment flow
main() {
    echo ""
    echo -e "${YELLOW}Starting deployment...${NC}"
    echo ""

    check_env
    check_cli

    # Prompt for confirmation
    echo ""
    echo -e "${YELLOW}This will deploy to project: ${SUPABASE_PROJECT_REF}${NC}"
    read -p "Continue? (y/N) " -n 1 -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 0
    fi

    link_project
    deploy_schema
    apply_rls
    generate_types
    verify_deployment

    echo ""
    echo -e "${GREEN}======================================================"
    echo "  DEPLOYMENT COMPLETE"
    echo "======================================================${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Verify tables in Supabase Dashboard"
    echo "  2. Test RLS policies with different user roles"
    echo "  3. Update environment variables in your app"
    echo ""
}

# Help message
show_help() {
    echo "TradesCaptain Supabase Deployment Script"
    echo ""
    echo "Usage: ./deploy.sh [command]"
    echo ""
    echo "Commands:"
    echo "  (none)     Run full deployment"
    echo "  schema     Deploy schema only"
    echo "  rls        Apply RLS policies only"
    echo "  types      Generate TypeScript types only"
    echo "  verify     Verify deployment only"
    echo "  help       Show this help message"
    echo ""
    echo "Environment Variables Required:"
    echo "  SUPABASE_PROJECT_REF   Your Supabase project reference"
    echo "  DATABASE_URL           PostgreSQL connection string (optional)"
    echo ""
    echo "Example:"
    echo "  export SUPABASE_PROJECT_REF=abcdefghijklmnop"
    echo "  export DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"
    echo "  ./deploy.sh"
}

# Handle command line arguments
case "${1:-}" in
    schema)
        check_env
        deploy_schema
        ;;
    rls)
        check_env
        apply_rls
        ;;
    types)
        check_env
        check_cli
        generate_types
        ;;
    verify)
        check_env
        verify_deployment
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        main
        ;;
esac
