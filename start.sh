#!/bin/bash

# Единый скрипт для сборки образов и запуска docker-compose
# Автоматизирует весь процесс: build -> up

set -e

echo "🚀 Starting SimplX Platform..."
echo "================================"

# Определяем конфигурационный файл
CONFIG_FILE="infra-config.json"
if [ "$NODE_ENV" = "production" ]; then
    CONFIG_FILE="infra-config.production.json"
fi

echo "📋 Using config file: $CONFIG_FILE"

# Проверяем наличие конфигурационного файла
if [ ! -f "$CONFIG_FILE" ]; then
    echo "❌ Error: Configuration file $CONFIG_FILE not found!"
    exit 1
fi

# Проверяем наличие Encore CLI
if ! command -v encore &> /dev/null; then
    echo "❌ Error: Encore CLI not found. Please install it first."
    echo "   Run: curl -L https://encore.dev/install.sh | bash"
    exit 1
fi

echo ""
echo "🏗️  Step 1: Building Docker images with Encore..."
echo "================================================"

# Сборка каждого сервиса с конфигурацией
echo "📦 Building tenant-management..."
encore build docker --config "$CONFIG_FILE" tenant-management:latest

echo "📦 Building user-management..."
encore build docker --config "$CONFIG_FILE" user-management:latest

echo "📦 Building data-processing..."
encore build docker --config "$CONFIG_FILE" data-processing:latest

echo "📦 Building event-management..."
encore build docker --config "$CONFIG_FILE" event-management:latest

echo "📦 Building gateway..."
encore build docker --config "$CONFIG_FILE" gateway:latest

echo ""
echo "✅ All images built successfully!"
echo ""
echo "🐳 Step 2: Starting services with Docker Compose..."
echo "=================================================="

# Запускаем docker-compose
docker-compose up -d

echo ""
echo "🎉 SimplX Platform started successfully!"
echo ""
echo "📊 Service Status:"
echo "=================="
docker-compose ps

echo ""
echo "🔗 Available endpoints:"
echo "======================"
echo "Gateway (Main API): http://localhost:4000"
echo "Tenant Management:  http://localhost:4001 (internal)"
echo "User Management:    http://localhost:4002 (internal)"
echo "Data Processing:    http://localhost:4003 (internal)"
echo "Event Management:   http://localhost:4004 (internal)"
echo ""
echo "📋 To view logs: docker-compose logs -f [service-name]"
echo "🛑 To stop: docker-compose down"
