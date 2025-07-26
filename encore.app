{
	"id": "",
	"lang": "typescript",
	"services": {
		"api-gateway": { "path": "./src/gateway" },
		"tenant-management": { "path": "./src/services/tenant-management" },
		"user-management": { "path": "./src/services/user-management" },
		"data-processing": { "path": "./src/services/data-processing" }
	},
	"env": {
		"NODE_ENV": { "required": false, "default": "development" },
		"PORT": { "required": false, "default": "4000" },
		"HOST": { "required": false, "default": "0.0.0.0" },
		"LOG_LEVEL": { "required": false, "default": "debug" },
		
		"ADMIN_SUPABASE_URL": { "required": true },
		"ADMIN_SUPABASE_SERVICE_KEY": { "required": true },
		
		"CORS_ORIGINS": { "required": false, "default": "[\"http://localhost:3000\", \"http://localhost:5173\"]" },
		"LOG_FORMAT": { "required": false, "default": "json" },
		
		"ENABLE_METRICS": { "required": false, "default": "true" },
		"ENABLE_HEALTH_CHECKS": { "required": false, "default": "true" },
		"ENABLE_CACHING": { "required": false, "default": "true" },
		"ENABLE_RATE_LIMITING": { "required": false, "default": "true" },
		
		"REQUEST_TIMEOUT": { "required": false, "default": "30000" },
		"MAX_CONNECTIONS": { "required": false, "default": "1000" },
		"RATE_LIMIT_REQUESTS": { "required": false, "default": "100" },
		"RATE_LIMIT_WINDOW": { "required": false, "default": "60000" },
		
		"DEFAULT_CONNECTOR": { "required": false, "default": "supabase" },
		"SUPABASE_CONNECTOR_ENABLED": { "required": false, "default": "true" },
		"SUPABASE_POOL_SIZE": { "required": false, "default": "10" },
		"SUPABASE_TIMEOUT": { "required": false, "default": "30000" },
		"SUPABASE_AUTO_REFRESH": { "required": false, "default": "false" },
		"SUPABASE_PERSIST_SESSION": { "required": false, "default": "false" },
		
		"GATEWAY_PREFIX": { "required": false, "default": "/api" },
		"GATEWAY_VERSION": { "required": false, "default": "v1" },
		"GATEWAY_ENABLE_PROXY": { "required": false, "default": "true" }
	}
}
