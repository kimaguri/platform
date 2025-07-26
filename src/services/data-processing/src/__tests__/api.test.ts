import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Encore modules
vi.mock('@encore/backend', () => ({
  api: vi.fn((config, handler) => handler),
  getAuthData: vi.fn(),
}));

// Mock service modules
vi.mock('../service', () => ({
  listEntitiesWithExtensions: vi.fn(),
  createEntityWithExtensions: vi.fn(),
  updateEntityWithExtensions: vi.fn(),
  deleteEntityWithExtensions: vi.fn(),
  getEntityWithExtensions: vi.fn(),
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
    describe('listEntitiesWithExtensions', () => {
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

        mockService.listEntitiesWithExtensions.mockResolvedValue({
          data: mockEntities,
          pagination: {
            page: 1,
            pageSize: 10,
            total: 1,
            totalPages: 1,
          },
        });

        // Import the API function
        const { listEntitiesWithExtensions } = await import('../api');

        const result = await listEntitiesWithExtensions({
          entityTable: 'users',
          filters: JSON.stringify([{ field: 'name', operator: 'contains', value: 'test' }]),
          sorters: JSON.stringify([{ field: 'created_at', order: 'desc' }]),
          page: 1,
          pageSize: 10,
        });

        expect(mockService.listEntitiesWithExtensions).toHaveBeenCalledWith(
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
        const { listEntitiesWithExtensions } = await import('../api');

        await expect(
          listEntitiesWithExtensions({
            entityTable: 'users',
            filters: 'invalid-json',
            sorters: '[]',
            page: 1,
            pageSize: 10,
          })
        ).rejects.toThrow();
      });

      it('should use default pagination when not provided', async () => {
        mockService.listEntitiesWithExtensions.mockResolvedValue({
          data: [],
          pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
        });

        const { listEntitiesWithExtensions } = await import('../api');

        await listEntitiesWithExtensions({
          entityTable: 'users',
          filters: '[]',
          sorters: '[]',
        });

        expect(mockService.listEntitiesWithExtensions).toHaveBeenCalledWith(
          'test-tenant',
          'users',
          [],
          [],
          1, // default page
          10 // default pageSize
        );
      });
    });

    describe('createEntityWithExtensions', () => {
      it('should create entity with extensions successfully', async () => {
        const mockEntity = {
          id: '1',
          name: 'New Entity',
          extensions: {
            custom_field: 'custom_value',
          },
        };

        mockService.createEntityWithExtensions.mockResolvedValue(mockEntity);

        const { createEntityWithExtensions } = await import('../api');

        const result = await createEntityWithExtensions({
          entityTable: 'users',
          entityData: {
            name: 'New Entity',
          },
          extensionData: {
            custom_field: 'custom_value',
          },
        });

        expect(mockService.createEntityWithExtensions).toHaveBeenCalledWith(
          'test-tenant',
          'users',
          { name: 'New Entity' },
          { custom_field: 'custom_value' }
        );

        expect(result).toEqual({
          data: mockEntity,
          message: 'Entity created successfully with extensible fields',
        });
      });

      it('should handle creation errors', async () => {
        mockService.createEntityWithExtensions.mockRejectedValue(new Error('Creation failed'));

        const { createEntityWithExtensions } = await import('../api');

        await expect(
          createEntityWithExtensions({
            entityTable: 'users',
            entityData: { name: 'Test' },
            extensionData: {},
          })
        ).rejects.toThrow('Creation failed');
      });
    });

    describe('updateEntityWithExtensions', () => {
      it('should update entity with extensions successfully', async () => {
        const mockEntity = {
          id: '1',
          name: 'Updated Entity',
          extensions: {
            custom_field: 'updated_value',
          },
        };

        mockService.updateEntityWithExtensions.mockResolvedValue(mockEntity);

        const { updateEntityWithExtensions } = await import('../api');

        const result = await updateEntityWithExtensions({
          entityTable: 'users',
          entityId: '1',
          entityData: {
            name: 'Updated Entity',
          },
          extensionData: {
            custom_field: 'updated_value',
          },
        });

        expect(mockService.updateEntityWithExtensions).toHaveBeenCalledWith(
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

    describe('deleteEntityWithExtensions', () => {
      it('should delete entity successfully', async () => {
        mockService.deleteEntityWithExtensions.mockResolvedValue(true);

        const { deleteEntityWithExtensions } = await import('../api');

        const result = await deleteEntityWithExtensions({
          entityTable: 'users',
          entityId: '1',
        });

        expect(mockService.deleteEntityWithExtensions).toHaveBeenCalledWith(
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
        mockService.deleteEntityWithExtensions.mockRejectedValue(new Error('Deletion failed'));

        const { deleteEntityWithExtensions } = await import('../api');

        await expect(
          deleteEntityWithExtensions({
            entityTable: 'users',
            entityId: '1',
          })
        ).rejects.toThrow('Deletion failed');
      });
    });

    describe('getEntityWithExtensions', () => {
      it('should get single entity with extensions successfully', async () => {
        const mockEntity = {
          id: '1',
          name: 'Test Entity',
          extensions: {
            custom_field: 'custom_value',
          },
        };

        mockService.getEntityWithExtensions.mockResolvedValue(mockEntity);

        const { getEntityWithExtensions } = await import('../api');

        const result = await getEntityWithExtensions({
          entityTable: 'users',
          entityId: '1',
        });

        expect(mockService.getEntityWithExtensions).toHaveBeenCalledWith(
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
        mockService.getEntityWithExtensions.mockRejectedValue(new Error('Entity not found'));

        const { getEntityWithExtensions } = await import('../api');

        await expect(
          getEntityWithExtensions({
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
        mockService.listEntitiesWithExtensions.mockResolvedValue({
          data: [{ id: '1', name: 'User 1', extensions: {} }],
          pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        });

        const { listUsersWithExtensions } = await import('../api');

        const result = await listUsersWithExtensions({
          filters: '[]',
          sorters: '[]',
          page: 1,
          pageSize: 10,
        });

        expect(mockService.listEntitiesWithExtensions).toHaveBeenCalledWith(
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
          name: 'New User',
          email: 'user@example.com',
          extensions: { department: 'Engineering' },
        };

        mockService.createEntityWithExtensions.mockResolvedValue(mockUser);

        const { createUserWithExtensions } = await import('../api');

        const result = await createUserWithExtensions({
          userData: {
            name: 'New User',
            email: 'user@example.com',
          },
          extensionData: {
            department: 'Engineering',
          },
        });

        expect(mockService.createEntityWithExtensions).toHaveBeenCalledWith(
          'test-tenant',
          'users',
          { name: 'New User', email: 'user@example.com' },
          { department: 'Engineering' }
        );

        expect(result.data).toEqual(mockUser);
      });
    });

    describe('Content Management', () => {
      it('should list content with extensions', async () => {
        mockService.listEntitiesWithExtensions.mockResolvedValue({
          data: [{ id: '1', title: 'Content 1', extensions: {} }],
          pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
        });

        const { listContentWithExtensions } = await import('../api');

        const result = await listContentWithExtensions({
          filters: '[]',
          sorters: '[]',
          page: 1,
          pageSize: 10,
        });

        expect(mockService.listEntitiesWithExtensions).toHaveBeenCalledWith(
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

        const { getCacheStats } = await import('../api');

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
        const { invalidateCache } = await import('../api');

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
        const { invalidateCache } = await import('../api');

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
        const { invalidateCache } = await import('../api');

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

      mockService.listEntitiesWithExtensions.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const { listEntitiesWithExtensions } = await import('../api');

      await listEntitiesWithExtensions({
        entityTable: 'users',
        filters: '[]',
        sorters: '[]',
      });

      expect(mockService.listEntitiesWithExtensions).toHaveBeenCalledWith(
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

      const { listEntitiesWithExtensions } = await import('../api');

      await expect(
        listEntitiesWithExtensions({
          entityTable: 'users',
          filters: '[]',
          sorters: '[]',
        })
      ).rejects.toThrow();
    });
  });

  describe('Input Validation', () => {
    it('should validate required parameters', async () => {
      const { createEntityWithExtensions } = await import('../api');

      await expect(
        createEntityWithExtensions({
          entityTable: '', // Empty entity table
          entityData: {},
          extensionData: {},
        })
      ).rejects.toThrow();
    });

    it('should validate entity ID format', async () => {
      const { getEntityWithExtensions } = await import('../api');

      await expect(
        getEntityWithExtensions({
          entityTable: 'users',
          entityId: '', // Empty entity ID
        })
      ).rejects.toThrow();
    });

    it('should validate pagination parameters', async () => {
      mockService.listEntitiesWithExtensions.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      });

      const { listEntitiesWithExtensions } = await import('../api');

      // Should handle negative page numbers
      await listEntitiesWithExtensions({
        entityTable: 'users',
        filters: '[]',
        sorters: '[]',
        page: -1,
        pageSize: 10,
      });

      expect(mockService.listEntitiesWithExtensions).toHaveBeenCalledWith(
        'test-tenant',
        'users',
        [],
        [],
        1, // Should be corrected to 1
        10
      );
    });

    it('should validate pageSize limits', async () => {
      mockService.listEntitiesWithExtensions.mockResolvedValue({
        data: [],
        pagination: { page: 1, pageSize: 100, total: 0, totalPages: 0 },
      });

      const { listEntitiesWithExtensions } = await import('../api');

      // Should handle pageSize exceeding maximum
      await listEntitiesWithExtensions({
        entityTable: 'users',
        filters: '[]',
        sorters: '[]',
        page: 1,
        pageSize: 1000, // Exceeds maximum
      });

      expect(mockService.listEntitiesWithExtensions).toHaveBeenCalledWith(
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
      mockService.listEntitiesWithExtensions.mockRejectedValue(
        new Error('Database connection failed')
      );

      const { listEntitiesWithExtensions } = await import('../api');

      await expect(
        listEntitiesWithExtensions({
          entityTable: 'users',
          filters: '[]',
          sorters: '[]',
        })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle JSON parsing errors', async () => {
      const { listEntitiesWithExtensions } = await import('../api');

      await expect(
        listEntitiesWithExtensions({
          entityTable: 'users',
          filters: '{invalid json}',
          sorters: '[]',
        })
      ).rejects.toThrow();
    });

    it('should provide meaningful error messages', async () => {
      mockService.createEntityWithExtensions.mockRejectedValue(
        new Error('Validation failed: email is required')
      );

      const { createEntityWithExtensions } = await import('../api');

      await expect(
        createEntityWithExtensions({
          entityTable: 'users',
          entityData: { name: 'Test' },
          extensionData: {},
        })
      ).rejects.toThrow('Validation failed: email is required');
    });
  });
});
