# Task 3: Migrate Shared Components

## Overview

Moving shared components to zonal structure using console commands for file movement. Reorganizing existing shared files into the new utilities/, middleware/, types/ structure.

## Current Shared Files

```
src/shared/
├── adminDb/
│   ├── client.ts
│   └── types.ts
├── auth.ts
├── middleware.ts
├── performance.ts
├── secrets.ts
├── supabaseClient.ts
├── tenantConfig.ts
├── types.ts
└── validation.ts
```

## Target Organization

```
src/shared/
├── utilities/
│   ├── helpers/
│   │   ├── performance.ts        # From src/shared/performance.ts
│   │   └── secrets.ts           # From src/shared/secrets.ts
│   ├── validation/
│   │   └── validation.ts        # From src/shared/validation.ts
│   └── constants/
│       └── (new constants)
├── middleware/
│   ├── auth/
│   │   └── auth-handler.ts      # From src/shared/auth.ts
│   ├── tenant/
│   │   └── tenant-middleware.ts # Extract from src/shared/middleware.ts
│   └── logging/
│       └── (new logging middleware)
├── types/
│   ├── common.ts               # From src/shared/types.ts
│   ├── tenant.ts               # Extract tenant types
│   └── connector.ts            # New connector types
├── adminDb/                    # Keep as is
│   ├── client.ts
│   └── types.ts
├── supabaseClient.ts          # Keep for now, will move to connectors later
└── tenantConfig.ts            # Keep for now, will refactor later
```

## Migration Plan

1. Move performance.ts to utilities/helpers/
2. Move secrets.ts to utilities/helpers/
3. Move validation.ts to utilities/validation/
4. Move auth.ts to middleware/auth/auth-handler.ts
5. Extract tenant middleware from middleware.ts to middleware/tenant/
6. Refactor types.ts into specific type files
7. Create new connector types

## Progress

- [x] Move utilities files
- [x] Move middleware files
- [x] Reorganize types
- [x] Create new type files
- [ ] Update imports in existing files (will be done during service restructuring)

## Completed Structure

```
src/shared/
├── utilities/
│   ├── helpers/
│   │   ├── performance.ts              ✅ Moved
│   │   ├── secrets.ts                  ✅ Moved
│   │   └── performance-middleware.ts   ✅ Created
│   └── validation/
│       └── validation.ts               ✅ Moved
├── middleware/
│   ├── auth/
│   │   ├── auth-handler.ts             ✅ Moved from auth.ts
│   │   └── rate-limiting.ts            ✅ Created
│   ├── tenant/
│   │   └── tenant-validation.ts        ✅ Created
│   └── index.ts                        ✅ Created
├── types/
│   ├── common.ts                       ✅ Created from types.ts
│   ├── tenant.ts                       ✅ Created from types.ts
│   ├── connector.ts                    ✅ Created (new)
│   └── index.ts                        ✅ Created
├── adminDb/                            ✅ Kept as is
├── supabaseClient.ts                   ✅ Kept for now
├── tenantConfig.ts                     ✅ Kept for now
└── middleware.ts                       ⚠️ Will be removed after import updates
```

## Status

- **Started**: 14:05
- **Status**: ✅ Complete
- **Next**: Create connector system
