#!/bin/bash

# Скрипт для остановки SimplX Platform

echo "🛑 Stopping SimplX Platform..."
echo "=============================="

# Останавливаем и удаляем контейнеры
docker-compose down

echo ""
echo "📊 Checking remaining containers..."
docker-compose ps

echo ""
echo "✅ SimplX Platform stopped successfully!"
echo ""
echo "💡 To start again: ./start.sh"
echo "🧹 To clean up images: docker image prune"
