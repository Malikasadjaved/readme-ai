# CLAUDE.md — Project Context for AI Assistants

> This file provides context for Claude Code, GitHub Copilot, Cursor, and other AI-powered coding tools.

## Project Overview

**readme-ai** (`@malikasadjaved/readme-ai`) is an open-source AI-powered README generator that analyzes codebases and produces production-quality READMEs with architecture diagrams, badges, install instructions, usage examples, and API docs.

- **npm package**: `@malikasadjaved/readme-ai`
- **Author**: Malik Asad Javed (@malikasadjaved)
- **License**: MIT
- **Runtime**: Node.js >= 18, TypeScript 5.5, ESM-only

## Tech Stack

- **Language**: TypeScript (strict mode, ESM)
- **Runtime**: Node.js >= 18
- **Build**: `tsc` (TypeScript compiler)
- **Test**: Vitest (186 tests, ~76% coverage)
- **Lint**: ESLint + Prettier (enforced via Husky pre-commit hooks)
- **Package Manager**: npm
- **AI SDKs**: `@anthropic-ai/sdk`, `openai`, `@google/generative-ai`, Ollama REST API

## Architecture

The project follows a 5-phase pipeline:

1. **Fetch** — Clone/read repo (local path or GitHub URL via `@octokit/rest`)
2. **Analyze** — Scan files, detect languages/frameworks, extract code structure
3. **Generate** — Use AI provider to create overview, features, usage examples
4. **Render** — Apply theme (5 built-in + plugin themes) to structured data
5. **Output** — Write README.md (or stdout with `--dry-run`)

## Key Directories

```
src/analyzers/     — Code analysis, file scanning, badge/diagram generation
src/commands/      — CLI command handlers (generate.ts is the main pipeline)
src/generators/    — Section generators (overview, install, usage, contributing)
src/plugins/       — Plugin system for custom analyzers and themes
src/providers/     — AI provider integrations (anthropic, openai, gemini, ollama)
src/themes/        — Theme renderers (default, modern, hacker, minimal, academic)
src/utils/         — Shared utilities (file ops, markdown, template engine, cache)
tests/             — Vitest test files, mirrors src/ structure
```

## Common Commands

```bash
npm run dev          # Run with tsx (development)
npm run build        # Compile TypeScript to dist/
npm test             # Run all 186 tests
npm run test:coverage # Tests with coverage report
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
npm run format       # Prettier format
npm run format:check # Prettier check
```

## Conventions

- **ESM imports**: Always use `.js` extensions in import paths (TypeScript ESM requirement)
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`
- **Pre-commit**: Husky runs `lint-staged` (ESLint fix + Prettier) on staged `.ts` files
- **No default exports** in src/ (except plugins which use `export default`)
- **Types**: Prefer interfaces over type aliases; export types from barrel files
- **Error handling**: Let errors propagate to the CLI layer where `ora` spinner catches them

## Supported Languages for Analysis

Node.js (npm/yarn/pnpm), Python (pip/pyproject), Rust (cargo), Go (go mod), Java (Gradle/Maven), Ruby (Bundler), Swift (Swift PM), Dart/Flutter (pub)

## Plugin System

Plugins are loaded from:
1. `plugins: [...]` array in `readme-ai.config.js`
2. Auto-discovered `readme-ai-plugin-*` packages in `node_modules`

A plugin exports `{ name, analyzers?, themes? }`. Analyzer plugins receive `{ scan, codeAnalysis, deps }` and return `{ sections?, badges? }`. Theme plugins provide a `render(data: ThemeData) => string` function.

## AI Provider Configuration

- **Anthropic** (default): `ANTHROPIC_API_KEY` env var
- **OpenAI**: `OPENAI_API_KEY` env var, `--provider openai`
- **Gemini**: `GEMINI_API_KEY` env var, `--provider gemini`
- **Ollama**: Local at `http://localhost:11434`, `--provider ollama`

## Things to Know

- The `DependencyAnalysis.packageManager` field is `null` for languages without a standard package manager name in the union type (Java, Ruby, Swift, Dart)
- `src/index.ts` is the CLI entry point (not a library barrel)
- The project uses `conf` for persistent user config (~/.config/readme-ai)
- GitHub repos are fetched via `@octokit/rest` + `simple-git`
- Pre-existing `.readmeaiignore` files control what gets analyzed
