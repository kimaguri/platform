<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Полный поэтапный гайд по разработке record-сервисов на Encore TS и хранению секретов в GitHub

**Краткий вывод:**
Запуск инфраструктуры record-сервисов включает три ключевых компонента:

1) **API Gateway** на Encore TS для маршрутизации и авторизации;
2) **Extensions-микросервис** на Encore TS для CRUD операций над сущностями с JSONB-полями;
3) **Секреты и конфигурации** в GitHub Secrets и безопасный доступ из кода.

Далее приводится пошаговый рецепт реализации, начиная с настройки репозитория GitHub и заканчивая деплоем для нескольких тенантов.

## Этап 1. Настройка репозитория и CI/CD в GitHub

1. Создайте в GitHub репозиторий `my-multitenant-app`.
2. В разделе **Settings → Secrets and variables → Actions** добавьте секреты:
    - `TENANT_CONFIG` – JSON-маппинг tenantId → {SUPABASE_URL, ANON_KEY, SERVICE_KEY}.
    - `SUPABASE_ORG_TOKEN` – токен для управления проектами Supabase (если автоматизируете создание).
    - Любые другие сервисные ключи (например, Sentry DSN, Redis URL и т. д.).
3. Подготовьте workflow `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install dependencies
        run: npm ci

      - name: Build services
        run: npm run build

      - name: Deploy to production
        env:
          TENANT_CONFIG: ${{ secrets.TENANT_CONFIG }}
        run: |
          npm run deploy  # ваша команда деплоя через Encore CLI
```


## Этап 2. Структура проекта и общие утилиты

```
my-multitenant-app/
├─ services/
│  ├─ api-gateway/          # Encore TS Gateway
│  └─ extensions/           # Encore TS record-сервис
├─ src/
│  └─ shared/               # общие типы и утилиты
├─ encore.config.ts
├─ package.json
└─ tsconfig.json
```


### 2.1. `encore.config.ts`

```ts
import { Config } from "encore.dev";

export default {
  services: {
    "api-gateway": { path: "./services/api-gateway" },
    "extensions":  { path: "./services/extensions"  },
  },
  env: {
    TENANT_CONFIG: { required: true },   // JSON со всеми tenant’ами
    NODE_ENV:       { required: true },
  }
} as Config;
```


### 2.2. Общие утилиты (`src/shared/`)

- **Парсинг конфигурации тенантов**

```ts
// src/shared/tenantConfig.ts
export type TenantConfig = Record<
  string,
  { SUPABASE_URL: string; ANON_KEY: string; SERVICE_KEY: string }
>;

export const getTenantConfig = (): TenantConfig =>
  JSON.parse(process.env.TENANT_CONFIG!);
```

- **Инициализация Supabase-клиента**

```ts
// src/shared/supabaseClient.ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getTenantConfig } from "./tenantConfig";

export function getSupabaseClient(tenantId: string): SupabaseClient {
  const cfg = getTenantConfig()[tenantId];
  return createClient(cfg.SUPABASE_URL, cfg.SERVICE_KEY);
}
```


## Этап 3. Реализация API Gateway

1. **Middleware для определения tenantId**

```ts
// services/api-gateway/src/tenantMiddleware.ts
import type { Middleware } from "encore.dev/api";

export const tenantMiddleware: Middleware = async (req, res, next) => {
  const tenantId = req.headers["x-tenant-id"] as string;
  if (!tenantId) throw new Error("Tenant ID is required");
  req.context = { ...req.context, tenantId };
  next();
};
```

2. **Эндпоинт `/config`** (передаёт фронтенду URL и anonKey)

```ts
// services/api-gateway/src/config.ts
import { api } from "encore.dev/api";
import { getTenantConfig } from "../../src/shared/tenantConfig";

export const getConfig = api(
  { method: "GET", path: "/config", middlewares: [tenantMiddleware], expose: true },
  ({}, req) => {
    const { SUPABASE_URL, ANON_KEY } = getTenantConfig()[req.context.tenantId];
    return { url: SUPABASE_URL, anonKey: ANON_KEY };
  }
);
```

3. **Auth-проксирование** (если нужно создавать сессии через Supabase Auth):

