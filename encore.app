{
	"id": "",
	"lang": "typescript",
	"services": {
		"api-gateway": { "path": "./services/api-gateway" },
		"extensions": { "path": "./services/extensions" }
	},
	"env": {
		"NODE_ENV": { "required": false, "default": "development" },
		"ADMIN_SUPABASE_URL": { "required": true },
		"ADMIN_SUPABASE_SERVICE_KEY": { "required": true },
		"TENANT_CONFIG": { "required": false }
	}
}
