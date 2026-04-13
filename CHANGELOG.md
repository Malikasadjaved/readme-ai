# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.2.2] - 2026-04-14

### Fixed

- Fixed `npx readme-ai@latest` to use scoped package name `npx @malikasadjaved/readme-ai@latest` in GitHub Action workflows and templates

## [1.2.1] - 2026-04-14

### Fixed

- Fixed repository URL casing in package.json to match GitHub canonical URL (npm provenance verification)

## [1.2.0] - 2026-04-14

### Added

- Plugin system for custom analyzers and themes (`src/plugins/`)
- Auto-discovery of `readme-ai-plugin-*` npm packages
- Plugin config support via `plugins` array in `readme-ai.config.js`
- CONTRIBUTING.md with development setup, contribution workflow, and plugin authoring guide
- CLAUDE.md project context for AI-powered coding tools
- Pre-commit hooks with Husky and lint-staged (ESLint + Prettier on staged `.ts` files)
- Dependency analysis for Gradle, Maven, Ruby (Bundler), Swift, and Dart/Flutter projects
- Plugin system tests (8 tests)
- Viral SEO keywords and badges for npm discoverability
- Supported languages table in README

### Fixed

- Build errors from missing dependency analyzer functions (Gradle, Maven, Ruby, Swift, Dart)

### Changed

- README.md rewritten with full feature list, comparison table, plugin docs, and SEO
- package.json description and keywords expanded for maximum discoverability
- Architecture diagram updated to include plugin system

## [1.0.1] - 2026-04-11

### Fixed

- Fixed `bin` entry in package.json so `npx @malikasadjaved/readme-ai` resolves correctly

## [1.0.0] - 2026-04-11

### Added

- Five-phase README generation pipeline (fetch, analyze, generate, render, output)
- Deep code analysis: exports, functions, API endpoints, CLI commands, environment variables
- Dependency analysis for npm, pip, cargo, and go projects
- Auto-generated Mermaid architecture diagrams (API, CLI, React, generic)
- Smart badge generation (language, framework, CI/CD, Docker, license, GitHub stats)
- Five visual themes: Default, Modern, Hacker, Minimal, Academic
- Four AI providers: Anthropic Claude, OpenAI GPT-4o, Google Gemini, Ollama (local)
- Interactive CLI mode with guided prompts
- GitHub URL support for remote repository analysis
- GitHub Action generation for auto-updating READMEs (`--action` flag)
- Dry-run mode for previewing output to stdout (`--dry-run` flag)
- `.readmeaiignore` support for excluding files from analysis
- Published to npm as `@malikasadjaved/readme-ai`

[Unreleased]: https://github.com/Malikasadjaved/readme-ai/compare/v1.2.2...HEAD
[1.2.2]: https://github.com/Malikasadjaved/readme-ai/compare/v1.2.1...v1.2.2
[1.2.1]: https://github.com/Malikasadjaved/readme-ai/compare/v1.2.0...v1.2.1
[1.2.0]: https://github.com/Malikasadjaved/readme-ai/compare/v1.0.1...v1.2.0
[1.0.1]: https://github.com/Malikasadjaved/readme-ai/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/Malikasadjaved/readme-ai/releases/tag/v1.0.0
