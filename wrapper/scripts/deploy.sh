#!/bin/bash

# Wrapper Application Deployment Script
# This script handles deployment to both staging and production environments

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-production}
DEPLOY_PATH="/home/ec2-user/Wrapper"
PM2_SERVICE_NAME="wrapper-api"
NGINX_SERVICE="nginx"

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

# Check if running as root
check_root() {
    if [[ $EUID -eq 0 ]]; then
        error "This script should not be run as root"
        exit 1
    fi
}

# Validate environment
validate_environment() {
    case $ENVIRONMENT in
        production|prod)
            ENVIRONMENT="production"
            DEPLOY_PATH="/home/ec2-user/Wrapper"
            PM2_SERVICE_NAME="wrapper-api"
            ;;
        staging|stage)
            ENVIRONMENT="staging"
            DEPLOY_PATH="/home/ec2-user/Wrapper-Staging"
            PM2_SERVICE_NAME="wrapper-api-staging"
            ;;
        *)
            error "Invalid environment: $ENVIRONMENT"
            error "Valid options: production, staging"
            exit 1
            ;;
    esac
    
    log "Deploying to $ENVIRONMENT environment"
    log "Deploy path: $DEPLOY_PATH"
    log "PM2 service: $PM2_SERVICE_NAME"
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
    
    # Check if pm2 is available
    if ! command -v pm2 &> /dev/null; then
        error "PM2 is not installed"
        exit 1
    fi
    
    # Check if nginx is available
    if ! command -v nginx &> /dev/null; then
        warning "Nginx is not installed or not in PATH"
    fi
    
    success "Prerequisites check passed"
}

# Backup current deployment
backup_deployment() {
    log "Creating backup of current deployment..."
    
    if [ -d "$DEPLOY_PATH" ]; then
        BACKUP_DIR="$DEPLOY_PATH-backup-$(date +%Y%m%d-%H%M%S)"
        cp -r "$DEPLOY_PATH" "$BACKUP_DIR"
        success "Backup created: $BACKUP_DIR"
    else
        warning "No existing deployment found to backup"
    fi
}

# Pull latest changes
pull_changes() {
    log "Pulling latest changes from git..."
    
    cd "$DEPLOY_PATH"
    
    # Check if git repository exists
    if [ ! -d ".git" ]; then
        error "Git repository not found in $DEPLOY_PATH"
        exit 1
    fi
    
    # Fetch latest changes
    git fetch origin
    
    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    log "Current branch: $CURRENT_BRANCH"
    
    # Pull changes
    git pull origin "$CURRENT_BRANCH"
    
    success "Git changes pulled successfully"
}

# Install dependencies
install_dependencies() {
    log "Installing dependencies..."
    
    # Install backend dependencies
    log "Installing backend dependencies..."
    cd "$DEPLOY_PATH/backend"
    npm ci --production
    
    # Install frontend dependencies
    log "Installing frontend dependencies..."
    cd "$DEPLOY_PATH/frontend"
    npm ci --production
    
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

# Restart backend service
restart_backend() {
    log "Restarting backend service..."
    
    cd "$DEPLOY_PATH"
    
    # Check if PM2 service exists
    if pm2 list | grep -q "$PM2_SERVICE_NAME"; then
        log "Restarting existing PM2 service: $PM2_SERVICE_NAME"
        pm2 restart "$PM2_SERVICE_NAME"
    else
        log "Starting new PM2 service: $PM2_SERVICE_NAME"
        cd backend
        pm2 start server.js --name "$PM2_SERVICE_NAME"
    fi
    
    # Save PM2 configuration
    pm2 save
    
    # Wait for service to be ready
    log "Waiting for service to be ready..."
    sleep 5
    
    # Check service status
    if pm2 list | grep -q "$PM2_SERVICE_NAME.*online"; then
        success "Backend service started successfully"
    else
        error "Backend service failed to start"
        pm2 logs "$PM2_SERVICE_NAME" --lines 20
        exit 1
    fi
}

# Reload nginx
reload_nginx() {
    log "Reloading nginx configuration..."
    
    if command -v nginx &> /dev/null; then
        # Test nginx configuration
        if sudo nginx -t; then
            # Reload nginx
            sudo systemctl reload nginx
            success "Nginx reloaded successfully"
        else
            error "Nginx configuration test failed"
            exit 1
        fi
    else
        warning "Nginx not found, skipping reload"
    fi
}

# Health check
health_check() {
    log "Performing health check..."
    
    # Wait for service to be fully ready
    sleep 10
    
    # Get local IP for health check
    LOCAL_IP=$(hostname -I | awk '{print $1}')
    
    # Check backend health
    log "Checking backend health..."
    if curl -f "http://$LOCAL_IP:3000/api/health" > /dev/null 2>&1; then
        success "Backend health check passed"
    else
        error "Backend health check failed"
        exit 1
    fi
    
    # Check frontend (if nginx is running)
    if command -v nginx &> /dev/null; then
        log "Checking frontend..."
        if curl -f "http://$LOCAL_IP/" > /dev/null 2>&1; then
            success "Frontend health check passed"
        else
            error "Frontend health check failed"
            exit 1
        fi
    fi
    
    success "Health check completed successfully"
}

# Cleanup
cleanup() {
    log "Cleaning up..."
    
    # Remove old backups (keep only last 3)
    if [ -d "$DEPLOY_PATH-backup-"* ]; then
        log "Removing old backups..."
        ls -dt "$DEPLOY_PATH-backup-"* | tail -n +4 | xargs -r rm -rf
        success "Old backups cleaned up"
    fi
    
    # Clear npm cache
    npm cache clean --force > /dev/null 2>&1 || true
    
    success "Cleanup completed"
}

# Main deployment function
main() {
    log "🚀 Starting deployment to $ENVIRONMENT environment..."
    
    # Validate environment
    validate_environment
    
    # Check prerequisites
    check_prerequisites
    
    # Create backup
    backup_deployment
    
    # Pull changes
    pull_changes
    
    # Install dependencies
    install_dependencies
    
    # Build frontend
    build_frontend
    
    # Restart backend
    restart_backend
    
    # Reload nginx
    reload_nginx
    
    # Health check
    health_check
    
    # Cleanup
    cleanup
    
    success "🎉 Deployment to $ENVIRONMENT completed successfully!"
    
    # Display service status
    log "Current PM2 services:"
    pm2 list
    
    # Display nginx status
    if command -v nginx &> /dev/null; then
        log "Nginx status:"
        sudo systemctl status nginx --no-pager -l
    fi
}

# Handle script arguments
case "${1:-production}" in
    -h|--help)
        echo "Usage: $0 [environment]"
        echo "Environments: production, staging"
        echo "Default: production"
        exit 0
        ;;
    production|prod|staging|stage)
        main
        ;;
    *)
        error "Invalid argument: $1"
        echo "Usage: $0 [environment]"
        echo "Environments: production, staging"
        exit 1
        ;;
esac
