# Backend Dockerfile
# Multi-stage build for optimized production image

# Development stage (includes dev dependencies for hot reload)
FROM node:20-alpine AS development

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install all dependencies (including dev dependencies)
# Note: No build tools needed - all packages are pure JavaScript
# If installation fails, uncomment the line below to add build tools
# RUN apk add --no-cache python3 make g++
RUN npm ci && npm cache clean --force

# Copy application source code
COPY . .

# Expose port
EXPOSE 3000

# Use nodemon for development hot reload
CMD ["npm", "run", "dev"]

# Production stage
FROM node:20-alpine AS production

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files first (for layer caching)
COPY package*.json ./

# Install production dependencies only
# Note: No build tools needed - all packages are pure JavaScript (bcryptjs, not bcrypt)
RUN npm ci --omit=dev && npm cache clean --force

# Copy application source code
COPY . .

# Change ownership to non-root user
RUN chown -R nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Expose port (default 3000, configurable via PORT env var)
EXPOSE 3000

# Health check endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start the application
CMD ["node", "src/app.js"]
