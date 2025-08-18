import { setupCommand } from '../../../../src/cli/commands/setup';
import { PathUtils } from '../../../../src/utils/paths';
import { TemplateLoader } from '../../../../src/core/templates/loader';
import { StorageManager } from '../../../../src/core/storage/manager';
import { SymlinkManager } from '../../../../src/core/symlinks/manager';
import { getService } from '../../../../src/core/container';
import * as p from '@clack/prompts';

// Mock dependencies
jest.mock('../../../../src/utils/paths');
jest.mock('../../../../src/core/templates/loader');
jest.mock('../../../../src/core/storage/manager');
jest.mock('../../../../src/core/symlinks/manager');
jest.mock('../../../../src/core/container');
jest.mock('@clack/prompts');

const mockPathUtils = PathUtils as jest.Mocked<typeof PathUtils>;
const mockSymlinkManager = SymlinkManager as jest.MockedClass<typeof SymlinkManager>;
const mockGetService = getService as jest.MockedFunction<typeof getService>;
const mockPrompts = p as jest.Mocked<typeof p>;

describe('Setup Command Branch Coverage Boost', () => {
  let mockTemplateLoaderInstance: jest.Mocked<TemplateLoader>;
  let mockStorageManagerInstance: jest.Mocked<StorageManager>;
  let mockSymlinkManagerInstance: jest.Mocked<SymlinkManager>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockTemplateLoaderInstance = {
      detectProjectType: jest.fn(),
      loadTemplates: jest.fn(),
      getTemplate: jest.fn(),
    } as any;
    
    mockStorageManagerInstance = {
      createProject: jest.fn(),
      createProjectFromExisting: jest.fn(),
      createBackup: jest.fn(),
    } as any;
    
    mockSymlinkManagerInstance = {
      createProjectSymlinks: jest.fn(),
    } as any;
    
    mockGetService
      .mockReturnValueOnce(mockTemplateLoaderInstance)
      .mockReturnValueOnce(mockStorageManagerInstance);
    
    mockSymlinkManager.mockImplementation(() => mockSymlinkManagerInstance);
    
    mockPathUtils.resolveProjectPath.mockReturnValue('/test/project');
    mockPathUtils.exists.mockResolvedValue(false);
    
    mockPrompts.intro.mockImplementation(() => {});
    mockPrompts.note.mockImplementation(() => {});
    mockPrompts.outro.mockImplementation(() => {});
    mockPrompts.spinner.mockReturnValue({
      start: jest.fn(),
      stop: jest.fn(),
    } as any);
    
    // Default template setup
    mockTemplateLoaderInstance.detectProjectType.mockResolvedValue('node');
    mockTemplateLoaderInstance.loadTemplates.mockResolvedValue([
      {
        name: 'node',
        path: '/templates/node',
        meta: { displayName: 'Node.js', description: 'Node.js project', icon: '🟢', category: 'web', version: '1.0.0' },
        files: ['package.json', 'src/index.js']
      }
    ]);
    mockTemplateLoaderInstance.getTemplate.mockResolvedValue({
      name: 'node',
      path: '/templates/node',
      meta: { displayName: 'Node.js', description: 'Node.js project', icon: '🟢', category: 'web', version: '1.0.0' },
      files: ['package.json', 'src/index.js']
    });
  });

  describe('Branch Coverage: Lines 70-71, 75-77, 86-87, 98-102, 107-108', () => {
    it('should hit template selection cancellation (lines 70-71)', async () => {
      mockPrompts.select.mockResolvedValue(Symbol.for('clack:cancel'));
      mockPrompts.isCancel.mockReturnValue(true);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await setupCommand({});

      expect(mockPrompts.cancel).toHaveBeenCalledWith('Setup cancelled');
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockExit.mockRestore();
    });

    it('should hit preserve existing branch (lines 75-77)', async () => {
      mockPrompts.select.mockResolvedValue('preserve');
      mockPrompts.isCancel.mockReturnValue(false);
      mockPrompts.text.mockResolvedValue('test-project');

      await setupCommand({});

      // Should set preserveExisting = true and selectedTemplate = 'custom'
      expect(mockStorageManagerInstance.createProjectFromExisting).toHaveBeenCalledWith(
        'test-project',
        '/test/project'
      );
    });

    it('should hit template not found error (lines 86-87)', async () => {
      mockTemplateLoaderInstance.getTemplate.mockResolvedValue(null);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await setupCommand({ template: 'nonexistent', name: 'test' });

      expect(mockPrompts.cancel).toHaveBeenCalledWith('Template not found: nonexistent');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    it('should hit project name validation errors (lines 98-102)', async () => {
      mockPrompts.select.mockResolvedValue('node');
      mockPrompts.text.mockResolvedValue('valid-name');
      mockPrompts.isCancel.mockReturnValue(false);

      await setupCommand({});

      const validator = mockPrompts.text.mock.calls[0][0].validate;
      
      // Test validation branches
      expect(validator!('')).toBe('Project name is required');
      expect(validator!('INVALID_NAME')).toBe('Use lowercase letters, numbers, and hyphens only');
      expect(validator!('valid-name')).toBeUndefined();
    });

    it('should hit project name cancellation (lines 107-108)', async () => {
      mockPrompts.select.mockResolvedValue('node');
      mockPrompts.text.mockResolvedValue(Symbol.for('clack:cancel'));
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for select
        .mockReturnValueOnce(true); // for text
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await setupCommand({});

      expect(mockPrompts.cancel).toHaveBeenCalledWith('Setup cancelled');
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockExit.mockRestore();
    });
  });

  describe('Branch Coverage: Lines 120-154 (Existing configuration handling)', () => {
    it('should hit existing config merge option', async () => {
      mockPathUtils.exists.mockResolvedValue(true); // hasExisting = true
      mockPrompts.select
        .mockResolvedValueOnce('node') // template
        .mockResolvedValueOnce('merge'); // proceed option
      mockPrompts.text.mockResolvedValue('test-project');
      mockPrompts.isCancel.mockReturnValue(false);

      await setupCommand({});

      expect(mockPrompts.note).toHaveBeenCalledWith(
        expect.stringContaining('Found existing configuration files'),
        expect.stringContaining('Existing Configuration')
      );
      expect(mockPrompts.select).toHaveBeenCalledWith({
        message: 'How would you like to proceed?',
        options: expect.arrayContaining([
          expect.objectContaining({ value: 'merge' }),
          expect.objectContaining({ value: 'replace' }),
          expect.objectContaining({ value: 'cancel' })
        ])
      });
    });

    it('should hit existing config replace option with backup (lines 150-154)', async () => {
      mockPathUtils.exists.mockResolvedValue(true);
      mockPrompts.select
        .mockResolvedValueOnce('node') // template
        .mockResolvedValueOnce('replace'); // proceed option
      mockPrompts.text.mockResolvedValue('test-project');
      mockPrompts.isCancel.mockReturnValue(false);

      await setupCommand({});

      expect(mockStorageManagerInstance.createBackup).toHaveBeenCalledWith('test-project');
    });

    it('should hit existing config cancel option', async () => {
      mockPathUtils.exists.mockResolvedValue(true);
      mockPrompts.select
        .mockResolvedValueOnce('node') // template
        .mockResolvedValueOnce('cancel'); // proceed option
      mockPrompts.text.mockResolvedValue('test-project');
      mockPrompts.isCancel.mockReturnValue(false);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await setupCommand({});

      expect(mockPrompts.cancel).toHaveBeenCalledWith('Setup cancelled');
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockExit.mockRestore();
    });

    it('should hit proceed selection cancellation', async () => {
      mockPathUtils.exists.mockResolvedValue(true);
      mockPrompts.select
        .mockResolvedValueOnce('node') // template
        .mockResolvedValueOnce(Symbol.for('clack:cancel')); // proceed option
      mockPrompts.text.mockResolvedValue('test-project');
      mockPrompts.isCancel
        .mockReturnValueOnce(false) // for template select
        .mockReturnValueOnce(false) // for text
        .mockReturnValueOnce(true); // for proceed select
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await setupCommand({});

      expect(mockPrompts.cancel).toHaveBeenCalledWith('Setup cancelled');
      expect(mockExit).toHaveBeenCalledWith(0);
      
      mockExit.mockRestore();
    });
  });

  describe('Branch Coverage: Line 165 (createProjectFromExisting call)', () => {
    it('should hit createProjectFromExisting with preserve option', async () => {
      mockPrompts.select.mockResolvedValue('preserve');
      mockPrompts.text.mockResolvedValue('test-project');
      mockPrompts.isCancel.mockReturnValue(false);

      await setupCommand({});

      expect(mockStorageManagerInstance.createProjectFromExisting).toHaveBeenCalledWith(
        'test-project',
        '/test/project'
      );
      expect(mockStorageManagerInstance.createProject).not.toHaveBeenCalled();
    });

    it('should hit createProject with template', async () => {
      mockPrompts.select.mockResolvedValue('node');
      mockPrompts.text.mockResolvedValue('test-project');
      mockPrompts.isCancel.mockReturnValue(false);

      await setupCommand({});

      expect(mockStorageManagerInstance.createProject).toHaveBeenCalledWith(
        'test-project',
        expect.objectContaining({ name: 'node' })
      );
      expect(mockStorageManagerInstance.createProjectFromExisting).not.toHaveBeenCalled();
    });
  });

  describe('Branch Coverage: Edge cases and combinations', () => {
    it('should handle force option bypassing existing config prompts', async () => {
      mockPathUtils.exists.mockResolvedValue(true);
      mockPrompts.text.mockResolvedValue('test-project');
      mockPrompts.isCancel.mockReturnValue(false);

      await setupCommand({ template: 'node', name: 'test-project', force: true });

      // Should not show existing config prompts due to force option
      expect(mockPrompts.select).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'How would you like to proceed?'
        })
      );
    });

    it('should handle template provided via options', async () => {
      await setupCommand({ template: 'node', name: 'test-project' });

      // Should not prompt for template selection
      expect(mockPrompts.select).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Select a template or keep existing'
        })
      );
    });

    it('should handle name provided via options', async () => {
      await setupCommand({ template: 'node', name: 'test-project' });

      // Should not prompt for name input
      expect(mockPrompts.text).not.toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Project name'
        })
      );
    });

    it('should handle empty templates list', async () => {
      mockTemplateLoaderInstance.loadTemplates.mockResolvedValue([]);
      const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);

      await setupCommand({});

      expect(mockPrompts.cancel).toHaveBeenCalledWith('No templates found. Please ensure templates are installed.');
      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    it('should handle preserve existing with null template (lines 85-87 bypass)', async () => {
      mockTemplateLoaderInstance.getTemplate.mockResolvedValue(null);
      mockPrompts.select.mockResolvedValue('preserve');
      mockPrompts.text.mockResolvedValue('test-project');
      mockPrompts.isCancel.mockReturnValue(false);

      await setupCommand({});

      // Should not exit since preserveExisting = true bypasses the template check
      expect(mockStorageManagerInstance.createProjectFromExisting).toHaveBeenCalled();
    });

    it('should handle successful completion with all information', async () => {
      mockPrompts.select.mockResolvedValue('node');
      mockPrompts.text.mockResolvedValue('test-project');
      mockPrompts.isCancel.mockReturnValue(false);

      await setupCommand({});

      // Check that the setup completion note contains project info
      const noteCalls = mockPrompts.note.mock.calls;
      const setupCompleteCall = noteCalls.find(call => 
        call[1] && call[1].includes('Setup Complete')
      );
      expect(setupCompleteCall).toBeDefined();
      expect(setupCompleteCall![0]).toContain('test-project');
      
      // Check that next steps are shown
      const nextStepsCall = noteCalls.find(call => 
        call[1] && call[1].includes('Next Steps')
      );
      expect(nextStepsCall).toBeDefined();
      
      expect(mockPrompts.outro).toHaveBeenCalledWith(
        expect.stringContaining('Project configured successfully!')
      );
    });
  });

  describe('Branch Coverage: Template selection with different options', () => {
    it('should handle template selection with multiple templates', async () => {
      mockTemplateLoaderInstance.loadTemplates.mockResolvedValue([
        {
          name: 'node',
          path: '/templates/node',
          meta: { displayName: 'Node.js', description: 'Node.js project', icon: '🟢', category: 'web', version: '1.0.0' },
          files: []
        },
        {
          name: 'python',
          path: '/templates/python',
          meta: { displayName: 'Python', description: 'Python project', icon: '🐍', category: 'backend', version: '1.0.0' },
          files: []
        }
      ]);
      
      mockPrompts.select.mockResolvedValue('python');
      mockPrompts.text.mockResolvedValue('test-project');
      mockPrompts.isCancel.mockReturnValue(false);

      await setupCommand({});

      expect(mockPrompts.select).toHaveBeenCalledWith({
        message: 'Select a template or keep existing',
        options: expect.arrayContaining([
          expect.objectContaining({ value: 'node' }),
          expect.objectContaining({ value: 'python' }),
          expect.objectContaining({ value: 'preserve' })
        ]),
        initialValue: 'node'
      });
    });
  });
});