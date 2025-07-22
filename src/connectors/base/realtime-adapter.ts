import type { ConnectionConfig } from '../../shared/types/connector';

/**
 * Abstract realtime adapter providing unified interface for real-time functionality
 * Supports pub/sub, live queries, and real-time updates
 */
export abstract class RealtimeAdapter {
  protected config: ConnectionConfig;
  protected connected: boolean = false;
  protected subscriptions: Map<string, any> = new Map();

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  /**
   * Connect to realtime service
   */
  abstract connect(): Promise<void>;

  /**
   * Subscribe to a channel for real-time updates
   * @param channel Channel name (e.g., table name, topic)
   * @param callback Function to call when data is received
   * @param options Subscription options (filters, etc.)
   * @returns Subscription ID
   */
  abstract subscribe<T>(
    channel: string,
    callback: (data: T, event?: string) => void,
    options?: {
      event?: string;
      filter?: string;
      schema?: string;
    }
  ): Promise<string>;

  /**
   * Publish data to a channel
   * @param channel Channel name
   * @param data Data to publish
   * @param event Event type
   */
  abstract publish<T>(channel: string, data: T, event?: string): Promise<void>;

  /**
   * Unsubscribe from a channel
   * @param subscriptionId Subscription ID returned by subscribe()
   */
  abstract unsubscribe(subscriptionId: string): Promise<void>;

  /**
   * Subscribe to database table changes
   * @param table Table name
   * @param callback Function to call on changes
   * @param options Subscription options
   * @returns Subscription ID
   */
  abstract subscribeToTable<T>(
    table: string,
    callback: (payload: { eventType: 'INSERT' | 'UPDATE' | 'DELETE'; new?: T; old?: T }) => void,
    options?: {
      event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
      filter?: string;
    }
  ): Promise<string>;

  /**
   * Subscribe to presence updates (who's online)
   * @param channel Channel name
   * @param callback Function to call on presence changes
   * @returns Subscription ID
   */
  abstract subscribeToPresence(
    channel: string,
    callback: (payload: {
      event: 'join' | 'leave' | 'sync';
      key?: string;
      currentPresences: Record<string, any>;
      newPresences: Record<string, any>;
    }) => void
  ): Promise<string>;

  /**
   * Broadcast a message to all subscribers of a channel
   * @param channel Channel name
   * @param event Event type
   * @param payload Message payload
   */
  abstract broadcast(channel: string, event: string, payload: any): Promise<void>;

  /**
   * Disconnect from realtime service
   */
  abstract disconnect(): Promise<void>;

  /**
   * Check if connected to realtime service
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get all active subscriptions
   */
  getSubscriptions(): string[] {
    return Array.from(this.subscriptions.keys());
  }

  /**
   * Get connection configuration
   */
  getConfig(): ConnectionConfig {
    return { ...this.config };
  }
}
