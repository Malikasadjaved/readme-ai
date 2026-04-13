# Contributing to readme-ai

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
# Clone the repo
git clone https://github.com/malikasadjaved/readme-ai.git
cd readme-ai

# Install dependencies
npm install

# Run in development mode
npm run dev
```

## Project Structure

```
src/
├── analyzers/     # Code analysis, file scanning, badge generation
├── commands/      # CLI command handlers (generate)
├── generators/    # README section generators (install, usage, overview)
├── plugins/       # Plugin system for custom analyzers and themes
├── providers/     # AI provider integrations (Anthropic, OpenAI, Gemini, Ollama)
├── themes/        # README theme renderers (default, minimal, modern, etc.)
├── utils/         # Shared utilities (file, markdown, template, cache)
├── cli.ts         # Interactive CLI wizard
├── config.ts      # Configuration management
└── index.ts       # Entry point
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Run in development mode with tsx |
| `npm run build` | Compile TypeScript |
| `npm test` | Run tests with Vitest |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run lint` | Lint source and test files |
| `npm run lint:fix` | Lint and auto-fix issues |
| `npm run format` | Format code with Prettier |
| `npm run format:check` | Check formatting without writing |

## Making Changes

1. **Fork** the repository and create a branch from `main`:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Write code** following the existing patterns:
   - TypeScript strict mode
   - ESM imports (use `.js` extensions in import paths)
   - Prettier + ESLint formatting (enforced by pre-commit hook)

3. **Add tests** for new functionality. Tests live in `tests/` mirroring the `src/` structure.

4. **Run checks** before committing:
   ```bash
   npm run lint
   npm run format:check
   npm test
   ```
   The Husky pre-commit hook runs `lint-staged` automatically, so staged `.ts` files are linted and formatted on commit.

5. **Commit** with a clear message:
   ```bash
   git commit -m "feat: add support for X"
   ```
   We follow [Conventional Commits](https://www.conventionalcommits.org/):
   - `feat:` — new feature
   - `fix:` — bug fix
   - `docs:` — documentation only
   - `refactor:` — code change that neither fixes a bug nor adds a feature
   - `test:` — adding or updating tests
   - `chore:` — tooling, CI, dependencies

6. **Open a Pull Request** against `main`.

## Writing Plugins

readme-ai supports a plugin system for custom analyzers and themes. See `src/plugins/index.ts` for the full API.

### Plugin Structure

A plugin is a JS/TS module that exports a `Plugin` object:

```ts
import type { Plugin } from '@malikasadjaved/readme-ai/plugins';

const myPlugin: Plugin = {
  name: 'my-plugin',
  analyzers: [
    {
      name: 'my-analyzer',
      analyze: async ({ scan, codeAnalysis, deps }) => {
        return {
          sections: { 'My Section': 'Custom markdown content here.' },
          badges: [{ label: 'custom', message: 'badge', color: 'blue' }],
        };
      },
    },
  ],
  themes: [
    {
      name: 'my-theme',
      render: (data) => `# ${data.projectName}\n\n${data.description}`,
    },
  ],
};

export default myPlugin;
```

### Loading Plugins

Add plugins to your project config (`readme-ai.config.js`):

```js
export default {
  plugins: [
    './my-local-plugin.js',
    'readme-ai-plugin-example',  // npm package
  ],
};
```

Packages named `readme-ai-plugin-*` in `node_modules` are also auto-discovered.

## Reporting Issues

- Use [GitHub Issues](https://github.com/malikasadjaved/readme-ai/issues) to report bugs or request features.
- Include steps to reproduce, expected behavior, and your environment (Node version, OS).

## Code of Conduct

Be respectful and constructive. We're all here to build something useful.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
