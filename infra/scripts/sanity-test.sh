#!/bin/bash
# sanity-test.sh - Pre-deployment sanity testing for Campus Circle
# Run this script before deploying to ensure basic functionality works

# Note: Not using 'set -e' because we want to continue testing even if some checks fail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Repo root: infra/scripts -> .. = infra, ../.. = repo root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Docker Compose: prefer 'docker compose' (v2) if available, else 'docker-compose' (v1)
run_docker_compose() {
    if docker compose version &> /dev/null; then
        docker compose "$@"
    elif command -v docker-compose &> /dev/null; then
        docker-compose "$@"
    else
        return 1
    fi
}

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((TESTS_PASSED++))
    ((TESTS_RUN++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((TESTS_FAILED++))
    ((TESTS_RUN++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_section() {
    echo ""
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${MAGENTA}  $1${NC}"
    echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

# Test functions
test_env_file() {
    log_section "1. Environment Configuration"
    
    if [ -f "$PROJECT_ROOT/.env" ]; then
        log_success "Environment file (.env) exists"
        
        # Check for required variables
        local required_vars=(
            "SUPABASE_URL"
            "SUPABASE_ANON_KEY"
            "SUPABASE_SERVICE_ROLE_KEY"
            "SUPABASE_DB_HOST"
            "SUPABASE_DB_PORT"
            "SUPABASE_DB_NAME"
            "SUPABASE_DB_USER"
            "SUPABASE_DB_PASSWORD"
        )
        
        for var in "${required_vars[@]}"; do
            if grep -q "^${var}=" "$PROJECT_ROOT/.env" 2>/dev/null || grep -q "^${var} =" "$PROJECT_ROOT/.env" 2>/dev/null; then
                log_success "Required variable $var is set"
            else
                log_error "Required variable $var is missing"
            fi
        done
    else
        log_error "Environment file (.env) not found"
        log_warning "Copy .env.example to .env and configure it"
    fi
}

test_docker() {
    log_section "2. Docker Environment"
    
    if command -v docker &> /dev/null; then
        log_success "Docker is installed"
        
        if docker ps &> /dev/null; then
            log_success "Docker daemon is running"
        else
            log_error "Docker daemon is not running"
        fi
    else
        log_error "Docker is not installed"
    fi
    
    if docker compose version &> /dev/null; then
        log_success "Docker Compose is installed (docker compose v2)"
    elif command -v docker-compose &> /dev/null; then
        log_success "Docker Compose is installed (docker-compose v1)"
    else
        log_error "Docker Compose is not installed"
    fi
}

test_migrations() {
    log_section "3. Database Structure"
    
    local database_dir="$PROJECT_ROOT/database"
    if [ -d "$database_dir" ]; then
        log_success "Database directory exists"
        
        local sql_count=$(find "$database_dir" -maxdepth 1 -name "*.sql" -type f | wc -l | tr -d ' ')
        if [ "$sql_count" -gt 0 ]; then
            log_success "Found $sql_count SQL file(s) in database/"
            if [ -f "$database_dir/001_schema.sql" ] && [ -f "$database_dir/002_seed.sql" ]; then
                log_success "Expected schema/seed files (001, 002) present"
                for m in 003_tenant_registry.sql 004_demo_bhis_tenant.sql 005_super_admins.sql; do
                    if [ -f "$database_dir/$m" ]; then
                        log_success "Migration $m present"
                    else
                        log_error "Migration $m missing"
                    fi
                done
            else
                log_error "When using SQL files, expect 001_schema.sql and 002_seed.sql in database/"
            fi
            while IFS= read -r -d '' file; do
                if [ -s "$file" ]; then
                    log_success "SQL $(basename "$file") is not empty"
                else
                    log_error "SQL $(basename "$file") is empty"
                fi
            done < <(find "$database_dir" -maxdepth 1 -name "*.sql" -type f -print0 | sort -z)
        else
            log_success "No SQL files in database/ (structure in place; migrations optional)"
        fi
        if [ -d "$database_dir/backup" ]; then
            log_success "Backup directory (database/backup) exists"
        else
            log_warning "database/backup not found (created on first backup)"
            ((TESTS_RUN++))
        fi
    else
        log_error "Database directory not found"
    fi
}

test_backend() {
    log_section "4. Backend Application"
    
    local backend_dir="$PROJECT_ROOT/backend"
    
    if [ -f "$backend_dir/requirements.txt" ]; then
        log_success "Backend requirements.txt exists"
    else
        log_error "Backend requirements.txt not found"
    fi
    
    if [ -f "$backend_dir/app/main.py" ]; then
        log_success "Backend main.py exists"
    else
        log_error "Backend main.py not found"
    fi
    
    # Check for key API files
    local api_files=(
        "app/api/users.py"
        "app/api/events.py"
        "app/api/admin.py"
    )
    
    for file in "${api_files[@]}"; do
        if [ -f "$backend_dir/$file" ]; then
            log_success "API file $file exists"
        else
            log_error "API file $file not found"
        fi
    done
    
    # Check for schemas
    if [ -f "$backend_dir/app/schemas.py" ]; then
        log_success "Schemas file exists"
        
        # Check for new schemas
        if grep -q "ChildCreate" "$backend_dir/app/schemas.py"; then
            log_success "ChildCreate schema exists"
        else
            log_error "ChildCreate schema not found"
        fi
        
        if grep -q "EventRegistrationRequest" "$backend_dir/app/schemas.py"; then
            log_success "EventRegistrationRequest schema exists"
        else
            log_error "EventRegistrationRequest schema not found"
        fi
    else
        log_error "Schemas file not found"
    fi
}

test_frontend() {
    log_section "5. Frontend Application"
    
    local frontend_dir="$PROJECT_ROOT/frontend"
    
    if [ -f "$frontend_dir/package.json" ]; then
        log_success "Frontend package.json exists"
    else
        log_error "Frontend package.json not found"
    fi
    
    # Check for key component files
    local component_files=(
        "src/features/events/components/ChildSelectionModal.js"
        "src/features/profile/components/AddChildModal.js"
        "src/features/admin/components/ManageUsers.js"
        "src/features/admin/components/ManageEvents.js"
        "src/features/admin/components/ManageSchools.js"
    )
    
    for file in "${component_files[@]}"; do
        if [ -f "$frontend_dir/$file" ]; then
            log_success "Component $file exists"
        else
            log_error "Component $file not found"
        fi
    done
    
    # Check for updated files
    if [ -f "$frontend_dir/src/features/events/components/CurrentEventsPage.js" ]; then
        if grep -q "isAdmin" "$frontend_dir/src/features/events/components/CurrentEventsPage.js"; then
            log_success "CurrentEventsPage has admin check"
        else
            log_error "CurrentEventsPage missing admin check"
        fi
    fi
    
    if [ -f "$frontend_dir/src/features/auth/authSlice.js" ]; then
        if grep -q "clearError" "$frontend_dir/src/features/auth/authSlice.js"; then
            log_success "authSlice has clearError action"
        else
            log_error "authSlice missing clearError action"
        fi
    fi
}

test_docker_compose() {
    log_section "6. Docker Compose Configuration"
    
    local compose_file="$PROJECT_ROOT/infra/docker-compose.yml"
    
    if [ -f "$compose_file" ]; then
        log_success "Docker Compose file exists"
        
        # Validate compose file (from PROJECT_ROOT so .env is found; use docker compose v2 or v1)
        if (cd "$PROJECT_ROOT" && run_docker_compose -f "infra/docker-compose.yml" config) > /dev/null 2>&1; then
            log_success "Docker Compose configuration is valid"
        else
            log_error "Docker Compose configuration is invalid"
        fi
        
        # Check for services
        local services=("backend" "db" "frontend" "migrations")
        for service in "${services[@]}"; do
            if grep -q "$service:" "$compose_file"; then
                log_success "Service '$service' is defined"
            else
                log_error "Service '$service' is missing"
            fi
        done
    else
        log_error "Docker Compose file not found"
    fi
}

test_documentation() {
    log_section "7. Documentation"
    
    local doc_files=(
        "README.md"
        "CHANGELOG.md"
        "docs/DATABASE.md"
        "docs/ARCHITECTURE.md"
        "docs/TENANTS_AND_DEPLOYMENT.md"
    )
    
    for file in "${doc_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            log_success "Documentation file $file exists"
        else
            log_error "Documentation file $file not found"
        fi
    done
}

test_scripts() {
    log_section "8. Utility Scripts (infra/scripts)"
    
    local script_files=(
        "infra/scripts/docker-manage.sh"
        "infra/scripts/db.py"
        "infra/scripts/setup-test-users.sh"
        "infra/scripts/sanity-test.sh"
    )
    
    for file in "${script_files[@]}"; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            log_success "Script $file exists"
            
            # Check if executable
            if [ -x "$PROJECT_ROOT/$file" ]; then
                log_success "Script $file is executable"
            else
                log_warning "Script $file is not executable (run: chmod +x $file)"
            fi
        else
            log_error "Script $file not found"
        fi
    done
}

test_api_endpoints() {
    log_section "9. Backend API Health Check (if running)"
    
    # Check if backend is running
    if curl -s http://localhost:8000/docs > /dev/null 2>&1; then
        log_success "Backend is running and accessible"
        
        # Test health endpoint (if exists)
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            log_success "Health endpoint is accessible"
        else
            log_warning "Health endpoint not found (optional)"
            ((TESTS_RUN++))
        fi
    else
        log_warning "Backend is not running (skipping API tests)"
        log_info "Start backend with: ./infra/scripts/docker-manage.sh start"
        ((TESTS_RUN++))
    fi
}

# Main test execution
main() {
    echo ""
    echo -e "${BLUE}╔═══════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BLUE}║                                                               ║${NC}"
    echo -e "${BLUE}║         CampusCircle Pre-Deployment Sanity Tests             ║${NC}"
    echo -e "${BLUE}║                                                               ║${NC}"
    echo -e "${BLUE}╚═══════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    test_env_file
    test_docker
    test_migrations
    test_backend
    test_frontend
    test_docker_compose
    test_documentation
    test_scripts
    test_api_endpoints
    
    # Summary
    log_section "Test Summary"
    echo -e "${BLUE}Total Tests Run:    ${TESTS_RUN}${NC}"
    echo -e "${GREEN}Tests Passed:       ${TESTS_PASSED}${NC}"
    echo -e "${RED}Tests Failed:       ${TESTS_FAILED}${NC}"
    echo ""
    
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${GREEN}║  ✅  ALL TESTS PASSED - Ready for Deployment!                ║${NC}"
        echo -e "${GREEN}╚═══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        log_info "Next steps:"
        echo "  1. Run DB: ./infra/scripts/run.sh db migrate   # then ./infra/scripts/run.sh db setup (demo users + super admin)"
        echo "  2. Or one-shot: ./infra/scripts/run.sh db setup # migrate + demo users + super admin"
        echo "  3. Deploy: ./infra/scripts/docker-manage.sh build && ./infra/scripts/docker-manage.sh dev"
        echo ""
        exit 0
    else
        echo -e "${RED}╔═══════════════════════════════════════════════════════════════╗${NC}"
        echo -e "${RED}║  ❌  TESTS FAILED - Fix issues before deployment             ║${NC}"
        echo -e "${RED}╚═══════════════════════════════════════════════════════════════╝${NC}"
        echo ""
        log_warning "Please address the failed tests before deploying"
        exit 1
    fi
}

# Run main function
main
