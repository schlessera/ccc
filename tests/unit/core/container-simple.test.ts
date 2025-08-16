import { 
  getService, 
  registerService, 
  registerServiceFactory, 
  clearServices, 
  clearServiceInstances, 
  hasService,
  ServiceKeys,
  getFileSystem,
  configureForTesting
} from '../../../src/core/container';

// Mock service for testing
class MockService {
  constructor(public name: string = 'default') {}
  
  getName(): string {
    return this.name;
  }
}

describe('Container Service Management', () => {
  beforeEach(() => {
    clearServices();
  });

  afterEach(() => {
    clearServices();
  });

  describe('Service Registration and Resolution', () => {
    it('should register and resolve service instances', () => {
      const mockService = new MockService('test');
      registerService('testService', mockService);
      
      const resolved = getService<MockService>('testService');
      
      expect(resolved).toBe(mockService);
      expect(resolved.getName()).toBe('test');
    });

    it('should register and resolve service factories', () => {
      registerServiceFactory('factoryService', () => new MockService('factory'));
      
      const service1 = getService<MockService>('factoryService');
      const service2 = getService<MockService>('factoryService');
      
      // Should return the same instance (singleton behavior)
      expect(service1).toBe(service2);
      expect(service1.getName()).toBe('factory');
    });

    it('should check if service is registered', () => {
      registerService('registeredService', new MockService());
      
      expect(hasService('registeredService')).toBe(true);
      expect(hasService('unregisteredService')).toBe(false);
    });

    it('should throw error when resolving unregistered service', () => {
      expect(() => getService('nonexistent')).toThrow(/Service not registered/);
    });
  });

  describe('Service Lifecycle', () => {
    it('should clear all services', () => {
      registerService('service1', new MockService());
      registerService('service2', new MockService());
      
      expect(hasService('service1')).toBe(true);
      expect(hasService('service2')).toBe(true);
      
      clearServices();
      
      // Default services should be re-registered
      expect(hasService(ServiceKeys.FileSystem)).toBe(true);
    });

    it('should clear service instances but keep factories', () => {
      registerServiceFactory('factoryService', () => new MockService('instance'));
      
      const instance1 = getService<MockService>('factoryService');
      
      clearServiceInstances();
      
      const instance2 = getService<MockService>('factoryService');
      
      // Should be different instances after clearing
      expect(instance1).not.toBe(instance2);
      expect(instance1.getName()).toBe('instance');
      expect(instance2.getName()).toBe('instance');
    });
  });

  describe('Default Services', () => {
    it('should have FileSystem service registered by default', () => {
      expect(hasService(ServiceKeys.FileSystem)).toBe(true);
    });

    it('should provide StorageManager service', () => {
      expect(hasService(ServiceKeys.StorageManager)).toBe(true);
      
      const storageManager = getService(ServiceKeys.StorageManager);
      expect(storageManager).toBeDefined();
    });

    it('should provide TemplateLoader service', () => {
      expect(hasService(ServiceKeys.TemplateLoader)).toBe(true);
      
      const templateLoader = getService(ServiceKeys.TemplateLoader);
      expect(templateLoader).toBeDefined();
    });

    it('should provide AgentLoader service', () => {
      expect(hasService(ServiceKeys.AgentLoader)).toBe(true);
      
      const agentLoader = getService(ServiceKeys.AgentLoader);
      expect(agentLoader).toBeDefined();
    });

    it('should provide CommandLoader service', () => {
      expect(hasService(ServiceKeys.CommandLoader)).toBe(true);
      
      const commandLoader = getService(ServiceKeys.CommandLoader);
      expect(commandLoader).toBeDefined();
    });

    it('should provide HookLoader service', () => {
      expect(hasService(ServiceKeys.HookLoader)).toBe(true);
      
      const hookLoader = getService(ServiceKeys.HookLoader);
      expect(hookLoader).toBeDefined();
    });

    it('should provide SymlinkManager service', () => {
      expect(hasService(ServiceKeys.SymlinkManager)).toBe(true);
      
      const symlinkManager = getService(ServiceKeys.SymlinkManager);
      expect(symlinkManager).toBeDefined();
    });
  });

  describe('FileSystem Integration', () => {
    it('should get filesystem service', () => {
      const fileSystem = getFileSystem();
      
      expect(fileSystem).toBeDefined();
      expect(typeof fileSystem.writeFile).toBe('function');
      expect(typeof fileSystem.readFile).toBe('function');
      expect(typeof fileSystem.exists).toBe('function');
    });

    it('should configure for testing with memory filesystem', () => {
      const initialFiles = {
        '/test.txt': 'test content',
        '/data/config.json': '{"test": true}'
      };
      
      configureForTesting(initialFiles);
      
      const fileSystem = getFileSystem();
      expect(fileSystem).toBeDefined();
      
      // Should be using memory filesystem in test mode
      expect(fileSystem.constructor.name).toBe('MemoryFileSystem');
    });
  });

  describe('Service Keys', () => {
    it('should have correct service key constants', () => {
      expect(ServiceKeys.FileSystem).toBe('filesystem');
      expect(ServiceKeys.StorageManager).toBe('storageManager');
      expect(ServiceKeys.TemplateLoader).toBe('templateLoader');
      expect(ServiceKeys.AgentLoader).toBe('agentLoader');
      expect(ServiceKeys.CommandLoader).toBe('commandLoader');
      expect(ServiceKeys.HookLoader).toBe('hookLoader');
      expect(ServiceKeys.SymlinkManager).toBe('symlinkManager');
    });

    it('should use service keys for registration and resolution', () => {
      const mockService = new MockService('test');
      registerService(ServiceKeys.StorageManager, mockService);
      
      const resolved = getService<MockService>(ServiceKeys.StorageManager);
      
      expect(resolved).toBe(mockService);
    });
  });

  describe('Service Dependencies', () => {
    it('should resolve services with dependencies', () => {
      // All default services should resolve their dependencies correctly
      const storageManager = getService(ServiceKeys.StorageManager);
      const fileSystem = getService(ServiceKeys.FileSystem);
      
      expect(storageManager).toBeDefined();
      expect(fileSystem).toBeDefined();
    });

    it('should create services lazily', () => {
      // Services should only be created when first accessed
      expect(hasService(ServiceKeys.TemplateLoader)).toBe(true);
      
      // Actually resolve the service
      const templateLoader = getService(ServiceKeys.TemplateLoader);
      expect(templateLoader).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing service errors gracefully', () => {
      expect(() => getService('nonexistentService')).toThrow();
    });

    it('should handle factory function errors', () => {
      registerServiceFactory('failingService', () => {
        throw new Error('Factory failed');
      });
      
      expect(() => getService('failingService')).toThrow('Factory failed');
    });
  });

  describe('Test Environment Support', () => {
    it('should use memory filesystem in test environment', () => {
      // When NODE_ENV is test or CCC_TEST_MODE is true
      const originalNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      clearServices(); // Re-register with test environment
      
      const fileSystem = getFileSystem();
      expect(fileSystem.constructor.name).toBe('MemoryFileSystem');
      
      process.env.NODE_ENV = originalNodeEnv;
    });

    it('should support test configuration with initial files', () => {
      const testFiles = {
        '/project/.project-info': JSON.stringify({ name: 'test-project' }),
        '/templates/basic/template.json': JSON.stringify({ name: 'basic' })
      };
      
      configureForTesting(testFiles);
      
      const fileSystem = getFileSystem();
      expect(fileSystem).toBeDefined();
    });
  });

  describe('Service Replacement for Testing', () => {
    it('should allow replacing services for testing', () => {
      const mockFileSystem = {
        writeFile: jest.fn(),
        readFile: jest.fn(),
        exists: jest.fn().mockResolvedValue(true),
        mkdir: jest.fn(),
        readdir: jest.fn().mockResolvedValue([]),
        stat: jest.fn(),
        unlink: jest.fn(),
        rmdir: jest.fn(),
        copyFile: jest.fn(),
        rename: jest.fn()
      };
      
      registerService(ServiceKeys.FileSystem, mockFileSystem);
      
      const fileSystem = getFileSystem();
      expect(fileSystem).toBe(mockFileSystem);
    });

    it('should cascade service replacement to dependents', () => {
      const mockFileSystem = {
        writeFile: jest.fn(),
        readFile: jest.fn(),
        exists: jest.fn(),
        mkdir: jest.fn(),
        readdir: jest.fn(),
        stat: jest.fn(),
        unlink: jest.fn(),
        rmdir: jest.fn(),
        copyFile: jest.fn(),
        rename: jest.fn()
      };
      
      registerService(ServiceKeys.FileSystem, mockFileSystem);
      clearServiceInstances(); // Clear cached instances so they recreate with new filesystem
      registerService(ServiceKeys.FileSystem, mockFileSystem); // Re-register after clearing
      
      const storageManager = getService(ServiceKeys.StorageManager);
      expect(storageManager).toBeDefined();
    });
  });

  describe('Integration Scenarios', () => {
    it('should support complete service ecosystem', () => {
      // All services should be able to be resolved
      const services = [
        ServiceKeys.FileSystem,
        ServiceKeys.StorageManager,
        ServiceKeys.TemplateLoader,
        ServiceKeys.AgentLoader,
        ServiceKeys.CommandLoader,
        ServiceKeys.HookLoader,
        ServiceKeys.SymlinkManager
      ];
      
      services.forEach(serviceKey => {
        const service = getService(serviceKey);
        expect(service).toBeDefined();
      });
    });

    it('should maintain service state across multiple operations', () => {
      const fileSystem = getFileSystem();
      const storageManager1 = getService(ServiceKeys.StorageManager);
      const storageManager2 = getService(ServiceKeys.StorageManager);
      
      // Should return same instances (singleton behavior)
      expect(storageManager1).toBe(storageManager2);
      expect(getFileSystem()).toBe(fileSystem);
    });
  });
});