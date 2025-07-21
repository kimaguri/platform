#!/bin/bash

# Скрипт для запуска Encore с переменными окружения

export NODE_ENV=development

# Административная база данных
export ADMIN_SUPABASE_URL=https://zshakbdzhwxfxzyqtizl.supabase.co
export ADMIN_SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpzaGFrYmR6aHd4Znh6eXF0aXpsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzExMzk0OSwiZXhwIjoyMDY4Njg5OTQ5fQ.c67jAz_5TLnq7GY9hega04v1M7Jv0OiTrVfBlPBiEPI

echo "🚀 Запуск Encore с переменными окружения..."
echo "📊 Admin DB: $ADMIN_SUPABASE_URL"
echo "🔑 Service Key: ${ADMIN_SUPABASE_SERVICE_KEY:0:20}..."
echo ""

# Запуск Encore
encore run --port 4000 