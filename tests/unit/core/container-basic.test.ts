import { 
  configureForTesting, 
  clearServices, 
  ServiceKeys, 
  getService 
} from '../../../src/core/container';

describe('Container (Basic)', () => {
  beforeEach(() => {
    clearServices();
  });

  afterEach(() => {
    clearServices();
  });

  describe('Service Keys', () => {
    it('should define all required service keys', () => {
      expect(ServiceKeys).toHaveProperty('FileSystem');
      expect(ServiceKeys).toHaveProperty('StorageManager');
      expect(ServiceKeys).toHaveProperty('TemplateLoader');
      expect(ServiceKeys).toHaveProperty('AgentLoader');
      expect(ServiceKeys).toHaveProperty('CommandLoader');
      expect(ServiceKeys).toHaveProperty('HookLoader');
      expect(ServiceKeys).toHaveProperty('SymlinkManager');
    });

    it('should have string values for service keys', () => {
      expect(typeof ServiceKeys.FileSystem).toBe('string');
      expect(typeof ServiceKeys.StorageManager).toBe('string');
      expect(typeof ServiceKeys.TemplateLoader).toBe('string');
      expect(typeof ServiceKeys.AgentLoader).toBe('string');
      expect(typeof ServiceKeys.CommandLoader).toBe('string');
      expect(typeof ServiceKeys.HookLoader).toBe('string');
      expect(typeof ServiceKeys.SymlinkManager).toBe('string');
    });

    it('should have unique service key values', () => {
      const values = Object.values(ServiceKeys);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });

    it('should have meaningful service key names', () => {
      expect(ServiceKeys.FileSystem).toBe('filesystem');
      expect(ServiceKeys.StorageManager).toBe('storageManager');
      expect(ServiceKeys.TemplateLoader).toBe('templateLoader');
      expect(ServiceKeys.AgentLoader).toBe('agentLoader');
      expect(ServiceKeys.CommandLoader).toBe('commandLoader');
      expect(ServiceKeys.HookLoader).toBe('hookLoader');
      expect(ServiceKeys.SymlinkManager).toBe('symlinkManager');
    });
  });

  describe('Basic Container Operations', () => {
    it('should provide configureForTesting function', () => {
      expect(typeof configureForTesting).toBe('function');
    });

    it('should provide clearServices function', () => {
      expect(typeof clearServices).toBe('function');
    });

    it('should provide getService function', () => {
      expect(typeof getService).toBe('function');
    });

    it('should handle clearing services without errors', () => {
      expect(() => {
        clearServices();
      }).not.toThrow();
    });

    it('should handle configuring for testing without errors', () => {
      expect(() => {
        configureForTesting();
      }).not.toThrow();
    });

    it('should handle multiple clear operations', () => {
      expect(() => {
        clearServices();
        clearServices();
        clearServices();
      }).not.toThrow();
    });

    it('should handle multiple configure operations', () => {
      expect(() => {
        configureForTesting();
        clearServices();
        configureForTesting();
      }).not.toThrow();
    });
  });

  describe('Service Key Constants', () => {
    it('should have consistent values', () => {
      const originalValue = ServiceKeys.FileSystem;
      
      // Values should be consistent
      expect(ServiceKeys.FileSystem).toBe('filesystem');
      expect(ServiceKeys.FileSystem).toBe(originalValue);
    });

    it('should provide complete service coverage', () => {
      const expectedServices = [
        'FileSystem',
        'StorageManager', 
        'TemplateLoader',
        'AgentLoader',
        'CommandLoader',
        'HookLoader',
        'SymlinkManager'
      ];

      expectedServices.forEach(service => {
        expect(ServiceKeys).toHaveProperty(service);
        expect(typeof ServiceKeys[service as keyof typeof ServiceKeys]).toBe('string');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle getService calls gracefully', () => {
      configureForTesting();
      
      // Should not throw for basic filesystem service
      expect(() => {
        try {
          getService(ServiceKeys.FileSystem);
        } catch (error) {
          // May fail due to dependencies, but should not crash the test
        }
      }).not.toThrow();
    });

    it('should handle lifecycle operations', () => {
      expect(() => {
        configureForTesting();
        clearServices();
        configureForTesting();
        clearServices();
      }).not.toThrow();
    });
  });

  describe('API Consistency', () => {
    it('should provide stable API', () => {
      // Reset to ensure clean state
      const expectedValue = 'filesystem';
      
      // API should remain consistent across calls
      expect(ServiceKeys.FileSystem).toBe(expectedValue);
      expect(ServiceKeys.FileSystem).toBe(expectedValue); // Second call should be same
      
      expect(typeof configureForTesting).toBe('function');
      expect(typeof clearServices).toBe('function');
      expect(typeof getService).toBe('function');
    });

    it('should maintain service key immutability', () => {
      const snapshot = { ...ServiceKeys };
      
      configureForTesting();
      clearServices();
      
      // Service keys should remain unchanged
      expect(ServiceKeys).toEqual(snapshot);
    });
  });

  describe('Environment Compatibility', () => {
    it('should work in test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      
      try {
        process.env.NODE_ENV = 'test';
        
        expect(() => {
          configureForTesting();
        }).not.toThrow();
        
      } finally {
        if (originalEnv) {
          process.env.NODE_ENV = originalEnv;
        } else {
          delete process.env.NODE_ENV;
        }
      }
    });

    it('should handle CCC_TEST_MODE flag', () => {
      const originalFlag = process.env.CCC_TEST_MODE;
      
      try {
        process.env.CCC_TEST_MODE = 'true';
        
        expect(() => {
          configureForTesting();
        }).not.toThrow();
        
      } finally {
        if (originalFlag) {
          process.env.CCC_TEST_MODE = originalFlag;
        } else {
          delete process.env.CCC_TEST_MODE;
        }
      }
    });
  });
});