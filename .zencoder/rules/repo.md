---
description: Repository Information Overview
alwaysApply: true
---

# AI System Executor MVP Information

## Summary
A Node.js-based executor agent that transforms user prompts into code files via LLM, validates them against a schema, writes them to the filesystem, and serves them for browsing. The system includes features for task planning, code repair, clarification handling, and sandbox execution.

## Structure
- **src/**: Core application source code organized by feature modules
- **tests/**: Comprehensive test suite mirroring the src structure
- **contracts/**: JSON schema definitions and validation contracts
- **docker/**: Docker configuration for containerized deployment
- **public/**: Static web assets for the UI interface
- **output/**: Generated project files from execution
- **dist/**: Compiled JavaScript output

## Language & Runtime
**Language**: TypeScript
**Version**: ES2022 target with ES2023 library support
**Build System**: tsc (TypeScript compiler)
**Package Manager**: npm/pnpm

## Dependencies
**Main Dependencies**:
- express: Web server framework
- @anthropic-ai/sdk, openai: LLM provider clients
- ajv: JSON schema validation
- diff: File diffing utilities
- dotenv: Environment configuration

**Development Dependencies**:
- typescript: Language compiler
- vitest: Testing framework
- @vitest/coverage-v8: Code coverage
- eslint: Code linting
- tsx: TypeScript execution

## Build & Installation
```bash
# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test
```

## Docker
**Dockerfile**: docker/Dockerfile
**Image**: node:20-alpine base
**Configuration**: Exposes port 3000, mounts output directory as volume

## Testing
**Framework**: Vitest
**Test Location**: tests/ directory with subdirectories matching src/
**Naming Convention**: *.test.ts
**Configuration**: vitest.config.ts with coverage thresholds
**Run Command**:
```bash
npm test
# or with watch mode
npm run test:watch
```