#!/bin/bash

# Build script для правильной сборки Encore сервисов с infra-config.json
# Согласно документации: encore build docker --config infra-config.json MY-IMAGE:TAG

set -e

echo "🔨 Building Encore services with infra-config.json..."

# Определяем конфигурационный файл
CONFIG_FILE="infra-config.json"

echo "📋 Using config file: $CONFIG_FILE"

# Определяем архитектуру
ARCH=$(uname -m)
if [ "$ARCH" = "arm64" ]; then
    PLATFORM="linux/arm64"
    echo "🔧 Detected Apple Silicon (ARM64), building for linux/arm64"
else
    PLATFORM="linux/amd64"
    echo "🔧 Detected x86_64, building for linux/amd64"
fi

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

echo "🏗️  Building services..."

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

echo "✅ All services built successfully!"
echo "🚀 Now you can run: docker-compose up -d"
