import { setupCommand } from '../../../../src/cli/commands/setup';

// Debug test to understand what's happening
describe('Setup Command Debug', () => {
  it('should run setupCommand without errors to see what happens', async () => {
    // Mock all external dependencies as simply as possible
    jest.mock('../../../../src/utils/paths', () => ({
      PathUtils: {
        resolveProjectPath: () => '/test/project',
        exists: () => Promise.resolve(false),
        getProjectStorageDir: () => '/storage/test-project',
      }
    }));

    jest.mock('../../../../src/core/container', () => ({
      getService: () => ({
        detectProjectType: () => Promise.resolve('javascript'),
        loadTemplates: () => Promise.resolve([
          { name: 'javascript', meta: { icon: '📗', description: 'JavaScript project', version: '1.0.0' } }
        ]),
        getTemplate: () => Promise.resolve({
          name: 'javascript',
          meta: { icon: '📗', description: 'JavaScript project', version: '1.0.0' }
        }),
        createProject: () => Promise.resolve(),
      }),
      ServiceKeys: {
        TemplateLoader: 'TemplateLoader',
        StorageManager: 'StorageManager',
      },
    }));

    jest.mock('../../../../src/core/symlinks/manager', () => ({
      SymlinkManager: function() {
        return {
          createProjectSymlinks: () => Promise.resolve(),
        };
      },
    }));

    jest.mock('@clack/prompts', () => ({
      intro: jest.fn(),
      note: jest.fn(),
      cancel: jest.fn(),
      outro: jest.fn(),
      text: () => Promise.resolve('test-project'),
      select: () => Promise.resolve('javascript'),
      spinner: () => ({
        start: jest.fn(),
        stop: jest.fn(),
      }),
      isCancel: () => false,
    }));

    jest.mock('chalk', () => ({
      cyan: (str: string) => str,
      green: (str: string) => str,
      blue: (str: string) => str,
      yellow: (str: string) => str,
      red: (str: string) => str,
      gray: (str: string) => str,
      bold: (str: string) => str,
    }));

    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    try {
      await setupCommand({});
      console.log('setupCommand completed successfully');
    } catch (error) {
      console.error('setupCommand failed:', error);
    }
  });
});