```ts
// services/api-gateway/src/auth.ts
import { api } from "encore.dev/api";
import { getSupabaseClient } from "../../src/shared/supabaseClient";

export const login = api(
  { method: "POST", path: "/login", expose: true },
  async ({ email, password }, req) => {
    const supabase = getSupabaseClient(req.context.tenantId);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    return { accessToken: data.session?.access_token };
  }
);
```


## Этап 4. Реализация Extensions-микросервиса

1. **Модель таблицы определений** (`extensions_definitions`):

```sql
CREATE TABLE extensions_definitions (
  id           BIGSERIAL PRIMARY KEY,
  tenant_id    INT NOT NULL,
  entity_type  TEXT NOT NULL,
  field_name   TEXT NOT NULL,
  field_type   TEXT NOT NULL,
  field_config JSONB DEFAULT '{}',
  is_required  BOOLEAN DEFAULT FALSE,
  is_indexed   BOOLEAN DEFAULT FALSE,
  display_order INT DEFAULT 0,
  UNIQUE (tenant_id, entity_type, field_name)
);
```

2. **Endpoints Definitions**:

```ts
// services/extensions/src/definitions.ts
import { api } from "encore.dev/api";
import { getSupabaseClient } from "../../src/shared/supabaseClient";

export const listDefs = api(
  { method: "GET", path: "/definitions", auth: true, middlewares: [tenantMiddleware] },
  async ({}, req) => {
    const db = getSupabaseClient(req.context.tenantId);
    const { data, error } = await db
      .from("extensions_definitions")
      .select("*");
    if (error) throw new Error(error.message);
    return data;
  }
);

export const createDef = api(
  { method: "POST", path: "/definitions", auth: true, middlewares: [tenantMiddleware] },
  async (body, req) => {
    const db = getSupabaseClient(req.context.tenantId);
    const { data, error } = await db
      .from("extensions_definitions")
      .insert(body)
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
);
```

3. **Endpoints Entities** (generic CRUD по имени сущности):

```ts
// services/extensions/src/entities.ts
import { api } from "encore.dev/api";
import { getSupabaseClient } from "../../src/shared/supabaseClient";

export const upsertEntity = api(
  { method: "POST", path: "/:entity", auth: true, middlewares: [tenantMiddleware] },
  async ({ entity }, payload, req) => {
    const db = getSupabaseClient(req.context.tenantId);
    const { data, error } = await db
      .from(entity)
      .upsert(payload, { onConflict: "id" })
      .single();
    if (error) throw new Error(error.message);
    return data;
  }
);

export const listEntities = api(
  { method: "GET", path: "/:entity", auth: true, middlewares: [tenantMiddleware] },
  async ({ entity }, {}, req) => {
    const db = getSupabaseClient(req.context.tenantId);
    const { data, error } = await db
      .from(entity)
      .select("*");
    if (error) throw new Error(error.message);
    return data;
  }
);
```


## Этап 5. Хранение и безопасный доступ к переменным

1. **GitHub Secrets**
    - Все ключи Supabase (anon \& service) и JSON с конфигом хранятся в **GitHub Actions Secrets**.
    - В код не добавляются напрямую.
2. **Передача на прод**
    - При деплое через GitHub Actions переменные подставляются в окружение сервиса.
    - Encore разворачивает сервисы с этими env-переменными.
3. **На фронтенде**
    - Доступен только эндпоинт `/config`, который возвращает anonKey и URL.
    - Сервисный ключ никогда не передаётся клиенту.

## Этап 6. Использование SubBot (для прочего бэкенд-функционала)

- **SubBot** (или другое серверное решение) может подключаться к API Gateway для фоновых задач: отправка почты, вебхуки, очереди.
- В SubBot используйте те же шаблоны для инициализации Supabase-клиента и настройки tenantId через заголовки.


## Этап 7. Итоговые рекомендации и проверка

1. Последовательно прогоните сценарии в локальном окружении (`npm run dev` через Encore CLI).
2. Проверьте работу маршрутов `/config`, `/login`, `/definitions`, `/:entity`.
3. Настройте мониторинг и логи (Sentry, Datadog).
4. Убедитесь, что GitHub Secrets корректно подгружаются в CI/CD.
5. Документируйте для команды фронтенда использование `/config` и data provider в refine.dev.

Этот пошаговый гайд позволит создать **гибкий**, **безопасный** и **масштабируемый** стек record-сервисов на Encore TS с хранением секретов в GitHub.

