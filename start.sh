#!/bin/bash

# SimplX Platform - Startup Script
# Sets up environment variables and starts the Encore.ts application

echo "🚀 Starting SimplX Platform..."

# ===== REQUIRED ADMIN DATABASE CONFIGURATION =====
# These MUST be set in your environment
if [ -z "$ADMIN_SUPABASE_URL" ]; then
    echo "❌ ERROR: ADMIN_SUPABASE_URL environment variable is required"
    echo "   Set it with: export ADMIN_SUPABASE_URL=https://your-admin-project.supabase.co"
    exit 1
fi

if [ -z "$ADMIN_SUPABASE_SERVICE_KEY" ]; then
    echo "❌ ERROR: ADMIN_SUPABASE_SERVICE_KEY environment variable is required"
    echo "   Set it with: export ADMIN_SUPABASE_SERVICE_KEY=your-service-key"
    exit 1
fi

# ===== OPTIONAL CONFIGURATION WITH DEFAULTS =====
export NODE_ENV=${NODE_ENV:-development}
export PORT=${PORT:-4000}
export HOST=${HOST:-0.0.0.0}
export LOG_LEVEL=${LOG_LEVEL:-debug}
export LOG_FORMAT=${LOG_FORMAT:-json}

# CORS Configuration
export CORS_ORIGINS=${CORS_ORIGINS:-'["http://localhost:3000", "http://localhost:5173", "http://localhost:3001"]'}

# Feature Flags
export ENABLE_METRICS=${ENABLE_METRICS:-true}
export ENABLE_HEALTH_CHECKS=${ENABLE_HEALTH_CHECKS:-true}
export ENABLE_CACHING=${ENABLE_CACHING:-true}
export ENABLE_RATE_LIMITING=${ENABLE_RATE_LIMITING:-true}
export ENABLE_CONSOLE_LOGGING=${ENABLE_CONSOLE_LOGGING:-true}

# Performance Settings
export REQUEST_TIMEOUT=${REQUEST_TIMEOUT:-30000}
export MAX_CONNECTIONS=${MAX_CONNECTIONS:-1000}
export RATE_LIMIT_REQUESTS=${RATE_LIMIT_REQUESTS:-100}
export RATE_LIMIT_WINDOW=${RATE_LIMIT_WINDOW:-60000}

# Connector Configuration
export DEFAULT_CONNECTOR=${DEFAULT_CONNECTOR:-supabase}
export SUPABASE_CONNECTOR_ENABLED=${SUPABASE_CONNECTOR_ENABLED:-true}
export SUPABASE_POOL_SIZE=${SUPABASE_POOL_SIZE:-10}
export SUPABASE_TIMEOUT=${SUPABASE_TIMEOUT:-30000}
export SUPABASE_AUTO_REFRESH=${SUPABASE_AUTO_REFRESH:-false}
export SUPABASE_PERSIST_SESSION=${SUPABASE_PERSIST_SESSION:-false}

# Service Configuration
export TENANT_SERVICE_ENABLED=${TENANT_SERVICE_ENABLED:-true}
export USER_SERVICE_ENABLED=${USER_SERVICE_ENABLED:-true}
export CONTENT_SERVICE_ENABLED=${CONTENT_SERVICE_ENABLED:-true}

# API Gateway Configuration
export GATEWAY_PREFIX=${GATEWAY_PREFIX:-/api}
export GATEWAY_VERSION=${GATEWAY_VERSION:-v1}
export GATEWAY_ENABLE_PROXY=${GATEWAY_ENABLE_PROXY:-true}

# Health Check Configuration
export SUPABASE_HEALTH_CHECK=${SUPABASE_HEALTH_CHECK:-true}
export SUPABASE_HEALTH_INTERVAL=${SUPABASE_HEALTH_INTERVAL:-30000}

echo "✅ Environment variables configured"
echo "🔗 Admin DB: ${ADMIN_SUPABASE_URL}"
echo "🌍 Environment: ${NODE_ENV}"
echo "🚪 Port: ${PORT}"

# ===== TENANT_CONFIG EXPLANATION =====
echo ""
echo "ℹ️  NOTE: TENANT_CONFIG is NOT set via environment variables"
echo "   Tenant configurations are loaded dynamically from the admin database:"
echo "   - Database: simplx_crm_tenant (${ADMIN_SUPABASE_URL})"
echo "   - Table: tenant_supabase_configs"
echo "   - Each tenant has separate Supabase project credentials stored in DB"
echo ""

# Start Encore.ts application
echo "🎯 Starting Encore.ts application..."
encore run 