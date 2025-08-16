import * as path from 'path';
import * as os from 'os';
import { UserConfigManager } from '../../../../src/core/config/user-manager';

describe('UserConfigManager (Simple)', () => {
  let userConfigManager: UserConfigManager;

  beforeEach(() => {
    // Reset singleton instance
    (UserConfigManager as any).instance = undefined;
    userConfigManager = UserConfigManager.getInstance();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.CCC_CONFIG_DIR;
    
    // Reset singleton
    (UserConfigManager as any).instance = undefined;
  });

  describe('Singleton Pattern', () => {
    it('should be instantiable', () => {
      expect(userConfigManager).toBeInstanceOf(UserConfigManager);
    });

    it('should return the same instance', () => {
      const instance1 = UserConfigManager.getInstance();
      const instance2 = UserConfigManager.getInstance();
      
      expect(instance1).toBe(instance2);
    });

    it('should create only one instance', () => {
      const instances = [];
      for (let i = 0; i < 5; i++) {
        instances.push(UserConfigManager.getInstance());
      }
      
      // All instances should be the same object
      const firstInstance = instances[0];
      instances.forEach(instance => {
        expect(instance).toBe(firstInstance);
      });
    });
  });

  describe('Configuration Directory Management', () => {
    it('should use default config directory', () => {
      const configDir = userConfigManager.getConfigDir();
      const expectedDir = path.join(os.homedir(), '.ccc');
      
      expect(configDir).toBe(expectedDir);
    });

    it('should respect CCC_CONFIG_DIR environment variable', () => {
      const customDir = '/custom/config/dir';
      process.env.CCC_CONFIG_DIR = customDir;
      
      // Reset singleton to pick up env var
      (UserConfigManager as any).instance = undefined;
      const newManager = UserConfigManager.getInstance();
      
      expect(newManager.getConfigDir()).toBe(customDir);
    });

    it('should handle different config directory paths', () => {
      const testPaths = [
        '/tmp/test-config',
        '/var/lib/ccc',
        path.join(os.tmpdir(), 'ccc-test')
      ];

      testPaths.forEach(testPath => {
        process.env.CCC_CONFIG_DIR = testPath;
        (UserConfigManager as any).instance = undefined;
        const manager = UserConfigManager.getInstance();
        
        expect(manager.getConfigDir()).toBe(testPath);
      });
    });
  });

  describe('Directory Path Methods', () => {
    const baseDir = '/test/config';

    beforeEach(() => {
      process.env.CCC_CONFIG_DIR = baseDir;
      (UserConfigManager as any).instance = undefined;
      userConfigManager = UserConfigManager.getInstance();
    });

    it('should return correct user templates directory', () => {
      const templatesDir = userConfigManager.getUserTemplatesDir();
      expect(templatesDir).toBe(path.join(baseDir, 'templates'));
    });

    it('should return correct user agents directory', () => {
      const agentsDir = userConfigManager.getUserAgentsDir();
      expect(agentsDir).toBe(path.join(baseDir, 'agents'));
    });

    it('should return correct user commands directory', () => {
      const commandsDir = userConfigManager.getUserCommandsDir();
      expect(commandsDir).toBe(path.join(baseDir, 'commands'));
    });

    it('should return correct user hooks directory', () => {
      const hooksDir = userConfigManager.getUserHooksDir();
      expect(hooksDir).toBe(path.join(baseDir, 'hooks'));
    });

    it('should return system templates directory', () => {
      const systemTemplatesDir = userConfigManager.getSystemTemplatesDir();
      expect(systemTemplatesDir).toContain('templates');
    });

    it('should return system agents directory', () => {
      const systemAgentsDir = userConfigManager.getSystemAgentsDir();
      expect(systemAgentsDir).toContain('agents');
    });

    it('should return system commands directory', () => {
      const systemCommandsDir = userConfigManager.getSystemCommandsDir();
      expect(systemCommandsDir).toContain('commands');
    });

    it('should return system hooks directory', () => {
      const systemHooksDir = userConfigManager.getSystemHooksDir();
      expect(systemHooksDir).toContain('hooks');
    });
  });

  describe('Method Availability', () => {
    it('should provide ensureUserConfigDir method', () => {
      expect(typeof userConfigManager.ensureUserConfigDir).toBe('function');
    });

    it('should provide getCombinedItems method', () => {
      expect(typeof userConfigManager.getCombinedItems).toBe('function');
    });

    it('should provide getCombinedTemplates method', () => {
      expect(typeof userConfigManager.getCombinedTemplates).toBe('function');
    });

    it('should provide getCombinedAgents method', () => {
      expect(typeof userConfigManager.getCombinedAgents).toBe('function');
    });

    it('should provide getCombinedCommands method', () => {
      expect(typeof userConfigManager.getCombinedCommands).toBe('function');
    });

    it('should provide getCombinedHooks method', () => {
      expect(typeof userConfigManager.getCombinedHooks).toBe('function');
    });
  });

  describe('Error Resilience', () => {
    it('should handle invalid environment variables', () => {
      process.env.CCC_CONFIG_DIR = '';
      (UserConfigManager as any).instance = undefined;
      const manager = UserConfigManager.getInstance();

      // Should fall back to default
      expect(manager.getConfigDir()).toBe(path.join(os.homedir(), '.ccc'));
    });

    it('should handle undefined environment variables', () => {
      delete process.env.CCC_CONFIG_DIR;
      (UserConfigManager as any).instance = undefined;
      const manager = UserConfigManager.getInstance();

      expect(manager.getConfigDir()).toBe(path.join(os.homedir(), '.ccc'));
    });

    it('should maintain consistency across multiple calls', () => {
      const configDir1 = userConfigManager.getConfigDir();
      const configDir2 = userConfigManager.getConfigDir();
      const templatesDir1 = userConfigManager.getUserTemplatesDir();
      const templatesDir2 = userConfigManager.getUserTemplatesDir();

      expect(configDir1).toBe(configDir2);
      expect(templatesDir1).toBe(templatesDir2);
    });
  });

  describe('Path Validation', () => {
    it('should generate valid system paths', () => {
      const systemDirs = [
        userConfigManager.getSystemTemplatesDir(),
        userConfigManager.getSystemAgentsDir(),
        userConfigManager.getSystemCommandsDir(),
        userConfigManager.getSystemHooksDir()
      ];

      systemDirs.forEach(dir => {
        expect(typeof dir).toBe('string');
        expect(dir.length).toBeGreaterThan(0);
        expect(path.isAbsolute(dir)).toBe(true);
      });
    });

    it('should generate valid user paths', () => {
      const userDirs = [
        userConfigManager.getUserTemplatesDir(),
        userConfigManager.getUserAgentsDir(),
        userConfigManager.getUserCommandsDir(),
        userConfigManager.getUserHooksDir()
      ];

      userDirs.forEach(dir => {
        expect(typeof dir).toBe('string');
        expect(dir.length).toBeGreaterThan(0);
        expect(path.isAbsolute(dir)).toBe(true);
        expect(dir).toContain(userConfigManager.getConfigDir());
      });
    });

    it('should maintain path consistency with config directory', () => {
      const baseDir = userConfigManager.getConfigDir();
      
      expect(userConfigManager.getUserTemplatesDir()).toContain(baseDir);
      expect(userConfigManager.getUserAgentsDir()).toContain(baseDir);
      expect(userConfigManager.getUserCommandsDir()).toContain(baseDir);
      expect(userConfigManager.getUserHooksDir()).toContain(baseDir);
    });
  });

  describe('API Consistency', () => {
    it('should have stable API', () => {
      // Test that the API methods remain consistent
      expect(typeof userConfigManager.getConfigDir).toBe('function');
      expect(typeof userConfigManager.getUserTemplatesDir).toBe('function');
      expect(typeof userConfigManager.getUserAgentsDir).toBe('function');
      expect(typeof userConfigManager.getUserCommandsDir).toBe('function');
      expect(typeof userConfigManager.getUserHooksDir).toBe('function');
      expect(typeof userConfigManager.getSystemTemplatesDir).toBe('function');
      expect(typeof userConfigManager.getSystemAgentsDir).toBe('function');
      expect(typeof userConfigManager.getSystemCommandsDir).toBe('function');
      expect(typeof userConfigManager.getSystemHooksDir).toBe('function');
    });

    it('should provide consistent return types', () => {
      const stringMethods = [
        'getConfigDir',
        'getUserTemplatesDir',
        'getUserAgentsDir',
        'getUserCommandsDir',
        'getUserHooksDir',
        'getSystemTemplatesDir',
        'getSystemAgentsDir',
        'getSystemCommandsDir',
        'getSystemHooksDir'
      ];

      stringMethods.forEach(methodName => {
        const result = (userConfigManager as any)[methodName]();
        expect(typeof result).toBe('string');
        expect(result.length).toBeGreaterThan(0);
      });
    });

    it('should maintain singleton behavior across different operations', () => {
      const instance1 = UserConfigManager.getInstance();
      const configDir1 = instance1.getConfigDir();
      
      const instance2 = UserConfigManager.getInstance();
      const configDir2 = instance2.getConfigDir();
      
      expect(instance1).toBe(instance2);
      expect(configDir1).toBe(configDir2);
    });
  });

  describe('Environment Compatibility', () => {
    it('should work in test environment', () => {
      const originalEnv = process.env.NODE_ENV;
      
      try {
        process.env.NODE_ENV = 'test';
        
        expect(() => {
          UserConfigManager.getInstance();
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
          UserConfigManager.getInstance();
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

  describe('Instance Management', () => {
    it('should allow instance reset for testing', () => {
      const instance1 = UserConfigManager.getInstance();
      
      // Reset the instance
      (UserConfigManager as any).instance = undefined;
      
      const instance2 = UserConfigManager.getInstance();
      
      // Should be different instances now
      expect(instance1).not.toBe(instance2);
    });

    it('should handle multiple configuration changes', () => {
      const configs = ['/config1', '/config2', '/config3'];
      const instances: Array<{ instance: UserConfigManager; configDir: string }> = [];
      
      configs.forEach(config => {
        process.env.CCC_CONFIG_DIR = config;
        (UserConfigManager as any).instance = undefined;
        const instance = UserConfigManager.getInstance();
        instances.push({
          instance,
          configDir: instance.getConfigDir()
        });
      });
      
      // Each should have the correct config directory
      instances.forEach((item, index) => {
        expect(item.configDir).toBe(configs[index]);
      });
    });
  });
});