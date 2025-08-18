// Test container behavior in production environment (non-test mode)
describe('Container Production Environment', () => {
  let originalNodeEnv: string | undefined;
  let originalTestMode: string | undefined;

  beforeAll(() => {
    // Store original values
    originalNodeEnv = process.env.NODE_ENV;
    originalTestMode = process.env.CCC_TEST_MODE;
    
    // Set production environment
    process.env.NODE_ENV = 'production';
    delete process.env.CCC_TEST_MODE;
  });

  afterAll(() => {
    // Restore original values
    if (originalNodeEnv !== undefined) {
      process.env.NODE_ENV = originalNodeEnv;
    } else {
      delete process.env.NODE_ENV;
    }
    
    if (originalTestMode !== undefined) {
      process.env.CCC_TEST_MODE = originalTestMode;
    }
  });

  it('should use NodeFileSystem in production environment (line 89)', () => {
    // Clear the module cache to force re-evaluation of the container
    const containerPath = require.resolve('../../../src/core/container');
    delete require.cache[containerPath];
    
    // Re-import container to trigger line 89
    const { getService, ServiceKeys } = require('../../../src/core/container');
    
    // Get the FileSystem service
    const filesystem = getService(ServiceKeys.FileSystem);
    
    // This should be NodeFileSystem, not MemoryFileSystem
    expect(filesystem).toBeDefined();
    expect(filesystem.constructor.name).toBe('NodeFileSystem');
  });
});