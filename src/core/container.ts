import { IFileSystem } from './interfaces/filesystem';
import { NodeFileSystem } from './filesystem/node-filesystem';
import { MemoryFileSystem } from './filesystem/memory-filesystem';

/**
 * Simple dependency injection container for CCC
 */
class Container {
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  /**
   * Register a singleton service instance
   */
  registerInstance<T>(key: string, instance: T): void {
    this.services.set(key, instance);
  }

  /**
   * Register a factory function for creating service instances
   */
  registerFactory<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  /**
   * Get a service instance, creating it if necessary
   */
  get<T>(key: string): T {
    // Check if we have a cached instance
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    // Check if we have a factory for this service
    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      const instance = factory();
      this.services.set(key, instance);
      return instance as T;
    }

    throw new Error(`Service not registered: ${key}`);
  }

  /**
   * Check if a service is registered
   */
  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  /**
   * Clear all services and factories
   */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }

  /**
   * Clear all cached instances but keep factories
   */
  clearInstances(): void {
    this.services.clear();
  }
}

// Global container instance
const container = new Container();

// Service keys
export const ServiceKeys = {
  FileSystem: 'filesystem',
  StorageManager: 'storageManager',
  TemplateLoader: 'templateLoader',
  AgentLoader: 'agentLoader',
  CommandLoader: 'commandLoader',
  HookLoader: 'hookLoader',
  SymlinkManager: 'symlinkManager',
} as const;

// Register default services
function registerDefaultServices(): void {
  // Register filesystem implementation based on environment
  if (process.env.NODE_ENV === 'test' || process.env.CCC_TEST_MODE === 'true') {
    container.registerFactory(ServiceKeys.FileSystem, () => new MemoryFileSystem());
  } else {
    container.registerFactory(ServiceKeys.FileSystem, () => new NodeFileSystem());
  }

  // Register other services with lazy loading
  container.registerFactory(ServiceKeys.StorageManager, () => {
    const { StorageManager } = require('./storage/manager');
    const fileSystem = container.get<IFileSystem>(ServiceKeys.FileSystem);
    return new StorageManager(fileSystem);
  });

  container.registerFactory(ServiceKeys.TemplateLoader, () => {
    const { TemplateLoader } = require('./templates/loader');
    const fileSystem = container.get<IFileSystem>(ServiceKeys.FileSystem);
    return new TemplateLoader(fileSystem);
  });

  container.registerFactory(ServiceKeys.AgentLoader, () => {
    const { AgentLoader } = require('./agents/loader');
    const fileSystem = container.get<IFileSystem>(ServiceKeys.FileSystem);
    return new AgentLoader(fileSystem);
  });

  container.registerFactory(ServiceKeys.CommandLoader, () => {
    const { CommandLoader } = require('./commands/loader');
    const fileSystem = container.get<IFileSystem>(ServiceKeys.FileSystem);
    return new CommandLoader(fileSystem);
  });

  container.registerFactory(ServiceKeys.HookLoader, () => {
    const { HookLoader } = require('./hooks/loader');
    const fileSystem = container.get<IFileSystem>(ServiceKeys.FileSystem);
    return new HookLoader(fileSystem);
  });

  container.registerFactory(ServiceKeys.SymlinkManager, () => {
    const { SymlinkManager } = require('./symlinks/manager');
    const fileSystem = container.get<IFileSystem>(ServiceKeys.FileSystem);
    return new SymlinkManager(fileSystem);
  });
}

// Initialize default services
registerDefaultServices();

/**
 * Get a service from the container
 */
export function getService<T>(key: string): T {
  return container.get<T>(key);
}

/**
 * Register a service instance (useful for testing)
 */
export function registerService<T>(key: string, instance: T): void {
  container.registerInstance(key, instance);
}

/**
 * Register a service factory
 */
export function registerServiceFactory<T>(key: string, factory: () => T): void {
  container.registerFactory(key, factory);
}

/**
 * Clear all services (useful for testing)
 */
export function clearServices(): void {
  container.clear();
  registerDefaultServices();
}

/**
 * Clear all cached service instances but keep factories
 */
export function clearServiceInstances(): void {
  container.clearInstances();
}

/**
 * Check if a service is registered
 */
export function hasService(key: string): boolean {
  return container.has(key);
}

/**
 * Get the filesystem service
 */
export function getFileSystem(): IFileSystem {
  return getService<IFileSystem>(ServiceKeys.FileSystem);
}

/**
 * Configure services for testing with a memory filesystem
 */
export function configureForTesting(initialFiles?: { [path: string]: string }): void {
  const memoryFs = new MemoryFileSystem(initialFiles);
  registerService(ServiceKeys.FileSystem, memoryFs);
  
  // Clear other service instances so they get recreated with the new filesystem
  container.clearInstances();
  registerService(ServiceKeys.FileSystem, memoryFs); // Re-register after clearing
}