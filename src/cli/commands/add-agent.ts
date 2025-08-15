import * as p from '@clack/prompts';
import chalk from 'chalk';
import * as fs from 'fs-extra';
import * as path from 'path';
import { PathUtils } from '../../utils/paths';
import { AgentLoader } from '../../core/agents/loader';
import { Agent } from '../../types/template';

interface AddAgentOptions {
  agent?: string;
  list?: boolean;
}


export async function addAgentCommand(options: AddAgentOptions): Promise<void> {
  try {
    const currentPath = process.cwd();
    const isManaged = await PathUtils.isProjectManaged(currentPath);
    
    if (!isManaged) {
      p.cancel('Current directory is not CCC-managed. Run "ccc setup" first.');
      process.exit(1);
    }

    const agentLoader = new AgentLoader();

    if (options.list) {
      await showAvailableAgents(agentLoader);
      return;
    }

    let selectedAgent = options.agent;
    
    if (!selectedAgent) {
      const result = await selectAgent(agentLoader);
      if (!result) return;
      selectedAgent = result;
    }

    const agent = await agentLoader.getAgent(selectedAgent);
    if (!agent) {
      p.cancel(`Agent not found: ${selectedAgent}`);
      process.exit(1);
    }

    await installAgent(agent, currentPath);

  } catch (error: any) {
    p.cancel(chalk.red(error.message));
    process.exit(1);
  }
}

async function showAvailableAgents(agentLoader: AgentLoader): Promise<void> {
  const agents = await agentLoader.loadAgents();
  
  if (agents.length === 0) {
    p.note('No agents available. Add agents to ~/.ccc/agents or system agents directory.', '🤖 Available Agents');
    return;
  }

  const agentLines = agents.map(agent => {
    const source = (agent as any).source ? chalk.gray(`[${(agent as any).source}]`) : '';
    return `${chalk.cyan(agent.name.padEnd(15))} ${chalk.gray(agent.description)} ${source}`;
  });

  p.note(agentLines.join('\n'), '🤖 Available Agents');
}

async function selectAgent(agentLoader: AgentLoader): Promise<string | null> {
  const agents = await agentLoader.loadAgents();
  
  if (agents.length === 0) {
    p.cancel('No agents available. Add agents to ~/.ccc/agents or system agents directory.');
    return null;
  }

  const agentChoice = await p.select({
    message: 'Select an agent to add',
    options: agents.map(agent => ({
      value: agent.name,
      label: `🤖 ${agent.name}`,
      hint: `${agent.description} ${(agent as any).source ? chalk.gray(`[${(agent as any).source}]`) : ''}`
    }))
  });

  if (p.isCancel(agentChoice)) {
    p.outro('Agent installation cancelled');
    return null;
  }

  return agentChoice as string;
}

async function installAgent(agent: Agent, projectPath: string): Promise<void> {
  const spinner = p.spinner();
  const warnings: string[] = [];
  let agentCreated = false;
  
  try {
    spinner.start(`Installing ${agent.name} agent`);

    // Get the .claude directory path
    const claudeDir = path.join(projectPath, '.claude');
    const agentsDir = path.join(claudeDir, 'agents');
    const agentFile = path.join(agentsDir, `${agent.name}.md`);

    // Ensure agents directory exists
    await fs.ensureDir(agentsDir);

    // Create expected markdown content with frontmatter
    let expectedMarkdownContent = '';
    
    // Add frontmatter
    const frontmatterFields = [];
    frontmatterFields.push(`name: ${agent.name}`);
    frontmatterFields.push(`description: ${agent.description}`);
    if (agent.model) frontmatterFields.push(`model: ${agent.model}`);
    if (agent.color) frontmatterFields.push(`color: ${agent.color}`);
    if (agent.tools) frontmatterFields.push(`tools: ${agent.tools}`);
    
    expectedMarkdownContent = `---\n${frontmatterFields.join('\n')}\n---\n\n`;
    expectedMarkdownContent += agent.content;

    // Check if agent file already exists
    const agentExists = await PathUtils.exists(agentFile);
    if (agentExists) {
      // Read existing agent content
      const existingContent = await fs.readFile(agentFile, 'utf-8');
      
      if (existingContent.trim() === expectedMarkdownContent.trim()) {
        warnings.push(`Agent ${agent.name}.md already exists with correct content`);
      } else {
        warnings.push(`Agent ${agent.name}.md already exists with different content`);
        
        // Ask user if they want to overwrite
        spinner.stop('Agent file conflict');
        const overwrite = await p.confirm({
          message: `Agent file ${agent.name}.md already exists with different content. Overwrite?`,
          initialValue: false
        });
        
        if (!overwrite || p.isCancel(overwrite)) {
          // Continue with existing agent but warn user
          warnings.push(`Using existing agent file ${agent.name}.md`);
        } else {
          await fs.writeFile(agentFile, expectedMarkdownContent, 'utf-8');
          agentCreated = true;
        }
        spinner.start(`Installing ${agent.name} agent`);
      }
    } else {
      // Write the agent content
      await fs.writeFile(agentFile, expectedMarkdownContent, 'utf-8');
      agentCreated = true;
    }

    spinner.stop(`Installed ${agent.name} agent`);

    // Show what was done
    const actions = [];
    if (agentCreated) {
      actions.push(`✓ Created agent: ${chalk.cyan('.claude/agents/' + agent.name + '.md')}`);
    }
    if (actions.length === 0) {
      actions.push(`✓ Verified existing installation`);
    }

    // Show warnings if any
    if (warnings.length > 0) {
      p.note(warnings.map(w => `⚠️  ${w}`).join('\n'), chalk.yellow('Warnings'));
    }

    p.note(
      [
        `Agent: ${chalk.cyan(agent.name)}`,
        `Model: ${agent.model || 'default'}`,
        `Description: ${agent.description}`,
        `Tools: ${agent.tools || 'all tools'}`,
        `File: ${chalk.gray(agentFile)}`,
        '',
        ...actions
      ].join('\n'),
      chalk.green('🎉 Agent Installation Complete')
    );

    // Show next steps
    const nextSteps = [
      `Agent will be automatically discovered by Claude Code`,
      `Run ${chalk.cyan('ccc validate')} to check configuration`,
      `Edit ${chalk.cyan('.claude/agents/' + agent.name + '.md')} to customize behavior`
    ];

    p.note(nextSteps.join('\n'), '💡 Next Steps');

  } catch (error: any) {
    spinner.stop('Installation failed');
    throw error;
  }
}