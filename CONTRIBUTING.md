# Contributing to Claude Code Central

Thank you for your interest in contributing to Claude Code Central! We welcome contributions from the community.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/ccc.git`
3. Install dependencies: `npm install`
4. Create a feature branch: `git checkout -b feature/your-feature`

## Development Workflow

```bash
# Run in development mode
npm run dev

# Build the project
npm run build

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Lint code
npm run lint

# Format code
npm run format
```

## Project Structure

- `src/cli/` - CLI commands and user interface
- `src/core/` - Core business logic (storage, symlinks, templates)
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions
- `templates/` - Built-in project templates
- `tests/` - Test files

## Testing

- Write unit tests for all new functionality
- Maintain test coverage above 80%
- Run `npm test` before submitting PR

## Commit Guidelines

Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions/changes
- `refactor:` Code refactoring
- `chore:` Build/tooling changes

## Pull Request Process

1. Update documentation for any API changes
2. Add tests for new functionality
3. Ensure all tests pass
4. Update README.md if needed
5. Submit PR with clear description

## Code Style

- TypeScript strict mode enabled
- ESLint and Prettier configured
- Follow existing patterns in codebase

## Adding Templates

To add a new template:

1. Create directory in `templates/`
2. Add `meta.json` with template metadata
3. Add `CLAUDE.md` with AI instructions
4. Add `settings.json` with permissions
5. Add `.mcp.json` if needed

## Questions?

Open an issue at [GitHub Issues](https://github.com/schlessera/ccc/issues)