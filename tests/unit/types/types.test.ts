// Type definition validation tests
// These tests ensure that our TypeScript interfaces are well-defined and usable

import { TemplateMeta, Template, Agent, Hook } from '../../../src/types/template';
import { Settings, MCP, ProjectInfo, Config } from '../../../src/types/config';
import { Project, ProjectStatus } from '../../../src/types/project';

describe('Type Definitions', () => {
  describe('Template Types', () => {
    describe('TemplateMeta', () => {
      it('should accept valid TemplateMeta object', () => {
        const meta: TemplateMeta = {
          displayName: 'React Template',
          description: 'A React application template',
          icon: '⚛️',
          category: 'frontend',
          version: '1.0.0'
        };

        expect(meta.displayName).toBe('React Template');
        expect(meta.description).toBe('A React application template');
        expect(meta.icon).toBe('⚛️');
        expect(meta.category).toBe('frontend');
        expect(meta.version).toBe('1.0.0');
      });

      it('should require all properties', () => {
        // TypeScript should enforce all properties are required
        const createMeta = (data: TemplateMeta) => data;
        
        expect(() => {
          createMeta({
            displayName: 'Test',
            description: 'Test description',
            icon: '📦',
            category: 'test',
            version: '1.0.0'
          });
        }).not.toThrow();
      });

      it('should handle special characters in strings', () => {
        const meta: TemplateMeta = {
          displayName: 'Special-Chars_Template!',
          description: 'Template with special chars: @#$%^&*()',
          icon: '🚀🎉💻',
          category: 'utility-tools',
          version: '2.1.0-beta.1'
        };

        expect(meta.displayName).toContain('Special-Chars');
        expect(meta.description).toContain('@#$%');
        expect(meta.icon).toContain('🚀');
        expect(meta.version).toContain('beta');
      });
    });

    describe('Template', () => {
      it('should accept valid Template object', () => {
        const template: Template = {
          name: 'react-app',
          path: '/templates/react-app',
          meta: {
            displayName: 'React App',
            description: 'React application',
            icon: '⚛️',
            category: 'frontend',
            version: '1.0.0'
          },
          files: ['package.json', 'src/index.js', 'public/index.html']
        };

        expect(template.name).toBe('react-app');
        expect(template.path).toBe('/templates/react-app');
        expect(template.meta.displayName).toBe('React App');
        expect(template.files).toHaveLength(3);
        expect(template.files).toContain('package.json');
      });

      it('should handle empty files array', () => {
        const template: Template = {
          name: 'empty-template',
          path: '/templates/empty',
          meta: {
            displayName: 'Empty Template',
            description: 'Empty template for testing',
            icon: '📦',
            category: 'test',
            version: '1.0.0'
          },
          files: []
        };

        expect(template.files).toEqual([]);
        expect(template.files).toHaveLength(0);
      });

      it('should handle many files', () => {
        const manyFiles = Array.from({ length: 100 }, (_, i) => `file${i}.js`);
        const template: Template = {
          name: 'large-template',
          path: '/templates/large',
          meta: {
            displayName: 'Large Template',
            description: 'Template with many files',
            icon: '📁',
            category: 'complex',
            version: '1.0.0'
          },
          files: manyFiles
        };

        expect(template.files).toHaveLength(100);
        expect(template.files[0]).toBe('file0.js');
        expect(template.files[99]).toBe('file99.js');
      });
    });

    describe('Agent', () => {
      it('should accept minimal Agent object', () => {
        const agent: Agent = {
          name: 'basic-agent',
          description: 'A basic agent',
          content: 'Agent instructions here'
        };

        expect(agent.name).toBe('basic-agent');
        expect(agent.description).toBe('A basic agent');
        expect(agent.content).toBe('Agent instructions here');
        expect(agent.model).toBeUndefined();
        expect(agent.color).toBeUndefined();
        expect(agent.tools).toBeUndefined();
      });

      it('should accept full Agent object', () => {
        const agent: Agent = {
          name: 'advanced-agent',
          description: 'An advanced agent with all properties',
          model: 'gpt-4',
          color: 'blue',
          tools: 'bash,filesystem,web',
          content: 'Detailed agent instructions and behavior guidelines'
        };

        expect(agent.name).toBe('advanced-agent');
        expect(agent.model).toBe('gpt-4');
        expect(agent.color).toBe('blue');
        expect(agent.tools).toBe('bash,filesystem,web');
        expect(agent.content).toContain('Detailed agent');
      });

      it('should handle multiline content', () => {
        const agent: Agent = {
          name: 'multiline-agent',
          description: 'Agent with multiline content',
          content: `
            You are an AI assistant specialized in code review.
            
            Your responsibilities include:
            - Checking code quality
            - Suggesting improvements
            - Finding potential bugs
            
            Always be helpful and constructive.
          `
        };

        expect(agent.content).toContain('AI assistant');
        expect(agent.content).toContain('code review');
        expect(agent.content).toContain('- Checking');
      });

      it('should handle special characters in optional fields', () => {
        const agent: Agent = {
          name: 'special-agent',
          description: 'Agent with special characters',
          model: 'claude-3.5-sonnet',
          color: '#FF5733',
          tools: 'tool1,tool2,tool-with-dashes',
          content: 'Content with émojis 🤖 and spécial chars!'
        };

        expect(agent.model).toContain('claude');
        expect(agent.color).toContain('#FF');
        expect(agent.tools).toContain('tool-with-dashes');
        expect(agent.content).toContain('🤖');
        expect(agent.content).toContain('spécial');
      });
    });

    describe('Hook', () => {
      it('should accept minimal Hook object', () => {
        const hook: Hook = {
          name: 'basic-hook',
          description: 'A basic hook',
          eventType: 'PreToolUse',
          command: 'echo "Hook executed"'
        };

        expect(hook.name).toBe('basic-hook');
        expect(hook.description).toBe('A basic hook');
        expect(hook.eventType).toBe('PreToolUse');
        expect(hook.command).toBe('echo "Hook executed"');
        expect(hook.matcher).toBeUndefined();
        expect(hook.timeout).toBeUndefined();
      });

      it('should accept full Hook object', () => {
        const hook: Hook = {
          name: 'advanced-hook',
          description: 'An advanced hook with all properties',
          eventType: 'PostToolUse',
          matcher: 'bash|shell|exec',
          command: '/path/to/script.sh --arg1 --arg2',
          timeout: 30000
        };

        expect(hook.name).toBe('advanced-hook');
        expect(hook.eventType).toBe('PostToolUse');
        expect(hook.matcher).toBe('bash|shell|exec');
        expect(hook.command).toContain('/path/to/script.sh');
        expect(hook.timeout).toBe(30000);
      });

      it('should enforce valid event types', () => {
        const validEventTypes: Hook['eventType'][] = [
          'PreToolUse',
          'PostToolUse',
          'Notification',
          'UserPromptSubmit',
          'Stop',
          'SubagentStop',
          'PreCompact',
          'SessionStart'
        ];

        validEventTypes.forEach(eventType => {
          const hook: Hook = {
            name: `hook-${eventType}`,
            description: `Hook for ${eventType}`,
            eventType,
            command: 'echo test'
          };

          expect(hook.eventType).toBe(eventType);
        });
      });

      it('should handle complex command strings', () => {
        const hook: Hook = {
          name: 'complex-hook',
          description: 'Hook with complex command',
          eventType: 'PreToolUse',
          command: 'bash -c "cd /path && npm run test -- --coverage > /tmp/output 2>&1"'
        };

        expect(hook.command).toContain('bash -c');
        expect(hook.command).toContain('--coverage');
        expect(hook.command).toContain('2>&1');
      });

      it('should handle regex matchers', () => {
        const hook: Hook = {
          name: 'regex-hook',
          description: 'Hook with regex matcher',
          eventType: 'PreToolUse',
          matcher: '^(bash|shell|exec).*',
          command: 'echo "Tool match"'
        };

        expect(hook.matcher).toContain('^(bash');
        expect(hook.matcher).toContain('.*');
      });
    });
  });

  describe('Config Types', () => {
    describe('Settings', () => {
      it('should accept empty Settings object', () => {
        const settings: Settings = {};

        expect(settings.permissions).toBeUndefined();
        expect(settings.env).toBeUndefined();
      });

      it('should accept Settings with permissions', () => {
        const settings: Settings = {
          permissions: {
            allow: ['bash', 'filesystem'],
            deny: ['network', 'web']
          }
        };

        expect(settings.permissions?.allow).toEqual(['bash', 'filesystem']);
        expect(settings.permissions?.deny).toEqual(['network', 'web']);
      });

      it('should accept Settings with environment variables', () => {
        const settings: Settings = {
          env: {
            NODE_ENV: 'development',
            API_KEY: 'secret-key',
            DEBUG: 'true'
          }
        };

        expect(settings.env?.NODE_ENV).toBe('development');
        expect(settings.env?.API_KEY).toBe('secret-key');
        expect(settings.env?.DEBUG).toBe('true');
      });

      it('should accept Settings with both permissions and env', () => {
        const settings: Settings = {
          permissions: {
            allow: ['all']
          },
          env: {
            PATH: '/usr/bin:/bin'
          }
        };

        expect(settings.permissions?.allow).toEqual(['all']);
        expect(settings.env?.PATH).toBe('/usr/bin:/bin');
      });

      it('should handle empty arrays and objects', () => {
        const settings: Settings = {
          permissions: {
            allow: [],
            deny: []
          },
          env: {}
        };

        expect(settings.permissions?.allow).toEqual([]);
        expect(settings.permissions?.deny).toEqual([]);
        expect(settings.env).toEqual({});
      });
    });

    describe('MCP', () => {
      it('should accept empty MCP object', () => {
        const mcp: MCP = {};

        expect(mcp.mcpServers).toBeUndefined();
      });

      it('should accept MCP with servers', () => {
        const mcp: MCP = {
          mcpServers: {
            filesystem: {
              command: 'node',
              args: ['/path/to/filesystem-server.js'],
              env: {
                LOG_LEVEL: 'info'
              }
            },
            web: {
              command: 'python',
              args: ['-m', 'web_server']
            }
          }
        };

        expect(mcp.mcpServers?.filesystem.command).toBe('node');
        expect(mcp.mcpServers?.filesystem.args).toEqual(['/path/to/filesystem-server.js']);
        expect(mcp.mcpServers?.filesystem.env?.LOG_LEVEL).toBe('info');
        expect(mcp.mcpServers?.web.command).toBe('python');
        expect(mcp.mcpServers?.web.args).toEqual(['-m', 'web_server']);
        expect(mcp.mcpServers?.web.env).toBeUndefined();
      });

      it('should handle complex server configurations', () => {
        const mcp: MCP = {
          mcpServers: {
            'complex-server': {
              command: '/usr/local/bin/custom-server',
              args: ['--config', '/etc/config.json', '--verbose'],
              env: {
                SERVER_PORT: '8080',
                LOG_FILE: '/var/log/server.log',
                DEBUG_MODE: 'true'
              }
            }
          }
        };

        const server = mcp.mcpServers?.['complex-server'];
        expect(server?.command).toBe('/usr/local/bin/custom-server');
        expect(server?.args).toContain('--config');
        expect(server?.args).toContain('/etc/config.json');
        expect(server?.env?.SERVER_PORT).toBe('8080');
      });
    });

    describe('ProjectInfo', () => {
      it('should accept valid ProjectInfo object', () => {
        const projectInfo: ProjectInfo = {
          projectName: 'my-awesome-project',
          projectPath: '/home/user/projects/my-awesome-project',
          projectType: 'react',
          templateVersion: '1.2.0',
          setupDate: '2023-01-15T10:30:00Z',
          lastUpdate: '2023-01-16T14:45:00Z'
        };

        expect(projectInfo.projectName).toBe('my-awesome-project');
        expect(projectInfo.projectPath).toBe('/home/user/projects/my-awesome-project');
        expect(projectInfo.projectType).toBe('react');
        expect(projectInfo.templateVersion).toBe('1.2.0');
        expect(projectInfo.setupDate).toBe('2023-01-15T10:30:00Z');
        expect(projectInfo.lastUpdate).toBe('2023-01-16T14:45:00Z');
      });

      it('should handle different project types', () => {
        const projectTypes = ['react', 'vue', 'node', 'python', 'custom', 'unknown'];
        
        projectTypes.forEach(type => {
          const projectInfo: ProjectInfo = {
            projectName: `${type}-project`,
            projectPath: `/projects/${type}-project`,
            projectType: type,
            templateVersion: '1.0.0',
            setupDate: '2023-01-01T00:00:00Z',
            lastUpdate: '2023-01-01T00:00:00Z'
          };

          expect(projectInfo.projectType).toBe(type);
        });
      });

      it('should handle special characters in paths and names', () => {
        const projectInfo: ProjectInfo = {
          projectName: 'special-chars_project!',
          projectPath: '/path/with spaces/special-chars_project!',
          projectType: 'custom-type',
          templateVersion: '2.0.0-beta.1',
          setupDate: '2023-12-31T23:59:59.999Z',
          lastUpdate: '2024-01-01T00:00:00.000Z'
        };

        expect(projectInfo.projectName).toContain('special-chars');
        expect(projectInfo.projectPath).toContain('with spaces');
        expect(projectInfo.templateVersion).toContain('beta');
      });
    });

    describe('Config', () => {
      it('should accept minimal Config object', () => {
        const config: Config = {
          settings: {},
          projectInfo: {
            projectName: 'test-project',
            projectPath: '/test/project',
            projectType: 'test',
            templateVersion: '1.0.0',
            setupDate: '2023-01-01T00:00:00Z',
            lastUpdate: '2023-01-01T00:00:00Z'
          }
        };

        expect(config.settings).toEqual({});
        expect(config.projectInfo.projectName).toBe('test-project');
        expect(config.mcp).toBeUndefined();
      });

      it('should accept full Config object', () => {
        const config: Config = {
          settings: {
            permissions: {
              allow: ['all']
            },
            env: {
              NODE_ENV: 'production'
            }
          },
          mcp: {
            mcpServers: {
              filesystem: {
                command: 'node',
                args: ['server.js']
              }
            }
          },
          projectInfo: {
            projectName: 'full-config-project',
            projectPath: '/projects/full-config',
            projectType: 'react',
            templateVersion: '2.1.0',
            setupDate: '2023-06-15T08:30:00Z',
            lastUpdate: '2023-06-20T16:45:30Z'
          }
        };

        expect(config.settings.permissions?.allow).toEqual(['all']);
        expect(config.settings.env?.NODE_ENV).toBe('production');
        expect(config.mcp?.mcpServers?.filesystem.command).toBe('node');
        expect(config.projectInfo.projectType).toBe('react');
      });
    });
  });

  describe('Project Types', () => {
    describe('Project', () => {
      it('should accept valid Project object', () => {
        const project: Project = {
          name: 'test-project',
          path: '/home/user/projects/test-project',
          template: 'react',
          version: '1.0.0',
          created: new Date('2023-01-01'),
          updated: new Date('2023-01-15'),
          storageSize: 1024 * 1024, // 1MB
          backupCount: 3
        };

        expect(project.name).toBe('test-project');
        expect(project.path).toBe('/home/user/projects/test-project');
        expect(project.template).toBe('react');
        expect(project.version).toBe('1.0.0');
        expect(project.created).toBeInstanceOf(Date);
        expect(project.updated).toBeInstanceOf(Date);
        expect(project.storageSize).toBe(1048576);
        expect(project.backupCount).toBe(3);
      });

      it('should handle different storage sizes', () => {
        const sizes = [0, 1024, 1024 * 1024, 1024 * 1024 * 1024]; // 0B, 1KB, 1MB, 1GB
        
        sizes.forEach(size => {
          const project: Project = {
            name: `project-${size}`,
            path: `/projects/project-${size}`,
            template: 'custom',
            version: '1.0.0',
            created: new Date(),
            updated: new Date(),
            storageSize: size,
            backupCount: 0
          };

          expect(project.storageSize).toBe(size);
        });
      });

      it('should handle zero backup count', () => {
        const project: Project = {
          name: 'no-backups-project',
          path: '/projects/no-backups',
          template: 'minimal',
          version: '1.0.0',
          created: new Date(),
          updated: new Date(),
          storageSize: 0,
          backupCount: 0
        };

        expect(project.backupCount).toBe(0);
      });

      it('should handle dates correctly', () => {
        const created = new Date('2023-01-01T10:00:00Z');
        const updated = new Date('2023-01-15T15:30:00Z');
        
        const project: Project = {
          name: 'date-test-project',
          path: '/projects/date-test',
          template: 'test',
          version: '1.0.0',
          created,
          updated,
          storageSize: 1024,
          backupCount: 1
        };

        expect(project.created.getTime()).toBe(created.getTime());
        expect(project.updated.getTime()).toBe(updated.getTime());
        expect(project.updated.getTime()).toBeGreaterThan(project.created.getTime());
      });
    });

    describe('ProjectStatus', () => {
      it('should accept valid ProjectStatus object', () => {
        const status: ProjectStatus = {
          symlinksValid: true,
          storageAccessible: true,
          templateUpToDate: true,
          hasConflicts: false,
          issues: []
        };

        expect(status.symlinksValid).toBe(true);
        expect(status.storageAccessible).toBe(true);
        expect(status.templateUpToDate).toBe(true);
        expect(status.hasConflicts).toBe(false);
        expect(status.issues).toEqual([]);
      });

      it('should handle project with issues', () => {
        const status: ProjectStatus = {
          symlinksValid: false,
          storageAccessible: true,
          templateUpToDate: false,
          hasConflicts: true,
          issues: [
            'Symlinks are broken or missing',
            'Template version is outdated',
            'Configuration conflicts detected'
          ]
        };

        expect(status.symlinksValid).toBe(false);
        expect(status.hasConflicts).toBe(true);
        expect(status.issues).toHaveLength(3);
        expect(status.issues[0]).toContain('Symlinks');
        expect(status.issues[1]).toContain('Template');
        expect(status.issues[2]).toContain('conflicts');
      });

      it('should handle all false status', () => {
        const status: ProjectStatus = {
          symlinksValid: false,
          storageAccessible: false,
          templateUpToDate: false,
          hasConflicts: true,
          issues: [
            'Storage directory is not accessible',
            'Symlinks are broken',
            'Template is severely outdated',
            'Multiple configuration conflicts'
          ]
        };

        expect(status.symlinksValid).toBe(false);
        expect(status.storageAccessible).toBe(false);
        expect(status.templateUpToDate).toBe(false);
        expect(status.hasConflicts).toBe(true);
        expect(status.issues.length).toBeGreaterThan(0);
      });

      it('should handle complex issue descriptions', () => {
        const status: ProjectStatus = {
          symlinksValid: true,
          storageAccessible: true,
          templateUpToDate: true,
          hasConflicts: false,
          issues: [
            'Warning: Template has minor updates available (v1.1.0 -> v1.2.0)',
            'Info: Backup cleanup recommended (5+ old backups found)',
            'Notice: Some hooks may need updating for new template version'
          ]
        };

        expect(status.issues).toHaveLength(3);
        expect(status.issues.some(issue => issue.includes('Warning:'))).toBe(true);
        expect(status.issues.some(issue => issue.includes('Info:'))).toBe(true);
        expect(status.issues.some(issue => issue.includes('Notice:'))).toBe(true);
      });
    });
  });

  describe('Type Integration', () => {
    it('should work together in complex scenarios', () => {
      // Create a full project configuration
      const template: Template = {
        name: 'full-stack-app',
        path: '/templates/full-stack',
        meta: {
          displayName: 'Full Stack Application',
          description: 'Complete full-stack application template',
          icon: '🌐',
          category: 'web',
          version: '2.0.0'
        },
        files: ['package.json', 'src/server.js', 'src/client/index.js']
      };

      const agent: Agent = {
        name: 'full-stack-assistant',
        description: 'AI assistant for full-stack development',
        model: 'claude-3.5-sonnet',
        tools: 'bash,filesystem,web',
        content: 'You are a full-stack development assistant...'
      };

      const hook: Hook = {
        name: 'test-runner',
        description: 'Automatically run tests on tool usage',
        eventType: 'PostToolUse',
        matcher: 'bash|edit|write',
        command: 'npm test',
        timeout: 60000
      };

      const config: Config = {
        settings: {
          permissions: {
            allow: ['bash', 'filesystem', 'web'],
            deny: ['system']
          },
          env: {
            NODE_ENV: 'development',
            PORT: '3000'
          }
        },
        mcp: {
          mcpServers: {
            filesystem: {
              command: 'node',
              args: ['fs-server.js']
            }
          }
        },
        projectInfo: {
          projectName: 'my-full-stack-app',
          projectPath: '/projects/my-full-stack-app',
          projectType: template.name,
          templateVersion: template.meta.version,
          setupDate: '2023-01-01T00:00:00Z',
          lastUpdate: '2023-01-15T10:30:00Z'
        }
      };

      const project: Project = {
        name: config.projectInfo.projectName,
        path: config.projectInfo.projectPath,
        template: template.name,
        version: template.meta.version,
        created: new Date(config.projectInfo.setupDate),
        updated: new Date(config.projectInfo.lastUpdate),
        storageSize: 2048000, // 2MB
        backupCount: 2
      };

      const status: ProjectStatus = {
        symlinksValid: true,
        storageAccessible: true,
        templateUpToDate: true,
        hasConflicts: false,
        issues: []
      };

      // All types should work together seamlessly
      expect(template.name).toBe(config.projectInfo.projectType);
      expect(template.meta.version).toBe(config.projectInfo.templateVersion);
      expect(project.name).toBe(config.projectInfo.projectName);
      expect(project.template).toBe(template.name);
      expect(agent.name).toContain('full-stack');
      expect(hook.eventType).toBe('PostToolUse');
      expect(status.symlinksValid).toBe(true);
    });
  });
});