#!/bin/bash

# Local Development Deployment Script
# This script safely deploys changes locally for testing

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT="local"
DEPLOY_PATH=$(pwd)

# Logging function
log() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}✅ $1${NC}"
}

warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check if git is available
    if ! command -v git &> /dev/null; then
        error "Git is not installed"
        exit 1
    fi
    
    # Check if npm is available
    if ! command -v npm &> /dev/null; then
        error "NPM is not installed"
        exit 1
    fi
    
    success "Prerequisites check passed"
}

# Check git status
check_git_status() {
    log "Checking git status..."
    
    # Check if we have uncommitted changes
    if [[ -n $(git status --porcelain) ]]; then
        warning "You have uncommitted changes:"
        git status --short
        echo ""
        read -p "Continue with deployment? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Deployment cancelled. Please commit your changes first."
            exit 1
        fi
    else
        success "No uncommitted changes found"
    fi
    
    # Check if we're up to date with remote
    git fetch origin
    LOCAL_COMMIT=$(git rev-parse HEAD)
    REMOTE_COMMIT=$(git rev-parse origin/main)
    
    if [[ "$LOCAL_COMMIT" != "$REMOTE_COMMIT" ]]; then
        warning "Local branch is not up to date with remote"
        echo "Local:  $LOCAL_COMMIT"
        echo "Remote: $REMOTE_COMMIT"
        echo ""
        read -p "Pull latest changes? (y/N): " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git pull origin main
            success "Pulled latest changes"
        fi
    else
        success "Local branch is up to date with remote"
    fi
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Install backend dependencies
    log "Installing backend dependencies..."
    cd "$DEPLOY_PATH/backend"
    npm install
    
    # Install frontend dependencies
    log "Installing frontend dependencies..."
    cd "$DEPLOY_PATH/frontend"
    npm install
    
    success "Dependencies installed successfully"
}

# Build frontend
build_frontend() {
    log "Building frontend application..."
    
    cd "$DEPLOY_PATH/frontend"
    
    # Check if build script exists
    if ! grep -q "\"build\"" package.json; then
        error "Build script not found in package.json"
        exit 1
    fi
    
    # Run build
    npm run build
    
    # Check if build was successful
    if [ ! -d "dist" ]; then
        error "Frontend build failed - dist directory not found"
        exit 1
    fi
    
    success "Frontend built successfully"
}

# Test backend
test_backend() {
    log "Testing backend..."
    
    cd "$DEPLOY_PATH/backend"
    
    # Check if test script exists
    if grep -q "\"test\"" package.json; then
        log "Running backend tests..."
        npm test
        success "Backend tests passed"
    else
        warning "No test script found in backend package.json"
    fi
}

# Test frontend
test_frontend() {
    log "Testing frontend..."
    
    cd "$DEPLOY_PATH/frontend"
    
    # Check if test script exists
    if grep -q "\"test\"" package.json; then
        log "Running frontend tests..."
        npm test
        success "Frontend tests passed"
    else
        warning "No test script found in frontend package.json"
    fi
}

# Sync permissions
sync_permissions() {
    log "Syncing permissions..."
    
    cd "$DEPLOY_PATH/backend"
    
    # Check if sync script exists
    if grep -q "\"sync-permissions\"" package.json; then
        log "Running permission sync..."
        npm run sync-permissions:summary
        success "Permission sync completed"
    else
        warning "No sync-permissions script found in backend package.json"
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Check if backend is running
    if pgrep -f "node.*server.js" > /dev/null; then
        success "Backend process is running"
    else
        warning "Backend process is not running"
        log "To start backend: cd backend && npm start"
    fi
    
    # Check if frontend build exists
    if [ -d "frontend/dist" ]; then
        success "Frontend build exists"
    else
        error "Frontend build not found"
    fi
}

# Main deployment function
main() {
    log "🚀 Starting local development deployment..."
    
    # Check prerequisites
    check_prerequisites
    
    # Check git status
    check_git_status
    
    # Install dependencies
    install_dependencies
    
    # Build frontend
    build_frontend
    
    # Test applications
    test_backend
    test_frontend
    
    # Sync permissions
    sync_permissions
    
    # Health check
    health_check
    
    success "🎉 Local development deployment completed successfully!"
    
    log "Next steps:"
    log "1. Start backend: cd backend && npm start"
    log "2. Start frontend: cd frontend && npm run dev"
    log "3. Test the application"
    log "4. When ready, deploy to production using: ./scripts/deploy.sh production"
}

# Handle script arguments
case "${1:-}" in
    -h|--help)
        echo "Usage: $0"
        echo "Local development deployment script"
        echo "This script safely deploys changes locally for testing"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        error "Invalid argument: $1"
        echo "Usage: $0"
        exit 1
        ;;
esac
