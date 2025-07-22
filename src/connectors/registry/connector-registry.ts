import { DatabaseAdapter } from '../base/database-adapter';
import { SupabaseAdapter, SupabaseConfig } from '../supabase/supabase-adapter';
import type { ConnectionConfig } from '../../shared/types/connector';

/**
 * Connector factory interface for creating connector instances
 */
export interface ConnectorFactory {
  create(config: ConnectionConfig): Promise<DatabaseAdapter>;
  getType(): string;
}

/**
 * Supabase connector factory
 */
export class SupabaseConnectorFactory implements ConnectorFactory {
  getType(): string {
    return 'supabase';
  }

  async create(config: ConnectionConfig): Promise<DatabaseAdapter> {
    const supabaseConfig = config as SupabaseConfig;
    const adapter = new SupabaseAdapter(supabaseConfig);
    await adapter.connect();
    return adapter;
  }
}

/**
 * Connector registry for managing different types of database connectors
 * Implements the Factory pattern for connector creation
 */
export class ConnectorRegistry {
  private factories: Map<string, ConnectorFactory> = new Map();
  private instances: Map<string, DatabaseAdapter> = new Map();

  constructor() {
    // Register default connectors
    this.registerConnector('supabase', new SupabaseConnectorFactory());
  }

  /**
   * Register a connector factory
   * @param type Connector type name
   * @param factory Connector factory instance
   */
  registerConnector(type: string, factory: ConnectorFactory): void {
    this.factories.set(type, factory);
  }

  /**
   * Get a connector instance for a tenant
   * @param tenantId Tenant identifier
   * @param connectorType Type of connector to use
   * @param config Connection configuration
   * @returns Database adapter instance
   */
  async getConnector(
    tenantId: string,
    connectorType: string,
    config: ConnectionConfig
  ): Promise<DatabaseAdapter> {
    const cacheKey = `${tenantId}:${connectorType}`;

    // Return cached instance if available
    if (this.instances.has(cacheKey)) {
      const instance = this.instances.get(cacheKey)!;
      if (instance.isConnected()) {
        return instance;
      } else {
        // Remove disconnected instance from cache
        this.instances.delete(cacheKey);
      }
    }

    // Get factory for connector type
    const factory = this.factories.get(connectorType);
    if (!factory) {
      throw new Error(`Connector type '${connectorType}' not registered`);
    }

    // Create and cache new instance
    const connector = await factory.create(config);
    this.instances.set(cacheKey, connector);
    return connector;
  }

  /**
   * Get connector for tenant using tenant configuration
   * @param tenantId Tenant identifier
   * @param getTenantConfig Function to get tenant configuration
   * @returns Database adapter instance
   */
  async getConnectorForTenant(
    tenantId: string,
    getTenantConfig: (tenantId: string) => Promise<{
      connectorType: string;
      config: ConnectionConfig;
    }>
  ): Promise<DatabaseAdapter> {
    const tenantConfig = await getTenantConfig(tenantId);
    return this.getConnector(tenantId, tenantConfig.connectorType, tenantConfig.config);
  }

  /**
   * Remove a connector instance from cache
   * @param tenantId Tenant identifier
   * @param connectorType Connector type
   */
  async removeConnector(tenantId: string, connectorType: string): Promise<void> {
    const cacheKey = `${tenantId}:${connectorType}`;
    const instance = this.instances.get(cacheKey);

    if (instance) {
      await instance.disconnect();
      this.instances.delete(cacheKey);
    }
  }

  /**
   * Get all registered connector types
   * @returns Array of connector type names
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.factories.keys());
  }

  /**
   * Get statistics about cached connectors
   * @returns Statistics object
   */
  getStats(): {
    totalFactories: number;
    totalInstances: number;
    connectedInstances: number;
    instancesByType: Record<string, number>;
  } {
    const instancesByType: Record<string, number> = {};
    let connectedInstances = 0;

    for (const [key, instance] of this.instances.entries()) {
      const type = key.split(':')[1];
      instancesByType[type] = (instancesByType[type] || 0) + 1;

      if (instance.isConnected()) {
        connectedInstances++;
      }
    }

    return {
      totalFactories: this.factories.size,
      totalInstances: this.instances.size,
      connectedInstances,
      instancesByType,
    };
  }

  /**
   * Disconnect all connector instances
   */
  async disconnectAll(): Promise<void> {
    const disconnectPromises = Array.from(this.instances.values()).map((instance) =>
      instance.disconnect().catch((error) => console.error('Error disconnecting connector:', error))
    );

    await Promise.all(disconnectPromises);
    this.instances.clear();
  }
}
