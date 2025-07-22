import { ConnectorRegistry } from './connector-registry';
import type { QueryParams } from '../../shared/types/connector';

/**
 * Resource resolver providing unified access to resources across different connectors
 * Abstracts the underlying connector implementation from business logic
 */
export class ResourceResolver {
  constructor(private registry: ConnectorRegistry) {}

  /**
   * Get resources from a table/collection
   * @param tenantId Tenant identifier
   * @param resourceName Resource/table name
   * @param params Query parameters
   * @param getTenantConfig Function to get tenant configuration
   * @returns Array of resources
   */
  async getResource<T>(
    tenantId: string,
    resourceName: string,
    params: QueryParams | undefined,
    getTenantConfig: (tenantId: string) => Promise<{
      connectorType: string;
      config: any;
    }>
  ): Promise<T[]> {
    const connector = await this.registry.getConnectorForTenant(tenantId, getTenantConfig);
    return connector.query<T>(resourceName, params);
  }

  /**
   * Create a new resource
   * @param tenantId Tenant identifier
   * @param resourceName Resource/table name
   * @param data Resource data
   * @param getTenantConfig Function to get tenant configuration
   * @returns Created resource
   */
  async createResource<T>(
    tenantId: string,
    resourceName: string,
    data: T,
    getTenantConfig: (tenantId: string) => Promise<{
      connectorType: string;
      config: any;
    }>
  ): Promise<T> {
    const connector = await this.registry.getConnectorForTenant(tenantId, getTenantConfig);
    return connector.insert<T>(resourceName, data);
  }

  /**
   * Create multiple resources
   * @param tenantId Tenant identifier
   * @param resourceName Resource/table name
   * @param data Array of resource data
   * @param getTenantConfig Function to get tenant configuration
   * @returns Created resources
   */
  async createManyResources<T>(
    tenantId: string,
    resourceName: string,
    data: T[],
    getTenantConfig: (tenantId: string) => Promise<{
      connectorType: string;
      config: any;
    }>
  ): Promise<T[]> {
    const connector = await this.registry.getConnectorForTenant(tenantId, getTenantConfig);
    return connector.insertMany<T>(resourceName, data);
  }

  /**
   * Update a resource by ID
   * @param tenantId Tenant identifier
   * @param resourceName Resource/table name
   * @param id Resource ID
   * @param data Data to update
   * @param getTenantConfig Function to get tenant configuration
   * @returns Updated resource
   */
  async updateResource<T>(
    tenantId: string,
    resourceName: string,
    id: string,
    data: Partial<T>,
    getTenantConfig: (tenantId: string) => Promise<{
      connectorType: string;
      config: any;
    }>
  ): Promise<T> {
    const connector = await this.registry.getConnectorForTenant(tenantId, getTenantConfig);
    return connector.update<T>(resourceName, id, data);
  }

  /**
   * Upsert a resource (insert or update)
   * @param tenantId Tenant identifier
   * @param resourceName Resource/table name
   * @param data Resource data
   * @param conflictColumns Columns to check for conflicts
   * @param getTenantConfig Function to get tenant configuration
   * @returns Upserted resource
   */
  async upsertResource<T>(
    tenantId: string,
    resourceName: string,
    data: T,
    conflictColumns: string[] | undefined,
    getTenantConfig: (tenantId: string) => Promise<{
      connectorType: string;
      config: any;
    }>
  ): Promise<T> {
    const connector = await this.registry.getConnectorForTenant(tenantId, getTenantConfig);
    return connector.upsert<T>(resourceName, data, conflictColumns);
  }

  /**
   * Delete a resource by ID
   * @param tenantId Tenant identifier
   * @param resourceName Resource/table name
   * @param id Resource ID
   * @param getTenantConfig Function to get tenant configuration
   * @returns Success status
   */
  async deleteResource(
    tenantId: string,
    resourceName: string,
    id: string,
    getTenantConfig: (tenantId: string) => Promise<{
      connectorType: string;
      config: any;
    }>
  ): Promise<boolean> {
    const connector = await this.registry.getConnectorForTenant(tenantId, getTenantConfig);
    return connector.delete(resourceName, id);
  }

  /**
   * Execute raw query/command
   * @param tenantId Tenant identifier
   * @param query Raw query string
   * @param params Query parameters
   * @param getTenantConfig Function to get tenant configuration
   * @returns Query results
   */
  async executeRaw<T>(
    tenantId: string,
    query: string,
    params: any[] | undefined,
    getTenantConfig: (tenantId: string) => Promise<{
      connectorType: string;
      config: any;
    }>
  ): Promise<T> {
    const connector = await this.registry.getConnectorForTenant(tenantId, getTenantConfig);
    return connector.executeRaw<T>(query, params);
  }

  /**
   * Get connector statistics for monitoring
   * @returns Connector statistics
   */
  getStats() {
    return this.registry.getStats();
  }

  /**
   * Disconnect all connectors (useful for cleanup)
   */
  async disconnectAll(): Promise<void> {
    await this.registry.disconnectAll();
  }
}
