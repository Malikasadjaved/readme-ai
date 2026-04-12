# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/malikasadjaved/readme-ai/compare/v1.0.1...HEAD
[1.0.1]: https://github.com/malikasadjaved/readme-ai/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/malikasadjaved/readme-ai/releases/tag/v1.0.0
