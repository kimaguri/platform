import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Encore modules
vi.mock('@encore/backend', () => ({
  api: vi.fn((config, handler) => handler),
  getAuthData: vi.fn(),
}));

// Mock service modules
vi.mock('../service', () => ({
  getEntityList: vi.fn(),
  createEntityRecord: vi.fn(),
  updateEntityRecord: vi.fn(),
  deleteEntityRecord: vi.fn(),
  getEntityRecordData: vi.fn(),
}));

vi.mock('../extensible-fields', () => ({
  getFieldDefinitionsCacheStats: vi.fn(),
  invalidateFieldDefinitionsCache: vi.fn(),
}));

describe('Content Management API', () => {
  let mockGetAuthData: any;
  let mockService: any;
  let mockExtensibleFields: any;

  beforeEach(async () => {
    vi.clearAllMocks();

    const { getAuthData } = await import('@encore/backend');
    mockGetAuthData = getAuthData as any;
    mockGetAuthData.mockReturnValue({
      userID: 'test-user-id',
      userInfo: { tenantId: 'test-tenant' },
    });

    mockService = await import('../service');
    mockExtensibleFields = await import('../extensible-fields');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Universal RPC Endpoints', () => {
    describe('getEntityList', () => {
      it('should list entities with extensions successfully', async () => {
        const mockEntities = [
          {
            id: '1',
            name: 'Test Entity',
            extensions: {
              custom_field: 'custom_value',
            },
          },
        ];

        mockService.getEntityList.mockResolvedValue({
          data: mockEntities,
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
          },
        });

        // Import the API function
        const { getEntityList } = await import('../../api');

        const result = await getEntityList({
          entityTable: 'users',
          filters: JSON.stringify([{ field: 'name', operator: 'contains', value: 'test' }]),
          sorters: JSON.stringify([{ field: 'created_at', order: 'desc' }]),
          limit: 10,
          offset: 0,
        });

        expect(mockService.getEntityList).toHaveBeenCalledWith(
          'test-tenant',
          'users',
          [{ field: 'name', operator: 'contains', value: 'test' }],
          [{ field: 'created_at', order: 'desc' }],
          1,
          10
        );

        expect(result).toEqual({
          data: mockEntities,
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
          },
        });
      });

      it('should handle invalid JSON filters gracefully', async () => {
        const { getEntityList } = await import('../../api');

        await expect(
          getEntityList({
            entityTable: 'users',
            filters: 'invalid-json',
            sorters: '[]',
            page: 1,
            pageSize: 10,
          })
        ).rejects.toThrow();
      });

      it('should use default pagination when not provided', async () => {
        mockService.getEntityList.mockResolvedValue({
          data: [],
          pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        });

        const { getEntityList } = await import('../../api');

        await getEntityList({
          entityTable: 'users',
          filters: '[]',
          sorters: '[]',
        });

        expect(mockService.getEntityList).toHaveBeenCalledWith(
          'test-tenant',
          'users',
          [],
          [],
          1, // default page
          10 // default pageSize
        );
      });
    });

    describe('createEntityRecord', () => {
      it('should create entity with extensions successfully', async () => {
        const mockEntity = {
          id: '1',
          baseFields: { name: 'New Entity' },
          extensions: {
            custom_field: 'custom_value',
          },
        };

        mockService.createEntityRecord.mockResolvedValue(mockEntity);

        const { createEntityRecord } = await import('../../api');

        const result = await createEntityRecord({
          entityTable: 'users',
          entityData: {
            baseFields: { name: 'New Entity' },
          },
          extensionFieldsData: {
            custom_field: 'custom_value',
          },
        });

        expect(mockService.createEntityRecord).toHaveBeenCalledWith(
          'test-tenant',
          'users',
          { baseFields: { name: 'New Entity' }, extensions: {} },
          { custom_field: 'custom_value' }
        );

        expect(result).toEqual({
          data: mockEntity,
          message: 'Entity created successfully with extensible fields',
        });
      });

      it('should handle creation errors', async () => {
        mockService.createEntityRecord.mockRejectedValue(new Error('Creation failed'));

        const { createEntityRecord } = await import('../../api');

        await expect(
          createEntityRecord({
            entityTable: 'users',
            entityData: { name: 'Test' },
            extensionFieldsData: {},
          })
        ).rejects.toThrow('Creation failed');
      });
    });

    describe('updateEntityRecord', () => {
      it('should update entity with extensions successfully', async () => {
        const mockEntity = {
          id: '1',
          name: 'Updated Entity',
          extensions: {
            custom_field: 'updated_value',
          },
        };

        mockService.updateEntityRecord.mockResolvedValue(mockEntity);

        const { updateEntityRecord } = await import('../../api');

        const result = await updateEntityRecord({
          entityTable: 'users',
          recordId: '1',
          entityData: {
            baseFields: { name: 'Updated Entity' },
            extensions: {},
          },
          extensionFieldsData: {
            custom_field: 'updated_value',
          },
        });

        expect(mockService.updateEntityRecord).toHaveBeenCalledWith(
          'test-tenant',
          'users',
          '1',
          { name: 'Updated Entity' },
          { custom_field: 'updated_value' }
        );

        expect(result).toEqual({
          data: mockEntity,
          message: 'Entity updated successfully with extensible fields',
        });
      });
    });

    describe('deleteEntityRecord', () => {
      it('should delete entity successfully', async () => {
        mockService.deleteEntityRecord.mockResolvedValue(true);

        const { deleteEntityRecord } = await import('../../api');

        const result = await deleteEntityRecord({
          entityTable: 'users',
          recordId: '1',
        });

        expect(mockService.deleteEntityRecord).toHaveBeenCalledWith(
          'test-tenant',
          'users',
          '1'
        );

        expect(result).toEqual({
          success: true,
          message: 'Entity deleted successfully',
        });
      });

      it('should handle deletion errors', async () => {
        mockService.deleteEntityRecord.mockRejectedValue(new Error('Deletion failed'));

        const { deleteEntityRecord } = await import('../../api');

        await expect(
          deleteEntityRecord({
            entityTable: 'users',
            recordId: '1',
          })
        ).rejects.toThrow('Deletion failed');
      });
    });

    describe('getEntityRecordData', () => {
      it('should get single entity with extensions successfully', async () => {
        const mockEntity = {
          id: '1',
          name: 'Test Entity',
          extensions: {
            custom_field: 'custom_value',
          },
        };

        mockService.getEntityRecordData.mockResolvedValue(mockEntity);

        const { getEntityRecordData } = await import('../../api');

        const result = await getEntityRecordData({
          entityTable: 'users',
          recordId: '1',
        });

        expect(mockService.getEntityRecordData).toHaveBeenCalledWith(
          'test-tenant',
          'users',
          '1'
        );

        expect(result).toEqual({
          data: mockEntity,
          message: 'Entity retrieved successfully with extensible fields',
        });
      });

      it('should handle not found errors', async () => {
        mockService.getEntityRecordData.mockRejectedValue(new Error('Entity not found'));

        const { getEntityRecordData } = await import('../../api');

        await expect(
          getEntityRecordData({
            entityTable: 'users',
            entityId: 'nonexistent',
          })
        ).rejects.toThrow('Entity not found');
      });
    });
  });

  describe('Entity-specific Endpoints', () => {
    describe('User Management', () => {
      it('should list users with extensions', async () => {
        mockService.getEntityList.mockResolvedValue({
          data: [{ id: '1', name: 'User 1', extensions: {} }],
          pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        });

        const { getEntityList } = await import('../../api');

        const result = await getEntityList({
          entityTable: 'users',
          filters: '[]',
          sorters: '[]',
          limit: 10,
          offset: 0,
        });

        expect(mockService.getEntityList).toHaveBeenCalledWith(
          'test-tenant',
          'users',
          [],
          [],
          1,
          10
        );

        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('pagination');
      });

      it('should create user with extensions', async () => {
        const mockUser = {
          id: '1',
          baseFields: { name: 'New User' },
          email: 'user@example.com',
          extensions: { department: 'Engineering' },
        };

        mockService.createEntityRecord.mockResolvedValue(mockUser);

        const { createEntityRecord } = await import('../../api');

        const result = await createEntityRecord({
          entityData: {
            baseFields: { name: 'New User' },
            email: 'user@example.com',
          },
          extensionFieldsData: {
            department: 'Engineering',
          },
        });

        expect(mockService.createEntityRecord).toHaveBeenCalledWith(
          'test-tenant',
          'users',
          { baseFields: { name: 'New User', email: 'user@example.com' }, extensions: {} },
          { department: 'Engineering' }
        );

        expect(result.data).toEqual(mockUser);
      });
    });

    describe('Content Management', () => {
      it('should list content with extensions', async () => {
        mockService.getEntityList.mockResolvedValue({
          data: [{ id: '1', title: 'Content 1', extensions: {} }],
          pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        });

        const { getEntityList } = await import('../../api');

        const result = await getEntityList({
          entityTable: 'users',
          filters: '[]',
          sorters: '[]',
          limit: 10,
          offset: 0,
        });

        expect(mockService.getEntityList).toHaveBeenCalledWith(
          'test-tenant',
          'content',
          [],
          [],
          1,
          10
        );
      });
    });
  });

  describe('Cache Management Endpoints', () => {
    describe('getCacheStats', () => {
      it('should return cache statistics', async () => {
        const mockStats = {
          size: 5,
          entries: [{ key: 'test-tenant:users', lastAccess: Date.now(), ttl: 300000 }],
        };

        mockExtensibleFields.getFieldDefinitionsCacheStats.mockReturnValue(mockStats);

        const { getCacheStats } = await import('../../api');

        const result = await getCacheStats();

        expect(mockExtensibleFields.getFieldDefinitionsCacheStats).toHaveBeenCalled();
        expect(result).toEqual({
          data: mockStats,
          message: 'Cache statistics retrieved successfully',
        });
      });
    });

    describe('invalidateCache', () => {
      it('should invalidate cache for specific tenant and entity', async () => {
        const { invalidateCache } = await import('../../api');

        const result = await invalidateCache({
          tenantId: 'test-tenant',
          entityTable: 'users',
        });

        expect(mockExtensibleFields.invalidateFieldDefinitionsCache).toHaveBeenCalledWith(
          'test-tenant',
          'users'
        );

        expect(result).toEqual({
          success: true,
          message: 'Cache invalidated successfully for test-tenant:users',
        });
      });

      it('should invalidate cache for specific tenant', async () => {
        const { invalidateCache } = await import('../../api');

        const result = await invalidateCache({
          tenantId: 'test-tenant',
        });

        expect(mockExtensibleFields.invalidateFieldDefinitionsCache).toHaveBeenCalledWith(
          'test-tenant'
        );

        expect(result).toEqual({
          success: true,
          message: 'Cache invalidated successfully for test-tenant',
        });
      });

      it('should invalidate all cache', async () => {
        const { invalidateCache } = await import('../../api');

        const result = await invalidateCache({});

        expect(mockExtensibleFields.invalidateFieldDefinitionsCache).toHaveBeenCalledWith();

        expect(result).toEqual({
          success: true,
          message: 'All cache invalidated successfully',
        });
      });
    });
  });

  describe('Authentication and Authorization', () => {
    it('should extract tenant ID from auth data', async () => {
      mockGetAuthData.mockReturnValue({
        userID: 'test-user',
        userInfo: { tenantId: 'specific-tenant' },
      });

      mockService.getEntityList.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const { getEntityList } = await import('../api');

      await getEntityList({
        entityTable: 'users',
        filters: '[]',
        sorters: '[]',
      });

      expect(mockService.getEntityList).toHaveBeenCalledWith(
        'specific-tenant', // Should use tenant from auth
        'users',
        [],
        [],
        1,
        10
      );
    });

    it('should handle missing tenant ID in auth data', async () => {
      mockGetAuthData.mockReturnValue({
        userID: 'test-user',
        userInfo: {}, // No tenantId
      });

      const { getEntityList } = await import('../api');

      await expect(
        getEntityList({
          entityTable: 'users',
          filters: '[]',
          sorters: '[]',
        })
      ).rejects.toThrow();
    });
  });

  describe('Input Validation', () => {
    it('should validate required parameters', async () => {
      const { createEntityRecord } = await import('../api');

      await expect(
        createEntityRecord({
          entityTable: '', // Empty entity table
          entityData: {},
          extensionFieldsData: {},
        })
      ).rejects.toThrow();
    });

    it('should validate entity ID format', async () => {
      const { getEntityRecordData } = await import('../api');

      await expect(
        getEntityRecordData({
          entityTable: 'users',
          entityId: '', // Empty entity ID
        })
      ).rejects.toThrow();
    });

    it('should validate pagination parameters', async () => {
      mockService.getEntityList.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const { getEntityList } = await import('../api');

      // Should handle negative page numbers
      await getEntityList({
        entityTable: 'users',
        filters: '[]',
        sorters: '[]',
        page: -1,
        pageSize: 10,
      });

      expect(mockService.getEntityList).toHaveBeenCalledWith(
        'test-tenant',
        'users',
        [],
        [],
        1, // Should be corrected to 1
        10
      );
    });

    it('should validate pageSize limits', async () => {
      mockService.getEntityList.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      });

      const { getEntityList } = await import('../api');

      // Should handle pageSize exceeding maximum
      await getEntityList({
        entityTable: 'users',
        filters: '[]',
        sorters: '[]',
        page: 1,
        pageSize: 1000, // Exceeds maximum
      });

      expect(mockService.getEntityList).toHaveBeenCalledWith(
        'test-tenant',
        'users',
        [],
        [],
        1,
        100 // Should be capped at maximum
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      mockService.getEntityList.mockRejectedValue(
        new Error('Database connection failed')
      );

      const { getEntityList } = await import('../api');

      await expect(
        getEntityList({
          entityTable: 'users',
          filters: '[]',
          sorters: '[]',
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle JSON parsing errors', async () => {
      const { getEntityList } = await import('../api');

      await expect(
        getEntityList({
          entityTable: 'users',
          filters: '{invalid json}',
          sorters: '[]',
        })
      ).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      mockService.createEntityRecord.mockRejectedValue(
        new Error('Validation failed: email is required')
      );

      const { createEntityRecord } = await import('../api');

      await expect(
        createEntityRecord({
          entityTable: 'users',
          entityData: { name: 'Test' },
          extensionFieldsData: {},
        })
      ).rejects.toThrow('Validation failed: email is required');
    });
  });
});
