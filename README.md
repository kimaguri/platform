# SimplX Platform - Modern Multi-Tenant Microservices

Modern multi-tenant microservices platform built on **Encore.ts** with advanced architecture, centralized configuration, connector system, and unified API Gateway.

## ✨ Key Features

- **🌐 Unified API Gateway** with centralized routing and monitoring
- **🔐 Centralized Authentication** via Encore.ts `authHandler`
- **🔌 Connector System** with adapter pattern for multiple databases
- **⚙️ Configuration Management** with type safety and validation
- **🏗️ Zonal Architecture** with shared utilities and middleware
- **🔒 Multi-Tenant Security** with strict tenant isolation
- **📊 Health Monitoring** and performance metrics
- **⚡ Caching & Rate Limiting** for optimal performance
- **🎯 TypeScript First** with comprehensive type safety

## 🏗 Architecture Overview

### New Service Structure

```
src/
├── config/                     # Centralized configuration system
├── connectors/                 # Database adapter pattern
│   ├── base/                   # Abstract adapters
│   ├── supabase/              # Supabase implementation
│   └── registry/              # Connector factory & resolver
├── gateway/                   # API Gateway service
│   ├── routing/               # Service route definitions
│   ├── middleware/            # Gateway-specific middleware
│   └── src/handlers/          # Health & metrics endpoints
├── services/                  # Business microservices
│   ├── tenant-management/     # Tenant CRUD & configuration
│   ├── user-management/       # Authentication & user profiles
│   └── content-management/    # Entity CRUD with connectors
└── shared/                    # Shared utilities & middleware
    ├── middleware/            # Auth, tenant, performance
    ├── types/                 # Common type definitions
    └── utilities/             # Helpers & validation
```

### Microservices

1. **API Gateway** (`src/gateway/`)

   - Centralized request routing
   - Health monitoring & metrics
   - Cross-cutting concerns (CORS, rate limiting)
   - Service discovery and load balancing

2. **Tenant Management** (`src/services/tenant-management/`)

   - Tenant CRUD operations
   - Configuration management
   - Admin database operations

3. **User Management** (`src/services/user-management/`)

   - Authentication (login, register, logout)
   - User profile management
   - Role-based access control

4. **Content Management** (`src/services/content-management/`)
   - Generic entity CRUD operations
   - Connector system integration
   - Multi-tenant data isolation

### Connector System

```typescript
// Unified database access through adapter pattern
const connector = await registry.getConnectorForTenant(tenantId, getTenantConfig);
const data = await connector.query<User>('users', { filter: { active: true } });

// Support for multiple database types
- Supabase (default)
- PostgreSQL (planned)
- Custom connectors (extensible)
```

### Configuration Management

```typescript
// Centralized, type-safe configuration
import { config } from '@config';

const appConfig = await config.app();
const serviceConfig = await config.services();
const connectorConfig = await config.connectors();

// Environment variable validation
const validation = validateEnvironment();
if (!validation.valid) {
  console.error(validation.errors);
}
```

### Authentication System

```typescript
// Multi-tenant authentication with JWT, API keys, sessions
interface AuthParams {
  authorization?: Header<'Authorization'>;
  tenantId: Header<'X-Tenant-ID'>;
}

export const auth = authHandler<AuthParams, AuthData>(async (params) => {
  // Automatic authentication for all token types
  // Tenant validation and context injection
});
```

### Middleware Stack

```typescript
// Layered middleware for cross-cutting concerns
export default new Service('service-name', {
  middlewares: [
    performanceMiddleware, // Request timing & monitoring
    cachingMiddleware, // Response caching
    tenantValidationMiddleware, // Multi-tenant security
    rateLimitMiddleware, // Rate limiting
  ],
});
```

## 🚀 API Endpoints

### API Gateway (`/api/v1/`)

**Health & Monitoring:**

- `GET /health` - System health check
- `GET /health/:service` - Service-specific health
- `GET /metrics` - Performance metrics
- `GET /metrics/summary` - Metrics summary

**Tenant Management:**

- `GET /tenants` - List tenants
- `GET /tenants/:id` - Get tenant
- `POST /tenants` - Create tenant
- `PUT /tenants/:id` - Update tenant
- `DELETE /tenants/:id` - Delete tenant

**User Management:**

- `POST /auth/login` - User login
- `POST /auth/register` - User registration
- `POST /auth/logout` - User logout
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update profile

**Content Management:**

- `GET /entities/:type` - List entities
- `GET /entities/:type/:id` - Get entity
- `POST /entities/:type` - Create entity
- `PUT /entities/:type/:id` - Update entity
- `DELETE /entities/:type/:id` - Delete entity

## 🔧 Configuration

### Environment Variables

The platform uses comprehensive environment configuration:

```bash
# Application
NODE_ENV=development
PORT=4000
LOG_LEVEL=debug

# Database
ADMIN_SUPABASE_URL=https://your-project.supabase.co
ADMIN_SUPABASE_SERVICE_KEY=your-service-key
TENANT_CONFIG={"tenant1": {"SUPABASE_URL": "...", "ANON_KEY": "..."}}

# Features
ENABLE_METRICS=true
ENABLE_CACHING=true
ENABLE_RATE_LIMITING=true

# Performance
REQUEST_TIMEOUT=30000
RATE_LIMIT_REQUESTS=100
```

See `env.example` for complete configuration options.

### TypeScript Path Mapping

```typescript
// Convenient imports with path mapping
import { auth } from '@shared/middleware/auth/auth-handler';
import { config } from '@config';
import { DatabaseAdapter } from '@connectors/base/database-adapter';
import { TenantService } from '@services/tenant-management';
```
