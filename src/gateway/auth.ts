import { APIError, Header } from 'encore.dev/api';
import { getConnector } from '../connectors/factory';

// Типы для аутентификации
interface AuthRequest {
  tenantId: Header<'X-Tenant-ID'>;
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  user?: {
    id: string;
    email: string;
  };
  session?: {
    access_token: string;
    refresh_token: string;
  };
  error?: string;
  message: string;
}

// Удалены дублирующиеся login и logout эндпоинты
// Они должны быть только в user-management сервисе

// Вспомогательные функции остаются для внутреннего использования
async function hashPassword(password: string): Promise<string> {
  // Простое хеширование для демонстрации
  // В продакшене используйте bcrypt или подобную библиотеку
  return `hashed_${password}`;
}

async function validatePassword(password: string, hashedPassword: string): Promise<boolean> {
  const hashed = await hashPassword(password);
  return hashed === hashedPassword;
}
