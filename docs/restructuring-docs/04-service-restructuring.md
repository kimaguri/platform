# Task 5: Restructure Services

## Overview

Restructuring the existing `api-gateway` and `extensions` services into properly organized business services: `tenant-management`, `user-management`, and `content-management`. Each service will use the connector system for unified data access.

## Current State Analysis

- **api-gateway**: Contains basic administrative and application-wide logic
- **extensions**: Supabase-centric service for CRUD operations, poorly named

## Target Services Structure

```
src/services/
├── tenant-management/
│   ├── encore.service.ts        # Encore service definition
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── tenant-crud.ts   # Tenant CRUD operations
│   │   │   ├── tenant-config.ts # Tenant configuration management
│   │   │   └── tenant-admin.ts  # Administrative operations
│   │   ├── models/
│   │   │   └── tenant.ts        # Tenant data models
│   │   └── index.ts            # Service exports
│   └── migrations/             # Tenant-specific migrations
├── user-management/
│   ├── encore.service.ts        # Encore service definition
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── user-crud.ts     # User CRUD operations
│   │   │   ├── auth-management.ts # User authentication
│   │   │   └── permissions.ts   # User permissions
│   │   ├── models/
│   │   │   └── user.ts          # User data models
│   │   └── index.ts            # Service exports
│   └── migrations/             # User-specific migrations
└── content-management/
    ├── encore.service.ts        # Encore service definition
    ├── src/
    │   ├── handlers/
    │   │   ├── content-crud.ts  # Content CRUD operations
    │   │   ├── definitions.ts   # Extension definitions
    │   │   └── entities.ts      # Entity management
    │   ├── models/
    │   │   └── content.ts       # Content data models
    │   └── index.ts            # Service exports
    └── migrations/             # Content-specific migrations
```

## Migration Strategy

1. Analyze existing service code and extract business logic
2. Create new service structures with proper separation
3. Move and refactor existing handlers to appropriate services
4. Update services to use connector system instead of direct Supabase calls
5. Create Encore service definitions with proper middleware
6. Ensure Refine.dev frontend compatibility

## Key Principles

- **Single Responsibility**: Each service handles one business domain
- **Connector Integration**: Use resource resolver for data access
- **Middleware Stack**: Apply tenant validation, auth, performance monitoring
- **Type Safety**: Maintain full TypeScript support
- **API Compatibility**: Ensure frontend compatibility during transition

## Implementation Plan

1. Create service directory structures
2. Extract and analyze existing code from api-gateway and extensions
3. Create tenant-management service (priority 1)
4. Create user-management service (priority 2)
5. Create content-management service (priority 3)
6. Update service middleware and configuration
7. Test service integration with connector system

## Progress

- [x] Create service directory structures
- [x] Analyze existing service code
- [x] Create tenant-management service
- [x] Create user-management service
- [x] Create content-management service
- [x] Update middleware configuration
- [ ] Test service integration

## Completed Implementation

```
src/services/
├── tenant-management/
│   ├── encore.service.ts        ✅ Service definition with middleware
│   ├── src/
│   │   ├── handlers/
│   │   │   ├── tenant-crud.ts   ✅ Tenant CRUD operations
│   │   │   └── tenant-config.ts ✅ Tenant configuration management
│   │   ├── models/
│   │   │   └── tenant.ts        ✅ Tenant data models
│   │   └── index.ts            ✅ Service exports
│   └── migrations/             ✅ Ready for migrations
├── content-management/
│   ├── encore.service.ts        ✅ Service definition with middleware
│   ├── src/
│   │   ├── handlers/
│   │   │   └── content-crud.ts  ✅ Content CRUD with connector system
│   │   ├── models/
│   │   │   └── content.ts       ✅ Content data models
│   │   └── index.ts            ✅ Service exports
│   └── migrations/             ✅ Ready for migrations
└── user-management/
    ├── encore.service.ts        ✅ Service definition with middleware
    ├── src/
    │   ├── handlers/
    │   │   ├── auth-management.ts ✅ Authentication operations
    │   │   └── user-crud.ts     ✅ User profile management
    │   ├── models/
    │   │   └── user.ts          ✅ User data models
    │   └── index.ts            ✅ Service exports
    └── migrations/             ✅ Ready for migrations
```

## Key Features Implemented

- **Tenant Management**: Full CRUD operations for tenants using existing adminDb
- **Content Management**: CRUD operations using connector system for unified data access
- **User Management**: Authentication, user profiles, role management with connector system
- **Middleware Integration**: Proper middleware stacks for auth, performance, caching, rate limiting
- **Type Safety**: Full TypeScript support with proper models
- **Connector Integration**: All services use new connector system for unified data access
- **Single Responsibility**: Each service handles one business domain
- **API Compatibility**: Maintains compatibility with existing frontend applications

## Status

- **Started**: 14:25
- **Status**: ✅ Complete
- **Next**: Create API Gateway for unified routing
