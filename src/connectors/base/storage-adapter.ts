import type { ConnectionConfig } from '../../shared/types/connector';

/**
 * File metadata interface
 */
export interface FileMetadata {
  name: string;
  size: number;
  type: string;
  lastModified?: Date;
  etag?: string;
  path: string;
}

/**
 * Upload options interface
 */
export interface UploadOptions {
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
  upsert?: boolean;
}

/**
 * Download options interface
 */
export interface DownloadOptions {
  transform?: {
    width?: number;
    height?: number;
    resize?: 'cover' | 'contain' | 'fill';
    format?: 'webp' | 'jpeg' | 'png';
    quality?: number;
  };
}

/**
 * Abstract storage adapter providing unified interface for file storage
 * Supports file upload, download, delete, and metadata operations
 */
export abstract class StorageAdapter {
  protected config: ConnectionConfig;
  protected connected: boolean = false;

  constructor(config: ConnectionConfig) {
    this.config = config;
  }

  /**
   * Connect to storage service
   */
  abstract connect(): Promise<void>;

  /**
   * Upload a file to storage
   * @param bucket Bucket name
   * @param path File path in storage
   * @param file File data (Buffer, Uint8Array, or File)
   * @param options Upload options
   * @returns File metadata
   */
  abstract upload(
    bucket: string,
    path: string,
    file: Buffer | Uint8Array | File,
    options?: UploadOptions
  ): Promise<FileMetadata>;

  /**
   * Download a file from storage
   * @param bucket Bucket name
   * @param path File path in storage
   * @param options Download options (transformations, etc.)
   * @returns File data as Buffer
   */
  abstract download(bucket: string, path: string, options?: DownloadOptions): Promise<Buffer>;

  /**
   * Get file metadata without downloading
   * @param bucket Bucket name
   * @param path File path in storage
   * @returns File metadata
   */
  abstract getMetadata(bucket: string, path: string): Promise<FileMetadata>;

  /**
   * Delete a file from storage
   * @param bucket Bucket name
   * @param path File path in storage
   * @returns Success status
   */
  abstract delete(bucket: string, path: string): Promise<boolean>;

  /**
   * List files in a bucket/path
   * @param bucket Bucket name
   * @param prefix Path prefix to filter by
   * @param limit Maximum number of files to return
   * @param offset Number of files to skip
   * @returns Array of file metadata
   */
  abstract list(
    bucket: string,
    prefix?: string,
    limit?: number,
    offset?: number
  ): Promise<FileMetadata[]>;

  /**
   * Create a signed URL for temporary access
   * @param bucket Bucket name
   * @param path File path in storage
   * @param expiresIn Expiration time in seconds
   * @param options Additional options
   * @returns Signed URL
   */
  abstract createSignedUrl(
    bucket: string,
    path: string,
    expiresIn: number,
    options?: {
      download?: boolean;
      transform?: DownloadOptions['transform'];
    }
  ): Promise<string>;

  /**
   * Copy a file within storage
   * @param sourceBucket Source bucket name
   * @param sourcePath Source file path
   * @param destinationBucket Destination bucket name
   * @param destinationPath Destination file path
   * @returns Success status
   */
  abstract copy(
    sourceBucket: string,
    sourcePath: string,
    destinationBucket: string,
    destinationPath: string
  ): Promise<boolean>;

  /**
   * Move a file within storage
   * @param sourceBucket Source bucket name
   * @param sourcePath Source file path
   * @param destinationBucket Destination bucket name
   * @param destinationPath Destination file path
   * @returns Success status
   */
  abstract move(
    sourceBucket: string,
    sourcePath: string,
    destinationBucket: string,
    destinationPath: string
  ): Promise<boolean>;

  /**
   * Create a bucket
   * @param bucket Bucket name
   * @param options Bucket options
   * @returns Success status
   */
  abstract createBucket(
    bucket: string,
    options?: {
      public?: boolean;
      region?: string;
    }
  ): Promise<boolean>;

  /**
   * Delete a bucket
   * @param bucket Bucket name
   * @returns Success status
   */
  abstract deleteBucket(bucket: string): Promise<boolean>;

  /**
   * Disconnect from storage service
   */
  abstract disconnect(): Promise<void>;

  /**
   * Check if connected to storage service
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get connection configuration
   */
  getConfig(): ConnectionConfig {
    return { ...this.config };
  }
}
